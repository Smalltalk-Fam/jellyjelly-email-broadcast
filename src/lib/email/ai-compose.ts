import Anthropic from '@anthropic-ai/sdk';

export interface AiComposeRequest {
	prompt: string;
	currentBody?: string;
	mode: 'generate' | 'refine';
}

export async function aiComposeEmail(
	apiKey: string,
	request: AiComposeRequest
): Promise<string> {
	const client = new Anthropic({ apiKey });

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

	const response = await client.messages.create({
		model: 'claude-sonnet-4-5-20250514',
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
