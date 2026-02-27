import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ params }) => {
	const supabase = getSupabaseClient();
	const { id } = params;

	const { data: sequence, error: seqError } = await supabase
		.from('email_sequences')
		.select('*')
		.eq('id', id)
		.single();

	if (seqError || !sequence) {
		throw error(404, 'Sequence not found');
	}

	const { data: campaigns } = await supabase
		.from('email_campaigns')
		.select('*')
		.eq('sequence_id', id)
		.order('sequence_step');

	// Get events for all campaigns in this sequence
	const campaignIds = (campaigns || []).map((c) => c.id);
	const eventCounts: Record<string, Record<string, number>> = {};

	if (campaignIds.length > 0) {
		const { data: events } = await supabase
			.from('email_events')
			.select('campaign_id, event_type')
			.in('campaign_id', campaignIds);

		for (const event of events || []) {
			if (!eventCounts[event.campaign_id]) eventCounts[event.campaign_id] = {};
			eventCounts[event.campaign_id][event.event_type] =
				(eventCounts[event.campaign_id][event.event_type] || 0) + 1;
		}
	}

	return { sequence, campaigns: campaigns || [], eventCounts };
};
