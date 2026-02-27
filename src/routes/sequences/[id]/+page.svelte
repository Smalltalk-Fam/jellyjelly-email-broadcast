<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const seq = $derived(data.sequence);
	const campaigns = $derived(data.campaigns);
	const eventCounts = $derived(data.eventCounts);

	function statusStyle(status: string): { bg: string; color: string } {
		switch (status) {
			case 'completed':
				return { bg: '#052e16', color: '#22c55e' };
			case 'sending':
				return { bg: '#422006', color: '#eab308' };
			case 'active':
				return { bg: '#052e16', color: '#22c55e' };
			case 'paused':
				return { bg: '#422006', color: '#eab308' };
			default:
				return { bg: '#333', color: '#888' };
		}
	}

	function campaignStatusLabel(status: string, scheduledAt: string | null): { label: string; cssClass: string } {
		if (status === 'completed') return { label: 'Sent', cssClass: 'step-completed' };
		if (status === 'sending') return { label: 'Sending', cssClass: 'step-sending' };
		if (status === 'draft' && scheduledAt) return { label: 'Scheduled', cssClass: 'step-scheduled' };
		return { label: 'Draft', cssClass: 'step-draft' };
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '--';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Aggregate funnel metrics across all steps
	const totalSent = $derived(
		campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)
	);
	const totalOpened = $derived(
		campaigns.reduce((sum, c) => sum + (eventCounts[c.id]?.['opened'] || 0), 0)
	);
	const totalClicked = $derived(
		campaigns.reduce((sum, c) => sum + (eventCounts[c.id]?.['clicked'] || 0), 0)
	);

	const openRate = $derived(totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0');
	const clickRateOfOpened = $derived(totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0');
	const clickRateOfSent = $derived(totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0');
</script>

<svelte:head>
	<title>{seq.name} -- Sequence Detail</title>
</svelte:head>

<div class="page">
	<a href="/sequences" class="back">&larr; All Sequences</a>

	<!-- Header -->
	<div class="header">
		<div class="header-info">
			<h1>{seq.name}</h1>
			<div class="header-meta">
				<span class="status-badge" style="background: {statusStyle(seq.status).bg}; color: {statusStyle(seq.status).color};">
					{seq.status}
				</span>
				<span class="meta-item">{seq.campaign_type || 'reengagement'}</span>
				<span class="meta-sep">|</span>
				<span class="meta-item">{seq.spacing_days} days between emails</span>
				<span class="meta-sep">|</span>
				<span class="meta-item">Created {formatDate(seq.created_at)}</span>
			</div>
		</div>
	</div>

	<!-- Timeline Visualization -->
	<section class="timeline-section">
		<h2>Sequence Timeline</h2>
		<div class="timeline">
			{#each campaigns as campaign, i}
				{@const cs = campaignStatusLabel(campaign.status, campaign.scheduled_at)}
				<div class="timeline-step">
					<div class="step-circle {cs.cssClass}">
						{i + 1}
					</div>
					<div class="step-content">
						<div class="step-status-row">
							<span class="step-status-tag {cs.cssClass}">{cs.label}</span>
						</div>
						<p class="step-subject">{campaign.subject}</p>
						{#if campaign.template_name}
							<span class="step-template">{campaign.template_name}</span>
						{/if}
						<p class="step-date">
							{#if campaign.status === 'completed' && campaign.completed_at}
								Sent {formatDate(campaign.completed_at)}
							{:else if campaign.scheduled_at}
								Scheduled {formatDate(campaign.scheduled_at)}
							{:else}
								Not scheduled
							{/if}
						</p>
					</div>
				</div>
				{#if i < campaigns.length - 1}
					<div class="timeline-connector-wrap">
						<div class="timeline-connector" class:active={campaign.status === 'completed'}></div>
						<span class="connector-label">{seq.spacing_days} days</span>
					</div>
				{/if}
			{/each}
		</div>
	</section>

	<!-- Funnel Metrics -->
	<section class="funnel-section">
		<h2>Aggregate Funnel</h2>
		<div class="funnel">
			<div class="funnel-stage">
				<div class="funnel-bar" style="width: 100%;">
					<span class="funnel-bar-inner sent-bar"></span>
				</div>
				<div class="funnel-label">
					<span class="funnel-metric-name">Sent</span>
					<span class="funnel-metric-value">{totalSent}</span>
				</div>
			</div>
			<div class="funnel-arrow">
				<span class="funnel-drop">{openRate}% opened</span>
			</div>
			<div class="funnel-stage">
				<div class="funnel-bar" style="width: {totalSent > 0 ? Math.max((totalOpened / totalSent) * 100, 8) : 8}%;">
					<span class="funnel-bar-inner opened-bar"></span>
				</div>
				<div class="funnel-label">
					<span class="funnel-metric-name">Opened</span>
					<span class="funnel-metric-value">{totalOpened}</span>
				</div>
			</div>
			<div class="funnel-arrow">
				<span class="funnel-drop">{clickRateOfOpened}% of opened clicked</span>
			</div>
			<div class="funnel-stage">
				<div class="funnel-bar" style="width: {totalSent > 0 ? Math.max((totalClicked / totalSent) * 100, 5) : 5}%;">
					<span class="funnel-bar-inner clicked-bar"></span>
				</div>
				<div class="funnel-label">
					<span class="funnel-metric-name">Clicked</span>
					<span class="funnel-metric-value">{totalClicked}</span>
				</div>
			</div>
		</div>
		<p class="funnel-summary">
			Sent: {totalSent} &rarr; Opened: {totalOpened} ({openRate}%) &rarr; Clicked: {totalClicked} ({clickRateOfOpened}% of opened, {clickRateOfSent}% of sent)
		</p>
	</section>

	<!-- Per-Step Metrics -->
	<section class="per-step-section">
		<h2>Per-Step Metrics</h2>
		<div class="step-metrics-grid">
			{#each campaigns as campaign, i}
				{@const sent = campaign.total_sent || 0}
				{@const opened = eventCounts[campaign.id]?.['opened'] || 0}
				{@const clicked = eventCounts[campaign.id]?.['clicked'] || 0}
				{@const delivered = eventCounts[campaign.id]?.['delivered'] || 0}
				{@const stepOpenRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0.0'}
				{@const stepClickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0.0'}
				<div class="step-metric-card">
					<div class="step-metric-header">
						<span class="step-metric-num">Step {i + 1}</span>
						<span class="step-metric-subject">{campaign.subject}</span>
					</div>
					<div class="step-metric-stats">
						<div class="step-metric-stat">
							<span class="sms-value">{sent}</span>
							<span class="sms-label">Sent</span>
						</div>
						<div class="step-metric-stat">
							<span class="sms-value">{delivered}</span>
							<span class="sms-label">Delivered</span>
						</div>
						<div class="step-metric-stat">
							<span class="sms-value accent">{opened}</span>
							<span class="sms-label">Opened ({stepOpenRate}%)</span>
						</div>
						<div class="step-metric-stat">
							<span class="sms-value accent">{clicked}</span>
							<span class="sms-label">Clicked ({stepClickRate}%)</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px 24px;
		color: #e0e0e0;
	}
	.back {
		color: #89A9F4;
		text-decoration: none;
		font-size: 14px;
	}
	.back:hover {
		text-decoration: underline;
	}

	/* Header */
	.header {
		margin: 16px 0 32px;
	}
	h1 {
		margin: 0;
		font-size: 24px;
		color: #fff;
	}
	h2 {
		font-size: 18px;
		color: #fff;
		margin: 0 0 16px;
	}
	.header-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		flex-wrap: wrap;
	}
	.status-badge {
		padding: 4px 12px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.meta-item {
		font-size: 13px;
		color: #888;
	}
	.meta-sep {
		color: #333;
		font-size: 13px;
	}

	/* Timeline */
	.timeline-section {
		margin-bottom: 40px;
	}
	.timeline {
		display: flex;
		align-items: flex-start;
		gap: 0;
		overflow-x: auto;
		padding: 8px 0;
	}
	.timeline-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 180px;
		max-width: 240px;
		text-align: center;
	}
	.step-circle {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 700;
		margin-bottom: 12px;
		border: 3px solid #333;
		background: #1a1a2e;
		color: #888;
	}
	.step-circle.step-completed {
		border-color: #22c55e;
		background: #052e16;
		color: #22c55e;
	}
	.step-circle.step-sending {
		border-color: #eab308;
		background: #422006;
		color: #eab308;
	}
	.step-circle.step-scheduled {
		border-color: #3b82f6;
		background: #172554;
		color: #3b82f6;
	}
	.step-circle.step-draft {
		border-color: #555;
		background: #1a1a2e;
		color: #888;
	}
	.step-content {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 10px;
		padding: 14px 16px;
		width: 100%;
	}
	.step-status-row {
		margin-bottom: 8px;
	}
	.step-status-tag {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		padding: 3px 10px;
		border-radius: 6px;
	}
	.step-status-tag.step-completed {
		background: #052e16;
		color: #22c55e;
	}
	.step-status-tag.step-sending {
		background: #422006;
		color: #eab308;
	}
	.step-status-tag.step-scheduled {
		background: #172554;
		color: #3b82f6;
	}
	.step-status-tag.step-draft {
		background: #333;
		color: #888;
	}
	.step-subject {
		font-size: 13px;
		font-weight: 600;
		color: #e0e0e0;
		margin: 0 0 4px;
		line-height: 1.4;
	}
	.step-template {
		display: inline-block;
		font-size: 11px;
		padding: 2px 8px;
		background: #2a2a3e;
		border-radius: 6px;
		color: #888;
		margin-bottom: 6px;
	}
	.step-date {
		font-size: 12px;
		color: #666;
		margin: 0;
	}

	/* Timeline connector */
	.timeline-connector-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-top: 20px;
		min-width: 70px;
	}
	.timeline-connector {
		width: 50px;
		height: 3px;
		background: #2a2a3e;
		border-radius: 2px;
	}
	.timeline-connector.active {
		background: #22c55e;
	}
	.connector-label {
		font-size: 10px;
		color: #555;
		margin-top: 4px;
	}

	/* Funnel */
	.funnel-section {
		margin-bottom: 40px;
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 14px;
		padding: 24px;
	}
	.funnel {
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.funnel-stage {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 0;
	}
	.funnel-bar {
		height: 36px;
		border-radius: 8px;
		overflow: hidden;
		min-width: 40px;
	}
	.funnel-bar-inner {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 8px;
	}
	.sent-bar {
		background: linear-gradient(90deg, #6366f1, #8b5cf6);
	}
	.opened-bar {
		background: linear-gradient(90deg, #3b82f6, #60a5fa);
	}
	.clicked-bar {
		background: linear-gradient(90deg, #22c55e, #4ade80);
	}
	.funnel-label {
		display: flex;
		flex-direction: column;
		min-width: 80px;
	}
	.funnel-metric-name {
		font-size: 12px;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.funnel-metric-value {
		font-size: 22px;
		font-weight: 700;
		color: #fff;
	}
	.funnel-arrow {
		padding: 4px 0 4px 20px;
	}
	.funnel-drop {
		font-size: 12px;
		color: #666;
		font-style: italic;
	}
	.funnel-summary {
		margin: 16px 0 0;
		font-size: 13px;
		color: #888;
		border-top: 1px solid #2a2a3e;
		padding-top: 12px;
	}

	/* Per-step metrics */
	.per-step-section {
		margin-bottom: 40px;
	}
	.step-metrics-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.step-metric-card {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
		padding: 20px;
	}
	.step-metric-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
	}
	.step-metric-num {
		font-size: 12px;
		font-weight: 700;
		color: #89A9F4;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.step-metric-subject {
		font-size: 14px;
		font-weight: 600;
		color: #e0e0e0;
	}
	.step-metric-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.step-metric-stat {
		text-align: center;
		padding: 10px 8px;
		background: #12121f;
		border-radius: 8px;
		border: 1px solid #2a2a3e;
	}
	.sms-value {
		display: block;
		font-size: 20px;
		font-weight: 700;
		color: #fff;
	}
	.sms-value.accent {
		color: #89a9f4;
	}
	.sms-label {
		display: block;
		font-size: 11px;
		color: #888;
		margin-top: 2px;
	}

	@media (max-width: 700px) {
		.timeline {
			flex-direction: column;
			align-items: stretch;
		}
		.timeline-step {
			max-width: 100%;
			min-width: 0;
		}
		.timeline-connector-wrap {
			padding: 8px 0;
			min-width: 0;
		}
		.timeline-connector {
			width: 3px;
			height: 24px;
		}
		.step-metric-stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
