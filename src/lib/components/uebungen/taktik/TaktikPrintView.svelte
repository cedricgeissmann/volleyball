<script>
	/**
	 * Druckansicht: Alle Lauf- und Ballwege auf einem Board überlagert.
	 * Spieler in Startposition. Pfeile nummeriert nach Schritt-Reihenfolge.
	 */
	import TaktikBoard from './TaktikBoard.svelte';
	import { generatePrintArrows, getStartPositions } from '$lib/utils/taktikEngine.js';

	/** @typedef {import('$lib/utils/taktikEngine.js').TaktikAnimation} TaktikAnimation */

	/** @type {{ animation: TaktikAnimation, titel?: string, beschreibung?: string, anleitung?: string[] }} */
	let { animation, titel, beschreibung, anleitung } = $props();

	const startPositions = $derived(getStartPositions(animation));
	const printArrows = $derived(generatePrintArrows(animation, animation.objects));
</script>

<div class="print-view">
	<div class="print-header">
		{#if titel}
			<h2 class="print-titel">{titel}</h2>
		{/if}
		{#if beschreibung}
			<p class="print-beschreibung">{beschreibung}</p>
		{/if}
	</div>

	<div class="print-content">
		<!-- Board mit allen Wegen überlagert -->
		<div class="print-board">
			<TaktikBoard
				{animation}
				positions={startPositions}
				arrows={printArrows}
				showNumbersOnArrows={true}
				maxWidth={480}
			/>
			<p class="print-board-caption">Startaufstellung · Alle Wege überlagert · Zahlen = Reihenfolge</p>
		</div>

		<!-- Anleitung -->
		{#if anleitung && anleitung.length > 0}
			<div class="print-anleitung">
				<h3>Anleitung</h3>
				<ol>
					{#each anleitung as schritt, i}
						<li>{schritt}</li>
					{/each}
				</ol>
			</div>
		{/if}

		<!-- Legende kompakt -->
		<div class="print-legend">
			<div class="legend-col">
				<strong>Laufwege</strong>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#1565C0" stroke-width="4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#1565C0" /></svg>
					<span>Sprint</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#1E88E5" stroke-width="3" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#1E88E5" /></svg>
					<span>Lauf</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#90CAF9" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#90CAF9" /></svg>
					<span>Schritt</span>
				</div>
			</div>
			<div class="legend-col">
				<strong>Ballwege</strong>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#D32F2F" stroke-width="4" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#D32F2F" /></svg>
					<span>Angriff</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#E64A19" stroke-width="3" stroke-dasharray="5,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#E64A19" /></svg>
					<span>Finte</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#F57C00" stroke-width="3" stroke-dasharray="11,5" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#F57C00" /></svg>
					<span>Downball</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#2E7D32" stroke-width="3" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#2E7D32" /></svg>
					<span>Pass</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#558B2F" stroke-width="3" stroke-dasharray="3,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#558B2F" /></svg>
					<span>Gratisball</span>
				</div>
				<div class="legend-row">
					<svg width="28" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#6A1B9A" stroke-width="3" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#6A1B9A" /></svg>
					<span>Aufschlag</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.print-view {
		width: 100%;
		font-family: var(--font-family-base);
	}

	.print-header {
		margin-bottom: var(--space-sm);
	}

	.print-titel {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--space-xs);
	}

	.print-beschreibung {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.print-content {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: var(--space-md);
		align-items: start;
	}

	.print-board {
		grid-column: 1;
		grid-row: 1 / 3;
	}

	.print-board-caption {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-align: center;
		margin-top: var(--space-xs);
	}

	.print-anleitung {
		grid-column: 2;
		grid-row: 1;
		min-width: 160px;
		max-width: 200px;
	}

	.print-anleitung h3 {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		margin: 0 0 var(--space-xs);
	}

	.print-anleitung ol {
		padding-left: var(--space-md);
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.print-anleitung li {
		margin-bottom: 2px;
	}

	.print-legend {
		grid-column: 2;
		grid-row: 2;
		display: flex;
		gap: var(--space-md);
		align-items: flex-start;
	}

	.legend-col {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 11px;
	}

	.legend-col strong {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
		margin-bottom: 2px;
	}

	.legend-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	/* Druckstile */
	@media print {
		.print-titel {
			font-size: 14pt;
		}

		.print-beschreibung {
			font-size: 9pt;
		}

		.print-legend {
			font-size: 8pt;
		}

		.print-anleitung ol {
			font-size: 8pt;
		}
	}
</style>
