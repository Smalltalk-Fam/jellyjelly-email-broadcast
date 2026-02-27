<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let subject = $state('');
	let bodyHtml = $state('');
	let templateName = $state('announcement');
	let aiPrompt = $state('');
	let aiLoading = $state(false);
	let aiError = $state('');

	// A/B testing state
	let abEnabled = $state(false);
	let subjectB = $state('');
	let bodyHtmlB = $state('');
	let templateNameB = $state('announcement');
	let splitRatio = $state('50');

	// Build full preview by injecting body into the selected template
	let previewSrc = $derived.by(() => {
		const tpl = data.templateMap?.[templateName] || '';
		if (!tpl) return '';
		const filled = tpl
			.replace('{{body}}', bodyHtml || '<p style="color:#ffffff; opacity:0.5;">Your email content will appear here...</p>')
			.replace('{{subject}}', subject || 'Preview')
			.replace('{{preheader}}', '')
			.replace('{{unsubscribe_url}}', '#');
		return 'data:text/html;charset=utf-8,' + encodeURIComponent(filled);
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

		<!-- Template Picker Cards -->
		<div class="form-group">
			<label>Template</label>
			<input type="hidden" name="templateName" value={templateName} />
			<div class="template-grid">
				{#each data.templateInfo as tpl}
					<button
						type="button"
						class="template-card"
						class:selected={templateName === tpl.name}
						onclick={() => (templateName = tpl.name)}
					>
						<div class="template-icon">
							{#if tpl.name === 'announcement'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
							{:else if tpl.name === 'digest'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
							{:else if tpl.name === 'spotlight'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
							{:else if tpl.name === 'event'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
							{:else if tpl.name === 'reengagement'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
							{:else if tpl.name === 'minimal'}
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
							{/if}
						</div>
						<div class="template-name">{tpl.label}</div>
						<div class="template-desc">{tpl.description}</div>
					</button>
				{/each}
			</div>
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

		<!-- Variant A label (shown when A/B is enabled) -->
		{#if abEnabled}
			<div class="variant-label variant-a-label">Variant A</div>
		{/if}

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
				<span class="panel-label">Preview — {data.templateInfo.find(t => t.name === templateName)?.label || templateName}</span>
				<div class="preview-frame">
					{#if previewSrc}
						<iframe
							src={previewSrc}
							title="Email Preview"
							sandbox="allow-same-origin"
							style="width:100%; height:100%; border:none; min-height:600px; background:#4469B7; border-radius:8px;"
						></iframe>
					{/if}
				</div>
			</div>
		</div>

		<!-- A/B Testing Section -->
		<div class="ab-toggle-section">
			<label class="ab-toggle-label">
				<input
					type="checkbox"
					bind:checked={abEnabled}
					name="abEnabled"
				/>
				<span class="ab-toggle-text">Enable A/B Testing</span>
			</label>
		</div>

		{#if abEnabled}
			<div class="ab-variant-section">
				<div class="variant-label variant-b-label">Variant B</div>

				<div class="form-group">
					<label for="subjectB">Subject Line (Variant B)</label>
					<input
						id="subjectB"
						name="subjectB"
						type="text"
						bind:value={subjectB}
						placeholder="Alternate subject line..."
						required
					/>
				</div>

				<div class="form-group">
					<label for="templateNameB">Template (Variant B)</label>
					<select id="templateNameB" name="templateNameB" bind:value={templateNameB}>
						{#each data.templateInfo as tpl}
							<option value={tpl.name}>{tpl.label}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="bodyHtmlB">Email Body (Variant B)</label>
					<textarea
						id="bodyHtmlB"
						name="bodyHtmlB"
						bind:value={bodyHtmlB}
						rows="12"
						placeholder="<h2>Hello!</h2><p>Alternate email content...</p>"
						required
					></textarea>
				</div>

				<div class="form-group">
					<label for="splitRatio">Traffic Split (A / B)</label>
					<select id="splitRatio" name="splitRatio" bind:value={splitRatio}>
						<option value="50">50% / 50%</option>
						<option value="60">60% / 40%</option>
						<option value="70">70% / 30%</option>
					</select>
				</div>
			</div>
		{/if}

		<div class="form-actions">
			<button
				type="submit"
				class="btn btn-primary"
				disabled={!subject || !bodyHtml || (abEnabled && (!subjectB || !bodyHtmlB))}
			>
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
		color: #89A9F4;
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
		border-color: #4469B7;
	}

	/* Template Picker Grid */
	.template-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}
	.template-card {
		background: #1a1a2e;
		border: 2px solid #2a2a3e;
		border-radius: 12px;
		padding: 16px;
		cursor: pointer;
		text-align: center;
		transition: border-color 0.15s, background 0.15s;
		color: #e0e0e0;
		font-family: inherit;
	}
	.template-card:hover {
		border-color: #4469B7;
		background: #1e1e36;
	}
	.template-card.selected {
		border-color: #89A9F4;
		background: #1e2a4a;
	}
	.template-icon {
		color: #89A9F4;
		margin-bottom: 8px;
	}
	.template-card.selected .template-icon {
		color: #fff;
	}
	.template-name {
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		margin-bottom: 4px;
	}
	.template-desc {
		font-size: 11px;
		color: #888;
		line-height: 1.3;
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
		background: #4469B7;
		color: #fff;
	}
	.btn-primary:hover:not(:disabled) {
		background: #3a5da6;
	}
	.btn-ai {
		background: #2a2a3e;
		color: #89A9F4;
		border: 1px solid #4469B7;
		white-space: nowrap;
	}
	.btn-ai-refine {
		background: #2a2a3e;
		color: #89A9F4;
		border: 1px solid #89A9F4;
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
		background: #4469B7;
		border: 1px solid #222;
		border-radius: 10px;
		min-height: 600px;
		overflow: hidden;
	}
	/* A/B Testing Styles */
	.ab-toggle-section {
		margin: 24px 0 16px;
		padding: 16px 20px;
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
	}
	.ab-toggle-label {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		text-transform: none;
		font-size: 14px;
		color: #e0e0e0;
		font-weight: 500;
		letter-spacing: 0;
		margin-bottom: 0;
	}
	.ab-toggle-label input[type='checkbox'] {
		width: 18px;
		height: 18px;
		accent-color: #4469B7;
		cursor: pointer;
	}
	.ab-toggle-text {
		font-size: 14px;
		color: #e0e0e0;
	}
	.variant-label {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		padding: 6px 14px;
		border-radius: 6px;
		display: inline-block;
		margin-bottom: 12px;
	}
	.variant-a-label {
		background: #1e2a4a;
		color: #89A9F4;
		border: 1px solid #4469B7;
	}
	.variant-b-label {
		background: #2a1e4a;
		color: #c489f4;
		border: 1px solid #7744b7;
	}
	.ab-variant-section {
		margin-bottom: 24px;
		padding: 24px;
		background: #12121f;
		border: 1px solid #2a2a3e;
		border-left: 3px solid #7744b7;
		border-radius: 12px;
	}
	.ab-variant-section .form-group {
		margin-bottom: 16px;
	}
	.ab-variant-section .form-group:last-of-type {
		margin-bottom: 0;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}
	@media (max-width: 768px) {
		.split-view {
			grid-template-columns: 1fr;
		}
		.template-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
