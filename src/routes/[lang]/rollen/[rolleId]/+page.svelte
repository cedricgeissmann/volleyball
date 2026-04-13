<script>
	import { base } from '$app/paths';

	let { data } = $props();
	const { rolle } = data;
	const lang = data.lang ?? 'de';
</script>

<svelte:head>
	<title>{rolle.name} - Rollen - TV Muttenz Volleyball</title>
	<meta name="description" content={rolle.beschreibung || rolle.name} />
</svelte:head>

<div class="rolle-detail">
	<header class="page-header">
		<a href="{base}/{lang}/rollen" class="back-button">← Zurück zu Rollen</a>
		<div class="header-content">
			<h1>{rolle.name}</h1>
			{#if rolle.beschreibung}
				<p class="description">{rolle.beschreibung}</p>
			{/if}
		</div>
	</header>

	<div class="content-grid">
		{#if rolle.fokus}
			<section class="card">
				<h2>Fokus</h2>
				<p class="focus-text">{rolle.fokus}</p>
			</section>
		{/if}

		{#if rolle.aufgaben && rolle.aufgaben.length > 0}
			<section class="card full-width">
				<h2>Aufgaben</h2>
				<ul class="points-list">
					{#each rolle.aufgaben as aufgabe}
						<li>{aufgabe}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>

<style>
	.rolle-detail {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-xl);
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-3xl);
		padding-bottom: var(--spacing-2xl);
		border-bottom: 2px solid var(--color-border);
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		padding: var(--spacing-md) var(--spacing-lg);
		background-color: var(--color-primary);
		color: white;
		text-decoration: none;
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		font-weight: 600;
		transition: all var(--transition-normal);
		width: fit-content;
	}

	.back-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		background-color: var(--color-primary-dark, var(--color-primary));
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.page-header h1 {
		color: var(--color-primary);
		margin: 0;
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		line-height: 1.6;
		margin: 0;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-2xl);
		margin-bottom: var(--spacing-2xl);
	}

	.card {
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-xl);
	}

	.card.full-width {
		grid-column: 1 / -1;
	}

	.card h2 {
		color: var(--color-text);
		margin-top: 0;
		margin-bottom: var(--spacing-lg);
		font-size: var(--font-size-xl);
	}

	.focus-text {
		color: var(--color-text);
		font-size: var(--font-size-lg);
		line-height: 1.8;
		margin: 0;
	}

	.points-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.points-list li {
		padding-left: var(--spacing-md);
		margin-bottom: var(--spacing-md);
		position: relative;
		line-height: 1.8;
	}

	.points-list li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-primary);
		font-weight: bold;
	}

	@media (max-width: 768px) {
		.rolle-detail {
			padding: var(--spacing-md);
		}

		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	@media print {
		.page-header {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-xl);
		}

		.card {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-md);
		}

		.back-button {
			display: none;
		}
	}
</style>
