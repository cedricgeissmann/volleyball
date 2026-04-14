<script>
	import { base } from '$app/paths';
	import { _ } from 'svelte-i18n';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import TaktikBoard from '$lib/components/uebungen/taktik/TaktikBoard.svelte';
	import { getStartPositions } from '$lib/utils/taktikEngine.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	const uebungen = $derived(data.uebungen);
	const isFallback = $derived(data.isFallback);
	const lang = $derived(data.lang);

	let searchQuery = $state('');

	const filteredUebungen = $derived(
		uebungen.filter((/** @type {any} */ u) => {
			const q = searchQuery.toLowerCase();
			return (
				!q ||
				u.titel.toLowerCase().includes(q) ||
				u.beschreibung?.toLowerCase().includes(q) ||
				u.kategorie?.toLowerCase().includes(q) ||
				u.fokus?.toLowerCase().includes(q)
			);
		})
	);

	/**
	 * Fork einer Übung: Animationsdaten via sessionStorage übergeben,
	 * dann zum Editor navigieren.
	 */
	function forkInEditor(/** @type {any} */ uebung, /** @type {MouseEvent} */ e) {
		e.preventDefault();
		e.stopPropagation();
		if (!uebung.animationData) return;
		try {
			sessionStorage.setItem('taktik-fork-data', JSON.stringify({ animation: uebung.animationData }));
		} catch { /* ignore */ }
		const titleEncoded = encodeURIComponent(uebung.titel);
		window.location.href = `${base}/${lang}/taktik/editor?fork=${encodeURIComponent(uebung.id)}&title=${titleEncoded}`;
	}
</script>

<svelte:head>
	<title>Taktik-Übungen – TV Muttenz Volleyball</title>
	<meta name="description" content="Taktische Volleyball-Übungen mit animiertem Taktikboard" />
</svelte:head>

{#if isFallback}
	<TranslationFallbackBanner {lang} {isFallback} />
{/if}

<div class="page-container">
	<div class="page-header">
		<h1>Taktik-Übungen</h1>
		<p class="subtitle">Taktische Übungen mit animiertem Taktikboard</p>
	</div>

	<div class="search-bar">
		<input
			type="search"
			bind:value={searchQuery}
			placeholder="Übungen durchsuchen..."
			class="search-input"
		/>
	</div>

	{#if filteredUebungen.length === 0}
		<div class="empty-state">
			{#if searchQuery}
				<p>Keine Übungen gefunden für „{searchQuery}"</p>
			{:else}
				<p>Noch keine Taktik-Übungen vorhanden.</p>
			{/if}
		</div>
	{:else}
		<div class="uebungen-grid">
			{#each filteredUebungen as uebung (uebung.id)}
				<a
					href="{base}/{lang}/taktik/{uebung.id}"
					class="uebung-card"
				>
					<!-- Vorschau-Board -->
					{#if uebung.animationData}
						<div class="card-preview">
							<TaktikBoard
								animation={uebung.animationData}
								positions={getStartPositions(uebung.animationData)}
								arrows={[]}
								showCourtLabels={false}
								showZoneLabels={false}
								maxWidth={300}
							/>
						</div>
					{:else}
						<div class="card-preview card-preview--empty">
							<span>Kein Board</span>
						</div>
					{/if}

				<div class="card-body">
					<div class="card-meta">
						<span class="badge badge--taktik">Taktik</span>
						{#if uebung.fokus}
							<span class="badge badge--fokus">{uebung.fokus}</span>
						{/if}
					</div>
					<h2 class="card-titel">{uebung.titel}</h2>
					<p class="card-beschreibung">{uebung.beschreibung}</p>
					<div class="card-footer">
						{#if uebung.dauer}
							<span class="card-dauer">{uebung.dauer} Min.</span>
						{/if}
						{#if uebung.animationData}
							<button
								class="btn-fork-card"
								onclick={(e) => forkInEditor(uebung, e)}
								title="Im Editor bearbeiten"
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<circle cx="18" cy="18" r="3"></circle>
									<circle cx="6" cy="6" r="3"></circle>
									<path d="M6 21V9a9 9 0 0 0 9 9"></path>
								</svg>
								Bearbeiten
							</button>
						{/if}
					</div>
				</div>
			</a>
			{/each}
		</div>
	{/if}

	<!-- Link zum Editor -->
	<div class="editor-link">
		<a href="{base}/{lang}/taktik/editor" class="btn-editor">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
			</svg>
			Neues Taktikboard erstellen
		</a>
	</div>
</div>

<style>
	.page-container {
		max-width: var(--max-width-content);
		margin-inline: auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.page-header {
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: var(--font-size-4xl);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--space-xs);
	}

	.subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.search-bar {
		margin-bottom: var(--space-xl);
	}

	.search-input {
		width: 100%;
		max-width: 400px;
		padding: var(--space-sm) var(--space-md);
		border: 1.5px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		background: var(--color-background);
		transition: border-color var(--transition-fast);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.empty-state {
		text-align: center;
		padding: var(--space-3xl);
		color: var(--color-text-muted);
	}

	/* Grid */
	.uebungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-xl);
		margin-bottom: var(--space-2xl);
	}

	/* Karte */
	.uebung-card {
		display: flex;
		flex-direction: column;
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: box-shadow var(--transition-fast), transform var(--transition-fast);
	}

	.uebung-card:hover {
		box-shadow: var(--shadow-lg);
		transform: translateY(-2px);
		text-decoration: none;
	}

	.card-preview {
		background: var(--color-gray-100);
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-gray-200);
	}

	.card-preview--empty {
		height: 160px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.card-body {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		flex: 1;
	}

	.card-meta {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.badge {
		display: inline-block;
		padding: 2px var(--space-xs);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.badge--taktik {
		background: #E3F2FD;
		color: #1565C0;
	}

	.badge--fokus {
		background: var(--color-gray-100);
		color: var(--color-text-secondary);
	}

	.card-titel {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		margin: 0;
	}

	.card-beschreibung {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		gap: var(--space-xs);
	}

	.card-dauer {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.btn-fork-card {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		border: 1px solid #90CAF9;
		background: transparent;
		color: #1565C0;
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-fork-card:hover {
		background: #E3F2FD;
		border-color: #1565C0;
	}

	/* Editor-Link */
	.editor-link {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-lg);
	}

	.btn-editor {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		text-decoration: none;
		transition: background var(--transition-fast);
	}

	.btn-editor:hover {
		background: var(--color-primary-hover);
		text-decoration: none;
	}
</style>
