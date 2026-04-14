<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import { _ } from 'svelte-i18n';

	let mobileMenuOpen = $state(false);

	// Get current language from URL path
	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		// Remove base path if present
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Prüfe ob ein Link aktiv ist
	$effect(() => {
		// Schließe Mobile-Menu wenn Route wechselt
		closeMobileMenu();
	});
</script>

<header class="header">
	<div class="container">
		<a href="{base}/{currentLang}" class="logo-link" on:click={closeMobileMenu}>
			<img src="{base}/logo.png" alt="TV Muttenz Volleyball" class="logo" />
		</a>

		<nav class="nav" class:open={mobileMenuOpen}>
			<a
				href="{base}/{currentLang}/teams"
				class:active={$page.url.pathname.includes('/teams')}
				on:click={closeMobileMenu}
			>
				{$_('nav_teams')}
			</a>
			<a
				href="{base}/{currentLang}/uebungen"
				class:active={$page.url.pathname.includes('/uebungen')}
				on:click={closeMobileMenu}
			>
				{$_('nav_exercises')}
			</a>
			<a
				href="{base}/{currentLang}/taktik"
				class:active={$page.url.pathname.includes('/taktik')}
				on:click={closeMobileMenu}
			>
				{$_('nav_taktik')}
			</a>
			<a
				href="{base}/{currentLang}/rollen"
				class:active={$page.url.pathname.includes('/rollen')}
				on:click={closeMobileMenu}
			>
				{$_('nav_roles')}
			</a>
			<a
				href="{base}/{currentLang}/planner"
				class:active={$page.url.pathname.includes('/planner')}
				on:click={closeMobileMenu}
			>
				{$_('nav_planner')}
			</a>
			<a
				href="{base}/{currentLang}/cla"
				class:active={$page.url.pathname.includes('/cla')}
				on:click={closeMobileMenu}
			>
				{$_('nav_cla')}
			</a>
			<a
				href="{base}/{currentLang}/blog"
				class:active={$page.url.pathname.includes('/blog')}
				on:click={closeMobileMenu}
			>
				{$_('nav_blog')}
			</a>
			<a
				href="{base}/{currentLang}/events"
				class:active={$page.url.pathname.includes('/events')}
				on:click={closeMobileMenu}
			>
				{$_('nav_events')}
			</a>
		</nav>

		<div class="header-actions">
			<LanguageSwitcher />
			<button class="mobile-menu-toggle" on:click={toggleMobileMenu} aria-label={$_('aria_open_menu')}>
				{#if mobileMenuOpen}
					<!-- Close Icon -->
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
					</svg>
				{:else}
					<!-- Hamburger Icon -->
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M3 12h18M3 6h18M3 18h18" stroke-width="2" stroke-linecap="round" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
</header>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
	<div class="mobile-overlay" on:click={closeMobileMenu} role="presentation"></div>
{/if}

<style>
	.header {
		position: sticky;
		top: 0;
		left: 0;
		right: 0;
		height: var(--header-height);
		background: var(--color-background);
		border-bottom: 1px solid var(--color-gray-200);
		z-index: var(--z-index-sticky);
		box-shadow: var(--shadow-sm);
	}

	.container {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
		max-width: var(--max-width-content);
		margin-inline: auto;
		padding-inline: var(--space-lg);
	}

	.logo-link {
		display: flex;
		align-items: center;
	}

	.logo {
		height: 50px;
		width: auto;
	}

	.nav {
		display: flex;
		gap: var(--space-xl);
		align-items: center;
	}

	.nav a {
		color: var(--color-text);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-base);
		transition: color var(--transition-fast);
		position: relative;
		padding-block: var(--space-xs);
		height: 100%;
		display: flex;
		align-items: center;
	}

	.nav a:hover {
		color: var(--color-primary);
		text-decoration: none;
	}

	.nav a.active {
		color: var(--color-primary);
	}

	.nav a.active::after {
		content: '';
		position: absolute;
		bottom: calc(-1 * var(--space-lg));
		left: 0;
		right: 0;
		height: 3px;
		background: var(--color-primary);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		padding: var(--space-sm);
		transition: color var(--transition-fast);
	}

	.mobile-menu-toggle:hover {
		color: var(--color-primary);
	}

	.mobile-overlay {
		display: none;
	}

	@media (max-width: 768px) {
		.nav {
			position: fixed;
			top: var(--header-height);
			right: -100%;
			width: 280px;
			height: calc(100vh - var(--header-height));
			background: var(--color-background);
			flex-direction: column;
			align-items: flex-start;
			padding: var(--space-xl);
			gap: var(--space-lg);
			transition: right var(--transition-normal);
			box-shadow: var(--shadow-xl);
			border-left: 1px solid var(--color-gray-200);
		}

		.nav.open {
			right: 0;
		}

		.nav a {
			width: 100%;
			font-size: var(--font-size-lg);
		}

		.nav a.active::after {
			left: calc(-1 * var(--space-xl));
			right: auto;
			width: 3px;
			height: 100%;
		}

		.mobile-menu-toggle {
			display: flex;
		}

		.mobile-overlay {
			display: none;
			position: fixed;
			top: var(--header-height);
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: calc(var(--z-index-sticky) - 1);
		}

		.mobile-overlay {
			display: block;
		}
	}
</style>
