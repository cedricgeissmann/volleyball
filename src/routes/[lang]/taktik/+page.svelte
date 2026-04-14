<script>
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import TaktikBoard from '$lib/components/uebungen/taktik/TaktikBoard.svelte';
	import PrintCardBackTaktik from '$lib/components/uebungen/print/PrintCardBackTaktik.svelte';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { getStartPositions } from '$lib/utils/taktikEngine.js';
	import { loadAllDrafts, deleteDraft, draftToYaml } from '$lib/utils/taktikDrafts.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	const uebungen = $derived(data.uebungen);
	const isFallback = $derived(data.isFallback);
	const lang = $derived(data.lang);

	let searchQuery = $state('');

	// ---- Lokale Entwürfe aus localStorage ----
	/** @type {import('$lib/utils/taktikDrafts.js').TaktikDraft[]} */
	let localDrafts = $state([]);

	onMount(() => {
		localDrafts = loadAllDrafts();
	});

	function removeLocalDraft(/** @type {string} */ id) {
		deleteDraft(id);
		localDrafts = loadAllDrafts();
		// Auch aus Selektion entfernen
		selectedUebungen = selectedUebungen.filter((s) => s !== `local:${id}`);
		saveSelected();
	}

	/** Exportiert einen Entwurf als YAML + JSON (zwei Dateien) */
	function exportDraft(/** @type {import('$lib/utils/taktikDrafts.js').TaktikDraft} */ draft) {
		const slug = draft.titel
			.toLowerCase()
			.replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'entwurf';

		// YAML
		const yaml = draftToYaml(draft);
		downloadBlob(yaml, `${slug}.yaml`, 'text/yaml');

		// JSON (animation)
		const json = JSON.stringify(draft.animation, null, 2);
		downloadBlob(json, `${slug}.taktik.json`, 'application/json');
	}

	/** @param {string} content @param {string} filename @param {string} type */
	function downloadBlob(content, filename, type) {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ---- Auswahl (statische Übungen + lokale Entwürfe gemischt) ----
	const STORAGE_KEY = 'volleyball-selected-taktik';

	let selectedUebungen = $state(loadSelected());

	function loadSelected() {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) return JSON.parse(stored);
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
		const staticIds = filteredUebungen.map((/** @type {any} */ u) => u.id);
		const localIds = filteredLocalDrafts.map((d) => `local:${d.id}`);
		selectedUebungen = [...staticIds, ...localIds];
		saveSelected();
	}

	function deselectAll() {
		selectedUebungen = [];
		saveSelected();
	}

	function handlePrint() {
		setTimeout(() => window.print(), 200);
	}

	/**
	 * @param {string} uebungId
	 * @param {MouseEvent} event
	 */
	function handleCardClick(uebungId, event) {
		const target = event.target;
		if (target instanceof HTMLElement && !target.closest('.checkbox-wrapper') && !target.closest('.local-actions')) {
			window.location.href = `${base}/${lang}/taktik/${uebungId}`;
		}
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

	const filteredLocalDrafts = $derived(
		localDrafts.filter((d) => {
			const q = searchQuery.toLowerCase();
			return (
				!q ||
				d.titel.toLowerCase().includes(q) ||
				(d.beschreibung ?? '').toLowerCase().includes(q) ||
				(d.fokus ?? '').toLowerCase().includes(q)
			);
		})
	);

	const selectedAndFiltered = $derived(
		filteredUebungen.filter((/** @type {any} */ u) => selectedUebungen.includes(u.id))
	);

	const selectedLocalDrafts = $derived(
		filteredLocalDrafts.filter((d) => selectedUebungen.includes(`local:${d.id}`))
	);

	const totalSelected = $derived(selectedAndFiltered.length + selectedLocalDrafts.length);
	const totalFiltered = $derived(filteredUebungen.length + filteredLocalDrafts.length);

	/**
	 * Fork einer Übung: Animationsdaten via sessionStorage übergeben.
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

	/** Öffnet den Editor mit einem bestehenden lokalen Entwurf */
	function editLocalDraft(/** @type {import('$lib/utils/taktikDrafts.js').TaktikDraft} */ draft, /** @type {MouseEvent} */ e) {
		e.preventDefault();
		e.stopPropagation();
		window.location.href = `${base}/${lang}/taktik/editor?draft=${draft.id}`;
	}
</script>

<svelte:head>
	<title>Taktik-Übungen – TV Muttenz Volleyball</title>
	<meta name="description" content="Taktische Volleyball-Übungen mit animiertem Taktikboard" />
</svelte:head>

{#if isFallback}
	<TranslationFallbackBanner {lang} {isFallback} />
{/if}

<div class="taktik-page">
	<header class="page-header print-hide">
		<div class="header-content">
			<h1>Taktik-Übungen</h1>
			<p>Taktische Übungen mit animiertem Taktikboard</p>
		</div>
	</header>

	<!-- Suchfeld -->
	<div class="search-section print-hide">
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
			<strong>{totalSelected}</strong> von
			<strong>{totalFiltered}</strong> Übungen ausgewählt
		</div>
		<div class="button-group">
			<button class="btn btn-secondary" onclick={selectAll}>Alle auswählen</button>
			<button class="btn btn-secondary" onclick={deselectAll}>Keine auswählen</button>
			<button
				class="btn btn-primary"
				onclick={handlePrint}
				disabled={totalSelected === 0}
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
		<!-- Karten-Grid mit Checkboxen -->
		<div class="uebungen-grid print-hide">
			{#each filteredUebungen as uebung (uebung.id)}
				<div class="uebung-card-wrapper">
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
					<div
						class="uebung-card"
						class:selected={selectedUebungen.includes(uebung.id)}
						onclick={(e) => handleCardClick(uebung.id, e)}
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
						<div class="card-content">
							<h3>{uebung.titel}</h3>
							{#if uebung.fokus}
								<p class="fokus">{uebung.fokus}</p>
							{/if}
						</div>
						<div class="card-qr">
							<QRCode url={getAbsoluteURL(`/taktik/${uebung.id}`, lang)} size={72} />
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ===== LOKALE ENTWÜRFE ===== -->
	{#if localDrafts.length > 0}
		<div class="local-section print-hide">
			<h2 class="local-section-title">
				Meine Entwürfe
				<span class="local-count">{localDrafts.length}</span>
			</h2>
			<p class="local-section-hint">Diese Übungen sind lokal auf diesem Gerät gespeichert. Exportiere sie als YAML + JSON um sie dauerhaft ins Repository zu integrieren.</p>

			<div class="uebungen-grid">
				{#each filteredLocalDrafts as draft (draft.id)}
					<div class="uebung-card-wrapper">
						<div class="checkbox-wrapper" onclick={(e) => e.stopPropagation()}>
							<input
								type="checkbox"
								checked={selectedUebungen.includes(`local:${draft.id}`)}
								onchange={() => toggleUebung(`local:${draft.id}`)}
								class="card-checkbox"
								id="check-local-{draft.id}"
							/>
							<label for="check-local-{draft.id}" class="checkbox-label"></label>
						</div>
						<div
							class="uebung-card local-card"
							class:selected={selectedUebungen.includes(`local:${draft.id}`)}
						>
							{#if draft.animation}
								<div class="card-preview">
									<TaktikBoard
										animation={draft.animation}
										positions={getStartPositions(draft.animation)}
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

							<div class="card-content">
								<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">
									<span class="badge-local">Lokal</span>
									{#if draft.fokus}
										<span class="badge badge--fokus">{draft.fokus}</span>
									{/if}
								</div>
								<h3>{draft.titel}</h3>
								{#if draft.beschreibung}
									<p class="fokus">{draft.beschreibung}</p>
								{/if}
							</div>

							<div class="local-actions">
								<button
									class="btn-action"
									onclick={(e) => editLocalDraft(draft, e)}
									title="Im Editor bearbeiten"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
									Bearbeiten
								</button>
								<button
									class="btn-action"
									onclick={(e) => { e.stopPropagation(); exportDraft(draft); }}
									title="Als YAML + JSON exportieren"
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
									Exportieren
								</button>
								<button
									class="btn-action btn-action--danger"
									onclick={(e) => { e.stopPropagation(); removeLocalDraft(draft.id); }}
									title="Entwurf löschen"
								>✕</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
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

	<!-- ===== DRUCKBEREICH: Doppelseitige Karten (zum Falten) ===== -->
	<div class="print-cards">
		<!-- Statische Übungen -->
		{#each selectedAndFiltered as uebung (uebung.id)}
			<div class="card-wrapper-double">
				<!-- Linke Seite: Vorderseite (Details) -->
				<div class="exercise-card card-front">
					<div class="card-header">
						<h2 class="card-title">{uebung.titel}</h2>
						{#if uebung.fokus}
							<span class="card-category">{uebung.fokus}</span>
						{/if}
					</div>

					<div class="card-body">
						{#if uebung.beschreibung}
							<p class="card-description">{uebung.beschreibung}</p>
						{/if}

						{#if uebung.ziele && uebung.ziele.length > 0}
							<div class="card-ziele">
								<h3>Lernziele:</h3>
								<ul>
									{#each uebung.ziele as ziel}
										<li>{ziel}</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if uebung.anleitung && uebung.anleitung.length > 0}
							<div class="card-anleitung">
								<h3>Ablauf:</h3>
								<ol>
									{#each uebung.anleitung as schritt}
										<li>{schritt}</li>
									{/each}
								</ol>
							</div>
						{/if}

						{#if uebung.dauer}
							<div class="card-dauer">
								<strong>Dauer:</strong> {uebung.dauer} Min.
							</div>
						{/if}
					</div>

					<div class="card-footer">
						<div class="qr-code-small">
							<QRCode url={getAbsoluteURL(`/taktik/${uebung.id}`, lang)} size={80} />
						</div>
					</div>
				</div>

				<!-- Rechte Seite: Rückseite (Taktikboard) -->
				<div class="exercise-card card-back">
					{#if uebung.animationData}
						<PrintCardBackTaktik animation={uebung.animationData} />
					{:else}
						<div class="no-animation">
							<p>Kein Taktikboard</p>
						</div>
					{/if}
				</div>
			</div>
		{/each}

		<!-- Lokale Entwürfe -->
		{#each selectedLocalDrafts as draft (draft.id)}
			<div class="card-wrapper-double">
				<!-- Vorderseite -->
				<div class="exercise-card card-front">
					<div class="card-header">
						<h2 class="card-title">{draft.titel}</h2>
						{#if draft.fokus}
							<span class="card-category">{draft.fokus}</span>
						{/if}
					</div>

					<div class="card-body">
						{#if draft.beschreibung}
							<p class="card-description">{draft.beschreibung}</p>
						{/if}

						{#if draft.ziele && draft.ziele.length > 0}
							<div class="card-ziele">
								<h3>Lernziele:</h3>
								<ul>
									{#each draft.ziele as ziel}
										<li>{ziel}</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if draft.anleitung && draft.anleitung.length > 0}
							<div class="card-anleitung">
								<h3>Ablauf:</h3>
								<ol>
									{#each draft.anleitung as schritt}
										<li>{schritt}</li>
									{/each}
								</ol>
							</div>
						{/if}

						{#if draft.dauer}
							<div class="card-dauer">
								<strong>Dauer:</strong> {draft.dauer} Min.
							</div>
						{/if}
					</div>

					<div class="card-footer">
						<div class="card-local-badge">Lokal</div>
					</div>
				</div>

				<!-- Rückseite (Taktikboard) -->
				<div class="exercise-card card-back">
					{#if draft.animation}
						<PrintCardBackTaktik animation={draft.animation} />
					{:else}
						<div class="no-animation">
							<p>Kein Taktikboard</p>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.taktik-page {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-lg);
	}

	.page-header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.header-content {
		text-align: center;
	}

	.page-header h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.page-header p {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
	}

	/* Suchfeld */
	.search-section {
		margin-bottom: var(--spacing-lg);
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
		padding: var(--spacing-lg);
		background-color: var(--color-gray-50);
		border-radius: var(--radius-md);
		margin-bottom: var(--spacing-lg);
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.selection-info {
		color: var(--color-text);
		font-size: var(--font-size-base);
	}

	.button-group {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.btn {
		padding: var(--spacing-md) var(--spacing-xl);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		background-color: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-lg);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-normal);
		white-space: nowrap;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-sm);
		min-height: 50px;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn-secondary {
		background-color: var(--color-background);
		border-color: var(--color-gray-300);
	}

	/* Karten Grid */
	.uebungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--spacing-xl);
		margin-bottom: var(--space-2xl);
	}

	.uebung-card-wrapper {
		position: relative;
		display: flex;
		gap: 0;
	}

	.checkbox-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(21, 101, 192, 0.08);
		border: 1px solid transparent;
		border-right: none;
		border-radius: var(--radius-lg);
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding: var(--spacing-md);
		min-width: 60px;
		transition: all var(--transition-normal);
	}

	.uebung-card-wrapper:has(.selected) .checkbox-wrapper {
		border-color: #90CAF9;
	}

	.uebung-card-wrapper:hover .checkbox-wrapper {
		border-color: var(--color-primary);
	}

	.card-checkbox {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.checkbox-label {
		display: block;
		width: 28px;
		height: 28px;
		border: 3px solid var(--color-gray-400);
		border-radius: var(--radius-md);
		cursor: pointer;
		position: relative;
		transition: all var(--transition-fast);
		background-color: white;
	}

	.checkbox-label:hover {
		border-color: #1565C0;
		transform: scale(1.1);
	}

	.card-checkbox:checked + .checkbox-label {
		background-color: #1565C0;
		border-color: #1565C0;
	}

	.card-checkbox:checked + .checkbox-label::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 3px;
		width: 8px;
		height: 14px;
		border: solid white;
		border-width: 0 3px 3px 0;
		transform: rotate(45deg);
	}

	/* Screen-Karte */
	.uebung-card {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto 1fr;
		gap: var(--spacing-md);
		align-items: start;
		background-color: var(--color-background-elevated, var(--color-bg));
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-normal);
		cursor: pointer;
		flex: 1;
	}

	.uebung-card.selected {
		border-color: #90CAF9;
	}

	.uebung-card:hover {
		border-color: var(--color-primary);
	}

	.card-preview {
		grid-column: 1 / -1;
		background: var(--color-gray-100);
		padding: var(--space-sm);
		border-bottom: 1px solid var(--color-gray-200);
	}

	.card-preview--empty {
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.card-content {
		padding: var(--spacing-md);
	}

	.uebung-card h3 {
		color: var(--color-primary);
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-xl);
		line-height: 1.3;
	}

	.fokus {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin: 0;
		font-style: italic;
	}

	.card-qr {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--spacing-xs);
		background-color: white;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		margin: var(--spacing-md);
		margin-left: 0;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--color-text-secondary);
	}

	/* ===== LOKALE ENTWÜRFE ===== */
	.local-section {
		margin-top: var(--spacing-xl);
		padding-top: var(--spacing-xl);
		border-top: 2px solid var(--color-gray-200);
	}

	.local-section-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--spacing-sm);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-text);
	}

	.local-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 24px;
		padding: 0 6px;
		background: #1565C0;
		color: white;
		border-radius: 12px;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
	}

	.local-section-hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin: 0 0 var(--spacing-lg);
	}

	.badge-local {
		display: inline-block;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: #FFF3E0;
		color: #E65100;
		border: 1px solid #FFCC80;
	}

	.local-card {
		border-color: #FFCC80 !important;
	}

	.local-card.selected {
		border-color: #FF9800 !important;
	}

	.local-actions {
		display: flex;
		gap: 4px;
		padding: var(--spacing-sm) var(--spacing-md);
		border-top: 1px solid var(--color-gray-100);
		background: var(--color-gray-50);
	}

	.btn-action {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-gray-300);
		background: white;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-action:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.btn-action--danger {
		margin-left: auto;
	}

	.btn-action--danger:hover {
		border-color: var(--color-error, #C62828);
		color: var(--color-error, #C62828);
	}

	/* Badge auf der Druckkarte */
	.card-local-badge {
		font-size: 7pt;
		color: #E65100;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	/* Editor-Link */
	.editor-link {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--spacing-lg);
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

	/* ===== DRUCK-KARTEN (screen: hidden) ===== */
	.print-cards {
		display: none;
	}

	.card-wrapper-double {
		break-inside: avoid;
		page-break-inside: avoid;
		display: flex;
		flex-direction: row;
		gap: 0;
		position: relative;
	}

	/* Schnittmarkierungen an den Ecken */
	.card-wrapper-double::before,
	.card-wrapper-double::after {
		content: '';
		position: absolute;
		width: 3mm;
		height: 3mm;
		border: 1px solid var(--color-gray-400);
	}

	.card-wrapper-double::before {
		top: -1mm;
		left: -1mm;
		border-right: none;
		border-bottom: none;
	}

	.card-wrapper-double::after {
		bottom: -1mm;
		right: -1mm;
		border-left: none;
		border-top: none;
	}

	.exercise-card {
		width: 63mm;
		height: 88mm;
		border: 2px solid var(--color-gray-300);
		padding: 8px;
		background-color: white;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
	}

	.card-front {
		border-radius: 6px 0 0 6px;
		border-right: 1px dashed var(--color-gray-400);
	}

	.card-back {
		border-radius: 0 6px 6px 0;
		border-left: 1px dashed var(--color-gray-400);
		padding: 0;
		overflow: hidden;
		position: relative;
	}

	.no-animation {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
		font-size: 9pt;
		text-align: center;
	}

	/* Karten-Inhalt (Vorderseite) */
	.card-header {
		margin-bottom: 6px;
		border-bottom: 1px solid var(--color-gray-200);
		padding-bottom: 4px;
	}

	.card-title {
		font-size: 11pt;
		font-weight: 700;
		color: var(--color-primary);
		margin: 0 0 2px 0;
		line-height: 1.2;
	}

	.card-category {
		display: inline-block;
		background-color: #1565C0;
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 7pt;
		font-weight: 600;
	}

	.card-body {
		flex: 1;
		overflow: hidden;
		font-size: 8pt;
		line-height: 1.4;
	}

	.card-description {
		margin: 0 0 5px 0;
		color: var(--color-text);
		font-size: 8pt;
	}

	.card-ziele h3,
	.card-anleitung h3 {
		font-size: 8pt;
		font-weight: 600;
		margin: 0 0 2px 0;
		color: var(--color-text);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.card-ziele ul {
		margin: 0 0 5px 0;
		padding-left: 10px;
		list-style: none;
	}

	.card-ziele li {
		margin-bottom: 1px;
		position: relative;
		font-size: 7pt;
		line-height: 1.3;
	}

	.card-ziele li::before {
		content: '•';
		position: absolute;
		left: -8px;
		color: #1565C0;
		font-weight: bold;
	}

	.card-anleitung ol {
		margin: 0 0 5px 0;
		padding-left: 12px;
		font-size: 7pt;
		line-height: 1.3;
	}

	.card-anleitung li {
		margin-bottom: 1px;
	}

	.card-dauer {
		margin-top: 4px;
		font-size: 7.5pt;
		color: var(--color-text);
	}

	.card-footer {
		display: flex;
		justify-content: center;
		align-items: center;
		margin-top: 4px;
		padding-top: 4px;
		border-top: 1px solid var(--color-gray-200);
	}

	.qr-code-small {
		width: 70px;
		height: 70px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.taktik-page {
			padding: var(--spacing-md);
		}

		.filter-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.button-group {
			width: 100%;
		}

		.btn {
			flex: 1;
		}

		.uebungen-grid {
			grid-template-columns: 1fr;
		}
	}

	/* ===== PRINT STYLES ===== */
	@media print {
		.print-hide {
			display: none !important;
		}

		.taktik-page {
			max-width: none;
			padding: 0;
			margin: 0;
		}

		.print-cards {
			display: grid;
			grid-template-columns: repeat(1, 126mm);
			grid-auto-rows: 88mm;
			gap: 5mm;
			padding: 10mm;
		}

		@page {
			size: A4;
			margin: 10mm;
		}

		.card-wrapper-double {
			width: 126mm;
			height: 88mm;
		}

		.exercise-card {
			box-shadow: 0 0 0 0.5pt var(--color-gray-300);
		}

		.card-wrapper-double {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
