<script>
	/**
	 * Zuspiel-Simulation — Frontansicht auf das Netz
	 *
	 * Änderungen v2:
	 *  - Ball startet auf 1.8m (Handposition stehend)
	 *  - Zuspieler steht zwischen Z2 und Z3 (x ≈ 5.4m)
	 *  - Strichmännchen (Zuspieler) eingezeichnet
	 *  - Toggle: Flugparabel von Anfang an anzeigen
	 *  - Kraft-Anzeige in m/s am Pfeil
	 *  - Zielzone deutlich stärker hervorgehoben
	 */

	// ─── Physik ───────────────────────────────────────────────────────────────────
	const G = 9.81; // m/s²

	const NET_HEIGHT_M    = 2.43;
	const ANTENNA_ABOVE_M = 0.80;
	const FIELD_WIDTH_M   = 9.0;

	// Startposition: zwischen Z2 (6.3m) und Z3 (4.5m) → x ≈ 5.4m
	// Trennlinie Z2/Z3 liegt bei 5.4m
	const BALL_START_X_M  = 5.4;
	const BALL_START_Y_M  = 1.8;   // Handposition stehend ~1.8m

	// Zuspieler-Geometrie (Körpergrösse 1.75m, proportional)
	const SETTER_HEIGHT_M = 1.75;

	// ─── Tempo-Referenzlinien ─────────────────────────────────────────────────────
	const TEMPO_LINES = [
		{ id: 'quick',  label: 'Shoot / Quick', color: '#dc2626', peakAboveNetM: 0.305 },
		{ id: 'normal', label: 'Normal',         color: '#16a34a', peakAboveNetM: 0.955 },
		{ id: 'oos',    label: 'Out of System',  color: '#ea580c', peakAboveNetM: 2.2   },
	];

	// ─── Angriffszonen (Z5 links → Z1 rechts) ────────────────────────────────────
	const ZONES = [
		{ id: 'z5', label: 'Z5', color: '#2563eb', xM: 0.9 },
		{ id: 'z4', label: 'Z4', color: '#0891b2', xM: 2.7 },
		{ id: 'z3', label: 'Z3', color: '#7c3aed', xM: 4.5 },
		{ id: 'z2', label: 'Z2', color: '#d97706', xM: 6.3 },
		{ id: 'z1', label: 'Z1', color: '#dc2626', xM: 8.1 },
	];
	const ZONE_HALF_W_M = 0.75;

	// Schlagzone: Netzhöhe bis +0.75m
	const HIT_ZONE_MIN_M = NET_HEIGHT_M;
	const HIT_ZONE_MAX_M = NET_HEIGHT_M + 0.75;

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W     = 640;
	const SVG_H     = 420;
	const PX_PER_M  = 56;
	const MARGIN_L  = 48;
	const GROUND_Y  = SVG_H - 44;

	const FIELD_W_PX  = FIELD_WIDTH_M * PX_PER_M;
	const FIELD_LEFT  = MARGIN_L;
	const FIELD_RIGHT = MARGIN_L + FIELD_W_PX;

	/** @param {number} xM */
	function fx(xM) { return FIELD_LEFT + xM * PX_PER_M; }
	/** @param {number} yM */
	function fy(yM) { return GROUND_Y - yM * PX_PER_M; }

	// SVG-Koordinaten des Ball-Startpunkts
	const BALL_SVG_X = fx(BALL_START_X_M);
	const BALL_SVG_Y = fy(BALL_START_Y_M);

	// ─── Strichmännchen-Geometrie ─────────────────────────────────────────────────
	/**
	 * Berechnet alle Proportionen des Zuspielers (identisch zu AttackTimingAnimation).
	 * @param {number} heightM
	 */
	function setterGeometry(heightM) {
		const hPx       = heightM * PX_PER_M;
		const scale     = hPx / (1.75 * PX_PER_M);
		const feetY     = GROUND_Y;
		const hipY      = feetY   - 47  * scale;
		const shoulderY = feetY   - 79  * scale;
		const headY     = feetY   - 93  * scale;
		const handY     = feetY   - 103 * scale;
		const headR     = 8 * scale;
		const bodyW     = 6 * scale;
		const armW      = 9 * scale;
		return { feetY, hipY, shoulderY, headY, handY, headR, bodyW, armW, scale };
	}

	const setterGeo  = setterGeometry(SETTER_HEIGHT_M);
	const setterSvgX = fx(BALL_START_X_M);

	// ─── Kraft-Vektor ─────────────────────────────────────────────────────────────
	// Richtung und Kraft sind entkoppelt:
	//   - Richtung  = Winkel des Pfeils (wohin man zieht)
	//   - Kraft(N)  = Pfeillänge (30–90 px → FORCE_N_MIN–FORCE_N_MAX Newton)
	//   - Pfeillänge hat immer ein sichtbares Minimum (ARROW_MIN_LEN)
	//
	// Physik: v = F * t_Kontakt / m_Ball
	//   → bei 50 N: v = 50 * 0.045 / 0.270 = 8.33 m/s
	//   → bei 20 N: v ≈ 3.3 m/s (tiefes Zuspiel)
	//   → bei 120 N: v = 20 m/s (hartes OOS)

	const BALL_MASS_KG   = 0.270; // kg
	const CONTACT_TIME_S = 0.045; // s

	const FORCE_N_MIN  = 20;   // N bei kürzestem Pfeil
	const FORCE_N_MAX  = 120;  // N bei längstem Pfeil
	const ARROW_MIN_LEN = 38;  // px — Mindestpfeillänge für Sichtbarkeit
	const ARROW_MAX_LEN = 90;  // px — maximale Pfeillänge

	// Startwert 50 N, Richtung schräg links-oben (Richtung Z4)
	// Pfeillänge für 50 N: (50-20)/(120-20) * (90-38) + 38 = 0.3*52+38 = 53.6 px
	const FORCE_N_START = 50;
	const ARROW_LEN_START = forceNtoPx(FORCE_N_START);

	/** @param {number} n Newton → px */
	function forceNtoPx(n) {
		const t = Math.max(0, Math.min(1, (n - FORCE_N_MIN) / (FORCE_N_MAX - FORCE_N_MIN)));
		return ARROW_MIN_LEN + t * (ARROW_MAX_LEN - ARROW_MIN_LEN);
	}
	/** @param {number} px → Newton */
	function pxToForceN(px) {
		const t = Math.max(0, Math.min(1, (px - ARROW_MIN_LEN) / (ARROW_MAX_LEN - ARROW_MIN_LEN)));
		return FORCE_N_MIN + t * (FORCE_N_MAX - FORCE_N_MIN);
	}
	/** @param {number} n Newton → m/s */
	function forceNtoSpeed(n) { return n * CONTACT_TIME_S / BALL_MASS_KG; }

	// Linearer px/N-Faktor für Komponenten (muss vor forceVecX stehen)
	const COMP_PX_PER_N = ARROW_MAX_LEN / FORCE_N_MAX;
	/** Newton → SVG-Pixel für eine einzelne Komponente @param {number} n */
	function compNtoPx(n) { return n * COMP_PX_PER_N; }
	/** SVG-Pixel → Newton für eine einzelne Komponente @param {number} px */
	function compPxToN(px) { return px / COMP_PX_PER_N; }

	// Startwert: 50 N bei 25° zur Vertikalen, gegen Uhrzeigersinn (= nach links)
	// Fx = -50 * sin(25°) ≈ -21.1 N, Fy = 50 * cos(25°) ≈ 45.3 N
	const START_F_N   = 50;
	const START_DEG   = 25; // ° zur Vertikalen, links positiv
	const START_FX_N  = -START_F_N * Math.sin(START_DEG * Math.PI / 180);
	const START_FY_N  =  START_F_N * Math.cos(START_DEG * Math.PI / 180);
	// ─── LocalStorage-Schlüssel ──────────────────────────────────────────────────
	const LS_KEY = 'sa-state-v1';

	/** Liest gespeicherten Zustand aus LocalStorage (nur im Browser) */
	function loadState() {
		if (typeof localStorage === 'undefined') return null;
		try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
	}

	const _saved = loadState();

	let forceVecX = $state(_saved?.forceVecX ?? compNtoPx(START_FX_N));
	let forceVecY = $state(_saved?.forceVecY ?? -compNtoPx(START_FY_N)); // SVG y invertiert

	let isDragging = $state(false);

	// Toggle: Flugparabel von Anfang an anzeigen
	let showTrajectory = $state(_saved?.showTrajectory ?? false);

	// Toggle: Kraftvektor-Komponenten anzeigen + Slider
	let showComponents = $state(_saved?.showComponents ?? false);

	// Slider-Werte in Newton — Konvention intern (SVG-Konvention: links = negativ)
	// Fx: positiv = rechts (SVG), Fy: positiv = aufwärts
	let sliderFx = $state(_saved?.sliderFx ?? START_FX_N); // −30 N
	let sliderFy = $state(_saved?.sliderFy ?? START_FY_N); //  40 N

	// Zustand in LocalStorage speichern wenn er sich ändert
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_KEY, JSON.stringify({
			forceVecX, forceVecY, sliderFx, sliderFy, showTrajectory, showComponents,
		}));
	});

	/**
	 * Setzt forceVec aus Fx/Fy-Komponenten in Newton.
	 * Behält die Mindest-Pfeillänge und Richtung bei.
	 * @param {number} fx Newton horizontal (positiv = rechts)
	 * @param {number} fy Newton vertikal   (positiv = aufwärts)
	 */
	/**
	 * Setzt forceVec aus Fx/Fy-Komponenten in Newton — jede Achse unabhängig.
	 * @param {number} fx Newton horizontal (positiv = rechts)
	 * @param {number} fy Newton vertikal   (positiv = aufwärts)
	 */
	function applyComponents(fx, fy) {
		// Jede Komponente direkt in px umrechnen — keine Normierung, keine Kopplung
		forceVecX =  compNtoPx(Math.max(-FORCE_N_MAX, Math.min(FORCE_N_MAX, fx)));
		forceVecY = -compNtoPx(Math.max(0, Math.min(FORCE_N_MAX, fy))); // SVG y-Achse invertiert
		if (forceVecY > -6) forceVecY = -6;
		if (animState !== 'idle') resetAnimation();
	}

	/**
	 * Liest forceVec aus und schreibt Komponenten zurück in die Slider.
	 * Wird nach jedem SVG-Drag aufgerufen.
	 */
	function syncSlidersFromVec() {
		sliderFx =  compPxToN(forceVecX);          // positiv = rechts
		sliderFy = -compPxToN(forceVecY);           // SVG y-Umkehr rückgängig
		sliderFy = Math.max(0, sliderFy);           // Fy immer ≥ 0
	}

	/** SVG-Referenz für Koordinaten-Umrechnung */
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

	function onSvgMouseDown(/** @type {MouseEvent} */ e) {
		if (animState === 'running') return;
		const pt   = svgPoint(e);
		const dx   = pt.x - BALL_SVG_X;
		const dy   = pt.y - BALL_SVG_Y;
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
		const pt   = svgPoint(e);
		const dx   = pt.x - BALL_SVG_X;
		const dy   = pt.y - BALL_SVG_Y;
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
		let dx = pt.x - BALL_SVG_X;
		let dy = pt.y - BALL_SVG_Y;

		// Nur aufwärts erlauben (dy < 0 im SVG = aufwärts)
		if (dy > -6) dy = -6;

		// Jede Komponente unabhängig auf ARROW_MAX_LEN klemmen
		dx = Math.max(-ARROW_MAX_LEN, Math.min(ARROW_MAX_LEN, dx));
		dy = Math.max(-ARROW_MAX_LEN, Math.min(-6, dy));

		// Wenn Animation läuft, zuerst resetten
		if (animState !== 'idle') resetAnimation();
		forceVecX = dx;
		forceVecY = dy;
		// Slider-Werte nachführen
		syncSlidersFromVec();
	}

	// Pfeilspitze
	let arrowTip = $derived({ x: BALL_SVG_X + forceVecX, y: BALL_SVG_Y + forceVecY });

	// ─── Physik: Kraft-Vektor → Flugkurve ────────────────────────────────────────
	/**
	 * @param {number} fx_px  Kraftvektor x in SVG-Pixeln
	 * @param {number} fy_px  Kraftvektor y in SVG-Pixeln (negativ = aufwärts)
	 */
	function calcTrajectoryFromForce(fx_px, fy_px) {
		const xStartM = BALL_START_X_M;
		const yStartM = BALL_START_Y_M;

		// Jede Komponente unabhängig: px → N → m/s
		// fx_px: positiv = rechts, fy_px: negativ = aufwärts (SVG-Koordinaten)
		const fxN =  compPxToN(fx_px);          // Newton horizontal
		const fyN = -compPxToN(fy_px);          // Newton vertikal (aufwärts positiv)
		const vx  =  forceNtoSpeed(fxN);        // m/s horizontal
		const vy  =  forceNtoSpeed(fyN);        // m/s vertikal (aufwärts positiv)

		// Mindest-Aufwärtskomponente damit der Ball nicht ins Netz geht
		if (vy < 0.5) return { points: [], flightTimeS: 0, speedMs: 0, forceN: 0, hitZoneId: null, netCrossProgress: 0.5, hwEnter: 0, hwLeave: 0, yPeak: 0 };

		// Gesamtkraft und -geschwindigkeit für die Anzeige
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

	// ─── Pfade ───────────────────────────────────────────────────────────────────
	/** Gesamter Vorschau-Pfad */
	let fullPath = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0) return '';
		return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`).join(' ');
	});

	// ─── Animations-Zustand ───────────────────────────────────────────────────────
	let animState     = $state(/** @type {'idle'|'running'|'done'} */ ('idle'));
	let animProgress  = $state(0);
	let elapsedMs     = $state(0);
	/** @type {number|null} */
	let rafId         = null;
	let animStartTime = 0;

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

	// Trail-Segmente (hinter / vor Netz)
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

	// ─── Abgeleitete Werte ────────────────────────────────────────────────────────
	let hitZone     = $derived(ZONES.find(z => z.id === traj.hitZoneId) ?? null);
	let resultColor = $derived(hitZone?.color ?? '#94a3b8');

	// Netz SVG-Positionen
	const netTopY     = fy(NET_HEIGHT_M);
	const netBottomY  = fy(NET_HEIGHT_M - 1.0);
	const postTopY    = netTopY;
	const antennaTopY = fy(NET_HEIGHT_M + ANTENNA_ABOVE_M);

	// Zeitbalken
	const BAR_X = FIELD_LEFT;
	const BAR_W = FIELD_W_PX;
	const BAR_Y = 18;
	const BAR_H = 8;

	// Kraft-Anzeige
	let speedMs       = $derived(traj.speedMs.toFixed(1));
	let forceN        = $derived(traj.forceN.toFixed(0));
	let forceAngleDeg = $derived(() => {
		// Winkel zur Vertikalen (aufwärts = 0°)
		// Gegen Uhrzeigersinn (= nach links) = positiv
		// atan2(vx_phys, vy_phys): vx_phys = forceVecX, vy_phys = -forceVecY
		// Vorzeichen umkehren damit links positiv ist
		const deg = -Math.atan2(forceVecX, -forceVecY) * 180 / Math.PI;
		return deg.toFixed(0);
	});

	// Marker-IDs (eindeutig pro Widget)
	const MARKER_ID    = 'sa-force-arrow';
	const MARKER_ID_FX = 'sa-fx-arrow';
	const MARKER_ID_FY = 'sa-fy-arrow';

	// ─── Animation ───────────────────────────────────────────────────────────────
	function startAnimation() {
		if (traj.points.length < 2) return;
		if (rafId !== null) cancelAnimationFrame(rafId);
		animProgress  = 0;
		elapsedMs     = 0;
		animState     = 'running';
		animStartTime = performance.now();

		// Stoppt wenn Ball unten aus der Schlagzone fällt (hwLeave),
		// oder am Ende der Flugbahn wenn keine Zone getroffen wird.
		const stopAtProgress = traj.hitZoneId !== null ? traj.hwLeave : 1;
		const stopAtMs       = stopAtProgress * traj.flightTimeS * 1000;

		/** @param {number} now */
		function frame(now) {
			const elapsed  = now - animStartTime;
			const progress = Math.min(elapsed / stopAtMs, 1);
			// animProgress muss auf die gesamte Flugbahn (0–1) gemappt werden
			animProgress = progress * stopAtProgress;
			elapsedMs    = elapsed;
			if (progress < 1) {
				rafId = requestAnimationFrame(frame);
			} else {
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
		elapsedMs    = 0;
		animState    = 'idle';
	}

	// Cleanup beim Unmount
	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });
</script>

<div class="sa-wrapper">

	<!-- ── Toggle-Leiste ─────────────────────────────────────────────────────── -->
	<div class="sa-toggle-row">
		<label class="sa-toggle">
			<input type="checkbox" bind:checked={showTrajectory} />
			<span class="sa-toggle-track"><span class="sa-toggle-thumb"></span></span>
			<span class="sa-toggle-label">Flugparabel anzeigen</span>
		</label>
		<label class="sa-toggle">
			<input type="checkbox" bind:checked={showComponents} />
			<span class="sa-toggle-track"><span class="sa-toggle-thumb"></span></span>
			<span class="sa-toggle-label">Kraftkomponenten</span>
		</label>
	</div>

	<!-- ── Komponenten-Regler (nur wenn Toggle aktiv) ────────────────────────── -->
	{#if showComponents}
		<div class="sa-components-panel">
			<div class="sa-component-row">
				<!-- Fx: Slider intern SVG-Konvention (links = negativ).
				     Im UI invertiert anzeigen: links = positiv. -->
				<span class="sa-comp-label" style="color: #2563eb">Fx — links (+) / rechts (−)</span>
				<input
					type="range"
					class="sa-slider sa-slider-fx"
					min={-FORCE_N_MAX}
					max={FORCE_N_MAX}
					step="1"
					value={sliderFx}
					disabled={animState === 'running'}
					oninput={(e) => {
						sliderFx = +e.currentTarget.value;
						applyComponents(sliderFx, sliderFy);
					}}
				/>
				<span class="sa-comp-value" style="color: #2563eb">{(-sliderFx).toFixed(0)} N</span>
			</div>
			<div class="sa-component-row">
				<span class="sa-comp-label" style="color: #16a34a">Fy — aufwärts</span>
				<input
					type="range"
					class="sa-slider sa-slider-fy"
					min="0"
					max={FORCE_N_MAX}
					step="1"
					value={sliderFy}
					disabled={animState === 'running'}
					oninput={(e) => {
						sliderFy = +e.currentTarget.value;
						applyComponents(sliderFx, sliderFy);
					}}
				/>
				<span class="sa-comp-value" style="color: #16a34a">{sliderFy.toFixed(0)} N</span>
			</div>
		</div>
	{/if}

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="sa-svg-wrapper">
		<svg
			bind:this={svgEl}
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="sa-svg"
			class:dragging={isDragging}
			role="img"
			aria-label="Zuspiel-Simulation Frontalansicht"
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

				<!-- Bodenmarkierung: immer sichtbar, aber nur hervorgehoben wenn Treffer -->
				<rect x={zx - zHalfPx} y={GROUND_Y - 4} width={zHalfPx * 2} height="5" rx="2"
					fill={zone.color} opacity={highlight ? 0.5 : 0.12} />

				<!-- Schlagzone — Füllung: nur bei Treffer sichtbar -->
				<rect x={zx - zHalfPx} y={fy(HIT_ZONE_MAX_M)}
					width={zHalfPx * 2} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M)} rx="3"
					fill={zone.color} opacity={highlight ? 0.35 : 0.04}
				/>
				<!-- Schlagzone — Rahmen: immer leicht sichtbar, bei Treffer kräftig -->
				<rect x={zx - zHalfPx} y={fy(HIT_ZONE_MAX_M)}
					width={zHalfPx * 2} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M)} rx="3"
					fill="none" stroke={zone.color}
					stroke-width={highlight ? 3 : 0.8}
					stroke-dasharray={highlight ? '' : '4,3'}
					opacity={highlight ? 1 : 0.22}
				/>
				<!-- Glow-Rahmen bei Treffer -->
				{#if highlight}
					<rect x={zx - zHalfPx - 4} y={fy(HIT_ZONE_MAX_M) - 4}
						width={zHalfPx * 2 + 8} height={fy(HIT_ZONE_MIN_M) - fy(HIT_ZONE_MAX_M) + 8} rx="6"
						fill="none" stroke={zone.color} stroke-width="1.5" opacity="0.4"
					/>
				{/if}

				<!-- Zonen-Label: immer sichtbar, aber hervorgehoben bei Treffer -->
				<text x={zx} y={fy(HIT_ZONE_MAX_M) - 6}
					text-anchor="middle" fill={zone.color}
					font-size={highlight ? '11' : '9'} font-family="sans-serif"
					font-weight={highlight ? '700' : '500'}
					opacity={highlight ? 1 : 0.35}
				>{zone.label}</text>

				<!-- "Schlag!"-Text während Animation -->
				{#if isHit}
					<text x={zx} y={fy((HIT_ZONE_MIN_M + HIT_ZONE_MAX_M) / 2) + 4}
						text-anchor="middle" fill={zone.color}
						font-size="12" font-family="sans-serif" font-weight="700"
					>Schlag!</text>
				{/if}
			{/each}

			<!-- ╔══ Flugparabel (Toggle oder nach Animation) ═══════════════════╗ -->
			{#if (showTrajectory && animState === 'idle') && traj.points.length > 1}
				<!-- Volle Parabel bei Toggle AN -->
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

			<!-- Trail hinter dem Netz (während Animation) -->
			{#if animState !== 'idle' && trailSegments().behind}
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
				{@const vx = FIELD_LEFT + (i + 1) * (FIELD_W_PX / 18)}
				<line x1={vx} y1={netTopY} x2={vx} y2={netBottomY} stroke="#94a3b8" stroke-width="0.7" opacity="0.4" />
			{/each}
			<line x1={FIELD_LEFT} y1={netBottomY} x2={FIELD_RIGHT} y2={netBottomY} stroke="#64748b" stroke-width="2" stroke-linecap="round" />
			<rect x={FIELD_LEFT} y={netTopY - 5} width={FIELD_W_PX} height="7" rx="2" fill="white" stroke="#cbd5e1" stroke-width="1" />
			<!-- Pfosten -->
			<rect x={FIELD_LEFT - 6}  y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />
			<rect x={FIELD_RIGHT}     y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />
			<!-- Antennen -->
			{#each [FIELD_LEFT - 1.5, FIELD_RIGHT - 1.5] as ax}
				{#each Array(10) as _, seg}
					{@const totalH = netBottomY - antennaTopY}
					{@const segH   = totalH / 10}
					<rect x={ax} y={antennaTopY + seg * segH} width="3" height={segH + 0.5}
						fill={seg % 2 === 0 ? '#ef4444' : 'white'} />
				{/each}
			{/each}

			<!-- Trail vor dem Netz -->
			{#if animState !== 'idle' && trailSegments().before}
				<path d={trailSegments().before} fill="none" stroke="#ff3500" stroke-width="2.5" stroke-linecap="round" opacity="0.75" />
			{/if}

			<!-- ╔══ Netzhöhen-Label ════════════════════════════════════════════╗ -->
			<text x={FIELD_LEFT - 10} y={netTopY + 3} text-anchor="end" fill="#475569"
				font-size="8" font-family="sans-serif" font-weight="600">{NET_HEIGHT_M.toFixed(2)}m</text>
			<line x1={FIELD_LEFT - 8} y1={netTopY} x2={FIELD_LEFT} y2={netTopY} stroke="#475569" stroke-width="1.5" />

			<!-- ╔══ Strichmännchen (Zuspieler) ═════════════════════════════════╗ -->
			<!-- Schatten -->
			<ellipse cx={setterSvgX} cy={GROUND_Y - 1} rx={11 * setterGeo.scale} ry="3"
				fill="#94a3b8" opacity="0.22" />
			<!-- Linkes Bein -->
			<line x1={setterSvgX - setterGeo.bodyW} y1={setterGeo.hipY}
				x2={setterSvgX - setterGeo.bodyW * 0.65} y2={setterGeo.feetY}
				stroke="#334155" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8" />
			<!-- Rechtes Bein -->
			<line x1={setterSvgX + setterGeo.bodyW} y1={setterGeo.hipY}
				x2={setterSvgX + setterGeo.bodyW * 0.65} y2={setterGeo.feetY}
				stroke="#334155" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8" />
			<!-- Körper -->
			<line x1={setterSvgX} y1={setterGeo.hipY} x2={setterSvgX} y2={setterGeo.shoulderY}
				stroke="#1e3a5f" stroke-width={3 * setterGeo.scale} stroke-linecap="round" opacity="0.8" />
			<!-- Linker Arm -->
			<line x1={setterSvgX - setterGeo.bodyW} y1={setterGeo.shoulderY + 2 * setterGeo.scale}
				x2={setterSvgX - setterGeo.armW} y2={setterGeo.handY}
				stroke="#1e3a5f" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8" />
			<!-- Rechter Arm -->
			<line x1={setterSvgX + setterGeo.bodyW} y1={setterGeo.shoulderY + 2 * setterGeo.scale}
				x2={setterSvgX + setterGeo.armW} y2={setterGeo.handY}
				stroke="#1e3a5f" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8" />
			<!-- Kopf -->
			<circle cx={setterSvgX} cy={setterGeo.headY} r={setterGeo.headR} fill="#fbbf24" opacity="0.9" />
			<!-- Label -->
			<text x={setterSvgX} y={setterGeo.headY - setterGeo.headR - 4}
				text-anchor="middle" fill="#475569"
				font-size="9" font-family="sans-serif" opacity="0.7">Zuspieler</text>

			<!-- ╔══ Ball + Kraftvektor (Idle und Done) ════════════════════════╗ -->
			{#if animState === 'idle' || animState === 'done'}
				<!-- Startpunkt-Indikator -->
				<circle cx={setterSvgX} cy={BALL_SVG_Y} r="4" fill="#64748b" opacity="0.35" />
				<circle cx={setterSvgX} cy={BALL_SVG_Y} r="8" fill="none" stroke="#64748b"
					stroke-width="1" stroke-dasharray="3,2" opacity="0.2" />

				<!-- Ball -->
				<circle cx={BALL_SVG_X} cy={BALL_SVG_Y} r="11" fill="white" stroke="#ff3500" stroke-width="1.8" opacity="0.9" />
				<path d="M {BALL_SVG_X - 7} {BALL_SVG_Y} Q {BALL_SVG_X} {BALL_SVG_Y - 5} {BALL_SVG_X + 7} {BALL_SVG_Y}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
				<path d="M {BALL_SVG_X - 7} {BALL_SVG_Y} Q {BALL_SVG_X} {BALL_SVG_Y + 5} {BALL_SVG_X + 7} {BALL_SVG_Y}"
					fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
				<line x1={BALL_SVG_X} y1={BALL_SVG_Y - 10} x2={BALL_SVG_X} y2={BALL_SVG_Y + 10}
					stroke="#e2e8f0" stroke-width="0.8" opacity="0.7" />

				<!-- ── Komponenten-Pfeile (wenn Toggle aktiv) ──────────────── -->
				{#if showComponents}
					<!-- Komponenten-Pfeile direkt aus Slider-Werten (unabhängig voneinander) -->
					{@const fxPx  = compNtoPx(sliderFx)}
					{@const fyPx  = compNtoPx(sliderFy)}
					{@const tipFx = { x: BALL_SVG_X + fxPx, y: BALL_SVG_Y      }}
					{@const tipFy = { x: BALL_SVG_X,         y: BALL_SVG_Y - fyPx }}
					<!-- Parallelogramm-Hilfslinien -->
					<line x1={tipFx.x} y1={tipFx.y} x2={arrowTip.x} y2={arrowTip.y}
						stroke="#16a34a" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
					<line x1={tipFy.x} y1={tipFy.y} x2={arrowTip.x} y2={arrowTip.y}
						stroke="#2563eb" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
					<!-- Fx-Pfeil (horizontal, blau) — nur wenn Fx ≠ 0 -->
					{#if Math.abs(fxPx) > 2}
						<line
							x1={BALL_SVG_X} y1={BALL_SVG_Y}
							x2={tipFx.x}    y2={tipFx.y}
							stroke="#2563eb" stroke-width="2" stroke-linecap="round"
							marker-end="url(#{MARKER_ID_FX})" opacity="0.85"
						/>
						{@const fxLabelX  = tipFx.x + (fxPx >= 0 ? 6 : -6)}
						{@const fxAnchor  = fxPx >= 0 ? 'start' : 'end'}
						<text x={fxLabelX} y={tipFx.y + 12}
							text-anchor={fxAnchor}
							fill="#2563eb" font-size="9" font-family="sans-serif" font-weight="700" opacity="0.9"
						>Fx {(-sliderFx).toFixed(0)} N</text>
					{/if}
					<!-- Fy-Pfeil (vertikal, grün) — nur wenn Fy ≠ 0 -->
					{#if fyPx > 2}
						<line
							x1={BALL_SVG_X} y1={BALL_SVG_Y}
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

				<!-- Resultierender Kraftvektor-Pfeil -->
				<line
					x1={BALL_SVG_X} y1={BALL_SVG_Y}
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

				<!-- Hinweis-Text (nur im Idle, nur wenn Komponenten-Modus aus) -->
				{#if animState === 'idle' && !showComponents}
					<text x={BALL_SVG_X} y={BALL_SVG_Y + 28}
						text-anchor="middle" fill="#94a3b8"
						font-size="8.5" font-family="sans-serif" opacity="0.85"
					>Pfeil ziehen um Richtung einzustellen</text>
				{/if}
			{/if}

			<!-- ╔══ Ball (Animation) ═══════════════════════════════════════════╗ -->
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
				<!-- Gesamtbalken (Breite = gesamtes Schlagfenster von 0 bis hwLeave) -->
				<rect x={BAR_X} y={BAR_Y} width={hwLeaveX - BAR_X} height={BAR_H} rx="4" fill="#e2e8f0" />
				<!-- Schlagfenster hervorgehoben -->
				<rect x={hwEnterX} y={BAR_Y - 3} width={hwLeaveX - hwEnterX} height={BAR_H + 6}
					rx="4" fill={resultColor} opacity="0.45" />
				<!-- Zeitbeschriftungen -->
				<text x={BAR_X} y={BAR_Y + BAR_H + 12} fill="#64748b" font-size="8" font-family="sans-serif">0s</text>
				<text x={hwLeaveX} y={BAR_Y + BAR_H + 12} text-anchor="end"
					fill="#94a3b8" font-size="8" font-family="sans-serif"
				>{(traj.hwLeave * traj.flightTimeS).toFixed(2)}s</text>
				<!-- Fenster-Label -->
				<text
					x={hwEnterX + (hwLeaveX - hwEnterX) / 2} y={BAR_Y + BAR_H + 24}
					text-anchor="middle" fill={resultColor}
					font-size="8" font-family="sans-serif" font-weight="700" opacity="0.7"
				>{((traj.hwLeave - traj.hwEnter) * traj.flightTimeS * 1000).toFixed(0)}ms Fenster</text>
			{/if}
		</svg>
	</div>

	<!-- ── Aktions-Zeile ─────────────────────────────────────────────────────── -->
	<div class="sa-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="sa-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Simulation starten'}
			</button>
		{:else}
			<button class="sa-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Info-Panel (immer sichtbar, kein Layout-Sprung) ──────────────────── -->
	<!--
		Idle:    Kraft / Geschwindigkeit / Winkel (Vorschau)
		Running: wie Idle (Werte ändern sich nicht während Animation)
		Done:    Flugzeit / Kraft / Zone / Fenster
		Alle Zustände belegen dieselbe Höhe — kein {#if} auf oberster Ebene.
	-->
	<div class="sa-info-panel">
		{#if animState === 'done'}
			<!-- Ergebnis-Zeile -->
			<div class="sa-info-row">
				<div class="sa-info-item">
					<span class="sa-info-label">Flugzeit bis Schlagzone</span>
					<span class="sa-info-value">{(traj.hwLeave * traj.flightTimeS).toFixed(2)} s</span>
				</div>
				<div class="sa-info-divider"></div>
				<div class="sa-info-item">
					<span class="sa-info-label">Kraft</span>
					<span class="sa-info-value">{forceN} N</span>
				</div>
				<div class="sa-info-divider"></div>
				{#if hitZone}
					<div class="sa-info-item">
						<span class="sa-info-label">Zone</span>
						<span class="sa-info-value" style="color: {hitZone.color}">{hitZone.label}</span>
					</div>
					<div class="sa-info-divider"></div>
					<div class="sa-info-item">
						<span class="sa-info-label">Timing-Fenster</span>
						<span class="sa-info-value" style="color: {hitZone.color}">
							{((traj.hwLeave - traj.hwEnter) * traj.flightTimeS * 1000).toFixed(0)} ms
						</span>
					</div>
				{:else}
					<div class="sa-info-item">
						<span class="sa-info-label">Zone</span>
						<span class="sa-info-value" style="color: #94a3b8">Keine Zone getroffen</span>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Vorschau-Zeile (Idle + Running) -->
			<div class="sa-info-row">
				<div class="sa-info-item">
					<span class="sa-info-label">Kraft</span>
					<span class="sa-info-value">{forceN} N</span>
				</div>
				<div class="sa-info-divider"></div>
				<div class="sa-info-item">
					<span class="sa-info-label">Geschwindigkeit</span>
					<span class="sa-info-value">{speedMs} m/s</span>
				</div>
				<div class="sa-info-divider"></div>
				<div class="sa-info-item">
					<span class="sa-info-label">Winkel zur Vertikalen</span>
					<span class="sa-info-value">{forceAngleDeg()}°</span>
				</div>
			</div>
		{/if}
	</div>

</div>

<style>
	.sa-wrapper {
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

	/* ── Toggle ───────────────────────────────────────────── */
	.sa-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.sa-toggle {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
		user-select: none;
	}
	.sa-toggle input { display: none; }
	.sa-toggle-track {
		width: 36px;
		height: 20px;
		background: #cbd5e1;
		border-radius: 10px;
		position: relative;
		transition: background 150ms;
		flex-shrink: 0;
	}
	.sa-toggle input:checked + .sa-toggle-track { background: #ff3500; }
	.sa-toggle-thumb {
		position: absolute;
		top: 2px; left: 2px;
		width: 16px; height: 16px;
		background: white;
		border-radius: 50%;
		transition: left 150ms;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
	}
	.sa-toggle input:checked + .sa-toggle-track .sa-toggle-thumb { left: 18px; }
	.sa-toggle-label {
		font-size: 0.875rem;
		color: #64748b;
		font-family: inherit;
	}

	/* ── Komponenten-Regler ──────────────────────────────── */
	.sa-components-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	.sa-component-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.sa-comp-label {
		font-size: 0.8rem;
		font-weight: 600;
		min-width: 110px;
		white-space: nowrap;
		font-family: inherit;
	}
	.sa-comp-value {
		font-size: 0.85rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
		min-width: 3.5rem;
		text-align: right;
	}
	.sa-slider {
		flex: 1;
		cursor: pointer;
	}
	.sa-slider-fx { accent-color: #2563eb; }
	.sa-slider-fy { accent-color: #16a34a; }
	.sa-slider:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── SVG ──────────────────────────────────────────────── */
	.sa-svg-wrapper { width: 100%; }
	.sa-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
		cursor: default;
		user-select: none;
		touch-action: none;
	}
	.sa-svg.dragging { cursor: grabbing; }
	.drag-handle { cursor: grab; }

	/* ── Aktions-Zeile ────────────────────────────────────── */
	.sa-action-row { display: flex; justify-content: center; }

	.sa-start-btn, .sa-reset-btn {
		padding: 0.55rem 2.5rem;
		border-radius: 0.5rem;
		border: none;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.sa-start-btn {
		background: #ff3500;
		color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.sa-start-btn:hover { background: #e62f00; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,53,0,0.28); }
	.sa-start-btn:active { transform: translateY(0); }
	.sa-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.sa-reset-btn:hover { background: #e2e8f0; }

	/* ── Info-Panel (ersetzt Ergebnis + Vorschau) ────────── */
	.sa-info-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		/* Feste Mindesthöhe verhindert Layout-Sprünge */
		min-height: 64px;
		display: flex;
		align-items: center;
	}
	.sa-info-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		flex-wrap: wrap;
		width: 100%;
	}
	.sa-info-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.sa-info-label { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit; white-space: nowrap; }
	.sa-info-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.sa-info-divider { width: 1px; height: 36px; background: #e2e8f0; flex-shrink: 0; }

	/* ── Responsive ───────────────────────────────────────── */
	@media (max-width: 600px) {
		.sa-wrapper { padding: 1rem; }
		.sa-result-panel { gap: 0.75rem; }
	}
</style>
