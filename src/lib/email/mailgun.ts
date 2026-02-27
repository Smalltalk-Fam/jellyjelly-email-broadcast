interface SendEmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	tags?: string[];
	headers?: Record<string, string>;
}

interface SendResult {
	success: boolean;
	data?: { id: string; message: string };
	error?: { message: string };
}

export interface SuppressionEntry {
	address: string;
	type: 'unsubscribe' | 'bounce' | 'complaint';
	created_at: string;
	code?: string;
	error?: string;
	tags?: string[];
}

export function createMailgunClient(apiKey: string, domain: string) {
	const auth = Buffer.from(`api:${apiKey}`).toString('base64');
	const domainUrl = `https://api.mailgun.net/v3/${domain}`;
	const baseUrl = `${domainUrl}/messages`;

	async function send(options: SendEmailOptions): Promise<SendResult> {
		const fromEmail = `JellyJelly <campaigns@${domain}>`;
		const recipients = Array.isArray(options.to) ? options.to : [options.to];

		const formData = new URLSearchParams();
		formData.append('from', fromEmail);
		for (const recipient of recipients) {
			formData.append('to', recipient);
		}
		formData.append('subject', options.subject);
		formData.append('html', options.html);

		if (options.text) {
			formData.append('text', options.text);
		}

		// Standard headers
		formData.append('h:Reply-To', `support@${domain}`);
		formData.append('h:X-Mailer', 'JellyJelly');

		// Custom headers (e.g., List-Unsubscribe)
		if (options.headers) {
			for (const [key, value] of Object.entries(options.headers)) {
				formData.append(`h:${key}`, value);
			}
		}

		// Tags
		if (options.tags) {
			for (const tag of options.tags) {
				formData.append('o:tag', tag);
			}
		}

		// Tracking
		formData.append('o:tracking', 'yes');
		formData.append('o:tracking-clicks', 'yes');
		formData.append('o:tracking-opens', 'yes');

		try {
			const response = await fetch(baseUrl, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: formData.toString()
			});

			if (!response.ok) {
				const errorText = await response.text();
				let error: { message: string };
				try {
					error = JSON.parse(errorText);
				} catch {
					error = { message: errorText };
				}
				console.error('Mailgun send failed:', {
					status: response.status,
					error,
					to: options.to
				});
				return { success: false, error };
			}

			const data = await response.json();
			return { success: true, data };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('Mailgun request error:', message);
			return { success: false, error: { message } };
		}
	}

	async function getSuppressions(): Promise<SuppressionEntry[]> {
		const all: SuppressionEntry[] = [];
		for (const type of ['unsubscribes', 'bounces', 'complaints'] as const) {
			const typeLabel = type.slice(0, -1) as SuppressionEntry['type'];
			let url: string | null = `${domainUrl}/${type}?limit=1000`;
			while (url) {
				const res = await fetch(url, {
					headers: { Authorization: `Basic ${auth}` }
				});
				if (!res.ok) break;
				const data = await res.json();
				const items = data.items || [];
				for (const item of items) {
					all.push({
						address: item.address,
						type: typeLabel,
						created_at: item.created_at,
						code: item.code,
						error: item.error,
						tags: item.tags
					});
				}
				url = data.paging?.next && items.length > 0 ? data.paging.next : null;
			}
		}
		return all;
	}

	async function getSuppressedEmails(): Promise<Set<string>> {
		const entries = await getSuppressions();
		return new Set(entries.map((e) => e.address.toLowerCase()));
	}

	async function addUnsubscribe(address: string, tag?: string): Promise<boolean> {
		const formData = new URLSearchParams();
		formData.append('address', address);
		if (tag) formData.append('tag', tag);
		const res = await fetch(`${domainUrl}/unsubscribes`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: formData.toString()
		});
		return res.ok;
	}

	async function removeUnsubscribe(address: string): Promise<boolean> {
		const res = await fetch(`${domainUrl}/unsubscribes/${encodeURIComponent(address)}`, {
			method: 'DELETE',
			headers: { Authorization: `Basic ${auth}` }
		});
		return res.ok;
	}

	return { send, getSuppressions, getSuppressedEmails, addUnsubscribe, removeUnsubscribe };
}

export type MailgunClient = ReturnType<typeof createMailgunClient>;
