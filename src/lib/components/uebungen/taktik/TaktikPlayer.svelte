<script>
	/**
	 * Spieler-Token auf dem Taktikboard.
	 * Erhält normalisierte Koordinaten (0-1) und SVG-Feld-Dimensionen.
	 */

	/**
	 * @type {{
	 *   x: number,
	 *   y: number,
	 *   label?: string,
	 *   team?: 'home' | 'away',
	 *   fieldWidth: number,
	 *   fieldHeight: number,
	 *   radius?: number,
	 *   highlighted?: boolean
	 * }}
	 */
	let {
		x,
		y,
		label = '?',
		team = 'home',
		fieldWidth,
		fieldHeight,
		radius = 18,
		highlighted = false,
	} = $props();

	// Normalisierte → SVG-Koordinaten
	const cx = $derived(x * fieldWidth);
	const cy = $derived(y * fieldHeight);

	// Farben je nach Team
	const fillColor = $derived(team === 'home' ? '#1565C0' : '#C62828');
	const strokeColor = $derived(highlighted ? '#FFD600' : 'white');
	const strokeWidth = $derived(highlighted ? 3 : 2);
</script>

<g class="taktik-player" role="presentation">
	<!-- Schatten -->
	<circle
		cx={cx + 1}
		cy={cy + 2}
		r={radius}
		fill="rgba(0,0,0,0.25)"
	/>
	<!-- Haupt-Kreis -->
	<circle
		cx={cx}
		cy={cy}
		r={radius}
		fill={fillColor}
		stroke={strokeColor}
		stroke-width={strokeWidth}
	/>
	<!-- Label -->
	<text
		x={cx}
		y={cy}
		text-anchor="middle"
		dominant-baseline="central"
		fill="white"
		font-size={label.length > 1 ? radius * 0.85 : radius}
		font-weight="bold"
		font-family="sans-serif"
		pointer-events="none"
	>{label}</text>
</g>
