<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { form }: { form: ActionData } = $props();

	// Steps: 1 = audit form, 2 = review emails, 3 = saved (redirect)
	let step = $state(1);

	// Step 1: Audit form state
	let sequenceName = $state('Re-engagement Sequence');
	let featureCount = $state(1);
	let features = $state([
		{ changed: '', replaced: '', impact: '' },
		{ changed: '', replaced: '', impact: '' },
		{ changed: '', replaced: '', impact: '' }
	]);
	let painPoint = $state('');
	let painSolution = $state('');
	let speedMetric = $state('');
	let generating = $state(false);

	// Step 2: Generated emails state
	let emails = $state<
		{ subject: string; preheader: string; bodyHtml: string; templateName: string; ctaUrl: string }[]
	>([]);
	let spacingDays = $state('7');
	let startDate = $state('');
	let saving = $state(false);

	// Template badge labels
	const templateLabels: Record<string, string> = {
		reengagement: 'Re-engagement',
		minimal: 'Minimal',
		announcement: 'Announcement',
		digest: 'Weekly Digest',
		spotlight: 'Product Spotlight',
		event: 'Event Invite'
	};

	const stepLabels: Record<number, string> = {
		1: 'What You Missed',
		2: 'Direct-to-Expert',
		3: 'Insider Access'
	};

	function addFeature() {
		if (featureCount < 3) featureCount++;
	}

	function removeFeature(index: number) {
		if (featureCount > 1) {
			features[index] = { changed: '', replaced: '', impact: '' };
			// Shift remaining features up
			for (let i = index; i < 2; i++) {
				features[i] = { ...features[i + 1] };
			}
			features[2] = { changed: '', replaced: '', impact: '' };
			featureCount--;
		}
	}

	// Watch form results for generate action
	$effect(() => {
		if (form && 'emails' in form && form.emails) {
			emails = (form.emails as {
				subject: string;
				preheader: string;
				bodyHtml: string;
				templateName: string;
			}[]).map(e => ({ ...e, ctaUrl: '' }));
			step = 2;
			generating = false;
		}
		if (form && 'error' in form) {
			generating = false;
		}
	});

	let auditDataJson = $derived(
		JSON.stringify({
			features: features.slice(0, featureCount).filter((f) => f.changed),
			painPoint,
			painSolution,
			speedMetric: speedMetric || undefined
		})
	);

	let canGenerate = $derived(
		features[0].changed.trim() !== '' && painPoint.trim() !== '' && painSolution.trim() !== ''
	);
</script>

<svelte:head>
	<title>Re-engagement Builder — JellyJelly Admin</title>
</svelte:head>

