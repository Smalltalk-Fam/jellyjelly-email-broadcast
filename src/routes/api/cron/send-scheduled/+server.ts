import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';
import { createMailgunClient } from '$lib/email/mailgun';
import { sendCampaign, type Recipient } from '$lib/email/sender';
import { checkUserActivity } from '$lib/server/jelly-api';

export const GET: RequestHandler = async ({ request }) => {
	// Auth: verify CRON_SECRET via Bearer token (skip in dev mode)
	if (!dev) {
		const cronSecret = env.CRON_SECRET;
		if (cronSecret) {
			const authHeader = request.headers.get('authorization');
			if (authHeader !== `Bearer ${cronSecret}`) {
				return json({ error: 'Unauthorized' }, { status: 401 });
			}
		}
	}

	const supabase = getSupabaseClient();
	const mailgunKey = env.MAILGUN_API_KEY;
	const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
	const unsubscribeSecret = env.UNSUBSCRIBE_SECRET;
	const siteUrl = env.SITE_URL || 'https://jellyjelly.com';

	if (!mailgunKey || !unsubscribeSecret) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	const mailgun = createMailgunClient(mailgunKey, mailgunDomain);

	// 1. Find due campaigns: scheduled_at <= now(), status = 'draft', sequence_id IS NOT NULL
	const { data: dueCampaigns, error: queryError } = await supabase
		.from('email_campaigns')
		.select('*')
		.not('sequence_id', 'is', null)
		.eq('status', 'draft')
		.lte('scheduled_at', new Date().toISOString())
		.order('scheduled_at');

	if (queryError) {
		console.error('Failed to query due campaigns:', queryError);
		return json({ error: 'Database query failed' }, { status: 500 });
	}

	if (!dueCampaigns || dueCampaigns.length === 0) {
		return json({ processed: 0, message: 'No campaigns due' });
	}

	// Load templates via import.meta.glob
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

	// Fetch all auth users once (reuse across campaigns)
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
			return json({ error: 'Failed to fetch user list' }, { status: 500 });
		}
		for (const user of data.users) {
			if (user.email) {
				allUsers.push({ email: user.email, userId: user.id });
			}
		}
		if (data.users.length < perPage) break;
		page++;
	}

	// Fetch suppressed emails once
	const suppressedSet = await mailgun.getSuppressedEmails();
	const baseRecipients = allUsers.filter((u) => !suppressedSet.has(u.email.toLowerCase()));

	const results: Array<{ campaignId: string; status: string; sent?: number; failed?: number }> = [];

	for (const campaign of dueCampaigns) {
		try {
			let recipients = [...baseRecipients];

			// 2a. Smart suppression for step > 1: exclude recipients who clicked in earlier steps
			if (campaign.sequence_step > 1 && campaign.sequence_id) {
				// Get campaign IDs for earlier steps in this sequence
				const { data: earlierCampaigns } = await supabase
					.from('email_campaigns')
					.select('id')
					.eq('sequence_id', campaign.sequence_id)
					.lt('sequence_step', campaign.sequence_step);

				if (earlierCampaigns && earlierCampaigns.length > 0) {
					const earlierIds = earlierCampaigns.map((c) => c.id);

					// Find recipients who clicked in earlier steps
					const { data: clickEvents } = await supabase
						.from('email_events')
						.select('recipient')
						.in('campaign_id', earlierIds)
						.eq('event_type', 'clicked');

					if (clickEvents && clickEvents.length > 0) {
						const clickedEmails = new Set(
							clickEvents.map((e) => e.recipient.toLowerCase())
						);
						recipients = recipients.filter(
							(r) => !clickedEmails.has(r.email.toLowerCase())
						);
					}
				}
			}

			// 2b. Load the campaign's template HTML
			const templateHtml = templateMap[campaign.template_name] || templateMap['announcement'];
			if (!templateHtml) {
				console.error(`Template not found for campaign ${campaign.id}: ${campaign.template_name}`);
				await supabase
					.from('email_campaigns')
					.update({ status: 'failed' })
					.eq('id', campaign.id);
				results.push({ campaignId: campaign.id, status: 'failed' });
				continue;
			}

			// 2e. Update campaign status to 'sending'
			await supabase
				.from('email_campaigns')
				.update({
					status: 'sending',
					total_recipients: recipients.length
				})
				.eq('id', campaign.id);

			// 2f. Send via sendCampaign()
			const progress = await sendCampaign(
				mailgun,
				recipients,
				{
					campaignId: campaign.id,
					subject: campaign.subject,
					bodyHtml: campaign.body_html,
					templateHtml,
					sequenceId: campaign.sequence_id,
					sequenceStep: campaign.sequence_step
				},
				unsubscribeSecret,
				siteUrl
			);

			// 2g. Update campaign status to 'completed' or 'failed'
			const finalStatus = progress.totalFailed === progress.totalRecipients ? 'failed' : 'completed';
			await supabase
				.from('email_campaigns')
				.update({
					status: finalStatus,
					total_sent: progress.totalSent,
					total_failed: progress.totalFailed,
					completed_at: new Date().toISOString()
				})
				.eq('id', campaign.id);

			// 2h. If this is the last step (step 3), mark the sequence as 'completed'
			if (campaign.sequence_step === 3 && campaign.sequence_id) {
				await supabase
					.from('email_sequences')
					.update({ status: 'completed' })
					.eq('id', campaign.sequence_id);
			}

			results.push({
				campaignId: campaign.id,
				status: finalStatus,
				sent: progress.totalSent,
				failed: progress.totalFailed
			});
		} catch (err) {
			console.error(`Failed to process campaign ${campaign.id}:`, err);
			await supabase
				.from('email_campaigns')
				.update({ status: 'failed' })
				.eq('id', campaign.id);
			results.push({ campaignId: campaign.id, status: 'failed' });
		}
	}

	// Check re-engagement outcomes (7d and 30d activity)
	const { data: pendingOutcomes } = await supabase
		.from('reengagement_outcomes')
		.select('*')
		.not('clicked_at', 'is', null)
		.or('active_7d.is.null,active_30d.is.null');

	if (pendingOutcomes && pendingOutcomes.length > 0) {
		for (const outcome of pendingOutcomes) {
			const clickedAt = new Date(outcome.clicked_at);
			const now = new Date();
			const daysSinceClick = (now.getTime() - clickedAt.getTime()) / 86400000;

			if (daysSinceClick >= 7 && outcome.active_7d == null) {
				const activity = await checkUserActivity(outcome.user_id);
				await supabase
					.from('reengagement_outcomes')
					.update({ active_7d: activity.active, returned_at: activity.lastActiveAt })
					.eq('id', outcome.id);
			}

			if (daysSinceClick >= 30 && outcome.active_30d == null) {
				const activity = await checkUserActivity(outcome.user_id);
				await supabase
					.from('reengagement_outcomes')
					.update({
						active_30d: activity.active,
						relapsed: outcome.active_7d === true && !activity.active
					})
					.eq('id', outcome.id);
			}
		}
	}

	return json({ processed: results.length, results });
};
