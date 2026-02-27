import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { verifyAdmin } from '$lib/server/admin';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	// Allow unauthenticated access to the unsubscribe page
	if (url.pathname.startsWith('/unsubscribe')) {
		return { adminId: '', adminEmail: '' };
	}

	// Dev mode bypass for local testing
	if (dev) {
		const adminIds = (env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim());
		return { adminId: adminIds[0] || 'dev', adminEmail: 'dev@jellyjelly.com' };
	}

	const admin = await verifyAdmin(cookies);
	if (!admin) {
		throw redirect(302, '/unsubscribe?error=unauthorized');
	}

	return { adminId: admin.id, adminEmail: admin.email };
};
