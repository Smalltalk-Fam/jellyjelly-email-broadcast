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

/** Inject body and unsubscribe URL into template HTML */
export function buildEmailHtml(template: string, body: string, unsubscribeUrl: string): string {
	return template
		.replace(/\{\{body\}\}/g, body)
		.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
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
	const { campaignId, subject, bodyHtml, templateHtml, batchSize = 50, delayMs = 1000 } = config;

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
				const html = buildEmailHtml(templateHtml, bodyHtml, unsubscribeUrl);

				return mailgun.send({
					to: recipient.email,
					subject,
					html,
					tags: ['campaign', `campaign-${campaignId}`],
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
