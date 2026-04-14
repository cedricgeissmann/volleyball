<script>
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import TaktikBoard from '$lib/components/uebungen/taktik/TaktikBoard.svelte';
	import TaktikPrintView from '$lib/components/uebungen/taktik/TaktikPrintView.svelte';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { getStartPositions } from '$lib/utils/taktikEngine.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	const uebungen = $derived(data.uebungen);
	const isFallback = $derived(data.isFallback);
	const lang = $derived(data.lang);

	let searchQuery = $state('');

	// LocalStorage Key
	const STORAGE_KEY = 'volleyball-selected-taktik';

	// Auswahl-State mit LocalStorage
	let selectedUebungen = $state(loadSelected());

	function loadSelected() {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					return parsed.filter((/** @type {string} */ id) => uebungen.some((/** @type {any} */ u) => u.id === id));
				}
			} catch (e) {
				console.error('Error loading selected taktik:', e);
			}
		}
		return uebungen.map((/** @type {any} */ u) => u.id);
	}

	function saveSelected() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUebungen));
			} catch (e) {
				console.error('Error saving selected taktik:', e);
			}
		}
	}

	/** @param {string} id */
	function toggleUebung(id) {
		if (selectedUebungen.includes(id)) {
			selectedUebungen = selectedUebungen.filter((/** @type {string} */ s) => s !== id);
		} else {
			selectedUebungen = [...selectedUebungen, id];
		}
		saveSelected();
	}

	function selectAll() {
		selectedUebungen = filteredUebungen.map((/** @type {any} */ u) => u.id);
		saveSelected();
	}

	function deselectAll() {
		selectedUebungen = [];
		saveSelected();
	}

	function handlePrint() {
		setTimeout(() => window.print(), 200);
	}

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

	const selectedAndFiltered = $derived(
		filteredUebungen.filter((/** @type {any} */ u) => selectedUebungen.includes(u.id))
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
	<div class="page-header print-hide">
		<h1>Taktik-Übungen</h1>
		<p class="subtitle">Taktische Übungen mit animiertem Taktikboard</p>
	</div>

	<!-- Suchfeld -->
	<div class="search-bar print-hide">
		<input
			type="search"
			bind:value={searchQuery}
			placeholder="Übungen durchsuchen..."
			class="search-input"
		/>
	</div>

	<!-- Auswahl-Controls -->
	<div class="filter-controls print-hide">
		<div class="selection-info">
			<strong>{selectedAndFiltered.length}</strong> von
			<strong>{filteredUebungen.length}</strong> Übungen ausgewählt
		</div>
		<div class="button-group">
			<button class="btn btn-secondary" onclick={selectAll}>Alle auswählen</button>
			<button class="btn btn-secondary" onclick={deselectAll}>Keine auswählen</button>
			<button
				class="btn btn-primary"
				onclick={handlePrint}
				disabled={selectedAndFiltered.length === 0}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<polyline points="6 9 6 2 18 2 18 9"></polyline>
					<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
					<rect x="6" y="14" width="12" height="8"></rect>
				</svg>
				Drucken
			</button>
		</div>
	</div>

	{#if filteredUebungen.length === 0}
		<div class="empty-state print-hide">
			{#if searchQuery}
				<p>Keine Übungen gefunden für „{searchQuery}"</p>
			{:else}
				<p>Noch keine Taktik-Übungen vorhanden.</p>
			{/if}
		</div>
	{:else}
		<div class="uebungen-grid print-hide">
			{#each filteredUebungen as uebung (uebung.id)}
				<div class="uebung-card-wrapper">
					<!-- Checkbox -->
					<div class="checkbox-wrapper" onclick={(e) => e.stopPropagation()}>
						<input
							type="checkbox"
							checked={selectedUebungen.includes(uebung.id)}
							onchange={() => toggleUebung(uebung.id)}
							class="card-checkbox"
							id="check-{uebung.id}"
						/>
						<label for="check-{uebung.id}" class="checkbox-label"></label>
					</div>

					<!-- Karte -->
					<a
						href="{base}/{lang}/taktik/{uebung.id}"
						class="uebung-card"
						class:selected={selectedUebungen.includes(uebung.id)}
					>
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
				</div>
			{/each}
		</div>
	{/if}

	<!-- Link zum Editor -->
	<div class="editor-link print-hide">
		<a href="{base}/{lang}/taktik/editor" class="btn-editor">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
			</svg>
			Neues Taktikboard erstellen
		</a>
	</div>

	<!-- ===== DRUCKBEREICH ===== -->
	<!-- Jede Übung bekommt eine eigene Seite -->
	<div class="print-pages">
		{#each selectedAndFiltered as uebung (uebung.id)}
			<div class="print-page">
				<div class="print-page-header">
					<div class="print-page-titles">
						<h1 class="print-titel">{uebung.titel}</h1>
						{#if uebung.fokus}
							<p class="print-fokus">{uebung.fokus}</p>
						{/if}
						{#if uebung.beschreibung}
							<p class="print-beschreibung">{uebung.beschreibung}</p>
						{/if}
					</div>
					<div class="print-page-qr">
						<QRCode url={getAbsoluteURL(`/${lang}/taktik/${uebung.id}`)} size={80} />
						<p class="print-qr-label">Legende & Animation</p>
					</div>
				</div>

				{#if uebung.animationData}
					<div class="print-board-area">
						<TaktikPrintView
							animation={uebung.animationData}
							anleitung={uebung.anleitung}
						/>
					</div>
				{:else}
					<div class="print-no-board">Kein Taktikboard vorhanden</div>
				{/if}
			</div>
		{/each}
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
		margin-bottom: var(--space-md);
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

	/* Filter Controls */
	.filter-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-gray-50);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-xl);
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.selection-info {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.button-group {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		color: var(--color-text);
		transition: all var(--transition-fast);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn-secondary {
		background: var(--color-background);
	}

	/* Grid */
	.uebungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-xl);
		margin-bottom: var(--space-2xl);
	}

	/* Karten-Wrapper mit Checkbox */
	.uebung-card-wrapper {
		position: relative;
		display: flex;
		gap: 0;
	}

	.checkbox-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(21, 101, 192, 0.08);
		border: 1px solid transparent;
		border-right: none;
		border-radius: var(--radius-lg);
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding: var(--space-sm);
		min-width: 48px;
		transition: all var(--transition-fast);
	}

	.card-checkbox {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.checkbox-label {
		display: block;
		width: 24px;
		height: 24px;
		border: 2.5px solid var(--color-gray-400);
		border-radius: var(--radius-sm);
		cursor: pointer;
		position: relative;
		transition: all var(--transition-fast);
		background: white;
	}

	.checkbox-label:hover {
		border-color: #1565C0;
		transform: scale(1.1);
	}

	.card-checkbox:checked + .checkbox-label {
		background: #1565C0;
		border-color: #1565C0;
	}

	.card-checkbox:checked + .checkbox-label::after {
		content: '';
		position: absolute;
		left: 6px;
		top: 2px;
		width: 7px;
		height: 12px;
		border: solid white;
		border-width: 0 2.5px 2.5px 0;
		transform: rotate(45deg);
	}

	/* Karte */
	.uebung-card {
		display: flex;
		flex-direction: column;
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: box-shadow var(--transition-fast), transform var(--transition-fast);
		flex: 1;
	}

	.uebung-card.selected {
		border-color: #90CAF9;
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

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--space-3xl);
		color: var(--color-text-muted);
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

	/* ===== DRUCKBEREICH ===== */
	.print-pages {
		display: none;
	}

	.print-page {
		width: 100%;
		box-sizing: border-box;
	}

	.print-page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 12px;
	}

	.print-page-titles {
		flex: 1;
	}

	.print-titel {
		font-size: 18pt;
		font-weight: 700;
		margin: 0 0 4px;
		line-height: 1.2;
	}

	.print-fokus {
		font-size: 10pt;
		color: #555;
		font-style: italic;
		margin: 0 0 4px;
	}

	.print-beschreibung {
		font-size: 10pt;
		color: #333;
		margin: 0;
	}

	.print-page-qr {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.print-qr-label {
		font-size: 7pt;
		color: #666;
		text-align: center;
		margin: 0;
	}

	.print-no-board {
		padding: 24px;
		text-align: center;
		color: #999;
		font-size: 10pt;
		border: 1px dashed #ccc;
		border-radius: 4px;
	}

	/* ===== PRINT MEDIA ===== */
	@media print {
		.print-hide {
			display: none !important;
		}

		.page-container {
			max-width: none;
			padding: 0;
			margin: 0;
		}

		.print-pages {
			display: block;
		}

		.print-page {
			page-break-after: always;
			break-after: page;
			padding: 0;
		}

		.print-page:last-child {
			page-break-after: avoid;
			break-after: avoid;
		}

		@page {
			size: A4 portrait;
			margin: 15mm;
		}
	}
</style>
