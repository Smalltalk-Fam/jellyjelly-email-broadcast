import type { PageServerLoad } from './$types';
import { getSupabaseClient } from '$lib/server/supabase';

export const load: PageServerLoad = async () => {
	const supabase = getSupabaseClient();

	const { data: campaigns, error } = await supabase
		.from('email_campaigns')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(50);

	if (error) {
		console.error('Failed to load campaigns:', error);
		return { campaigns: [] };
	}

	return { campaigns: campaigns || [] };
};
