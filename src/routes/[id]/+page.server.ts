import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';
import { createMailgunClient } from '$lib/email/mailgun';
import { sendCampaign, type Recipient } from '$lib/email/sender';

export const load: PageServerLoad = async ({ params }) => {
	const supabase = getSupabaseClient();

	const { data: campaign, error: dbError } = await supabase
		.from('email_campaigns')
		.select('*')
		.eq('id', params.id)
		.single();

	if (dbError || !campaign) {
		throw error(404, 'Campaign not found');
	}

	return { campaign };
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

		// Send in batches
		const result = await sendCampaign(
			mailgun,
			recipients,
			{
				campaignId: campaign.id,
				subject: campaign.subject,
				bodyHtml: campaign.body_html,
				templateHtml
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

		// Mark campaign complete
		const finalStatus =
			result.totalFailed === result.totalRecipients ? 'failed' : 'completed';
		await supabase
			.from('email_campaigns')
			.update({
				status: finalStatus,
				total_sent: result.totalSent,
				total_failed: result.totalFailed,
				completed_at: new Date().toISOString()
			})
			.eq('id', campaign.id);

		return {
			sent: true,
			totalRecipients: result.totalRecipients,
			totalSent: result.totalSent,
			totalFailed: result.totalFailed
		};
	}
};
