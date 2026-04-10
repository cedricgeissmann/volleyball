<script>
	import { base } from '$app/paths';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';
	import { parseRepetitions, formatReps } from '$lib/utils/contentLoader.js';

	let { data } = $props();
	const { uebungen } = data;

	// Suchfunktion
	let searchQuery = $state('');

	// LocalStorage Key
	const STORAGE_KEY = 'volleyball-selected-uebungen';

	// Auswahl-State mit LocalStorage
	let selectedUebungen = $state(loadSelectedUebungen());

	// Load from LocalStorage
	function loadSelectedUebungen() {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					// Nur IDs behalten, die noch existieren
					return parsed.filter((/** @type {string} */ id) =>
						uebungen.some((/** @type {any} */ u) => u.id === id)
					);
				}
			} catch (e) {
				console.error('Error loading selected uebungen:', e);
			}
		}
		// Default: alle auswählen
		return uebungen.map((/** @type {any} */ u) => u.id);
	}

	// Save to LocalStorage
	function saveSelectedUebungen() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUebungen));
			} catch (e) {
				console.error('Error saving selected uebungen:', e);
			}
		}
	}

	/**
	 * @param {string} uebungId
	 */
	function toggleUebung(uebungId) {
		if (selectedUebungen.includes(uebungId)) {
			selectedUebungen = selectedUebungen.filter((/** @type {string} */ id) => id !== uebungId);
		} else {
			selectedUebungen = [...selectedUebungen, uebungId];
		}
		saveSelectedUebungen();
	}

	function selectAll() {
		selectedUebungen = filteredUebungen.map((/** @type {any} */ u) => u.id);
		saveSelectedUebungen();
	}

	function deselectAll() {
		selectedUebungen = [];
		saveSelectedUebungen();
	}

	function handlePrint() {
		setTimeout(() => {
			window.print();
		}, 200);
	}

	/**
	 * @param {string} uebungId
	 * @param {MouseEvent} event
	 */
	function handleCardClick(uebungId, event) {
		// Nur navigieren wenn nicht auf Checkbox geklickt wurde
		const target = event.target;
		if (target instanceof HTMLElement && !target.closest('.checkbox-wrapper')) {
			window.location.href = `${base}/uebungen/${uebungId}`;
		}
	}

	// Gefilterte Übungen basierend auf Suche
	const filteredUebungen = $derived(
		uebungen.filter((/** @type {any} */ u) => {
			const query = searchQuery.toLowerCase();
			return (
				u.titel.toLowerCase().includes(query) ||
				u.beschreibung?.toLowerCase().includes(query) ||
				u.kategorie?.toLowerCase().includes(query) ||
				u.fokus?.toLowerCase().includes(query) ||
				u.ziele?.some((/** @type {string} */ z) => z.toLowerCase().includes(query))
			);
		})
	);

	// Ausgewählte und gefilterte Übungen für den Druck
	const selectedAndFilteredUebungen = $derived(
		filteredUebungen.filter((/** @type {any} */ u) => selectedUebungen.includes(u.id))
	);

	/**
	 * Gruppiert Übungen nach Kategorie
	 * @param {any[]} items
	 * @returns {Record<string, any[]>}
	 */
	function groupByCategory(items) {
		/** @type {Record<string, any[]>} */
		const grouped = {};
		for (const item of items) {
			const category = item.kategorie || 'Sonstiges';
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(item);
		}
		return grouped;
	}

	const groupedUebungen = $derived(groupByCategory(filteredUebungen));
	const categories = $derived(Object.keys(groupedUebungen).sort());
</script>

<svelte:head>
	<title>Übungen - TV Muttenz Volleyball</title>
	<meta name="description" content="Volleyball-Übungen basierend auf dem Constraints-Led Approach" />
</svelte:head>

