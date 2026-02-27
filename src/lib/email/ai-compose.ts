import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import Anthropic from '@anthropic-ai/sdk';

export interface AiComposeRequest {
	prompt: string;
	currentBody?: string;
	mode: 'generate' | 'refine';
}

export interface AiClientConfig {
	provider: 'bedrock' | 'anthropic';
	// Bedrock
	awsRegion?: string;
	awsAccessKeyId?: string;
	awsSecretAccessKey?: string;
	// Anthropic direct
	apiKey?: string;
}

function createClient(config: AiClientConfig): Anthropic | AnthropicBedrock {
	if (config.provider === 'bedrock') {
		return new AnthropicBedrock({
			awsRegion: config.awsRegion ?? 'us-east-1',
			awsAccessKey: config.awsAccessKeyId ?? '',
			awsSecretKey: config.awsSecretAccessKey ?? ''
		});
	}
	return new Anthropic({ apiKey: config.apiKey });
}

export async function aiComposeEmail(
	config: AiClientConfig,
	request: AiComposeRequest
): Promise<string> {
	const client = createClient(config);

	const systemPrompt = `You are an email copywriter for JellyJelly, a social video platform.
Generate HTML email body content (just the inner body, not a full HTML document).
Use inline CSS styles compatible with email clients.
Keep the tone fun, energetic, and on-brand.
Do NOT include <html>, <head>, or <body> tags — just the content that goes inside an email template.
Do NOT include unsubscribe links or footers — those are added by the template.`;

	let userPrompt: string;
	if (request.mode === 'generate') {
		userPrompt = `Write an HTML email body for the following campaign:\n\n${request.prompt}`;
	} else {
		userPrompt = `Here is the current email body HTML:\n\n${request.currentBody}\n\nPlease refine it with this instruction:\n\n${request.prompt}`;
	}

	const model =
		config.provider === 'bedrock'
			? 'anthropic.claude-sonnet-4-5-20250514-v1:0'
			: 'claude-sonnet-4-5-20250514';

	const response = await client.messages.create({
		model,
		max_tokens: 4096,
		system: systemPrompt,
		messages: [{ role: 'user', content: userPrompt }]
	});

	const textBlock = response.content.find((b) => b.type === 'text');
	if (!textBlock || textBlock.type !== 'text') {
		throw new Error('No text response from AI');
	}

	// Extract HTML if wrapped in code fences
	let html = textBlock.text;
	const codeBlockMatch = html.match(/```html?\s*\n([\s\S]*?)```/);
	if (codeBlockMatch) {
		html = codeBlockMatch[1].trim();
	}

	return html;
}

/* ------------------------------------------------------------------ */
/*  Re-engagement sequence generation                                  */
/* ------------------------------------------------------------------ */

export interface AuditData {
	features: { changed: string; replaced: string; impact: string }[];
	painPoint: string;
	painSolution: string;
	speedMetric?: string;
}

export interface SequenceEmail {
	subject: string;
	preheader: string;
	bodyHtml: string;
	templateName: string;
}

export async function aiGenerateSequence(
	config: AiClientConfig,
	audit: AuditData
): Promise<SequenceEmail[]> {
	const client = createClient(config);

	const systemPrompt = `You are an email copywriter for JellyJelly, a social video platform.
You are generating a 3-email re-engagement sequence using the "Value-Proof" framework.
The goal is to prove the product has evolved, NOT to say "we miss you".

Rules:
- 75-100 words per email body
- Single CTA per email
- No generic cliches ("We miss you", "Come back", "It's been a while")
- Zero-click optimization: provide value in the email itself
- Use inline CSS styles compatible with email clients
- Do NOT include <html>, <head>, or <body> tags
- Do NOT include unsubscribe links or footers`;

	const userPrompt = `Based on this Product Audit, generate a 3-email re-engagement sequence:

FEATURE UPDATES:
${audit.features.map((f, i) => `${i + 1}. Changed: ${f.changed}\n   Replaced: ${f.replaced}\n   Impact: ${f.impact}`).join('\n')}

PAIN POINT: ${audit.painPoint}
SOLUTION: ${audit.painSolution}
${audit.speedMetric ? `SPEED-TO-VALUE METRIC: ${audit.speedMetric}` : ''}

Generate exactly 3 emails as a JSON array:

Email 1 - "What You Missed" (template: reengagement)
- Subject line using product evolution pattern (6-10 words)
- Body showing feature updates with before/after framing
- CTA: "SEE WHAT'S NEW"

Email 2 - "Direct-to-Expert" (template: minimal)
- Subject line that's personal and direct (6-10 words)
- Body as a personal note from the team addressing the pain point
- CTA: subtle text link

Email 3 - "Insider Access" (template: announcement)
- Subject line with exclusivity angle (6-10 words)
- Body offering exclusive access or beta invite
- CTA: "CHECK IT OUT"

Return ONLY a JSON array of 3 objects, each with: subject, preheader, bodyHtml, templateName
No markdown fences.`;

	const model =
		config.provider === 'bedrock'
			? 'anthropic.claude-sonnet-4-5-20250514-v1:0'
			: 'claude-sonnet-4-5-20250514';

	const response = await client.messages.create({
		model,
		max_tokens: 4096,
		system: systemPrompt,
		messages: [{ role: 'user', content: userPrompt }]
	});

	const textBlock = response.content.find((b) => b.type === 'text');
	if (!textBlock || textBlock.type !== 'text') {
		throw new Error('No text response from AI');
	}

	let text = textBlock.text.trim();
	// Strip markdown fences if present
	if (text.startsWith('```')) {
		text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
	}
	// Fix trailing commas
	text = text.replace(/,\s*([}\]])/g, '$1');

	const emails: SequenceEmail[] = JSON.parse(text);
	return emails;
}
