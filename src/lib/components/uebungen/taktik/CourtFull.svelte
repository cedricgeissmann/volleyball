<script>
	/**
	 * Ganzes Volleyball-Feld (18m × 9m)
	 * Koordinaten: viewBox 0 0 540 1080 (60px pro Meter)
	 * Netz bei y=540, Grundlinien bei y=0 und y=1080
	 * 3m-Linien bei y=180 und y=900
	 */

	/** @type {{ showLabels?: boolean }} */
	let { showLabels = true } = $props();
</script>

<!-- Ganzes Volleyballfeld, Netz in der Mitte -->
<g class="court-full">
	<!-- Feldhintergründe -->
	<rect x="0" y="0" width="540" height="1080" fill="#c8e6a0" rx="2" />

	<!-- Angriffszonen (3m von Netz) -->
	<rect x="0" y="360" width="540" height="180" fill="#b8d990" />
	<rect x="0" y="540" width="540" height="180" fill="#b8d990" />

	<!-- Außenlinien -->
	<rect x="0" y="0" width="540" height="1080" fill="none" stroke="white" stroke-width="3" />

	<!-- 3m-Angriffslinien -->
	<line x1="0" y1="360" x2="540" y2="360" stroke="white" stroke-width="3" />
	<line x1="0" y1="720" x2="540" y2="720" stroke="white" stroke-width="3" />

	<!-- Mittellinie -->
	<line x1="0" y1="540" x2="540" y2="540" stroke="#333" stroke-width="3" />

	<!-- Netz -->
	<rect x="0" y="534" width="540" height="12" fill="#555" rx="1" />
	<!-- Netzpfosten -->
	<line x1="-6" y1="516" x2="-6" y2="558" stroke="#555" stroke-width="4" stroke-linecap="round" />
	<line x1="546" y1="516" x2="546" y2="558" stroke="#555" stroke-width="4" stroke-linecap="round" />
	<!-- Netzmuster (vertikale Linien) -->
	{#each Array(9) as _, i}
		<line
			x1={i * 60}
			y1="534"
			x2={i * 60}
			y2="546"
			stroke="#777"
			stroke-width="1.5"
		/>
	{/each}

	<!-- Mittellinien vertikal (angedeutet) -->
	<line
		x1="270" y1="0" x2="270" y2="360"
		stroke="white" stroke-width="1.5" stroke-dasharray="8,6" opacity="0.5"
	/>
	<line
		x1="270" y1="720" x2="270" y2="1080"
		stroke="white" stroke-width="1.5" stroke-dasharray="8,6" opacity="0.5"
	/>

	<!-- Feld-Labels -->
	{#if showLabels}
		<text x="270" y="270" text-anchor="middle" fill="white" font-size="14" opacity="0.7" font-family="sans-serif">Angriff (Gäste)</text>
		<text x="270" y="810" text-anchor="middle" fill="white" font-size="14" opacity="0.7" font-family="sans-serif">Angriff (Heim)</text>
	{/if}
</g>
