/**
 * POST /api/webhooks/setup
 *
 * One-time endpoint to register Mailgun webhooks for event tracking.
 * Configures: delivered, opened, clicked, unsubscribed, complained, permanent_fail
 *
 * Requires admin auth.
 */
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { verifyAdmin } from '$lib/server/admin';

const WEBHOOK_EVENTS = [
	'delivered',
	'opened',
	'clicked',
	'unsubscribed',
	'complained',
	'permanent_fail',
] as const;

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const admin = await verifyAdmin(cookies);
	if (!admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const mailgunKey = env.MAILGUN_API_KEY;
	const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
	if (!mailgunKey) {
		return json({ error: 'MAILGUN_API_KEY not set' }, { status: 500 });
	}

	// Determine webhook URL — use the app's own origin
	const siteUrl = env.SITE_URL || url.origin;
	const webhookUrl = `${siteUrl}/api/webhooks/mailgun`;

	const auth = Buffer.from(`api:${mailgunKey}`).toString('base64');
	const baseUrl = `https://api.mailgun.net/v3/domains/${mailgunDomain}/webhooks`;

	const results: Record<string, { status: string; detail?: string }> = {};

	for (const event of WEBHOOK_EVENTS) {
		// Try PUT first (update existing), fall back to POST (create new)
		let res = await fetch(`${baseUrl}/${event}`, {
			method: 'PUT',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({ url: webhookUrl }).toString(),
		});

		if (!res.ok) {
			// Webhook doesn't exist yet — create it
			res = await fetch(baseUrl, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({ id: event, url: webhookUrl }).toString(),
			});
		}

		if (res.ok) {
			results[event] = { status: 'ok' };
		} else {
			const errText = await res.text();
			results[event] = { status: 'failed', detail: errText.slice(0, 200) };
		}
	}

	return json({
		success: true,
		webhookUrl,
		domain: mailgunDomain,
		events: results,
	});
};

export const GET: RequestHandler = async ({ cookies }) => {
	const admin = await verifyAdmin(cookies);
	if (!admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const mailgunKey = env.MAILGUN_API_KEY;
	const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
	if (!mailgunKey) {
		return json({ error: 'MAILGUN_API_KEY not set' }, { status: 500 });
	}

	const auth = Buffer.from(`api:${mailgunKey}`).toString('base64');
	const res = await fetch(`https://api.mailgun.net/v3/domains/${mailgunDomain}/webhooks`, {
		headers: { Authorization: `Basic ${auth}` },
	});

	if (!res.ok) {
		return json({ error: 'Failed to fetch webhooks', status: res.status }, { status: 500 });
	}

	const data = await res.json();
	return json({ domain: mailgunDomain, webhooks: data.webhooks || {} });
};
