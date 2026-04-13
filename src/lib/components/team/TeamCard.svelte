<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	/**
	 * @type {{
	 *   team: {
	 *     id: string,
	 *     name: string,
	 *     beschreibung: string,
	 *     trainingszeiten: Array<{tag: string, zeit: string, ort: string}>
	 *   }
	 * }}
	 */
	let { team } = $props();

	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});
</script>

<article class="team-card">
	<h3>{team.name}</h3>
	<p class="beschreibung">{team.beschreibung}</p>

	{#if team.trainingszeiten && team.trainingszeiten.length > 0}
		<div class="training-preview">
			<strong>Trainingszeiten:</strong>
			<ul>
				{#each team.trainingszeiten.slice(0, 2) as training}
					<li>{training.tag}: {training.zeit}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<a href="{base}/{currentLang}/teams/{team.id}" class="btn-primary"> Details anzeigen </a>
</article>

<style>
	.team-card {
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		transition: all var(--transition-normal);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.team-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-card);
		transform: translateY(-4px);
	}

	.team-card h3 {
		color: var(--color-primary);
		margin: 0;
		font-size: var(--font-size-2xl);
	}

	.beschreibung {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.training-preview {
		margin-block: var(--space-sm);
	}

	.training-preview strong {
		display: block;
		margin-bottom: var(--space-xs);
		color: var(--color-text);
	}

	.training-preview ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.training-preview li {
		padding: var(--space-xs) 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.btn-primary {
		display: inline-block;
		align-self: flex-start;
		background: var(--color-primary);
		color: var(--color-text-inverse);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-weight-medium);
		transition: all var(--transition-fast);
		border: none;
		cursor: pointer;
		text-decoration: none;
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
</style>
