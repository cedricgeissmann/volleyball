<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import TaktikAnimation from '$lib/components/uebungen/taktik/TaktikAnimation.svelte';
	import TaktikPrintView from '$lib/components/uebungen/taktik/TaktikPrintView.svelte';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	const uebung = $derived(data.uebung);
	const animationData = $derived(data.animationData);
	const isFallback = $derived(data.isFallback);
	const lang = $derived(data.lang);

	let isPrintMode = $state(false);

	function togglePrint() {
		isPrintMode = !isPrintMode;
	}

	function print() {
		window.print();
	}

	/**
	 * Fork: Animationsdaten via sessionStorage an den Editor übergeben.
	 * Dann zum Editor navigieren mit ?fork=<id>&title=<titel>
	 */
	function forkInEditor() {
		if (!animationData) return;
		// Animationsdaten in sessionStorage ablegen (Editor liest diese beim Start)
		try {
			sessionStorage.setItem('taktik-fork-data', JSON.stringify({ animation: animationData }));
		} catch {
			// sessionStorage nicht verfügbar (privater Modus etc.) – ignorieren
		}
		const titleEncoded = encodeURIComponent(uebung.titel);
		window.location.href = `${base}/${lang}/taktik/editor?fork=${encodeURIComponent(uebung.id)}&title=${titleEncoded}`;
	}
</script>

<svelte:head>
	<title>{uebung.titel} – Taktik – TV Muttenz Volleyball</title>
	<meta name="description" content={uebung.beschreibung} />
</svelte:head>

{#if isFallback}
	<TranslationFallbackBanner {lang} {isFallback} />
{/if}

<div class="page-container" class:print-mode={isPrintMode}>
	<!-- Navigation -->
	<nav class="breadcrumb" aria-label="Breadcrumb">
		<a href="{base}/{lang}/taktik">← Taktik-Übungen</a>
	</nav>

	<div class="page-layout">
		<!-- Linke Spalte: Animation -->
		<div class="animation-col">
			<div class="section-header">
				<h1>{uebung.titel}</h1>
				<div class="header-actions">
					{#if animationData}
						<button
							class="btn-fork"
							onclick={forkInEditor}
							title="Im Editor bearbeiten – erstellt eine eigene Kopie"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="18" cy="18" r="3"></circle>
								<circle cx="6" cy="6" r="3"></circle>
								<path d="M6 21V9a9 9 0 0 0 9 9"></path>
							</svg>
							Im Editor bearbeiten
						</button>
					{/if}
					<button
						class="btn-secondary"
						onclick={togglePrint}
						aria-pressed={isPrintMode}
					>
						{isPrintMode ? 'Animation anzeigen' : 'Druckansicht'}
					</button>
					{#if isPrintMode}
						<button class="btn-primary" onclick={print}>
							Drucken
						</button>
					{/if}
				</div>
			</div>

			{#if isPrintMode}
				<!-- Druckansicht -->
				<div class="print-container">
					{#if animationData}
						<TaktikPrintView
							animation={animationData}
							titel={uebung.titel}
							beschreibung={uebung.beschreibung}
							anleitung={uebung.anleitung}
						/>
					{:else}
						<p class="no-animation">Keine Animation verfügbar.</p>
					{/if}
				</div>
			{:else}
				<!-- Animations-Player -->
				{#if animationData}
					<TaktikAnimation animation={animationData} autoplay={false} maxWidth={540} />
				{:else}
					<div class="no-animation">
						<p>Keine Animation für diese Übung verfügbar.</p>
					</div>
				{/if}
			{/if}
		</div>

		<!-- Rechte Spalte: Info -->
		<aside class="info-col">
			<!-- Meta-Infos -->
			<div class="info-card">
				<h2 class="info-heading">Info</h2>
				<dl class="info-list">
					<div class="info-row">
						<dt>Kategorie</dt>
						<dd>{uebung.kategorie}</dd>
					</div>
					<div class="info-row">
						<dt>Fokus</dt>
						<dd>{uebung.fokus}</dd>
					</div>
					{#if uebung.dauer}
						<div class="info-row">
							<dt>Dauer</dt>
							<dd>{uebung.dauer} Minuten</dd>
						</div>
					{/if}
				</dl>
			</div>

			<!-- Beschreibung -->
			<div class="info-card">
				<p class="beschreibung">{uebung.beschreibung}</p>
			</div>

			<!-- Lernziele -->
			{#if uebung.ziele && uebung.ziele.length > 0}
				<div class="info-card">
					<h2 class="info-heading">Lernziele</h2>
					<ul class="ziele-list">
						{#each uebung.ziele as ziel}
							<li>{ziel}</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- Anleitung -->
			{#if uebung.anleitung && uebung.anleitung.length > 0}
				<div class="info-card">
					<h2 class="info-heading">Anleitung</h2>
					<ol class="anleitung-list">
						{#each uebung.anleitung as schritt, i}
							<li>
								<span class="schritt-nr">{i + 1}</span>
								<span>{schritt}</span>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</aside>
	</div>
</div>

<style>
	.page-container {
		max-width: var(--max-width-content);
		margin-inline: auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.breadcrumb {
		margin-bottom: var(--space-lg);
	}

	.breadcrumb a {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		text-decoration: none;
		transition: color var(--transition-fast);
	}

	.breadcrumb a:hover {
		color: var(--color-primary);
	}

	.page-layout {
		display: grid;
		grid-template-columns: 1fr 320px;
		gap: var(--space-2xl);
		align-items: start;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.section-header h1 {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.btn-primary,
	.btn-secondary,
	.btn-fork {
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background var(--transition-fast);
		border: 1.5px solid transparent;
	}

	.btn-fork {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		background: var(--color-background);
		color: #1565C0;
		border-color: #90CAF9;
	}

	.btn-fork:hover {
		background: #E3F2FD;
		border-color: #1565C0;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.btn-secondary {
		background: var(--color-background);
		color: var(--color-text);
		border-color: var(--color-gray-300);
	}

	.btn-secondary:hover {
		background: var(--color-gray-100);
	}

	.no-animation {
		padding: var(--space-2xl);
		text-align: center;
		color: var(--color-text-muted);
		background: var(--color-gray-50);
		border-radius: var(--radius-lg);
	}

	/* Info-Spalte */
	.info-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.info-card {
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		box-shadow: var(--shadow-card);
	}

	.info-heading {
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-sm);
	}

	.info-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
	}

	.info-row dt {
		color: var(--color-text-secondary);
	}

	.info-row dd {
		margin: 0;
		font-weight: var(--font-weight-medium);
		text-align: right;
	}

	.beschreibung {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.ziele-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.ziele-list li {
		font-size: var(--font-size-sm);
		padding-left: var(--space-md);
		position: relative;
	}

	.ziele-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-primary);
		font-weight: bold;
	}

	.anleitung-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.anleitung-list li {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-start;
		font-size: var(--font-size-sm);
	}

	.schritt-nr {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 22px;
		background: var(--color-primary);
		color: white;
		border-radius: 50%;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		flex-shrink: 0;
	}

	.print-container {
		background: white;
		padding: var(--space-lg);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
	}

	/* Responsive */
	@media (max-width: 900px) {
		.page-layout {
			grid-template-columns: 1fr;
		}
	}

	/* Druck */
	@media print {
		.breadcrumb,
		.header-actions,
		.btn-primary,
		.btn-secondary,
		.btn-fork {
			display: none;
		}

		.page-layout {
			grid-template-columns: 1fr;
		}

		.print-container {
			border: none;
			padding: 0;
		}
	}
</style>
