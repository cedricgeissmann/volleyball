<script>
	// @ts-nocheck
	/**
	 * HandVelocityAnimation.svelte
	 *
	 * Erklärt wie die Handgeschwindigkeit beim Volleyball-Aufschlag zustande kommt.
	 * Zeigt die kinematische Kette:
	 *   v_hand = v_lauf + v_hüfte + v_schulter
	 *   × η (Körperstabilität) = effektive Handgeschwindigkeit
	 *
	 * Animationsphasen:
	 *   0.00–0.30  Anlauf        — Strichmännchen läuft von links, v_lauf-Pfeil
	 *   0.30–0.55  Hüftdrehung   — Hüfte rotiert, v_hüfte addiert sich
	 *   0.55–0.80  Schulterrotation — Arm dreht durch, v_schulter addiert sich
	 *   0.80–1.00  Kontakt       — Hand trifft (gedachten) Ball, v_hand-Summe
	 *
	 * Steuerung:
	 *   - ▶ Starten / ■ Stop / ↺ Reset
	 *   - Slider: Frame-für-Frame durchgehen (0–100%)
	 *   - Parameter: Laufgeschwindigkeit, Hüftbeugungsgeschwindigkeit,
	 *                Schulterkraft, Körperstabilität
	 */

	// ─── Parameter-Bereiche ────────────────────────────────────────────────────
	const RUN_MIN       = 0.0;   const RUN_MAX       = 4.0;   const RUN_DEF       = 1.5;
	const HIP_MIN       = 0.0;   const HIP_MAX       = 5.0;   const HIP_DEF       = 2.0;
	const SHOULDER_MIN  = 2.0;   const SHOULDER_MAX  = 12.0;  const SHOULDER_DEF  = 6.0;
	const STABILITY_MIN = 0.20;  const STABILITY_MAX = 1.0;   const STABILITY_DEF = 0.75;

	// ─── SVG-Layout ────────────────────────────────────────────────────────────
	const SVG_W    = 640;
	const SVG_H    = 380;
	const GROUND_Y = SVG_H - 48;
	const CENTER_X = SVG_W / 2;   // Strichmännchen steht zentriert am Ende des Anlaufs

	// ─── LocalStorage ─────────────────────────────────────────────────────────
	const LS_KEY = 'vb_hand_velocity_v1';
	function loadState() {
		try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
	}
	function saveState(s) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ }
	}

	const saved = loadState();

	// ─── Reaktiver Zustand ─────────────────────────────────────────────────────
	let _runSpeed      = $state(saved?.runSpeed      ?? RUN_DEF);
	let _hipSpeed      = $state(saved?.hipSpeed      ?? HIP_DEF);
	let _shoulderSpeed = $state(saved?.shoulderSpeed ?? SHOULDER_DEF);
	let _stability     = $state(saved?.stability     ?? STABILITY_DEF);

	// LocalStorage-Sync
	$effect(() => {
		saveState({ runSpeed: _runSpeed, hipSpeed: _hipSpeed, shoulderSpeed: _shoulderSpeed, stability: _stability });
	});

	// ─── Physik ────────────────────────────────────────────────────────────────
	/**
	 * v_hand_eff = (_runSpeed + _hipSpeed + _shoulderSpeed) × _stability
	 * Die drei Komponenten summieren sich zur Rohhandgeschwindigkeit,
	 * multipliziert mit der Körperstabilität η ergibt die effektive Geschwindigkeit.
	 */
	let vRaw       = $derived(_runSpeed + _hipSpeed + _shoulderSpeed);
	let vHand      = $derived(vRaw * _stability);

	// Normalisierte Beiträge (für Pfeil-Längen)
	const V_MAX    = RUN_MAX + HIP_MAX + SHOULDER_MAX; // 21 m/s
	let normRun    = $derived(_runSpeed      / V_MAX);
	let normHip    = $derived(_hipSpeed      / V_MAX);
	let normShoul  = $derived(_shoulderSpeed / V_MAX);
	let normHand   = $derived(vHand          / V_MAX);

	// Farben pro Komponente
	const COL_RUN     = '#3b82f6';  // blau
	const COL_HIP     = '#f59e0b';  // amber
	const COL_SHOULDER= '#8b5cf6';  // violett
	const COL_HAND    = '#dc2626';  // rot

	// ─── Animations-State ─────────────────────────────────────────────────────
	let animState    = $state(/** @type {'idle'|'running'|'done'} */ ('idle'));
	let animProgress = $state(0); // 0..1
	/** @type {number|null} */
	let rafId = null;
	let animStartMs = 0;
	const ANIM_DURATION_MS = 3000; // 3s für komplette Animation

	function startAnimation() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		animProgress = 0;
		animState    = 'running';
		animStartMs  = performance.now();

		/** @param {number} now */
		function frame(now) {
			const elapsed  = now - animStartMs;
			const progress = Math.min(elapsed / ANIM_DURATION_MS, 1);
			animProgress = progress;
			if (progress < 1) {
				rafId = requestAnimationFrame(frame);
			} else {
				animProgress = 1;
				animState    = 'done';
				rafId        = null;
			}
		}
		rafId = requestAnimationFrame(frame);
	}

	function resetAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		animProgress = 0;
		animState    = 'idle';
	}

	// Slider-Input während Animation pausiert diese
	function onSliderInput() {
		if (animState === 'running') {
			if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
			animState = 'done';
		}
		if (animState === 'idle') animState = 'done';
	}

	$effect(() => {
		_runSpeed; _hipSpeed; _shoulderSpeed; _stability;
		resetAnimation();
	});
	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });

	// ─── Phasen-Grenzen ───────────────────────────────────────────────────────
	const P_RUN_END   = 0.32;
	const P_HIP_END   = 0.58;
	const P_SHOUL_END = 0.82;
	// 0.82–1.00: Kontakt

	/** Smooth-Clamp: 0→1 für t im Bereich [a, b] */
	function smoothstep(a, b, t) {
		const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
		return x * x * (3 - 2 * x);
	}

	// ─── Figur-Geometrie (animiert) ────────────────────────────────────────────
	/**
	 * Berechnet alle Gelenk-Positionen des Strichmännchens als Funktion von `p`.
	 *
	 * Phase 0–P_RUN_END   : Anlauf — Figur läuft von links nach CENTER_X
	 * Phase P_RUN_END–P_HIP_END : Hüfte dreht sich (Oberkörper kippt zurück, dann vor)
	 * Phase P_HIP_END–P_SHOUL_END: Schulterrotation — Arm dreht nach oben-vorne
	 * Phase P_SHOUL_END–1 : Kontakt — Arm gestreckt nach oben, Ball getroffen
	 */
	let fig = $derived((() => {
		const p = animProgress;

		// ── x-Position: Anlauf ──────────────────────────────────────────────
		// Strichmännchen startet links (START_X) und bewegt sich zu CENTER_X
		const START_X = 80;
		const runT    = smoothstep(0, P_RUN_END, p);
		const figX    = START_X + (CENTER_X - START_X) * runT;

		// ── Körpergrösse & Grundproportionen ────────────────────────────────
		const H         = 165;  // Körperhöhe in SVG-Pixeln
		const feetY     = GROUND_Y;
		const hipY0     = feetY - H * 0.44;
		const shouldY0  = feetY - H * 0.77;
		const headY0    = feetY - H * 0.91;
		const headR     = H * 0.07;

		// ── Anlauf: Bein-Swing ───────────────────────────────────────────────
		// Beine schwingen im Laufrhythmus (2 Schritte während Anlauf)
		const legSwing  = p < P_RUN_END
			? Math.sin(p * Math.PI * 4 / P_RUN_END) * 16 * runT
			: 0;

		// Nach dem Anlauf: Aufschlag-Stance (leicht breitbeinig)
		const legSpreadEnd = p >= P_RUN_END ? smoothstep(P_RUN_END, P_HIP_END, p) : 0;
		const legL_x  = figX - 7  - legSpreadEnd * 4;
		const legR_x  = figX + 7  + legSpreadEnd * 4;
		const legL_dy = legSwing;
		const legR_dy = -legSwing;

		// ── Hüfte: rotiert zurück dann vorne ─────────────────────────────────
		// Phase P_RUN_END..P_HIP_END: Hüfte dreht nach hinten (Ausholbewegung)
		// Hüft-offset: Hüfte bleibt über Füssen, aber Oberkörper kippt
		const hipRotT     = smoothstep(P_RUN_END, P_HIP_END, p);
		// Körperneigung: -15° (zurück) während Hüftdrehung, dann 0° bei Schulterphase
		const tiltBack    = smoothstep(P_RUN_END, (P_RUN_END + P_HIP_END) / 2, p);
		const tiltForward = smoothstep((P_RUN_END + P_HIP_END) / 2, P_HIP_END, p);
		const tiltDeg     = -18 * tiltBack + 8 * tiltForward;  // Grad, negativ = zurück
		const tiltRad     = tiltDeg * Math.PI / 180;

		// Hüfte — bleibt unten, Oberkörper-Neigung um Hüfte
		const hipX  = figX;
		const hipY  = hipY0;

		// Schulter folgt dem Oberkörper-Tilt um die Hüfte
		const bodyLen     = hipY0 - shouldY0;  // Länge Hüfte→Schulter
		const shouldX     = hipX  + Math.sin(tiltRad) * bodyLen;
		const shouldY     = hipY  - Math.cos(tiltRad) * bodyLen;

		// Kopf folgt Schulter
		const neckLen     = shouldY0 - headY0;
		const headX       = shouldX + Math.sin(tiltRad) * neckLen;
		const headY       = shouldY - Math.cos(tiltRad) * neckLen;

		// ── Schulter: Arm-Rotation ─────────────────────────────────────────
		// Phase P_HIP_END..P_SHOUL_END: Arm dreht von unten-hinten nach oben-vorne
		const armRotT     = smoothstep(P_HIP_END, P_SHOUL_END, p);
		const contactT    = smoothstep(P_SHOUL_END, 1.0, p);

		// Arm-Winkel (relativ zur Vertikalen durch Schulter):
		//   Ruhephase (Anlauf): Arm hängt locker (120° von oben = 30° nach hinten-unten)
		//   Schulterphase: dreht von -140° (hinter unten) nach +20° (leicht vorne)
		//   Kontakt: Arm gestreckt nach oben (+80° = leicht schräg nach oben vorne)
		let armAngleDeg;
		if (p < P_RUN_END) {
			// Arm schwingt locker beim Laufen (Gegenpendel zu Beinen)
			armAngleDeg = 30 + Math.sin(p * Math.PI * 4 / P_RUN_END) * 12;
		} else if (p < P_HIP_END) {
			// Ausholbewegung: Arm geht nach hinten-unten
			const t = smoothstep(P_RUN_END, P_HIP_END, p);
			armAngleDeg = 30 + t * (130 - 30);  // 30° → 130° (hinter unten)
		} else if (p < P_SHOUL_END) {
			// Schulterrotation: Arm dreht nach vorne-oben
			armAngleDeg = 130 - armRotT * (130 + 40);  // 130° → -40° (vorne oben)
		} else {
			// Kontakt: Arm voll gestreckt nach oben
			armAngleDeg = -40 - contactT * 30;  // -40° → -70° (steil oben)
		}

		// Schlagarm-Endpunkt (Länge = 0.45 × Körpergrösse)
		const armLen      = H * 0.45;
		const armAngleRad = armAngleDeg * Math.PI / 180;
		// Arm dreht um Schulter: Winkel relativ zu links (0=rechts, 90=oben)
		// Positive Winkel = nach hinten (links), negative = nach vorne (rechts)
		const armX2  = shouldX - Math.sin(armAngleRad) * armLen;
		const armY2  = shouldY - Math.cos(armAngleRad) * armLen;

		// Gegenarm (Gleichgewicht): leicht nach vorne-unten
		const cArmDeg     = -40 - tiltDeg * 0.3;
		const cArmRad     = cArmDeg * Math.PI / 180;
		const cArmLen     = H * 0.30;
		const cArmX2 = shouldX + Math.sin(cArmRad) * cArmLen * 0.6;
		const cArmY2 = shouldY + Math.cos(cArmRad) * cArmLen * 0.5;

		// Ellbogen (Mitte des Schlagarms)
		const elbowX = shouldX + (armX2 - shouldX) * 0.5;
		const elbowY = shouldY + (armY2 - shouldY) * 0.5;

		// ── Sichtbarkeit der Pfeile ──────────────────────────────────────────
		const showRun    = p > 0.02;
		const runAlpha   = smoothstep(0.02, 0.10, p) * (1 - smoothstep(P_HIP_END, P_SHOUL_END, p) * 0.4);
		const showHip    = p > P_RUN_END + 0.02;
		const hipAlpha   = smoothstep(P_RUN_END, P_HIP_END, p) * (1 - smoothstep(P_HIP_END + 0.05, P_SHOUL_END, p) * 0.4);
		const showShoul  = p > P_HIP_END + 0.02;
		const shoulAlpha = smoothstep(P_HIP_END, P_SHOUL_END, p);
		const showHand   = p > P_SHOUL_END;
		const handAlpha  = smoothstep(P_SHOUL_END, 1.0, p);

		return {
			figX, feetY, hipX, hipY, shouldX, shouldY, headX, headY, headR,
			armX2, armY2, elbowX, elbowY, cArmX2, cArmY2,
			legL_x, legR_x, legL_dy, legR_dy, legSpreadEnd,
			showRun, runAlpha, showHip, hipAlpha, showShoul, shoulAlpha, showHand, handAlpha,
		};
	})());

	// ─── Vektor-Pfeile ────────────────────────────────────────────────────────
	// Alle Pfeile starten an der Hand (armX2/armY2) und zeigen horizontal nach rechts
	// Längen proportional zu den Geschwindigkeiten (max 100px für V_MAX)
	const ARROW_SCALE = 130; // px pro normalisierte Einheit (Skalierung für Visualisierung)
	const ARROW_Y_BASE = 70; // y-Offset über der Hand für den gestapelten Vektor-Anzeige

	// Gestapelte Vektoren: nebeneinander gezeichnet als Addition
	let arrowRunLen   = $derived((_runSpeed      / V_MAX) * ARROW_SCALE * 2.5);
	let arrowHipLen   = $derived((_hipSpeed      / V_MAX) * ARROW_SCALE * 2.5);
	let arrowShoulLen = $derived((_shoulderSpeed / V_MAX) * ARROW_SCALE * 2.5);
	let arrowHandLen  = $derived((vHand          / V_MAX) * ARROW_SCALE * 2.5);

	// Phasen-Label
	let phaseLabel = $derived(
		animProgress <= 0.02   ? 'Bereit'                :
		animProgress < P_RUN_END   ? 'Anlauf'                :
		animProgress < P_HIP_END   ? 'Hüftdrehung'          :
		animProgress < P_SHOUL_END ? 'Schulterrotation'      :
		                             'Kontakt'
	);

	let phaseColor = $derived(
		animProgress <= 0.02   ? '#94a3b8'  :
		animProgress < P_RUN_END   ? COL_RUN    :
		animProgress < P_HIP_END   ? COL_HIP    :
		animProgress < P_SHOUL_END ? COL_SHOULDER :
		                             COL_HAND
	);

	// Geschwindigkeit der Hand (aktiv angezeigte Komponenten je nach Phase)
	let vDisplayed = $derived(
		animProgress < P_RUN_END   ? _runSpeed                               :
		animProgress < P_HIP_END   ? _runSpeed + _hipSpeed                   :
		animProgress < P_SHOUL_END ? _runSpeed + _hipSpeed + _shoulderSpeed  :
		                             vHand
	);

	// ─── Fortschrittsbalken-Konstanten (als $derived statt {@const}) ────────
	const BAR_Y_CONST = SVG_H - 42;
	const BAR_X_CONST = 20;
	const BAR_W_CONST = SVG_W - 40;
