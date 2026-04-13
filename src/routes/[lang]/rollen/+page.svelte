<script>
	import { base } from '$app/paths';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';

	let { data } = $props();
	const { rollen, isFallback } = data;
	const lang = data.lang ?? 'de';

	// Suchfunktion
	let searchQuery = $state('');

	// LocalStorage Key
	const STORAGE_KEY = 'volleyball-selected-rollen';

	// Auswahl-State mit LocalStorage
	let selectedRollen = $state(loadSelectedRollen());

	// Load from LocalStorage
	function loadSelectedRollen() {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					// Nur IDs behalten, die noch existieren
					return parsed.filter((/** @type {string} */ id) => rollen.some((r) => r.id === id));
				}
			} catch (e) {
				console.error('Error loading selected rollen:', e);
			}
		}
		// Default: alle auswählen
		return rollen.map((r) => r.id);
	}

	// Save to LocalStorage
	function saveSelectedRollen() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedRollen));
			} catch (e) {
				console.error('Error saving selected rollen:', e);
			}
		}
	}

	/**
	 * @param {string} rolleId
	 */
	function toggleRolle(rolleId) {
		if (selectedRollen.includes(rolleId)) {
			selectedRollen = selectedRollen.filter((/** @type {string} */ id) => id !== rolleId);
		} else {
			selectedRollen = [...selectedRollen, rolleId];
		}
		saveSelectedRollen();
	}

	function selectAll() {
		selectedRollen = filteredRollen.map((r) => r.id);
		saveSelectedRollen();
	}

	function deselectAll() {
		selectedRollen = [];
		saveSelectedRollen();
	}

	function handlePrint() {
		setTimeout(() => {
			window.print();
		}, 200);
	}

	/**
	 * @param {string} rolleId
	 * @param {MouseEvent} event
	 */
	function handleCardClick(rolleId, event) {
		// Nur navigieren wenn nicht auf Checkbox geklickt wurde
		const target = event.target;
		if (target instanceof HTMLElement && !target.closest('.checkbox-wrapper')) {
			window.location.href = `${base}/${lang}/rollen/${rolleId}`;
		}
	}

	// Gefilterte Rollen basierend auf Suche
	const filteredRollen = $derived(
		rollen.filter((r) => {
			const query = searchQuery.toLowerCase();
			return (
				r.name.toLowerCase().includes(query) ||
				r.beschreibung?.toLowerCase().includes(query) ||
				r.fokus?.toLowerCase().includes(query) ||
				r.aufgaben?.some((a) => a.toLowerCase().includes(query))
			);
		})
	);

	// Ausgewählte und gefilterte Rollen für den Druck
	const selectedAndFilteredRollen = $derived(
		filteredRollen.filter((r) => selectedRollen.includes(r.id))
	);
</script>

<svelte:head>
	<title>Rollen - TV Muttenz Volleyball</title>
	<meta name="description" content="Volleyball-Rollen und Positionen im CLA-Ansatz" />
</svelte:head>