<div class="page">
	<header>
		<a href="/compose" class="back">&larr; Compose</a>
		<h1>Re-engagement Sequence Builder</h1>
		<p class="subtitle">Product Audit guided flow — build a 3-email "Value-Proof" re-engagement sequence</p>
	</header>

	<!-- Step Indicators -->
	<div class="step-indicators">
		<div class="step-item" class:active={step === 1} class:completed={step > 1}>
			<div class="step-circle">1</div>
			<span class="step-label">Product Audit</span>
		</div>
		<div class="step-connector" class:active={step > 1}></div>
		<div class="step-item" class:active={step === 2} class:completed={step > 2}>
			<div class="step-circle">2</div>
			<span class="step-label">Review & Edit</span>
		</div>
		<div class="step-connector" class:active={step > 2}></div>
		<div class="step-item" class:active={step === 3}>
			<div class="step-circle">3</div>
			<span class="step-label">Save</span>
		</div>
	</div>

	<!-- Step 1: Product Audit Form -->
	{#if step === 1}
		<form
			method="POST"
			action="?/generate"
			use:enhance={() => {
				generating = true;
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<input type="hidden" name="featureCount" value={featureCount} />

			<div class="card">
				<h2 class="card-title">Sequence Details</h2>
				<div class="form-group">
					<label for="sequenceName">Sequence Name</label>
					<input
						id="sequenceName"
						name="sequenceName"
						type="text"
						bind:value={sequenceName}
						placeholder="e.g. Q1 2026 Re-engagement"
					/>
				</div>
			</div>

			<div class="card">
				<h2 class="card-title">Feature Updates</h2>
				<p class="card-hint">What has changed in the product since these users were last active? (1-3 features)</p>

				{#each { length: featureCount } as _, i}
					<div class="feature-group">
						<div class="feature-header">
							<span class="feature-number">Feature {i + 1}</span>
							{#if featureCount > 1}
								<button type="button" class="btn-remove" onclick={() => removeFeature(i)}>Remove</button>
							{/if}
						</div>
						<div class="feature-fields">
							<div class="form-group">
								<label for="feature_{i}_changed">What changed?</label>
								<input
									id="feature_{i}_changed"
									name="feature_{i}_changed"
									type="text"
									bind:value={features[i].changed}
									placeholder="e.g. Video rooms now support 12 people"
									required
								/>
							</div>
							<div class="form-group">
								<label for="feature_{i}_replaced">What did it replace?</label>
								<input
									id="feature_{i}_replaced"
									name="feature_{i}_replaced"
									type="text"
									bind:value={features[i].replaced}
									placeholder="e.g. Previously limited to 4 people"
								/>
							</div>
							<div class="form-group">
								<label for="feature_{i}_impact">User impact</label>
								<input
									id="feature_{i}_impact"
									name="feature_{i}_impact"
									type="text"
									bind:value={features[i].impact}
									placeholder="e.g. Bigger hangouts, less switching between apps"
								/>
							</div>
						</div>
					</div>
				{/each}

				{#if featureCount < 3}
					<button type="button" class="btn btn-add" onclick={addFeature}>
						+ Add Feature
					</button>
				{/if}
			</div>

			<div class="card">
				<h2 class="card-title">Pain Point</h2>
				<div class="form-group">
					<label for="painPoint">What was the #1 frustration users had?</label>
					<input
						id="painPoint"
						name="painPoint"
						type="text"
						bind:value={painPoint}
						placeholder="e.g. Video calls felt awkward with strangers"
						required
					/>
				</div>
				<div class="form-group">
					<label for="painSolution">How is it solved now?</label>
					<input
						id="painSolution"
						name="painSolution"
						type="text"
						bind:value={painSolution}
						placeholder="e.g. New icebreaker games make every call fun from the start"
						required
					/>
				</div>
			</div>

			<div class="card">
				<h2 class="card-title">Speed-to-Value Metric <span class="optional-tag">Optional</span></h2>
				<div class="form-group">
					<label for="speedMetric">How fast can a returning user experience value?</label>
					<input
						id="speedMetric"
						name="speedMetric"
						type="text"
						bind:value={speedMetric}
						placeholder="e.g. Join a live room in under 30 seconds"
					/>
				</div>
			</div>

			{#if form && 'error' in form}
				<div class="error-banner">{form.error}</div>
			{/if}

			<div class="form-actions">
				<button
					type="submit"
					class="btn btn-primary"
					disabled={!canGenerate || generating}
				>
					{#if generating}
						<span class="spinner"></span> Generating Sequence...
					{:else}
						Generate Sequence
					{/if}
				</button>
			</div>
		</form>
	{/if}

	<!-- Step 2: Review Generated Emails -->
	{#if step === 2}
		<form
			method="POST"
			action="?/save"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<input type="hidden" name="sequenceName" value={sequenceName} />
			<input type="hidden" name="auditData" value={auditDataJson} />

			<div class="email-grid">
				{#each emails as email, i}
					<div class="email-card">
						<div class="email-card-header">
							<span class="email-step">Email {i + 1}</span>
							<span class="template-badge">{templateLabels[email.templateName] || email.templateName}</span>
						</div>
						<div class="email-card-label">{stepLabels[i + 1]}</div>

						<input type="hidden" name="email_{i + 1}_templateName" value={email.templateName} />

						<div class="form-group">
							<label for="email_{i}_subject">Subject Line</label>
							<input
								id="email_{i}_subject"
								name="email_{i + 1}_subject"
								type="text"
								bind:value={email.subject}
							/>
						</div>

						<div class="form-group">
							<label for="email_{i}_preheader">Preheader</label>
							<input
								id="email_{i}_preheader"
								name="email_{i + 1}_preheader"
								type="text"
								bind:value={email.preheader}
							/>
						</div>

						<div class="form-group">
							<label for="email_{i}_ctaUrl">Button Link</label>
							<input
								id="email_{i}_ctaUrl"
								name="email_{i + 1}_ctaUrl"
								type="url"
								bind:value={email.ctaUrl}
								placeholder="https://jellyjelly.com"
							/>
							<span class="field-hint">CTA button URL (defaults to jellyjelly.com)</span>
						</div>

						<div class="form-group">
							<label for="email_{i}_body">Body HTML</label>
							<textarea
								id="email_{i}_body"
								name="email_{i + 1}_bodyHtml"
								bind:value={email.bodyHtml}
								rows="10"
							></textarea>
						</div>

						<!-- HTML Preview -->
						<div class="body-preview">
							<span class="preview-label">Preview</span>
							<div class="preview-content">
								{@html email.bodyHtml}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="card scheduling-card">
				<h2 class="card-title">Scheduling</h2>
				<div class="scheduling-row">
					<div class="form-group">
						<label for="spacingDays">Days Between Emails</label>
						<select id="spacingDays" name="spacingDays" bind:value={spacingDays}>
							<option value="3">3 days</option>
							<option value="5">5 days</option>
							<option value="7">7 days</option>
							<option value="10">10 days</option>
						</select>
					</div>
					<div class="form-group">
						<label for="startDate">Start Date</label>
						<input
							id="startDate"
							name="startDate"
							type="date"
							bind:value={startDate}
						/>
					</div>
				</div>
				{#if startDate && spacingDays}
					<div class="schedule-preview">
						{#each emails as _, i}
							{@const sendDate = new Date(new Date(startDate).getTime() + i * parseInt(spacingDays) * 86400000)}
							<div class="schedule-item">
								<span class="schedule-step">Email {i + 1}</span>
								<span class="schedule-date">{sendDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if form && 'error' in form}
				<div class="error-banner">{form.error}</div>
			{/if}

			<div class="form-actions">
				<button type="button" class="btn btn-secondary" onclick={() => (step = 1)}>
					&larr; Back to Audit
				</button>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{#if saving}
						<span class="spinner"></span> Creating Sequence...
					{:else}
						Create Sequence
					{/if}
				</button>
			</div>
		</form>
	{/if}
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
		margin: 8px 0 4px;
		font-size: 24px;
		color: #fff;
	}
	.subtitle {
		font-size: 14px;
		color: #888;
		margin: 0 0 24px;
	}

	/* Step Indicators */
	.step-indicators {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		margin-bottom: 32px;
	}
	.step-item {
		display: flex;
		align-items: center;
		gap: 8px;
		opacity: 0.5;
	}
	.step-item.active {
		opacity: 1;
	}
	.step-item.completed {
		opacity: 0.8;
	}
	.step-circle {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: #2a2a3e;
		border: 2px solid #333;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 700;
		color: #888;
	}
	.step-item.active .step-circle {
		background: #4469B7;
		border-color: #89A9F4;
		color: #fff;
	}
	.step-item.completed .step-circle {
		background: #2a6b3f;
		border-color: #4caf50;
		color: #fff;
	}
	.step-label {
		font-size: 13px;
		color: #aaa;
		font-weight: 600;
	}
	.step-item.active .step-label {
		color: #fff;
	}
	.step-connector {
		width: 60px;
		height: 2px;
		background: #333;
		margin: 0 12px;
	}
	.step-connector.active {
		background: #4469B7;
	}

	/* Cards */
	.card {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
		padding: 24px;
		margin-bottom: 20px;
	}
	.card-title {
		font-size: 16px;
		font-weight: 700;
		color: #fff;
		margin: 0 0 16px;
	}
	.card-hint {
		font-size: 13px;
		color: #888;
		margin: -8px 0 16px;
	}
	.optional-tag {
		font-size: 11px;
		color: #666;
		font-weight: 400;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-left: 8px;
	}

	/* Forms */
	.form-group {
		margin-bottom: 16px;
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
	input[type='url'] {
		width: 100%;
		padding: 12px 16px;
		background: #111;
		border: 1px solid #333;
		border-radius: 10px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
		box-sizing: border-box;
	}
	input[type='url']:focus {
		outline: none;
		border-color: #4469B7;
	}
	.field-hint {
		display: block;
		margin-top: 6px;
		font-size: 12px;
		color: #666;
	}
	input[type='text'],
	input[type='date'],
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
		box-sizing: border-box;
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

	/* Feature groups */
	.feature-group {
		background: #12121f;
		border: 1px solid #2a2a3e;
		border-radius: 10px;
		padding: 16px;
		margin-bottom: 12px;
	}
	.feature-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	.feature-number {
		font-size: 13px;
		font-weight: 700;
		color: #89A9F4;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.feature-fields .form-group:last-child {
		margin-bottom: 0;
	}

	/* Buttons */
	.btn {
		padding: 10px 20px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
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
		color: #e0e0e0;
		border: 1px solid #333;
	}
	.btn-secondary:hover:not(:disabled) {
		background: #333;
	}
	.btn-add {
		background: transparent;
		color: #89A9F4;
		border: 1px dashed #4469B7;
		width: 100%;
		padding: 12px;
		font-size: 14px;
	}
	.btn-add:hover {
		background: #1e2a4a;
	}
	.btn-remove {
		background: transparent;
		color: #ef4444;
		border: none;
		font-size: 12px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		font-family: inherit;
	}
	.btn-remove:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	/* Email grid for Step 2 */
	.email-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		margin-bottom: 20px;
	}
	.email-card {
		background: #1a1a2e;
		border: 1px solid #2a2a3e;
		border-radius: 12px;
		padding: 20px;
	}
	.email-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}
	.email-step {
		font-size: 13px;
		font-weight: 700;
		color: #89A9F4;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.template-badge {
		font-size: 11px;
		padding: 3px 10px;
		border-radius: 99px;
		background: #2a2a3e;
		color: #aaa;
		font-weight: 600;
	}
	.email-card-label {
		font-size: 14px;
		color: #888;
		margin-bottom: 16px;
		font-style: italic;
	}

	/* Body preview */
	.body-preview {
		margin-top: 12px;
		background: #111;
		border: 1px solid #2a2a3e;
		border-radius: 8px;
		overflow: hidden;
	}
	.preview-label {
		display: block;
		padding: 6px 12px;
		font-size: 11px;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-weight: 600;
		background: #1a1a2e;
		border-bottom: 1px solid #2a2a3e;
	}
	.preview-content {
		padding: 12px;
		font-size: 13px;
		line-height: 1.5;
		color: #ccc;
		max-height: 200px;
		overflow-y: auto;
	}

	/* Scheduling */
	.scheduling-card {
		margin-bottom: 20px;
	}
	.scheduling-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}
	.schedule-preview {
		margin-top: 16px;
		padding: 12px 16px;
		background: #12121f;
		border-radius: 8px;
		border: 1px solid #2a2a3e;
	}
	.schedule-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 0;
	}
	.schedule-item:not(:last-child) {
		border-bottom: 1px solid #1a1a2e;
	}
	.schedule-step {
		font-size: 13px;
		font-weight: 600;
		color: #89A9F4;
	}
	.schedule-date {
		font-size: 13px;
		color: #aaa;
	}

	/* Error banner */
	.error-banner {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid #ef4444;
		color: #ef4444;
		padding: 12px 16px;
		border-radius: 10px;
		font-size: 14px;
		margin-bottom: 20px;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
	}

	/* Loading spinner */
	.spinner {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 900px) {
		.email-grid {
			grid-template-columns: 1fr;
		}
		.scheduling-row {
			grid-template-columns: 1fr;
		}
	}
</style>
