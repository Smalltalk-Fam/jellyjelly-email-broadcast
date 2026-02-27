import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { verifyAdmin } from '$lib/server/admin';
import { aiComposeEmail } from '$lib/email/ai-compose';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Auth: verify admin via session cookie
	const admin = await verifyAdmin(cookies);
	if (!admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		return json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
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
		const html = await aiComposeEmail(apiKey, { prompt, currentBody, mode });
		return json({ success: true, html });
	} catch (err) {
		console.error('AI compose error:', err);
		const message = err instanceof Error ? err.message : 'AI generation failed';
		return json({ error: message }, { status: 500 });
	}
};
