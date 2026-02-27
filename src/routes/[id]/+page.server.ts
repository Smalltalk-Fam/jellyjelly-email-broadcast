import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';
import { createMailgunClient } from '$lib/email/mailgun';
import { sendCampaign, splitRecipients, type Recipient } from '$lib/email/sender';

export const load: PageServerLoad = async ({ params }) => {
	const supabase = getSupabaseClient();
	const id = params.id;

	const { data: campaign, error: dbError } = await supabase
		.from('email_campaigns')
		.select('*')
		.eq('id', id)
		.single();

	if (dbError || !campaign) {
		throw error(404, 'Campaign not found');
	}

	// Fetch variants
	const { data: variants } = await supabase
		.from('campaign_variants')
		.select('*')
		.eq('campaign_id', id)
		.order('variant_label');

	// Fetch event counts grouped by type
	const { data: events } = await supabase
		.from('email_events')
		.select('event_type, variant_id, is_bot')
		.eq('campaign_id', id);

	// Aggregate event counts
	const eventCounts: Record<string, number> = {};
	const variantEventCounts: Record<string, Record<string, number>> = {};
	for (const event of events || []) {
		const type = event.event_type;
		eventCounts[type] = (eventCounts[type] || 0) + 1;

		if (event.variant_id) {
			if (!variantEventCounts[event.variant_id]) variantEventCounts[event.variant_id] = {};
			variantEventCounts[event.variant_id][type] =
				(variantEventCounts[event.variant_id][type] || 0) + 1;
		}
	}

	return { campaign, variants: variants || [], eventCounts, variantEventCounts };
};

