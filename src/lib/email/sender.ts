import type { MailgunClient } from './mailgun';
import { createUnsubscribeToken } from './tokens';

export interface Recipient {
	email: string;
	userId: string;
}

export interface CampaignConfig {
	campaignId: string;
	subject: string;
	bodyHtml: string;
	templateHtml: string;
	batchSize?: number;
	delayMs?: number;
	tags?: string[];
	sequenceId?: string;
	sequenceStep?: number;
	variantLabel?: string;
}

export interface SendProgress {
	totalSent: number;
	totalFailed: number;
	totalRecipients: number;
}

/** Split an array into chunks */
export function batchArray<T>(items: T[], size: number): T[][] {
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		batches.push(items.slice(i, i + size));
	}
	return batches;
}

/** Inject body, unsubscribe URL, subject, and preheader into template HTML */
export function buildEmailHtml(
	template: string,
	body: string,
	unsubscribeUrl: string,
	subject?: string,
	preheader?: string
): string {
	return template
		.replace(/\{\{body\}\}/g, body)
		.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
		.replace(/\{\{subject\}\}/g, subject || '')
		.replace(/\{\{preheader\}\}/g, preheader || '');
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Send a campaign to all recipients in batches */
export async function sendCampaign(
	mailgun: MailgunClient,
	recipients: Recipient[],
	config: CampaignConfig,
	unsubscribeSecret: string,
	siteUrl: string,
	onProgress?: (progress: SendProgress) => void
): Promise<SendProgress> {
	const { campaignId, subject, bodyHtml, templateHtml, batchSize = 50, delayMs = 1000, tags, sequenceId, sequenceStep, variantLabel } = config;

	// Build tags: explicit tags take priority, otherwise build from config fields
	const resolvedTags: string[] = tags ? [...tags] : [`campaign-${campaignId}`];
	if (sequenceId && !resolvedTags.some((t) => t.startsWith('sequence-'))) {
		resolvedTags.push(`sequence-${sequenceId}`);
	}
	if (sequenceStep != null && !resolvedTags.some((t) => t.startsWith('step-'))) {
		resolvedTags.push(`step-${sequenceStep}`);
	}
	if (variantLabel && !resolvedTags.some((t) => t.startsWith('variant-'))) {
		resolvedTags.push(`variant-${variantLabel}`);
	}

	const progress: SendProgress = {
		totalSent: 0,
		totalFailed: 0,
		totalRecipients: recipients.length
	};

	const batches = batchArray(recipients, batchSize);

	for (let i = 0; i < batches.length; i++) {
		const batch = batches[i];

		const results = await Promise.allSettled(
			batch.map(async (recipient) => {
				const token = createUnsubscribeToken(recipient.email, campaignId, unsubscribeSecret);
				const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
				const html = buildEmailHtml(templateHtml, bodyHtml, unsubscribeUrl, subject);

				return mailgun.send({
					to: recipient.email,
					subject,
					html,
					tags: resolvedTags,
					headers: {
						'List-Unsubscribe': `<${unsubscribeUrl}>`,
						'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
					}
				});
			})
		);

		for (const result of results) {
			if (result.status === 'fulfilled' && result.value.success) {
				progress.totalSent++;
			} else {
				progress.totalFailed++;
			}
		}

		onProgress?.(progress);

		if (i < batches.length - 1) {
			await sleep(delayMs);
		}
	}

	return progress;
}

/** Shuffle recipients and split into two groups by percentage (Fisher-Yates shuffle) */
export function splitRecipients(
	recipients: Recipient[],
	splitPercentageA: number
): { groupA: Recipient[]; groupB: Recipient[] } {
	const shuffled = [...recipients];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	const splitIndex = Math.round(shuffled.length * (splitPercentageA / 100));
	return {
		groupA: shuffled.slice(0, splitIndex),
		groupB: shuffled.slice(splitIndex)
	};
}
