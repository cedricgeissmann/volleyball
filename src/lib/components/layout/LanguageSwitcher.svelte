<script>
	import { page } from '$app/stores';

	const languages = ['de', 'en'];

	// Get current language from URL path
	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		// Remove base path if present
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});

	/**
	 * Switch to a different language — full page reload so i18n strings and content refresh
	 * @param {string} newLang
	 */
	function switchLanguage(newLang) {
		if (newLang === currentLang) return;

		// Replace the language segment in the current path
		const currentPath = $page.url.pathname;
		const newPath = currentPath
			.replace(`/${currentLang}/`, `/${newLang}/`)
			.replace(new RegExp(`/${currentLang}$`), `/${newLang}`);

		window.location.href = newPath;
	}
</script>

<div class="language-switcher">
	{#each languages as lang}
		<button
			class="lang-button"
			class:active={currentLang === lang}
			onclick={() => switchLanguage(lang)}
			aria-label="Switch to {lang.toUpperCase()}"
		>
			{lang}
		</button>
	{/each}
</div>

<style>
	.language-switcher {
		display: flex;
		gap: var(--space-2xs);
		align-items: center;
	}

	.lang-button {
		padding: var(--space-2xs) var(--space-sm);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		background: var(--color-background);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-transform: lowercase;
		letter-spacing: 0.03em;
	}

	.lang-button:hover {
		border-color: var(--color-primary);
		background: var(--color-gray-50);
	}

	.lang-button.active {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: white;
	}
</style>
