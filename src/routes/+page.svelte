<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function statusBg(status: string) {
		switch (status) {
			case 'completed':
				return '#052e16';
			case 'sending':
				return '#422006';
			case 'failed':
				return '#2d0a0a';
			default:
				return '#333';
		}
	}

	function statusColor(status: string) {
		switch (status) {
			case 'completed':
				return '#4ade80';
			case 'sending':
				return '#fbbf24';
			case 'failed':
				return '#f87171';
			default:
				return '#aaa';
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatPercent(rate: number | null): string {
		if (rate == null) return '\u2014';
		return (rate * 100).toFixed(1) + '%';
	}
</script>

<svelte:head>
	<title>Email Campaigns — JellyJelly Admin</title>
</svelte:head>

<div class="page">
	<header>
		<div>
			<h1>Email Campaigns</h1>
			<p class="subtitle">{data.campaigns.length} campaigns</p>
		</div>
		<div class="actions">
			<a href="/compose" class="btn btn-primary">New Campaign</a>
			<a href="/suppression" class="btn btn-secondary">Suppression List</a>
		</div>
	</header>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>Subject</th>
					<th>Status</th>
					<th>Sent</th>
					<th>Open Rate</th>
					<th>Click Rate</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				{#each data.campaigns as campaign}
					<tr class="table-row">
						<td>
							<a href="/{campaign.id}" class="campaign-link">{campaign.subject}</a>
							<span class="template-tag">{campaign.template_name}</span>
						</td>
						<td>
							<span
								class="status-badge"
								style="background: {statusBg(campaign.status)}; color: {statusColor(campaign.status)}"
							>
								{campaign.status}
							</span>
						</td>
						<td>{campaign.total_sent} / {campaign.total_recipients}</td>
						<td class="metric">{formatPercent(campaign.openRate)}</td>
						<td class="metric">{formatPercent(campaign.clickRate)}</td>
						<td class="date">{formatDate(campaign.created_at)}</td>
					</tr>
				{/each}
				{#if data.campaigns.length === 0}
					<tr>
						<td colspan="6" class="empty">
							No campaigns yet. <a href="/compose" class="empty-link">Create your first campaign.</a>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if data.sequences && data.sequences.length > 0}
		<section class="sequences-section">
			<h2>Active Sequences</h2>
			<div class="sequence-cards">
				{#each data.sequences as seq}
					<a href="/sequences/{seq.id}" class="sequence-card">
						<div class="seq-name">{seq.name}</div>
						<div class="seq-meta">
							{#if seq.nextScheduledAt}
								<span>Next: Step {seq.nextStep} — {formatDate(seq.nextScheduledAt)}</span>
							{:else}
								<span>All steps sent</span>
							{/if}
						</div>
						{#if seq.nextSubject}
							<div class="seq-subject">{seq.nextSubject}</div>
						{/if}
					</a>
				{/each}
			</div>
		</section>
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
	}
	.btn-primary {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: #fff;
	}
	.btn-secondary {
		background: #2a2a3e;
		color: #aaa;
		border: 1px solid #333;
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th {
		text-align: left;
		padding: 12px 16px;
		border-bottom: 1px solid #222;
		color: #888;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	td {
		padding: 16px;
		border-bottom: 1px solid #1a1a2e;
	}
	.table-row:hover {
		background: rgba(255, 255, 255, 0.03);
	}
	.campaign-link {
		color: #8b5cf6;
		text-decoration: none;
		font-weight: 500;
	}
	.campaign-link:hover {
		text-decoration: underline;
	}
	.template-tag {
		display: inline-block;
		margin-left: 8px;
		padding: 2px 8px;
		background: #2a2a3e;
		border-radius: 6px;
		font-size: 11px;
		color: #888;
	}
	.status-badge {
		display: inline-block;
		padding: 4px 10px;
		border-radius: 9999px;
		font-weight: 600;
		font-size: 12px;
		text-transform: capitalize;
		letter-spacing: 0.3px;
	}
	.metric {
		font-variant-numeric: tabular-nums;
		color: #ccc;
		font-size: 13px;
	}
	.date {
		color: #888;
		font-size: 13px;
		white-space: nowrap;
	}
	.empty {
		text-align: center;
		color: #666;
		padding: 48px 16px;
	}
	.empty-link {
		color: #8b5cf6;
		text-decoration: none;
	}
	.empty-link:hover {
		text-decoration: underline;
	}

	/* Active Sequences Section */
	.sequences-section {
		margin-top: 48px;
	}
	.sequences-section h2 {
		font-size: 18px;
		color: #fff;
		margin: 0 0 16px;
	}
	.sequence-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
	}
	.sequence-card {
		display: block;
		background: #161622;
		border: 1px solid #222;
		border-radius: 12px;
		padding: 20px;
		text-decoration: none;
		color: #e0e0e0;
		transition: border-color 0.15s, background 0.15s;
	}
	.sequence-card:hover {
		border-color: #444;
		background: #1a1a2e;
	}
	.seq-name {
		font-weight: 600;
		font-size: 15px;
		color: #fff;
		margin-bottom: 8px;
	}
	.seq-meta {
		font-size: 13px;
		color: #888;
	}
	.seq-subject {
		margin-top: 8px;
		font-size: 12px;
		color: #666;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
