import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getSupabaseClient } from '$lib/server/supabase';
import { verifyAdmin, verifyDigestSecret } from '$lib/server/admin';
import { createMailgunClient } from '$lib/email/mailgun';
import { sendCampaign, type Recipient } from '$lib/email/sender';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Auth: accept either admin session cookie or digest pipeline secret (bypassed in dev)
	if (!dev) {
		const admin = await verifyAdmin(cookies);
		const isDigest = verifyDigestSecret(request);
		if (!admin && !isDigest) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	// Validate env
	const mailgunKey = env.MAILGUN_API_KEY;
	const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
	const unsubscribeSecret = env.UNSUBSCRIBE_SECRET;
	if (!mailgunKey || !unsubscribeSecret) {
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	// Parse request
	const body = await request.json();
	const {
		campaignId: providedCampaignId,
		subject,
		bodyHtml,
		templateName = 'announcement',
		preheader,
		siteUrl = 'https://jellyjelly.com',
		ctaUrl,
		bgColor,
		cardColor,
		btnColor,
		headingColor,
		bodyColor,
		testRecipients
	} = body;

	if (!subject || !bodyHtml) {
		return json({ error: 'Missing required fields: subject, bodyHtml' }, { status: 400 });
	}

	const supabase = getSupabaseClient();

	// Auto-create campaign if no campaignId provided (used by digest pipeline)
	let campaignId = providedCampaignId;
	if (!campaignId) {
		const { data: campaign, error: createErr } = await supabase
			.from('email_campaigns')
			.insert({
				subject,
				template_name: templateName,
				body_html: bodyHtml,
				body_preview: bodyHtml.replace(/<[^>]*>/g, '').slice(0, 200),
				preheader: preheader || null,
				cta_url: ctaUrl || null,
				bg_color: bgColor || null,
				card_color: cardColor || null,
				btn_color: btnColor || null,
				heading_color: headingColor || null,
				body_color: bodyColor || null,
				status: 'draft'
			})
			.select()
			.single();

		if (createErr || !campaign) {
			console.error('Failed to auto-create campaign:', createErr);
			return json({ error: 'Failed to create campaign record' }, { status: 500 });
		}
		campaignId = campaign.id;
	}

	// Load email template
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
		templateHtml = templateMap[templateName];
		if (!templateHtml) {
			return json({ error: `Template "${templateName}" not found` }, { status: 400 });
		}
	} catch (err) {
		console.error('Failed to load template:', err);
		return json({ error: 'Failed to load email template' }, { status: 500 });
	}

	const mailgun = createMailgunClient(mailgunKey, mailgunDomain);

	// Always fetch suppression list from Mailgun
	const suppressedSet = await mailgun.getSuppressedEmails();
	let recipients: Recipient[];

	if (Array.isArray(testRecipients) && testRecipients.length > 0) {
		// Test/batch mode: send only to specified addresses, but still filter suppressions
		recipients = testRecipients
			.filter((email: string) => !suppressedSet.has(email.toLowerCase()))
			.map((email: string) => ({ email, userId: 'test' }));
	} else {
		// Production: fetch all auth.users (paginated)
		const allUsers: Recipient[] = [];
		let page = 1;
		const perPage = 1000;
		while (true) {
			const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
			if (error) {
				console.error('Failed to fetch users:', error);
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

		recipients = allUsers.filter((u) => !suppressedSet.has(u.email.toLowerCase()));
	}

	// Update campaign status
	await supabase
		.from('email_campaigns')
		.update({ status: 'sending', total_recipients: recipients.length })
		.eq('id', campaignId);

	// Send in batches
	const result = await sendCampaign(
		mailgun,
		recipients,
		{ campaignId, subject, bodyHtml, templateHtml, preheader, ctaUrl, bgColor, cardColor, btnColor, headingColor, bodyColor },
		unsubscribeSecret,
		siteUrl,
		async (progress) => {
			await supabase
				.from('email_campaigns')
				.update({
					total_sent: progress.totalSent,
					total_failed: progress.totalFailed
				})
				.eq('id', campaignId);
		}
	);

	// Mark campaign complete
	await supabase
		.from('email_campaigns')
		.update({
			status: result.totalFailed === result.totalRecipients ? 'failed' : 'completed',
			total_sent: result.totalSent,
			total_failed: result.totalFailed,
			completed_at: new Date().toISOString()
		})
		.eq('id', campaignId);

	return json({
		success: true,
		campaignId,
		totalRecipients: result.totalRecipients,
		totalSent: result.totalSent,
		totalFailed: result.totalFailed
	});
};
