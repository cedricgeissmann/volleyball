<script>
	/**
	 * Annahme-Szenarien im 2-Meter-Radius — Draufsicht
	 *
	 * Zeigt vier typische Bälle und die dazugehörige x-Geschwindigkeit
	 * (parallel zum Netz). Der Körperschwerpunkt übernimmt diese Geschwindigkeit,
	 * damit die relative Geschwindigkeit — und die nötige Armkorrektur — klein bleibt.
	 */

	const SVG_W = 560;
	const SVG_H = 320;

	// Zone: 4 m breit (2 m Radius nach jeder Seite), Spieler in der Mitte.
	const ZONE_W_M = 4.0;
	const PX_PER_M = 108;                    // horizontale Skala
	const ZONE_CX = SVG_W / 2;
	const NET_Y = 40;
	const PLAYER_Y = 250;

	function zx(/** @type {number} */ xm) { return ZONE_CX + xm * PX_PER_M; }

	// Szenarien: startX = Eintrittspunkt (m, relativ zur Zonenmitte, an der Netzlinie)
	//            endX   = Punkt auf Spielerhöhe
	//            Zeit vom Netz bis Spieler ~0.55 s → vx = (endX-startX)/t
	const T_TRAVEL = 0.55;
	const SCENARIOS = [
		{
			id: 'own',
			name: 'In der eigenen Zone',
			startX: 0.2, endX: 0.0,
			desc: 'Der Ball kommt fast direkt auf den Schwerpunkt zu. Kaum x-Geschwindigkeit — man kann warten.',
		},
		{
			id: 'edge',
			name: 'Von aussen, knapp herein',
			startX: 2.6, endX: 1.9,
			desc: 'Der Ball kommt nur knapp in die Zone. Fast keine x-Geschwindigkeit — an den Rand gehen und warten.',
		},
		{
			id: 'half',
			name: 'Von aussen bis zur Mitte',
			startX: 3.0, endX: 0.2,
			desc: 'Mittlere x-Geschwindigkeit. Der Schwerpunkt geht ein Stück mit, die Arme machen den Rest.',
		},
		{
			id: 'cross',
			name: 'Von aussen quer durch',
			startX: 3.2, endX: -1.8,
			desc: 'Hohe x-Geschwindigkeit. Genau die übernehmen wir mit dem Schwerpunkt — dann fällt der Ball fast von selbst.',
		},
	];

	let selected = $state(0);
	let scn = $derived(SCENARIOS[selected]);

	let ballVx = $derived((scn.endX - scn.startX) / T_TRAVEL); // m/s parallel Netz
	// Schwerpunkt übernimmt die x-Geschwindigkeit (begrenzt auf 2 m in 0.55 s ≈ 3.6 m/s)
	let comVx = $derived(Math.max(-3.6, Math.min(3.6, ballVx)));
	let relVx = $derived(ballVx - comVx);
	let armCorrection = $derived(Math.abs(relVx) * 0.28);

	// Animation
	let t = $state(0);
	/** @type {'idle'|'running'|'done'} */
	let phase = $state('idle');
	/** @type {number|null} */
	let rafId = null;
	let startTime = 0;

	let frac = $derived(Math.min(1, t / T_TRAVEL));
	let ballXm = $derived(scn.startX + (scn.endX - scn.startX) * frac);
	let ballY  = $derived(NET_Y + (PLAYER_Y - NET_Y) * frac);
	// Schwerpunkt startet in der Mitte und geht mit (begrenzt auf ±2 m)
	let comXm = $derived(Math.max(-2, Math.min(2, comVx * T_TRAVEL * frac)));

	function frame(/** @type {number} */ now) {
		t = (now - startTime) / 1000;
		if (t >= T_TRAVEL) { t = T_TRAVEL; phase = 'done'; rafId = null; return; }
		rafId = requestAnimationFrame(frame);
	}
	function play() {
		if (rafId) cancelAnimationFrame(rafId);
		t = 0; phase = 'running'; startTime = performance.now();
		rafId = requestAnimationFrame(frame);
	}
	function pick(/** @type {number} */ i) {
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
		selected = i; t = 0; phase = 'idle';
		requestAnimationFrame(() => play());
	}
	$effect(() => () => { if (rafId) cancelAnimationFrame(rafId); });

	let quality = $derived(armCorrection < 0.12 ? 'einfach' : armCorrection < 0.35 ? 'machbar' : 'schwierig');
	let qColor = $derived(quality === 'einfach' ? '#16a34a' : quality === 'machbar' ? '#eab308' : '#ef4444');
</script>

