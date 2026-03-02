<script lang="ts">
	let webhookStatus = $state<Record<string, any> | null>(null);
	let setupResult = $state<any>(null);
	let loading = $state(false);
	let checking = $state(false);

	async function checkWebhooks() {
		checking = true;
		try {
			const res = await fetch('/api/webhooks/setup');
			webhookStatus = await res.json();
		} catch {
			webhookStatus = { error: 'Failed to check webhook status' };
		} finally {
			checking = false;
		}
	}

	async function configureWebhooks() {
		loading = true;
		try {
			const res = await fetch('/api/webhooks/setup', { method: 'POST' });
			setupResult = await res.json();
			// Refresh status after setup
			await checkWebhooks();
		} catch {
			setupResult = { error: 'Failed to configure webhooks' };
		} finally {
			loading = false;
		}
	}

	const EXPECTED_EVENTS = ['delivered', 'opened', 'clicked', 'unsubscribed', 'complained', 'permanent_fail'];
</script>

<svelte:head>
	<title>Settings — JellyJelly Email</title>
</svelte:head>

<div class="page">
	<h1>Settings</h1>

	<section class="card">
		<h2>Mailgun Webhooks</h2>
		<p class="desc">
			Webhooks let Mailgun send open, click, and delivery events back to this app.
			Without them, analytics won't track engagement.
		</p>

		<div class="actions">
			<button class="btn btn-secondary" onclick={checkWebhooks} disabled={checking}>
				{checking ? 'Checking...' : 'Check Status'}
			</button>
			<button class="btn btn-primary" onclick={configureWebhooks} disabled={loading}>
				{loading ? 'Configuring...' : 'Configure All Webhooks'}
			</button>
		</div>

		{#if webhookStatus}
			{#if webhookStatus.error}
				<div class="alert alert-error">{webhookStatus.error}</div>
			{:else}
				<div class="webhook-grid">
					{#each EXPECTED_EVENTS as event}
						{@const hook = webhookStatus.webhooks?.[event]}
						<div class="webhook-row">
							<span class="event-name">{event}</span>
							{#if hook?.urls && hook.urls.length > 0}
								<span class="badge badge-ok">Active</span>
								<span class="webhook-url">{hook.urls[0]}</span>
							{:else}
								<span class="badge badge-missing">Not configured</span>
							{/if}
						</div>
					{/each}
				</div>
				<p class="domain-note">Domain: {webhookStatus.domain}</p>
			{/if}
		{/if}

		{#if setupResult && !setupResult.error}
			<div class="alert alert-success">
				Webhooks configured! Target: <code>{setupResult.webhookUrl}</code>
			</div>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 800px;
		margin: 0 auto;
		padding: 32px 24px;
		color: #e0e0e0;
	}
	h1 {
		font-size: 24px;
		color: #fff;
		margin: 0 0 24px;
	}
	h2 {
		font-size: 18px;
		color: #fff;
		margin: 0 0 8px;
	}
	.card {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
		padding: 24px;
	}
	.desc {
		color: #888;
		font-size: 14px;
		margin: 0 0 20px;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		gap: 12px;
		margin-bottom: 20px;
	}
	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-primary {
		background: #4469B7;
		color: #fff;
	}
	.btn-primary:hover:not(:disabled) {
		background: #3a5da6;
	}
	.btn-secondary {
		background: #2a2a3e;
		color: #ccc;
	}
	.btn-secondary:hover:not(:disabled) {
		background: #333;
	}
	.webhook-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 16px;
	}
	.webhook-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		background: #12122a;
		border-radius: 8px;
		font-size: 14px;
	}
	.event-name {
		color: #e0e0e0;
		font-weight: 600;
		min-width: 140px;
	}
	.badge {
		padding: 3px 10px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
	}
	.badge-ok {
		background: #052e16;
		color: #22c55e;
	}
	.badge-missing {
		background: #2d0a0a;
		color: #ef4444;
	}
	.webhook-url {
		color: #666;
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.domain-note {
		margin-top: 12px;
		font-size: 12px;
		color: #666;
	}
	.alert {
		margin-top: 16px;
		padding: 12px 16px;
		border-radius: 8px;
		font-size: 14px;
	}
	.alert-success {
		background: #052e16;
		color: #22c55e;
	}
	.alert-error {
		background: #2d0a0a;
		color: #ef4444;
	}
	code {
		background: #0a0a0a;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 12px;
	}
</style>
