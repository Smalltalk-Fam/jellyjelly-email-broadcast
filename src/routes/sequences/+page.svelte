<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function statusColor(status: string) {
		switch (status) {
			case 'active':
				return { bg: '#052e16', color: '#22c55e' };
			case 'completed':
				return { bg: '#052e16', color: '#22c55e' };
			case 'paused':
				return { bg: '#422006', color: '#eab308' };
			case 'draft':
			default:
				return { bg: '#333', color: '#888' };
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function stepsProgress(campaigns: { status: string }[]): string {
		const sent = campaigns.filter(
			(c) => c.status === 'completed' || c.status === 'sending'
		).length;
		return `${sent}/${campaigns.length} sent`;
	}

	function nextScheduled(campaigns: { status: string; scheduled_at: string | null }[]): string | null {
		const upcoming = campaigns
			.filter((c) => c.status === 'draft' && c.scheduled_at)
			.sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
		return upcoming.length > 0 ? upcoming[0].scheduled_at : null;
	}
</script>

<svelte:head>
	<title>Sequences -- JellyJelly Admin</title>
</svelte:head>

<div class="page">
	<header>
		<div>
			<h1>Email Sequences</h1>
			<p class="subtitle">{data.sequences.length} sequence{data.sequences.length !== 1 ? 's' : ''}</p>
		</div>
		<div class="actions">
			<a href="/compose/reengagement" class="btn btn-primary">+ New Re-engagement Sequence</a>
		</div>
	</header>

	{#if data.sequences.length === 0}
		<div class="empty-state">
			<p class="empty-title">No sequences yet</p>
			<p class="empty-desc">Create your first re-engagement sequence to win back inactive users.</p>
			<a href="/compose/reengagement" class="btn btn-primary">+ Create Sequence</a>
		</div>
	{:else}
		<div class="sequence-list">
			{#each data.sequences as seq}
				{@const sc = statusColor(seq.status)}
				{@const next = nextScheduled(seq.campaigns)}
				<a href="/sequences/{seq.id}" class="sequence-card">
					<div class="card-top">
						<div class="card-title-row">
							<h2 class="seq-name">{seq.name}</h2>
							<span
								class="status-badge"
								style="background: {sc.bg}; color: {sc.color};"
							>
								{seq.status}
							</span>
						</div>
						<p class="seq-type">{seq.campaign_type || 'reengagement'}</p>
					</div>

					<div class="card-stats">
						<div class="card-stat">
							<span class="card-stat-value">{stepsProgress(seq.campaigns)}</span>
							<span class="card-stat-label">Steps</span>
						</div>
						<div class="card-stat">
							<span class="card-stat-value">{seq.spacing_days || '--'} days</span>
							<span class="card-stat-label">Spacing</span>
						</div>
						<div class="card-stat">
							<span class="card-stat-value">
								{#if next}
									{formatDate(next)}
								{:else}
									--
								{/if}
							</span>
							<span class="card-stat-label">Next Send</span>
						</div>
						<div class="card-stat">
							<span class="card-stat-value">{formatDate(seq.created_at)}</span>
							<span class="card-stat-label">Created</span>
						</div>
					</div>

					<div class="card-steps">
						{#each seq.campaigns as campaign, i}
							{@const stepDone = campaign.status === 'completed' || campaign.status === 'sending'}
							<div class="mini-step" class:done={stepDone} class:scheduled={campaign.status === 'draft' && campaign.scheduled_at}>
								<span class="mini-step-num">{i + 1}</span>
								<span class="mini-step-subject">{campaign.subject}</span>
							</div>
							{#if i < seq.campaigns.length - 1}
								<div class="mini-connector" class:done={stepDone}></div>
							{/if}
						{/each}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 32px 24px;
		color: #e0e0e0;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
	}
	h1 {
		margin: 0;
		font-size: 24px;
		color: #fff;
	}
	.subtitle {
		margin: 4px 0 0;
		color: #666;
		font-size: 14px;
	}
	.actions {
		display: flex;
		gap: 12px;
	}
	.btn {
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.btn-primary {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: #fff;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 80px 24px;
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 16px;
	}
	.empty-title {
		font-size: 20px;
		font-weight: 700;
		color: #fff;
		margin: 0 0 8px;
	}
	.empty-desc {
		color: #888;
		font-size: 14px;
		margin: 0 0 24px;
	}

	/* Sequence list */
	.sequence-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.sequence-card {
		display: block;
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 14px;
		padding: 24px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}
	.sequence-card:hover {
		border-color: #4469B7;
	}

	.card-top {
		margin-bottom: 16px;
	}
	.card-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}
	.seq-name {
		margin: 0;
		font-size: 18px;
		color: #fff;
		font-weight: 700;
	}
	.seq-type {
		margin: 4px 0 0;
		font-size: 12px;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.status-badge {
		padding: 4px 12px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		white-space: nowrap;
	}

	/* Stats row */
	.card-stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
		margin-bottom: 16px;
	}
	.card-stat {
		text-align: center;
		padding: 10px 8px;
		background: #12121f;
		border-radius: 8px;
		border: 1px solid #2a2a3e;
	}
	.card-stat-value {
		display: block;
		font-size: 14px;
		font-weight: 600;
		color: #e0e0e0;
	}
	.card-stat-label {
		display: block;
		font-size: 11px;
		color: #666;
		margin-top: 2px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* Mini timeline */
	.card-steps {
		display: flex;
		align-items: center;
		gap: 0;
		padding: 8px 0 0;
	}
	.mini-step {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		background: #12121f;
		border: 1px solid #2a2a3e;
		border-radius: 8px;
		flex-shrink: 0;
		max-width: 220px;
	}
	.mini-step.done {
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.05);
	}
	.mini-step.scheduled {
		border-color: #3b82f6;
		background: rgba(59, 130, 246, 0.05);
	}
	.mini-step-num {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #2a2a3e;
		color: #888;
		font-size: 12px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.mini-step.done .mini-step-num {
		background: #22c55e;
		color: #fff;
	}
	.mini-step.scheduled .mini-step-num {
		background: #3b82f6;
		color: #fff;
	}
	.mini-step-subject {
		font-size: 12px;
		color: #aaa;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mini-connector {
		width: 24px;
		height: 2px;
		background: #2a2a3e;
		flex-shrink: 0;
	}
	.mini-connector.done {
		background: #22c55e;
	}

	@media (max-width: 700px) {
		.card-stats {
			grid-template-columns: repeat(2, 1fr);
		}
		.card-steps {
			flex-wrap: wrap;
			gap: 8px;
		}
		.mini-connector {
			display: none;
		}
	}
</style>
