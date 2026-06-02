<script>
	/**
	 * Zuspiel-Draufsicht — eine Feldhälfte von oben
	 *
	 * Physik-Modell (wie Aufriss-Widget SetAnimation):
	 *   Fx = Kraft entlang der Flugbahn (N): positiv = vorwärts in Grundrichtung
	 *        → bestimmt die horizontale Reichweite
	 *   Fy = Aufwärtskraft (N): positiv = aufwärts → bestimmt Flugzeit
	 *
	 * Handle → Grundrichtung (angleDeg). Der Ballpfeil zeigt in diese Richtung,
	 * mit Länge = Fx * t_k/m * tFlight.
	 * Ausrichtung ändert sich NICHT bei Vorzeichenwechsel von Fx.
	 *
	 * Abweichungswinkel: Netz-Parallele als Referenz (0° = nach links/Z5)
	 *   im Uhrzeigersinn positiv
	 */

	// ─── Physik ───────────────────────────────────────────────────────────────────
	const G              = 9.81;
	const BALL_MASS_KG   = 0.270;
	const CONTACT_TIME_S = 0.045;
	const NET_HEIGHT_M   = 2.43;
	const BALL_START_H_M = 1.80;

	/** @param {number} n Newton → m/s */
	function forceToSpeed(n) { return n * CONTACT_TIME_S / BALL_MASS_KG; }

	/**
	 * Flugzeit bis Ball auf NET_HEIGHT_M fällt (absteigender Ast).
	 * Parabel: h(t) = h0 + vy*t − ½g·t²
	 * @param {number} fyN Aufwärtskraft in Newton
	 */
	function flightTime(fyN) {
		const vy = forceToSpeed(Math.max(0, fyN));
		const h0 = BALL_START_H_M;
		const hT = NET_HEIGHT_M;
		if (vy < 0.01) return 0;
		// h0 + vy·t − ½g·t² = hT  →  ½g·t² − vy·t + (hT−h0) = 0
		const a = 0.5 * G, b = -vy, c = hT - h0;
		const disc = b * b - 4 * a * c;
		if (disc < 0) return 0;
		const t1 = (-b - Math.sqrt(disc)) / (2 * a);
		const t2 = (-b + Math.sqrt(disc)) / (2 * a);
		const tL = Math.max(t1, t2);
		return tL > 0 ? tL : 0;
	}

	// ─── Kraft-Grenzen ────────────────────────────────────────────────────────────
	const FORCE_N_MAX = 120;

	// Startwerte: 45 N aufwärts, 21 N vorwärts → entspricht 50 N bei 25° zur Vertikalen
	const FX_DEFAULT =  21;   // N entlang Flugbahn (vorwärts)
	const FY_DEFAULT =  45;   // N aufwärts

	// ─── Feld-Geometrie ───────────────────────────────────────────────────────────
	const FIELD_WIDTH_M = 9.0;
	const FIELD_DEPTH_M = 9.0;
	const ATTACK_LINE_M = 3.0;
	const ZONE_W_M      = 1.5;

	const FZ_START_M = 0.20;
	const FZ_END_M   = 1.50;
	const BZ_START_M = 2.00;
	const BZ_END_M   = 3.20;

	const ZONE_CENTERS = [
		{ label: 'Z5', backLabel: 'A', color: '#2563eb', xM: 0.9 },
		{ label: 'Z4', backLabel: 'B', color: '#0891b2', xM: 2.7 },
		{ label: 'Z3', backLabel: 'C', color: '#7c3aed', xM: 4.5 },
		{ label: 'Z2', backLabel: 'D', color: '#d97706', xM: 6.3 },
		{ label: 'Z1', backLabel: 'E', color: '#dc2626', xM: 8.1 },
	];

	const FRONT_ZONES = ZONE_CENTERS.map(z => ({ id: z.label,     label: z.label,     color: z.color, xM: z.xM, yStartM: FZ_START_M, yEndM: FZ_END_M  }));
	const BACK_ZONES  = ZONE_CENTERS.map(z => ({ id: z.backLabel, label: z.backLabel, color: z.color, xM: z.xM, yStartM: BZ_START_M, yEndM: BZ_END_M  }));
	const ALL_ZONES   = [...FRONT_ZONES, ...BACK_ZONES];

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W    = 520;
	const SVG_H    = 510;
	const MARGIN_T = 32;
	const MARGIN_B = 28;
	const MARGIN_L = 36;
	const MARGIN_R = 12;

	const FIELD_W_PX = SVG_W - MARGIN_L - MARGIN_R;
	const FIELD_H_PX = SVG_H - MARGIN_T - MARGIN_B;
	const PX_PER_M_X = FIELD_W_PX / FIELD_WIDTH_M;
	const PX_PER_M_Y = FIELD_H_PX / FIELD_DEPTH_M;
	const FIELD_X0   = MARGIN_L;
	const FIELD_Y0   = MARGIN_T;

	/** @param {number} xM */ function fx(xM) { return FIELD_X0 + xM * PX_PER_M_X; }
	/** @param {number} yM */ function fy(yM) { return FIELD_Y0 + yM * PX_PER_M_Y; }

	const NET_Y   = fy(0);
	const BASE_Y  = fy(FIELD_DEPTH_M);
	const LEFT_X  = fx(0);
	const RIGHT_X = fx(FIELD_WIDTH_M);
	const ATK_Y   = fy(ATTACK_LINE_M);

	// ─── Strichmännchen ───────────────────────────────────────────────────────────
	const FIGURE_R_M      = 0.22;
	const FIGURE_R_PX     = FIGURE_R_M * PX_PER_M_X;
	const HEAD_OFFSET_M   = 0.28;
	const HEAD_R_PX       = FIGURE_R_PX * 0.55;
	const HANDLE_OFFSET_M = 0.55;
	const HANDLE_R_PX     = 7;

	// ─── LocalStorage-Schlüssel ──────────────────────────────────────────────────
	const LS_KEY = 'stv-state-v1';

	/** Liest gespeicherten Zustand aus LocalStorage (nur im Browser) */
	function loadState() {
		if (typeof localStorage === 'undefined') return null;
		try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
	}

	const _saved = loadState();

	// ─── Reaktiver Zustand ────────────────────────────────────────────────────────
	let posXm = $state(_saved?.posXm ?? 5.4);   // zwischen Z2 (6.3m) und Z3 (4.5m)
	let posYm = $state(_saved?.posYm ?? 1.0);   // 1m hinter dem Netz

	// Grundrichtung: angleDeg (0° = Netz, UZS positiv)
	let angleDeg = $state(_saved?.angleDeg ?? 270); // nach links (Richtung Z5)

	// Kraft-Komponenten wie im Aufriss:
	// Fx: positiv = links (Z5), negativ = rechts (Z1)
	// Fy: positiv = aufwärts → bestimmt Reichweite
	let forceX = $state(_saved?.forceX ?? FX_DEFAULT);
	let forceY = $state(_saved?.forceY ?? FY_DEFAULT);

	// Zustand in LocalStorage speichern wenn er sich ändert
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_KEY, JSON.stringify({
			posXm, posYm, angleDeg, forceX, forceY,
		}));
	});

	let isDraggingBody   = $state(false);
	let isDraggingHandle = $state(false);

	let svgEl = $state(/** @type {SVGSVGElement|null} */ (null));

	// ─── Koordinaten-Hilfsfunktionen ──────────────────────────────────────────────
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

	function svgToField(/** @type {{ x: number, y: number }} */ pt) {
		return {
			xM: Math.max(0.3, Math.min(FIELD_WIDTH_M - 0.3, (pt.x - FIELD_X0) / PX_PER_M_X)),
			yM: Math.max(0.3, Math.min(FIELD_DEPTH_M - 0.3, (pt.y - FIELD_Y0) / PX_PER_M_Y)),
		};
	}

	// ─── Grundrichtung (Handle) ───────────────────────────────────────────────────
	let angleRad    = $derived(angleDeg * Math.PI / 180);
	let baseDirSvgX = $derived( Math.sin(angleRad));  // SVG-x, positiv = rechts
	let baseDirSvgY = $derived(-Math.cos(angleRad));  // SVG-y, negativ = Netz (aufwärts)

	let bodyX   = $derived(fx(posXm));
	let bodyY   = $derived(fy(posYm));
	let headX   = $derived(bodyX + baseDirSvgX * HEAD_OFFSET_M   * PX_PER_M_X);
	let headY   = $derived(bodyY + baseDirSvgY * HEAD_OFFSET_M   * PX_PER_M_Y);
	let handleX = $derived(bodyX + baseDirSvgX * HANDLE_OFFSET_M * PX_PER_M_X);
	let handleY = $derived(bodyY + baseDirSvgY * HANDLE_OFFSET_M * PX_PER_M_Y);

	// ─── Physik: Landepunkt ──────────────────────────────────────────────────────
	// Fx: Kraft entlang der Flugbahn (Grundrichtung), positiv = vorwärts
	//     → horizontale Geschwindigkeit vx = Fx * t_k / m
	// Fy: Kraft aufwärts, positiv = aufwärts
	//     → vertikale Geschwindigkeit vy = Fy * t_k / m → Flugzeit
	//
	// Landepunkt = Startpos + Grundrichtung * vx * tFlight
	// (in SVG-Koordinaten, Grundrichtung = (baseDirSvgX, baseDirSvgY))

	let tLand  = $derived(flightTime(forceY));
	let vxMs   = $derived(forceToSpeed(forceX));  // Vorwärtsgeschwindigkeit entlang Grundrichtung

	// Landepunkt in SVG
	let landSvgX = $derived(bodyX + baseDirSvgX * vxMs * tLand * PX_PER_M_X);
	let landSvgY = $derived(bodyY + baseDirSvgY * vxMs * tLand * PX_PER_M_Y);

	// Landepunkt in Feld-Koordinaten (für Zonenerkennung)
	let landFieldX = $derived((landSvgX - FIELD_X0) / PX_PER_M_X);
	let landFieldY = $derived((landSvgY - FIELD_Y0) / PX_PER_M_Y);

	// Reichweite (Länge des Pfeils) in SVG-Pixeln — begrenzt auf Feldrand
	let dirLine = $derived((() => {
		if (tLand <= 0) return { x1: bodyX, y1: bodyY, x2: bodyX, y2: bodyY };

		// Startpunkt: Figurvorderkante in Richtung des Landepunkts
		const dx = landSvgX - bodyX;
		const dy = landSvgY - bodyY;
		const dist = Math.hypot(dx, dy);
		const ux = dist > 1 ? dx / dist : 0;
		const uy = dist > 1 ? dy / dist : 0;

		const startX = bodyX + ux * FIGURE_R_PX;
		const startY = bodyY + uy * FIGURE_R_PX;

		// Endpunkt: auf Feldgrenzen klemmen
		const endXm = Math.max(0, Math.min(FIELD_WIDTH_M, landFieldX));
		const endYm = Math.max(0, Math.min(FIELD_DEPTH_M, landFieldY));

		return { x1: startX, y1: startY, x2: fx(endXm), y2: fy(endYm) };
	})());

	// Reichweite für Anzeige
	let reachM = $derived(Math.hypot(
		(landFieldX - posXm),
		(landFieldY - posYm)
	));

	// ─── Treffer-Zone ─────────────────────────────────────────────────────────────
	let hitZoneId = $derived((() => {
		if (tLand <= 0) return /** @type {string|null} */ (null);
		const lx = Math.max(0, Math.min(FIELD_WIDTH_M, landFieldX));
		const ly = Math.max(0, Math.min(FIELD_DEPTH_M, landFieldY));
		for (const zone of ALL_ZONES) {
			if (ly >= zone.yStartM && ly <= zone.yEndM && Math.abs(lx - zone.xM) <= ZONE_W_M / 2) {
				return zone.id;
			}
		}
		return /** @type {string|null} */ (null);
	})());

	let hitZone = $derived(ALL_ZONES.find(z => z.id === hitZoneId) ?? null);

	// ─── Event-Handler ────────────────────────────────────────────────────────────
	/** @param {MouseEvent|TouchEvent} e */
	function onPointerDown(e) {
		const pt = svgPoint(e);
		const dh = Math.hypot(pt.x - handleX, pt.y - handleY);
		const db = Math.hypot(pt.x - bodyX,   pt.y - bodyY);
		if (dh < HANDLE_R_PX + 12) {
			isDraggingHandle = true;
			e.preventDefault();
		} else if (db < FIGURE_R_PX + 14) {
			isDraggingBody = true;
			e.preventDefault();
		}
	}

	/** @param {MouseEvent|TouchEvent} e */
	function onPointerMove(e) {
		if (!isDraggingBody && !isDraggingHandle) return;
		const pt = svgPoint(e);
		if (isDraggingHandle) {
			// Handle dreht nur angleDeg — Fx/Fy bleiben unverändert
			const dx = pt.x - bodyX;
			const dy = pt.y - bodyY;
			const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
			angleDeg = ((angle % 360) + 360) % 360;
		} else {
			const f = svgToField(pt);
			posXm = f.xM;
			posYm = f.yM;
		}
		e.preventDefault();
	}

	function onPointerUp() {
		isDraggingBody   = false;
		isDraggingHandle = false;
	}

	// ─── Abweichungswinkel (Netz-Parallele als Referenz) ─────────────────────────
	// 0° = nach links (Richtung Z5), UZS = positiv
	// Berechnet aus dem tatsächlichen Ball-Richtungsvektor (Landepunkt − Startpunkt)
	let deviationAngleDeg = $derived((() => {
		const dx = landSvgX - bodyX; // SVG-x = Feld-x
		const dy = landSvgY - bodyY; // SVG-y, positiv = Grundlinie
		if (Math.hypot(dx, dy) < 1) return '0';
		// Winkel zur negativen x-Achse (links), UZS = positiv
		// atan2(fieldNy, -fieldNx) mit fieldNy = −dy/PX_PER_M_Y (Netz-Richtung pos.)
		// Einfacher: atan2(-dy, -dx) gibt Winkel von der negativen x-Achse (links), UZS
		// Überprüfung: dx<0, dy<0 (Richtung links-oben/Netz) → atan2(+,+) = pos → UZS ✓
		const a = Math.atan2(-dy, -dx) * 180 / Math.PI;
		return a.toFixed(0);
	})());

	// ─── Strichmännchen-Hilfsgrößen ───────────────────────────────────────────────
	let armLen   = $derived(FIGURE_R_PX * 0.95);
	let armDx    = $derived( baseDirSvgY * armLen);
	let armDy    = $derived(-baseDirSvgX * armLen);
	let legLen   = $derived(FIGURE_R_PX * 1.1);
	let leg1EndX = $derived(bodyX + (-baseDirSvgX * 0.7 +  baseDirSvgY * 0.5) * legLen);
	let leg1EndY = $derived(bodyY + (-baseDirSvgY * 0.7 + -baseDirSvgX * 0.5) * legLen);
	let leg2EndX = $derived(bodyX + (-baseDirSvgX * 0.7 -  baseDirSvgY * 0.5) * legLen);
	let leg2EndY = $derived(bodyY + (-baseDirSvgY * 0.7 - -baseDirSvgX * 0.5) * legLen);
	let lblOffX  = $derived(-baseDirSvgX * (FIGURE_R_PX + 14));
	let lblOffY  = $derived(-baseDirSvgY * (FIGURE_R_PX + 14));

	// ─── Winkelbogen (Netz-Parallele links → Richtungslinie) ─────────────────────
	const ANGLE_ARC_R     = 28;
	const NORMAL_LINE_LEN = ANGLE_ARC_R;

	// Richtungsvektor des Balls (Landepunkt → normiert)
	let ballDirSvgX = $derived((() => {
		const dx = landSvgX - bodyX, dy = landSvgY - bodyY;
		const l = Math.hypot(dx, dy);
		return l > 1 ? dx / l : baseDirSvgX;
	})());
	let ballDirSvgY = $derived((() => {
		const dx = landSvgX - bodyX, dy = landSvgY - bodyY;
		const l = Math.hypot(dx, dy);
		return l > 1 ? dy / l : baseDirSvgY;
	})());

	let angleBowPath = $derived((() => {
		const cx = bodyX, cy = bodyY;
		const startX = cx - ANGLE_ARC_R; // nach links (0°)
		const startY = cy;
		const endX = cx + ballDirSvgX * ANGLE_ARC_R;
		const endY = cy + ballDirSvgY * ANGLE_ARC_R;
		if (Math.hypot(endX - startX, endY - startY) < 2) return '';
		// UZS von (−1,0) zu ballDir: sweep=1 wenn ballDirSvgY <= 0 (nach oben/Netz)
		const sweep = ballDirSvgY <= 0 ? 1 : 0;
		return `M ${startX.toFixed(1)} ${startY.toFixed(1)} A ${ANGLE_ARC_R} ${ANGLE_ARC_R} 0 0 ${sweep} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
	})());

	let angleLabelPos = $derived((() => {
		const cx = bodyX, cy = bodyY;
		const mx = -1 + ballDirSvgX, my = ballDirSvgY;
		const mlen = Math.hypot(mx, my);
		const labelR = ANGLE_ARC_R + 13;
		if (mlen < 0.01) return { x: cx, y: cy + labelR };
		return { x: cx + (mx / mlen) * labelR, y: cy + (my / mlen) * labelR };
	})());

	// Info-Box
	const infX = SVG_W - 10;
	const infY = MARGIN_T + 10;

	// Resultierende Kraft und Handgeschwindigkeit
	let fResN    = $derived(Math.sqrt(forceX * forceX + forceY * forceY));
	let vHandMs  = $derived(forceToSpeed(fResN));
	// Anzeige
	let speedMs = $derived(vxMs.toFixed(1));
</script>

<div class="stv-wrapper">

	<!-- ── Kraft-Regler ───────────────────────────────────────────────────────── -->
	<div class="stv-force-panel">
		<div class="stv-component-row">
			<span class="stv-comp-label" style="color: #2563eb">Fx (Flugbahn, + = vorwärts)</span>
			<input type="range" class="stv-slider stv-slider-x"
				min={-FORCE_N_MAX} max={FORCE_N_MAX} step="1" bind:value={forceX} />
			<span class="stv-comp-value" style="color: #2563eb">
				{forceX > 0 ? '+' : ''}{forceX.toFixed(0)} N
			</span>
		</div>
		<div class="stv-component-row">
			<span class="stv-comp-label" style="color: #16a34a">Fy (aufwärts)</span>
			<input type="range" class="stv-slider stv-slider-y"
				min="0" max={FORCE_N_MAX} step="1" bind:value={forceY} />
			<span class="stv-comp-value" style="color: #16a34a">
				{forceY.toFixed(0)} N
			</span>
		</div>
		<div class="stv-force-summary">
			Flugzeit: {tLand.toFixed(2)} s &nbsp;·&nbsp; vx: {speedMs} m/s &nbsp;·&nbsp; Reichweite: {reachM.toFixed(1)} m
		</div>
	</div>

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="stv-svg-wrapper">
		<svg
			bind:this={svgEl}
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="stv-svg"
			class:dragging-body={isDraggingBody}
			class:dragging-handle={isDraggingHandle}
			role="img"
			aria-label="Zuspiel-Draufsicht"
			onmousedown={onPointerDown}
			onmousemove={onPointerMove}
			onmouseup={onPointerUp}
			onmouseleave={onPointerUp}
			ontouchstart={onPointerDown}
			ontouchmove={onPointerMove}
			ontouchend={onPointerUp}
		>
			<!-- ╔══ Hintergrund ════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- ╔══ Feldbelag ════════════════════════════════════════════════╗ -->
			<rect x={LEFT_X} y={NET_Y} width={RIGHT_X - LEFT_X} height={ATK_Y - NET_Y}
				fill="#dbeafe" opacity="0.55" />
			<rect x={LEFT_X} y={ATK_Y} width={RIGHT_X - LEFT_X} height={BASE_Y - ATK_Y}
				fill="#e0f2fe" opacity="0.35" />

			<!-- ╔══ Raster-Hilfslinien ═══════════════════════════════════════╗ -->
			{#each [1,2,3,4,5,6,7,8] as xM}
				<line x1={fx(xM)} y1={NET_Y} x2={fx(xM)} y2={BASE_Y}
					stroke="#cbd5e1" stroke-width="0.5" opacity="0.45" />
			{/each}
			{#each [1,2,4,5,6,7,8] as yM}
				<line x1={LEFT_X} y1={fy(yM)} x2={RIGHT_X} y2={fy(yM)}
					stroke="#cbd5e1" stroke-width="0.5" opacity="0.45" />
			{/each}

			<!-- ╔══ Feldmarkierungen ════════════════════════════════════════╗ -->
			<line x1={LEFT_X}  y1={NET_Y}  x2={LEFT_X}  y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={RIGHT_X} y1={NET_Y}  x2={RIGHT_X} y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={LEFT_X}  y1={BASE_Y} x2={RIGHT_X} y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={LEFT_X}  y1={ATK_Y}  x2={RIGHT_X} y2={ATK_Y}
				stroke="#475569" stroke-width="2" stroke-dasharray="8,5" opacity="0.85" />
			<text x={LEFT_X - 6} y={ATK_Y + 3} text-anchor="end"
				fill="#475569" font-size="8" font-family="sans-serif" font-weight="600" opacity="0.8"
			>3m</text>

			<!-- ╔══ Tiefenbeschriftung ══════════════════════════════════════╗ -->
			{#each [1,2,3,4,5,6,7,8] as yM}
				<line x1={LEFT_X - 5} y1={fy(yM)} x2={LEFT_X} y2={fy(yM)} stroke="#94a3b8" stroke-width="1" />
				<text x={LEFT_X - 7} y={fy(yM) + 3} text-anchor="end"
					fill="#94a3b8" font-size="7.5" font-family="sans-serif">{yM}m</text>
			{/each}

			<!-- ╔══ Zonen-Trennlinien ═══════════════════════════════════════╗ -->
			{#each [1.8, 3.6, 5.4, 7.2] as xM}
				<line x1={fx(xM)} y1={NET_Y} x2={fx(xM)} y2={BASE_Y}
					stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.35" />
			{/each}

			<!-- ╔══ Vorderzonen Z1–Z5 ══════════════════════════════════════╗ -->
			{#each FRONT_ZONES as zone (zone.id)}
				{@const zLeft  = fx(zone.xM - ZONE_W_M / 2)}
				{@const zRight = fx(zone.xM + ZONE_W_M / 2)}
				{@const zTop   = fy(zone.yStartM)}
				{@const zBot   = fy(zone.yEndM)}
				{@const zW     = zRight - zLeft}
				{@const zH     = zBot - zTop}
				{@const isHit  = zone.id === hitZoneId}
				<rect x={zLeft} y={zTop} width={zW} height={zH} rx="3"
					fill={zone.color} opacity={isHit ? 0.35 : 0.1} />
				<rect x={zLeft} y={zTop} width={zW} height={zH} rx="3" fill="none"
					stroke={zone.color} stroke-width={isHit ? 2.5 : 1}
					stroke-dasharray={isHit ? '' : '4,3'} opacity={isHit ? 0.95 : 0.5} />
				{#if isHit}
					<rect x={zLeft - 3} y={zTop - 3} width={zW + 6} height={zH + 6}
						rx="5" fill="none" stroke={zone.color} stroke-width="2" opacity="0.4" />
				{/if}
				<text x={(zLeft + zRight) / 2} y={zTop + zH / 2 + 4}
					text-anchor="middle" fill={zone.color}
					font-size={isHit ? '11' : '9'} font-family="sans-serif"
					font-weight={isHit ? '700' : '600'} opacity={isHit ? 1 : 0.7}
				>{zone.label}</text>
			{/each}

			<!-- ╔══ Netz ════════════════════════════════════════════════════╗ -->
			<rect x={LEFT_X} y={NET_Y - 7} width={RIGHT_X - LEFT_X} height="10"
				fill="#94a3b8" opacity="0.2" rx="2" />
			<rect x={LEFT_X} y={NET_Y - 5} width={RIGHT_X - LEFT_X} height="6"
				fill="white" stroke="#94a3b8" stroke-width="1" rx="1" opacity="0.9" />
			<line x1={LEFT_X} y1={NET_Y} x2={RIGHT_X} y2={NET_Y}
				stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
			{#each [LEFT_X, RIGHT_X] as ax}
				{#each Array(6) as _, seg}
					{@const segH = 6}
					<rect x={ax - 2} y={NET_Y - 5 - seg * segH} width="4" height={segH}
						fill={seg % 2 === 0 ? '#ef4444' : 'white'} opacity="0.85" />
				{/each}
			{/each}
			<text x={(LEFT_X + RIGHT_X) / 2} y={NET_Y - 12}
				text-anchor="middle" fill="#475569"
				font-size="10" font-family="sans-serif" font-weight="700" opacity="0.7"
			>Netz</text>

			<!-- ╔══ Rückraumzonen A–E ══════════════════════════════════════╗ -->
			{#each BACK_ZONES as zone (zone.id)}
				{@const zLeft  = fx(zone.xM - ZONE_W_M / 2)}
				{@const zRight = fx(zone.xM + ZONE_W_M / 2)}
				{@const zTop   = fy(zone.yStartM)}
				{@const zBot   = fy(zone.yEndM)}
				{@const zW     = zRight - zLeft}
				{@const zH     = zBot - zTop}
				{@const isHit  = zone.id === hitZoneId}
				<rect x={zLeft} y={zTop} width={zW} height={zH} rx="3"
					fill={zone.color} opacity={isHit ? 0.35 : 0.08} />
				<rect x={zLeft} y={zTop} width={zW} height={zH} rx="3" fill="none"
					stroke={zone.color} stroke-width={isHit ? 2.5 : 1}
					stroke-dasharray={isHit ? '' : '3,3'} opacity={isHit ? 0.95 : 0.4} />
				{#if isHit}
					<rect x={zLeft - 3} y={zTop - 3} width={zW + 6} height={zH + 6}
						rx="5" fill="none" stroke={zone.color} stroke-width="2" opacity="0.4" />
				{/if}
				<text x={(zLeft + zRight) / 2} y={zTop + zH / 2 + 4}
					text-anchor="middle" fill={zone.color}
					font-size={isHit ? '11' : '9'} font-family="sans-serif"
					font-weight={isHit ? '700' : '600'} opacity={isHit ? 1 : 0.6}
				>{zone.label}</text>
			{/each}

			<!-- ╔══ Grundrichtung (gedimmt, nur als Referenz) ══════════════╗ -->
			<!-- Zeigt wohin der Zuspieler schaut, unabhängig von Fx/Fy -->
			{#if Math.abs(forceX) > 2}
				{@const refLen = 60}
				<line
					x1={bodyX + baseDirSvgX * FIGURE_R_PX}
					y1={bodyY + baseDirSvgY * FIGURE_R_PX}
					x2={bodyX + baseDirSvgX * refLen}
					y2={bodyY + baseDirSvgY * refLen}
					stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,4" opacity="0.4"
				/>
			{/if}

			<!-- ╔══ Richtungslinie (tatsächlicher Ballweg) ════════════════╗ -->
			<line
				x1={dirLine.x1} y1={dirLine.y1}
				x2={dirLine.x2} y2={dirLine.y2}
				stroke={hitZone ? hitZone.color : '#64748b'}
				stroke-width="2" stroke-dasharray="7,4" stroke-linecap="round"
				opacity={hitZone ? 0.9 : 0.55}
			/>
			{#if Math.hypot(dirLine.x2 - dirLine.x1, dirLine.y2 - dirLine.y1) > 10}
				{@const lx = dirLine.x2 - dirLine.x1}
				{@const ly = dirLine.y2 - dirLine.y1}
				{@const len = Math.hypot(lx, ly)}
				{@const ux = lx / len}
				{@const uy = ly / len}
				{@const px = dirLine.x2}
				{@const py = dirLine.y2}
				{@const as = 9}
				<polygon
					points="{px},{py} {px - ux*as - uy*as*0.5},{py - uy*as + ux*as*0.5} {px - ux*as + uy*as*0.5},{py - uy*as - ux*as*0.5}"
					fill={hitZone ? hitZone.color : '#64748b'}
					opacity={hitZone ? 0.9 : 0.55}
				/>
			{/if}

			<!-- ╔══ Netz-Parallele (Hilfslinie) ════════════════════════════╗ -->
			<line x1={LEFT_X} y1={bodyY} x2={RIGHT_X} y2={bodyY}
				stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="5,4" opacity="0.5" />
			<line x1={LEFT_X}  y1={bodyY - 5} x2={LEFT_X}  y2={bodyY + 5} stroke="#94a3b8" stroke-width="1" opacity="0.4" />
			<line x1={RIGHT_X} y1={bodyY - 5} x2={RIGHT_X} y2={bodyY + 5} stroke="#94a3b8" stroke-width="1" opacity="0.4" />
			<text x={LEFT_X + 4} y={bodyY - 4}
				fill="#94a3b8" font-size="7.5" font-family="sans-serif" opacity="0.6"
			>parallel zum Netz</text>

			<!-- ╔══ Winkelbogen ════════════════════════════════════════════╗ -->
			<line x1={bodyX} y1={bodyY} x2={bodyX - NORMAL_LINE_LEN} y2={bodyY}
				stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" opacity="0.6"
				stroke-dasharray="4,3" />
			{#if angleBowPath}
				<path d={angleBowPath} fill="none" stroke="#f59e0b"
					stroke-width="1.8" stroke-linecap="round" opacity="0.85" />
			{/if}
			<text x={angleLabelPos.x} y={angleLabelPos.y}
				text-anchor="middle" dominant-baseline="middle"
				fill="#f59e0b" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.95"
			>{deviationAngleDeg}°</text>

			<!-- ╔══ Strichmännchen ══════════════════════════════════════════╗ -->
			<ellipse cx={bodyX} cy={bodyY} rx={FIGURE_R_PX * 1.1} ry={FIGURE_R_PX * 0.6}
				fill="#94a3b8" opacity="0.18" />
			<circle cx={bodyX} cy={bodyY} r={FIGURE_R_PX}
				fill="#e0f2fe" stroke="#1e3a5f" stroke-width="2" opacity="0.9" class="drag-body" />
			<line x1={bodyX - armDx} y1={bodyY - armDy} x2={bodyX + armDx} y2={bodyY + armDy}
				stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round" opacity="0.75" />
			<line x1={bodyX} y1={bodyY} x2={leg1EndX} y2={leg1EndY}
				stroke="#334155" stroke-width="2" stroke-linecap="round" opacity="0.65" />
			<line x1={bodyX} y1={bodyY} x2={leg2EndX} y2={leg2EndY}
				stroke="#334155" stroke-width="2" stroke-linecap="round" opacity="0.65" />
			<circle cx={headX} cy={headY} r={HEAD_R_PX}
				fill="#fbbf24" stroke="#92400e" stroke-width="1.5" opacity="0.95" />
			<circle cx={handleX} cy={handleY} r={HANDLE_R_PX}
				fill="#ff3500" opacity={isDraggingHandle ? 0.55 : 0.22} class="drag-handle" />
			<circle cx={handleX} cy={handleY} r={HANDLE_R_PX}
				fill="none" stroke="#ff3500" stroke-width="2"
				opacity={isDraggingHandle ? 1 : 0.65} class="drag-handle" />
			<text
				x={handleX + (baseDirSvgX >= 0 ? HANDLE_R_PX + 4 : -(HANDLE_R_PX + 4))}
				y={handleY + 3}
				text-anchor={baseDirSvgX >= 0 ? 'start' : 'end'}
				fill="#ff3500" font-size="8" font-family="sans-serif" opacity="0.7"
			>drehen</text>
			<text x={bodyX + lblOffX} y={bodyY + lblOffY}
				text-anchor="middle" fill="#475569"
				font-size="9" font-family="sans-serif" font-weight="600" opacity="0.8"
			>Zuspieler</text>

			<!-- ╔══ Info-Box ════════════════════════════════════════════════╗ -->
			<rect x={infX - 138} y={infY - 14} width="142" height={hitZone ? 44 : 30} rx="6"
				fill="#1e293b" opacity="0.06" />
			<text x={infX} y={infY + 3}
				text-anchor="end" fill="#f59e0b" font-size="10" font-family="sans-serif" font-weight="700"
			>Abweichung: {deviationAngleDeg}°</text>
			<text x={infX} y={infY + 17}
				text-anchor="end" fill="#64748b" font-size="8.5" font-family="sans-serif"
			>Reichweite: {reachM.toFixed(1)} m</text>
			{#if hitZone}
				<text x={infX} y={infY + 31}
					text-anchor="end" fill={hitZone.color}
					font-size="9" font-family="sans-serif" font-weight="700"
				>→ {hitZone.label}</text>
			{/if}

		</svg>
	</div>

	<!-- ── Info-Panel ────────────────────────────────────────────────────────── -->
	<div class="stv-info-panel">
		<div class="stv-info-row">
			<div class="stv-info-item">
				<span class="stv-info-label">Abweichung</span>
				<span class="stv-info-value" style="color: #f59e0b">{deviationAngleDeg}°</span>
			</div>
			<div class="stv-info-divider"></div>
			<div class="stv-info-item">
				<span class="stv-info-label">Reichweite</span>
				<span class="stv-info-value">{reachM.toFixed(1)} m</span>
			</div>
			<div class="stv-info-divider"></div>
			<div class="stv-info-item">
				<span class="stv-info-label">Resultierende Kraft</span>
				<span class="stv-info-value">{fResN.toFixed(0)} N</span>
			</div>
			<div class="stv-info-divider"></div>
			<div class="stv-info-item">
				<span class="stv-info-label">Handgeschwindigkeit</span>
				<span class="stv-info-value">{vHandMs.toFixed(1)} m/s</span>
			</div>
			<div class="stv-info-divider"></div>
			<div class="stv-info-item">
				<span class="stv-info-label">Zielzone</span>
				{#if hitZone}
					<span class="stv-info-value" style="color: {hitZone.color}">{hitZone.label}</span>
				{:else}
					<span class="stv-info-value" style="color: #94a3b8">—</span>
				{/if}
			</div>
		</div>
	</div>

</div>

<style>
	.stv-wrapper {
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

	.stv-force-panel {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.7rem 1rem;
	}
	.stv-component-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.stv-comp-label {
		font-size: 0.78rem;
		font-weight: 600;
		min-width: 140px;
		white-space: nowrap;
		font-family: inherit;
	}
	.stv-slider { flex: 1; cursor: pointer; }
	.stv-slider-x { accent-color: #2563eb; }
	.stv-slider-y { accent-color: #16a34a; }
	.stv-comp-value {
		font-size: 0.82rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
		min-width: 4.5rem;
		text-align: right;
	}
	.stv-force-summary {
		font-size: 0.75rem;
		color: #64748b;
		font-family: 'Courier New', monospace;
		text-align: center;
		padding-top: 0.2rem;
		border-top: 1px solid #e2e8f0;
	}

	.stv-svg-wrapper { width: 100%; }
	.stv-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
		cursor: default;
		user-select: none;
		touch-action: none;
	}
	.stv-svg.dragging-body   { cursor: grabbing; }
	.stv-svg.dragging-handle { cursor: crosshair; }
	.drag-body   { cursor: grab; }
	.drag-handle { cursor: crosshair; }

	.stv-info-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		min-height: 64px;
		display: flex;
		align-items: center;
	}
	.stv-info-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		flex-wrap: wrap;
		width: 100%;
	}
	.stv-info-item  { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.stv-info-label { font-size: 0.68rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit; white-space: nowrap; }
	.stv-info-value { font-size: 1.1rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.stv-info-divider { width: 1px; height: 36px; background: #e2e8f0; flex-shrink: 0; }

	@media (max-width: 600px) {
		.stv-wrapper { padding: 1rem; }
		.stv-component-row { flex-wrap: wrap; }
	}
</style>
