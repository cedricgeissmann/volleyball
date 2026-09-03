<script>
	/**
	 * Angriff durch die Mitte — den Ball mit dem Schwerpunkt einholen
	 *
	 * Frontalansicht (Aufriss auf das Netz), gleiche Bildsprache wie die
	 * Timing-Simulation: SVG-x = Feldbreite (Z5 links → Z1 rechts),
	 * SVG-y = Höhe über Boden.
	 *
	 * Ablauf (automatische Schlaufe, keine Regler):
	 *   1. Der Zuspieler spielt einen schnellen Ball in die Zone 4.
	 *   2. Der Angreifer läuft von rechts nach links, springt und driftet
	 *      im Sprung mit dem Ball mit → die relative x-Geschwindigkeit sinkt.
	 *   3. Ein "Geist" ohne Drift springt am gleichen Punkt gerade hoch —
	 *      bei ihm rauscht der Ball doppelt so schnell durchs Schlagfenster.
	 *
	 * Zahlen (anschaulich, grössenordnungsrichtig):
	 *   Schlagfenster horizontal:      0.50 m
	 *   Armkorrektur-Zeit im Sprung:   0.25 s
	 *   → kritische relative x-Geschw.: 2.0 m/s
	 *   Schuss-Pass x-Geschwindigkeit:  4.0 m/s
	 *   Seitwärtsdrift des Angreifers:  2.0 m/s
	 */

	// ─── Physik / Kennzahlen ──────────────────────────────────────────────────────
	const G           = 9.81;
	const WINDOW_M    = 0.50;              // Schlagfenster horizontal
	const ARM_TIME_S  = 0.25;              // Zeit, die der Arm zur Anpassung braucht
	const CRITICAL    = WINDOW_M / ARM_TIME_S; // 2.0 m/s
	const BALL_VX     = 4.0;               // Schuss-Pass, nach links
	const DRIFT       = 2.0;               // Seitwärtsdrift des Angreifers im Sprung
	const REL_VX      = BALL_VX - DRIFT;   // 2.0 m/s

	const T_IN_WINDOW_DRIFT = WINDOW_M / REL_VX;   // 0.250 s
	const T_IN_WINDOW_STILL = WINDOW_M / BALL_VX;  // 0.125 s

	// ─── Feld / Netz ──────────────────────────────────────────────────────────────
	const NET_H_M         = 2.43;
	const ANTENNA_ABOVE_M = 0.80;
	const FIELD_WIDTH_M   = 9.0;

	// ─── SVG-Layout (analog zur Timing-Simulation) ───────────────────────────────
	const SVG_W    = 600;
	const SVG_H    = 400;
	const PX_PER_M = 58;
	const MARGIN_L = 48;
	const GROUND_Y = SVG_H - 44;

	const FIELD_W_PX  = FIELD_WIDTH_M * PX_PER_M;
	const FIELD_LEFT  = MARGIN_L;
	const FIELD_RIGHT = MARGIN_L + FIELD_W_PX;
	const ANTENNA_WIDTH_PX = 3;

	/** @param {number} xM */ function fx(xM) { return FIELD_LEFT + xM * PX_PER_M; }
	/** @param {number} yM */ function fy(yM) { return GROUND_Y - yM * PX_PER_M; }

	// ─── Zonen ────────────────────────────────────────────────────────────────────
	const ZONES = [
		{ id: 'z5', label: 'Z5', color: '#2563eb', xM: 0.9 },
		{ id: 'z4', label: 'Z4', color: '#0891b2', xM: 2.7 },
		{ id: 'z3', label: 'Z3', color: '#7c3aed', xM: 4.5 },
		{ id: 'z2', label: 'Z2', color: '#d97706', xM: 6.3 },
		{ id: 'z1', label: 'Z1', color: '#dc2626', xM: 8.1 },
	];
	const ZONE_HALF_W_M = 0.75;
	const TARGET_ZONE   = ZONES[1];          // Zuspiel immer in Zone 4

	const hitZoneMinM = NET_H_M;
	const hitZoneMaxM = NET_H_M + 0.75;

	// ─── Zuspieler ────────────────────────────────────────────────────────────────
	const SETTER_HEIGHT_M = 1.75;
	const SETTER_SCALE    = SETTER_HEIGHT_M / 1.75;
	const SETTER_HAND_M   = (103 * SETTER_SCALE) / PX_PER_M;   // ≈ 1.78 m

	// ─── Ball ─────────────────────────────────────────────────────────────────────
	const BALL_START_X = 5.5;                // Zuspieler-Position
	const BALL_START_Y = SETTER_HAND_M;      // Handhöhe des Zuspielers
	const CONTACT_X    = TARGET_ZONE.xM;     // Kontakt in Zone 4
	const T_FLIGHT     = (BALL_START_X - CONTACT_X) / BALL_VX;   // 0.70 s
	const CONTACT_Y    = NET_H_M + 0.40;
	const BALL_V0Y     = (CONTACT_Y - BALL_START_Y + G / 2 * T_FLIGHT * T_FLIGHT) / T_FLIGHT;

	// ─── Angreifer ────────────────────────────────────────────────────────────────
	const ATT_HEIGHT_M   = 1.90;
	const STAND_REACH_M  = ATT_HEIGHT_M * 1.28;   // Standreichweite ≈ 2.43 m
	const HAND_DX_M      = 0.15;                  // Schlaghand rechts vom Schwerpunkt
	const JUMP_H_M       = 0.35;                  // kurze, knackige Hangtime
	const JUMP_V0        = Math.sqrt(2 * G * JUMP_H_M);
	const T_AIR          = 2 * JUMP_V0 / G;       // ≈ 0.53 s

	// ─── Zeitachse (Sekunden im Zyklus) ──────────────────────────────────────────
	const T_SET      = 0.35;                        // Zuspieler-Kontakt
	const T_HIT      = T_SET + T_FLIGHT;            // Angriffs-Kontakt
	const T_TAKEOFF  = T_HIT - T_AIR / 2;           // Absprung (Apex = Kontakt)
	const T_LAND     = T_TAKEOFF + T_AIR;
	const T_AFTER    = T_HIT + 0.45;                // Ball über dem Netz weg
	const T_CYCLE    = T_AFTER + 0.45;

	const ATT_CONTACT_X = CONTACT_X - HAND_DX_M;                   // Schwerpunkt beim Kontakt
	const ATT_TAKEOFF_X = ATT_CONTACT_X + DRIFT * (T_HIT - T_TAKEOFF);
	const ATT_START_X   = 4.1;                     // kurzer, schneller Anlauf
	const GHOST_X       = ATT_CONTACT_X;            // Geist springt am Kontaktpunkt

	// ─── Bewegungs-Funktionen ─────────────────────────────────────────────────────
	/** Ballposition zur Zeit t (s) @param {number} t */
	function ballAt(t) {
		if (t <= T_SET) {
			// Ball liegt in den Händen des Zuspielers (folgt der Beugung)
			return {
				xM: BALL_START_X,
				yM: (GROUND_Y - setterAt(t).handY) / PX_PER_M,
				scale: 1,
				over: false,
			};
		}
		if (t <= T_HIT) {
			const dt = t - T_SET;
			return {
				xM: BALL_START_X - BALL_VX * dt,
				yM: BALL_START_Y + BALL_V0Y * dt - G / 2 * dt * dt,
				scale: 1,
				over: false,
			};
		}
		// nach dem Schlag: über das Netz weg (Perspektive → kleiner)
		const p = Math.min(1, (t - T_HIT) / (T_AFTER - T_HIT));
		return {
			xM: CONTACT_X - 0.9 * p,
			yM: Math.max(0.2, CONTACT_Y - (CONTACT_Y - 0.2) * p * p),
			scale: 1 - 0.55 * p,
			over: true,
		};
	}

	/** Ballflug-Vorschau (Zuspiel-Parabel) */
	const previewPath = (() => {
		const pts = [];
		for (let i = 0; i <= 60; i++) {
			const dt = (i / 60) * T_FLIGHT;
			const xM = BALL_START_X - BALL_VX * dt;
			const yM = BALL_START_Y + BALL_V0Y * dt - G / 2 * dt * dt;
			pts.push(`${i === 0 ? 'M' : 'L'} ${fx(xM).toFixed(1)} ${fy(yM).toFixed(1)}`);
		}
		return pts.join(' ');
	})();

	/** Angreifer zur Zeit t @param {number} t @param {boolean} drifting */
	function attackerAt(t, drifting) {
		const baseX = drifting ? ATT_TAKEOFF_X : GHOST_X;
		let xM, jumpM, crouch = 0;
		if (t < T_TAKEOFF) {
			// Anlauf von rechts nach links (nur der driftende Angreifer läuft)
			const p = Math.min(1, Math.max(0, t / T_TAKEOFF));
			xM = drifting ? ATT_START_X + (ATT_TAKEOFF_X - ATT_START_X) * p * p : baseX;
			jumpM = 0;
			crouch = Math.max(0, (t - (T_TAKEOFF - 0.16)) / 0.16);
		} else if (t < T_LAND) {
			const dt = t - T_TAKEOFF;
			xM = drifting ? ATT_TAKEOFF_X - DRIFT * dt : baseX;
			jumpM = Math.max(0, JUMP_V0 * dt - G / 2 * dt * dt);
		} else {
			xM = drifting ? ATT_TAKEOFF_X - DRIFT * (T_LAND - T_TAKEOFF) : baseX;
			jumpM = 0;
			crouch = Math.max(0, 1 - (t - T_LAND) / 0.25) * 0.6;
		}
		return { xM, jumpM, crouch: Math.min(1, crouch), handXM: xM + HAND_DX_M, handYM: STAND_REACH_M + jumpM };
	}

	/** Zuspieler-Strichfigur (leichte Beugung vor dem Kontakt) @param {number} t */
	function setterAt(t) {
		const s     = SETTER_SCALE;
		// vor dem Kontakt leicht in die Knie, beim Kontakt strecken
		const bend  = t < T_SET ? Math.min(1, Math.max(0, (T_SET - t) / 0.3)) : 0;
		const drop  = bend * 7 * s;
		const lift  = t >= T_SET ? Math.min(1, (t - T_SET) / 0.25) * 4 * s : 0;
		const feetY = GROUND_Y;
		return {
			x:         fx(BALL_START_X),
			feetY,
			hipY:      feetY - 47 * s + drop,
			shoulderY: feetY - 79 * s + drop * 0.6,
			headY:     feetY - 93 * s + drop * 0.5,
			handY:     feetY - 103 * s + drop * 0.4 - lift,
			headR:     8 * s,
			bodyW:     6 * s,
			armW:      9 * s,
			scale:     s,
		};
	}

	/** Strichfigur-Proportionen @param {number} jumpM @param {number} crouch */
	function figure(jumpM, crouch) {
		const scale   = ATT_HEIGHT_M / 1.75;
		const drop    = crouch * 9 * scale;
		const feetY   = GROUND_Y - jumpM * PX_PER_M;
		return {
			feetY,
			hipY:      feetY - 47 * scale + drop,
			shoulderY: feetY - 79 * scale + drop,
			headY:     feetY - 93 * scale + drop,
			headR:     8 * scale,
			bodyW:     6 * scale,
			scale,
		};
	}

	// ─── Animations-Zustand ───────────────────────────────────────────────────────
	let tS      = $state(0);
	let playing = $state(true);
	let rafId   = 0;
	let cycleStart = 0;

	/** @param {number} ts */
	function frame(ts) {
		if (!cycleStart) cycleStart = ts;
		let e = (ts - cycleStart) / 1000;
		if (e >= T_CYCLE) { cycleStart = ts; e = 0; }
		tS = e;
		if (playing) rafId = requestAnimationFrame(frame);
	}

	function togglePlay() {
		playing = !playing;
		if (playing) { cycleStart = 0; rafId = requestAnimationFrame(frame); }
		else cancelAnimationFrame(rafId);
	}

	$effect(() => {
		rafId = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Abgeleitete Werte ────────────────────────────────────────────────────────
	let ball    = $derived(ballAt(tS));
	let att     = $derived(attackerAt(tS, true));
	let setter  = $derived(setterAt(tS));
	let ghost   = $derived(attackerAt(tS, false));
	let attGeo  = $derived(figure(att.jumpM, att.crouch));
	let ghostGeo = $derived(figure(ghost.jumpM, ghost.crouch));

	let airborne = $derived(tS >= T_TAKEOFF && tS <= T_LAND);
	let flying   = $derived(tS > T_SET && tS <= T_HIT);

	// Ball im Schlagfenster?
	let inWindowDrift = $derived(flying && Math.abs(ball.xM - att.handXM)   <= WINDOW_M / 2);
	let inWindowGhost = $derived(flying && Math.abs(ball.xM - ghost.handXM) <= WINDOW_M / 2);

	let atContact = $derived(tS >= T_HIT - 0.05 && tS <= T_HIT + 0.18);

	let relVxNow = $derived(airborne ? REL_VX : BALL_VX);

	let phaseText = $derived(
		tS < T_SET      ? 'Der Zuspieler hat den Ball noch — der Angreifer läuft von rechts nach links an.'
		: tS < T_TAKEOFF ? 'Schneller Ball in die Zone 4: 4,0 m/s x-Geschwindigkeit.'
		: tS < T_HIT     ? 'Im Sprung nach links mitdriften → relative Geschwindigkeit nur noch 2,0 m/s.'
		: tS < T_LAND    ? 'Kontakt im Schlagfenster — der Arm hatte genug Zeit.'
		: 'Ohne Drift wäre der Ball doppelt so schnell durchs Fenster gerauscht.'
	);

	// Pixel pro (m/s) für die Geschwindigkeitspfeile
	const VX_PX = 13;

	// SVG-Koordinaten
	const netTopY     = fy(NET_H_M);
	const netBottomY  = fy(NET_H_M - 1.0);
	const antennaTopY = fy(NET_H_M + ANTENNA_ABOVE_M);

	let ghx     = $derived(fx(ghost.xM));
	let ghHandX = $derived(fx(ghost.handXM));
	let ghHandY = $derived(fy(ghost.handYM));

	let ax    = $derived(fx(att.xM));
	let handX = $derived(fx(att.handXM));
	let handY = $derived(fy(att.handYM));

	let bx  = $derived(fx(ball.xM));
	let by  = $derived(fy(ball.yM));
	let br  = $derived(11 * ball.scale);
	let bop = $derived(ball.over ? 0.7 : 1);
</script>

<div class="ma-wrapper">

	<div class="ma-head">
		<h4>Angriff durch die Mitte: den Ball mit dem Schwerpunkt einholen</h4>
		<p>Frontalansicht auf das Netz. Der Zuspieler bringt den Ball immer in die <b>Zone 4</b>, der
		Angreifer springt leicht von rechts nach links und passt seinen Schwerpunkt der
		x-Geschwindigkeit des Balls an. Der graue Geist springt am gleichen Punkt, aber ohne Drift.</p>
	</div>

	<div class="ma-svg-wrapper">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="ma-svg" role="img"
			aria-label="Angriff Zone 4 mit Seitwärtsdrift, Frontalansicht">

			<defs>
				<marker id="ma-arrow-ball" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
					<path d="M0,0 L6,3.5 L0,7 Z" fill="#f59e0b" />
				</marker>
				<marker id="ma-arrow-rel" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
					<path d="M0,0 L6,3.5 L0,7 Z" fill="#16a34a" />
				</marker>
				<marker id="ma-arrow-drift" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
					<path d="M0,0 L6,3.5 L0,7 Z" fill="#2563eb" />
				</marker>
			</defs>

			<!-- Hintergrund -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />

			<!-- Boden / Feld -->
			<rect x={FIELD_LEFT} y={GROUND_Y - 4} width={FIELD_W_PX} height="6" fill="#d4dde8" rx="1" />
			<line x1={FIELD_LEFT}  y1={GROUND_Y - 3} x2={FIELD_LEFT}  y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			<line x1={FIELD_RIGHT} y1={GROUND_Y - 3} x2={FIELD_RIGHT} y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			{#each [1.8, 3.6, 5.4, 7.2] as xM}
				<line x1={fx(xM)} y1={GROUND_Y + 2} x2={fx(xM)} y2={GROUND_Y + 10} stroke="#94a3b8" stroke-width="1" opacity="0.6" />
			{/each}
			{#each ZONES as zone (zone.id)}
				<text x={fx(zone.xM)} y={GROUND_Y + 22} text-anchor="middle" fill={zone.color}
					font-size="9" font-family="sans-serif" font-weight="600"
					opacity={zone.id === TARGET_ZONE.id ? 0.9 : 0.55}>{zone.label}</text>
			{/each}
			<line x1={FIELD_LEFT - 10} y1={GROUND_Y} x2={FIELD_RIGHT + 10} y2={GROUND_Y} stroke="#94a3b8" stroke-width="1.5" />

			<!-- Höhen-Referenzlinien -->
			{#each [1, 2, 3] as hM}
				<line x1={FIELD_LEFT - 8} y1={fy(hM)} x2={FIELD_LEFT} y2={fy(hM)} stroke="#cbd5e1" stroke-width="1" />
				<text x={FIELD_LEFT - 10} y={fy(hM) + 3} text-anchor="end" fill="#94a3b8" font-size="8" font-family="sans-serif">{hM}m</text>
			{/each}

			<!-- Angriffszonen -->
			{#each ZONES as zone (zone.id)}
				{@const zx      = fx(zone.xM)}
				{@const zHalf   = ZONE_HALF_W_M * PX_PER_M}
				{@const isT     = zone.id === TARGET_ZONE.id}
				<rect x={zx - zHalf} y={GROUND_Y - 4} width={zHalf * 2} height="5" rx="2"
					fill={zone.color} opacity={isT ? 0.3 : 0.12} />
				<rect x={zx - zHalf} y={fy(hitZoneMaxM)} width={zHalf * 2}
					height={fy(hitZoneMinM) - fy(hitZoneMaxM)} rx="3"
					fill={zone.color} opacity={isT ? (flying ? 0.14 : 0.1) : 0.04} />
				<rect x={zx - zHalf} y={fy(hitZoneMaxM)} width={zHalf * 2}
					height={fy(hitZoneMinM) - fy(hitZoneMaxM)} rx="3" fill="none"
					stroke={zone.color} stroke-width={isT ? 1.5 : 1}
					stroke-dasharray={isT ? '4,3' : '3,4'} opacity={isT ? 0.55 : 0.3} />
				<text x={zx} y={fy(hitZoneMaxM) - 5} text-anchor="middle" fill={zone.color}
					font-size="10" font-family="sans-serif" font-weight={isT ? '700' : '500'}
					opacity={isT ? 0.85 : 0.4}>{zone.label}</text>
			{/each}

			<!-- Vorschau der Zuspiel-Parabel -->
			<path d={previewPath} fill="none" stroke="#f59e0b" stroke-width="1.5"
				stroke-dasharray="6,4" opacity="0.28" />

			<!-- Netz -->
			<rect x={FIELD_LEFT} y={netTopY} width={FIELD_W_PX} height={netBottomY - netTopY} fill="#e2e8f0" opacity="0.5" />
			{#each Array(5) as _, i}
				<line x1={FIELD_LEFT} y1={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					x2={FIELD_RIGHT} y2={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					stroke="#94a3b8" stroke-width="0.8" opacity="0.6" />
			{/each}
			{#each Array(18) as _, i}
				{@const vx = FIELD_LEFT + (i + 1) * (FIELD_W_PX / 18)}
				<line x1={vx} y1={netTopY} x2={vx} y2={netBottomY} stroke="#94a3b8" stroke-width="0.7" opacity="0.4" />
			{/each}
			<line x1={FIELD_LEFT} y1={netBottomY} x2={FIELD_RIGHT} y2={netBottomY} stroke="#64748b" stroke-width="2" stroke-linecap="round" />
			<rect x={FIELD_LEFT} y={netTopY - 5} width={FIELD_W_PX} height="7" rx="2" fill="white" stroke="#cbd5e1" stroke-width="1" />
			<rect x={FIELD_LEFT - 6} y={netTopY} width="6" height={GROUND_Y - netTopY} rx="2" fill="#475569" />
			<rect x={FIELD_RIGHT} y={netTopY} width="6" height={GROUND_Y - netTopY} rx="2" fill="#475569" />
			{#each [FIELD_LEFT - ANTENNA_WIDTH_PX / 2, FIELD_RIGHT - ANTENNA_WIDTH_PX / 2] as ax}
				{#each Array(10) as _, seg}
					{@const segH = (netBottomY - antennaTopY) / 10}
					<rect x={ax} y={antennaTopY + seg * segH} width={ANTENNA_WIDTH_PX} height={segH + 0.5}
						fill={seg % 2 === 0 ? '#ef4444' : 'white'} />
				{/each}
			{/each}
			<text x={FIELD_LEFT - 10} y={netTopY + 3} text-anchor="end" fill="#475569"
				font-size="8" font-family="sans-serif" font-weight="600">{NET_H_M.toFixed(2)}m</text>
			<line x1={FIELD_LEFT - 8} y1={netTopY} x2={FIELD_LEFT} y2={netTopY} stroke="#475569" stroke-width="1.5" />

			<!-- ── Zuspieler ──────────────────────────────────────────────────── -->
			<ellipse cx={setter.x} cy={GROUND_Y - 1} rx={11 * setter.scale} ry="3" fill="#94a3b8" opacity="0.25" />
			<line x1={setter.x - setter.bodyW} y1={setter.hipY} x2={setter.x - setter.bodyW * 0.65} y2={setter.feetY}
				stroke="#334155" stroke-width={2 * setter.scale} stroke-linecap="round" opacity="0.8" />
			<line x1={setter.x + setter.bodyW} y1={setter.hipY} x2={setter.x + setter.bodyW * 0.65} y2={setter.feetY}
				stroke="#334155" stroke-width={2 * setter.scale} stroke-linecap="round" opacity="0.8" />
			<line x1={setter.x} y1={setter.hipY} x2={setter.x} y2={setter.shoulderY}
				stroke="#1e3a5f" stroke-width={3 * setter.scale} stroke-linecap="round" opacity="0.8" />
			<line x1={setter.x - setter.bodyW} y1={setter.shoulderY + 2 * setter.scale}
				x2={setter.x - setter.armW} y2={setter.handY}
				stroke="#1e3a5f" stroke-width={2 * setter.scale} stroke-linecap="round" opacity="0.8" />
			<line x1={setter.x + setter.bodyW} y1={setter.shoulderY + 2 * setter.scale}
				x2={setter.x + setter.armW} y2={setter.handY}
				stroke="#1e3a5f" stroke-width={2 * setter.scale} stroke-linecap="round" opacity="0.8" />
			<circle cx={setter.x} cy={setter.headY} r={setter.headR} fill="#fbbf24" opacity="0.9" />
			<text x={setter.x} y={setter.headY - setter.headR - 5} text-anchor="middle" fill="#475569"
				font-size="9" font-family="sans-serif" font-weight="600" opacity="0.8">Zuspieler</text>

			<!-- ── Geist: gleicher Punkt, kein Drift ──────────────────────────── -->
			<g opacity="0.4">
				<line x1={ghx - ghostGeo.bodyW} y1={ghostGeo.hipY} x2={ghx - ghostGeo.bodyW * 0.65} y2={ghostGeo.feetY}
					stroke="#94a3b8" stroke-width={2 * ghostGeo.scale} stroke-linecap="round" />
				<line x1={ghx + ghostGeo.bodyW} y1={ghostGeo.hipY} x2={ghx + ghostGeo.bodyW * 0.65} y2={ghostGeo.feetY}
					stroke="#94a3b8" stroke-width={2 * ghostGeo.scale} stroke-linecap="round" />
				<line x1={ghx} y1={ghostGeo.hipY} x2={ghx} y2={ghostGeo.shoulderY}
					stroke="#94a3b8" stroke-width={3 * ghostGeo.scale} stroke-linecap="round" />
				<line x1={ghx + ghostGeo.bodyW} y1={ghostGeo.shoulderY} x2={ghHandX} y2={ghHandY}
					stroke="#94a3b8" stroke-width={2 * ghostGeo.scale} stroke-linecap="round" />
				<circle cx={ghx} cy={ghostGeo.headY} r={ghostGeo.headR} fill="#cbd5e1" />
				<!-- Schlagfenster ohne Drift -->
				<rect x={ghHandX - (WINDOW_M / 2) * PX_PER_M} y={ghHandY - 0.375 * PX_PER_M}
					width={WINDOW_M * PX_PER_M} height={0.75 * PX_PER_M} rx="3"
					fill={inWindowGhost ? '#ef4444' : 'none'} fill-opacity="0.12"
					stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3,3" />
				<text x={ghx} y={ghostGeo.feetY + 14} text-anchor="middle" fill="#64748b"
					font-size="8" font-family="sans-serif" font-weight="600">ohne Drift</text>
			</g>

			<!-- ── Angreifer mit Drift ───────────────────────────────────────── -->
			<ellipse cx={ax} cy={GROUND_Y - 1} rx={11 * attGeo.scale} ry={att.jumpM > 0 ? 2 : 3}
				fill="#94a3b8" opacity={att.jumpM > 0 ? 0.15 : 0.25} />
			<!-- Beine -->
			<line x1={ax - attGeo.bodyW} y1={attGeo.hipY} x2={ax - attGeo.bodyW * (att.jumpM > 0 ? 1.1 : 0.65)} y2={attGeo.feetY}
				stroke="#334155" stroke-width={2 * attGeo.scale} stroke-linecap="round" opacity="0.85" />
			<line x1={ax + attGeo.bodyW} y1={attGeo.hipY} x2={ax + attGeo.bodyW * (att.jumpM > 0 ? 1.1 : 0.65)} y2={attGeo.feetY}
				stroke="#334155" stroke-width={2 * attGeo.scale} stroke-linecap="round" opacity="0.85" />
			<!-- Rumpf -->
			<line x1={ax} y1={attGeo.hipY} x2={ax} y2={attGeo.shoulderY}
				stroke="#0f766e" stroke-width={3 * attGeo.scale} stroke-linecap="round" opacity="0.9" />
			<!-- Führungsarm -->
			<line x1={ax - attGeo.bodyW} y1={attGeo.shoulderY + 2 * attGeo.scale}
				x2={ax - attGeo.bodyW * 2.4} y2={attGeo.shoulderY - (att.jumpM > 0 ? 14 : -6) * attGeo.scale}
				stroke="#0f766e" stroke-width={2 * attGeo.scale} stroke-linecap="round" opacity="0.85" />
			<!-- Schlagarm -->
			<line x1={ax + attGeo.bodyW} y1={attGeo.shoulderY} x2={handX} y2={handY}
				stroke="#0f766e" stroke-width={2.2 * attGeo.scale} stroke-linecap="round" opacity="0.95" />
			<!-- Kopf -->
			<circle cx={ax} cy={attGeo.headY} r={attGeo.headR} fill="#fbbf24" opacity="0.95" />
			<text x={ax} y={attGeo.headY - attGeo.headR - 5} text-anchor="middle" fill="#0f766e"
				font-size="9" font-family="sans-serif" font-weight="700" opacity="0.85">Angreifer</text>

			<!-- Schlagfenster (bewegt sich mit dem Schwerpunkt mit) -->
			<rect x={handX - (WINDOW_M / 2) * PX_PER_M} y={handY - 0.375 * PX_PER_M}
				width={WINDOW_M * PX_PER_M} height={0.75 * PX_PER_M} rx="3"
				fill={inWindowDrift ? '#16a34a' : '#0f766e'} fill-opacity={inWindowDrift ? 0.18 : 0.06}
				stroke={inWindowDrift ? '#16a34a' : '#0f766e'} stroke-width={inWindowDrift ? 2 : 1.2}
				stroke-dasharray={inWindowDrift ? '' : '4,3'} opacity="0.9" />
			<text x={handX} y={handY - 0.375 * PX_PER_M - 5} text-anchor="middle"
				fill={inWindowDrift ? '#16a34a' : '#0f766e'} font-size="8" font-family="sans-serif"
				font-weight="700" opacity="0.85">Schlagfenster 0,5 m</text>

			<!-- Drift-Pfeil am Schwerpunkt -->
			{#if airborne}
				<line x1={ax} y1={attGeo.hipY} x2={ax - DRIFT * VX_PX} y2={attGeo.hipY}
					stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" marker-end="url(#ma-arrow-drift)" opacity="0.9" />
				<text x={ax - DRIFT * VX_PX / 2} y={attGeo.hipY + 12} text-anchor="middle"
					fill="#2563eb" font-size="8" font-family="sans-serif" font-weight="700">Drift 2,0 m/s</text>
			{/if}

			<!-- ── Ball ───────────────────────────────────────────────────────── -->
			<ellipse cx={bx} cy={GROUND_Y - 1} rx={br} ry={2.5 * ball.scale} fill="#475569" opacity={0.1 * ball.scale} />
			<circle cx={bx} cy={by} r={br} fill="white" stroke="#f59e0b" stroke-width={1.8 * ball.scale} opacity={bop} />
			<path d="M {bx - br * 0.65} {by} Q {bx} {by - br * 0.45} {bx + br * 0.65} {by}"
				fill="none" stroke="#94a3b8" stroke-width={ball.scale * 0.9} opacity={bop * 0.8} />
			<path d="M {bx - br * 0.65} {by} Q {bx} {by + br * 0.45} {bx + br * 0.65} {by}"
				fill="none" stroke="#94a3b8" stroke-width={ball.scale * 0.9} opacity={bop * 0.8} />

			<!-- Geschwindigkeits-Pfeile am Ball -->
			{#if flying}
				<line x1={bx} y1={by - 22} x2={bx - BALL_VX * VX_PX} y2={by - 22}
					stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" marker-end="url(#ma-arrow-ball)" />
				<text x={bx - BALL_VX * VX_PX / 2} y={by - 27} text-anchor="middle"
					fill="#f59e0b" font-size="8" font-family="sans-serif" font-weight="700">Ball 4,0 m/s</text>
				{#if airborne}
					<line x1={bx} y1={by - 8} x2={bx - REL_VX * VX_PX} y2={by - 8}
						stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" marker-end="url(#ma-arrow-rel)" />
					<text x={bx - REL_VX * VX_PX / 2 - 4} y={by - 12} text-anchor="middle"
						fill="#16a34a" font-size="8" font-family="sans-serif" font-weight="700">relativ 2,0 m/s</text>
				{/if}
			{/if}

			<!-- Schlag-Markierung -->
			{#if atContact}
				<circle cx={fx(CONTACT_X)} cy={fy(CONTACT_Y)} r="14" fill="none"
					stroke="#16a34a" stroke-width="2" opacity="0.7" />
				<text x={fx(CONTACT_X)} y={fy(CONTACT_Y) - 20} text-anchor="middle"
					fill="#16a34a" font-size="11" font-family="sans-serif" font-weight="700">Schlag!</text>
			{/if}
		</svg>
	</div>

	<!-- Statuszeile -->
	<div class="ma-status">
		<button class="ma-play" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Abspielen'}>
			{#if playing}❚❚{:else}▶{/if}
		</button>
		<span class="ma-phase">{phaseText}</span>
	</div>

	<!-- Kennzahlen -->
	<div class="ma-result-panel">
		<div class="ma-result-item">
			<span class="ma-result-label">Ball x-Geschw.</span>
			<span class="ma-result-value" style="color:#f59e0b">{BALL_VX.toFixed(1)} m/s</span>
		</div>
		<div class="ma-result-divider"></div>
		<div class="ma-result-item">
			<span class="ma-result-label">Drift im Sprung</span>
			<span class="ma-result-value" style="color:#2563eb">{DRIFT.toFixed(1)} m/s</span>
		</div>
		<div class="ma-result-divider"></div>
		<div class="ma-result-item">
			<span class="ma-result-label">relativ</span>
			<span class="ma-result-value" style="color:#16a34a">{REL_VX.toFixed(1)} m/s</span>
		</div>
		<div class="ma-result-divider"></div>
		<div class="ma-result-item">
			<span class="ma-result-label">kritische Grenze</span>
			<span class="ma-result-value" style="font-size:1rem;color:#475569">{CRITICAL.toFixed(1)} m/s</span>
		</div>
	</div>

	<div class="ma-preview-panel">
		<span>Zeit im Schlagfenster <strong style="color:#16a34a">mit Drift: {(T_IN_WINDOW_DRIFT * 1000).toFixed(0)} ms</strong></span>
		<span>ohne Drift: <strong style="color:#ef4444">{(T_IN_WINDOW_STILL * 1000).toFixed(0)} ms</strong></span>
		<span>Arm braucht: <strong>{(ARM_TIME_S * 1000).toFixed(0)} ms</strong></span>
	</div>

	<div class="ma-note">
		<strong>Der Trick:</strong> {WINDOW_M.toFixed(2)} m Schlagfenster ÷ {ARM_TIME_S.toFixed(2)} s Armzeit
		= {CRITICAL.toFixed(1)} m/s kritische Relativgeschwindigkeit. Von rechts nach links laufen und im
		Sprung mitdriften senkt die relative x-Geschwindigkeit von 4,0 auf 2,0 m/s — kombiniert mit
		Hangtime (y-Geschwindigkeit ≈ 0) bleibt der Schwerpunkt stabil, und der Ball bleibt doppelt so
		lange im Fenster.
	</div>
</div>

<style>
	.ma-wrapper {
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
	.ma-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.ma-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }

	.ma-svg-wrapper { width: 100%; }
	.ma-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
	}

	.ma-status { display: flex; align-items: center; gap: 0.7rem; }
	.ma-play {
		flex: none;
		width: 2.1rem; height: 2.1rem;
		border-radius: 50%;
		border: 1px solid #e2e8f0;
		background: #f1f5f9;
		color: #475569;
		font-size: 0.75rem;
		cursor: pointer;
		transition: background 120ms;
	}
	.ma-play:hover { background: #e2e8f0; }
	.ma-phase { font-size: 0.85rem; color: #475569; line-height: 1.4; }

	.ma-result-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 1rem;
		flex-wrap: wrap;
	}
	.ma-result-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.ma-result-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; }
	.ma-result-value { font-size: 1.3rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.ma-result-divider { width: 1px; height: 38px; background: #e2e8f0; }

	.ma-preview-panel {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		font-size: 0.875rem;
		color: #64748b;
		flex-wrap: wrap;
	}
	.ma-preview-panel strong { color: #1e293b; }

	.ma-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.ma-note strong { color: #0369a1; }

	@media (max-width: 600px) {
		.ma-wrapper { padding: 1rem; }
		.ma-result-panel { gap: 0.75rem; }
	}
</style>
