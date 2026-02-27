import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { verifyMailgunSignature } from '$lib/server/tracking';
import { getSupabaseClient } from '$lib/server/supabase';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const sig = body.signature;

	// Verify webhook signature (skip in dev mode)
	const signingKey = env.MAILGUN_WEBHOOK_SIGNING_KEY;
	if (signingKey && sig) {
		const valid = verifyMailgunSignature(signingKey, sig.timestamp, sig.token, sig.signature);
		if (!valid) {
			return json({ error: 'Invalid signature' }, { status: 403 });
		}
	}

	const eventData = body['event-data'];
	if (!eventData) {
		return json({ error: 'Missing event-data' }, { status: 400 });
	}

	const eventType: string = eventData.event; // delivered, opened, clicked, unsubscribed, complained, failed
	const recipient: string = eventData.recipient;
	const timestamp = new Date(eventData.timestamp * 1000).toISOString();
	const tags: string[] = eventData.tags || [];
	const isBot: boolean = eventData['client-info']?.bot === true;

	// Extract campaign ID and variant from tags
	const campaignTag = tags.find((t: string) => t.startsWith('campaign-'));
	const variantTag = tags.find((t: string) => t.startsWith('variant-'));
	const campaignId = campaignTag?.replace('campaign-', '') || null;
	const variantLabel = variantTag?.replace('variant-', '') || null;

	const supabase = getSupabaseClient();

	// Look up variant ID if we have a campaign and variant label
	let variantId: string | null = null;
	if (campaignId && variantLabel) {
		const { data } = await supabase
			.from('campaign_variants')
			.select('id')
			.eq('campaign_id', campaignId)
			.eq('variant_label', variantLabel)
			.single();
		variantId = data?.id || null;
	}

	// Store event
	const { error } = await supabase.from('email_events').insert({
		campaign_id: campaignId,
		variant_id: variantId,
		event_type: eventType === 'failed' ? 'bounced' : eventType,
		recipient,
		timestamp,
		metadata: {
			url: eventData.url || null,
			ip: eventData.ip || null,
			userAgent: eventData['user-agent'] || null,
			tags
		},
		is_bot: isBot
	});

	if (error) {
		console.error('Failed to store email event:', error);
	}

	return json({ success: true });
};
