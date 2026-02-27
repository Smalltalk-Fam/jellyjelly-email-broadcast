import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createMailgunClient } from '$lib/email/mailgun';

function getMailgun() {
	const apiKey = env.MAILGUN_API_KEY;
	const domain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
	if (!apiKey) throw new Error('MAILGUN_API_KEY not configured');
	return createMailgunClient(apiKey, domain);
}

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('q') || '';

	try {
		const mailgun = getMailgun();
		let entries = await mailgun.getSuppressions();

		if (search) {
			const q = search.toLowerCase();
			entries = entries.filter((e) => e.address.toLowerCase().includes(q));
		}

		entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

		return { entries: entries.slice(0, 100), search };
	} catch (err) {
		console.error('Failed to load suppression list:', err);
		return { entries: [], search };
	}
};

export const actions: Actions = {
	add: async ({ request }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim().toLowerCase();

		if (!email || !email.includes('@')) {
			return fail(400, { error: 'Valid email address is required.' });
		}

		try {
			const mailgun = getMailgun();
			const ok = await mailgun.addUnsubscribe(email);
			if (!ok) return fail(500, { error: 'Failed to add email.' });
			return { added: true };
		} catch {
			return fail(500, { error: 'Failed to add email.' });
		}
	},
	remove: async ({ request }) => {
		const formData = await request.formData();
		const address = formData.get('address') as string;

		if (!address) return fail(400, { error: 'Missing email address.' });

		try {
			const mailgun = getMailgun();
			const ok = await mailgun.removeUnsubscribe(address);
			if (!ok) return fail(500, { error: 'Failed to remove entry.' });
			return { removed: true };
		} catch {
			return fail(500, { error: 'Failed to remove entry.' });
		}
	}
};
