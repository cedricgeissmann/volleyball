<script>
	import { base } from '$app/paths';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	const { constraints, isFallback } = data;
	const lang = data.lang ?? 'de';

	// Suchfunktion
	let searchQuery = $state('');

	// LocalStorage Key
	const STORAGE_KEY = 'volleyball-selected-constraints';

	// Auswahl-State mit LocalStorage
	let selectedConstraints = $state(loadSelectedConstraints());

	function loadSelectedConstraints() {
		if (browser) {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					return parsed.filter((/** @type {string} */ id) => constraints.some(/** @param {{id:string}} c */ (c) => c.id === id));
				}
			} catch (e) {
				console.error('Error loading selected constraints:', e);
			}
		}
		return constraints.map(/** @param {{id:string}} c */ (c) => c.id);
	}

	function saveSelectedConstraints() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedConstraints));
			} catch (e) {
				console.error('Error saving selected constraints:', e);
			}
		}
	}

	/**
	 * @param {string} constraintId
	 */
	function toggleConstraint(constraintId) {
		if (selectedConstraints.includes(constraintId)) {
			selectedConstraints = selectedConstraints.filter((/** @type {string} */ id) => id !== constraintId);
		} else {
			selectedConstraints = [...selectedConstraints, constraintId];
		}
		saveSelectedConstraints();
	}

	function selectAll() {
		selectedConstraints = filteredConstraints.map((/** @type {any} */ c) => c.id);
		saveSelectedConstraints();
	}

	function deselectAll() {
		selectedConstraints = [];
		saveSelectedConstraints();
	}

	function handlePrint() {
		setTimeout(() => {
			window.print();
		}, 200);
	}

	/**
	 * @param {string} constraintId
	 * @param {MouseEvent} event
	 */
	function handleCardClick(constraintId, event) {
		const target = event.target;
		if (target instanceof HTMLElement && !target.closest('.checkbox-wrapper')) {
			window.location.href = `${base}/${lang}/constraints/${constraintId}`;
		}
	}

	/** @param {string} schwierigkeit */
	function getDifficultyKey(schwierigkeit) {
		const map = /** @type {Record<string,string>} */ ({
			'einfach': 'constraint_difficulty_easy',
			'mittel': 'constraint_difficulty_medium',
			'schwer': 'constraint_difficulty_hard',
		});
		return map[schwierigkeit] ?? schwierigkeit;
	}

	/** @param {string} kategorie */
	function getCategoryKey(kategorie) {
		const map = /** @type {Record<string,string>} */ ({
			'Angriff': 'constraint_category_attack',
			'Verteidigung': 'constraint_category_defense',
			'Aufbau': 'constraint_category_setup',
			'Allgemein': 'constraint_category_general',
		});
		return map[kategorie] ?? kategorie;
	}

	const filteredConstraints = $derived(
		constraints.filter((/** @type {any} */ c) => {
			const query = searchQuery.toLowerCase();
			return (
				c.name.toLowerCase().includes(query) ||
				c.beschreibung?.toLowerCase().includes(query) ||
				c.kategorie?.toLowerCase().includes(query) ||
				c.schwierigkeit?.toLowerCase().includes(query)
			);
		})
	);

	const selectedAndFilteredConstraints = $derived(
		filteredConstraints.filter((/** @type {any} */ c) => selectedConstraints.includes(c.id))
	);
</script>

<svelte:head>
	<title>{$_('nav_constraints')} - TV Muttenz Volleyball</title>
	<meta name="description" content={$_('meta_constraints_desc')} />
</svelte:head>

