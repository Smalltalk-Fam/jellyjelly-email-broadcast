<script lang="ts">
	let { children } = $props();
</script>

<div class="app">
	{@render children()}
</div>

<style>
	.app {
		min-height: 100vh;
		background: #0a0a0a;
	}
</style>
