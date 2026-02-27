import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';
import { verifyUnsubscribeToken } from '$lib/email/tokens';
import { createMailgunClient } from '$lib/email/mailgun';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return { valid: false, error: 'Missing unsubscribe token.' };
  }

  const secret = env.UNSUBSCRIBE_SECRET;
  if (!secret) {
    console.error('UNSUBSCRIBE_SECRET not configured');
    return { valid: false, error: 'Server configuration error.' };
  }

  const payload = verifyUnsubscribeToken(token, secret);
  if (!payload) {
    return { valid: false, error: 'Invalid or expired unsubscribe link.' };
  }

  return { valid: true, email: payload.email, token };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return fail(400, { error: 'Missing token.' });
    }

    const secret = env.UNSUBSCRIBE_SECRET;
    if (!secret) {
      return fail(500, { error: 'Server configuration error.' });
    }

    const payload = verifyUnsubscribeToken(token, secret);
    if (!payload) {
      return fail(400, { error: 'Invalid unsubscribe link.' });
    }

    const mailgunKey = env.MAILGUN_API_KEY;
    const mailgunDomain = env.MAILGUN_DOMAIN || 'email.jellyjelly.com';
    if (!mailgunKey) {
      return fail(500, { error: 'Server configuration error.' });
    }

    const mailgun = createMailgunClient(mailgunKey, mailgunDomain);
    const ok = await mailgun.addUnsubscribe(payload.email);

    if (!ok) {
      console.error('Failed to add to Mailgun unsubscribe list:', payload.email);
      return fail(500, { error: 'Something went wrong. Please try again.' });
    }

    return { success: true, email: payload.email };
  },
};
