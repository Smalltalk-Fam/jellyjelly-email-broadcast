<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let sending = $state(false);

	const c = $derived(data.campaign);
	const progress = $derived(
		c.total_recipients > 0 ? Math.round((c.total_sent / c.total_recipients) * 100) : 0
	);
</script>

<svelte:head>
	<title>{c.subject} — Campaign Detail</title>
</svelte:head>

<div class="page">
	<a href="/" class="back">&larr; All Campaigns</a>

	<div class="header">
		<h1>{c.subject}</h1>
		<span
			class="status"
			class:draft={c.status === 'draft'}
			class:sending-status={c.status === 'sending'}
			class:completed={c.status === 'completed'}
			class:failed={c.status === 'failed'}
		>
			{c.status}
		</span>
	</div>

	<!-- Stats -->
	<div class="stats-grid">
		<div class="stat">
			<span class="stat-value">{c.total_recipients}</span>
			<span class="stat-label">Recipients</span>
		</div>
		<div class="stat">
			<span class="stat-value">{c.total_sent}</span>
			<span class="stat-label">Sent</span>
		</div>
		<div class="stat">
			<span class="stat-value" class:has-failures={c.total_failed > 0}>{c.total_failed}</span>
			<span class="stat-label">Failed</span>
		</div>
		<div class="stat">
			<span class="stat-value">{progress}%</span>
			<span class="stat-label">Delivered</span>
		</div>
	</div>

	<!-- Send button for drafts -->
	{#if c.status === 'draft'}
		<div class="send-section">
			<p>This campaign is ready to send to all active JellyJelly users.</p>
			<form
				method="POST"
				action="?/send"
				onsubmit={() => {
					sending = true;
				}}
			>
				<button type="submit" class="btn btn-send" disabled={sending}>
					{sending ? 'Sending...' : 'Send Campaign Now'}
				</button>
			</form>
		</div>
	{/if}

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	{#if form?.sent}
		<p class="success">
			Campaign sent! {form.totalSent} emails delivered, {form.totalFailed} failed.
		</p>
	{/if}

	<!-- Preview -->
	<div class="preview-section">
		<h2>Email Preview</h2>
		<div class="preview-frame">
			{@html c.body_html}
		</div>
	</div>

	<div class="meta">
		<p>Template: <strong>{c.template_name}</strong></p>
		<p>Created: <strong>{new Date(c.created_at).toLocaleString()}</strong></p>
		{#if c.completed_at}
			<p>Completed: <strong>{new Date(c.completed_at).toLocaleString()}</strong></p>
		{/if}
	</div>
</div>

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: 32px 24px;
		color: #e0e0e0;
	}
	.back {
		color: #8b5cf6;
		text-decoration: none;
		font-size: 14px;
	}
	.header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin: 16px 0 32px;
	}
	h1 {
		margin: 0;
		font-size: 24px;
		color: #fff;
		flex: 1;
	}
	h2 {
		font-size: 18px;
		color: #fff;
		margin: 32px 0 16px;
	}
	.status {
		padding: 4px 12px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
	}
	.draft {
		background: #333;
		color: #888;
	}
	.sending-status {
		background: #422006;
		color: #eab308;
	}
	.completed {
		background: #052e16;
		color: #22c55e;
	}
	.failed {
		background: #2d0a0a;
		color: #ef4444;
	}
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 16px;
		margin-bottom: 32px;
	}
	.stat {
		background: #1a1a2e;
		padding: 20px;
		border-radius: 12px;
		text-align: center;
	}
	.stat-value {
		display: block;
		font-size: 28px;
		font-weight: 700;
		color: #fff;
	}
	.stat-label {
		display: block;
		font-size: 12px;
		color: #888;
		margin-top: 4px;
		text-transform: uppercase;
	}
	.has-failures {
		color: #ef4444;
	}
	.send-section {
		background: #1a1a2e;
		padding: 24px;
		border-radius: 12px;
		margin-bottom: 24px;
		border: 1px solid #2a2a3e;
	}
	.send-section p {
		margin: 0 0 16px;
		color: #aaa;
	}
	.btn-send {
		padding: 14px 32px;
		background: linear-gradient(135deg, #22c55e, #16a34a);
		color: #fff;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}
	.btn-send:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		color: #ef4444;
		padding: 12px;
		background: #2d0a0a;
		border-radius: 8px;
	}
	.success {
		color: #22c55e;
		padding: 12px;
		background: #052e16;
		border-radius: 8px;
	}
	.preview-frame {
		padding: 24px;
		background: #0a0a0a;
		border: 1px solid #222;
		border-radius: 12px;
		overflow: auto;
	}
	.meta {
		margin-top: 24px;
		color: #666;
		font-size: 13px;
	}
	.meta p {
		margin: 4px 0;
	}
	.meta strong {
		color: #aaa;
	}
</style>
