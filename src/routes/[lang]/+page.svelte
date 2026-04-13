<script>
	import { base } from '$app/paths';
	import TeamCard from '$lib/components/team/TeamCard.svelte';
	import { _ } from 'svelte-i18n';

	/** @type {{ data: { teams: Array<any> } }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>TV Muttenz Volleyball</title>
	<meta name="description" content={$_('heading_modern_training')} />
</svelte:head>

<main class="container">
	<section class="hero">
		<img src="{base}/logo.png" alt="TV Muttenz Volleyball Logo" class="logo" />
		<h1>{$_('heading_welcome')}</h1>
		<p class="lead">{$_('heading_modern_training')}</p>
	</section>

	<section class="teams-section">
		<h2>{$_('heading_our_teams')}</h2>
		<div class="team-grid">
			{#each data.teams as team}
				<TeamCard {team} />
			{/each}
		</div>
	</section>
</main>

<style>
	.container {
		padding-block: var(--space-3xl);
	}

	.hero {
		text-align: center;
		padding-block: var(--space-2xl);
	}

	.logo {
		max-width: 300px;
		height: auto;
		margin: 0 auto var(--space-xl);
	}

	.hero h1 {
		color: var(--color-primary);
		font-size: var(--font-size-4xl);
		margin-block-start: 0;
	}

	.lead {
		font-size: var(--font-size-xl);
		color: var(--color-text-secondary);
		margin-block: var(--space-lg);
	}

	.teams-section {
		margin-block: var(--space-3xl);
	}

	.teams-section h2 {
		text-align: center;
		color: var(--color-primary);
		margin-bottom: var(--space-2xl);
		font-size: var(--font-size-3xl);
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--space-xl);
		max-width: var(--max-width-content);
		margin-inline: auto;
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: var(--font-size-3xl);
		}

		.logo {
			max-width: 200px;
		}

		.team-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
