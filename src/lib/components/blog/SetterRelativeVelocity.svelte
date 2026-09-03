<script>
	/**
	 * Zuspiel — relative Geschwindigkeit in der Draufsicht (Grundriss)
	 *
	 * Der Ball kommt mit einer x-Geschwindigkeit (parallel zum Netz) und einer
	 * z-Geschwindigkeit (senkrecht zum Netz). Der Zuspieler übernimmt vor allem
	 * die x-Geschwindigkeit mit dem Schwerpunkt (leichte seitliche Bewegung /
	 * Sprungzuspiel). Je kleiner die relative Geschwindigkeit, desto grösser das
	 * Zuspielfenster.
	 */

	const SVG_W = 520;
	const SVG_H = 320;
	const NET_Y = 42;
	const PX_PER_M = 60;
	const CX = SVG_W / 2;

	function gx(/** @type {number} */ xm) { return CX + xm * PX_PER_M; }
	function gy(/** @type {number} */ zm) { return NET_Y + zm * PX_PER_M; } // z = Abstand vom Netz

	// Ball-Startwerte
	let ballVx = $state(1.5);   // m/s parallel Netz
	let ballVz = $state(1.0);   // m/s senkrecht zum Netz (Richtung Netz = negativ)
	let setterDrift = $state(0);// m/s seitliche Schwerpunktbewegung des Zuspielers

	let relVx = $derived(ballVx - setterDrift);
	let relVz = $derived(ballVz);
	let relSpeed = $derived(Math.hypot(relVx, relVz));

	// Zuspielfenster: bei relSpeed = 0 gross (~0.30 s), schrumpft mit relSpeed
	let windowS = $derived(Math.max(0.04, 0.30 - relSpeed * 0.06));
	let windowPct = $derived(Math.min(1, windowS / 0.30));

	let quality = $derived(windowS > 0.22 ? 'stabil' : windowS > 0.13 ? 'knapp' : 'Schadensbegrenzung');
	let qColor = $derived(windowS > 0.22 ? '#16a34a' : windowS > 0.13 ? '#eab308' : '#ef4444');

	// Animation
	const T = 0.9;
	let t = $state(0);
	/** @type {number|null} */ let rafId = null;
	let startTime = 0;
	/** @type {'idle'|'running'|'done'} */ let phase = $state('idle');

	// Ballstart oben, kommt zum Zuspieler bei (0, 1.6)
	const START_X = -2.2, START_Z = 0.4;
	const SET_X = 0, SET_Z = 1.6;
	let frac = $derived(Math.min(1, t / T));
	let ballXm = $derived(START_X + (SET_X - START_X) * frac);
	let ballZm = $derived(START_Z + (SET_Z - START_Z) * frac);
	let setterXm = $derived(Math.max(-1.5, Math.min(1.5, setterDrift * T * frac)));

	function frame(/** @type {number} */ now) {
		t = (now - startTime) / 1000;
		if (t >= T) { t = T; phase = 'done'; rafId = null; return; }
		rafId = requestAnimationFrame(frame);
	}
	function play() {
		if (rafId) cancelAnimationFrame(rafId);
		t = 0; phase = 'running'; startTime = performance.now();
		rafId = requestAnimationFrame(frame);
	}
	function match() { setterDrift = Math.round(ballVx * 10) / 10; }
	function reset() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } t = 0; phase = 'idle'; }
	$effect(() => () => { if (rafId) cancelAnimationFrame(rafId); });
</script>