<div class="rz-wrap">
	<div class="rz-head">
		<h4>Vier Annahme-Situationen im 2-Meter-Radius</h4>
		<p>Draufsicht auf die eigene Annahmezone (rund 2 m nach jeder Seite). Jeder Ball hat eine andere
		x-Geschwindigkeit parallel zum Netz — der Schwerpunkt übernimmt sie, die Arme korrigieren den Rest.</p>
	</div>

	<div class="rz-tabs">
		{#each SCENARIOS as s, i}
			<button class:active={selected === i} onclick={() => pick(i)}>{s.name}</button>
		{/each}
	</div>

	<div class="rz-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="rz-svg" role="img" aria-label="Annahme-Szenario Draufsicht">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Netz oben -->
			<line x1={20} y1={NET_Y} x2={SVG_W - 20} y2={NET_Y} stroke="#94a3b8" stroke-width="2" stroke-dasharray="7,4" />
			<text x={26} y={NET_Y - 6} font-size="11" fill="#94a3b8" font-family="sans-serif">Netz</text>

			<!-- Zonenband ±2 m -->
			<rect x={zx(-2)} y={NET_Y} width={4 * PX_PER_M} height={PLAYER_Y - NET_Y + 20} fill="#dbeafe" opacity="0.35" />
			<line x1={zx(-2)} y1={NET_Y} x2={zx(-2)} y2={PLAYER_Y + 20} stroke="#93c5fd" stroke-width="1.5" stroke-dasharray="4,3" />
			<line x1={zx(2)}  y1={NET_Y} x2={zx(2)}  y2={PLAYER_Y + 20} stroke="#93c5fd" stroke-width="1.5" stroke-dasharray="4,3" />
			<text x={zx(-2)} y={PLAYER_Y + 34} text-anchor="middle" font-size="10" fill="#3b82f6" font-family="sans-serif">−2 m</text>
			<text x={zx(2)}  y={PLAYER_Y + 34} text-anchor="middle" font-size="10" fill="#3b82f6" font-family="sans-serif">+2 m</text>
			<text x={ZONE_CX} y={PLAYER_Y + 34} text-anchor="middle" font-size="10" fill="#3b82f6" font-family="sans-serif">Mitte</text>

			<!-- Ballspur -->
			<line
				x1={zx(scn.startX)} y1={NET_Y}
				x2={zx(scn.endX)} y2={PLAYER_Y}
				stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5"
			/>

			<!-- Schwerpunkt-Bewegung -->
			<line x1={ZONE_CX} y1={PLAYER_Y} x2={zx(comXm)} y2={PLAYER_Y} stroke="#2563eb" stroke-width="2.5" opacity="0.5" />

			<!-- Spieler-Schwerpunkt -->
			<circle cx={zx(comXm)} cy={PLAYER_Y} r="10" fill="#2563eb" stroke="white" stroke-width="2" />
			<text x={zx(comXm)} y={PLAYER_Y + 4} text-anchor="middle" font-size="10" fill="white" font-family="sans-serif" font-weight="700">S</text>

			<!-- Ball -->
			<circle cx={zx(ballXm)} cy={ballY} r="11" fill="white" stroke="#f59e0b" stroke-width="2.5" />
		</svg>
	</div>

	<div class="rz-stats">
		<div class="rz-stat"><span class="rz-lbl">Ball x-Geschw.</span><span class="rz-val">{ballVx.toFixed(1)} m/s</span></div>
		<div class="rz-stat"><span class="rz-lbl">Schwerpunkt x</span><span class="rz-val">{comVx.toFixed(1)} m/s</span></div>
		<div class="rz-stat"><span class="rz-lbl">Relative x-Geschw.</span><span class="rz-val" style="color:{qColor}">{relVx.toFixed(1)} m/s</span></div>
		<div class="rz-stat"><span class="rz-lbl">Armkorrektur</span><span class="rz-val" style="color:{qColor}">{(armCorrection*100).toFixed(0)} cm</span></div>
	</div>

	<div class="rz-desc">{scn.desc}</div>
</div>

<style>
	.rz-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.rz-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.rz-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.rz-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.rz-tabs button {
		padding: 0.4rem 0.8rem; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569;
		border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
	}
	.rz-tabs button:hover { background: #eef2f7; }
	.rz-tabs button.active { background: var(--color-primary, #1e3a5f); color: #fff; border-color: var(--color-primary, #1e3a5f); }
	.rz-svg-box { width: 100%; border-radius: 0.5rem; overflow: hidden; }
	.rz-svg { width: 100%; height: auto; display: block; }
	.rz-stats {
		display: flex; flex-wrap: wrap; gap: 0.5rem 0;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem;
	}
	.rz-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 120px; border-left: 1px solid #e2e8f0; }
	.rz-stat:first-child { border-left: none; }
	.rz-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.rz-val { font-size: 1rem; font-weight: 700; color: #1e293b; font-family: monospace; }
	.rz-desc {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.83rem; color: #334155; line-height: 1.55;
	}
	@media (max-width: 600px) {
		.rz-wrap { padding: 1rem; }
		.rz-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
