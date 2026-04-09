<script>
	import { onMount } from 'svelte';
	import {
		loadAssessmentHistory,
		clearAssessmentHistory,
		calculateChanges,
		exportHistory,
		loadFocusKompetenzen,
	} from '$lib/utils/kompetenzraster.js';

	/**
	 * @type {{
	 *   team: {
	 *     id: string,
	 *     name: string,
	 *     ziele: Array<{titel: string, beschreibung: string}>
	 *   }
	 * }}
	 */
	let { team } = $props();

	/** @type {any[]} */
	let history = $state([]);
	/** @type {Map<string, number>} */
	let changes = $state(new Map());
	/** @type {string[]} */
	let fokusKompetenzen = $state([]);

	onMount(() => {
		loadHistory();
		fokusKompetenzen = loadFocusKompetenzen();
	});

	function loadHistory() {
		const allHistory = loadAssessmentHistory();
		history = allHistory.filter((/** @type {any} */ entry) => entry.teamId === team.id);
		changes = calculateChanges(team.id);
	}

	function handleClear() {
		if (confirm('Möchtest du wirklich die gesamte History löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
			clearAssessmentHistory();
			loadHistory();
		}
	}

	function handleExport() {
		exportHistory();
	}

	/**
	 * @param {string} kompetenzId
	 */
	function getKompetenzTitel(kompetenzId) {
		const ziel = team.ziele.find((/** @type {any} */ z) => {
			const id = z.titel
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
			return id === kompetenzId;
		});
		return ziel?.titel || kompetenzId;
	}

	/**
	 * @param {number} change
	 */
	function getChangeIcon(change) {
		if (change > 0) return '↑';
		if (change < 0) return '↓';
		return '→';
	}

	/**
	 * @param {number} change
	 */
	function getChangeClass(change) {
		if (change > 0) return 'positive';
		if (change < 0) return 'negative';
		return 'neutral';
	}
</script>

<div class="history-view">
	<header class="history-header">
		<h2>Meine Entwicklung: {team.name}</h2>
		<div class="header-actions">
			<button class="btn-secondary" onclick={handleExport}> Export </button>
			<button class="btn-danger" onclick={handleClear}> History löschen </button>
		</div>
	</header>

	{#if history.length === 0}
		<div class="empty-state">
			<p>Noch keine Assessments vorhanden.</p>
			<p class="subtitle">Fülle das Kompetenzraster nach dem Training aus, um deine Entwicklung zu verfolgen.</p>
		</div>
	{:else}
		<div class="stats-overview">
			<div class="stat-card">
				<div class="stat-value">{history.length}</div>
				<div class="stat-label">Assessments</div>
			</div>

			{#if changes.size > 0}
				{@const positiveChanges = Array.from(changes.values()).filter((/** @type {number} */ c) => c > 0).length}
				{@const negativeChanges = Array.from(changes.values()).filter((/** @type {number} */ c) => c < 0).length}

				<div class="stat-card positive">
					<div class="stat-value">↑ {positiveChanges}</div>
					<div class="stat-label">Verbesserungen</div>
				</div>

				{#if negativeChanges > 0}
					<div class="stat-card negative">
						<div class="stat-value">↓ {negativeChanges}</div>
						<div class="stat-label">Verschlechterungen</div>
					</div>
				{/if}
			{/if}
		</div>

		{#if changes.size > 0}
			<section class="changes-section">
				<h3>Veränderung seit letztem Assessment</h3>
				<div class="changes-grid">
					{#each Array.from(changes.entries()) as [kompetenzId, change]}
						{@const isFokus = fokusKompetenzen.includes(kompetenzId)}
						<div class="change-item {getChangeClass(change)}" class:fokus={isFokus}>
							<span class="change-icon">{getChangeIcon(change)}</span>
							<span class="change-title">
								{getKompetenzTitel(kompetenzId)}
								{#if isFokus}<span class="fokus-badge">⭐</span>{/if}
							</span>
							<span class="change-value">
								{change > 0 ? '+' : ''}{change}
							</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<section class="timeline-section">
			<h3>Timeline</h3>
			<div class="timeline">
				{#each [...history].reverse() as entry}
					<div class="timeline-entry">
						<div class="entry-date">
							{new Date(entry.datum).toLocaleDateString('de-DE', { 
								day: '2-digit',
								month: '2-digit',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})}
						</div>

						{#if entry.notizen}
							<div class="entry-notizen">
								<strong>Notizen:</strong> {entry.notizen}
							</div>
						{/if}

						<details class="entry-details">
							<summary>Bewertungen ansehen ({entry.bewertungen.length})</summary>
							<div class="bewertungen-grid">
								{#each entry.bewertungen as bewertung}
									<div class="bewertung-item">
										<span class="bewertung-title">{getKompetenzTitel(bewertung.kompetenzId)}</span>
										<span class="bewertung-value">{bewertung.wert}/5</span>
									</div>
								{/each}
							</div>
						</details>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.history-view {
		max-width: 1000px;
		margin: 0 auto;
	}

	.history-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2xl);
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.history-header h2 {
		color: var(--color-primary);
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: var(--space-md);
	}

	.empty-state {
		text-align: center;
		padding: var(--space-3xl);
		background: var(--color-background-elevated);
		border-radius: var(--radius-lg);
		border: 2px dashed var(--color-gray-300);
	}

	.empty-state .subtitle {
		color: var(--color-text-secondary);
		margin-top: var(--space-md);
	}

	.stats-overview {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-lg);
		margin-bottom: var(--space-2xl);
	}

	.stat-card {
		background: var(--color-background-elevated);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		text-align: center;
		border: 2px solid var(--color-gray-200);
	}

	.stat-card.positive {
		border-color: #4caf50;
		background: #e8f5e9;
	}

	.stat-card.negative {
		border-color: #f44336;
		background: #ffebee;
	}

	.stat-value {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.stat-card.positive .stat-value {
		color: #2e7d32;
	}

	.stat-card.negative .stat-value {
		color: #c62828;
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
	}

	.changes-section,
	.timeline-section {
		margin-bottom: var(--space-2xl);
	}

	.changes-section h3,
	.timeline-section h3 {
		margin-bottom: var(--space-lg);
		color: var(--color-secondary);
	}

	.changes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--space-md);
	}

	.change-item {
		background: var(--color-background-elevated);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		border-left: 4px solid var(--color-gray-300);
	}

	.change-item.positive {
		border-left-color: #4caf50;
	}

	.change-item.negative {
		border-left-color: #f44336;
	}

	.change-item.fokus {
		box-shadow: 0 0 0 2px rgba(255, 53, 0, 0.2);
	}

	.change-icon {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
	}

	.change-item.positive .change-icon {
		color: #2e7d32;
	}

	.change-item.negative .change-icon {
		color: #c62828;
	}

	.change-title {
		flex: 1;
		font-size: var(--font-size-sm);
	}

	.fokus-badge {
		margin-left: var(--space-xs);
	}

	.change-value {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-lg);
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.timeline-entry {
		background: var(--color-background-elevated);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border-left: 4px solid var(--color-primary);
	}

	.entry-date {
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
		margin-bottom: var(--space-sm);
	}

	.entry-notizen {
		margin-bottom: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-gray-50);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
	}

	.entry-details summary {
		cursor: pointer;
		font-weight: var(--font-weight-medium);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.entry-details summary:hover {
		background: var(--color-gray-50);
	}

	.bewertungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-sm);
		margin-top: var(--space-md);
		padding: var(--space-md);
		background: var(--color-gray-50);
		border-radius: var(--radius-md);
	}

	.bewertung-item {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
	}

	.bewertung-title {
		color: var(--color-text-secondary);
	}

	.bewertung-value {
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.btn-secondary,
	.btn-danger {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-weight-medium);
		border: none;
		cursor: pointer;
		transition: all var(--transition-fast);
		font-size: var(--font-size-sm);
	}

	.btn-secondary {
		background: var(--color-background-elevated);
		border: 2px solid var(--color-gray-300);
		color: var(--color-text);
	}

	.btn-secondary:hover {
		border-color: var(--color-primary);
	}

	.btn-danger {
		background: #f44336;
		color: white;
	}

	.btn-danger:hover {
		background: #d32f2f;
	}

	@media (max-width: 768px) {
		.history-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
		}

		.btn-secondary,
		.btn-danger {
			flex: 1;
		}

		.changes-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
