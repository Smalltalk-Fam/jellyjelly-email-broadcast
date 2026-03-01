import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';

const TEMPLATE_META: Record<string, { label: string; description: string }> = {
	announcement: { label: 'Announcement', description: 'Feature launches, app updates' },
	digest: { label: 'Weekly Digest', description: 'Content roundups with video thumbnails' },
	spotlight: { label: 'Product Spotlight', description: 'Showcase features or content' },
	event: { label: 'Event Invite', description: 'Livestreams, AMAs, community events' },
	reengagement: { label: 'Re-engagement', description: 'Value-Proof winback campaigns' },
	minimal: { label: 'Minimal', description: 'Personal notes, founder updates' }
};

export const load: PageServerLoad = async () => {
	const templates = import.meta.glob('/src/lib/email-templates/*.html', {
		query: '?raw',
		import: 'default',
		eager: true
	});
	const templateMap: Record<string, string> = {};
	const templateNames: string[] = [];
	for (const [path, content] of Object.entries(templates)) {
		const name = path.split('/').pop()?.replace('.html', '') || '';
		templateNames.push(name);
		templateMap[name] = content as string;
	}
	const templateInfo = templateNames.map((name) => ({
		name,
		label: TEMPLATE_META[name]?.label || name,
		description: TEMPLATE_META[name]?.description || '',
		html: templateMap[name]
	}));
	return { templateNames, templateInfo, templateMap };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const subject = formData.get('subject') as string;
		const bodyHtml = formData.get('bodyHtml') as string;
		const templateName = (formData.get('templateName') as string) || 'announcement';
		const ctaUrl = (formData.get('ctaUrl') as string) || null;

		if (!subject || !bodyHtml) {
			return fail(400, { error: 'Subject and body are required.' });
		}

		const supabase = getSupabaseClient();

		const { data: campaign, error } = await supabase
			.from('email_campaigns')
			.insert({
				subject,
				template_name: templateName,
				body_html: bodyHtml,
				body_preview: bodyHtml.replace(/<[^>]*>/g, '').slice(0, 200),
				sent_by: locals.adminId || null,
				status: 'draft',
				cta_url: ctaUrl
			})
			.select()
			.single();

		if (error || !campaign) {
			console.error('Failed to create campaign:', error);
			return fail(500, { error: 'Failed to create campaign.' });
		}

		// A/B variant creation
		const abEnabled = formData.get('abEnabled') === 'on';
		if (abEnabled) {
			const subjectB = formData.get('subjectB') as string;
			const bodyHtmlB = formData.get('bodyHtmlB') as string;
			const templateNameB = (formData.get('templateNameB') as string) || 'announcement';
			const splitRatio = parseInt(formData.get('splitRatio') as string) || 50;

			// Insert Variant A
			const { error: varAError } = await supabase.from('campaign_variants').insert({
				campaign_id: campaign.id,
				variant_label: 'A',
				subject,
				body_html: bodyHtml,
				template_name: templateName,
				split_percentage: splitRatio,
				cta_url: ctaUrl
			});

			if (varAError) {
				console.error('Failed to create variant A:', varAError);
			}

			// Insert Variant B
			const { error: varBError } = await supabase.from('campaign_variants').insert({
				campaign_id: campaign.id,
				variant_label: 'B',
				subject: subjectB,
				body_html: bodyHtmlB,
				template_name: templateNameB,
				split_percentage: 100 - splitRatio,
				cta_url: ctaUrl
			});

			if (varBError) {
				console.error('Failed to create variant B:', varBError);
			}
		}

		throw redirect(302, `/${campaign.id}`);
	}
};
