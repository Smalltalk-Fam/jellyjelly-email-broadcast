import { env } from '$env/dynamic/private';
import { getSupabaseClient } from './supabase';
import type { Cookies } from '@sveltejs/kit';

export interface AdminUser {
	id: string;
	email: string;
}

/** Verify admin from Supabase session cookie. Returns admin info or null. */
export async function verifyAdmin(cookies: Cookies): Promise<AdminUser | null> {
	const adminIds = (env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim());
	const accessToken = cookies.get('sb-access-token');

	if (!accessToken) return null;

	const supabase = getSupabaseClient();
	const {
		data: { user },
		error
	} = await supabase.auth.getUser(accessToken);

	if (error || !user || !adminIds.includes(user.id)) return null;

	return { id: user.id, email: user.email || '' };
}

/** Check if request is from the digest automation pipeline via shared secret. */
export function verifyDigestSecret(request: Request): boolean {
	const secret = env.DIGEST_API_SECRET;
	if (!secret) return false;
	const header = request.headers.get('authorization');
	return header === `Bearer ${secret}`;
}
