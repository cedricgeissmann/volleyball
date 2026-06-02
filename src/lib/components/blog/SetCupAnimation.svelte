<script>
	/**
	 * Zuspiel-Simulation — Schalen-Mechanik (Frontalansicht)
	 *
	 * Wie SetAnimation.svelte, aber anstelle des Strichmännchens
	 * wird eine Schale (halber Kreis) dargestellt.
	 *
	 * Animations-Ablauf:
	 *  1. Idle:    Schale zentriert, Ball darin, Kraftvektor am Scheitelpunkt
	 *  2. Abspiel: Schale bewegt sich für ~45ms entlang des Kraftvektors
	 *              und rotiert in Kraftvektor-Richtung
	 *  3. Flug:    Ball trennt sich, fliegt Parabel; Schale bleibt an letzter Position
	 *  4. Done:    Parabel vollständig sichtbar, Schale an "Abspiel-Position"
	 */

	// ─── Physik ───────────────────────────────────────────────────────────────────
	const G = 9.81;

	const NET_HEIGHT_M    = 2.43;
	const ANTENNA_ABOVE_M = 0.80;
	const FIELD_WIDTH_M   = 9.0;

	const BALL_START_X_M  = 5.4;
	const BALL_START_Y_M  = 1.8;

	// ─── Tempo-Referenzlinien ─────────────────────────────────────────────────────
	const TEMPO_LINES = [
		{ id: 'quick',  label: 'Shoot / Quick', color: '#dc2626', peakAboveNetM: 0.305 },
		{ id: 'normal', label: 'Normal',         color: '#16a34a', peakAboveNetM: 0.955 },
		{ id: 'oos',    label: 'Out of System',  color: '#ea580c', peakAboveNetM: 2.2   },
	];

	// ─── Angriffszonen ────────────────────────────────────────────────────────────
	const ZONES = [
		{ id: 'z5', label: 'Z5', color: '#2563eb', xM: 0.9 },
		{ id: 'z4', label: 'Z4', color: '#0891b2', xM: 2.7 },
		{ id: 'z3', label: 'Z3', color: '#7c3aed', xM: 4.5 },
		{ id: 'z2', label: 'Z2', color: '#d97706', xM: 6.3 },
		{ id: 'z1', label: 'Z1', color: '#dc2626', xM: 8.1 },
	];
	const ZONE_HALF_W_M = 0.75;

	const HIT_ZONE_MIN_M = NET_HEIGHT_M;
	const HIT_ZONE_MAX_M = NET_HEIGHT_M + 0.75;

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W    = 640;
	const SVG_H    = 420;
	const PX_PER_M = 56;
	const MARGIN_L = 48;
	const GROUND_Y = SVG_H - 44;

	const FIELD_W_PX  = FIELD_WIDTH_M * PX_PER_M;
	const FIELD_LEFT  = MARGIN_L;
	const FIELD_RIGHT = MARGIN_L + FIELD_W_PX;

	/** @param {number} xM */
	function fx(xM) { return FIELD_LEFT + xM * PX_PER_M; }
	/** @param {number} yM */
	function fy(yM) { return GROUND_Y - yM * PX_PER_M; }

	const BALL_SVG_X = fx(BALL_START_X_M);
	const BALL_SVG_Y = fy(BALL_START_Y_M);

	// ─── Schalen-Geometrie ────────────────────────────────────────────────────────
	// Schale = Halbkreis-Bogen, offen nach oben.
	// Scheitelpunkt = unterster Punkt der Schale = Kraftangriffspunkt.
	// Ball sitzt auf dem Scheitelpunkt: Ball-Mittelpunkt = Apex - BALL_R (nach oben).
	const CUP_R   = 18;   // px Radius der Schale
	const BALL_R  = 11;   // px Ball-Radius

	// Scheitelpunkt = unterster/hinterer Punkt der Schale = Kraftangriffspunkt
	// Er liegt bei der nominellen Ball-Startposition
	const CUP_APEX_X = BALL_SVG_X;
	const CUP_APEX_Y = BALL_SVG_Y;

	// Öffnungsrichtung der Schale: -45° = schräg nach oben-links
	const CUP_OPEN_DEG = -45;
	const CUP_OPEN_RAD = (CUP_OPEN_DEG - 90) * Math.PI / 180;

	// Kreismittelpunkt der Schale: liegt r in Öffnungsrichtung vom Scheitelpunkt
	const CUP_CX = CUP_APEX_X + CUP_R * Math.cos(CUP_OPEN_RAD);
	const CUP_CY = CUP_APEX_Y + CUP_R * Math.sin(CUP_OPEN_RAD);

	// Ball-Mittelpunkt = Kreismittelpunkt (Ball sitzt in der Schale)
	const BALL_CX = CUP_CX;
	const BALL_CY = CUP_CY;

	// ─── Kraft-Vektor ─────────────────────────────────────────────────────────────
	const BALL_MASS_KG   = 0.270;
	const CONTACT_TIME_S = 0.045;

	const FORCE_N_MIN   = 20;
	const FORCE_N_MAX   = 120;
	const ARROW_MIN_LEN = 38;
	const ARROW_MAX_LEN = 90;

	const COMP_PX_PER_N = ARROW_MAX_LEN / FORCE_N_MAX;

	/** @param {number} n Newton → m/s */
	function forceNtoSpeed(n) { return n * CONTACT_TIME_S / BALL_MASS_KG; }
	/** @param {number} px SVG-Pixel → Newton (Komponente) */
	function compPxToN(px) { return px / COMP_PX_PER_N; }
	/** @param {number} n Newton (Komponente) → SVG-Pixel */
	function compNtoPx(n) { return n * COMP_PX_PER_N; }

	// Startwert: 50 N bei 25° zur Vertikalen, gegen Uhrzeigersinn (= nach links)
	const START_F_N  = 50;
	const START_DEG  = 25;
	const START_FX_N = -START_F_N * Math.sin(START_DEG * Math.PI / 180);
	const START_FY_N =  START_F_N * Math.cos(START_DEG * Math.PI / 180);

	// ─── LocalStorage-Schlüssel ──────────────────────────────────────────────────
	const LS_KEY = 'sca-state-v1';

	/** Liest gespeicherten Zustand aus LocalStorage (nur im Browser) */
	function loadState() {
		if (typeof localStorage === 'undefined') return null;
		try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
	}

	const _saved = loadState();

	let forceVecX = $state(_saved?.forceVecX ?? compNtoPx(START_FX_N));
	let forceVecY = $state(_saved?.forceVecY ?? -compNtoPx(START_FY_N)); // SVG y invertiert

	let sliderFx = $state(_saved?.sliderFx ?? START_FX_N);
	let sliderFy = $state(_saved?.sliderFy ?? START_FY_N);

	let isDragging = $state(false);
	let showTrajectory = $state(_saved?.showTrajectory ?? false);
	let showComponents = $state(_saved?.showComponents ?? false);

	// Zustand in LocalStorage speichern wenn er sich ändert
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_KEY, JSON.stringify({
			forceVecX, forceVecY, sliderFx, sliderFy, showTrajectory, showComponents,
		}));
	});

	/**
	 * @param {number} fx Newton horizontal
	 * @param {number} fy Newton vertikal (aufwärts positiv)
	 */
	function applyComponents(fx, fy) {
		forceVecX =  compNtoPx(Math.max(-FORCE_N_MAX, Math.min(FORCE_N_MAX, fx)));
		forceVecY = -compNtoPx(Math.max(0, Math.min(FORCE_N_MAX, fy)));
		if (forceVecY > -6) forceVecY = -6;
		if (animState !== 'idle') resetAnimation();
	}

	function syncSlidersFromVec() {
		sliderFx =  compPxToN(forceVecX);
		sliderFy = -compPxToN(forceVecY);
		sliderFy = Math.max(0, sliderFy);
	}

	let svgEl = $state(/** @type {SVGSVGElement|null} */ (null));

	/** @param {MouseEvent|TouchEvent} e */
	function svgPoint(e) {
		if (!svgEl) return { x: 0, y: 0 };
		const rect    = svgEl.getBoundingClientRect();
		const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
		const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
		return {
			x: (clientX - rect.left) * (SVG_W / rect.width),
			y: (clientY - rect.top)  * (SVG_H / rect.height),
		};
	}

	// Pfeilspitze wird vom Scheitelpunkt der Schale (unten) aus gezogen
	let arrowTip = $derived({ x: CUP_APEX_X + forceVecX, y: CUP_APEX_Y + forceVecY });

	function onSvgMouseDown(/** @type {MouseEvent} */ e) {
		if (animState === 'running') return;
		const pt  = svgPoint(e);
		const dx  = pt.x - CUP_APEX_X;
		const dy  = pt.y - CUP_APEX_Y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 28 || (Math.abs(pt.x - arrowTip.x) < 20 && Math.abs(pt.y - arrowTip.y) < 20)) {
			isDragging = true;
			e.preventDefault();
		}
	}

	function onSvgMouseMove(/** @type {MouseEvent} */ e) {
		if (!isDragging || animState === 'running') return;
		applyDrag(svgPoint(e));
	}

	function onSvgMouseUp() { isDragging = false; }

	function onSvgTouchStart(/** @type {TouchEvent} */ e) {
		if (animState === 'running') return;
		const pt  = svgPoint(e);
		const dx  = pt.x - CUP_APEX_X;
		const dy  = pt.y - CUP_APEX_Y;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 34 || (Math.abs(pt.x - arrowTip.x) < 24 && Math.abs(pt.y - arrowTip.y) < 24)) {
			isDragging = true;
			e.preventDefault();
		}
	}

	function onSvgTouchMove(/** @type {TouchEvent} */ e) {
		if (!isDragging || animState === 'running') return;
		applyDrag(svgPoint(e));
		e.preventDefault();
	}

	function onSvgTouchEnd() { isDragging = false; }

	/** @param {{ x: number, y: number }} pt */
	function applyDrag(pt) {
		// Drag relativ zum Scheitelpunkt der Schale
		let dx = pt.x - CUP_APEX_X;
		let dy = pt.y - CUP_APEX_Y;
		if (dy > -6) dy = -6;
		dx = Math.max(-ARROW_MAX_LEN, Math.min(ARROW_MAX_LEN, dx));
		dy = Math.max(-ARROW_MAX_LEN, Math.min(-6, dy));
		if (animState !== 'idle') resetAnimation();
		forceVecX = dx;
		forceVecY = dy;
		syncSlidersFromVec();
	}

	// ─── Physik: Kraft-Vektor → Flugkurve ────────────────────────────────────────
	/**
	 * @param {number} fx_px SVG-Pixel x
	 * @param {number} fy_px SVG-Pixel y (negativ = aufwärts)
	 */
	function calcTrajectoryFromForce(fx_px, fy_px) {
		const xStartM = BALL_START_X_M;
		const yStartM = BALL_START_Y_M;

		const fxN =  compPxToN(fx_px);
		const fyN = -compPxToN(fy_px);
		const vx  =  forceNtoSpeed(fxN);
		const vy  =  forceNtoSpeed(fyN);

		if (vy < 0.5) return { points: [], flightTimeS: 0, speedMs: 0, forceN: 0, hitZoneId: null, netCrossProgress: 0.5, hwEnter: 0, hwLeave: 0, yPeak: 0 };

		const forceN = Math.sqrt(fxN * fxN + fyN * fyN);
		const speed  = Math.sqrt(vx * vx + vy * vy);

		const tUp   = vy / G;
		const yPeak = yStartM + vy * tUp - 0.5 * G * tUp * tUp;
		const disc  = vy * vy + 2 * G * yStartM;
		const tEnd  = disc >= 0 ? (vy + Math.sqrt(disc)) / G : tUp * 2;

		const N = 120;
		/** @type {{xM: number, yM: number, t: number}[]} */
		const points = [];
		for (let i = 0; i <= N; i++) {
			const t  = (i / N) * tEnd;
			const xM = xStartM + vx * t;
			const yM = yStartM + vy * t - 0.5 * G * t * t;
			points.push({ xM, yM, t });
		}

		const netCrossProgress = Math.min(1, Math.max(0, tUp / tEnd));

		let hitZoneId = /** @type {string|null} */ (null);
		let hwEnter = 1, hwLeave = 0;

		const peakIdx = Math.round(netCrossProgress * N);
		for (let i = peakIdx; i < points.length; i++) {
			const { xM, yM } = points[i];
			if (yM >= HIT_ZONE_MIN_M && yM <= HIT_ZONE_MAX_M) {
				for (const zone of ZONES) {
					if (Math.abs(xM - zone.xM) <= ZONE_HALF_W_M) {
						if (hitZoneId === null) { hitZoneId = zone.id; hwEnter = i / N; }
						hwLeave = i / N;
						break;
					}
				}
			} else if (hitZoneId !== null && yM < HIT_ZONE_MIN_M) {
				break;
			}
		}

		return { points, flightTimeS: tEnd, speedMs: speed, forceN, hitZoneId, netCrossProgress, hwEnter, hwLeave, yPeak };
	}

	let traj = $derived(calcTrajectoryFromForce(forceVecX, forceVecY));

	// ─── Animations-Zustand ───────────────────────────────────────────────────────
	// Phasen:
	//   idle    → Schale in Ruhe, Ball darin
	//   cup     → Schale bewegt sich + rotiert (Kontaktphase, ~45ms real → 400ms animiert)
	//   running → Ball fliegt, Schale bleibt
	//   done    → fertig
	let animState    = $state(/** @type {'idle'|'cup'|'running'|'done'} */ ('idle'));
	let animProgress = $state(0);  // 0–1 für Flugphase
	let cupProgress  = $state(0);  // 0–1 für Schalenbewegung
	let elapsedMs    = $state(0);

	/** @type {number|null} */
	let rafId = null;
	let animStartTime = 0;

	// Schalen-Auslenkung während der cup-Phase
	// Schale bewegt sich in Kraftvektor-Richtung, max ~20px
	const CUP_MOVE_PX  = 20;  // maximale Verschiebung in px
	const CUP_PHASE_MS = 400; // animierte Dauer der Kontaktphase in ms

	// Normierter Kraftvektor (in SVG-Pixel-Richtung)
	let forceDir = $derived(() => {
		const len = Math.sqrt(forceVecX * forceVecX + forceVecY * forceVecY);
		if (len < 1) return { x: 0, y: -1 };
		return { x: forceVecX / len, y: forceVecY / len };
	});

	// Winkel des Kraftvektors in Grad (0° = nach oben im SVG, UZS positiv)
	// Wird für die Schalenrotation verwendet
	let forceAngleRad = $derived(Math.atan2(forceVecX, -forceVecY)); // 0 = aufwärts SVG

	// Während cup-Phase: aktuelle Schalen-Position und Rotation
	let cupOffsetX  = $derived(() => {
		if (animState !== 'cup' && animState !== 'running' && animState !== 'done') return 0;
		const t = animState === 'cup' ? cupProgress : 1;
		// Ease-out: schnell raus, dann abbremsen
		const ease = 1 - Math.pow(1 - t, 2);
		return forceDir().x * CUP_MOVE_PX * ease;
	});
	let cupOffsetY  = $derived(() => {
		if (animState !== 'cup' && animState !== 'running' && animState !== 'done') return 0;
		const t = animState === 'cup' ? cupProgress : 1;
		const ease = 1 - Math.pow(1 - t, 2);
		return forceDir().y * CUP_MOVE_PX * ease;
	});

	// Schalenrotation: Öffnung dreht sich in Richtung Kraftvektor (bis 90% der Zielausrichtung)
	// Die Schale hat Öffnung bei -45° (oben-links). Ziel: Öffnung zeigt zum Kraftvektor.
	// Kraftvektor-Winkel: forceAngleRad (0 = aufwärts, UZS positiv).
	// Öffnung-Ruhewinkel: -45° = -π/4 rad.
	// Nötige Rotation = forceAngleRad - (-π/4) = forceAngleRad + π/4
	let cupRotDeg = $derived(() => {
		if (animState !== 'cup' && animState !== 'running' && animState !== 'done') return 0;
		const t = animState === 'cup' ? cupProgress : 1;
		const ease = 1 - Math.pow(1 - t, 2);
		const targetRad = forceAngleRad + Math.PI / 4; // Öffnung → Kraftvektor-Richtung
		return targetRad * 180 / Math.PI * 0.9 * ease;
	});

	// Position des Balls während der Flugphase
	let ballPt = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0) return { xM: BALL_START_X_M, yM: BALL_START_Y_M, t: 0 };
		const idx = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		return pts[Math.max(0, idx)];
	});

	let ballBeforeNet = $derived(animProgress > traj.netCrossProgress);

	let ballScale = $derived(() => {
		const p  = animProgress;
		const nc = traj.netCrossProgress;
		if (p <= nc) return 0.62 + (p / Math.max(nc, 0.01)) * 0.16;
		return 0.78 + ((p - nc) / Math.max(0.01, 1 - nc)) * 0.22;
	});

	let inHitZone = $derived(
		(animState === 'running' || animState === 'done') &&
		animProgress >= traj.hwEnter &&
		animProgress <= traj.hwLeave
	);

	// Trail-Segmente
	let trailSegments = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0 || animProgress === 0) return { behind: '', before: '' };
		const nc       = traj.netCrossProgress;
		const end      = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		const vis      = pts.slice(0, end + 1);
		const splitIdx = Math.floor(nc * pts.length);

		const toPath = (/** @type {typeof pts} */ arr) => {
			if (arr.length < 2) return '';
			return arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`).join(' ');
		};

		if (end <= splitIdx) return { behind: toPath(vis), before: '' };
		return {
			behind: toPath(pts.slice(0, splitIdx + 1)),
			before: toPath([pts[splitIdx], ...vis.slice(splitIdx + 1)]),
		};
	});

	// ─── Abgeleitete Anzeige-Werte ────────────────────────────────────────────────
	let hitZone     = $derived(ZONES.find(z => z.id === traj.hitZoneId) ?? null);
	let resultColor = $derived(hitZone?.color ?? '#94a3b8');

	const netTopY     = fy(NET_HEIGHT_M);
	const netBottomY  = fy(NET_HEIGHT_M - 1.0);
	const postTopY    = netTopY;
	const antennaTopY = fy(NET_HEIGHT_M + ANTENNA_ABOVE_M);

	const BAR_X = FIELD_LEFT;
	const BAR_W = FIELD_W_PX;
	const BAR_Y = 18;
	const BAR_H = 8;

	let speedMs = $derived(traj.speedMs.toFixed(1));
	let forceN  = $derived(traj.forceN.toFixed(0));
	let forceAngleDeg = $derived(() => {
		const deg = -Math.atan2(forceVecX, -forceVecY) * 180 / Math.PI;
		return deg.toFixed(0);
	});

	const MARKER_ID    = 'sca-force-arrow';
	const MARKER_ID_FX = 'sca-fx-arrow';
	const MARKER_ID_FY = 'sca-fy-arrow';

	// ─── Animation ───────────────────────────────────────────────────────────────
	function startAnimation() {
		if (traj.points.length < 2) return;
		if (rafId !== null) cancelAnimationFrame(rafId);
		animProgress  = 0;
		cupProgress   = 0;
		elapsedMs     = 0;
		animState     = 'cup';
		animStartTime = performance.now();

		const stopAtProgress = traj.hitZoneId !== null ? traj.hwLeave : 1;
		const totalFlightMs  = stopAtProgress * traj.flightTimeS * 1000;
		// Gesamtdauer = cup-Phase + Flugzeit
		const totalMs = CUP_PHASE_MS + totalFlightMs;

		/** @param {number} now */
		function frame(now) {
			const elapsed = now - animStartTime;

			// Cup-Phase (Schalen-Bewegung): erste CUP_PHASE_MS
			cupProgress = Math.min(elapsed / CUP_PHASE_MS, 1);

			// Ball-Fortschritt: startet sofort mit, mapped auf 0..stopAtProgress
			const flyElapsed = Math.max(0, elapsed - 0); // Ball fliegt ab t=0
			const flyProgress = Math.min(flyElapsed / totalFlightMs, 1);
			animProgress = flyProgress * stopAtProgress;
			elapsedMs    = Math.max(0, elapsed - CUP_PHASE_MS);

			// Zustandswechsel
			if (elapsed >= CUP_PHASE_MS && animState === 'cup') {
				animState = 'running';
			}

			if (elapsed < totalMs) {
				rafId = requestAnimationFrame(frame);
			} else {
				cupProgress  = 1;
				animProgress = stopAtProgress;
				animState    = 'done';
				rafId        = null;
			}
		}
		rafId = requestAnimationFrame(frame);
	}

	function resetAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		animProgress = 0;
		cupProgress  = 0;
		elapsedMs    = 0;
		animState    = 'idle';
	}

	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });

	// ─── Schalen-SVG-Pfad Hilfsfunktion ──────────────────────────────────────────
	/**
	 * Erzeugt den SVG-Pfad für eine Schale (Halbkreisbogen).
	 * Öffnungsrichtung: openDeg = Winkel der Öffnungsmitte in Grad
	 *   (0° = oben im SVG, 90° = rechts, 180° = unten, -90°/270° = links)
	 * Scheitelpunkt (gegenüber der Öffnung) bei (apexX, apexY).
	 * @param {number} apexX  Scheitelpunkt x
	 * @param {number} apexY  Scheitelpunkt y
	 * @param {number} r      Radius
	 * @param {number} openDeg  Öffnungsrichtung in Grad (0 = oben)
	 */
	function cupPath(apexX, apexY, r, openDeg) {
		const openRad = (openDeg - 90) * Math.PI / 180; // -90 weil SVG-y invertiert
		// Kreismitte liegt r in Öffnungsrichtung vom Scheitelpunkt
		const cx = apexX + r * Math.cos(openRad);
		const cy = apexY + r * Math.sin(openRad);
		// Die beiden Enden des Halbkreises: senkrecht zur Öffnungsrichtung ± 90°
		const perpRad = openRad + Math.PI / 2;
		const x1 = cx + r * Math.cos(perpRad + Math.PI); // = cx - r*cos(perpRad)
		const y1 = cy + r * Math.sin(perpRad + Math.PI);
		const x2 = cx + r * Math.cos(perpRad);
		const y2 = cy + r * Math.sin(perpRad);
		// sweep=0 (gegen Uhrzeigersinn) zeichnet den Bogen durch den Scheitelpunkt
		return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
	}
</script>

<div class="sca-wrapper">

	<!-- ── Toggle-Leiste ─────────────────────────────────────────────────────── -->
	<div class="sca-toggle-row">
		<label class="sca-toggle">
			<input type="checkbox" bind:checked={showTrajectory} />
			<span class="sca-toggle-track"><span class="sca-toggle-thumb"></span></span>
			<span class="sca-toggle-label">Flugparabel anzeigen</span>
		</label>
		<label class="sca-toggle">
			<input type="checkbox" bind:checked={showComponents} />
			<span class="sca-toggle-track"><span class="sca-toggle-thumb"></span></span>
			<span class="sca-toggle-label">Kraftkomponenten</span>
		</label>
	</div>

	<!-- ── Komponenten-Regler ────────────────────────────────────────────────── -->
	{#if showComponents}
		<div class="sca-components-panel">
			<div class="sca-component-row">
				<span class="sca-comp-label" style="color: #2563eb">Fx — links (+) / rechts (−)</span>
				<input
					type="range"
					class="sca-slider sca-slider-fx"
					min={-FORCE_N_MAX}
					max={FORCE_N_MAX}
					step="1"
					value={sliderFx}
					disabled={animState === 'cup' || animState === 'running'}
					oninput={(e) => {
						sliderFx = +e.currentTarget.value;
						applyComponents(sliderFx, sliderFy);
					}}
				/>
				<span class="sca-comp-value" style="color: #2563eb">{(-sliderFx).toFixed(0)} N</span>
			</div>
			<div class="sca-component-row">
				<span class="sca-comp-label" style="color: #16a34a">Fy — aufwärts</span>
				<input
					type="range"
					class="sca-slider sca-slider-fy"
					min="0"
					max={FORCE_N_MAX}
					step="1"
					value={sliderFy}
					disabled={animState === 'cup' || animState === 'running'}
					oninput={(e) => {
						sliderFy = +e.currentTarget.value;
						applyComponents(sliderFx, sliderFy);
					}}
				/>
				<span class="sca-comp-value" style="color: #16a34a">{sliderFy.toFixed(0)} N</span>
			</div>
		</div>
	{/if}

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="sca-svg-wrapper">
		<svg
			bind:this={svgEl}
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="sca-svg"
			class:dragging={isDragging}
			role="img"
			aria-label="Zuspiel-Schalen-Simulation Frontalansicht"
			onmousedown={onSvgMouseDown}
			onmousemove={onSvgMouseMove}
			onmouseup={onSvgMouseUp}
			onmouseleave={onSvgMouseUp}
			ontouchstart={onSvgTouchStart}
			ontouchmove={onSvgTouchMove}
			ontouchend={onSvgTouchEnd}
		>
			<defs>
				<marker id={MARKER_ID} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill="#ff3500" />
				</marker>
				<marker id={MARKER_ID_FX} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill="#2563eb" />
				</marker>
				<marker id={MARKER_ID_FY} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill="#16a34a" />
				</marker>
			</defs>

			<!-- ╔══ Hintergrund ════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />

			<!-- ╔══ Boden-Feldmarkierungen ═════════════════════════════════════╗ -->
			<rect x={FIELD_LEFT} y={GROUND_Y - 4} width={FIELD_W_PX} height="6" fill="#d4dde8" rx="1" />
			<line x1={FIELD_LEFT}  y1={GROUND_Y - 3} x2={FIELD_LEFT}  y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			<line x1={FIELD_RIGHT} y1={GROUND_Y - 3} x2={FIELD_RIGHT} y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			{#each [1.8, 3.6, 5.4, 7.2] as xM}
				<line x1={fx(xM)} y1={GROUND_Y + 2} x2={fx(xM)} y2={GROUND_Y + 10} stroke="#94a3b8" stroke-width="1" opacity="0.6" />
			{/each}
			{#each ZONES as zone (zone.id)}
				<text x={fx(zone.xM)} y={GROUND_Y + 22} text-anchor="middle" fill={zone.color} font-size="9" font-family="sans-serif" font-weight="600" opacity="0.7">{zone.label}</text>
			{/each}
			<line x1={FIELD_LEFT - 10} y1={GROUND_Y} x2={FIELD_RIGHT + 10} y2={GROUND_Y} stroke="#94a3b8" stroke-width="1.5" />

			<!-- ╔══ Höhen-Referenzlinien links ══════════════════════════════════╗ -->
			{#each [1, 2, 3, 4] as hM}
				<line x1={FIELD_LEFT - 8} y1={fy(hM)} x2={FIELD_LEFT} y2={fy(hM)} stroke="#cbd5e1" stroke-width="1" />
				<text x={FIELD_LEFT - 10} y={fy(hM) + 3} text-anchor="end" fill="#94a3b8" font-size="8" font-family="sans-serif">{hM}m</text>
			{/each}

			<!-- ╔══ Tempo-Referenzlinien ════════════════════════════════════════╗ -->
			{#each TEMPO_LINES as tl (tl.id)}
				{@const lineY = fy(NET_HEIGHT_M + tl.peakAboveNetM)}
				<line x1={FIELD_LEFT} y1={lineY} x2={FIELD_RIGHT} y2={lineY}
					stroke={tl.color} stroke-width="1" stroke-dasharray="6,4" opacity="0.35" />
				<text x={FIELD_RIGHT + 4} y={lineY + 3} fill={tl.color}
					font-size="8" font-family="sans-serif" font-weight="600" opacity="0.7"
				>{tl.label}</text>
			{/each}

			<!-- ╔══ Alle 5 Angriffszonen ════════════════════════════════════════╗ -->
			{#each ZONES as zone (zone.id)}
				{@const zx        = fx(zone.xM)}
				{@const zHalfPx   = ZONE_HALF_W_M * PX_PER_M}
				{@const isHit     = inHitZone && zone.id === traj.hitZoneId}
				{@const isDone    = animState === 'done' && zone.id === traj.hitZoneId}
				{@const highlight = isHit || isDone}

				<rect x={zx - zHalfPx} y={GROUND_Y - 4} width={zHalfPx * 2} height="5" rx="2"
					fill={zone.color} opacity={highlight ? 0.5 : 0.12} />
				<rect x={zx - zHalfPx} y={fy(HIT_ZONE_MAX_M)}
					width={zHalfPx * 2} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M)} rx="3"
					fill={zone.color} opacity={highlight ? 0.35 : 0.04}
				/>
				<rect x={zx - zHalfPx} y={fy(HIT_ZONE_MAX_M)}
					width={zHalfPx * 2} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M)} rx="3"
					fill="none" stroke={zone.color}
					stroke-width={highlight ? 3 : 0.8}
					stroke-dasharray={highlight ? '' : '4,3'}
					opacity={highlight ? 1 : 0.22}
				/>
				{#if highlight}
					<rect x={zx - zHalfPx - 4} y={fy(HIT_ZONE_MAX_M) - 4}
						width={zHalfPx * 2 + 8} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M) + 8} rx="6"
						fill="none" stroke={zone.color} stroke-width="1.5" opacity="0.4"
					/>
				{/if}
				<text x={zx} y={fy(HIT_ZONE_MAX_M) - 6}
					text-anchor="middle" fill={zone.color}
					font-size={highlight ? '11' : '9'} font-family="sans-serif"
					font-weight={highlight ? '700' : '500'}
					opacity={highlight ? 1 : 0.35}
				>{zone.label}</text>
				{#if isHit}
					<text x={zx} y={fy((HIT_ZONE_MIN_M + HIT_ZONE_MAX_M) / 2) + 4}
						text-anchor="middle" fill={zone.color}
						font-size="12" font-family="sans-serif" font-weight="700"
					>Schlag!</text>
				{/if}
			{/each}

			<!-- ╔══ Flugparabel (Toggle oder nach Animation) ═══════════════════╗ -->
			{#if (showTrajectory && animState === 'idle') && traj.points.length > 1}
				{@const nc        = traj.netCrossProgress}
				{@const splitIdx  = Math.floor(nc * traj.points.length)}
				{@const behindPts = traj.points.slice(0, splitIdx + 1)}
				{@const beforePts = traj.points.slice(splitIdx)}
				{@const toPath    = (/** @type {typeof traj.points} */ arr) =>
					arr.length < 2 ? '' : arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`).join(' ')
				}
				<path d={toPath(behindPts)} fill="none" stroke="#ff3500" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.22" />
				<path d={toPath(beforePts)} fill="none" stroke="#ff3500" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.45" />
			{/if}

			<!-- Trail hinter dem Netz -->
			{#if animState !== 'idle' && animState !== 'cup' && trailSegments().behind}
				<path d={trailSegments().behind} fill="none" stroke="#ff3500" stroke-width="2" stroke-linecap="round" opacity="0.3" />
			{/if}

			<!-- Vollständige Parabel nach Animation -->
			{#if animState === 'done' && traj.points.length > 1}
				{@const nc        = traj.netCrossProgress}
				{@const splitIdx  = Math.floor(nc * traj.points.length)}
				{@const behindPts = traj.points.slice(0, splitIdx + 1)}
				{@const beforePts = traj.points.slice(splitIdx)}
				{@const toPath    = (/** @type {typeof traj.points} */ arr) =>
					arr.length < 2 ? '' : arr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`).join(' ')
				}
				<path d={toPath(behindPts)} fill="none" stroke="#ff3500" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.25" />
				<path d={toPath(beforePts)} fill="none" stroke="#ff3500" stroke-width="2" stroke-linecap="round" opacity="0.55" />
			{/if}

			<!-- ╔══ Netz ════════════════════════════════════════════════════════╗ -->
			<rect x={FIELD_LEFT} y={netTopY} width={FIELD_W_PX} height={netBottomY - netTopY} fill="#e2e8f0" opacity="0.5" />
			{#each Array(5) as _, i}
				<line
					x1={FIELD_LEFT}
					y1={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					x2={FIELD_RIGHT}
					y2={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					stroke="#94a3b8" stroke-width="0.8" opacity="0.6"
				/>
			{/each}
			{#each Array(18) as _, i}
				{@const nvx = FIELD_LEFT + (i + 1) * (FIELD_W_PX / 18)}
				<line x1={nvx} y1={netTopY} x2={nvx} y2={netBottomY} stroke="#94a3b8" stroke-width="0.7" opacity="0.4" />
			{/each}
			<line x1={FIELD_LEFT} y1={netBottomY} x2={FIELD_RIGHT} y2={netBottomY} stroke="#64748b" stroke-width="2" stroke-linecap="round" />
			<rect x={FIELD_LEFT} y={netTopY - 5} width={FIELD_W_PX} height="7" rx="2" fill="white" stroke="#cbd5e1" stroke-width="1" />
			<rect x={FIELD_LEFT - 6}  y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />
			<rect x={FIELD_RIGHT}     y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />
			{#each [FIELD_LEFT - 1.5, FIELD_RIGHT - 1.5] as ax}
				{#each Array(10) as _, seg}
					{@const totalH = netBottomY - antennaTopY}
					{@const segH   = totalH / 10}
					<rect x={ax} y={antennaTopY + seg * segH} width="3" height={segH + 0.5}
						fill={seg % 2 === 0 ? '#ef4444' : 'white'} />
				{/each}
			{/each}

			<!-- Trail vor dem Netz -->
			{#if animState !== 'idle' && animState !== 'cup' && trailSegments().before}
				<path d={trailSegments().before} fill="none" stroke="#ff3500" stroke-width="2.5" stroke-linecap="round" opacity="0.75" />
			{/if}

			<!-- ╔══ Netzhöhen-Label ════════════════════════════════════════════╗ -->
			<text x={FIELD_LEFT - 10} y={netTopY + 3} text-anchor="end" fill="#475569"
				font-size="8" font-family="sans-serif" font-weight="600">{NET_HEIGHT_M.toFixed(2)}m</text>
			<line x1={FIELD_LEFT - 8} y1={netTopY} x2={FIELD_LEFT} y2={netTopY} stroke="#475569" stroke-width="1.5" />

			<!-- ╔══ Schale + Ball + Kraftvektor (Idle + Done) ══════════════════╗ -->
			{#if animState === 'idle' || animState === 'done'}
				<!-- Schatten -->
				<ellipse cx={BALL_CX} cy={GROUND_Y - 1} rx="14" ry="3" fill="#94a3b8" opacity="0.18" />

				<!-- Schale (Halbkreis-Bogen, offen nach oben-links) -->
				<path
					d={cupPath(CUP_APEX_X, CUP_APEX_Y, CUP_R, -45)}
					fill="none"
					stroke="#334155"
					stroke-width="3.5"
					stroke-linecap="round"
					opacity="0.88"
				/>
				<!-- Scheitelpunkt-Indikator -->
				<circle cx={CUP_APEX_X} cy={CUP_APEX_Y} r="2.5" fill="#334155" opacity="0.6" />

				<!-- Ball sitzt in der Schale (nur bei idle) -->
				{#if animState === 'idle'}
					<circle cx={BALL_CX} cy={BALL_CY} r={BALL_R} fill="white" stroke="#ff3500" stroke-width="1.8" opacity="0.9" />
					<path d="M {BALL_CX - 7} {BALL_CY} Q {BALL_CX} {BALL_CY - 5} {BALL_CX + 7} {BALL_CY}"
						fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
					<path d="M {BALL_CX - 7} {BALL_CY} Q {BALL_CX} {BALL_CY + 5} {BALL_CX + 7} {BALL_CY}"
						fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
					<line x1={BALL_CX} y1={BALL_CY - 10} x2={BALL_CX} y2={BALL_CY + 10}
						stroke="#e2e8f0" stroke-width="0.8" opacity="0.7" />
				{/if}

				<!-- Komponenten-Pfeile (nur bei idle) -->
				{#if showComponents && animState === 'idle'}
					{@const fxPx  = compNtoPx(sliderFx)}
					{@const fyPx  = compNtoPx(sliderFy)}
					{@const tipFx = { x: CUP_APEX_X + fxPx, y: CUP_APEX_Y       }}
					{@const tipFy = { x: CUP_APEX_X,          y: CUP_APEX_Y - fyPx }}
					<line x1={tipFx.x} y1={tipFx.y} x2={arrowTip.x} y2={arrowTip.y}
						stroke="#16a34a" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
					<line x1={tipFy.x} y1={tipFy.y} x2={arrowTip.x} y2={arrowTip.y}
						stroke="#2563eb" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
					{#if Math.abs(fxPx) > 2}
						<line
							x1={CUP_APEX_X} y1={CUP_APEX_Y}
							x2={tipFx.x}    y2={tipFx.y}
							stroke="#2563eb" stroke-width="2" stroke-linecap="round"
							marker-end="url(#{MARKER_ID_FX})" opacity="0.85"
						/>
						{@const fxLabelX = tipFx.x + (fxPx >= 0 ? 6 : -6)}
						{@const fxAnchor = fxPx >= 0 ? 'start' : 'end'}
						<text x={fxLabelX} y={tipFx.y + 12}
							text-anchor={fxAnchor}
							fill="#2563eb" font-size="9" font-family="sans-serif" font-weight="700" opacity="0.9"
						>Fx {(-sliderFx).toFixed(0)} N</text>
					{/if}
					{#if fyPx > 2}
						<line
							x1={CUP_APEX_X} y1={CUP_APEX_Y}
							x2={tipFy.x}    y2={tipFy.y}
							stroke="#16a34a" stroke-width="2" stroke-linecap="round"
							marker-end="url(#{MARKER_ID_FY})" opacity="0.85"
						/>
						<text x={tipFy.x - 8} y={tipFy.y - 5}
							text-anchor="end"
							fill="#16a34a" font-size="9" font-family="sans-serif" font-weight="700" opacity="0.9"
						>Fy {sliderFy.toFixed(0)} N</text>
					{/if}
				{/if}

				<!-- Resultierender Kraftvektor (vom Scheitelpunkt aus) -->
				<line
					x1={CUP_APEX_X} y1={CUP_APEX_Y}
					x2={arrowTip.x}  y2={arrowTip.y}
					stroke="#ff3500" stroke-width="2.5" stroke-linecap="round"
					marker-end="url(#{MARKER_ID})" opacity="0.9"
				/>
				<!-- Griff-Kreis am Pfeilende -->
				<circle cx={arrowTip.x} cy={arrowTip.y} r="8"
					fill="#ff3500" opacity={isDragging ? 0.45 : 0.2} class="drag-handle" />
				<circle cx={arrowTip.x} cy={arrowTip.y} r="8"
					fill="none" stroke="#ff3500" stroke-width="1.5"
					opacity={isDragging ? 0.9 : 0.55} class="drag-handle" />

				<!-- Kraft-Label -->
				{@const labelX      = arrowTip.x + (forceVecX >= 0 ? 12 : -12)}
				{@const labelAnchor = forceVecX >= 0 ? 'start' : 'end'}
				<text x={labelX} y={arrowTip.y - 12}
					text-anchor={labelAnchor}
					fill="#ff3500" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.95"
				>{forceN} N</text>
				<text x={labelX} y={arrowTip.y}
					text-anchor={labelAnchor}
					fill="#ff3500" font-size="8.5" font-family="sans-serif" opacity="0.75"
				>{speedMs} m/s · {forceAngleDeg()}° zur Vertikalen</text>

				<!-- Hinweis-Text (nur idle) -->
				{#if animState === 'idle' && !showComponents}
					<text x={BALL_CX} y={CUP_APEX_Y + 22}
						text-anchor="middle" fill="#94a3b8"
						font-size="8.5" font-family="sans-serif" opacity="0.85"
					>Pfeil ziehen um Kraft einzustellen</text>
				{/if}
			{/if}

			<!-- ╔══ Schale (animiert) ═══════════════════════════════════════════╗ -->
			{#if animState !== 'idle'}
				{@const ox  = cupOffsetX()}
				{@const oy  = cupOffsetY()}
				{@const rot = cupRotDeg()}
				{@const op  = animState === 'cup' ? 0.88 : 0.45}
				<g transform="translate({CUP_APEX_X + ox} {CUP_APEX_Y + oy}) rotate({rot}) translate({-CUP_APEX_X} {-CUP_APEX_Y})">
					<path
						d={cupPath(CUP_APEX_X, CUP_APEX_Y, CUP_R, -45)}
						fill="none"
						stroke="#334155"
						stroke-width="3.5"
						stroke-linecap="round"
						opacity={op}
					/>
					<circle cx={CUP_APEX_X} cy={CUP_APEX_Y} r="2.5" fill="#334155" opacity={op * 0.65} />
				</g>
			{/if}

			<!-- ╔══ Ball (animiert: läuft sofort auf der Parabel) ══════════════╗ -->
			{#if animState !== 'idle'}
				{@const bp  = ballPt()}
				{@const bx  = fx(bp.xM)}
				{@const by  = fy(bp.yM)}
				{@const bs  = ballScale()}
				{@const br  = 11 * bs}
				{@const bop = ballBeforeNet ? 1.0 : 0.6}
				<ellipse cx={bx} cy={GROUND_Y - 1} rx={br} ry={2.5 * bs} fill="#475569" opacity={0.1 * bs} />
				<circle cx={bx} cy={by} r={br} fill="white" stroke="#ff3500" stroke-width={1.8 * bs} opacity={bop} />
				<path d="M {bx - br * 0.65} {by} Q {bx} {by - br * 0.45} {bx + br * 0.65} {by}"
					fill="none" stroke="#94a3b8" stroke-width={bs * 0.9} opacity={bop * 0.8} />
				<path d="M {bx - br * 0.65} {by} Q {bx} {by + br * 0.45} {bx + br * 0.65} {by}"
					fill="none" stroke="#94a3b8" stroke-width={bs * 0.9} opacity={bop * 0.8} />
				<line x1={bx} y1={by - br * 0.9} x2={bx} y2={by + br * 0.9}
					stroke="#e2e8f0" stroke-width={bs * 0.7} opacity={bop * 0.7} />
			{/if}

			<!-- ╔══ Timer ══════════════════════════════════════════════════════╗ -->
			{#if animState === 'running'}
				{@const inZone = animProgress >= traj.hwEnter && animProgress <= traj.hwLeave}
				<rect x={SVG_W - 130} y="8" width="118" height="27" rx="6" fill="#1e293b" opacity="0.07" />
				<text x={SVG_W - 71} y="27" text-anchor="middle"
					fill={inZone ? resultColor : '#1e293b'}
					font-size="15" font-family="monospace" font-weight="700"
				>{(elapsedMs / 1000).toFixed(2)}s</text>
			{/if}

			<!-- ╔══ Zeitbalken (nach Animation) ════════════════════════════════╗ -->
			{#if animState === 'done' && traj.hitZoneId !== null}
				{@const hwEnterX = BAR_X + traj.hwEnter * BAR_W}
				{@const hwLeaveX = BAR_X + traj.hwLeave * BAR_W}
				<rect x={BAR_X} y={BAR_Y} width={hwLeaveX - BAR_X} height={BAR_H} rx="4" fill="#e2e8f0" />
				<rect x={hwEnterX} y={BAR_Y - 3} width={hwLeaveX - hwEnterX} height={BAR_H + 6}
					rx="4" fill={resultColor} opacity="0.45" />
				<text x={BAR_X} y={BAR_Y + BAR_H + 12} fill="#64748b" font-size="8" font-family="sans-serif">0s</text>
				<text x={hwLeaveX} y={BAR_Y + BAR_H + 12} text-anchor="end"
					fill="#94a3b8" font-size="8" font-family="sans-serif"
				>{(traj.hwLeave * traj.flightTimeS).toFixed(2)}s</text>
				<text
					x={hwEnterX + (hwLeaveX - hwEnterX) / 2} y={BAR_Y + BAR_H + 24}
					text-anchor="middle" fill={resultColor}
					font-size="8" font-family="sans-serif" font-weight="700" opacity="0.7"
				>{((traj.hwLeave - traj.hwEnter) * traj.flightTimeS * 1000).toFixed(0)}ms Fenster</text>
			{/if}
		</svg>
	</div>

	<!-- ── Aktions-Zeile ─────────────────────────────────────────────────────── -->
	<div class="sca-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="sca-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Simulation starten'}
			</button>
		{:else}
			<button class="sca-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Info-Panel ────────────────────────────────────────────────────────── -->
	<div class="sca-info-panel">
		{#if animState === 'done'}
			<div class="sca-info-row">
				<div class="sca-info-item">
					<span class="sca-info-label">Flugzeit bis Schlagzone</span>
					<span class="sca-info-value">{(traj.hwLeave * traj.flightTimeS).toFixed(2)} s</span>
				</div>
				<div class="sca-info-divider"></div>
				<div class="sca-info-item">
					<span class="sca-info-label">Kraft</span>
					<span class="sca-info-value">{forceN} N</span>
				</div>
				<div class="sca-info-divider"></div>
				{#if hitZone}
					<div class="sca-info-item">
						<span class="sca-info-label">Zone</span>
						<span class="sca-info-value" style="color: {hitZone.color}">{hitZone.label}</span>
					</div>
					<div class="sca-info-divider"></div>
					<div class="sca-info-item">
						<span class="sca-info-label">Timing-Fenster</span>
						<span class="sca-info-value" style="color: {hitZone.color}">
							{((traj.hwLeave - traj.hwEnter) * traj.flightTimeS * 1000).toFixed(0)} ms
						</span>
					</div>
				{:else}
					<div class="sca-info-item">
						<span class="sca-info-label">Zone</span>
						<span class="sca-info-value" style="color: #94a3b8">Keine Zone getroffen</span>
					</div>
				{/if}
			</div>
		{:else}
			<div class="sca-info-row">
				<div class="sca-info-item">
					<span class="sca-info-label">Kraft</span>
					<span class="sca-info-value">{forceN} N</span>
				</div>
				<div class="sca-info-divider"></div>
				<div class="sca-info-item">
					<span class="sca-info-label">Geschwindigkeit</span>
					<span class="sca-info-value">{speedMs} m/s</span>
				</div>
				<div class="sca-info-divider"></div>
				<div class="sca-info-item">
					<span class="sca-info-label">Winkel zur Vertikalen</span>
					<span class="sca-info-value">{forceAngleDeg()}°</span>
				</div>
			</div>
		{/if}
	</div>

</div>

<style>
	.sca-wrapper {
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

	.sca-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.sca-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		user-select: none;
	}
	.sca-toggle input { display: none; }
	.sca-toggle-track {
		width: 36px;
		height: 20px;
		background: #cbd5e1;
		border-radius: 10px;
		position: relative;
		transition: background 150ms;
		flex-shrink: 0;
	}
	.sca-toggle input:checked + .sca-toggle-track { background: #ff3500; }
	.sca-toggle-thumb {
		position: absolute;
		top: 2px; left: 2px;
		width: 16px; height: 16px;
		background: white;
		border-radius: 50%;
		transition: left 150ms;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}
	.sca-toggle input:checked + .sca-toggle-track .sca-toggle-thumb { left: 18px; }
	.sca-toggle-label {
		font-size: 0.875rem;
		color: #64748b;
		font-family: inherit;
	}

	.sca-components-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	.sca-component-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.sca-comp-label {
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 110px;
		white-space: nowrap;
		font-family: inherit;
	}
	.sca-comp-value {
		font-size: 0.85rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
		min-width: 3.5rem;
		text-align: right;
	}
	.sca-slider {
		flex: 1;
		cursor: pointer;
	}
	.sca-slider-fx { accent-color: #2563eb; }
	.sca-slider-fy { accent-color: #16a34a; }
	.sca-slider:disabled { opacity: 0.4; cursor: not-allowed; }

	.sca-svg-wrapper { width: 100%; }
	.sca-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
		cursor: default;
		user-select: none;
		touch-action: none;
	}
	.sca-svg.dragging { cursor: grabbing; }
	.drag-handle { cursor: grab; }

	.sca-action-row { display: flex; justify-content: center; }

	.sca-start-btn, .sca-reset-btn {
		padding: 0.55rem 2.5rem;
		border-radius: 0.5rem;
		border: none;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.sca-start-btn {
		background: #ff3500;
		color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.sca-start-btn:hover { background: #e62f00; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,53,0,0.28); }
	.sca-start-btn:active { transform: translateY(0); }
	.sca-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.sca-reset-btn:hover { background: #e2e8f0; }

	.sca-info-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		min-height: 64px;
		display: flex;
		align-items: center;
	}
	.sca-info-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		flex-wrap: wrap;
		width: 100%;
	}
	.sca-info-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.sca-info-label { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit; white-space: nowrap; }
	.sca-info-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.sca-info-divider { width: 1px; height: 36px; background: #e2e8f0; flex-shrink: 0; }

	@media (max-width: 600px) {
		.sca-wrapper { padding: 1rem; }
	}
</style>
