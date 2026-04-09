<script>
	import GoalCard from '$lib/components/team/GoalCard.svelte';

	/** @type {{ data: { team: any } }} */
	let { data } = $props();
	const { team } = data;
</script>

<svelte:head>
	<title>{team.name} - TV Muttenz Volleyball</title>
	<meta name="description" content="{team.beschreibung}" />
</svelte:head>

<div class="container">
	<article class="team-detail">
		<header class="team-header">
			<h1>{team.name}</h1>
			<p class="lead">{team.beschreibung}</p>
		</header>

		<section id="trainingszeiten" class="section">
			<h2>Trainingszeiten</h2>
			<div class="training-table-wrapper">
				<table class="training-table">
					<thead>
						<tr>
							<th>Tag</th>
							<th>Zeit</th>
							<th>Ort</th>
						</tr>
					</thead>
					<tbody>
						{#each team.trainingszeiten as training}
							<tr>
								<td>{training.tag}</td>
								<td>{training.zeit}</td>
								<td>{training.ort}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section id="ziele" class="section">
			<h2>Teamziele & Kompetenzen</h2>
			<div class="goals-grid">
				{#each team.ziele as goal}
					<GoalCard {goal} />
				{/each}
			</div>
		</section>
	</article>
</div>

<style>
	.container {
		padding-block: var(--space-3xl);
	}

	.team-detail {
		max-width: 900px;
		margin-inline: auto;
	}

	.team-header {
		text-align: center;
		margin-bottom: var(--space-3xl);
		padding-bottom: var(--space-xl);
		border-bottom: 2px solid var(--color-gray-200);
	}

	.team-header h1 {
		color: var(--color-primary);
		margin-bottom: var(--space-md);
		font-size: var(--font-size-4xl);
	}

	.lead {
		font-size: var(--font-size-xl);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.section {
		margin-bottom: var(--space-3xl);
	}

	.section h2 {
		color: var(--color-secondary);
		margin-bottom: var(--space-xl);
		font-size: var(--font-size-3xl);
	}

	.training-table-wrapper {
		overflow-x: auto;
	}

	.training-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-background-elevated);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.training-table th,
	.training-table td {
		padding: var(--space-md) var(--space-lg);
		text-align: left;
	}

	.training-table th {
		background: var(--color-primary);
		color: var(--color-text-inverse);
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.training-table td {
		border-bottom: 1px solid var(--color-gray-200);
		color: var(--color-text);
	}

	.training-table tbody tr:last-child td {
		border-bottom: none;
	}

	.training-table tbody tr:hover {
		background: var(--color-gray-50);
	}

	.goals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.team-header h1 {
			font-size: var(--font-size-3xl);
		}

		.lead {
			font-size: var(--font-size-lg);
		}

		.goals-grid {
			grid-template-columns: 1fr;
		}

		.training-table th,
		.training-table td {
			padding: var(--space-sm) var(--space-md);
		}
	}
</style>
