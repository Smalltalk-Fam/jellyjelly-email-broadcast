import { env } from '$env/dynamic/private';

export interface UserActivity {
	active: boolean;
	lastActiveAt: string | null;
}

export async function checkUserActivity(userId: string): Promise<UserActivity> {
	const apiUrl = env.JELLY_API_URL;
	if (!apiUrl) return { active: false, lastActiveAt: null };

	try {
		const res = await fetch(`${apiUrl}/v3/user/${userId}/activity`, {
			headers: { 'Content-Type': 'application/json' }
		});
		if (!res.ok) return { active: false, lastActiveAt: null };
		const data = await res.json();
		return {
			active: data.active === true,
			lastActiveAt: data.lastActiveAt || null
		};
	} catch {
		return { active: false, lastActiveAt: null };
	}
}
