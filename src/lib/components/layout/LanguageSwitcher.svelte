<script>
	import { page } from '$app/stores';
	import { base } from '$app/paths';

	const languages = [
		{ code: 'de', label: 'DE', flag: '🇩🇪' },
		{ code: 'en', label: 'EN', flag: '🇬🇧' },
	];

	// Get current language from URL path
	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		// Remove base path if present
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});

	/**
	 * Switch to a different language
	 * @param {string} newLang
	 */
	function switchLanguage(newLang) {
		if (newLang === currentLang) return;

		// Replace the language code in the current path
		const currentPath = $page.url.pathname;
		const newPath = currentPath.replace(`/${currentLang}/`, `/${newLang}/`);

		// Navigate to the new path
		window.location.href = base + newPath;
	}
</script>

<div class="language-switcher">
	{#each languages as lang}
		<button
			class="lang-button"
			class:active={currentLang === lang.code}
			onclick={() => switchLanguage(lang.code)}
			aria-label="Switch to {lang.label}"
		>
			<span class="flag">{lang.flag}</span>
			<span class="label">{lang.label}</span>
		</button>
	{/each}
</div>

<style>
	.language-switcher {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
	}

	.lang-button {
		display: flex;
		align-items: center;
		gap: var(--space-2xs);
		padding: var(--space-2xs) var(--space-sm);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		background: var(--color-background);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
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

	.flag {
		font-size: 1.2em;
		line-height: 1;
	}

	.label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
	}

	@media (max-width: 768px) {
		.label {
			display: none;
		}

		.lang-button {
			padding: var(--space-2xs);
		}
	}
</style>
