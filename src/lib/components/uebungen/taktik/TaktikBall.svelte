<script>
	/**
	 * Ball-Token auf dem Taktikboard.
	 */

	/**
	 * @type {{
	 *   x: number,
	 *   y: number,
	 *   fieldWidth: number,
	 *   fieldHeight: number,
	 *   radius?: number
	 * }}
	 */
	let { x, y, fieldWidth, fieldHeight, radius = 13 } = $props();

	const cx = $derived(x * fieldWidth);
	const cy = $derived(y * fieldHeight);
</script>

<g class="taktik-ball" role="presentation">
	<!-- Schatten -->
	<circle cx={cx + 1} cy={cy + 2} r={radius} fill="rgba(0,0,0,0.3)" />
	<!-- Ball-Kreis -->
	<circle
		cx={cx}
		cy={cy}
		r={radius}
		fill="#F5F5F5"
		stroke="#555"
		stroke-width="2"
	/>
	<!-- Ball-Linien (angedeutete Naht) -->
	<path
		d="M {cx - radius * 0.6} {cy - radius * 0.4}
		   Q {cx} {cy - radius * 0.8} {cx + radius * 0.6} {cy - radius * 0.4}"
		fill="none"
		stroke="#888"
		stroke-width="1.2"
	/>
	<path
		d="M {cx - radius * 0.6} {cy + radius * 0.4}
		   Q {cx} {cy + radius * 0.8} {cx + radius * 0.6} {cy + radius * 0.4}"
		fill="none"
		stroke="#888"
		stroke-width="1.2"
	/>
</g>
