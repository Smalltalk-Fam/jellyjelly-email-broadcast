<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function statusColor(status: string) {
		switch (status) {
			case 'completed':
				return '#22c55e';
			case 'sending':
				return '#eab308';
			case 'failed':
				return '#ef4444';
			default:
				return '#666';
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
					<th>Failed</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				{#each data.campaigns as campaign}
					<tr>
						<td>
							<a href="/{campaign.id}" class="campaign-link">{campaign.subject}</a>
							<span class="template-tag">{campaign.template_name}</span>
						</td>
						<td>
							<span class="status-badge" style="color: {statusColor(campaign.status)}">
								{campaign.status}
							</span>
						</td>
						<td>{campaign.total_sent} / {campaign.total_recipients}</td>
						<td class:has-failures={campaign.total_failed > 0}>{campaign.total_failed}</td>
						<td class="date">{formatDate(campaign.created_at)}</td>
					</tr>
				{/each}
				{#if data.campaigns.length === 0}
					<tr>
						<td colspan="5" class="empty">No campaigns yet. Create your first one!</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
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
		font-weight: 600;
		font-size: 13px;
		text-transform: capitalize;
	}
	.has-failures {
		color: #ef4444;
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
</style>
