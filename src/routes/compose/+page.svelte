<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let subject = $state('');
	let bodyHtml = $state('');
	let templateName = $state('announcement');
	let aiPrompt = $state('');
	let aiLoading = $state(false);
	let aiError = $state('');
	let previewHtml = $state('');

	function updatePreview() {
		previewHtml = `
      <div style="font-family: -apple-system, sans-serif; padding: 20px; background: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
        ${bodyHtml}
      </div>
    `;
	}

	$effect(() => {
		updatePreview();
	});

	async function aiGenerate(mode: 'generate' | 'refine') {
		if (!aiPrompt.trim()) return;
		aiLoading = true;
		aiError = '';

		try {
			const res = await fetch('/api/email/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: aiPrompt,
					currentBody: mode === 'refine' ? bodyHtml : undefined,
					mode
				})
			});

			const result = await res.json();
			if (result.error) {
				aiError = result.error;
			} else {
				bodyHtml = result.html;
				aiPrompt = '';
			}
		} catch {
			aiError = 'Failed to generate content.';
		} finally {
			aiLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Compose Campaign — JellyJelly Admin</title>
</svelte:head>

<div class="page">
	<header>
		<a href="/" class="back">&larr; Campaigns</a>
		<h1>Compose Campaign</h1>
	</header>

	<form method="POST" action="?/create" class="compose-form">
		<div class="form-group">
			<label for="subject">Subject Line</label>
			<input
				id="subject"
				name="subject"
				type="text"
				bind:value={subject}
				placeholder="Your email subject..."
				required
			/>
		</div>

		<div class="form-group">
			<label for="templateName">Template</label>
			<select id="templateName" name="templateName" bind:value={templateName}>
				{#each data.templateNames as t}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</div>

		<!-- AI Assist -->
		<div class="ai-section">
			<label for="aiPrompt">AI Assist</label>
			<div class="ai-row">
				<input
					id="aiPrompt"
					type="text"
					bind:value={aiPrompt}
					placeholder="Describe the email you want to write..."
					disabled={aiLoading}
				/>
				<button
					type="button"
					onclick={() => aiGenerate('generate')}
					disabled={aiLoading || !aiPrompt.trim()}
					class="btn btn-ai"
				>
					{aiLoading ? 'Generating...' : 'Generate'}
				</button>
				{#if bodyHtml}
					<button
						type="button"
						onclick={() => aiGenerate('refine')}
						disabled={aiLoading || !aiPrompt.trim()}
						class="btn btn-ai-refine"
					>
						Refine
					</button>
				{/if}
			</div>
			{#if aiError}
				<p class="ai-error">{aiError}</p>
			{/if}
		</div>

		<!-- Editor + Preview split -->
		<div class="split-view">
			<div class="editor-panel">
				<label for="bodyHtml">Email Body (HTML)</label>
				<textarea
					id="bodyHtml"
					name="bodyHtml"
					bind:value={bodyHtml}
					rows="20"
					placeholder="<h2>Hello!</h2><p>Write your email content here...</p>"
					required
				></textarea>
			</div>
			<div class="preview-panel">
				<span class="panel-label">Preview</span>
				<div class="preview-frame">
					{@html previewHtml}
				</div>
			</div>
		</div>

		<div class="form-actions">
			<button type="submit" class="btn btn-primary" disabled={!subject || !bodyHtml}>
				Save as Draft
			</button>
		</div>
	</form>
</div>

<style>
	.page {
		max-width: 1200px;
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
		margin: 8px 0 32px;
		font-size: 24px;
		color: #fff;
	}
	.form-group {
		margin-bottom: 20px;
	}
	label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		color: #aaa;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	input[type='text'],
	select,
	textarea {
		width: 100%;
		padding: 12px 16px;
		background: #111;
		border: 1px solid #333;
		border-radius: 10px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
	}
	textarea {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 13px;
		resize: vertical;
	}
	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #6366f1;
	}
	.ai-section {
		margin-bottom: 24px;
		padding: 16px;
		background: #1a1a2e;
		border-radius: 12px;
		border: 1px solid #2a2a3e;
	}
	.ai-row {
		display: flex;
		gap: 8px;
	}
	.ai-row input {
		flex: 1;
	}
	.btn {
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		border: none;
		cursor: pointer;
	}
	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-primary {
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
		color: #fff;
	}
	.btn-ai {
		background: #2a2a3e;
		color: #8b5cf6;
		border: 1px solid #6366f1;
		white-space: nowrap;
	}
	.btn-ai-refine {
		background: #2a2a3e;
		color: #ec4899;
		border: 1px solid #ec4899;
		white-space: nowrap;
	}
	.ai-error {
		color: #ef4444;
		font-size: 13px;
		margin: 8px 0 0;
	}
	.split-view {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		margin-bottom: 24px;
	}
	.panel-label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
		color: #aaa;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.preview-frame {
		padding: 20px;
		background: #0a0a0a;
		border: 1px solid #222;
		border-radius: 10px;
		min-height: 300px;
		overflow: auto;
	}
	.form-actions {
		display: flex;
		justify-content: flex-end;
	}
	@media (max-width: 768px) {
		.split-view {
			grid-template-columns: 1fr;
		}
	}
</style>
