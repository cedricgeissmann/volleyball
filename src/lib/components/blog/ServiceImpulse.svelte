<script>
	// @ts-nocheck
	/**
	 * ServiceImpulse.svelte
	 *
	 * Interaktives Applet zur Impulserhaltung beim Volleyball-Aufschlag.
	 * Perspektive: Seitenriss (wie AttackTimingAnimation) — Blick von der Seite.
	 *   - SVG-x = Feldtiefe (Grundlinie links → Netz → gegenüberliegende Grundlinie rechts)
	 *   - SVG-y = Höhe über Boden
	 *
	 * Physikmodell (Impulserhaltung):
	 *   1. Körperimpuls: p_körper = m_körper × v_lauf
	 *   2. Handgeschwindigkeit: v_hand = v_lauf + v_schulter
	 *      (Schulterkraft addiert sich zur Laufgeschwindigkeit)
	 *   3. Ballimpuls nach Kontakt (vereinfachter inelastischer Stoss):
	 *      p_ball = η × m_körper × v_hand / (1 + m_ball / m_körper)
	 *      → η = Körperstabilität (0..1): wie viel der Handgeschwindigkeit
	 *        tatsächlich auf den Ball übertragen wird
	 *   4. Ballgeschwindigkeit: v_ball = p_ball / m_ball
	 *   5. Flugbahn: standard parabolisch mit Luftwiderstand-Näherung
	 */

	// ─── Physik-Konstanten ────────────────────────────────────────────────────────
	const G = 9.81;          // m/s²
	const BALL_MASS = 0.27;  // kg (FIVB)

	// Netzhöhen
	const NET_HEIGHTS = [
		{ id: 'herren', label: 'Herren', heightM: 2.43 },
		{ id: 'damen',  label: 'Damen',  heightM: 2.24 },
	];

	// Feldgeometrie (Seitenriss: 18m Gesamtlänge, Netz in der Mitte)
	const FIELD_DEPTH_M  = 18.0;  // Gesamtfeldlänge
	const NET_X_M        = 9.0;   // Netzposition
	const SERVE_X_M      = 0.5;   // Aufschlagsposition (hinter Grundlinie)
	const BALL_RADIUS_M  = 0.105;

	// Aufschlag-Höhe: Treffpunkt des Balls
	const HIT_HEIGHT_MIN_M = 2.0;
	const HIT_HEIGHT_MAX_M = 3.5;
	const HIT_HEIGHT_DEF_M = 2.8;

	// ─── Parameter-Bereiche ───────────────────────────────────────────────────────
	const RUN_SPEED_MIN    = 0.0;   // m/s (stehend)
	const RUN_SPEED_MAX    = 4.0;   // m/s (schneller Anlauf)
	const RUN_SPEED_DEF    = 1.5;   // m/s

	const SHOULDER_SPEED_MIN = 2.0;  // m/s (schwacher Arm)
	const SHOULDER_SPEED_MAX = 12.0; // m/s (sehr starker Arm)
	const SHOULDER_SPEED_DEF = 6.0;  // m/s

	const STABILITY_MIN    = 0.2;   // (20% Übertragung — sehr wackelig)
	const STABILITY_MAX    = 1.0;   // (100% — perfekte Standfestigkeit)
	const STABILITY_DEF    = 0.7;   // (70%)

	const HIT_ANGLE_MIN    = -20;   // Grad (sehr flach / ins Netz-risiko)
	const HIT_ANGLE_MAX    = 40;    // Grad (steil aufwärts)
	const HIT_ANGLE_DEF    = 5;     // Grad (leicht aufwärts)

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W      = 680;
	const SVG_H      = 380;
	const PX_PER_M   = 30;          // Pixel pro Meter (Tiefe)
	const PX_PER_M_Y = 55;          // Pixel pro Meter (Höhe — stärker skaliert)
	const MARGIN_L   = 52;          // links: Platz für y-Achse
	const MARGIN_R   = 20;
	const GROUND_Y   = SVG_H - 40;  // Boden-y in SVG

	// Feldgrenzen im SVG
	const FIELD_LEFT  = MARGIN_L;
	const FIELD_RIGHT = MARGIN_L + FIELD_DEPTH_M * PX_PER_M;
	const FIELD_W_PX  = FIELD_DEPTH_M * PX_PER_M;

	// Netz-SVG-x
	const NET_SVG_X    = FIELD_LEFT + NET_X_M * PX_PER_M;
	// Angriffslinie (3m hinter Netz, Aufschlagseite)
	const ATT_LINE_SVG = FIELD_LEFT + (NET_X_M - 3) * PX_PER_M;

	/** @param {number} xM — Tiefe in Metern */
	function fx(xM) { return FIELD_LEFT + xM * PX_PER_M; }
	/** @param {number} yM — Höhe in Metern */
	function fy(yM) { return GROUND_Y - yM * PX_PER_M_Y; }

	// ─── Physik: Impulsberechnung ──────────────────────────────────────────────────
	/**
	 * Berechnet alle Impulse und die Ballgeschwindigkeit.
	 *
	 * Modell:
	 *   v_hand = v_lauf + v_schulter
	 *   p_ball = η × m_ball × v_hand
	 *   v_ball = p_ball / m_ball = η × v_hand
	 *
	 * (Körpermasse spielt keine Rolle, da m_ball << m_körper für alle realistischen
	 *  Körpermassen — der Massenterm 2m/(m+M) → 2 für M >> m)
	 *
	 * @param {number} runSpeed      — m/s
	 * @param {number} shoulderSpeed — m/s (zusätzliche Armgeschwindigkeit)
	 * @param {number} stability     — 0..1
	 */
	function calcImpulse(runSpeed, shoulderSpeed, stability) {
		const vHand   = runSpeed + shoulderSpeed;
		const pBall   = stability * BALL_MASS * vHand;
		const vBall   = pBall / BALL_MASS;  // = stability × vHand
		return { vHand, pBall, vBall };
	}

	/**
	 * Berechnet die Ballflugbahn (parabolisch, Seitenriss).
	 *
	 * Startpunkt: (SERVE_X_M, hitHeightM)
	 * Richtung: Winkel hitAngleDeg über Horizontal, in Richtung +x (Netz)
	 *
	 * @param {number} vBall       — m/s Ballgeschwindigkeit
	 * @param {number} hitAngleDeg — Schlagwinkel in Grad
	 * @param {number} hitHeightM  — Treffpunkthöhe in m
	 * @param {number} netHeightM  — Netzhöhe in m
	 */
	function calcTrajectory(vBall, hitAngleDeg, hitHeightM, netHeightM) {
		const angleRad = hitAngleDeg * Math.PI / 180;
		const vx = vBall * Math.cos(angleRad);
		const vy = vBall * Math.sin(angleRad);

		const x0 = SERVE_X_M;
		const y0 = hitHeightM;

		const N = 200;
		/** @type {{xM: number, yM: number, t: number}[]} */
		const points = [];

		// Maximale Flugzeit: bis der Ball den Boden oder das Ende des Feldes erreicht
		// t_land = (vy + sqrt(vy² + 2G*y0)) / G
		const disc = vy * vy + 2 * G * y0;
		const tLand = disc >= 0 ? (vy + Math.sqrt(disc)) / G : 10;
		const tMax  = Math.min(tLand, (FIELD_DEPTH_M - x0) / Math.max(vx, 0.01));

		let netHit   = false;  // trifft das Netz
		let outOfBounds = false;  // landet im Aus (hinter Grundlinie)
		let landXM   = x0;
		let netCrossT = -1;

		for (let i = 0; i <= N; i++) {
			const t  = (i / N) * tMax;
			const xM = x0 + vx * t;
			const yM = y0 + vy * t - 0.5 * G * t * t;

			points.push({ xM, yM: Math.max(0, yM), t });

			// Netz-Kreuzung finden
			if (netCrossT < 0 && xM >= NET_X_M) {
				netCrossT = t;
			}

			if (yM <= 0 && i > 0) {
				// Aufprallpunkt interpolieren
				const prev = points[i - 1];
				const frac = prev.yM / (prev.yM - yM);
				landXM = prev.xM + frac * (xM - prev.xM);
				break;
			}
		}

		// Höhe am Netz
		let netHeightAtCross = -1;
		if (netCrossT > 0) {
			netHeightAtCross = y0 + vy * netCrossT - 0.5 * G * netCrossT * netCrossT;
		}

		// Netz getroffen?
		if (netHeightAtCross >= 0 && netHeightAtCross < netHeightM) {
			netHit = true;
		}

		// Aus? (Ball landet hinter der gegnerischen Grundlinie)
		if (landXM > FIELD_DEPTH_M) {
			outOfBounds = true;
			landXM = FIELD_DEPTH_M;
		}

		// Netzdurchgang-Fortschritt
		const netCrossProgress = netCrossT > 0 ? netCrossT / tMax : 1.0;

		return {
			points,
			tMax,
			landXM,
			netHeightAtCross,
			netHit,
			outOfBounds,
			netCrossProgress,
			vx,
			vy,
		};
	}

	// ─── LocalStorage Helpers ─────────────────────────────────────────────────────
	const LS_KEY = 'vb_service_impulse_v1';

	function loadState() {
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch { return null; }
	}

	function saveState(s) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ }
	}

	// ─── Reaktiver Zustand ────────────────────────────────────────────────────────
	const saved = loadState();

	let _runSpeed      = $state(saved?.runSpeed      ?? RUN_SPEED_DEF);
	let _shoulderSpeed = $state(saved?.shoulderSpeed ?? SHOULDER_SPEED_DEF);
	let _stability     = $state(saved?.stability     ?? STABILITY_DEF);
	let _hitAngle      = $state(saved?.hitAngle      ?? HIT_ANGLE_DEF);
	let _hitHeight     = $state(saved?.hitHeight     ?? HIT_HEIGHT_DEF_M);
	let _netId         = $state(saved?.netId         ?? 'herren');

	let selectedNet = $derived(NET_HEIGHTS.find(n => n.id === _netId) ?? NET_HEIGHTS[0]);
	let netHeightM  = $derived(selectedNet.heightM);

	// Impuls-Berechnungen
	let impulse = $derived(calcImpulse(_runSpeed, _shoulderSpeed, _stability));
	let traj    = $derived(calcTrajectory(impulse.vBall, _hitAngle, _hitHeight, netHeightM));

	// Impuls-Kategorien für Farbkodierung
	let ballSpeedKmh = $derived(impulse.vBall * 3.6);
	let speedColor   = $derived(
		impulse.vBall < 12 ? '#64748b' :
		impulse.vBall < 18 ? '#16a34a' :
		impulse.vBall < 24 ? '#d97706' : '#dc2626'
	);

	// Ergebnis-Status
	let serveStatus = $derived(
		traj.netHit       ? 'net' :
		traj.outOfBounds  ? 'out' :
		                    'in'
	);

	let statusColor = $derived(
		serveStatus === 'net' ? '#dc2626' :
		serveStatus === 'out' ? '#d97706' :
		                        '#16a34a'
	);

	let statusLabel = $derived(
		serveStatus === 'net' ? 'Netz!' :
		serveStatus === 'out' ? 'Aus!' :
		                        'Drinnen'
	);

	// LocalStorage-Sync
	$effect(() => {
		saveState({
			runSpeed: _runSpeed,
			shoulderSpeed: _shoulderSpeed,
			stability: _stability,
			hitAngle: _hitAngle,
			hitHeight: _hitHeight,
			netId: _netId,
		});
	});

	// ─── Animation ────────────────────────────────────────────────────────────────
	let animState    = $state(/** @type {'idle'|'running'|'done'} */ ('idle'));
	let animProgress = $state(0);
	/** @type {number|null} */
	let rafId        = null;
	let animStartMs  = 0;
	const ANIM_SPEED = 0.4; // Verlangsamt-Faktor (0.4 = 40% Echtzeit)

	function startAnimation() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		animProgress = 0;
		animState    = 'running';
		animStartMs  = performance.now();
		const durationMs = (traj.tMax / ANIM_SPEED) * 1000;

		/** @param {number} now */
		function frame(now) {
			const elapsed  = now - animStartMs;
			const progress = Math.min(elapsed / durationMs, 1);
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

	$effect(() => {
		_runSpeed; _shoulderSpeed; _stability; _hitAngle; _hitHeight; _netId;
		resetAnimation();
	});
	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });

	// ─── SVG-Hilfswerte ───────────────────────────────────────────────────────────
	// Aktueller Ball-Punkt
	let ballPt = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0) return { xM: SERVE_X_M, yM: _hitHeight, t: 0 };
		const idx = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		return pts[Math.max(0, idx)];
	});

	// Trail (Spur)
	let trailPath = $derived(() => {
		const pts = traj.points;
		if (pts.length < 2 || animProgress === 0) return '';
		const end = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		return pts.slice(0, end + 1)
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`)
			.join(' ');
	});

	// Vorschau-Pfad
	let previewPath = $derived(() => {
		const pts = traj.points;
		if (pts.length < 2) return '';
		return pts.map((p, i) =>
			`${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`
		).join(' ');
	});

	// Netz-Variablen
	let netTopY    = $derived(fy(netHeightM));
	let netBottomY = $derived(fy(netHeightM - 1.0));
	let postTopY   = $derived(netTopY);

	// Aufschläger-Geometrie (Strichmännchen) — Seitenriss
	const PLAYER_HEIGHT_M = 1.85;
	let playerGeo = $derived((() => {
		const h = PLAYER_HEIGHT_M * PX_PER_M_Y;
		const x = fx(SERVE_X_M - 0.6);
		const feetY     = GROUND_Y;
		const hipY      = feetY - h * 0.45;
		const shoulderY = feetY - h * 0.78;
		const headY     = feetY - h * 0.92;
		const headR     = h * 0.07;
		// Schlagarm: gestreckt nach oben-rechts
		const armX2     = x + 18;
		const armY2     = shoulderY - 22;
		return { x, feetY, hipY, shoulderY, headY, headR, armX2, armY2 };
	})());

	// Impuls-Pfeil-Länge (skaliert auf Ballimpuls)
	const ARROW_BASE = 60;
	let arrowLen = $derived(Math.min(ARROW_BASE + impulse.pBall * 8, 160));

	// Kraft-Pfeil vom Treffpunkt (zeigt Schlagrichtung)
	let hitSvgX = $derived(fx(SERVE_X_M));
	let hitSvgY = $derived(fy(_hitHeight));
	let arrowAngleRad = $derived(_hitAngle * Math.PI / 180);
	let arrowX2 = $derived(hitSvgX + arrowLen * Math.cos(arrowAngleRad));
	let arrowY2 = $derived(hitSvgY - arrowLen * Math.sin(arrowAngleRad));

	// Impuls-Balken-Werte (normalisiert auf maximal möglichen Ballimpuls)
	const MAX_P_BALL = STABILITY_MAX * BALL_MASS * (RUN_SPEED_MAX + SHOULDER_SPEED_MAX);
	let pBallNorm    = $derived(Math.min(impulse.pBall / MAX_P_BALL, 1));
</script>

<div class="si-wrapper">

	<!-- ── Titel ──────────────────────────────────────────────────────────────── -->
	<div class="si-header">
		<h3 class="si-title">Impulserhaltung beim Aufschlag</h3>
		<p class="si-subtitle">Wie Laufgeschwindigkeit, Schulterkraft und Körperstabilität den Ballimpuls bestimmen</p>
	</div>

	<!-- ── Steuerung ──────────────────────────────────────────────────────────── -->
	<div class="si-controls">

		<!-- Laufgeschwindigkeit -->
		<div class="si-control-group">
			<span class="si-label">Anlauf</span>
			<div class="si-slider-group">
				<input type="range" class="si-slider" min={RUN_SPEED_MIN} max={RUN_SPEED_MAX}
					step="0.1" bind:value={_runSpeed} />
				<span class="si-slider-val">{_runSpeed.toFixed(1)} m/s</span>
			</div>
		</div>

		<!-- Schulterkraft -->
		<div class="si-control-group">
			<span class="si-label">Schulterkraft</span>
			<div class="si-slider-group">
				<input type="range" class="si-slider" min={SHOULDER_SPEED_MIN} max={SHOULDER_SPEED_MAX}
					step="0.1" bind:value={_shoulderSpeed} />
				<span class="si-slider-val">{_shoulderSpeed.toFixed(1)} m/s</span>
			</div>
		</div>

		<!-- Körperstabilität -->
		<div class="si-control-group">
			<span class="si-label">Körperstabilität</span>
			<div class="si-slider-group">
				<input type="range" class="si-slider" min={STABILITY_MIN} max={STABILITY_MAX}
					step="0.01" bind:value={_stability} />
				<span class="si-slider-val">{(_stability * 100).toFixed(0)}%</span>
			</div>
		</div>

		<!-- Schlagwinkel -->
		<div class="si-control-group">
			<span class="si-label">Schlagwinkel</span>
			<div class="si-slider-group">
				<input type="range" class="si-slider" min={HIT_ANGLE_MIN} max={HIT_ANGLE_MAX}
					step="1" bind:value={_hitAngle} />
				<span class="si-slider-val">{_hitAngle > 0 ? '+' : ''}{_hitAngle}°</span>
			</div>
		</div>

		<!-- Treffpunkthöhe -->
		<div class="si-control-group">
			<span class="si-label">Treffpunkthöhe</span>
			<div class="si-slider-group">
				<input type="range" class="si-slider" min={HIT_HEIGHT_MIN_M} max={HIT_HEIGHT_MAX_M}
					step="0.05" bind:value={_hitHeight} />
				<span class="si-slider-val">{_hitHeight.toFixed(2)} m</span>
			</div>
		</div>

		<!-- Netzhöhe -->
		<div class="si-control-group">
			<span class="si-label">Netzhöhe</span>
			<div class="si-btn-group">
				{#each NET_HEIGHTS as nh (nh.id)}
					<button class="si-btn" class:active={_netId === nh.id}
						style="--col: #475569" onclick={() => (_netId = nh.id)}>
						{nh.label} ({nh.heightM.toFixed(2)}m)
					</button>
				{/each}
			</div>
		</div>

	</div>

	<!-- ── Impuls-Anzeige (Balken) ────────────────────────────────────────────── -->
	<div class="si-impulse-panel">
		<div class="si-impulse-row si-impulse-detail">
			<span class="si-imp-sub">v<sub>Hand</sub> = v<sub>Anlauf</sub> ({_runSpeed.toFixed(1)}) + v<sub>Arm</sub> ({_shoulderSpeed.toFixed(1)}) = {impulse.vHand.toFixed(1)} m/s</span>
		</div>

		<div class="si-impulse-arrow">
			<div class="si-arr-line"></div>
			<span class="si-arr-label">× η = {(_stability * 100).toFixed(0)}% Stabilität</span>
		</div>

		<div class="si-impulse-row">
			<div class="si-impulse-label">
				<span class="si-imp-name">Ballimpuls</span>
				<span class="si-imp-formula">p<sub>Ball</sub> = η × m<sub>Ball</sub> × v<sub>Hand</sub></span>
			</div>
			<div class="si-bar-track">
				<div class="si-bar-fill" style="width: {(pBallNorm * 100).toFixed(1)}%; background: {speedColor};"></div>
			</div>
			<span class="si-imp-value" style="color: {speedColor}">{impulse.pBall.toFixed(3)} <span class="si-unit">kg·m/s</span></span>
		</div>

		<div class="si-impulse-row si-impulse-result">
			<span class="si-imp-result-label">Ballgeschwindigkeit</span>
			<span class="si-imp-result-val" style="color: {speedColor}">
				{impulse.vBall.toFixed(1)} m/s
				<span class="si-imp-kmh">({ballSpeedKmh.toFixed(0)} km/h)</span>
			</span>
		</div>
	</div>

	<!-- ── SVG ────────────────────────────────────────────────────────────────── -->
	<div class="si-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="si-svg"
			role="img"
			aria-label="Service-Impuls Seitenriss"
		>
			<defs>
				<marker id="si-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={speedColor} />
				</marker>
				<marker id="si-arrow-body" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill="#3b82f6" />
				</marker>
			</defs>

			<!-- Hintergrund -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />
			<!-- Boden -->
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />

			<!-- ── Feldmarkierungen ──────────────────────────────────────────── -->
			<!-- Feldbelag -->
			<rect x={FIELD_LEFT} y={GROUND_Y - 3} width={FIELD_W_PX} height="5" fill="#d4dde8" rx="1" />
			<!-- Grundlinien -->
			<line x1={FIELD_LEFT}  y1={GROUND_Y - 3} x2={FIELD_LEFT}  y2={GROUND_Y + 10} stroke="#64748b" stroke-width="2.5" />
			<line x1={FIELD_RIGHT} y1={GROUND_Y - 3} x2={FIELD_RIGHT} y2={GROUND_Y + 10} stroke="#64748b" stroke-width="2.5" />
			<!-- Mittellinie (Netz-Fuss) -->
			<line x1={NET_SVG_X} y1={GROUND_Y - 3} x2={NET_SVG_X} y2={GROUND_Y + 10} stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5" />
			<!-- Angriffslinie (3m von Netz) -->
			<line x1={ATT_LINE_SVG} y1={GROUND_Y - 3} x2={ATT_LINE_SVG} y2={GROUND_Y + 8}
				stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" opacity="0.5" />
			<text x={ATT_LINE_SVG} y={GROUND_Y + 20} text-anchor="middle"
				fill="#94a3b8" font-size="8" font-family="sans-serif" opacity="0.7">3m</text>
			<!-- Boden-Linie -->
			<line x1={FIELD_LEFT - 10} y1={GROUND_Y} x2={FIELD_RIGHT + 10} y2={GROUND_Y}
				stroke="#94a3b8" stroke-width="1.5" />

			<!-- Feldseiten-Labels -->
			<text x={fx(NET_X_M / 2)} y={GROUND_Y + 22} text-anchor="middle"
				fill="#94a3b8" font-size="9" font-family="sans-serif" opacity="0.6">Aufschlag-Seite</text>
			<text x={fx(NET_X_M + NET_X_M / 2)} y={GROUND_Y + 22} text-anchor="middle"
				fill="#94a3b8" font-size="9" font-family="sans-serif" opacity="0.6">Gegner-Seite</text>

			<!-- ── Höhen-Referenzlinien ──────────────────────────────────────── -->
			{#each [1, 2, 3, 4] as hM}
				<line x1={FIELD_LEFT - 8} y1={fy(hM)} x2={FIELD_LEFT} y2={fy(hM)}
					stroke="#cbd5e1" stroke-width="1" />
				<text x={FIELD_LEFT - 10} y={fy(hM) + 3} text-anchor="end"
					fill="#94a3b8" font-size="8" font-family="sans-serif">{hM}m</text>
			{/each}

			<!-- ── Landepunkt-Zone (Gegnerfeld) ──────────────────────────────── -->
			{#if animState !== 'idle'}
				{@const lx = fx(Math.min(traj.landXM, FIELD_DEPTH_M - 0.1))}
				{#if serveStatus === 'in'}
					<!-- Landepunkt-Marker -->
					<ellipse cx={lx} cy={GROUND_Y - 2} rx="8" ry="3" fill="#16a34a" opacity="0.3" />
					<ellipse cx={lx} cy={GROUND_Y - 2} rx="8" ry="3" fill="none"
						stroke="#16a34a" stroke-width="1.5" opacity="0.7" />
					{#if animState === 'done'}
						<text x={lx} y={GROUND_Y + 14} text-anchor="middle"
							fill="#16a34a" font-size="9" font-family="sans-serif" font-weight="700">
							{(traj.landXM - NET_X_M).toFixed(1)}m hinter Netz
						</text>
					{/if}
				{/if}
			{/if}

			<!-- ── Vorschau-Pfad ──────────────────────────────────────────────── -->
			{#if animState === 'idle'}
				<path d={previewPath()} fill="none"
					stroke={statusColor} stroke-width="1.5"
					stroke-dasharray="6,4" opacity="0.3" />
			{/if}

			<!-- ── Netz (hinter dem Ball gezeichnet, also vor Trail) ────────── -->
			<!-- Netz-Fläche -->
			<rect x={NET_SVG_X - 2} y={netTopY} width="4" height={netBottomY - netTopY}
				fill="#e2e8f0" opacity="0.8" />
			<!-- Netz-Maschen (vertikal) -->
			{#each Array(8) as _, i}
				<line
					x1={NET_SVG_X - 1}
					y1={netTopY + (i / 8) * (netBottomY - netTopY)}
					x2={NET_SVG_X + 1}
					y2={netTopY + ((i + 1) / 8) * (netBottomY - netTopY)}
					stroke="#94a3b8" stroke-width="0.6" opacity="0.5"
				/>
			{/each}
			<!-- Netz-Oberkante (weißes Band) -->
			<rect x={NET_SVG_X - 4} y={netTopY - 5} width="8" height="7"
				rx="2" fill="white" stroke="#cbd5e1" stroke-width="1" />
			<!-- Netzpfosten -->
			<rect x={NET_SVG_X - 3} y={postTopY} width="3" height={GROUND_Y - postTopY}
				rx="1" fill="#475569" />
			<!-- Netzhöhen-Label -->
			<text x={NET_SVG_X + 8} y={netTopY + 3}
				fill="#475569" font-size="8" font-family="sans-serif" font-weight="600">
				{netHeightM.toFixed(2)}m
			</text>

			<!-- ── Trail ──────────────────────────────────────────────────────── -->
			{#if animState !== 'idle' && trailPath()}
				<path d={trailPath()} fill="none"
					stroke={statusColor} stroke-width="2.5"
					stroke-linecap="round" opacity="0.8" />
			{/if}

			<!-- ── Aufschläger (Strichmännchen, Seitenriss) ──────────────────── -->
			<!-- Schatten -->
			<ellipse cx={playerGeo.x} cy={GROUND_Y - 1} rx="10" ry="3" fill="#94a3b8" opacity="0.2" />
			<!-- Bein (rechts, Standbein) -->
			<line x1={playerGeo.x + 4} y1={playerGeo.hipY} x2={playerGeo.x + 5} y2={playerGeo.feetY}
				stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
			<!-- Bein (links, leicht nach vorne) -->
			<line x1={playerGeo.x - 4} y1={playerGeo.hipY} x2={playerGeo.x + 2} y2={playerGeo.feetY}
				stroke="#334155" stroke-width="2.5" stroke-linecap="round" />
			<!-- Körper -->
			<line x1={playerGeo.x} y1={playerGeo.hipY} x2={playerGeo.x} y2={playerGeo.shoulderY}
				stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" />
			<!-- Schlagarm (gestreckt nach oben zum Ball) -->
			<line x1={playerGeo.x} y1={playerGeo.shoulderY} x2={playerGeo.armX2} y2={playerGeo.armY2}
				stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round" />
			<!-- Gegenarm (Gleichgewicht) -->
			<line x1={playerGeo.x} y1={playerGeo.shoulderY} x2={playerGeo.x - 10} y2={playerGeo.shoulderY + 8}
				stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" opacity="0.7" />
			<!-- Kopf -->
			<circle cx={playerGeo.x} cy={playerGeo.headY} r={playerGeo.headR} fill="#fbbf24" opacity="0.9" />
			<!-- Label -->
			<text x={playerGeo.x} y={playerGeo.headY - playerGeo.headR - 4} text-anchor="middle"
				fill="#475569" font-size="8" font-family="sans-serif" opacity="0.7">
				Aufschläger
			</text>

			<!-- ── Treffpunkt-Marker ──────────────────────────────────────────── -->
			<circle cx={hitSvgX} cy={hitSvgY} r="5" fill={speedColor} opacity="0.8" />
			<circle cx={hitSvgX} cy={hitSvgY} r="9" fill="none"
				stroke={speedColor} stroke-width="1.2" opacity="0.4" />

			<!-- ── Kraft-/Impuls-Pfeil vom Treffpunkt ────────────────────────── -->
			{#if animState === 'idle' || animState === 'done'}
				<line
					x1={hitSvgX} y1={hitSvgY}
					x2={arrowX2} y2={arrowY2}
					stroke={speedColor}
					stroke-width="2.5"
					stroke-linecap="round"
					marker-end="url(#si-arrow)"
					opacity="0.9"
				/>
				<text
					x={arrowX2 + 6}
					y={arrowY2 - 4}
					fill={speedColor}
					font-size="9"
					font-family="sans-serif"
					font-weight="700"
					opacity="0.9"
				>p = {impulse.pBall.toFixed(3)} kg·m/s</text>
			{/if}

			<!-- ── Ball (Animation) ───────────────────────────────────────────── -->
			{#if animState !== 'idle'}
				{@const bp = ballPt()}
				{@const bx = fx(bp.xM)}
				{@const by = fy(bp.yM)}
				<!-- Schatten -->
				<ellipse cx={bx} cy={GROUND_Y - 1} rx="8" ry="2" fill="#475569" opacity="0.08" />
				<!-- Ball -->
				<circle cx={bx} cy={by} r="10" fill="white"
					stroke={statusColor} stroke-width="1.8" opacity="0.95" />
				<!-- Volleyball-Linien -->
				<path d="M {bx - 7} {by} Q {bx} {by - 4} {bx + 7} {by}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.7" />
				<path d="M {bx - 7} {by} Q {bx} {by + 4} {bx + 7} {by}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.7" />
				<line x1={bx} y1={by - 9} x2={bx} y2={by + 9}
					stroke="#e2e8f0" stroke-width="0.7" opacity="0.6" />
			{:else}
				<!-- Ball in Ruhe (am Treffpunkt) -->
				<circle cx={hitSvgX} cy={hitSvgY} r="10" fill="white"
					stroke={speedColor} stroke-width="1.8" opacity="0.85" />
				<path d="M {hitSvgX - 7} {hitSvgY} Q {hitSvgX} {hitSvgY - 4} {hitSvgX + 7} {hitSvgY}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.6" />
				<path d="M {hitSvgX - 7} {hitSvgY} Q {hitSvgX} {hitSvgY + 4} {hitSvgX + 7} {hitSvgY}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.6" />
			{/if}

			<!-- ── Status-Label (Netz / Aus / Drinnen) ───────────────────────── -->
			{#if animState === 'done'}
				{@const lx2 = serveStatus === 'net'
					? NET_SVG_X
					: fx(Math.min(traj.landXM, FIELD_DEPTH_M - 0.2))}
				{@const ly2 = serveStatus === 'net'
					? fy(netHeightM / 2)
					: fy(0.5)}
				<text x={lx2} y={ly2}
					text-anchor="middle"
					fill={statusColor}
					font-size="16"
					font-family="sans-serif"
					font-weight="800"
					opacity="0.9"
				>{statusLabel}</text>
			{/if}

			<!-- ── Treffpunkt-Höhen-Label ──────────────────────────────────────── -->
			<line x1={FIELD_LEFT - 8} y1={hitSvgY} x2={FIELD_LEFT} y2={hitSvgY}
				stroke="#475569" stroke-width="1.5" opacity="0.7" />
			<text x={FIELD_LEFT - 10} y={hitSvgY + 3} text-anchor="end"
				fill="#475569" font-size="8" font-family="sans-serif" font-weight="600" opacity="0.9">
				{_hitHeight.toFixed(2)}m
			</text>

		</svg>
	</div>

	<!-- ── Aktions-Zeile ──────────────────────────────────────────────────────── -->
	<div class="si-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="si-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Aufschlag simulieren'}
			</button>
		{:else}
			<button class="si-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Ergebnis-Panel ────────────────────────────────────────────────────── -->
	<div class="si-result-panel">
		<div class="si-result-item">
			<span class="si-result-label">Handgeschwindigkeit</span>
			<span class="si-result-value">{impulse.vHand.toFixed(1)} <span class="si-result-unit">m/s</span></span>
		</div>
		<div class="si-result-divider"></div>
		<div class="si-result-item">
			<span class="si-result-label">Ballimpuls</span>
			<span class="si-result-value" style="color: {speedColor}">{impulse.pBall.toFixed(3)} <span class="si-result-unit">kg·m/s</span></span>
		</div>
		<div class="si-result-divider"></div>
		<div class="si-result-item">
			<span class="si-result-label">Ballgeschwindigkeit</span>
			<span class="si-result-value" style="color: {speedColor}">
				{impulse.vBall.toFixed(1)} m/s
				<span class="si-result-unit">/ {ballSpeedKmh.toFixed(0)} km/h</span>
			</span>
		</div>
		<div class="si-result-divider"></div>
		<div class="si-result-item">
			<span class="si-result-label">Ergebnis</span>
			<span class="si-result-value" style="color: {statusColor}; font-size: 1.1rem">{statusLabel}</span>
		</div>
	</div>

</div>

<style>
	.si-wrapper {
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

	/* ── Header ─────────────────────────────────────── */
	.si-header { display: flex; flex-direction: column; gap: 0.2rem; }
	.si-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
		font-family: inherit;
	}
	.si-subtitle {
		font-size: 0.82rem;
		color: #94a3b8;
		margin: 0;
		font-style: italic;
		font-family: inherit;
	}

	/* ── Steuerung ───────────────────────────────────── */
	.si-controls { display: flex; flex-direction: column; gap: 0.45rem; }
	.si-control-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.si-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		min-width: 130px;
		white-space: nowrap;
		font-family: inherit;
	}
	.si-slider-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.si-slider {
		width: 160px;
		accent-color: #475569;
		cursor: pointer;
	}
	.si-slider-val {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		font-family: 'Courier New', monospace;
		min-width: 4.5rem;
	}
	.si-btn-group { display: flex; gap: 0.25rem; flex-wrap: wrap; }
	.si-btn {
		padding: 0.28rem 0.8rem;
		border-radius: 0.375rem;
		border: 1.5px solid var(--col, #94a3b8);
		background: transparent;
		color: var(--col, #64748b);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 120ms, color 120ms;
		font-family: inherit;
	}
	.si-btn:hover { background: color-mix(in srgb, var(--col, #94a3b8) 10%, transparent); }
	.si-btn.active { background: var(--col, #94a3b8); color: white; }

	/* ── Impuls-Panel ────────────────────────────────── */
	.si-impulse-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.si-impulse-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.si-impulse-label {
		display: flex;
		flex-direction: column;
		min-width: 150px;
	}
	.si-imp-name {
		font-size: 0.82rem;
		font-weight: 600;
		color: #1e293b;
		font-family: inherit;
	}
	.si-imp-formula {
		font-size: 0.72rem;
		color: #94a3b8;
		font-family: 'Courier New', monospace;
	}
	.si-bar-track {
		flex: 1;
		height: 10px;
		background: #e2e8f0;
		border-radius: 5px;
		overflow: hidden;
	}
	.si-bar-fill {
		height: 100%;
		border-radius: 5px;
		transition: width 180ms ease;
	}
	.si-imp-value {
		font-size: 0.9rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
		min-width: 90px;
		text-align: right;
	}
	.si-unit {
		font-size: 0.7rem;
		font-weight: 400;
		color: #94a3b8;
	}
	.si-impulse-detail {
		padding-left: 152px;
		opacity: 0.7;
	}
	.si-imp-sub {
		font-size: 0.72rem;
		color: #64748b;
		font-family: 'Courier New', monospace;
	}
	.si-impulse-arrow {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.2rem 0;
		padding-left: 152px;
	}
	.si-arr-line {
		width: 24px;
		height: 2px;
		background: #94a3b8;
		position: relative;
	}
	.si-arr-line::after {
		content: '';
		position: absolute;
		right: -4px;
		top: -3px;
		border-left: 6px solid #94a3b8;
		border-top: 4px solid transparent;
		border-bottom: 4px solid transparent;
	}
	.si-arr-label {
		font-size: 0.72rem;
		color: #94a3b8;
		font-family: 'Courier New', monospace;
	}
	.si-impulse-result {
		margin-top: 0.25rem;
		padding-top: 0.4rem;
		border-top: 1px solid #e2e8f0;
		justify-content: space-between;
	}
	.si-imp-result-label {
		font-size: 0.82rem;
		font-weight: 500;
		color: #64748b;
		font-family: inherit;
	}
	.si-imp-result-val {
		font-size: 1.2rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
	}
	.si-imp-kmh {
		font-size: 0.85rem;
		font-weight: 400;
		color: #94a3b8;
	}

	/* ── SVG ──────────────────────────────────────────── */
	.si-svg-wrapper { width: 100%; }
	.si-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
	}

	/* ── Aktions-Zeile ────────────────────────────────── */
	.si-action-row { display: flex; justify-content: center; }
	.si-start-btn, .si-reset-btn {
		padding: 0.55rem 2.5rem;
		border-radius: 0.5rem;
		border: none;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.si-start-btn {
		background: #ff3500;
		color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.si-start-btn:hover { background: #e62f00; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,53,0,0.28); }
	.si-start-btn:active { transform: translateY(0); }
	.si-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.si-reset-btn:hover { background: #e2e8f0; }

	/* ── Ergebnis-Panel ───────────────────────────────── */
	.si-result-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.85rem 1rem;
		flex-wrap: wrap;
	}
	.si-result-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.si-result-label { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit; }
	.si-result-value { font-size: 1.2rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.si-result-unit { font-size: 0.7rem; font-weight: 400; color: #94a3b8; }
	.si-result-divider { width: 1px; height: 36px; background: #e2e8f0; }

	/* ── Responsive ───────────────────────────────────── */
	@media (max-width: 600px) {
		.si-wrapper { padding: 1rem; }
		.si-control-group { flex-direction: column; align-items: flex-start; }
		.si-label { min-width: unset; }
		.si-impulse-detail, .si-impulse-arrow { padding-left: 0; }
		.si-result-panel { gap: 0.75rem; }
		.si-slider { width: 130px; }
		.si-impulse-label { min-width: 110px; }
	}
</style>