</script>

<div class="hv-wrapper">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="hv-header">
		<h3 class="hv-title">Kinematische Kette: Handgeschwindigkeit</h3>
		<p class="hv-subtitle">Wie Anlauf, Hüftdrehung und Schulterrotation die Handgeschwindigkeit aufbauen</p>
	</div>

	<!-- ── Steuerung ───────────────────────────────────────────────────────── -->
	<div class="hv-controls">

		<!-- Laufgeschwindigkeit -->
		<div class="hv-control-group">
			<span class="hv-label" style="color: {COL_RUN}">Laufgeschwindigkeit</span>
			<div class="hv-slider-group">
				<input type="range" class="hv-slider" style="accent-color: {COL_RUN}"
					min={RUN_MIN} max={RUN_MAX} step="0.1" bind:value={_runSpeed} />
				<span class="hv-slider-val">{_runSpeed.toFixed(1)} m/s</span>
			</div>
		</div>

		<!-- Hüftbeugungsgeschwindigkeit -->
		<div class="hv-control-group">
			<span class="hv-label" style="color: {COL_HIP}">Hüftdrehung</span>
			<div class="hv-slider-group">
				<input type="range" class="hv-slider" style="accent-color: {COL_HIP}"
					min={HIP_MIN} max={HIP_MAX} step="0.1" bind:value={_hipSpeed} />
				<span class="hv-slider-val">{_hipSpeed.toFixed(1)} m/s</span>
			</div>
		</div>

		<!-- Schulterkraft -->
		<div class="hv-control-group">
			<span class="hv-label" style="color: {COL_SHOULDER}">Schulterkraft / Armrotation</span>
			<div class="hv-slider-group">
				<input type="range" class="hv-slider" style="accent-color: {COL_SHOULDER}"
					min={SHOULDER_MIN} max={SHOULDER_MAX} step="0.1" bind:value={_shoulderSpeed} />
				<span class="hv-slider-val">{_shoulderSpeed.toFixed(1)} m/s</span>
			</div>
		</div>

		<!-- Körperstabilität -->
		<div class="hv-control-group">
			<span class="hv-label">Körperstabilität η</span>
			<div class="hv-slider-group">
				<input type="range" class="hv-slider"
					min={STABILITY_MIN} max={STABILITY_MAX} step="0.01" bind:value={_stability} />
				<span class="hv-slider-val">{(_stability * 100).toFixed(0)}%</span>
			</div>
		</div>

	</div>

	<!-- ── SVG ──────────────────────────────────────────────────────────────── -->
	<div class="hv-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="hv-svg"
			role="img"
			aria-label="Handgeschwindigkeit kinematische Kette"
		>
			<defs>
				<marker id="hv-arr-run"    markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={COL_RUN} />
				</marker>
				<marker id="hv-arr-hip"    markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={COL_HIP} />
				</marker>
				<marker id="hv-arr-shoul"  markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={COL_SHOULDER} />
				</marker>
				<marker id="hv-arr-hand"   markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={COL_HAND} />
				</marker>
			</defs>

			<!-- Hintergrund -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />
			<!-- Boden -->
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />
			<!-- Boden-Linie -->
			<line x1="20" y1={GROUND_Y} x2={SVG_W - 20} y2={GROUND_Y} stroke="#cbd5e1" stroke-width="1.5" />

			<!-- ── Laufrichtungs-Marker (Boden) ──────────────────────────────── -->
			{#if animProgress < P_RUN_END && animProgress > 0.01}
				<!-- Laufspuren (Pfeile am Boden) -->
				{#each [0.08, 0.16, 0.24] as xFrac}
					{#if animProgress > xFrac}
						{@const traceX = 80 + xFrac * (CENTER_X - 80) / P_RUN_END}
						<text x={traceX} y={GROUND_Y + 18} text-anchor="middle"
							fill={COL_RUN} font-size="11" opacity={0.3 + xFrac}>›</text>
					{/if}
				{/each}
			{/if}

			<!-- ── Strichmännchen ─────────────────────────────────────────────── -->
			<!-- Schatten -->
			<ellipse
				cx={fig.figX} cy={GROUND_Y - 1}
				rx={14 + fig.legSpreadEnd * 4} ry="3"
				fill="#94a3b8" opacity="0.2"
			/>

			<!-- Linkes Bein -->
			<line
				x1={fig.hipX} y1={fig.hipY}
				x2={fig.legL_x} y2={fig.feetY + fig.legL_dy}
				stroke="#334155" stroke-width="2.5" stroke-linecap="round"
			/>
			<!-- Rechtes Bein -->
			<line
				x1={fig.hipX} y1={fig.hipY}
				x2={fig.legR_x} y2={fig.feetY + fig.legR_dy}
				stroke="#334155" stroke-width="2.5" stroke-linecap="round"
			/>

			<!-- Körper (Hüfte → Schulter) -->
			<line
				x1={fig.hipX} y1={fig.hipY}
				x2={fig.shouldX} y2={fig.shouldY}
				stroke="#1e3a5f" stroke-width="3" stroke-linecap="round"
			/>

			<!-- Gegenarm -->
			<line
				x1={fig.shouldX} y1={fig.shouldY}
				x2={fig.cArmX2} y2={fig.cArmY2}
				stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" opacity="0.6"
			/>

			<!-- Schlagarm: Schulter → Ellbogen → Hand -->
			<line
				x1={fig.shouldX} y1={fig.shouldY}
				x2={fig.elbowX} y2={fig.elbowY}
				stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"
			/>
			<line
				x1={fig.elbowX} y1={fig.elbowY}
				x2={fig.armX2} y2={fig.armY2}
				stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round"
			/>

			<!-- Kopf -->
			<circle cx={fig.headX} cy={fig.headY} r={fig.headR} fill="#fbbf24" opacity="0.9" />

			<!-- ── Hüft-Rotations-Marker ──────────────────────────────────────── -->
			{#if fig.showHip}
				<!-- Bogenpfeil um die Hüfte -->
				{@const arcR = 22}
				{@const arcStart = Math.PI * 0.2}
				{@const arcEnd   = Math.PI * 0.8}
				{@const ax1 = fig.hipX + arcR * Math.cos(arcStart + Math.PI)}
				{@const ay1 = fig.hipY - arcR * Math.sin(arcStart)}
				{@const ax2 = fig.hipX + arcR * Math.cos(arcEnd + Math.PI)}
				{@const ay2 = fig.hipY - arcR * Math.sin(arcEnd)}
				<path
					d="M {ax1} {ay1} A {arcR} {arcR} 0 0 1 {ax2} {ay2}"
					fill="none"
					stroke={COL_HIP}
					stroke-width="2"
					stroke-linecap="round"
					opacity={fig.hipAlpha * 0.7}
					marker-end="url(#hv-arr-hip)"
				/>
				<circle cx={fig.hipX} cy={fig.hipY} r="4"
					fill={COL_HIP} opacity={fig.hipAlpha * 0.5} />
			{/if}

			<!-- ── Schulter-Rotations-Marker ──────────────────────────────────── -->
			{#if fig.showShoul}
				{@const arcR2 = 18}
				{@const as1 = Math.PI * 0.1}
				{@const as2 = Math.PI * 0.75}
				{@const sx1 = fig.shouldX + arcR2 * Math.cos(as1 + Math.PI)}
				{@const sy1 = fig.shouldY - arcR2 * Math.sin(as1)}
				{@const sx2 = fig.shouldX + arcR2 * Math.cos(as2 + Math.PI)}
				{@const sy2 = fig.shouldY - arcR2 * Math.sin(as2)}
				<path
					d="M {sx1} {sy1} A {arcR2} {arcR2} 0 0 1 {sx2} {sy2}"
					fill="none"
					stroke={COL_SHOULDER}
					stroke-width="2"
					stroke-linecap="round"
					opacity={fig.shoulAlpha * 0.7}
					marker-end="url(#hv-arr-shoul)"
				/>
				<circle cx={fig.shouldX} cy={fig.shouldY} r="4"
					fill={COL_SHOULDER} opacity={fig.shoulAlpha * 0.5} />
			{/if}

			<!-- ── Kontakt-Markierung (Ball-Position) ─────────────────────────── -->
			{#if animProgress >= P_SHOUL_END}
				{@const bx = fig.armX2 + 12}
				{@const by = fig.armY2}
				{@const contactAlpha = Math.min((animProgress - P_SHOUL_END) / 0.1, 1)}
				<!-- Ball -->
				<circle cx={bx} cy={by} r="12" fill="white"
					stroke={COL_HAND} stroke-width="1.8" opacity={contactAlpha * 0.9} />
				<path d="M {bx - 8} {by} Q {bx} {by - 5} {bx + 8} {by}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity={contactAlpha * 0.6} />
				<path d="M {bx - 8} {by} Q {bx} {by + 5} {bx + 8} {by}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity={contactAlpha * 0.6} />
				<line x1={bx} y1={by - 11} x2={bx} y2={by + 11}
					stroke="#e2e8f0" stroke-width="0.7" opacity={contactAlpha * 0.6} />
			{/if}

			<!-- ── Vektor-Anzeige (gestapelte Pfeile an der Hand) ────────────── -->
			<!-- Alle Pfeile starten an der Hand, zeigen nach rechts (Bewegungsrichtung) -->
			<!-- Anzeige oben rechts im SVG als Panel -->
			{#if animProgress > 0.02}
				{@const px = 380}
				{@const py = 50}
				{@const barH = 18}
				{@const spacing = 26}

				<!-- Hintergrund-Box -->
				<rect x={px - 12} y={py - 16} width={220} height={155} rx="8"
					fill="white" stroke="#e2e8f0" stroke-width="1" opacity="0.95" />
				<text x={px} y={py - 2} fill="#475569" font-size="9" font-family="sans-serif"
					font-weight="600">Kinematische Kette</text>

				<!-- v_lauf -->
				{#if fig.showRun}
					<text x={px} y={py + spacing * 1 + 3} fill={COL_RUN}
						font-size="9" font-family="sans-serif" opacity={fig.runAlpha}>
						v<tspan baseline-shift="sub" font-size="7">Lauf</tspan>
					</text>
					<rect x={px + 28} y={py + spacing * 1 - 8} height={barH - 4}
						width={Math.max(2, arrowRunLen)} rx="3" fill={COL_RUN} opacity={fig.runAlpha * 0.85} />
					<text x={px + 32 + arrowRunLen} y={py + spacing * 1 + 3}
						fill={COL_RUN} font-size="8" font-family="monospace" opacity={fig.runAlpha}>
						{_runSpeed.toFixed(1)} m/s
					</text>
				{/if}

				<!-- v_hüfte -->
				{#if fig.showHip}
					<text x={px} y={py + spacing * 2 + 3} fill={COL_HIP}
						font-size="9" font-family="sans-serif" opacity={fig.hipAlpha}>
						v<tspan baseline-shift="sub" font-size="7">Hüfte</tspan>
					</text>
					<rect x={px + 28} y={py + spacing * 2 - 8} height={barH - 4}
						width={Math.max(2, arrowHipLen)} rx="3" fill={COL_HIP} opacity={fig.hipAlpha * 0.85} />
					<text x={px + 32 + arrowHipLen} y={py + spacing * 2 + 3}
						fill={COL_HIP} font-size="8" font-family="monospace" opacity={fig.hipAlpha}>
						{_hipSpeed.toFixed(1)} m/s
					</text>
				{/if}

				<!-- v_schulter -->
				{#if fig.showShoul}
					<text x={px} y={py + spacing * 3 + 3} fill={COL_SHOULDER}
						font-size="9" font-family="sans-serif" opacity={fig.shoulAlpha}>
						v<tspan baseline-shift="sub" font-size="7">Arm</tspan>
					</text>
					<rect x={px + 28} y={py + spacing * 3 - 8} height={barH - 4}
						width={Math.max(2, arrowShoulLen)} rx="3" fill={COL_SHOULDER} opacity={fig.shoulAlpha * 0.85} />
					<text x={px + 32 + arrowShoulLen} y={py + spacing * 3 + 3}
						fill={COL_SHOULDER} font-size="8" font-family="monospace" opacity={fig.shoulAlpha}>
						{_shoulderSpeed.toFixed(1)} m/s
					</text>
				{/if}

				<!-- Trennlinie vor v_hand -->
				{#if fig.showHand}
					<line x1={px} y1={py + spacing * 3.7} x2={px + 195} y2={py + spacing * 3.7}
						stroke="#cbd5e1" stroke-width="1" opacity={fig.handAlpha} />
					<text x={px} y={py + spacing * 3.8 + 10} fill="#94a3b8"
						font-size="8" font-family="sans-serif" opacity={fig.handAlpha}>
						× η ({(_stability * 100).toFixed(0)}%) =
					</text>
					<!-- v_hand (effektiv) -->
					<text x={px} y={py + spacing * 4.7 + 3} fill={COL_HAND}
						font-size="10" font-family="sans-serif" font-weight="700" opacity={fig.handAlpha}>
						v<tspan baseline-shift="sub" font-size="8">Hand</tspan>
					</text>
					<rect x={px + 32} y={py + spacing * 4.7 - 9} height={barH}
						width={Math.max(2, arrowHandLen)} rx="3" fill={COL_HAND} opacity={fig.handAlpha * 0.9} />
					<text x={px + 36 + arrowHandLen} y={py + spacing * 4.7 + 3}
						fill={COL_HAND} font-size="9" font-family="monospace" font-weight="700" opacity={fig.handAlpha}>
						{vHand.toFixed(1)} m/s
					</text>
				{/if}
			{/if}

			<!-- ── Phasen-Label ───────────────────────────────────────────────── -->
			<rect x={SVG_W / 2 - 70} y={SVG_H - 30} width="140" height="22" rx="5"
				fill={phaseColor} opacity="0.12" />
			<text x={SVG_W / 2} y={SVG_H - 14} text-anchor="middle"
				fill={phaseColor} font-size="11" font-family="sans-serif" font-weight="700">
				{phaseLabel}
			</text>

			<!-- ── Phasen-Fortschrittsbalken (unten) ─────────────────────────── -->
			<!-- Hintergrund -->
			<rect x={BAR_X_CONST} y={BAR_Y_CONST} width={BAR_W_CONST} height="5" rx="2.5" fill="#e2e8f0" />
			<!-- Anlauf-Segment -->
			<rect x={BAR_X_CONST} y={BAR_Y_CONST} width={P_RUN_END * BAR_W_CONST} height="5" rx="2.5" fill={COL_RUN} opacity="0.4" />
			<!-- Hüft-Segment -->
			<rect x={BAR_X_CONST + P_RUN_END * BAR_W_CONST} y={BAR_Y_CONST}
				width={(P_HIP_END - P_RUN_END) * BAR_W_CONST} height="5" fill={COL_HIP} opacity="0.4" />
			<!-- Schulter-Segment -->
			<rect x={BAR_X_CONST + P_HIP_END * BAR_W_CONST} y={BAR_Y_CONST}
				width={(P_SHOUL_END - P_HIP_END) * BAR_W_CONST} height="5" fill={COL_SHOULDER} opacity="0.4" />
			<!-- Kontakt-Segment -->
			<rect x={BAR_X_CONST + P_SHOUL_END * BAR_W_CONST} y={BAR_Y_CONST}
				width={(1 - P_SHOUL_END) * BAR_W_CONST} height="5" rx="2.5" fill={COL_HAND} opacity="0.4" />
			<!-- Fortschritt-Fill -->
			<rect x={BAR_X_CONST} y={BAR_Y_CONST} width={animProgress * BAR_W_CONST} height="5" rx="2.5"
				fill={phaseColor} opacity="0.7" />
			<!-- Cursor -->
			<circle cx={BAR_X_CONST + animProgress * BAR_W_CONST} cy={BAR_Y_CONST + 2.5} r="5"
				fill={phaseColor} stroke="white" stroke-width="1.5" />

		</svg>
	</div>

	<!-- ── Frame-Slider ──────────────────────────────────────────────────────── -->
	<div class="hv-frame-row">
		<span class="hv-frame-label">Frame</span>
		<input
			type="range"
			class="hv-frame-slider"
			min="0" max="1" step="0.002"
			bind:value={animProgress}
			oninput={onSliderInput}
		/>
		<span class="hv-frame-val">{(animProgress * 100).toFixed(0)}%</span>
		<span class="hv-phase-badge" style="background: {phaseColor}20; color: {phaseColor}; border-color: {phaseColor}40">
			{phaseLabel}
		</span>
	</div>

	<!-- ── Aktions-Zeile ─────────────────────────────────────────────────────── -->
	<div class="hv-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="hv-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Animation starten'}
			</button>
		{:else}
			<button class="hv-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Ergebnis-Panel ─────────────────────────────────────────────────────── -->
	<div class="hv-result-panel">
		<div class="hv-result-item">
			<span class="hv-result-label" style="color: {COL_RUN}">v<sub>Lauf</sub></span>
			<span class="hv-result-value" style="color: {COL_RUN}">{_runSpeed.toFixed(1)}</span>
			<span class="hv-result-unit">m/s</span>
		</div>
		<span class="hv-plus">+</span>
		<div class="hv-result-item">
			<span class="hv-result-label" style="color: {COL_HIP}">v<sub>Hüfte</sub></span>
			<span class="hv-result-value" style="color: {COL_HIP}">{_hipSpeed.toFixed(1)}</span>
			<span class="hv-result-unit">m/s</span>
		</div>
		<span class="hv-plus">+</span>
		<div class="hv-result-item">
			<span class="hv-result-label" style="color: {COL_SHOULDER}">v<sub>Arm</sub></span>
			<span class="hv-result-value" style="color: {COL_SHOULDER}">{_shoulderSpeed.toFixed(1)}</span>
			<span class="hv-result-unit">m/s</span>
		</div>
		<div class="hv-eta-row">
			<span class="hv-eta-sym">× η = {(_stability * 100).toFixed(0)}%</span>
		</div>
		<div class="hv-result-divider"></div>
		<div class="hv-result-item hv-result-total">
			<span class="hv-result-label" style="color: {COL_HAND}">v<sub>Hand</sub></span>
			<span class="hv-result-value hv-total-val" style="color: {COL_HAND}">{vHand.toFixed(1)}</span>
			<span class="hv-result-unit" style="color: {COL_HAND}">m/s</span>
		</div>
	</div>

</div>

<style>
	.hv-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	/* ── Header ──────────────────────────────────────────── */
	.hv-header { display: flex; flex-direction: column; gap: 0.2rem; }
	.hv-title {
		font-size: 1.1rem; font-weight: 700; color: #1e293b;
		margin: 0; font-family: inherit;
	}
	.hv-subtitle {
		font-size: 0.82rem; color: #94a3b8;
		margin: 0; font-style: italic; font-family: inherit;
	}

	/* ── Steuerung ───────────────────────────────────────── */
	.hv-controls { display: flex; flex-direction: column; gap: 0.45rem; }
	.hv-control-group {
		display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
	}
	.hv-label {
		font-size: 0.875rem; font-weight: 500; color: #64748b;
		min-width: 195px; white-space: nowrap; font-family: inherit;
	}
	.hv-slider-group { display: flex; align-items: center; gap: 0.5rem; }
	.hv-slider { width: 155px; cursor: pointer; }
	.hv-slider-val {
		font-size: 0.875rem; font-weight: 600; color: #1e293b;
		font-family: 'Courier New', monospace; min-width: 4rem;
	}

	/* ── SVG ─────────────────────────────────────────────── */
	.hv-svg-wrapper { width: 100%; }
	.hv-svg {
		width: 100%; height: auto; display: block;
		border-radius: 0.5rem; border: 1px solid #e2e8f0;
	}

	/* ── Frame-Slider ────────────────────────────────────── */
	.hv-frame-row {
		display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
	}
	.hv-frame-label {
		font-size: 0.8rem; font-weight: 600; color: #64748b;
		font-family: inherit; white-space: nowrap;
	}
	.hv-frame-slider {
		flex: 1; min-width: 120px; max-width: 360px;
		accent-color: #475569; cursor: pointer;
	}
	.hv-frame-val {
		font-size: 0.8rem; font-weight: 700; color: #1e293b;
		font-family: 'Courier New', monospace; min-width: 3rem;
	}
	.hv-phase-badge {
		font-size: 0.78rem; font-weight: 600;
		padding: 0.2rem 0.65rem; border-radius: 999px;
		border: 1px solid transparent; font-family: inherit;
	}

	/* ── Aktions-Zeile ────────────────────────────────────── */
	.hv-action-row { display: flex; justify-content: center; }
	.hv-start-btn, .hv-reset-btn {
		padding: 0.55rem 2.5rem; border-radius: 0.5rem; border: none;
		font-size: 1rem; font-weight: 700; cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.hv-start-btn {
		background: #ff3500; color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.hv-start-btn:hover { background: #e62f00; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,53,0,0.28); }
	.hv-start-btn:active { transform: translateY(0); }
	.hv-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.hv-reset-btn:hover { background: #e2e8f0; }

	/* ── Ergebnis-Panel ───────────────────────────────────── */
	.hv-result-panel {
		display: flex; align-items: center; justify-content: center;
		gap: 0.75rem; flex-wrap: wrap;
		background: #f8fafc; border: 1px solid #e2e8f0;
		border-radius: 0.5rem; padding: 0.85rem 1rem;
	}
	.hv-result-item {
		display: flex; flex-direction: column; align-items: center; gap: 1px;
	}
	.hv-result-label {
		font-size: 0.7rem; color: #94a3b8; text-transform: uppercase;
		letter-spacing: 0.06em; font-family: inherit;
	}
	.hv-result-value {
		font-size: 1.2rem; font-weight: 700; color: #1e293b;
		font-family: 'Courier New', monospace;
	}
	.hv-total-val { font-size: 1.5rem; }
	.hv-result-unit { font-size: 0.7rem; color: #94a3b8; font-family: inherit; }
	.hv-plus { font-size: 1.3rem; font-weight: 700; color: #94a3b8; padding: 0 0.1rem; }
	.hv-eta-row {
		display: flex; align-items: center;
		font-size: 0.9rem; color: #64748b; font-family: 'Courier New', monospace;
	}
	.hv-eta-sym { padding: 0 0.25rem; }
	.hv-result-divider { width: 1.5px; height: 48px; background: #e2e8f0; margin: 0 0.25rem; }
	.hv-result-total { padding-left: 0.25rem; }

	/* ── Responsive ───────────────────────────────────────── */
	@media (max-width: 600px) {
		.hv-wrapper { padding: 1rem; }
		.hv-control-group { flex-direction: column; align-items: flex-start; }
		.hv-label { min-width: unset; }
		.hv-slider { width: 130px; }
		.hv-result-panel { gap: 0.5rem; }
	}
</style>
