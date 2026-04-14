<script>
	/**
	 * Farbige Zone/Bereich auf dem Taktikboard.
	 */

	/**
	 * @type {{
	 *   x: number,
	 *   y: number,
	 *   width: number,
	 *   height: number,
	 *   color: string,
	 *   label?: string,
	 *   fieldWidth: number,
	 *   fieldHeight: number
	 * }}
	 */
	let { x, y, width, height, color, label, fieldWidth, fieldHeight } = $props();

	const rx = $derived(x * fieldWidth);
	const ry = $derived(y * fieldHeight);
	const rw = $derived(width * fieldWidth);
	const rh = $derived(height * fieldHeight);
</script>

<g class="taktik-zone" role="presentation">
	<rect
		x={rx}
		y={ry}
		width={rw}
		height={rh}
		fill={color}
		stroke={color.substring(0, 7)}
		stroke-width="1.5"
		stroke-opacity="0.5"
	/>
	{#if label}
		<text
			x={rx + rw / 2}
			y={ry + rh / 2}
			text-anchor="middle"
			dominant-baseline="central"
			fill={color.substring(0, 7)}
			font-size="12"
			font-weight="bold"
			font-family="sans-serif"
			opacity="0.8"
		>{label}</text>
	{/if}
</g>
