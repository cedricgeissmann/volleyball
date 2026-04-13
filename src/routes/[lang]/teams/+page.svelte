<script>
	import TeamCard from '$lib/components/team/TeamCard.svelte';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';

	let { data } = $props();
	const lang = data.lang ?? 'de';
</script>

<svelte:head>
	<title>Teams - TV Muttenz Volleyball</title>
	<meta name="description" content="Unsere Volleyball-Teams beim TV Muttenz" />
</svelte:head>

<div class="container">
	<TranslationFallbackBanner {lang} isFallback={data.isFallback} />

	<header class="page-header">
		<h1>Unsere Teams</h1>
		<p class="lead">
			Entdecken Sie unsere Volleyball-Teams, ihre Trainingszeiten und Ziele für die Saison.
		</p>
	</header>

	<div class="team-grid">
		{#each data.teams as team}
			<TeamCard {team} />
		{/each}
	</div>
</div>

<style>
	.container {
		padding-block: var(--space-3xl);
	}

	.page-header {
		text-align: center;
		margin-bottom: var(--space-3xl);
	}

	.page-header h1 {
		color: var(--color-primary);
		margin-bottom: var(--space-md);
	}

	.lead {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		max-width: 600px;
		margin-inline: auto;
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--space-xl);
		max-width: var(--max-width-content);
		margin-inline: auto;
	}

	@media (max-width: 768px) {
		.team-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
