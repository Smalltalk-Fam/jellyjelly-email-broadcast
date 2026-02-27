import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getSupabaseClient } from '$lib/server/supabase';
import { aiGenerateSequence, type AiClientConfig, type AuditData } from '$lib/email/ai-compose';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	generate: async ({ request }) => {
		const formData = await request.formData();

		// Parse audit data from form
		const featureCount = parseInt(formData.get('featureCount') as string) || 1;
		const features = [];
		for (let i = 0; i < featureCount; i++) {
			features.push({
				changed: (formData.get(`feature_${i}_changed`) as string) || '',
				replaced: (formData.get(`feature_${i}_replaced`) as string) || '',
				impact: (formData.get(`feature_${i}_impact`) as string) || ''
			});
		}

		const audit: AuditData = {
			features: features.filter((f) => f.changed),
			painPoint: (formData.get('painPoint') as string) || '',
			painSolution: (formData.get('painSolution') as string) || '',
			speedMetric: (formData.get('speedMetric') as string) || undefined
		};

		// Build AI config
		let config: AiClientConfig;
		if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
			config = {
				provider: 'bedrock',
				awsRegion: env.AWS_REGION || 'us-east-1',
				awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
				awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY
			};
		} else if (env.ANTHROPIC_API_KEY) {
			config = { provider: 'anthropic', apiKey: env.ANTHROPIC_API_KEY };
		} else {
			return fail(500, { error: 'No AI provider configured.' });
		}

		try {
			const emails = await aiGenerateSequence(config, audit);
			return { emails, audit };
		} catch (err) {
			console.error('AI sequence generation error:', err);
			return fail(500, { error: 'Failed to generate sequence. Try again.' });
		}
	},

	save: async ({ request, locals }) => {
		const formData = await request.formData();
		const supabase = getSupabaseClient();

		const sequenceName =
			(formData.get('sequenceName') as string) || 'Re-engagement Sequence';
		const spacingDays = parseInt(formData.get('spacingDays') as string) || 7;
		const startDate = formData.get('startDate') as string;
		const auditJson = formData.get('auditData') as string;

		// Create sequence
		const { data: sequence, error: seqError } = await supabase
			.from('email_sequences')
			.insert({
				name: sequenceName,
				campaign_type: 'reengagement',
				spacing_days: spacingDays,
				audit_data: auditJson ? JSON.parse(auditJson) : null,
				status: 'active',
				created_by: locals.adminId || null
			})
			.select()
			.single();

		if (seqError || !sequence) {
			console.error('Failed to create sequence:', seqError);
			return fail(500, { error: 'Failed to create sequence.' });
		}

		// Create 3 campaigns linked to the sequence
		for (let step = 1; step <= 3; step++) {
			const subject = formData.get(`email_${step}_subject`) as string;
			const bodyHtml = formData.get(`email_${step}_bodyHtml`) as string;
			const templateName = formData.get(`email_${step}_templateName`) as string;
			const preheader = formData.get(`email_${step}_preheader`) as string;

			const scheduledAt = startDate
				? new Date(
						new Date(startDate).getTime() + (step - 1) * spacingDays * 86400000
					).toISOString()
				: null;

			await supabase.from('email_campaigns').insert({
				subject,
				body_html: bodyHtml,
				body_preview: bodyHtml?.replace(/<[^>]*>/g, '').slice(0, 200),
				template_name: templateName || 'announcement',
				preheader,
				sequence_id: sequence.id,
				sequence_step: step,
				scheduled_at: scheduledAt,
				sent_by: locals.adminId || null,
				status: 'draft'
			});
		}

		throw redirect(302, '/sequences');
	}
};
