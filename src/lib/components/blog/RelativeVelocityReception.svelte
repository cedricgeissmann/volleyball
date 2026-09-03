<script>
	/**
	 * Relative Geschwindigkeit in der Annahme — Aufriss (flache 2D-Ansicht)
	 *
	 *   x = horizontal = parallel zum Netz (seitliche Drift)
	 *   y = vertikal    = Höhe
	 *
	 * Blick frontal auf die x-y-Ebene: kein Perspektiveffekt, damit x und y
	 * klar ablesbar sind. Das Netz steht als Band im Hintergrund (oben, mit
	 * Abstand zum Boden), der Aufschlag kommt darüber und driftet zur Seite.
	 *
	 * Es ist KEINE Simulation. Einziger Schalter: bewegt sich der Spieler mit
	 * (relative Geschwindigkeit ≈ 0) oder bleibt er stehen (relative
	 * Geschwindigkeit gross). Die Ballgeschwindigkeit wird zufällig gewählt.
	 */

	const SVG_W = 600;
	const SVG_H = 400;

	// ─── Skala ───────────────────────────────────────────────────────────────────
	const FLOOR_Y = 356;
	const CENTER_X = 300;
	const PX_PER_M_X = 48;
	const PX_PER_M_Y = 86;

	function fx(/** @type {number} */ xm) { return CENTER_X + xm * PX_PER_M_X; }
	function fy(/** @type {number} */ ym) { return FLOOR_Y - ym * PX_PER_M_Y; }

	// ─── feste Höhen (Meter) ──────────────────────────────────────────────────────
	const NET_TOP_M = 2.43;
	const NET_BOTTOM_M = 1.43;   // Netz hört über dem Boden auf
	const SERVE_H = 3.3;         // Ballhöhe beim Erscheinen über dem Netz
	const CONTACT_H = 0.9;       // Kontakthöhe (Bagger)
	const ZONE_R_M = 2.0;        // seitlicher Bewegungsradius
	const ARM_M = 0.85;          // seitliche Armreichweite

	// Netzpfosten
	const POST_L = fx(-ZONE_R_M) - 60;
	const POST_R = fx(ZONE_R_M) + 60;

	// ─── Zufalls-Szenario ─────────────────────────────────────────────────────────
	function rand(/** @type {number} */ a, /** @type {number} */ b) { return a + Math.random() * (b - a); }
	function newScenario() {
		let s = 0, c = 0;
		for (let i = 0; i < 20; i++) {
			s = rand(-1.5, 1.5);
			c = rand(-1.8, 1.8);
			if (Math.abs(c - s) >= 0.7) break;
		}
		return { serveXm: +s.toFixed(2), contactXm: +c.toFixed(2) };
	}

	let serveXm = $state(-1.0);
	let contactXm = $state(1.3);

	// ─── Zustand ────────────────────────────────────────────────────────────────
	/** @type {'mit'|'spaet'|'stehen'} */
	let mode = $state('mit');
	/** @type {'idle'|'running'|'done'} */
	let phase = $state('idle');
	let t = $state(0);
	/** @type {number|null} */
	let rafId = null;
	let startTime = 0;
	const DUR = 1900;

	// ─── Hilfsfunktionen ────────────────────────────────────────────────────────
	function easeInOut(/** @type {number} */ x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
	function lerp(/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ k) { return a + (b - a) * k; }
	function clamp(/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) { return Math.max(lo, Math.min(hi, v)); }
	function bez(/** @type {number} */ p0, /** @type {number} */ p1, /** @type {number} */ p2, /** @type {number} */ k) {
		const m = 1 - k;
		return m * m * p0 + 2 * m * k * p1 + k * k * p2;
	}

	// ─── abgeleitete Grössen ──────────────────────────────────────────────────────
	const CTRL_H = 3.9;   // Kurven-Hochpunkt (über das Netz)
	let ctrlXm = $derived((serveXm + contactXm) / 2);

	// Ball-x zu beliebigem Zeitpunkt
	function ballXmAt(/** @type {number} */ tt) { return bez(serveXm, ctrlXm, contactXm, clamp(tt, 0, 1)); }

	// Spieler-x zu beliebigem Zeitpunkt, je nach Szenario
	const T_REACT = 0.55;   // Reaktionszeitpunkt beim späten Start
	function bodyXmAt(/** @type {number} */ tt) {
		const k = clamp(tt, 0, 1);
		if (mode === 'stehen') return serveXm;
		if (mode === 'mit') return ballXmAt(k);            // deckt sich mit dem Ball → v_rel ≈ 0
		// spät: erst stehen, dann hektisch nachsetzen → überschiessen, v_rel schwingt
		if (k < T_REACT) return serveXm;
		const p = (k - T_REACT) / (1 - T_REACT);
		const f = 1 - Math.exp(-3 * p) * Math.cos(6.5 * p);  // gedämpfte Schwingung um das Ziel
		return serveXm + (contactXm - serveXm) * f;
	}

	let ballXm = $derived(ballXmAt(t));
	let ballYm = $derived(bez(SERVE_H, CTRL_H, CONTACT_H, t));
	let ballPx = $derived(fx(ballXm));
	let ballPy = $derived(fy(ballYm));
	let ballR = $derived(lerp(6, 13, t));

	let bodyXm = $derived(bodyXmAt(t));

	// Arme greifen in der zweiten Flughälfte zum Ball
	let reachK = $derived(clamp((t - 0.5) / 0.5, 0, 1));
	let rawHandsXm = $derived(lerp(bodyXm, ballXm, reachK));
	let handsXm = $derived(bodyXm + clamp(rawHandsXm - bodyXm, -ARM_M, ARM_M));
	let handsYm = $derived(lerp(1.0, Math.min(ballYm, 1.2), reachK));

	// ─── relative x-Geschwindigkeit (momentan, numerisch) ────────────────────────
	const DT = 0.012;
	let relVx = $derived(
		((ballXmAt(t + DT) - ballXmAt(t - DT)) - (bodyXmAt(t + DT) - bodyXmAt(t - DT))) / (2 * DT)
	);
	let ballDriftM = $derived(contactXm - serveXm);
	// Lücke zwischen Ball und Spieler beim Kontakt
	let endGap = $derived(Math.abs(contactXm - bodyXmAt(1)));
	let missed = $derived(endGap > ARM_M);

	let bx = $derived(fx(bodyXm));
	let hx = $derived(fx(handsXm));
	let hy = $derived(fy(handsYm));

	let quality = $derived(mode === 'mit' ? 'gering' : mode === 'spaet' ? 'unstabil' : 'gross');
	let qColor = $derived(mode === 'mit' ? '#16a34a' : mode === 'spaet' ? '#f59e0b' : '#ef4444');
	let arrowPx = $derived(clamp(Math.abs(relVx) * PX_PER_M_X * 0.28, 0, 130));
	let arrowDir = $derived(relVx >= 0 ? 1 : -1);

	// ─── Steuerung ────────────────────────────────────────────────────────────────
	function frame(/** @type {number} */ now) {
		const k = (now - startTime) / DUR;
		if (k >= 1) { t = 1; phase = 'done'; rafId = null; return; }
		t = k;
		rafId = requestAnimationFrame(frame);
	}
	function play() {
		if (rafId) cancelAnimationFrame(rafId);
		const s = newScenario();
		serveXm = s.serveXm;
		contactXm = s.contactXm;
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
	/** @param {'mit'|'spaet'|'stehen'} m */
	function setMode(m) { mode = m; reset(); }
	$effect(() => () => { if (rafId) cancelAnimationFrame(rafId); });
</script>

<div class="rv-wrap">
	<div class="rv-head">
		<h4>Relative Geschwindigkeit in der Annahme</h4>
		<p>Aufriss der x-y-Ebene: <b>x</b> = parallel zum Netz, <b>y</b> = Höhe. Der
		Aufschlag kommt über das Netz und <b>driftet zur Seite</b> (zufällige
		Geschwindigkeit). Entscheidend ist nicht die Ballgeschwindigkeit, sondern die
		Geschwindigkeit <i>relativ zum Spieler</i>.</p>
	</div>

	<div class="rv-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="rv-svg" role="img" aria-label="Annahme-Aufriss">
			<rect width={SVG_W} height={SVG_H} fill="#eef4fb" rx="10" />

			<!-- Achsen -->
			<line x1="34" y1={FLOOR_Y} x2={SVG_W - 16} y2={FLOOR_Y} stroke="#94a3b8" stroke-width="1.5" />
			<line x1="34" y1={FLOOR_Y} x2="34" y2="28" stroke="#cbd5e1" stroke-width="1.5" />
			<text x={SVG_W - 18} y={FLOOR_Y + 20} text-anchor="end" font-size="11" fill="#94a3b8" font-family="sans-serif">x — parallel zum Netz</text>
			<text x="42" y="40" font-size="11" fill="#94a3b8" font-family="sans-serif">y — Höhe</text>

			<!-- Netz (Band im Hintergrund, mit Abstand zum Boden) -->
			<line x1={POST_L} y1={FLOOR_Y} x2={POST_L} y2={fy(NET_TOP_M)} stroke="#475569" stroke-width="4" />
			<line x1={POST_R} y1={FLOOR_Y} x2={POST_R} y2={fy(NET_TOP_M)} stroke="#475569" stroke-width="4" />
			<rect x={POST_L} y={fy(NET_TOP_M)} width={POST_R - POST_L} height={fy(NET_BOTTOM_M) - fy(NET_TOP_M)} fill="url(#rvMesh)" />
			<line x1={POST_L} y1={fy(NET_TOP_M)} x2={POST_R} y2={fy(NET_TOP_M)} stroke="#f8fafc" stroke-width="4" />
			<line x1={POST_L} y1={fy(NET_BOTTOM_M)} x2={POST_R} y2={fy(NET_BOTTOM_M)} stroke="#94a3b8" stroke-width="1.5" />
			<text x={POST_R - 6} y={fy(NET_TOP_M) - 6} text-anchor="end" font-size="10" fill="#64748b" font-family="sans-serif">Netz</text>

			<!-- Kontakthöhen-Linie -->
			<line x1="34" y1={fy(CONTACT_H)} x2={SVG_W - 16} y2={fy(CONTACT_H)} stroke="#cbd5e1" stroke-dasharray="5,4" stroke-width="1" />

			<!-- Annahmezone (2 m Radius) -->
			<line x1={fx(-ZONE_R_M)} y1={FLOOR_Y - 5} x2={fx(-ZONE_R_M)} y2={FLOOR_Y + 5} stroke="#2563eb" stroke-width="2" />
			<line x1={fx(ZONE_R_M)} y1={FLOOR_Y - 5} x2={fx(ZONE_R_M)} y2={FLOOR_Y + 5} stroke="#2563eb" stroke-width="2" />
			<line x1={fx(-ZONE_R_M)} y1={FLOOR_Y + 14} x2={fx(ZONE_R_M)} y2={FLOOR_Y + 14} stroke="#2563eb" stroke-width="1.5" opacity="0.7" />
			<text x={CENTER_X} y={FLOOR_Y + 30} text-anchor="middle" font-size="10.5" fill="#2563eb" font-family="sans-serif" font-weight="600">Annahmezone · 2 m Radius</text>

			<!-- Ballspur -->
			{#if phase !== 'idle'}
				<path d="M {fx(serveXm)} {fy(SERVE_H)} Q {fx(ctrlXm)} {fy(CTRL_H)} {ballPx} {ballPy}"
					fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.55" />
			{/if}

			<!-- Aufschlag-Markierung -->
			{#if phase !== 'idle'}
				<text x={fx(serveXm)} y={fy(SERVE_H) - 12} text-anchor="middle" font-size="10" fill="#b45309" font-family="sans-serif">Aufschlag</text>
			{/if}

			<!-- Annahmespieler (frontal) -->
			<g>
				<line x1={bx - 8} y1={fy(0.9)} x2={bx - 12} y2={FLOOR_Y} stroke="#1e293b" stroke-width="6" stroke-linecap="round" />
				<line x1={bx + 8} y1={fy(0.9)} x2={bx + 12} y2={FLOOR_Y} stroke="#1e293b" stroke-width="6" stroke-linecap="round" />
				<rect x={bx - 14} y={fy(1.45)} width="28" height={fy(0.9) - fy(1.45)} rx="9" fill="#2563eb" />
				<circle cx={bx} cy={fy(1.62)} r="10" fill="#1e293b" />
				<!-- Arme (Baggerbrett), bewegen sich zum Ball -->
				<line x1={bx - 12} y1={fy(1.4)} x2={hx} y2={hy} stroke="#f4b78a" stroke-width="6" stroke-linecap="round" />
				<line x1={bx + 12} y1={fy(1.4)} x2={hx} y2={hy} stroke="#f4b78a" stroke-width="6" stroke-linecap="round" />
				<line x1={hx - 10} y1={hy} x2={hx + 10} y2={hy} stroke="#e08e56" stroke-width="6" stroke-linecap="round" />
			</g>

			<!-- Ball -->
			{#if phase !== 'idle'}
				<circle cx={ballPx} cy={ballPy} r={ballR} fill="white" stroke="#f59e0b" stroke-width="2.5" />
				<path d="M {ballPx - ballR} {ballPy} Q {ballPx} {ballPy - ballR * 0.7} {ballPx + ballR} {ballPy}" fill="none" stroke="#f59e0b" stroke-width="1.2" />
			{/if}

			<!-- v_rel-Pfeil -->
			{#if phase !== 'idle' && t > 0.35}
				{#if arrowPx > 8}
					{@const ax = ballPx + arrowDir * arrowPx}
					<line x1={ballPx} y1={ballPy} x2={ax} y2={ballPy} stroke={qColor} stroke-width="3.5" marker-end="url(#rvArrow)" />
					<text x={(ballPx + ax) / 2} y={ballPy - 12} text-anchor="middle" font-size="12" fill={qColor} font-family="monospace" font-weight="700">v_rel</text>
				{:else}
					<text x={ballPx} y={ballPy - 16} text-anchor="middle" font-size="12" fill={qColor} font-family="monospace" font-weight="700">v_rel ≈ 0</text>
				{/if}
			{/if}

			{#if phase === 'done' && missed}
				<text x={CENTER_X} y="60" text-anchor="middle" font-size="13" fill="#ef4444" font-family="sans-serif" font-weight="700">Ball ausserhalb der Reichweite!</text>
			{:else if phase === 'done' && mode === 'spaet'}
				<text x={CENTER_X} y="60" text-anchor="middle" font-size="13" fill="#b45309" font-family="sans-serif" font-weight="700">v_rel bleibt unruhig — schwer sauber zu spielen</text>
			{/if}

			<defs>
				<pattern id="rvMesh" width="12" height="12" patternUnits="userSpaceOnUse">
					<rect width="12" height="12" fill="#f1f5f9" opacity="0.4" />
					<path d="M0 0 H12 M0 6 H12 M0 0 V12 M6 0 V12" stroke="#cbd5e1" stroke-width="0.6" />
				</pattern>
				<marker id="rvArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={qColor} />
				</marker>
			</defs>
		</svg>
	</div>

	<!-- Statusanzeige -->
	<div class="rv-status" style="border-color:{qColor}">
		<span class="rv-dot" style="background:{qColor}"></span>
		<span>
			{#if mode === 'mit'}
				<b>Spieler bewegt sich mit.</b> Der Schwerpunkt übernimmt die seitliche
				Geschwindigkeit des Balls — die relative Geschwindigkeit ist
				<b style="color:{qColor}">gering</b>, die Arme korrigieren nur wenig.
			{:else if mode === 'spaet'}
				<b>Spieler bewegt sich zu spät.</b> Erst steht er, dann setzt er hektisch
				nach — die Trägheit lässt ihn überschiessen. Die relative Geschwindigkeit
				wird <b style="color:{qColor}">unstabil</b> und lässt sich nicht mehr sauber
				auf null bringen.
			{:else}
				<b>Spieler bleibt stehen.</b> Der Ball driftet weg — die relative
				Geschwindigkeit ist <b style="color:{qColor}">gross</b>, die Arme müssen
				weit ausgreifen{#if Math.abs(ballDriftM) > ARM_M} und erreichen den Ball kaum{/if}.
			{/if}
		</span>
	</div>

	<!-- Steuerung: Szenario-Wahl + Abspielen -->
	<div class="rv-actions">
		<div class="rv-seg" role="group" aria-label="Szenario">
			<button class="rv-seg-btn" class:active={mode === 'mit'} onclick={() => setMode('mit')}>Bewegt sich mit</button>
			<button class="rv-seg-btn" class:active={mode === 'spaet'} onclick={() => setMode('spaet')}>Bewegt sich spät</button>
			<button class="rv-seg-btn" class:active={mode === 'stehen'} onclick={() => setMode('stehen')}>Bleibt stehen</button>
		</div>
		<button class="rv-btn-primary" onclick={play}>▶ Abspielen</button>
		<button class="rv-btn" onclick={reset}>↺ Zurücksetzen</button>
	</div>

	<div class="rv-note">
		<strong>Kernidee:</strong> Ein schneller, seitlich driftender Aufschlag ist kein
		Problem, solange der Spieler mitgeht. Passt der Schwerpunkt die seitliche
		Geschwindigkeit an, wird die relative Geschwindigkeit klein — und die Arme müssen
		den Ball nur noch fein treffen statt weit hinterherzuhechten.
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

	.rv-status {
		display: flex; align-items: center; gap: 0.6rem;
		background: #f8fafc; border: 1px solid; border-left-width: 4px;
		border-radius: 0.5rem; padding: 0.7rem 1rem;
		font-size: 0.85rem; color: #334155; line-height: 1.5;
	}
	.rv-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

	.rv-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; }
	.rv-btn, .rv-btn-primary {
		padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem;
		font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s;
	}
	.rv-btn-primary { background: var(--color-primary, #1e3a5f); color: #fff; }
	.rv-btn-primary:hover { background: #2d5a8e; transform: translateY(-1px); }
	.rv-btn { background: #e2e8f0; color: #475569; }
	.rv-btn:hover { background: #cbd5e1; }

	.rv-seg {
		display: inline-flex; border: 1px solid #cbd5e1; border-radius: 0.5rem; overflow: hidden;
	}
	.rv-seg-btn {
		padding: 0.5rem 0.85rem; border: none; background: #f1f5f9; color: #64748b;
		font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
		border-left: 1px solid #cbd5e1;
	}
	.rv-seg-btn:first-child { border-left: none; }
	.rv-seg-btn:hover { background: #e2e8f0; }
	.rv-seg-btn.active { color: #fff; }
	.rv-seg-btn:nth-child(1).active { background: #16a34a; }
	.rv-seg-btn:nth-child(2).active { background: #f59e0b; }
	.rv-seg-btn:nth-child(3).active { background: #ef4444; }

	.rv-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.rv-note strong { color: #0369a1; }
	@media (max-width: 600px) {
		.rv-wrap { padding: 1rem; }
	}
</style>
