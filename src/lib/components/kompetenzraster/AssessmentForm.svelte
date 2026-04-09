<script>
	import { onMount } from 'svelte';
	import {
		createKompetenzId,
		saveAssessment,
		loadFocusKompetenzen,
		toggleFocus,
		getLatestAssessment,
		loadFremdeinschaetzung,
		saveFremdeinschaetzung,
		clearFremdeinschaetzung,
	} from '$lib/utils/kompetenzraster.js';

	/**
	 * @type {{
	 *   team: {
	 *     id: string,
	 *     name: string,
	 *     ziele: Array<{titel: string, beschreibung: string}>
	 *   },
	 *   onSaved?: () => void
	 * }}
	 */
	let { team, onSaved } = $props();

	/** @type {Record<string, number>} */
	let selbsteinschaetzung = $state({});
	/** @type {Record<string, number>} */
	let fremdeinschaetzungWerte = $state({});
	let notizen = $state('');
	/** @type {string[]} */
	let fokusKompetenzen = $state([]);
	/** @type {any} */
	let lastAssessment = $state(null);
	/** @type {any} */
	let savedFremdeinschaetzung = $state(null);
	let showFremdSection = $state(false);

	onMount(() => {
		fokusKompetenzen = loadFocusKompetenzen();
		lastAssessment = getLatestAssessment(team.id);
		savedFremdeinschaetzung = loadFremdeinschaetzung(team.id);

		// Initialisiere mit letzten Werten wenn vorhanden
		if (lastAssessment) {
			for (const bewertung of lastAssessment.bewertungen) {
				selbsteinschaetzung[bewertung.kompetenzId] = bewertung.wert;
			}
		}
	});

	/**
	 * @param {string} kompetenzId
	 */
	function handleFocusToggle(kompetenzId) {
		fokusKompetenzen = toggleFocus(kompetenzId);
	}

	function handleSaveSelbst() {
		const bewertungen = team.ziele.map((ziel) => {
			const kompetenzId = createKompetenzId(ziel.titel);
			return {
				kompetenzId,
				wert: selbsteinschaetzung[kompetenzId] || 3,
			};
		});

		const entry = {
			datum: new Date().toISOString(),
			teamId: team.id,
			bewertungen,
			notizen: notizen.trim() || undefined,
		};

		saveAssessment(entry);
		notizen = '';

		if (onSaved) onSaved();

		alert('Selbsteinschätzung gespeichert! ✅');
	}

	function handleSaveFremd() {
		const bewertungen = team.ziele.map((ziel) => {
			const kompetenzId = createKompetenzId(ziel.titel);
			return {
				kompetenzId,
				wert: fremdeinschaetzungWerte[kompetenzId] || 3,
			};
		});

		saveFremdeinschaetzung(team.id, bewertungen, new Date().toISOString());
		savedFremdeinschaetzung = loadFremdeinschaetzung(team.id);
		fremdeinschaetzungWerte = {};

		alert('Fremdeinschätzung gespeichert! (überschreibt vorherige) ✅');
	}

	function handleClearFremd() {
		if (confirm('Fremdeinschätzung wirklich löschen?')) {
			clearFremdeinschaetzung();
			savedFremdeinschaetzung = null;
		}
	}

	/**
	 * @param {number} value
	 */
	function getRatingLabel(value) {
		/** @type {Record<number, string>} */
		const labels = {
			1: 'Noch nicht',
			2: 'Teilweise',
			3: 'Meistens',
			4: 'Gut',
			5: 'Sehr gut',
		};
		return labels[value] || '';
	}

	/**
	 * @param {string} kompetenzId
	 */
	function getDiff(kompetenzId) {
		if (!savedFremdeinschaetzung?.bewertungen) return null;
		const fremd = savedFremdeinschaetzung.bewertungen.find(
			(/** @type {any} */ b) => b.kompetenzId === kompetenzId,
		);
		const selbst = selbsteinschaetzung[kompetenzId];
		if (!fremd || !selbst) return null;
		return fremd.wert - selbst;
	}
</script>

