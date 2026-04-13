<script>
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$_('nav_planner')} - TV Muttenz Volleyball</title>
	<meta name="description" content={$_('meta_planner_desc')} />
</svelte:head>

<div class="planner-page">
	<h1>{$_('nav_planner')}</h1>
	<p class="intro">{$_('placeholder_planner_title')}</p>

	<div class="placeholder">
		<p>{$_('placeholder_under_construction')}</p>
		<p>{$_('placeholder_planner_desc')}</p>
	</div>
</div>

<style>
	.planner-page {
		max-width: var(--content-width-text);
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-3xl);
	}

	.intro {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-xl);
	}

	.placeholder {
		background-color: var(--color-bg-secondary);
		border: 2px dashed var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-xl);
		text-align: center;
	}

	.placeholder p {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.placeholder p:last-child {
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.planner-page {
			padding: var(--spacing-lg) var(--spacing-md);
		}

		h1 {
			font-size: var(--font-size-2xl);
		}
	}
</style>