<div class="sr-wrap">
	<div class="sr-head">
		<h4>Zuspiel: relative Geschwindigkeit im Grundriss</h4>
		<p>Draufsicht: <b>x</b> = parallel zum Netz, <b>z</b> = Abstand zum Netz. Der Zuspieler übernimmt
		mit dem Schwerpunkt vor allem die x-Geschwindigkeit. Je kleiner die relative Geschwindigkeit,
		desto länger bleibt das Zuspielfenster stabil.</p>
	</div>

	<div class="sr-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="sr-svg" role="img" aria-label="Zuspiel Grundriss">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Netz -->
			<line x1={20} y1={NET_Y} x2={SVG_W - 20} y2={NET_Y} stroke="#94a3b8" stroke-width="2" stroke-dasharray="7,4" />
			<text x={26} y={NET_Y - 6} font-size="11" fill="#94a3b8" font-family="sans-serif">Netz</text>

			<!-- Achsen -->
			<text x={SVG_W - 24} y={NET_Y + 16} text-anchor="end" font-size="11" fill="#94a3b8" font-family="sans-serif">x — parallel Netz</text>
			<text x={30} y={NET_Y + 60} font-size="11" fill="#94a3b8" font-family="sans-serif">z ↓</text>

			<!-- Zielzone Zuspieler -->
			<circle cx={gx(SET_X)} cy={gy(SET_Z)} r={0.7 * PX_PER_M} fill="#dbeafe" opacity="0.4" />

			<!-- Ballspur -->
			<line x1={gx(START_X)} y1={gy(START_Z)} x2={gx(SET_X)} y2={gy(SET_Z)} stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5" />

			<!-- Zuspieler-Schwerpunkt Drift -->
			<line x1={gx(0)} y1={gy(SET_Z)} x2={gx(setterXm)} y2={gy(SET_Z)} stroke="#2563eb" stroke-width="2.5" opacity="0.5" />
			<circle cx={gx(setterXm)} cy={gy(SET_Z)} r="11" fill="#2563eb" stroke="white" stroke-width="2" />
			<text x={gx(setterXm)} y={gy(SET_Z) + 4} text-anchor="middle" font-size="10" fill="white" font-family="sans-serif" font-weight="700">Z</text>

			<!-- Ball -->
			<circle cx={gx(ballXm)} cy={gy(ballZm)} r="11" fill="white" stroke="#f59e0b" stroke-width="2.5" />

			<!-- relative Geschwindigkeit -->
			{#if phase !== 'idle'}
				{@const ax = gx(ballXm) + relVx * 20}
				{@const ay = gy(ballZm) + relVz * 20}
				<line x1={gx(ballXm)} y1={gy(ballZm)} x2={ax} y2={ay} stroke={qColor} stroke-width="3" marker-end="url(#srArrow)" />
			{/if}
			<defs>
				<marker id="srArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={qColor} />
				</marker>
			</defs>
		</svg>
	</div>

	<!-- Zuspielfenster-Balken -->
	<div class="sr-window">
		<div class="sr-window-lbl">Zuspielfenster <span style="color:{qColor}">— {quality}</span></div>
		<div class="sr-bar"><div class="sr-bar-fill" style="width:{windowPct*100}%; background:{qColor}"></div></div>
		<div class="sr-window-val">{(windowS*1000).toFixed(0)} ms</div>
	</div>

	<div class="sr-stats">
		<div class="sr-stat"><span class="sr-lbl">Ball x</span><span class="sr-val">{ballVx.toFixed(1)} m/s</span></div>
		<div class="sr-stat"><span class="sr-lbl">Ball z</span><span class="sr-val">{ballVz.toFixed(1)} m/s</span></div>
		<div class="sr-stat"><span class="sr-lbl">Relative x</span><span class="sr-val" style="color:{qColor}">{relVx.toFixed(1)} m/s</span></div>
	</div>

	<div class="sr-controls">
		<label><span>Ball x-Geschwindigkeit: {ballVx.toFixed(1)} m/s</span>
			<input type="range" min="-3" max="3" step="0.1" bind:value={ballVx} oninput={reset} /></label>
		<label><span>Ball z-Geschwindigkeit: {ballVz.toFixed(1)} m/s</span>
			<input type="range" min="0" max="3" step="0.1" bind:value={ballVz} oninput={reset} /></label>
		<label><span>Zuspieler-Drift (Schwerpunkt): {setterDrift.toFixed(1)} m/s</span>
			<input type="range" min="-3" max="3" step="0.1" bind:value={setterDrift} oninput={reset} /></label>
	</div>

	<div class="sr-actions">
		<button class="sr-btn-primary" onclick={play}>▶ Abspielen</button>
		<button class="sr-btn" onclick={match}>⇄ Drift an Ball anpassen</button>
		<button class="sr-btn" onclick={reset}>↺ Zurücksetzen</button>
	</div>

	<div class="sr-note">
		<strong>Merke:</strong> Es reicht oft, <i>eine</i> Richtung zu neutralisieren. Übernimmt der Schwerpunkt
		die x-Geschwindigkeit, bleibt nur die kleine z-Komponente für die Hände — und das Zuspielfenster
		bleibt lange offen.
	</div>
</div>

<style>
	.sr-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.sr-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.sr-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.sr-svg-box { width: 100%; border-radius: 0.5rem; overflow: hidden; }
	.sr-svg { width: 100%; height: auto; display: block; }
	.sr-window { display: flex; align-items: center; gap: 0.75rem; }
	.sr-window-lbl { font-size: 0.8rem; color: #475569; font-weight: 600; flex: 0 0 auto; }
	.sr-bar { flex: 1; height: 14px; background: #e2e8f0; border-radius: 7px; overflow: hidden; }
	.sr-bar-fill { height: 100%; border-radius: 7px; transition: width 0.2s, background 0.2s; }
	.sr-window-val { font-family: monospace; font-weight: 700; font-size: 0.9rem; color: #1e293b; flex: 0 0 auto; }
	.sr-stats {
		display: flex; flex-wrap: wrap; gap: 0.5rem 0;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem;
	}
	.sr-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 100px; border-left: 1px solid #e2e8f0; }
	.sr-stat:first-child { border-left: none; }
	.sr-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.sr-val { font-size: 1rem; font-weight: 700; color: #1e293b; font-family: monospace; }
	.sr-controls { display: flex; flex-direction: column; gap: 0.6rem; }
	.sr-controls label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.82rem; color: #475569; }
	.sr-controls input[type=range] { width: 100%; }
	.sr-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
	.sr-btn, .sr-btn-primary {
		padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem;
		font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s;
	}
	.sr-btn-primary { background: var(--color-primary, #1e3a5f); color: #fff; }
	.sr-btn-primary:hover { background: #2d5a8e; transform: translateY(-1px); }
	.sr-btn { background: #e2e8f0; color: #475569; }
	.sr-btn:hover { background: #cbd5e1; }
	.sr-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.sr-note strong { color: #0369a1; }
	@media (max-width: 600px) {
		.sr-wrap { padding: 1rem; }
		.sr-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
