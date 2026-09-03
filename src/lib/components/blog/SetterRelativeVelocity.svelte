<script>
	/**
	 * Zuspiel — relative Geschwindigkeit in der Draufsicht (Grundriss)
	 *
	 * Automatische Animation der ganzen eigenen Feldhälfte (keine Regler):
	 *   1. Der Ball kommt von der anderen Netzseite zum Verteidiger.
	 *   2. Der Verteidiger bringt den Ball zufällig in die Zuspielzone.
	 *   3. Der Zuspieler läuft in die Zone, ungefähr dorthin, wo der Ball hinkommt,
	 *      und macht eine kurze Pause (Schwerpunkt ruhig → Ballgeschwindigkeit lesen).
	 *   4. Kurz vor dem Kontakt übernimmt er möglichst die Geschwindigkeit des Balls
	 *      → die relative Geschwindigkeit wird klein, das Zuspielfenster gross.
	 *   5. Das Zuspiel wird zufällig verteilt: Mitte, Hinten, 3m-Angriff oder Aussen.
	 */

	// ─── Feld-Geometrie (Meter) ───────────────────────────────────────────────────
	const FIELD_WIDTH_M = 9.0;
	const FIELD_DEPTH_M = 9.0;
	const ATTACK_LINE_M = 3.0;

	// Zuspielzone (nahe Netz, rechts der Mitte)
	const ZONE_X0 = 3.6, ZONE_X1 = 7.2;
	const ZONE_Y0 = 0.4, ZONE_Y1 = 2.2;

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W    = 520;
	const SVG_H    = 560;
	const MARGIN_T = 46;
	const MARGIN_B = 28;
	const MARGIN_L = 34;
	const MARGIN_R = 14;

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

	// ─── Angriffs-Ziele ───────────────────────────────────────────────────────────
	const TARGETS = [
		{ id: 'aussen', label: 'Aussen',     x: 0.9, y: 0.7, color: '#2563eb' },
		{ id: 'mitte',  label: 'Mitte',      x: 4.5, y: 0.7, color: '#7c3aed' },
		{ id: 'pipe',   label: '3m-Angriff', x: 4.5, y: 3.0, color: '#0891b2' },
		{ id: 'hinten', label: 'Dia',        x: 8.0, y: 0.7, color: '#d97706' },
	];

	const DEF_SPOTS = [
		{ x: 2.4, y: 6.6 },
		{ x: 4.6, y: 7.0 },
		{ x: 3.4, y: 5.8 },
		{ x: 6.2, y: 6.8 },
	];

	const SETTER_HOME = { x: 8.1, y: 4.6 };

	// ─── Phasen-Timeline (ms) ──────────────────────────────────────────────────────
	const T_INCOMING = 950;
	const T_DIG      = 1300;
	const T_SET      = 1050;
	const T_HOLD     = 950;

	const T1 = T_INCOMING;         // Ball beim Verteidiger
	const T2 = T1 + T_DIG;         // Ball im Kontaktpunkt (Zuspiel-Kontakt)
	const T3 = T2 + T_SET;         // Ball beim Angriffsziel
	const T4 = T3 + T_HOLD;        // Zyklus-Ende

	const RUN_END = T1 + 380;      // Zuspieler am Wartepunkt (vor dem Ball)
	const CONTACT_RANGE_M = 1.3;   // ab dieser Ballnähe übernimmt er die Geschwindigkeit

	// ─── Helfer ────────────────────────────────────────────────────────────────────
	/** @param {number} t */
	function easeInOut(t) {
		return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
	}
	/** @param {{x:number,y:number}} a @param {{x:number,y:number}} b @param {number} t */
	function lerp(a, b, t) {
		return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
	}
	/** @param {number} min @param {number} max */
	function rand(min, max) { return min + Math.random() * (max - min); }

	// ─── Reaktiver Zustand ──────────────────────────────────────────────────────────
	let ballM    = $state({ x: 4.5, y: -1.0 });
	let ballH    = $state(0.3);
	let setterM  = $state({ ...SETTER_HOME });
	let faceDir  = $state({ x: 0, y: 1 });   // Blickrichtung des Zuspielers
	let phase    = $state('incoming');
	let matchFrac = $state(0);     // 0 = ruht, 1 = Ballgeschwindigkeit übernommen
	let playing  = $state(true);

	let defSpot   = $state(DEF_SPOTS[0]);
	let digTarget = $state({ x: 5.4, y: 1.2 });
	let overNet   = $state({ x: 4.0, y: -1.2 });
	let target    = $state(TARGETS[1]);
	let waitPoint = $state({ ...SETTER_HOME });
	let ballDir   = $state({ x: 0, y: 1 });   // Richtung der Ballgeschwindigkeit in der Zone
	let faceStartAngle = $state(Math.PI);     // Blickrichtung beim Beginn der Pause
	let matchBeg  = $state(0);                // Zeitpunkt, ab dem der Ball in Kontaktreichweite ist

	let rafId  = 0;
	let cycleStart = 0;

	function newCycle() {
		defSpot = DEF_SPOTS[Math.floor(Math.random() * DEF_SPOTS.length)];
		overNet = { x: defSpot.x + rand(-0.8, 0.8), y: -1.3 };
		digTarget = {
			x: rand(ZONE_X0 + 0.4, ZONE_X1 - 0.4),
			y: rand(ZONE_Y0 + 0.3, ZONE_Y1 - 0.3),
		};
		const dx = digTarget.x - defSpot.x;
		const dy = digTarget.y - defSpot.y;
		const d  = Math.hypot(dx, dy) || 1;
		ballDir = { x: dx / d, y: dy / d };
		waitPoint = {
			x: digTarget.x - ballDir.x * 0.55,
			y: digTarget.y - ballDir.y * 0.55,
		};
		target = TARGETS[Math.floor(Math.random() * TARGETS.length)];

		// Zeitpunkt, ab dem der Ball in Kontaktreichweite des Wartepunkts ist.
		// Ball bewegt sich linear → zurückgelegter Weg = d * (e-T1)/T_DIG.
		const enterFrac = Math.max(0, 1 - CONTACT_RANGE_M / d);
		matchBeg = Math.max(RUN_END + 80, T1 + T_DIG * enterFrac);

		// Blickrichtung beim Erreichen des Wartepunkts (Ball wird angeschaut) — linear
		const tr = (RUN_END - T1) / T_DIG;
		const bRun = lerp(defSpot, digTarget, tr);
		faceStartAngle = Math.atan2(bRun.y - waitPoint.y, bRun.x - waitPoint.x);
	}

	// ─── Frame-Berechnung ────────────────────────────────────────────────────────────
	/** @param {number} e verstrichene Zeit im Zyklus (ms) */
	function compute(e) {
		// ── Ball ── (x und z immer LINEAR — nur die Höhe folgt einer Parabel) ──
		if (e < T1) {
			const t = e / T1;
			ballM = lerp(overNet, defSpot, t);
			ballH = 0.55 - 0.45 * t;
			phase = 'incoming';
		} else if (e < T2) {
			const t = (e - T1) / T_DIG;           // linear
			ballM = lerp(defSpot, digTarget, t);
			ballH = 0.1 + 0.9 * t + 0.5 * Math.sin(Math.PI * t); // Bogen (nur Höhe)
			phase = e >= matchBeg ? 'contact' : 'dig';
		} else if (e < T3) {
			const t = (e - T2) / T_SET;           // linear
			ballM = lerp(digTarget, target, t);
			ballH = 1 + 0.4 * Math.sin(Math.PI * t) - 0.6 * t;   // Bogen (nur Höhe)
			phase = 'set';
		} else {
			ballM = { ...target };
			ballH = 0.35;
			phase = 'hold';
		}

		// ── Zuspieler ──
		if (e < RUN_END) {
			const t = easeInOut(Math.min(1, e / RUN_END));
			setterM = lerp(SETTER_HOME, waitPoint, t);
			matchFrac = 0;
		} else if (e < matchBeg) {
			setterM = { ...waitPoint };            // Pause, Schwerpunkt ruhig
			matchFrac = 0;
		} else if (e < T2) {
			// Ball in Kontaktreichweite: Geschwindigkeit übernehmen. Der Zuspieler
			// beschleunigt (easeIn), sodass seine Geschwindigkeit beim Kontakt der
			// des Balls entspricht → relative Geschwindigkeit ~ 0.
			const p = (e - matchBeg) / (T2 - matchBeg);
			setterM = lerp(waitPoint, digTarget, p * p);
			matchFrac = p;
		} else if (e < T3) {
			const t = easeInOut((e - T2) / T_SET);
			setterM = lerp(digTarget, {
				x: digTarget.x + (target.x - digTarget.x) * 0.12,
				y: digTarget.y + (target.y - digTarget.y) * 0.12,
			}, t);
			matchFrac = 1;
		} else {
			matchFrac = 1;
		}

		// ── Blickrichtung ──
		// Während des Laufens schaut der Zuspieler zum Ball. Ab der Pause dreht er
		// sich nur noch nach links (Richtung Aussen) — keine andere Ausrichtung mehr —
		// und steht spätestens beim Kontakt exakt nach links.
		if (e < RUN_END) {
			const dx = ballM.x - setterM.x, dy = ballM.y - setterM.y;
			const d = Math.hypot(dx, dy) || 1;
			faceDir = { x: dx / d, y: dy / d };
		} else {
			const p = Math.min(1, (e - RUN_END) / (T2 - RUN_END));
			let delta = Math.PI - faceStartAngle;          // Ziel: exakt nach links
			while (delta >  Math.PI) delta -= 2 * Math.PI;  // kürzester Weg
			while (delta < -Math.PI) delta += 2 * Math.PI;
			const a = faceStartAngle + delta * easeInOut(p);
			faceDir = { x: Math.cos(a), y: Math.sin(a) };
		}
	}

	/** @param {number} ts */
	function frame(ts) {
		if (!cycleStart) { cycleStart = ts; newCycle(); }
		const e = ts - cycleStart;
		if (e >= T4) {
			cycleStart = ts;
			newCycle();
			compute(0);
		} else {
			compute(e);
		}
		if (playing) rafId = requestAnimationFrame(frame);
	}

	function togglePlay() {
		playing = !playing;
		if (playing) {
			cycleStart = 0;
			rafId = requestAnimationFrame(frame);
		} else {
			cancelAnimationFrame(rafId);
		}
	}

	$effect(() => {
		rafId = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Abgeleitete SVG-Werte ────────────────────────────────────────────────────
	let ballSvgX = $derived(fx(ballM.x));
	let ballSvgY = $derived(fy(ballM.y));
	let ballR    = $derived(5 + 4 * Math.max(0, ballH));
	let shadowDy = $derived(6 * Math.max(0, ballH));

	let setterSvgX = $derived(fx(setterM.x));
	let setterSvgY = $derived(fy(setterM.y));
	let defSvgX    = $derived(fx(defSpot.x));
	let defSvgY    = $derived(fy(defSpot.y));

	const SETTER_R = 0.30 * PX_PER_M_X;
	const DEF_R    = 0.24 * PX_PER_M_X;

	let setterFace = $derived(faceDir);

	let digLine = $derived({ x1: defSvgX, y1: defSvgY, x2: fx(digTarget.x), y2: fy(digTarget.y) });
	let setLine = $derived({ x1: fx(digTarget.x), y1: fy(digTarget.y), x2: fx(target.x), y2: fy(target.y) });

	// ─── Relative Geschwindigkeit (Kontaktfenster) ────────────────────────────────
	// Relativgeschwindigkeit = (1 − matchFrac) der Ballgeschwindigkeit.
	let relFactor = $derived(1 - matchFrac);
	let showRel   = $derived(phase === 'contact');
	// Länge des Relativpfeils in Pixel (Ballgeschwindigkeit ~ Einheit)
	const REL_LEN = 46;
	let relColor  = $derived(relFactor > 0.6 ? '#ef4444' : relFactor > 0.3 ? '#eab308' : '#16a34a');

	let phaseText = $derived((() => {
		switch (phase) {
			case 'incoming': return 'Der Ball kommt über das Netz zum Verteidiger';
			case 'dig':      return 'Verteidigung bringt den Ball in die Zuspielzone';
			case 'contact':  return 'Kurz vor Kontakt: Ballgeschwindigkeit übernehmen → relative Geschwindigkeit klein';
			case 'set':
			case 'hold':     return `Zuspiel → ${target.label}`;
			default:         return '';
		}
	})());
</script>

<div class="sr-wrap">
	<div class="sr-head">
		<h4>Zuspiel: relative Geschwindigkeit im Grundriss</h4>
		<p>Draufsicht der eigenen Feldhälfte. Der Zuspieler läuft in die Zone, wartet kurz und übernimmt
		kurz vor dem Kontakt die Geschwindigkeit des Balls. Je kleiner die <b>relative Geschwindigkeit</b>
		im Kontaktfenster, desto stabiler das Zuspiel — egal auf welches Ziel.</p>
	</div>

	<div class="sr-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="sr-svg" role="img" aria-label="Zuspiel Grundriss">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Gegnerseite -->
			<rect x={LEFT_X} y={0} width={RIGHT_X - LEFT_X} height={NET_Y} fill="#f1f5f9" opacity="0.7" />
			<text x={(LEFT_X + RIGHT_X) / 2} y={16} text-anchor="middle" fill="#94a3b8"
				font-size="9" font-family="sans-serif">gegnerische Seite</text>

			<!-- Feldbelag -->
			<rect x={LEFT_X} y={NET_Y} width={RIGHT_X - LEFT_X} height={ATK_Y - NET_Y} fill="#dbeafe" opacity="0.55" />
			<rect x={LEFT_X} y={ATK_Y} width={RIGHT_X - LEFT_X} height={BASE_Y - ATK_Y} fill="#e0f2fe" opacity="0.35" />

			<!-- Zuspielzone -->
			<rect x={fx(ZONE_X0)} y={fy(ZONE_Y0)} width={(ZONE_X1 - ZONE_X0) * PX_PER_M_X}
				height={(ZONE_Y1 - ZONE_Y0) * PX_PER_M_Y} rx="5"
				fill="#22c55e" opacity="0.1" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="6,4" />
			<text x={fx((ZONE_X0 + ZONE_X1) / 2)} y={fy(ZONE_Y1) - 5} text-anchor="middle"
				fill="#16a34a" font-size="9" font-family="sans-serif" font-weight="600" opacity="0.85">Zuspielzone</text>

			<!-- Feldmarkierungen -->
			<line x1={LEFT_X}  y1={NET_Y}  x2={LEFT_X}  y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={RIGHT_X} y1={NET_Y}  x2={RIGHT_X} y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={LEFT_X}  y1={BASE_Y} x2={RIGHT_X} y2={BASE_Y} stroke="#475569" stroke-width="2" />
			<line x1={LEFT_X}  y1={ATK_Y}  x2={RIGHT_X} y2={ATK_Y}
				stroke="#475569" stroke-width="2" stroke-dasharray="8,5" opacity="0.85" />
			<text x={LEFT_X - 6} y={ATK_Y + 3} text-anchor="end" fill="#475569"
				font-size="8" font-family="sans-serif" font-weight="600" opacity="0.8">3m</text>

			<!-- Netz -->
			<line x1={LEFT_X} y1={NET_Y} x2={RIGHT_X} y2={NET_Y} stroke="#475569" stroke-width="2.5" stroke-linecap="round" />
			{#each [LEFT_X, RIGHT_X] as ax}
				{#each Array(6) as _, seg}
					<rect x={ax - 2} y={NET_Y - 5 - seg * 6} width="4" height="6"
						fill={seg % 2 === 0 ? '#ef4444' : 'white'} opacity="0.85" />
				{/each}
			{/each}
			<text x={(LEFT_X + RIGHT_X) / 2} y={NET_Y - 10} text-anchor="middle" fill="#475569"
				font-size="10" font-family="sans-serif" font-weight="700" opacity="0.7">Netz</text>

			<!-- Angriffsziele -->
			{#each TARGETS as tgt (tgt.id)}
				{@const active = (phase === 'set' || phase === 'hold') && tgt.id === target.id}
				<circle cx={fx(tgt.x)} cy={fy(tgt.y)} r={active ? 13 : 9}
					fill={tgt.color} opacity={active ? 0.28 : 0.12}
					stroke={tgt.color} stroke-width={active ? 2 : 1}
					stroke-dasharray={active ? '' : '3,3'} />
				<text x={fx(tgt.x)} y={fy(tgt.y) + (tgt.y < 1.5 ? 26 : -16)} text-anchor="middle"
					fill={tgt.color} font-size={active ? '10' : '8.5'} font-family="sans-serif"
					font-weight={active ? '700' : '600'} opacity={active ? 1 : 0.6}>{tgt.label}</text>
			{/each}

			<!-- Flugbahn: Verteidiger → Zone -->
			{#if phase === 'dig' || phase === 'contact'}
				<line x1={digLine.x1} y1={digLine.y1} x2={digLine.x2} y2={digLine.y2}
					stroke="#64748b" stroke-width="1.6" stroke-dasharray="5,4" stroke-linecap="round" opacity="0.5" />
			{/if}
			<!-- Flugbahn: Zone → Ziel -->
			{#if phase === 'set' || phase === 'hold'}
				<line x1={setLine.x1} y1={setLine.y1} x2={setLine.x2} y2={setLine.y2}
					stroke={target.color} stroke-width="2" stroke-dasharray="7,4" stroke-linecap="round" opacity="0.75" />
			{/if}

			<!-- Verteidiger -->
			<ellipse cx={defSvgX} cy={defSvgY} rx={DEF_R * 1.1} ry={DEF_R * 0.55} fill="#94a3b8" opacity="0.18" />
			<circle cx={defSvgX} cy={defSvgY} r={DEF_R} fill="#f1f5f9" stroke="#64748b" stroke-width="2" opacity="0.9" />
			<text x={defSvgX} y={defSvgY + DEF_R + 12} text-anchor="middle" fill="#64748b"
				font-size="8.5" font-family="sans-serif" font-weight="600" opacity="0.8">Verteidiger</text>

			<!-- Zuspieler -->
			<ellipse cx={setterSvgX} cy={setterSvgY} rx={SETTER_R * 1.1} ry={SETTER_R * 0.55} fill="#94a3b8" opacity="0.18" />
			<line x1={setterSvgX} y1={setterSvgY}
				x2={setterSvgX + setterFace.x * SETTER_R * 1.5} y2={setterSvgY + setterFace.y * SETTER_R * 1.5}
				stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
			<circle cx={setterSvgX} cy={setterSvgY} r={SETTER_R} fill="#e0f2fe" stroke="#1e3a5f" stroke-width="2.5" opacity="0.95" />
			<circle cx={setterSvgX + setterFace.x * SETTER_R * 0.55} cy={setterSvgY + setterFace.y * SETTER_R * 0.55}
				r={SETTER_R * 0.42} fill="#fbbf24" stroke="#92400e" stroke-width="1.4" opacity="0.95" />
			<text x={setterSvgX} y={setterSvgY - SETTER_R - 6} text-anchor="middle" fill="#1e3a5f"
				font-size="9" font-family="sans-serif" font-weight="700" opacity="0.85">Zuspieler</text>

			<!-- Relative Geschwindigkeit im Kontaktfenster -->
			{#if showRel}
				{@const relEndX = ballSvgX + ballDir.x * REL_LEN * relFactor}
				{@const relEndY = ballSvgY + ballDir.y * REL_LEN * relFactor}
				{#if relFactor > 0.05}
					<line x1={ballSvgX} y1={ballSvgY} x2={relEndX} y2={relEndY}
						stroke={relColor} stroke-width="3" marker-end="url(#srArrow)" />
				{/if}
				<circle cx={ballSvgX} cy={ballSvgY} r={ballR + 6} fill="none"
					stroke={relColor} stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7" />
				<text x={ballSvgX + 12} y={ballSvgY - ballR - 8} fill={relColor}
					font-size="9" font-family="sans-serif" font-weight="700">v_rel</text>
			{/if}
			<defs>
				<marker id="srArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={relColor} />
				</marker>
			</defs>

			<!-- Ball -->
			<ellipse cx={ballSvgX} cy={ballSvgY + shadowDy} rx={ballR * 0.9} ry={ballR * 0.5}
				fill="#334155" opacity={0.18 / (1 + ballH)} />
			<circle cx={ballSvgX} cy={ballSvgY} r={ballR} fill="#ff8c00" stroke="#b45309" stroke-width="1.5" />
			<circle cx={ballSvgX - ballR * 0.3} cy={ballSvgY - ballR * 0.3} r={ballR * 0.28} fill="#ffd8a8" opacity="0.8" />
		</svg>
	</div>

	<!-- Zuspielfenster-Balken -->
	<!-- Statuszeile -->
	<div class="sr-status">
		<button class="sr-btn" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Abspielen'}>
			{#if playing}❚❚{:else}▶{/if}
		</button>
		<span class="sr-phase">{phaseText}</span>
	</div>

	<div class="sr-note">
		<strong>Merke:</strong> Der Zuspieler ist zuerst in der Zone, hält den Schwerpunkt ruhig und
		übernimmt kurz vor dem Kontakt die Geschwindigkeit des Balls. Dadurch bleibt die relative
		Geschwindigkeit klein — und das Zuspiel gelingt auf alle Ziele.
	</div>
</div>

<style>
	.sr-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 0.85rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.sr-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.sr-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.sr-svg-box { width: 100%; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e2e8f0; }
	.sr-svg { width: 100%; height: auto; display: block; user-select: none; }
	.sr-status {
		display: flex; align-items: center; gap: 0.75rem;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.9rem;
	}
	.sr-btn {
		flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 0.4rem;
		border: 1px solid #cbd5e1; background: #fff; color: #1e3a5f; font-size: 0.8rem;
		cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s;
	}
	.sr-btn:hover { background: #eff6ff; }
	.sr-phase { font-size: 0.85rem; font-weight: 600; color: #334155; }
	.sr-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.sr-note strong { color: #0369a1; }
	@media (max-width: 600px) {
		.sr-wrap { padding: 1rem; }
	}
</style>