<div class="constraints-page">
	<header class="page-header">
		<div class="header-content">
			<h1>{$_('nav_constraints')}</h1>
			<p>{$_('meta_constraints_desc')}</p>
		</div>
	</header>

	<TranslationFallbackBanner {lang} {isFallback} />

	{#if constraints.length === 0}
		<div class="empty-state">
			<p>{$_('msg_no_constraints_yet')}</p>
			<p class="hint">
				{$_('msg_constraints_can_be_added')} <code>src/content/constraints/</code> {$_('msg_can_be_added')}
			</p>
		</div>
	{:else}
		<!-- Suchfeld -->
		<div class="search-section print-hide">
			<div class="search-wrapper">
				<input
					type="text"
					placeholder={$_('form_search_constraints')}
					bind:value={searchQuery}
					class="search-input"
				/>
				{#if searchQuery}
					<button class="clear-search" onclick={() => (searchQuery = '')}>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
				<strong>{selectedAndFilteredConstraints.length}</strong> {$_('selection_of')}
				<strong>{filteredConstraints.length}</strong> {$_('selection_constraints_selected')}
			</div>
			<div class="button-group">
				<button class="btn btn-secondary" onclick={selectAll}>{$_('btn_select_all')}</button>
				<button class="btn btn-secondary" onclick={deselectAll}>{$_('btn_deselect_all')}</button>
				<button
					class="btn btn-primary"
					onclick={handlePrint}
					disabled={selectedAndFilteredConstraints.length === 0}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="6 9 6 2 18 2 18 9"></polyline>
						<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
						<rect x="6" y="14" width="12" height="8"></rect>
					</svg>
					{$_('btn_print')}
				</button>
			</div>
		</div>

		<!-- Constraints-Karten Grid -->
		<div class="constraints-grid print-hide">
			{#each filteredConstraints as constraint}
				<div class="constraint-card-wrapper">
					<div class="checkbox-wrapper" onclick={(e) => e.stopPropagation()}>
						<input
							type="checkbox"
							checked={selectedConstraints.includes(constraint.id)}
							onchange={() => toggleConstraint(constraint.id)}
							class="card-checkbox"
							id="checkbox-{constraint.id}"
						/>
						<label for="checkbox-{constraint.id}" class="checkbox-label"></label>
					</div>
					<div
						class="constraint-card"
						class:selected={selectedConstraints.includes(constraint.id)}
						onclick={(e) => handleCardClick(constraint.id, e)}
					>
						<div class="card-content">
							<h3>{constraint.name}</h3>
							<div class="card-badges">
								{#if constraint.kategorie}
									<span class="badge badge-category">{$_(getCategoryKey(constraint.kategorie))}</span>
								{/if}
								{#if constraint.schwierigkeit}
									<span class="badge badge-difficulty badge-difficulty--{constraint.schwierigkeit}">
										{$_(getDifficultyKey(constraint.schwierigkeit))}
									</span>
								{/if}
							</div>
							{#if constraint.beschreibung}
								<p class="beschreibung">{constraint.beschreibung}</p>
							{/if}
						</div>
						<div class="card-qr">
							<QRCode url={getAbsoluteURL(`/constraints/${constraint.id}`, lang)} size={72} />
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if filteredConstraints.length === 0}
			<div class="empty-state print-hide">
				<p>{$_('msg_no_constraints_found')} "{searchQuery}"</p>
			</div>
		{/if}

		<!-- Print-Bereich: Spielkarten-Layout -->
		<div class="print-cards">
			{#each selectedAndFilteredConstraints as constraint}
				<div class="card-wrapper">
					<div class="constraint-print-card">
						<div class="card-header">
							<h2 class="card-title">{constraint.name}</h2>
							<div class="card-badges-print">
								{#if constraint.kategorie}
									<span class="badge-print badge-category-print">{$_(getCategoryKey(constraint.kategorie))}</span>
								{/if}
								{#if constraint.schwierigkeit}
									<span class="badge-print badge-difficulty-print">{$_(getDifficultyKey(constraint.schwierigkeit))}</span>
								{/if}
							</div>
						</div>

						<div class="card-body">
							{#if constraint.beschreibung}
								<p class="card-description">{constraint.beschreibung}</p>
							{/if}
						</div>

					<div class="card-footer">
						<div class="qr-code-small">
							<QRCode url={getAbsoluteURL(`/constraints/${constraint.id}`, lang)} size={80} />
						</div>
						<p class="card-url">{getAbsoluteURL(`/constraints/${constraint.id}`, lang)}</p>
					</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.constraints-page {
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

	/* Constraints Grid */
	.constraints-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: var(--spacing-xl);
	}

	.constraint-card-wrapper {
		position: relative;
		display: flex;
		gap: 0;
	}

	.constraint-card {
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
		color: inherit;
		transition: all var(--transition-normal);
		cursor: pointer;
		position: relative;
		flex: 1;
	}

	.constraint-card:hover {
		border-color: var(--color-primary);
		border-width: 1px;
	}

	/* Checkbox Styling */
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

	.constraint-card-wrapper:hover .checkbox-wrapper {
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

	.constraint-card h3 {
		color: var(--color-primary);
		margin: 0 0 var(--spacing-xs) 0;
		font-size: var(--font-size-xl);
		line-height: 1.3;
	}

	.card-badges {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
		margin-bottom: var(--spacing-sm);
	}

	.badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 99px;
		font-size: var(--font-size-xs);
		font-weight: 600;
		line-height: 1.5;
	}

	.badge-category {
		background-color: rgba(255, 53, 0, 0.1);
		color: var(--color-primary);
		border: 1px solid rgba(255, 53, 0, 0.3);
	}

	.badge-difficulty--einfach {
		background-color: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.badge-difficulty--mittel {
		background-color: #fef9c3;
		color: #854d0e;
		border: 1px solid #fef08a;
	}

	.badge-difficulty--schwer {
		background-color: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.beschreibung {
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

	/* Druck-Karte: dicker roter Border zur Unterscheidung von Rollen-Karten */
	.constraint-print-card {
		width: 63mm;
		height: 88mm;
		border: 4px solid var(--color-primary);
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
		margin: 0 0 3px 0;
		line-height: 1.2;
	}

	.card-badges-print {
		display: flex;
		gap: 3px;
		flex-wrap: wrap;
	}

	.badge-print {
		display: inline-block;
		padding: 1px 5px;
		border-radius: 99px;
		font-size: 6.5pt;
		font-weight: 600;
		line-height: 1.5;
	}

	.badge-category-print {
		background-color: rgba(255, 53, 0, 0.12);
		color: var(--color-primary);
	}

	.badge-difficulty-print {
		background-color: #f3f4f6;
		color: #374151;
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
		line-height: 1.5;
	}

	.card-footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 2px;
		margin-top: 4px;
		padding-top: 4px;
		border-top: 1px solid var(--color-gray-200);
	}

	.card-url {
		font-size: 5pt;
		color: #aaaaaa;
		word-break: break-all;
		text-align: center;
		margin: 0;
		line-height: 1.2;
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
		.constraints-page {
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

		.constraints-grid {
			grid-template-columns: 1fr;
		}
	}

	/* Print Styles */
	@media print {
		.print-hide {
			display: none !important;
		}

		.constraints-page {
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

		.constraint-print-card {
			/* Roter Border bleibt im Druck erhalten */
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}

		.card-wrapper {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