export const actions: Actions = {
	send: async ({ params, locals }) => {
		const supabase = getSupabaseClient();

		const { data: campaign, error: dbError } = await supabase
			.from('email_campaigns')
			.select('*')
			.eq('id', params.id)
			.single();

		if (dbError || !campaign) {
			return fail(404, { error: 'Campaign not found' });
		}

		if (campaign.status !== 'draft') {
			return fail(400, { error: 'Can only send draft campaigns.' });
		}

		const mailgunKey = env.MAILGUN_API_KEY;
		const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
		const unsubscribeSecret = env.UNSUBSCRIBE_SECRET;
		const siteUrl = env.SITE_URL || 'https://jellyjelly.com';

		if (!mailgunKey || !unsubscribeSecret) {
			return fail(500, { error: 'Server configuration error.' });
		}

		// Fetch all users
		const allUsers: Recipient[] = [];
		let page = 1;
		const perPage = 1000;
		while (true) {
			const { data, error: fetchError } = await supabase.auth.admin.listUsers({
				page,
				perPage
			});
			if (fetchError) {
				console.error('Failed to fetch users:', fetchError);
				return fail(500, { error: 'Failed to fetch user list.' });
			}
			for (const user of data.users) {
				if (user.email) {
					allUsers.push({ email: user.email, userId: user.id });
				}
			}
			if (data.users.length < perPage) break;
			page++;
		}

		// Filter out suppressed emails
		const mailgun = createMailgunClient(mailgunKey, mailgunDomain);
		const suppressedSet = await mailgun.getSuppressedEmails();
		const recipients = allUsers.filter((u) => !suppressedSet.has(u.email.toLowerCase()));

		// Load template
		let templateHtml: string;
		try {
			const templates = import.meta.glob('/src/lib/email-templates/*.html', {
				query: '?raw',
				import: 'default',
				eager: true
			});
			const templateMap: Record<string, string> = {};
			for (const [path, content] of Object.entries(templates)) {
				const name = path.split('/').pop()?.replace('.html', '') || '';
				templateMap[name] = content as string;
			}
			templateHtml = templateMap[campaign.template_name] || templateMap['announcement'];
			if (!templateHtml) {
				return fail(500, { error: 'Email template not found.' });
			}
		} catch {
			return fail(500, { error: 'Failed to load email template.' });
		}

		// Update campaign status
		await supabase
			.from('email_campaigns')
			.update({
				status: 'sending',
				total_recipients: recipients.length,
				sent_by: locals.adminId || null
			})
			.eq('id', campaign.id);

		// Check for A/B variants
		const { data: variants } = await supabase
			.from('campaign_variants')
			.select('*')
			.eq('campaign_id', campaign.id)
			.order('variant_label', { ascending: true });

		let totalSent = 0;
		let totalFailed = 0;
		const totalRecipients = recipients.length;

		if (variants && variants.length >= 2) {
			// A/B variant sending
			const variantA = variants.find((v) => v.variant_label === 'A')!;
			const variantB = variants.find((v) => v.variant_label === 'B')!;

			const { groupA, groupB } = splitRecipients(recipients, variantA.split_percentage);

			// Load variant-specific templates
			const allTemplates = import.meta.glob('/src/lib/email-templates/*.html', {
				query: '?raw',
				import: 'default',
				eager: true
			});
			const variantTemplateMap: Record<string, string> = {};
			for (const [path, content] of Object.entries(allTemplates)) {
				const name = path.split('/').pop()?.replace('.html', '') || '';
				variantTemplateMap[name] = content as string;
			}

			const templateA = variantTemplateMap[variantA.template_name] || templateHtml;
			const templateB = variantTemplateMap[variantB.template_name] || templateHtml;

			// Send to group A
			const resultA = await sendCampaign(
				mailgun,
				groupA,
				{
					campaignId: campaign.id,
					subject: variantA.subject,
					bodyHtml: variantA.body_html,
					templateHtml: templateA,
					tags: ['campaign', `campaign-${campaign.id}`, 'variant-A']
				},
				unsubscribeSecret,
				siteUrl
			);

			// Update variant A stats
			await supabase
				.from('campaign_variants')
				.update({
					total_recipients: groupA.length,
					total_sent: resultA.totalSent,
					total_failed: resultA.totalFailed
				})
				.eq('id', variantA.id);

			// Send to group B
			const resultB = await sendCampaign(
				mailgun,
				groupB,
				{
					campaignId: campaign.id,
					subject: variantB.subject,
					bodyHtml: variantB.body_html,
					templateHtml: templateB,
					tags: ['campaign', `campaign-${campaign.id}`, 'variant-B']
				},
				unsubscribeSecret,
				siteUrl
			);

			// Update variant B stats
			await supabase
				.from('campaign_variants')
				.update({
					total_recipients: groupB.length,
					total_sent: resultB.totalSent,
					total_failed: resultB.totalFailed
				})
				.eq('id', variantB.id);

			totalSent = resultA.totalSent + resultB.totalSent;
			totalFailed = resultA.totalFailed + resultB.totalFailed;
		} else {
			// Normal sending (no variants)
			const result = await sendCampaign(
				mailgun,
				recipients,
				{
					campaignId: campaign.id,
					subject: campaign.subject,
					bodyHtml: campaign.body_html,
					templateHtml,
					tags: ['campaign', `campaign-${campaign.id}`]
				},
				unsubscribeSecret,
				siteUrl,
				async (progress) => {
					await supabase
						.from('email_campaigns')
						.update({
							total_sent: progress.totalSent,
							total_failed: progress.totalFailed
						})
						.eq('id', campaign.id);
				}
			);

			totalSent = result.totalSent;
			totalFailed = result.totalFailed;
		}

		// Mark campaign complete
		const finalStatus = totalFailed === totalRecipients ? 'failed' : 'completed';
		await supabase
			.from('email_campaigns')
			.update({
				status: finalStatus,
				total_sent: totalSent,
				total_failed: totalFailed,
				completed_at: new Date().toISOString()
			})
			.eq('id', campaign.id);

		return {
			sent: true,
			totalRecipients,
			totalSent,
			totalFailed
		};
	}
};
