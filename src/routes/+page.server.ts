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
		return { campaigns: [], sequences: [] };
	}

	const campaignList = campaigns || [];

	// Fetch event counts for all campaigns in one query
	const campaignIds = campaignList.map((c) => c.id);
	const metricsMap: Record<string, { delivered: number; opened: number; clicked: number }> = {};

	if (campaignIds.length > 0) {
		const { data: events } = await supabase
			.from('email_events')
			.select('campaign_id, event_type')
			.in('campaign_id', campaignIds);

		for (const event of events || []) {
			if (!metricsMap[event.campaign_id]) {
				metricsMap[event.campaign_id] = { delivered: 0, opened: 0, clicked: 0 };
			}
			const m = metricsMap[event.campaign_id];
			if (event.event_type === 'delivered') m.delivered++;
			else if (event.event_type === 'opened') m.opened++;
			else if (event.event_type === 'clicked') m.clicked++;
		}
	}

	// Calculate rates for each campaign
	const campaignsWithMetrics = campaignList.map((c) => {
		const m = metricsMap[c.id] || { delivered: 0, opened: 0, clicked: 0 };
		return {
			...c,
			delivered: m.delivered,
			opened: m.opened,
			clicked: m.clicked,
			openRate: m.delivered > 0 ? m.opened / m.delivered : null,
			clickRate: m.delivered > 0 ? m.clicked / m.delivered : null
		};
	});

	// Load active sequences with next scheduled date
	const { data: sequences } = await supabase
		.from('email_sequences')
		.select('*')
		.eq('status', 'active')
		.order('created_at', { ascending: false });

	const sequencesWithNext = [];
	for (const seq of sequences || []) {
		const { data: nextCampaign } = await supabase
			.from('email_campaigns')
			.select('scheduled_at, sequence_step, subject')
			.eq('sequence_id', seq.id)
			.eq('status', 'draft')
			.order('sequence_step')
			.limit(1);

		sequencesWithNext.push({
			...seq,
			nextScheduledAt: nextCampaign?.[0]?.scheduled_at || null,
			nextStep: nextCampaign?.[0]?.sequence_step || null,
			nextSubject: nextCampaign?.[0]?.subject || null
		});
	}

	return { campaigns: campaignsWithMetrics, sequences: sequencesWithNext };
};
