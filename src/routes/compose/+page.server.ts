import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/server/supabase';

export const load: PageServerLoad = async () => {
	const templates = import.meta.glob('/src/lib/email-templates/*.html', {
		query: '?raw',
		import: 'default',
		eager: true
	});
	const templateNames = Object.keys(templates).map(
		(path) => path.split('/').pop()?.replace('.html', '') || ''
	);
	return { templateNames };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const formData = await request.formData();
		const subject = formData.get('subject') as string;
		const bodyHtml = formData.get('bodyHtml') as string;
		const templateName = (formData.get('templateName') as string) || 'default';

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
				status: 'draft'
			})
			.select()
			.single();

		if (error || !campaign) {
			console.error('Failed to create campaign:', error);
			return fail(500, { error: 'Failed to create campaign.' });
		}

		throw redirect(302, `/${campaign.id}`);
	}
};
