<script>
	/**
	 * Relative Geschwindigkeit in der Annahme — Aufriss (Seitenansicht)
	 *
	 * Blickrichtung: entlang der Netzachse.
	 *   x = parallel zum Netz (seitliche Drift des Balls)
	 *   y = Flughöhe des Balls
	 *
	 * Kernidee: Nicht die Ballgeschwindigkeit zählt, sondern die RELATIVE
	 * Geschwindigkeit zwischen Ball und Körperschwerpunkt. Passt der
	 * Schwerpunkt seine x-Geschwindigkeit dem Ball an, schrumpft die relative
	 * Geschwindigkeit — und die Arme müssen nur noch minimal korrigieren.
	 */

	// ─── Physik / Skala ───────────────────────────────────────────────────────
	const SVG_W = 560;
	const SVG_H = 340;
	const GROUND_Y = SVG_H - 46;
	const PX_PER_M = 46;           // horizontale Skala
	const PX_PER_M_Y = 34;         // vertikale Skala

	// Ball-Startwerte
	const BALL_START_H = 3.2;      // m über Boden
	const CONTACT_H = 0.9;         // Kontakthöhe (Bagger) in m

	// ─── Zustand ───────────────────────────────────────────────────────────────
	let ballVx = $state(2.5);      // m/s seitliche Ballgeschwindigkeit (parallel Netz)
	let comVx  = $state(0);        // m/s Geschwindigkeit des Körperschwerpunkts
	let ballVy = $state(3.0);      // m/s Fallgeschwindigkeit
	let followDown = $state(false);// Schwerpunkt geht mit dem Ball nach unten

	/** @type {'idle'|'running'|'done'} */
	let phase = $state('idle');
	let t = $state(0);
	/** @type {number|null} */
	let rafId = null;
	let startTime = 0;

	// Kontaktzeitpunkt: wann erreicht der Ball die Kontakthöhe?
	let tContact = $derived(ballVy > 0.05 ? (BALL_START_H - CONTACT_H) / ballVy : 3);

	// Positionen (Meter, Feldkoordinaten). Ball startet mittig oben.
	const BALL_X0 = 5.0;
	const COM_X0 = 4.2;

	let ballXm = $derived(BALL_X0 + ballVx * Math.min(t, tContact));
	let ballYm = $derived(Math.max(CONTACT_H, BALL_START_H - ballVy * t));
	let comVyEff = $derived(followDown ? Math.min(ballVy, 1.2) : 0);
	let comXm = $derived(COM_X0 + comVx * Math.min(t, tContact));

	// Relative Geschwindigkeit (Ball − Schwerpunkt)
	let relVx = $derived(ballVx - comVx);
	let relVy = $derived(ballVy - comVyEff);
	let relSpeed = $derived(Math.hypot(relVx, relVy));

	// Nötige Armkorrektur ~ relative x-Geschwindigkeit · verbleibende Zeit
	// (grobe, anschauliche Kennzahl)
	let armCorrection = $derived(Math.abs(relVx) * 0.28); // Meter

	// Bewertung
	let quality = $derived(
		armCorrection < 0.12 ? 'einfach' :
		armCorrection < 0.35 ? 'machbar' : 'schwierig'
	);
	let qualityColor = $derived(
		quality === 'einfach' ? '#16a34a' :
		quality === 'machbar' ? '#eab308' : '#ef4444'
	);

	// ─── SVG-Hilfen ─────────────────────────────────────────────────────────────
	function px(/** @type {number} */ xm) { return 40 + xm * PX_PER_M; }
	function py(/** @type {number} */ ym) { return GROUND_Y - ym * PX_PER_M_Y; }

	let ballPx = $derived(px(ballXm));
	let ballPy = $derived(py(ballYm));
	let comPx  = $derived(px(comXm));
	let comYm  = $derived(Math.max(0.9, 1.1 - comVyEff * Math.min(t, tContact) * 0.35));
	let comPy  = $derived(py(comYm));

	// ─── Steuerung ───────────────────────────────────────────────────────────────
	function frame(/** @type {number} */ now) {
		t = (now - startTime) / 1000;
		if (t >= tContact) {
			t = tContact;
			phase = 'done';
			rafId = null;
			return;
		}
		rafId = requestAnimationFrame(frame);
	}
	function play() {
		if (rafId) cancelAnimationFrame(rafId);
		t = 0;
		phase = 'running';
		startTime = performance.now();
		rafId = requestAnimationFrame(frame);
	}
	function reset() {
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
		t = 0;
		phase = 'idle';
	}
	$effect(() => () => { if (rafId) cancelAnimationFrame(rafId); });

	function matchCom() {
		comVx = Math.round(ballVx * 10) / 10;
	}
</script>

