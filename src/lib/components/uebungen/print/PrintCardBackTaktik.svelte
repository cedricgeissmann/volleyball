<script>
	/**
	 * Rückseite einer Taktik-Spielkarte (63mm × 88mm).
	 * Zeigt das TaktikBoard mit allen überlagerten Pfeilen, herunterskaliert.
	 * Analog zu PrintCardBackKraft, aber mit TaktikBoard statt Stickfigur-Snapshots.
	 *
	 * Halbfeld (1:1): Breite = Kartenhöhe → passt problemlos.
	 * Ganzfeld (1:2): Höhe = doppelte Breite → maxWidth auf halbe Kartenhöhe begrenzen,
	 *   damit das Board vertikal in die 84mm (88mm - 4mm Padding) passt.
	 *
	 * Kartenmaße:  63mm × 88mm, 2mm Padding → nutzbarer Bereich: 59mm × 84mm
	 * Ganzfeld:    aspect 1:2  → maxWidth = 84mm / 2 = 42mm → in px ≈ 159px (@96dpi)
	 * Halbfeld:    aspect 1:1  → maxWidth = min(59mm, 84mm) = 59mm → in px ≈ 223px
	 */
	import TaktikBoard from '$lib/components/uebungen/taktik/TaktikBoard.svelte';
	import { generatePrintArrows, getStartPositions } from '$lib/utils/taktikEngine.js';

	/** @type {{ animation: import('$lib/utils/taktikEngine.js').TaktikAnimation }} */
	let { animation } = $props();

	const startPositions = $derived(getStartPositions(animation));
	const printArrows = $derived(generatePrintArrows(animation, animation.objects));

	// Ganzfeld hat aspect-ratio 1:2 → bei 84mm Höhe max 42mm breit
	// Halbfeld hat aspect-ratio 1:1 → bei 84mm Höhe max 59mm breit (Kartenbreite limitiert)
	// Werte in px (1mm ≈ 3.7795px bei 96dpi)
	const isHalf = $derived(animation.court === 'volleyball-half');
	const maxWidth = $derived(isHalf ? 223 : 159);
</script>

<div class="print-card-back-taktik" class:is-full={!isHalf}>
	<TaktikBoard
		{animation}
		positions={startPositions}
		arrows={printArrows}
		showNumbersOnArrows={true}
		showCourtLabels={false}
		showZoneLabels={false}
		{maxWidth}
	/>
</div>

<style>
	.print-card-back-taktik {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		box-sizing: border-box;
		padding: 2mm;
		overflow: hidden;
	}

	/*
	 * Halbfeld (1:1): Board-Wrapper nimmt die volle Breite → passt in die Höhe.
	 * Kein Überschreiben nötig.
	 */

	/*
	 * Ganzfeld (1:2): SVG wäre doppelt so hoch wie breit.
	 * Lösung: max-height auf den nutzbaren Bereich (84mm) setzen,
	 * width: auto damit das SVG sich proportional anpasst.
	 */
	.is-full :global(.taktik-board-wrapper) {
		max-width: none !important;
		width: auto !important;
		max-height: 84mm;
	}

	.is-full :global(.taktik-board-svg) {
		height: 84mm;
		width: auto !important;
		aspect-ratio: unset;
	}

	@media print {
		.print-card-back-taktik {
			break-inside: avoid;
		}
	}
</style>
