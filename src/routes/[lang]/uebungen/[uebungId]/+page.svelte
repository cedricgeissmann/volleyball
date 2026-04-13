<script>
	import { base } from '$app/paths';
	import { parseRepetitions, getRandomReps, formatReps } from '$lib/utils/contentLoader.js';
	import StickFigureAnimation from '$lib/components/uebungen/animations/StickFigureAnimation.svelte';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';

	let { data } = $props();
	const { uebung, isFallback } = data;
	const lang = data.lang ?? 'de';

	// Parse Wiederholungen
	const reps = parseRepetitions(uebung.wiederholungen);
	const randomReps = reps ? getRandomReps(reps) : null;
</script>

<svelte:head>
	<title>{uebung.titel} - Übungen - TV Muttenz Volleyball</title>
	<meta name="description" content={uebung.beschreibung || uebung.titel} />
</svelte:head>

<div class="uebung-detail">
	<TranslationFallbackBanner {lang} {isFallback} />

	<header class="page-header">
		<a href="{base}/{lang}/uebungen" class="back-button">← Zurück zu Übungen</a>
		<div class="header-content">
			<h1>{uebung.titel}</h1>
			{#if uebung.kategorie}
				<span class="category-badge">{uebung.kategorie}</span>
			{/if}
			{#if uebung.beschreibung}
				<p class="description">{uebung.beschreibung}</p>
			{/if}
		</div>
	</header>

	<div class="content-grid">
		{#if uebung.animation && uebung.typ === 'kraft'}
			<section class="card animation-card">
				<h2>Übungsanimation</h2>
				<StickFigureAnimation animationFile={uebung.animation} />
			</section>
		{/if}

		<section class="card full-width">
			<h2>Info</h2>
			<dl class="info-list">
				{#if uebung.typ}
					<div class="info-item">
						<dt>Typ</dt>
						<dd style="text-transform: capitalize;">{uebung.typ}</dd>
					</div>
				{/if}
				{#if randomReps}
					<div class="info-item">
						<dt>Wiederholungen</dt>
						<dd>{randomReps}x</dd>
					</div>
				{:else if uebung.dauer}
					<div class="info-item">
						<dt>Dauer</dt>
						<dd>{uebung.dauer} Minuten</dd>
					</div>
				{/if}
				{#if uebung.bedingung}
					<div class="info-item">
						<dt>Bedingung</dt>
						<dd>{uebung.bedingung}</dd>
					</div>
				{/if}
				{#if uebung.fokus}
					<div class="info-item">
						<dt>Fokus</dt>
						<dd>{uebung.fokus}</dd>
					</div>
				{/if}
				{#if uebung.kategorie}
					<div class="info-item">
						<dt>Kategorie</dt>
						<dd>{uebung.kategorie}</dd>
					</div>
				{/if}
			</dl>
		</section>

		{#if uebung.anleitung && uebung.anleitung.length > 0}
			<section class="card full-width">
				<h2>Anleitung</h2>
				<ol class="instruction-list">
					{#each uebung.anleitung as schritt}
						<li>{schritt}</li>
					{/each}
				</ol>
			</section>
		{/if}

		{#if uebung.ziele && uebung.ziele.length > 0}
			<section class="card full-width">
				<h2>Lernziele</h2>
				<ul class="points-list">
					{#each uebung.ziele as ziel}
						<li>{ziel}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>

<style>
	.uebung-detail {
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

	.category-badge {
		display: inline-block;
		background-color: var(--color-primary);
		color: white;
		padding: 4px 12px;
		border-radius: 4px;
		font-size: var(--font-size-sm);
		font-weight: 600;
		width: fit-content;
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

	.info-list,
	.constraints-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.info-item,
	.constraint-item {
		display: grid;
		grid-template-columns: 150px 1fr;
		gap: var(--spacing-md);
	}

	dt {
		font-weight: 600;
		color: var(--color-text);
	}

	dd {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.constraint-item dt {
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.instructions {
		white-space: pre-wrap;
		line-height: 1.8;
		color: var(--color-text);
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

	.instruction-list {
		padding-left: var(--spacing-lg);
		margin: 0;
	}

	.instruction-list li {
		margin-bottom: var(--spacing-md);
		line-height: 1.8;
		color: var(--color-text);
	}

	.instruction-list li::marker {
		color: var(--color-primary);
		font-weight: bold;
	}

	.animation-card {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: 768px) {
		.uebung-detail {
			padding: var(--spacing-xl);
		}

		.page-header {
			gap: var(--spacing-xl);
			margin-bottom: var(--spacing-2xl);
			padding-bottom: var(--spacing-xl);
		}

		.content-grid {
			grid-template-columns: 1fr;
			gap: var(--spacing-xl);
		}

		.card {
			padding: var(--spacing-xl);
		}

		.info-item,
		.constraint-item {
			grid-template-columns: 120px 1fr;
			gap: var(--spacing-md);
		}

		.info-list {
			gap: var(--spacing-lg);
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
