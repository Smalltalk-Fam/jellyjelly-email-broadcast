<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let sending = $state(false);

	const c = $derived(data.campaign);
	const progress = $derived(
		c.total_recipients > 0 ? Math.round((c.total_sent / c.total_recipients) * 100) : 0
	);

	const delivered = $derived(data.eventCounts['delivered'] || 0);
	const opened = $derived(data.eventCounts['opened'] || 0);
	const clicked = $derived(data.eventCounts['clicked'] || 0);
	const bounced = $derived(data.eventCounts['bounced'] || 0);
	const unsubscribed = $derived(data.eventCounts['unsubscribed'] || 0);
	const complained = $derived(data.eventCounts['complained'] || 0);

	const openRate = $derived(delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0');
	const clickRate = $derived(delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : '0.0');

	function variantRate(variantId: string, eventType: string): string {
		const counts = data.variantEventCounts[variantId];
		if (!counts) return '0.0';
		const del = counts['delivered'] || 0;
		const val = counts[eventType] || 0;
		return del > 0 ? ((val / del) * 100).toFixed(1) : '0.0';
	}

	function variantCount(variantId: string, eventType: string): number {
		return data.variantEventCounts[variantId]?.[eventType] || 0;
	}

	function findWinner(eventType: string): string {
		if (!data.variants || data.variants.length < 2) return '\u2014';
		let bestRate = -1;
		let bestLabel = '';
		let tie = false;
		for (const v of data.variants) {
			const counts = data.variantEventCounts[v.id];
			const del = counts?.['delivered'] || 0;
			const val = counts?.[eventType] || 0;
			const rate = del > 0 ? val / del : 0;
			if (rate > bestRate) {
				bestRate = rate;
				bestLabel = v.variant_label;
				tie = false;
			} else if (rate === bestRate) {
				tie = true;
			}
		}
		return tie ? '\u2014' : bestLabel;
	}

	const openWinner = $derived(findWinner('opened'));
	const clickWinner = $derived(findWinner('clicked'));

	// Statistical significance
	const sig = $derived(data.significance);

	function formatPValue(p: number): string {
		if (p < 0.001) return '< 0.001';
		if (p < 0.01) return p.toFixed(3);
		return p.toFixed(2);
	}

	function sigLabel(result: { significant: boolean; confidence: number; sampleSizeOk: boolean }): string {
		if (!result.sampleSizeOk) return 'Need more data';
		if (result.significant) return `Significant (${result.confidence}% confidence)`;
		if (result.confidence === 90) return 'Trending (90% confidence)';
		return 'Not significant';
	}

	function sigClass(result: { significant: boolean; confidence: number; sampleSizeOk: boolean }): string {
		if (!result.sampleSizeOk) return 'sig-pending';
		if (result.significant) return 'sig-yes';
		if (result.confidence === 90) return 'sig-trending';
		return 'sig-no';
	}
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

	<!-- Send Stats -->
	<div class="stats-grid four-col">
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
			<span class="stat-label">Progress</span>
		</div>
	</div>

	<!-- Engagement Metrics -->
	{#if c.status !== 'draft'}
		<h2>Engagement Metrics</h2>
		<div class="stats-grid four-col">
			<div class="stat">
				<span class="stat-value">{delivered}</span>
				<span class="stat-label">Delivered</span>
			</div>
			<div class="stat">
				<span class="stat-value accent">{opened}</span>
				<span class="stat-label">Opened</span>
			</div>
			<div class="stat">
				<span class="stat-value accent">{clicked}</span>
				<span class="stat-label">Clicked</span>
			</div>
			<div class="stat">
				<span class="stat-value" class:has-failures={bounced > 0}>{bounced}</span>
				<span class="stat-label">Bounced</span>
			</div>
		</div>
		<div class="stats-grid four-col">
			<div class="stat">
				<span class="stat-value accent">{openRate}%</span>
				<span class="stat-label">Open Rate</span>
			</div>
			<div class="stat">
				<span class="stat-value accent">{clickRate}%</span>
				<span class="stat-label">Click Rate</span>
			</div>
			<div class="stat">
				<span class="stat-value" class:has-failures={unsubscribed > 0}>{unsubscribed}</span>
				<span class="stat-label">Unsubscribed</span>
			</div>
			<div class="stat">
				<span class="stat-value" class:has-failures={complained > 0}>{complained}</span>
				<span class="stat-label">Complaints</span>
			</div>
		</div>
	{/if}

	<!-- A/B Comparison Table -->
	{#if data.variants && data.variants.length > 1}
		<section class="ab-comparison">
			<h2>A/B Test Results</h2>
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Metric</th>
							{#each data.variants as variant}
								<th>Variant {variant.variant_label}</th>
							{/each}
							<th>Winner</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Subject</td>
							{#each data.variants as variant}
								<td class="subject-cell">{variant.subject}</td>
							{/each}
							<td class="winner">&mdash;</td>
						</tr>
						<tr>
							<td>Recipients</td>
							{#each data.variants as variant}
								<td>{variant.total_recipients || 0}</td>
							{/each}
							<td class="winner">&mdash;</td>
						</tr>
						<tr>
							<td>Delivered</td>
							{#each data.variants as variant}
								<td>{variantCount(variant.id, 'delivered')}</td>
							{/each}
							<td class="winner">&mdash;</td>
						</tr>
						<tr>
							<td>Open Rate</td>
							{#each data.variants as variant}
								<td>{variantRate(variant.id, 'opened')}%</td>
							{/each}
							<td class="winner" class:winner-highlight={openWinner !== '\u2014'}>{openWinner}</td>
						</tr>
						<tr>
							<td>Click Rate</td>
							{#each data.variants as variant}
								<td>{variantRate(variant.id, 'clicked')}%</td>
							{/each}
							<td class="winner" class:winner-highlight={clickWinner !== '\u2014'}>{clickWinner}</td>
						</tr>
						<tr>
							<td>Bounces</td>
							{#each data.variants as variant}
								<td>{variantCount(variant.id, 'bounced')}</td>
							{/each}
							<td class="winner">&mdash;</td>
						</tr>
						<tr>
							<td>Unsubscribes</td>
							{#each data.variants as variant}
								<td>{variantCount(variant.id, 'unsubscribed')}</td>
							{/each}
							<td class="winner">&mdash;</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Statistical Significance Panel -->
			{#if sig}
				<div class="sig-panel">
					<h3>Statistical Significance</h3>
					<p class="sig-method">Two-proportion z-test &middot; Two-tailed &middot; &alpha; = 0.05</p>

					<div class="sig-grid">
						<!-- Opens significance -->
						<div class="sig-card">
							<div class="sig-metric">Open Rate</div>
							<div class="sig-badge {sigClass(sig.opens)}">{sigLabel(sig.opens)}</div>
							{#if sig.opens.sampleSizeOk}
								<div class="sig-details">
									<span>p = {formatPValue(sig.opens.pValue)}</span>
									<span>z = {sig.opens.zScore.toFixed(2)}</span>
									{#if sig.opens.lift > 0 && sig.opens.winnerLabel !== '—'}
										<span class="sig-lift">Variant {sig.opens.winnerLabel} +{sig.opens.lift}%</span>
									{/if}
								</div>
							{:else}
								<div class="sig-details">
									<span>Need 30+ delivered per variant</span>
								</div>
							{/if}
						</div>

						<!-- Clicks significance -->
						<div class="sig-card">
							<div class="sig-metric">Click Rate</div>
							<div class="sig-badge {sigClass(sig.clicks)}">{sigLabel(sig.clicks)}</div>
							{#if sig.clicks.sampleSizeOk}
								<div class="sig-details">
									<span>p = {formatPValue(sig.clicks.pValue)}</span>
									<span>z = {sig.clicks.zScore.toFixed(2)}</span>
									{#if sig.clicks.lift > 0 && sig.clicks.winnerLabel !== '—'}
										<span class="sig-lift">Variant {sig.clicks.winnerLabel} +{sig.clicks.lift}%</span>
									{/if}
								</div>
							{:else}
								<div class="sig-details">
									<span>Need 30+ delivered per variant</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</section>
	{/if}

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
		gap: 16px;
		margin-bottom: 16px;
	}
	.four-col {
		grid-template-columns: repeat(4, 1fr);
	}
	.stat {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
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
	.stat-value.accent {
		color: #89a9f4;
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

	/* A/B Comparison */
	.ab-comparison {
		margin-top: 32px;
		margin-bottom: 32px;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: #1a1a2e;
		border-radius: 12px;
		overflow: hidden;
	}
	th,
	td {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid #2a2a3e;
		color: #e0e0e0;
		font-size: 14px;
	}
	th {
		background: #12122a;
		font-weight: 600;
		color: #aaa;
		text-transform: uppercase;
		font-size: 12px;
	}
	tr:last-child td {
		border-bottom: none;
	}
	.subject-cell {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.winner {
		color: #888;
		font-weight: 500;
	}
	.winner-highlight {
		color: #89a9f4;
		font-weight: 600;
	}
	/* Statistical Significance Panel */
	.sig-panel {
		margin-top: 20px;
		background: #12122a;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
		padding: 20px 24px;
	}
	.sig-panel h3 {
		margin: 0 0 4px;
		font-size: 15px;
		color: #fff;
		font-weight: 600;
	}
	.sig-method {
		margin: 0 0 16px;
		font-size: 12px;
		color: #666;
	}
	.sig-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.sig-card {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 10px;
		padding: 16px;
	}
	.sig-metric {
		font-size: 13px;
		color: #888;
		text-transform: uppercase;
		font-weight: 600;
		margin-bottom: 8px;
	}
	.sig-badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 10px;
	}
	.sig-yes {
		background: #052e16;
		color: #22c55e;
	}
	.sig-trending {
		background: #422006;
		color: #eab308;
	}
	.sig-no {
		background: #1a1a2e;
		color: #888;
		border: 1px solid #333;
	}
	.sig-pending {
		background: #1a1a2e;
		color: #666;
		border: 1px dashed #333;
	}
	.sig-details {
		display: flex;
		gap: 16px;
		font-size: 13px;
		color: #888;
	}
	.sig-lift {
		color: #89a9f4;
		font-weight: 600;
	}

	/* Send section */
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
