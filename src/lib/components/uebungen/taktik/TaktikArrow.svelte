<script>
	/**
	 * Bewegungspfeil auf dem Taktikboard.
	 * Laufwege: solid, Ballwege: gestrichelt.
	 * Farbe und Strichstärke kommunizieren Bewegungstyp.
	 */
	import { getArrowStyle } from '$lib/utils/taktikEngine.js';

	/**
	 * @type {{
	 *   x1: number,
	 *   y1: number,
	 *   x2: number,
	 *   y2: number,
	 *   moveType: string,
	 *   objectType: string,
	 *   fieldWidth: number,
	 *   fieldHeight: number,
	 *   arrowIndex?: number,
	 *   showNumber?: boolean,
	 *   playerRadius?: number
	 * }}
	 */
	let {
		x1, y1, x2, y2,
		moveType,
		objectType,
		fieldWidth,
		fieldHeight,
		arrowIndex,
		showNumber = false,
		playerRadius = 18,
	} = $props();

	const style = $derived(getArrowStyle(moveType, objectType));

	// SVG-Koordinaten
	const sx = $derived(x1 * fieldWidth);
	const sy = $derived(y1 * fieldHeight);
	const ex = $derived(x2 * fieldWidth);
	const ey = $derived(y2 * fieldHeight);

	// Vektor-Berechnung für Pfeilspitze: Start vom Objekt-Rand
	const dx = $derived(ex - sx);
	const dy = $derived(ey - sy);
	const len = $derived(Math.sqrt(dx * dx + dy * dy));
	const ux = $derived(len > 0 ? dx / len : 0);
	const uy = $derived(len > 0 ? dy / len : 0);

	// Startpunkt: leicht vom Spieler-Rand wegversetzt
	const startOffset = $derived(objectType === 'ball' ? 13 : playerRadius + 2);
	const endOffset = $derived(objectType === 'ball' ? 13 : playerRadius + 2);

	const lx1 = $derived(sx + ux * startOffset);
	const ly1 = $derived(sy + uy * startOffset);
	const lx2 = $derived(ex - ux * endOffset);
	const ly2 = $derived(ey - uy * endOffset);

	// Pfeilspitze
	const arrowSize = $derived(style.width * 3.5);
	const perpX = $derived(-uy * arrowSize * 0.5);
	const perpY = $derived(ux * arrowSize * 0.5);
	const arrowBaseX = $derived(lx2 - ux * arrowSize);
	const arrowBaseY = $derived(ly2 - uy * arrowSize);

	// Mittelpunkt für Nummern-Label
	const midX = $derived((lx1 + lx2) / 2);
	const midY = $derived((ly1 + ly2) / 2);

	// dasharray: "none" → kein Dash, sonst den Wert nehmen
	const dashArray = $derived(style.dashArray === 'none' ? undefined : style.dashArray);
</script>

<g class="taktik-arrow" role="presentation">
	<!-- Linie -->
	<line
		x1={lx1} y1={ly1}
		x2={arrowBaseX} y2={arrowBaseY}
		stroke={style.color}
		stroke-width={style.width}
		stroke-dasharray={dashArray}
		stroke-linecap="round"
		opacity="0.9"
	/>
	<!-- Pfeilspitze (gefülltes Dreieck) -->
	{#if len > startOffset + endOffset + 5}
		<polygon
			points="{lx2},{ly2} {arrowBaseX + perpX},{arrowBaseY + perpY} {arrowBaseX - perpX},{arrowBaseY - perpY}"
			fill={style.color}
			opacity="0.9"
		/>
	{/if}
	<!-- Schritt-Nummer (für Druckansicht) -->
	{#if showNumber && arrowIndex !== undefined}
		<circle cx={midX} cy={midY} r="9" fill={style.color} opacity="0.9" />
		<text
			x={midX}
			y={midY}
			text-anchor="middle"
			dominant-baseline="central"
			fill="white"
			font-size="10"
			font-weight="bold"
			font-family="sans-serif"
		>{arrowIndex}</text>
	{/if}
</g>