<div class="rollen-page">
	<header class="page-header">
		<div class="header-content">
			<h1>Rollen</h1>
			<p>Volleyball-Rollen und Positionen im Constraints-Led Approach</p>
		</div>
	</header>

	<TranslationFallbackBanner {lang} {isFallback} />

	{#if rollen.length === 0}
		<div class="empty-state">
			<p>Noch keine Rollen vorhanden.</p>
			<p class="hint">
				Rollen können als YAML-Dateien in <code>src/content/rollen/</code> hinzugefügt werden.
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
					placeholder="Rollen durchsuchen..."
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
				<strong>{selectedAndFilteredRollen.length}</strong> von
				<strong>{filteredRollen.length}</strong> Rollen ausgewählt
			</div>
			<div class="button-group">
				<button class="btn btn-secondary" onclick={selectAll}>Alle auswählen</button>
				<button class="btn btn-secondary" onclick={deselectAll}>Alle abwählen</button>
				<button
					class="btn btn-primary"
					onclick={handlePrint}
					disabled={selectedAndFilteredRollen.length === 0}
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

		<!-- Rollen-Karten Grid -->
		<div class="rollen-grid print-hide">
			{#each filteredRollen as rolle}
				<div class="rolle-card-wrapper">
					<div class="checkbox-wrapper" onclick={(e) => e.stopPropagation()}>
						<input
							type="checkbox"
							checked={selectedRollen.includes(rolle.id)}
							onchange={() => toggleRolle(rolle.id)}
							class="card-checkbox"
							id="checkbox-{rolle.id}"
						/>
						<label for="checkbox-{rolle.id}" class="checkbox-label"></label>
					</div>
					<div
						class="rolle-card"
						class:selected={selectedRollen.includes(rolle.id)}
						onclick={(e) => handleCardClick(rolle.id, e)}
					>
						<div class="card-content">
							<h3>{rolle.name}</h3>
							{#if rolle.fokus}
								<p class="fokus">{rolle.fokus}</p>
							{/if}
						</div>
						<div class="card-qr">
							<QRCode url={getAbsoluteURL(`/${lang}/rollen/${rolle.id}`)} size={60} />
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredRollen.length === 0}
			<div class="empty-state print-hide">
				<p>Keine Rollen gefunden für "{searchQuery}"</p>
			</div>
		{/if}

		<!-- Print-Bereich: Spielkarten-Layout -->
		<div class="print-cards">
			{#each selectedAndFilteredRollen as rolle}
				<div class="card-wrapper">
					<div class="role-card">
						<div class="card-header">
							<h2 class="card-title">{rolle.name}</h2>
							{#if rolle.fokus}
								<p class="card-fokus">{rolle.fokus}</p>
							{/if}
						</div>

						<div class="card-body">
							{#if rolle.beschreibung}
								<p class="card-description">{rolle.beschreibung}</p>
							{/if}

							{#if rolle.aufgaben && rolle.aufgaben.length > 0}
								<div class="card-aufgaben">
									<h3>Aufgaben:</h3>
									<ul>
										{#each rolle.aufgaben as aufgabe}
											<li>{aufgabe}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>

						<div class="card-footer">
							<div class="qr-code-small">
								<QRCode url={getAbsoluteURL(`/${lang}/rollen/${rolle.id}`)} size={80} />
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rollen-page {
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

	/* Rollen Grid */
	.rollen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--spacing-xl);
	}

	.rolle-card-wrapper {
		position: relative;
		display: flex;
		gap: 0;
	}

	.rolle-card {
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

	.rolle-card.selected {
		border-color: transparent;
	}

	.rolle-card:hover {
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

	.rolle-card-wrapper:has(.selected) .checkbox-wrapper {
		border-color: transparent;
	}

	.rolle-card-wrapper:hover .checkbox-wrapper {
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

	.rolle-card h3 {
		color: var(--color-primary);
		margin: 0 0 var(--spacing-sm) 0;
		font-size: var(--font-size-xl);
		line-height: 1.3;
	}

	.fokus {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin: 0;
		line-height: 1.6;
		font-style: italic;
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

	.role-card {
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

	.card-fokus {
		font-size: 8pt;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.2;
		font-style: italic;
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

	.card-aufgaben h3 {
		font-size: 9pt;
		font-weight: 600;
		margin: 0 0 3px 0;
		color: var(--color-text);
	}

	.card-aufgaben ul {
		margin: 0;
		padding-left: 12px;
		list-style: none;
	}

	.card-aufgaben li {
		margin-bottom: 2px;
		position: relative;
		font-size: 7.5pt;
		line-height: 1.3;
	}

	.card-aufgaben li::before {
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
		.rollen-page {
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

		.rollen-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Print Styles */
	@media print {
		.print-hide {
			display: none !important;
		}

		.rollen-page {
			max-width: none;
			padding: 0;
			margin: 0;
		}

	.print-cards {
		display: grid;
		grid-template-columns: repeat(3, 63mm);
		grid-auto-rows: 88mm;
		gap: 0;
		padding: 10mm;
	}

		@page {
			size: A4;
			margin: 10mm;
		}

		.role-card {
			box-shadow: 0 0 0 0.5pt var(--color-gray-300);
		}

		.card-wrapper {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
