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
	preheader?: string;
	ctaUrl?: string;
	bgColor?: string;
	cardColor?: string;
	btnColor?: string;
	headingColor?: string;
	bodyColor?: string;
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

/** Auto-compute contrasting text color for a given background hex */
function contrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#1a1731' : '#F8F9FF';
}

function isLightColor(hex: string): boolean {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	// Threshold 0.75 ensures medium-blue backgrounds like #8BABF3 get the white logo
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.75;
}

/** Inject body, unsubscribe URL, subject, preheader, CTA URL, and color tokens into template HTML */
export function buildEmailHtml(
	template: string,
	body: string,
	unsubscribeUrl: string,
	subject?: string,
	preheader?: string,
	ctaUrl?: string,
	bgColor?: string,
	cardColor?: string,
	btnColor?: string,
	headingColor?: string,
	bodyColor?: string
): string {
	const resolvedBtnColor = btnColor || '#89A9F4';
	const resolvedBgColor = bgColor || '#1a1731';
	const resolvedCardColor = cardColor || '#161830';
	const cr = parseInt(resolvedCardColor.slice(1, 3), 16);
	const cg = parseInt(resolvedCardColor.slice(3, 5), 16);
	const cb = parseInt(resolvedCardColor.slice(5, 7), 16);
	const cardLight = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255 > 0.5;
	const shift = cardLight ? -20 : 15;
	const clamp = (v: number) => Math.max(0, Math.min(255, v + shift));
	const cardBorderColor = '#' + [clamp(cr), clamp(cg), clamp(cb)].map(v => v.toString(16).padStart(2, '0')).join('');
	return template
		.replace(/\{\{body\}\}/g, body)
		.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
		.replace(/\{\{subject\}\}/g, subject || '')
		.replace(/\{\{preheader\}\}/g, preheader || '')
		.replace(/\{\{cta_url\}\}/g, ctaUrl || 'https://jellyjelly.com')
		.replace(/\{\{bg_color\}\}/g, resolvedBgColor)
		.replace(/\{\{card_color\}\}/g, resolvedCardColor)
		.replace(/\{\{card_border_color\}\}/g, cardBorderColor)
		.replace(/\{\{btn_color\}\}/g, resolvedBtnColor)
		.replace(/\{\{btn_text_color\}\}/g, contrastColor(resolvedBtnColor))
		.replace(/\{\{heading_color\}\}/g, headingColor || '#F5F0EB')
		.replace(/\{\{body_color\}\}/g, bodyColor || '#F5F0EB')
		.replace(/\{\{logo_src\}\}/g, isLightColor(resolvedBgColor)
			? 'https://static1.jellyjelly.com/jelly-logo-blue.png'
			: 'https://static1.jellyjelly.com/jelly-logo-white.png');
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
	const { campaignId, subject, bodyHtml, templateHtml, batchSize = 50, delayMs = 1000, tags, sequenceId, sequenceStep, variantLabel, preheader, ctaUrl, bgColor, cardColor, btnColor, headingColor, bodyColor } = config;

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
				const html = buildEmailHtml(templateHtml, bodyHtml, unsubscribeUrl, subject, preheader, ctaUrl, bgColor, cardColor, btnColor, headingColor, bodyColor);

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
