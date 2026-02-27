import type { PageServerLoad } from './$types';
import { getSupabaseClient } from '$lib/server/supabase';

export const load: PageServerLoad = async () => {
	const supabase = getSupabaseClient();

	const { data: sequences, error: seqError } = await supabase
		.from('email_sequences')
		.select('*')
		.order('created_at', { ascending: false });

	if (seqError) {
		console.error('Failed to load sequences:', seqError);
		return { sequences: [] };
	}

	// For each sequence, get its campaigns
	const sequencesWithCampaigns = [];
	for (const seq of sequences || []) {
		const { data: campaigns } = await supabase
			.from('email_campaigns')
			.select('id, subject, status, sequence_step, scheduled_at, total_sent, template_name')
			.eq('sequence_id', seq.id)
			.order('sequence_step');

		sequencesWithCampaigns.push({
			...seq,
			campaigns: campaigns || []
		});
	}

	return { sequences: sequencesWithCampaigns };
};
