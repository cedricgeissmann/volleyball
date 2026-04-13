<script>
	/** @type {{ lang: string, isFallback?: boolean }} */
	let { lang, isFallback = false } = $props();
</script>

{#if lang !== 'de' && isFallback}
	<div class="fallback-banner" role="note">
		<svg
			class="icon"
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10"></circle>
			<line x1="12" y1="8" x2="12" y2="12"></line>
			<line x1="12" y1="16" x2="12.01" y2="16"></line>
		</svg>
		<span>This page has not been translated yet. Showing German content.</span>
	</div>
{/if}

<style>
	.fallback-banner {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-gray-100, #f3f4f6);
		border-left: 3px solid var(--color-gray-400, #9ca3af);
		border-radius: var(--radius-md, 6px);
		color: var(--color-text-secondary, #6b7280);
		font-size: var(--font-size-sm, 0.875rem);
		margin-bottom: var(--space-lg);
	}

	.icon {
		flex-shrink: 0;
		color: var(--color-gray-400, #9ca3af);
	}
</style>