<div class="uebungen-page">
	<header class="page-header">
		<div class="header-content">
			<h1>Übungen</h1>
			<p>Volleyball-Übungen basierend auf dem Constraints-Led Approach</p>
		</div>
	</header>

	{#if uebungen.length === 0}
		<div class="empty-state">
			<p>Noch keine Übungen vorhanden.</p>
			<p class="hint">
				Übungen können als YAML-Dateien in <code>src/content/uebungen/</code> hinzugefügt werden.
			</p>
		</div>
	{:else}
		<!-- Suchfeld -->
		<div class="search-section print-hide">
			<div class="search-wrapper">
				<svg
					class="search-icon"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="11" cy="11" r="8"></circle>
					<path d="m21 21-4.35-4.35"></path>
				</svg>
				<input
					type="text"
					placeholder="Übungen durchsuchen..."
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button class="clear-search" onclick={() => (searchQuery = '')}>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Auswahl-Controls -->
		<div class="filter-controls print-hide">
			<div class="selection-info">
				<strong>{selectedAndFilteredUebungen.length}</strong> von
				<strong>{filteredUebungen.length}</strong> Übungen ausgewählt
			</div>
			<div class="button-group">
				<button class="btn btn-secondary" onclick={selectAll}>Alle auswählen</button>
				<button class="btn btn-secondary" onclick={deselectAll}>Alle abwählen</button>
				<button
					class="btn btn-primary"
					onclick={handlePrint}
					disabled={selectedAndFilteredUebungen.length === 0}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="6 9 6 2 18 2 18 9"></polyline>
						<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
						></path>
						<rect x="6" y="14" width="12" height="8"></rect>
					</svg>
					Drucken
				</button>
			</div>
		</div>

		<!-- Übungen nach Kategorie gruppiert -->
		<div class="categories print-hide">
			{#each categories as category}
				<section class="category-section">
					<h2>{category}</h2>
					<div class="uebungen-grid">
						{#each groupedUebungen[category] as uebung}
							<div class="uebung-card-wrapper">
								<div class="checkbox-wrapper" onclick={(e) => e.stopPropagation()}>
									<input
										type="checkbox"
										checked={selectedUebungen.includes(uebung.id)}
										onchange={() => toggleUebung(uebung.id)}
										class="card-checkbox"
										id="checkbox-{uebung.id}"
									/>
									<label for="checkbox-{uebung.id}" class="checkbox-label"></label>
								</div>
								<div
									class="uebung-card"
									class:selected={selectedUebungen.includes(uebung.id)}
									onclick={(e) => handleCardClick(uebung.id, e)}
								>
									<div class="card-content">
										<h3>{uebung.titel}</h3>
										{#if uebung.beschreibung}
											<p class="description">{uebung.beschreibung}</p>
										{/if}
										<div class="setup-info">
											{#if uebung.typ}
												<span class="badge badge-typ">{uebung.typ}</span>
											{/if}
											{#if uebung.wiederholungen}
												{@const reps = parseRepetitions(uebung.wiederholungen)}
												<span class="badge">{formatReps(reps)}</span>
											{:else if uebung.dauer}
												<span class="badge">{uebung.dauer} Min</span>
											{/if}
											{#if uebung.fokus}
												<span class="badge">{uebung.fokus}</span>
											{/if}
										</div>
									</div>
									<div class="card-qr">
										<QRCode url={getAbsoluteURL(`/uebungen/${uebung.id}`)} size={60} />
									</div>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>

		{#if filteredUebungen.length === 0}
			<div class="empty-state print-hide">
				<p>Keine Übungen gefunden für "{searchQuery}"</p>
			</div>
		{/if}

		<!-- Print-Bereich: Spielkarten-Layout -->
		<div class="print-cards">
			{#each selectedAndFilteredUebungen as uebung}
				<div class="card-wrapper">
					<div class="exercise-card">
						<div class="card-header">
							<h2 class="card-title">{uebung.titel}</h2>
							{#if uebung.kategorie}
								<span class="card-category">{uebung.kategorie}</span>
							{/if}
						</div>

						<div class="card-body">
							{#if uebung.beschreibung}
								<p class="card-description">{uebung.beschreibung}</p>
							{/if}

							{#if uebung.fokus}
								<div class="card-fokus">
									<strong>Fokus:</strong> {uebung.fokus}
								</div>
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

							{#if uebung.wiederholungen}
								{@const reps = parseRepetitions(uebung.wiederholungen)}
								<div class="card-dauer">
									<strong>Wiederholungen:</strong> {formatReps(reps)}
								</div>
							{:else if uebung.dauer}
								<div class="card-dauer">
									<strong>Dauer:</strong> {uebung.dauer} Minuten
								</div>
							{/if}
						</div>

						<div class="card-footer">
							<div class="qr-code-small">
								<QRCode url={getAbsoluteURL(`/uebungen/${uebung.id}`)} size={80} />
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.uebungen-page {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-lg);
	}

	.page-header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.header-content {
		flex: 1;
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

	.search-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		display: none;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-lg);
		font-size: var(--font-size-xl);
		border: 3px solid var(--color-primary);
		border-radius: var(--radius-lg);
		background-color: var(--color-bg);
		color: var(--color-text);
		transition: all var(--transition-normal);
		box-shadow: 0 2px 8px rgba(255, 53, 0, 0.1);
		min-height: 60px;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 4px 16px rgba(255, 53, 0, 0.2);
	}

	.search-input::placeholder {
		color: var(--color-text-secondary);
	}

	.clear-search {
		position: absolute;
		right: var(--spacing-lg);
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--spacing-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
		transition: color var(--transition-fast);
		border-radius: var(--radius-sm);
	}

	.clear-search:hover {
		color: var(--color-primary);
		background-color: var(--color-gray-50);
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

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn-secondary {
		background-color: var(--color-background);
		border-color: var(--color-gray-300);
	}

	.btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.btn-primary svg {
		flex-shrink: 0;
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		background-color: var(--color-bg-secondary);
		border-radius: var(--border-radius);
		margin-top: var(--spacing-xl);
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}

	.empty-state .hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.empty-state code {
		background-color: var(--color-bg);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
	}

	/* Kategorien */
	.category-section {
		margin-bottom: var(--spacing-xl);
	}

	.category-section h2 {
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
		padding-bottom: var(--spacing-sm);
		border-bottom: 2px solid var(--color-primary);
	}

	/* Übungen Grid */
	.uebungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--spacing-xl);
	}

	.uebung-card-wrapper {
		position: relative;
		display: flex;
		gap: 0;
	}

	.uebung-card {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--spacing-md);
		align-items: start;
		background-color: var(--color-bg);
		border: 1px solid transparent;
		border-radius: var(--radius-lg);
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		padding: var(--spacing-md);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-normal);
		cursor: pointer;
		position: relative;
		flex: 1;
	}

	.uebung-card.selected {
		border-color: transparent;
	}

	.uebung-card:hover {
		border-color: var(--color-primary);
		border-width: 1px;
	}

	/* Checkbox Styling - Separates Feld */
	.checkbox-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(255, 53, 0, 0.1);
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
		border-color: transparent;
	}

	.uebung-card-wrapper:hover .checkbox-wrapper {
		border-color: var(--color-primary);
		border-width: 1px;
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
		border: 3px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		position: relative;
		transition: all var(--transition-fast);
		background-color: white;
	}

	.checkbox-label:hover {
		border-color: var(--color-primary);
		transform: scale(1.1);
	}

	.card-checkbox:checked + .checkbox-label {
		background-color: var(--color-primary);
		border-color: var(--color-primary);
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

	/* Card Content */
	.card-content {
		flex: 1;
		min-width: 0;
	}

	.uebung-card h3 {
		color: var(--color-primary);
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-xl);
		line-height: 1.3;
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin: 0 0 var(--spacing-sm) 0;
		line-height: 1.5;
	}

	.setup-info {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
	}

	.badge {
		display: inline-block;
		background-color: var(--color-bg-secondary);
		color: var(--color-text);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: var(--font-size-xs);
		font-weight: 600;
		text-transform: capitalize;
	}

	.badge-typ {
		background-color: var(--color-primary);
		color: white;
	}

	/* QR Code auf Karte */
	.card-qr {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: var(--spacing-xs);
		background-color: white;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
	}

	/* Print Cards (hidden on screen) */
	.print-cards {
		display: none;
	}

	.card-wrapper {
		break-inside: avoid;
		page-break-inside: avoid;
	}

	.exercise-card {
		width: 63mm;
		height: 88mm;
		border: 2px solid var(--color-gray-300);
		border-radius: 6px;
		padding: 8px;
		background-color: white;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
	}

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
		background-color: var(--color-primary);
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
		margin: 0 0 6px 0;
		color: var(--color-text);
		font-size: 8pt;
	}

	.card-fokus {
		margin: 0 0 6px 0;
		font-size: 7.5pt;
		color: var(--color-text-secondary);
	}

	.card-dauer {
		margin: 6px 0 0 0;
		font-size: 7.5pt;
		color: var(--color-text);
	}

	.card-ziele h3 {
		font-size: 9pt;
		font-weight: 600;
		margin: 0 0 3px 0;
		color: var(--color-text);
	}

	.card-ziele ul {
		margin: 0;
		padding-left: 12px;
		list-style: none;
	}

	.card-ziele li {
		margin-bottom: 2px;
		position: relative;
		font-size: 7.5pt;
		line-height: 1.3;
	}

	.card-ziele li::before {
		content: '•';
		position: absolute;
		left: -10px;
		color: var(--color-primary);
		font-weight: bold;
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
		.uebungen-page {
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

	/* Print Styles */
	@media print {
		.print-hide {
			display: none !important;
		}

		.uebungen-page {
			max-width: none;
			padding: 0;
			margin: 0;
		}

		.print-cards {
			display: grid;
			grid-template-columns: repeat(3, 63mm);
			grid-auto-rows: 88mm;
			gap: 5mm;
			padding: 10mm;
		}

		@page {
			size: A4;
			margin: 10mm;
		}

		.exercise-card {
			box-shadow: 0 0 0 0.5pt var(--color-gray-300);
		}

		.card-wrapper {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
