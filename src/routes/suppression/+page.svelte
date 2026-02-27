<script lang="ts">
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let newEmail = $state('');
</script>

<svelte:head>
	<title>Suppression List — JellyJelly Admin</title>
</svelte:head>

<div class="page">
	<a href="/" class="back">&larr; Campaigns</a>
	<h1>Suppression List</h1>
	<p class="subtitle">
		Emails that won't receive campaign emails. {data.entries.length} entries shown.
	</p>

	<!-- Search -->
	<form method="GET" class="search-form">
		<input type="text" name="q" value={data.search} placeholder="Search emails..." />
		<button type="submit" class="btn btn-secondary">Search</button>
	</form>

	<!-- Add manually -->
	<form method="POST" action="?/add" class="add-form">
		<input
			type="email"
			name="email"
			bind:value={newEmail}
			placeholder="email@example.com"
			required
		/>
		<button type="submit" class="btn btn-secondary">Add to Suppression</button>
	</form>

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}
	{#if form?.added}
		<p class="success">Email added to suppression list.</p>
	{/if}
	{#if form?.removed}
		<p class="success">Email removed from suppression list.</p>
	{/if}

	<!-- Table -->
	<table>
		<thead>
			<tr>
				<th>Email</th>
				<th>Reason</th>
				<th>Date</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry}
				<tr>
					<td>{entry.address}</td>
					<td><span class="reason-tag">{entry.type}</span></td>
					<td class="date">{new Date(entry.created_at).toLocaleDateString()}</td>
					<td>
						{#if entry.type === 'unsubscribe'}
							<form method="POST" action="?/remove" style="display:inline">
								<input type="hidden" name="address" value={entry.address} />
								<button type="submit" class="btn-remove">Remove</button>
							</form>
						{/if}
					</td>
				</tr>
			{/each}
			{#if data.entries.length === 0}
				<tr><td colspan="4" class="empty">No entries found.</td></tr>
			{/if}
		</tbody>
	</table>
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
	h1 {
		margin: 8px 0 4px;
		font-size: 24px;
		color: #fff;
	}
	.subtitle {
		color: #666;
		font-size: 14px;
		margin: 0 0 24px;
	}
	.search-form,
	.add-form {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}
	.search-form input,
	.add-form input {
		flex: 1;
		padding: 10px 16px;
		background: #111;
		border: 1px solid #333;
		border-radius: 10px;
		color: #e0e0e0;
		font-size: 14px;
	}
	.btn-secondary {
		padding: 10px 16px;
		background: #2a2a3e;
		color: #aaa;
		border: 1px solid #333;
		border-radius: 10px;
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}
	th {
		text-align: left;
		padding: 10px 12px;
		border-bottom: 1px solid #222;
		color: #888;
		font-size: 12px;
		text-transform: uppercase;
	}
	td {
		padding: 12px;
		border-bottom: 1px solid #1a1a2e;
	}
	.reason-tag {
		padding: 2px 8px;
		background: #2a2a3e;
		border-radius: 6px;
		font-size: 11px;
		color: #888;
	}
	.date {
		color: #888;
		font-size: 13px;
	}
	.btn-remove {
		background: none;
		border: none;
		color: #ef4444;
		cursor: pointer;
		font-size: 13px;
		text-decoration: underline;
	}
	.empty {
		text-align: center;
		color: #666;
		padding: 32px;
	}
	.error {
		color: #ef4444;
		font-size: 13px;
	}
	.success {
		color: #22c55e;
		font-size: 13px;
	}
</style>
