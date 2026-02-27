<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const navLinks = [
		{ href: '/', label: 'Campaigns' },
		{ href: '/sequences', label: 'Sequences' },
		{ href: '/suppression', label: 'Suppressions' },
		{ href: '/compose', label: 'New Campaign' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<div class="app">
	<nav class="top-nav">
		<div class="nav-inner">
			<span class="nav-brand">JellyJelly Email</span>
			<div class="nav-links">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link"
						class:active={isActive(link.href, $page.url.pathname)}
					>
						{link.label}
					</a>
				{/each}
			</div>
		</div>
	</nav>
	{@render children()}
</div>

<style>
	.app {
		min-height: 100vh;
		background: #0a0a0a;
	}
	.top-nav {
		background: #111;
		border-bottom: 1px solid #222;
		position: sticky;
		top: 0;
		z-index: 100;
	}
	.nav-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		height: 52px;
		gap: 32px;
	}
	.nav-brand {
		font-size: 15px;
		font-weight: 700;
		color: #fff;
		letter-spacing: -0.3px;
		white-space: nowrap;
	}
	.nav-links {
		display: flex;
		gap: 4px;
	}
	.nav-link {
		padding: 8px 14px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		color: #888;
		text-decoration: none;
		transition: color 0.15s, background 0.15s;
	}
	.nav-link:hover {
		color: #ccc;
		background: #1a1a2e;
	}
	.nav-link.active {
		color: #fff;
		background: #1a1a2e;
	}
</style>
