<script>
	import { base } from '$app/paths';
	import TeamCard from '$lib/components/team/TeamCard.svelte';

	/** @type {{ data: { teams: Array<any> } }} */
	let { data } = $props();
</script>

<svelte:head>
	<title>TV Muttenz Volleyball - Willkommen</title>
	<meta
		name="description"
		content="Offizielle Website des TV Muttenz Volleyball - Moderne Trainingsmethoden mit dem Constraints-Led Approach"
	/>
</svelte:head>

<main class="container">
	<section class="hero">
		<img src="{base}/logo.png" alt="TV Muttenz Volleyball Logo" class="logo" />
		<h1>Willkommen beim TV Muttenz Volleyball</h1>
		<p class="lead">Moderne Trainingsmethoden mit dem Constraints-Led Approach</p>
	</section>

	<section class="info">
		<h2>Unsere Plattform</h2>
		<p>
			Diese Website ist die zentrale Kommunikationsplattform für unsere Volleyball-Teams. Hier
			finden Sie:
		</p>
		<ul>
			<li>Team-Informationen und Trainingszeiten</li>
			<li>Teamziele und Kompetenzen</li>
			<li>Übungen und Spielerrollen mit QR-Codes</li>
			<li>Blog-Beiträge zum Constraints-Led Approach</li>
			<li>Trainingsplaner für strukturierte Trainings</li>
		</ul>
	</section>

	<section class="teams-section">
		<h2>Unsere Teams</h2>
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

	.info {
		max-width: 800px;
		margin: var(--space-3xl) auto;
		background: var(--color-background-elevated);
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		border: 1px solid var(--color-gray-200);
	}

	.info h2 {
		color: var(--color-primary);
		margin-block-start: 0;
	}

	.info ul {
		list-style: none;
		padding: 0;
	}

	.info li {
		padding: var(--space-sm) 0;
		padding-left: var(--space-lg);
		position: relative;
	}

	.info li::before {
		content: '🏐';
		position: absolute;
		left: 0;
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

		.info {
			padding: var(--space-lg);
		}

		.team-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