<div class="assessment-form">
	<header class="form-header">
		<h2>Kompetenzraster: {team.name}</h2>
		<p class="subtitle">Bewerte deine Kompetenzen nach dem heutigen Training</p>
	</header>

	{#if savedFremdeinschaetzung}
		<div class="fremd-info">
			<div class="fremd-header">
				<div>
					<strong>📋 Fremdeinschätzung vorhanden</strong>
					<span class="fremd-date">
						vom {new Date(savedFremdeinschaetzung.datum).toLocaleDateString('de-DE')}
					</span>
				</div>
				<button class="btn-delete" onclick={handleClearFremd}> 🗑️ Löschen </button>
			</div>
			<p class="fremd-hint">Die Differenz zur Fremdeinschätzung wird bei jeder Kompetenz angezeigt.</p>
		</div>
	{/if}

	<div class="kompetenzen-list">
		{#each team.ziele as ziel}
			{@const kompetenzId = createKompetenzId(ziel.titel)}
			{@const isFokus = fokusKompetenzen.includes(kompetenzId)}
			{@const diff = getDiff(kompetenzId)}

			<div class="kompetenz-item" class:fokus={isFokus}>
				<div class="kompetenz-header">
					<div class="title-row">
						<h3>{ziel.titel}</h3>
						<button
							class="focus-toggle"
							class:active={isFokus}
							onclick={() => handleFocusToggle(kompetenzId)}
							title={isFokus ? 'Aus Fokus entfernen' : 'Als Fokus markieren'}
						>
							{isFokus ? '⭐' : '☆'}
						</button>
					</div>
					<p class="beschreibung">{ziel.beschreibung}</p>
				</div>

				<div class="bewertung-section">
					<label class="bewertung-label">Selbsteinschätzung:</label>
					<div class="rating-group">
						{#each [1, 2, 3, 4, 5] as value}
							<label class="rating-option">
								<input
									type="radio"
									name="selbst-{kompetenzId}"
									{value}
									bind:group={selbsteinschaetzung[kompetenzId]}
								/>
								<span class="rating-circle" class:selected={selbsteinschaetzung[kompetenzId] === value}>
									{value}
								</span>
								<span class="rating-label">{getRatingLabel(value)}</span>
							</label>
						{/each}
					</div>

					{#if diff !== null}
						<div class="diff-badge" class:positive={diff > 0} class:negative={diff < 0}>
							{#if diff > 0}
								↑ Fremd +{diff}
							{:else if diff < 0}
								↓ Fremd {diff}
							{:else}
								= Übereinstimmung
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<div class="form-actions">
		<div class="notizen-section">
			<label for="notizen">Notizen (optional):</label>
			<textarea
				id="notizen"
				bind:value={notizen}
				placeholder="Gedanken zum Training, besondere Erkenntnisse..."
				rows="3"
			></textarea>
		</div>

		<div class="action-buttons">
			<button class="btn-primary" onclick={handleSaveSelbst}> Selbsteinschätzung speichern </button>
			<button class="btn-secondary" onclick={() => (showFremdSection = !showFremdSection)}>
				{showFremdSection ? 'Fremdeinschätzung ausblenden' : 'Fremdeinschätzung einfordern'}
			</button>
		</div>
	</div>

	<!-- Separate Fremdeinschätzungs-Sektion -->
	{#if showFremdSection}
		<div class="fremd-section">
		<header class="fremd-section-header">
			<h3>Fremdeinschätzung abgeben</h3>
			<p class="hint">
				Eine andere Person kann hier unabhängig eine Einschätzung abgeben. Die Selbsteinschätzung
				ist nicht sichtbar, um Ankereffekte zu vermeiden.
			</p>
		</header>

		<div class="fremd-kompetenzen-list">
			{#each team.ziele as ziel}
				{@const kompetenzId = createKompetenzId(ziel.titel)}

				<div class="fremd-kompetenz-item">
					<div class="kompetenz-info">
						<h4>{ziel.titel}</h4>
						<p class="beschreibung">{ziel.beschreibung}</p>
					</div>

					<div class="fremd-rating-group">
						{#each [1, 2, 3, 4, 5] as value}
							<label class="rating-option">
								<input
									type="radio"
									name="fremd-{kompetenzId}"
									{value}
									bind:group={fremdeinschaetzungWerte[kompetenzId]}
								/>
								<span
									class="rating-circle fremd-circle"
									class:selected={fremdeinschaetzungWerte[kompetenzId] === value}
								>
									{value}
								</span>
								<span class="rating-label">{getRatingLabel(value)}</span>
							</label>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="fremd-actions">
			<button class="btn-primary" onclick={handleSaveFremd}> Fremdeinschätzung speichern </button>
		</div>
	</div>
	{/if}
</div>

<style>
	.assessment-form {
		max-width: 1000px;
		margin: 0 auto;
	}

	.form-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.form-header h2 {
		color: var(--color-primary);
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
	}

	.fremd-info {
		background: #fff3e0;
		border: 2px solid #ff9800;
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin-bottom: var(--space-2xl);
	}

	.fremd-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
		gap: var(--space-md);
	}

	.fremd-date {
		margin-left: var(--space-sm);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.fremd-hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.btn-delete {
		background: #f44336;
		color: white;
		border: none;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		transition: all var(--transition-fast);
	}

	.btn-delete:hover {
		background: #d32f2f;
		transform: scale(1.05);
	}

	.kompetenzen-list,
	.fremd-kompetenzen-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.kompetenz-item,
	.fremd-kompetenz-item {
		background: var(--color-background-elevated);
		border: 2px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		transition: all var(--transition-normal);
	}

	.kompetenz-item.fokus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(255, 53, 0, 0.1);
	}

	.kompetenz-header,
	.kompetenz-info {
		margin-bottom: var(--space-lg);
	}

	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
	}

	.kompetenz-item h3,
	.fremd-kompetenz-item h4 {
		margin: 0;
		color: var(--color-secondary);
		font-size: var(--font-size-xl);
	}

	.focus-toggle {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		opacity: 0.3;
		transition: opacity var(--transition-fast);
		padding: var(--space-xs);
	}

	.focus-toggle:hover,
	.focus-toggle.active {
		opacity: 1;
	}

	.beschreibung {
		margin: var(--space-sm) 0 0 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.bewertung-section {
		position: relative;
	}

	.bewertung-label {
		display: block;
		font-weight: var(--font-weight-medium);
		margin-bottom: var(--space-sm);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.rating-group,
	.fremd-rating-group {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.rating-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		cursor: pointer;
	}

	.rating-option input {
		display: none;
	}

	.rating-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 2px solid var(--color-gray-300);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-weight-bold);
		transition: all var(--transition-fast);
		background: var(--color-background);
	}

	.rating-circle:hover {
		border-color: var(--color-primary);
		transform: scale(1.1);
	}

	.rating-circle.selected {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
		transform: scale(1.15);
	}

	.rating-circle.fremd-circle.selected {
		background: var(--color-secondary);
		border-color: var(--color-secondary);
	}

	.rating-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-align: center;
	}

	.diff-badge {
		margin-top: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		display: inline-block;
	}

	.diff-badge.positive {
		background: #e8f5e9;
		color: #2e7d32;
	}

	.diff-badge.negative {
		background: #ffebee;
		color: #c62828;
	}

	.form-actions,
	.fremd-actions {
		margin-top: var(--space-2xl);
		padding-top: var(--space-xl);
		border-top: 2px solid var(--color-gray-200);
	}

	.notizen-section {
		margin-bottom: var(--space-xl);
	}

	.notizen-section label {
		display: block;
		font-weight: var(--font-weight-medium);
		margin-bottom: var(--space-sm);
	}

	.notizen-section textarea {
		width: 100%;
		padding: var(--space-md);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: var(--font-size-base);
		resize: vertical;
	}

	.action-buttons {
		display: flex;
		gap: var(--space-md);
		justify-content: flex-end;
		flex-wrap: wrap;
	}

	.btn-primary {
		padding: var(--space-sm) var(--space-xl);
		border-radius: var(--radius-md);
		font-weight: var(--font-weight-medium);
		border: none;
		cursor: pointer;
		transition: all var(--transition-fast);
		font-size: var(--font-size-base);
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.btn-secondary {
		padding: var(--space-sm) var(--space-xl);
		border-radius: var(--radius-md);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
		font-size: var(--font-size-base);
		background: var(--color-background-elevated);
		border: 2px solid var(--color-gray-300);
		color: var(--color-text);
	}

	.btn-secondary:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* Fremdeinschätzungs-Sektion */
	.fremd-section {
		margin-top: var(--space-3xl);
		padding: var(--space-2xl);
		background: var(--color-gray-50);
		border-radius: var(--radius-xl);
		border: 2px dashed var(--color-gray-300);
	}

	.fremd-section-header {
		margin-bottom: var(--space-2xl);
	}

	.fremd-section-header h3 {
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-secondary);
	}

	.hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		font-style: italic;
	}

	.fremd-kompetenzen-list {
		margin-bottom: var(--space-xl);
	}

	.fremd-kompetenz-item {
		background: white;
	}

	@media (max-width: 768px) {
		.rating-group,
		.fremd-rating-group {
			gap: var(--space-sm);
		}

		.rating-circle {
			width: 35px;
			height: 35px;
		}

		.action-buttons {
			flex-direction: column;
		}

		.btn-primary {
			width: 100%;
		}

		.fremd-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
