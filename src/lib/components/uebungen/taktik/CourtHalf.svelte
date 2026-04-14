<script>
	/**
	 * Halbes Volleyball-Feld (9m × 9m)
	 * Koordinaten: viewBox 0 0 540 540 (60px pro Meter)
	 * Netz bei y=0, Grundlinie bei y=540
	 * 3m-Linie bei y=180
	 */

	/** @type {{ showLabels?: boolean }} */
	let { showLabels = true } = $props();
</script>

<!-- Halbes Volleyballfeld, Netz oben -->
<g class="court-half">
	<!-- Feldhintergrund -->
	<rect x="0" y="0" width="540" height="540" fill="#c8e6a0" rx="2" />

	<!-- Angriffszone (hellere Farbe, 3m von Netz) -->
	<rect x="0" y="0" width="540" height="180" fill="#b8d990" />

	<!-- Außenlinien -->
	<rect x="0" y="0" width="540" height="540" fill="none" stroke="white" stroke-width="3" />

	<!-- 3m-Angriffslinie -->
	<line x1="0" y1="180" x2="540" y2="180" stroke="white" stroke-width="3" />

	<!-- Mittellinie (Netz-Position) -->
	<line x1="0" y1="0" x2="540" y2="0" stroke="#333" stroke-width="6" />

	<!-- Netz-Darstellung (oben) -->
	<rect x="0" y="-6" width="540" height="6" fill="#555" rx="1" />
	<!-- Netzpfosten -->
	<line x1="-6" y1="-20" x2="-6" y2="4" stroke="#555" stroke-width="4" stroke-linecap="round" />
	<line x1="546" y1="-20" x2="546" y2="4" stroke="#555" stroke-width="4" stroke-linecap="round" />
	<!-- Netzmuster -->
	{#each Array(9) as _, i}
		<line
			x1={i * 60}
			y1="-6"
			x2={i * 60}
			y2="0"
			stroke="#777"
			stroke-width="1.5"
		/>
	{/each}

	<!-- Mittellinie vertikal (nur gestrichelt angedeutet) -->
	<line
		x1="270" y1="180" x2="270" y2="540"
		stroke="white" stroke-width="1.5" stroke-dasharray="8,6" opacity="0.5"
	/>

	<!-- Zonen-Labels -->
	{#if showLabels}
		<text x="270" y="100" text-anchor="middle" fill="white" font-size="13" opacity="0.7" font-family="sans-serif">Angriffszone</text>
		<text x="270" y="380" text-anchor="middle" fill="white" font-size="13" opacity="0.7" font-family="sans-serif">Verteidigungszone</text>
	{/if}
</g>