<div class="rv-wrap">
	<div class="rv-head">
		<h4>Relative Geschwindigkeit in der Annahme</h4>
		<p>Aufriss entlang der Netzachse: <b>x</b> = parallel zum Netz, <b>y</b> = Flughöhe.
		Entscheidend ist nicht, wie schnell der Ball ist, sondern wie schnell er <i>relativ zu deinem Schwerpunkt</i> ist.</p>
	</div>

	<div class="rv-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="rv-svg" role="img" aria-label="Aufriss Annahme">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Achsen -->
			<line x1={40} y1={GROUND_Y} x2={SVG_W - 14} y2={GROUND_Y} stroke="#cbd5e1" stroke-width="1.5" />
			<line x1={40} y1={GROUND_Y} x2={40} y2={20} stroke="#cbd5e1" stroke-width="1.5" />
			<text x={SVG_W - 16} y={GROUND_Y + 18} text-anchor="end" font-size="11" fill="#94a3b8" font-family="sans-serif">x — parallel zum Netz</text>
			<text x={48} y={30} font-size="11" fill="#94a3b8" font-family="sans-serif">y — Höhe</text>

			<!-- Kontakthöhen-Linie -->
			<line x1={40} y1={py(CONTACT_H)} x2={SVG_W - 14} y2={py(CONTACT_H)} stroke="#e2e8f0" stroke-dasharray="5,4" stroke-width="1" />

			<!-- Ballspur -->
			{#if phase !== 'idle'}
				<line x1={px(BALL_X0)} y1={py(BALL_START_H)} x2={ballPx} y2={ballPy} stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5" />
			{/if}

			<!-- Schwerpunkt (Körper vereinfacht) -->
			<g>
				<line x1={comPx} y1={comPy} x2={comPx} y2={comPy + 40} stroke="#334155" stroke-width="3" />
				<circle cx={comPx} cy={comPy + 48} r="9" fill="#334155" />
				<!-- Schwerpunkt-Marker -->
				<circle cx={comPx} cy={comPy + 22} r="5" fill="#2563eb" stroke="white" stroke-width="1.5" />
			</g>
			<text x={comPx} y={comPy + 74} text-anchor="middle" font-size="10" fill="#2563eb" font-family="sans-serif" font-weight="600">Schwerpunkt</text>

			<!-- Ball -->
			<circle cx={ballPx} cy={ballPy} r="12" fill="white" stroke="#f59e0b" stroke-width="2.5" />

			<!-- Relative Geschwindigkeit als Pfeil vom Ball -->
			{#if phase !== 'idle'}
				{@const ax = ballPx + relVx * 16}
				{@const ay = ballPy + relVy * 12}
				<line x1={ballPx} y1={ballPy} x2={ax} y2={ay} stroke={qualityColor} stroke-width="3" marker-end="url(#rvArrow)" />
				<text x={ax + 6} y={ay} font-size="11" fill={qualityColor} font-family="monospace" font-weight="700">v_rel</text>
			{/if}

			<defs>
				<marker id="rvArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={qualityColor} />
				</marker>
			</defs>
		</svg>
	</div>

	<!-- Kennzahlen -->
	<div class="rv-stats">
		<div class="rv-stat">
			<span class="rv-lbl">Ball x</span>
			<span class="rv-val">{ballVx.toFixed(1)} m/s</span>
		</div>
		<div class="rv-stat">
			<span class="rv-lbl">Schwerpunkt x</span>
			<span class="rv-val">{comVx.toFixed(1)} m/s</span>
		</div>
		<div class="rv-stat">
			<span class="rv-lbl">Relative x-Geschw.</span>
			<span class="rv-val" style="color:{qualityColor}">{relVx.toFixed(1)} m/s</span>
		</div>
		<div class="rv-stat">
			<span class="rv-lbl">Armkorrektur</span>
			<span class="rv-val" style="color:{qualityColor}">{(armCorrection * 100).toFixed(0)} cm — {quality}</span>
		</div>
	</div>

	<!-- Regler -->
	<div class="rv-controls">
		<label>
			<span>Ball x-Geschwindigkeit: {ballVx.toFixed(1)} m/s</span>
			<input type="range" min="-4" max="4" step="0.1" bind:value={ballVx} oninput={reset} />
		</label>
		<label>
			<span>Schwerpunkt x-Geschwindigkeit: {comVx.toFixed(1)} m/s</span>
			<input type="range" min="-4" max="4" step="0.1" bind:value={comVx} oninput={reset} />
		</label>
		<label class="rv-check">
			<input type="checkbox" bind:checked={followDown} onchange={reset} />
			<span>Schwerpunkt geht mit dem Ball nach unten (y anpassen)</span>
		</label>
	</div>

	<div class="rv-actions">
		<button class="rv-btn-primary" onclick={play}>▶ Abspielen</button>
		<button class="rv-btn" onclick={matchCom}>⇄ Schwerpunkt an Ball anpassen</button>
		<button class="rv-btn" onclick={reset}>↺ Zurücksetzen</button>
	</div>

	<div class="rv-note">
		<strong>Probiere es:</strong> Ein schneller Ball (grosse x-Geschwindigkeit) ist kein Problem,
		solange dein Schwerpunkt mitgeht. Passt du die Schwerpunkt-Geschwindigkeit an, wird die
		relative Geschwindigkeit klein — und die Arme müssen kaum noch korrigieren.
	</div>
</div>

<style>
	.rv-wrap {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.rv-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.rv-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.rv-svg-box { width: 100%; border-radius: 0.5rem; overflow: hidden; }
	.rv-svg { width: 100%; height: auto; display: block; }
	.rv-stats {
		display: flex; flex-wrap: wrap; gap: 0.5rem 0;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem;
	}
	.rv-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 120px; border-left: 1px solid #e2e8f0; }
	.rv-stat:first-child { border-left: none; }
	.rv-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.rv-val { font-size: 1rem; font-weight: 700; color: #1e293b; font-family: monospace; }
	.rv-controls { display: flex; flex-direction: column; gap: 0.6rem; }
	.rv-controls label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.82rem; color: #475569; }
	.rv-controls input[type=range] { width: 100%; }
	.rv-check { flex-direction: row !important; align-items: center; gap: 0.5rem !important; }
	.rv-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
	.rv-btn, .rv-btn-primary {
		padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem;
		font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s;
	}
	.rv-btn-primary { background: var(--color-primary, #1e3a5f); color: #fff; }
	.rv-btn-primary:hover { background: #2d5a8e; transform: translateY(-1px); }
	.rv-btn { background: #e2e8f0; color: #475569; }
	.rv-btn:hover { background: #cbd5e1; }
	.rv-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.rv-note strong { color: #0369a1; }
	@media (max-width: 600px) {
		.rv-wrap { padding: 1rem; }
		.rv-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
