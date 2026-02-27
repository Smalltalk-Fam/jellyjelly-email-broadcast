import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyAdmin } from '$lib/server/admin';
import { aiComposeEmail, type AiClientConfig } from '$lib/email/ai-compose';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Auth: verify admin via session cookie (bypassed in dev mode)
	if (!dev) {
		const admin = await verifyAdmin(cookies);
		if (!admin) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}
	}

	// Build AI client config — prefer Bedrock, fall back to direct Anthropic API
	let config: AiClientConfig;
	if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
		config = {
			provider: 'bedrock',
			awsRegion: env.AWS_REGION || 'us-east-1',
			awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
			awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY
		};
	} else if (env.ANTHROPIC_API_KEY) {
		config = {
			provider: 'anthropic',
			apiKey: env.ANTHROPIC_API_KEY
		};
	} else {
		return json(
			{ error: 'No AI provider configured. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY for Bedrock, or ANTHROPIC_API_KEY for direct API.' },
			{ status: 500 }
		);
	}

	const body = await request.json();
	const { prompt, currentBody, mode } = body;

	if (!prompt || !mode || !['generate', 'refine'].includes(mode)) {
		return json(
			{ error: 'Missing required fields: prompt, mode (generate|refine)' },
			{ status: 400 }
		);
	}

	if (mode === 'refine' && !currentBody) {
		return json({ error: 'currentBody is required for refine mode' }, { status: 400 });
	}

	try {
		const html = await aiComposeEmail(config, { prompt, currentBody, mode });
		return json({ success: true, html });
	} catch (err) {
		console.error('AI compose error:', err);
		const message = err instanceof Error ? err.message : 'AI generation failed';
		return json({ error: message }, { status: 500 });
	}
};
