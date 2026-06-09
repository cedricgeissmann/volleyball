<script lang="ts">
	/**
	 * TreppeAttack — Animierte Draufsicht: Treppenangriff (Staffel)
	 *
	 * Koordinatensystem (Draufsicht, angreifende Seite):
	 *   x: 0 = linke Seitenlinie, 9m = rechte Seitenlinie
	 *   y: 0 = Netz (oben im SVG), 9m = Grundlinie (unten)
	 *
	 * Treppenangriff (Staffel / "Combination 1-2"):
	 *   Angreifer A1 läuft zuerst an (kurzer Ball, nahe Setter, Zone 3/4)
	 *   Angreifer A2 folgt mit leichter Verzögerung (langer Ball, Aussenposition, Zone 4/2)
	 *   Die "Treppe" entsteht durch die zeitlich versetzte Staffelung der Anläufe.
	 *   Der Setter entscheidet zufällig — jeder Durchgang anders!
	 *
	 * Animation-Phasen:
	 *   0.0–0.35  Anlauf A1 (Schnellangriffsposition nahe Setter)
	 *   0.15–0.50 Anlauf A2 (Aussenangriff, etwas später)
	 *   0.25      Setter spielt den Ball zufällig zu A1 oder A2
	 *   0.25–0.46 Ball fliegt zum gewählten Angreifer
	 *   0.44      Angreifer springt (der andere täuscht nach)
	 */

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W = 500;
	const SVG_H = 520;

	const MARGIN_L = 40;
	const MARGIN_T = 60;
	const MARGIN_R = 40;
	const MARGIN_B = 36;

	const FIELD_W_M = 9.0;
	const FIELD_H_M = 9.0;

	const FIELD_PX_W = SVG_W - MARGIN_L - MARGIN_R;
	const FIELD_PX_H = SVG_H - MARGIN_T - MARGIN_B;
	const PX_PER_M   = Math.min(FIELD_PX_W / FIELD_W_M, FIELD_PX_H / FIELD_H_M);

	const DRAW_W  = FIELD_W_M * PX_PER_M;
	const DRAW_H  = FIELD_H_M * PX_PER_M;
	const FIELD_X = MARGIN_L + (FIELD_PX_W - DRAW_W) / 2;
	const FIELD_Y = MARGIN_T;

	function fx(xM: number): number { return FIELD_X + xM * PX_PER_M; }
	function fy(yM: number): number { return FIELD_Y + yM * PX_PER_M; }

	// ─── Spieler-Startpositionen ──────────────────────────────────────────────────
	// Setter: bewegt sich von hinten nach vorne ans Netz (Zuspielposition)
	// WINKEL: Setter-Endposition beeinflusst Winkel beider Angriffszonen
	const SETTER_START  = { x: 6.2, y: 3.0 };  // Startposition (etwas hinter der 3m-Linie)
	const SETTER_TARGET = { x: 6.2, y: 0.9 };  // Zuspielposition (nahe Netz)

	// A1: Schnellangriff — startet nahe hinter dem Setter, kurzer Weg
	// WINKEL: A1-Anlauf definiert den schnellen Angriffswinkel (Zone 3/Mitte)
	const A1_START   = { x: 4.2, y: 3.4 };  // Startposition (nahe am Setter)
	const A1_TARGET  = { x: 4.2, y: 0.5 };  // Absprungpunkt (kurzer Angriff, nahe Setter)

	// A2: Langer Angriff — startet direkt neben A1, läuft zur Aussenposition
	// WINKEL: A2-Anlauf definiert den langen/diagonalen Angriffswinkel (Zone 4/links)
	const A2_START   = { x: 3.2, y: 3.4 };  // Startposition (direkt neben A1, ~1m Abstand)
	const A2_TARGET  = { x: 3.2, y: 0.6 };  // Absprungpunkt (Aussenposition links)

	// ─── Ball-Flugbahn ────────────────────────────────────────────────────────────
	// Ball kommt von hinten (Annahme/Pass-Position) → fliegt zu Setter → Setter spielt weiter
	const BALL_FROM      = { x: 4.5, y: 7.5 };  // Ball-Startpunkt (Annahme hinten)
	const BALL_TO_SET_CP = { x: 5.2, y: 4.0 };  // Kontrollpunkt Pass → Setter
	const BALL_TO_A1_CP  = { x: 5.5, y: -0.6 }; // Kontrollpunkt Setter → A1 (über Netz)
	const BALL_TO_A2_CP  = { x: 2.0, y: -0.8 }; // Kontrollpunkt Setter → A2 (über Netz, links)

	// ─── Animation-Timing ────────────────────────────────────────────────────────
	// Alle Werte in [0..1] (normalisierte Zeit über ANIM_DURATION ms)
	const ANIM_DURATION = 3400; // ms für einen kompletten Zyklus

	// Phasen:
	const T_BALL_TO_SET_START = 0.00;  // Ball startet von hinten
	const T_BALL_TO_SET_END   = 0.22;  // Ball erreicht Setter
	const T_A1_MOVE_START  = 0.05;  // A1 beginnt Anlauf
	const T_A1_MOVE_END    = 0.42;  // A1 erreicht Absprungpunkt
	const T_A2_MOVE_START  = 0.14;  // A2 beginnt Anlauf (etwas später — "Treppe")
	const T_A2_MOVE_END    = 0.50;  // A2 erreicht Absprungpunkt
	const T_SET            = 0.25;  // Setter gibt den Ball ab (kurz nach Ballerhalt)
	const T_BALL_END       = 0.46;  // Ball erreicht Zielangreifer
	// Absprung-Timing: der Angreifer der den Ball bekommt springt zuerst,
	// der andere täuscht kurz danach nach ("Treppe")
	const T_JUMP_MAIN      = 0.44;  // Zielangreifer springt
	const T_JUMP_DECOY     = 0.55;  // Täuschungsangreifer springt kurz danach

	// Setter-Bewegung: von hinten nach vorne
	const T_SETTER_MOVE_START = 0.00;
	const T_SETTER_MOVE_END   = 0.20;

	// Sprung-Dauer
	const JUMP_DURATION    = 0.14;
	const JUMP_HEIGHT_PX   = 18;

	// ─── Svelte-Zustand ───────────────────────────────────────────────────────────
	let t            = $state(0);      // normalisierte Animationszeit [0..1]
	let running      = $state(false);
	let rafId        = $state(0);
	let startTime    = $state(0);
	// Zufälliges Zuspiel: 1 = A1, 2 = A2 — wird bei jedem Reset neu gewürfelt
	let targetPlayer = $state<1|2>(Math.random() < 0.5 ? 1 : 2);

	// ─── Easing ──────────────────────────────────────────────────────────────────
	// ease-out: schnell starten, langsam ankommen (wie ein Sprint der ausläuft)
	function easeOut(x: number): number {
		return 1 - (1 - x) * (1 - x);
	}

	// Normalisierte Zeit innerhalb eines Phasen-Fensters
	function phaseT(tStart: number, tEnd: number, tCurrent: number): number {
		if (tEnd <= tStart) return 1;
		return Math.max(0, Math.min(1, (tCurrent - tStart) / (tEnd - tStart)));
	}

	// lineares Interpolieren mit Clamp
	function lerp(a: number, b: number, tNorm: number): number {
		return a + (b - a) * Math.max(0, Math.min(1, tNorm));
	}

	// Quadratischer Bezier (SVG-Koordinaten)
	function bezier2(p0x: number, p0y: number, cpx: number, cpy: number, p1x: number, p1y: number, bt: number) {
		return {
			x: (1-bt)*(1-bt)*p0x + 2*(1-bt)*bt*cpx + bt*bt*p1x,
			y: (1-bt)*(1-bt)*p0y + 2*(1-bt)*bt*cpy + bt*bt*p1y,
		};
	}

	// ─── Positionen berechnen (reaktiv auf t) ────────────────────────────────────

	// Setter-Position: bewegt sich von hinten ans Netz (ease-out)
	let setterPos = $derived.by(() => {
		const pt = easeOut(phaseT(T_SETTER_MOVE_START, T_SETTER_MOVE_END, t));
		return {
			x: fx(lerp(SETTER_START.x, SETTER_TARGET.x, pt)),
			y: fy(lerp(SETTER_START.y, SETTER_TARGET.y, pt)),
		};
	});

	// A1-Position (ease-out Bezier-Anlauf)
	const A1_CP = { x: A1_START.x + 0.3, y: (A1_START.y + A1_TARGET.y) / 2 };
	let a1Pos = $derived.by(() => {
		const pt = easeOut(phaseT(T_A1_MOVE_START, T_A1_MOVE_END, t));
		const pos = bezier2(fx(A1_START.x), fy(A1_START.y), fx(A1_CP.x), fy(A1_CP.y), fx(A1_TARGET.x), fy(A1_TARGET.y), pt);
		// A1 springt immer zuerst (T_JUMP_MAIN), unabhängig vom Zuspiel
		const jumpT = T_JUMP_MAIN;
		const jumping = t >= jumpT && t < jumpT + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(jumpT, jumpT + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping, arrived: t >= T_A1_MOVE_END };
	});

	// A2-Position (ease-out Bezier-Anlauf)
	const A2_CP = { x: A2_START.x - 0.3, y: (A2_START.y + A2_TARGET.y) / 2 };
	let a2Pos = $derived.by(() => {
		const pt = easeOut(phaseT(T_A2_MOVE_START, T_A2_MOVE_END, t));
		const pos = bezier2(fx(A2_START.x), fy(A2_START.y), fx(A2_CP.x), fy(A2_CP.y), fx(A2_TARGET.x), fy(A2_TARGET.y), pt);
		// A2 springt immer nach A1 (T_JUMP_DECOY), unabhängig vom Zuspiel
		const jumpT = T_JUMP_DECOY;
		const jumping = t >= jumpT && t < jumpT + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(jumpT, jumpT + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping, arrived: t >= T_A2_MOVE_END };
	});

	// Ball-Position: Phase 1 = von hinten zu Setter, Phase 2 = Setter zu Zielangreifer
	let ballPos = $derived.by(() => {
		if (t < T_BALL_TO_SET_END) {
			// Ball fliegt von hinten zum Setter
			const bt = easeOut(phaseT(T_BALL_TO_SET_START, T_BALL_TO_SET_END, t));
			const pos = bezier2(
				fx(BALL_FROM.x), fy(BALL_FROM.y),
				fx(BALL_TO_SET_CP.x), fy(BALL_TO_SET_CP.y),
				setterPos.x, setterPos.y,
				bt
			);
			return { x: pos.x, y: pos.y, visible: true };
		}
		if (t < T_SET) {
			// Ball liegt beim Setter (kurze Pause)
			return { x: setterPos.x, y: setterPos.y, visible: true };
		}
		// Ball fliegt vom Setter zum zufällig gewählten Angreifer
		const bt = easeOut(phaseT(T_SET, T_BALL_END, t));
		const targetX = targetPlayer === 1 ? A1_TARGET.x : A2_TARGET.x;
		const targetY = targetPlayer === 1 ? A1_TARGET.y : A2_TARGET.y;
		const cpX = targetPlayer === 1 ? BALL_TO_A1_CP.x : BALL_TO_A2_CP.x;
		const cpY = targetPlayer === 1 ? BALL_TO_A1_CP.y : BALL_TO_A2_CP.y;
		const pos = bezier2(
			setterPos.x, setterPos.y,
			fx(cpX), fy(cpY),
			fx(targetX), fy(targetY),
			bt
		);
		return { x: pos.x, y: pos.y, visible: true };
	});

	// Spur-Opazität
	let a1TrailOpacity = $derived(
		t >= T_A1_MOVE_START && t <= T_A1_MOVE_END + 0.12 ? 0.35 : 0.12
	);
	let a2TrailOpacity = $derived(
		t >= T_A2_MOVE_START && t <= T_A2_MOVE_END + 0.12 ? 0.35 : 0.12
	);

	// ─── Animation-Loop ───────────────────────────────────────────────────────────
	function tick(now: number) {
		if (!running) return;
		const elapsed = (now - startTime) / ANIM_DURATION;
		const newT = elapsed % 1;
		// Bei jedem neuen Zyklus (Wraparound) neuen Zielspieler wählen
		if (newT < t) {
			targetPlayer = Math.random() < 0.5 ? 1 : 2;
		}
		t = newT;
		rafId = requestAnimationFrame(tick);
	}

	function togglePlay() {
		running = !running;
		if (running) {
			startTime = performance.now() - t * ANIM_DURATION;
			rafId = requestAnimationFrame(tick);
		} else {
			cancelAnimationFrame(rafId);
		}
	}

	function reset() {
		running = false;
		cancelAnimationFrame(rafId);
		t = 0;
		// Nächster Durchgang: zufällig anderen Angreifer wählen
		targetPlayer = Math.random() < 0.5 ? 1 : 2;
	}

	// Cleanup
	$effect(() => {
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Vorberechnete Label-Positionen ───────────────────────────────────────────
	const LABEL_A1_X = fx(A1_TARGET.x) + 22;
	const LABEL_A1_Y = fy(A1_TARGET.y) + 4;
	const LABEL_A2_X = fx(A2_TARGET.x) - 22;
	const LABEL_A2_Y = fy(A2_TARGET.y) + 4;

	// 3m-Linie
	const LINE_3M_Y = fy(3.0);

	// Anlauf-Pfade nutzen die gleichen CPs wie die Bezier-Bewegung
	const A1_TRAIL_PATH = `M ${fx(A1_START.x).toFixed(1)} ${fy(A1_START.y).toFixed(1)} Q ${fx(A1_CP.x).toFixed(1)} ${fy(A1_CP.y).toFixed(1)} ${fx(A1_TARGET.x).toFixed(1)} ${fy(A1_TARGET.y).toFixed(1)}`;
	const A2_TRAIL_PATH = `M ${fx(A2_START.x).toFixed(1)} ${fy(A2_START.y).toFixed(1)} Q ${fx(A2_CP.x).toFixed(1)} ${fy(A2_CP.y).toFixed(1)} ${fx(A2_TARGET.x).toFixed(1)} ${fy(A2_TARGET.y).toFixed(1)}`;

	// Setter-Bewegungsspur
	const SETTER_TRAIL_PATH = `M ${fx(SETTER_START.x).toFixed(1)} ${fy(SETTER_START.y).toFixed(1)} L ${fx(SETTER_TARGET.x).toFixed(1)} ${fy(SETTER_TARGET.y).toFixed(1)}`;

	// Phasen-Label
	let phaseLabel = $derived.by(() => {
		const target = targetPlayer === 1 ? 'A1' : 'A2';
		const decoy  = targetPlayer === 1 ? 'A2' : 'A1';
		if (t < T_BALL_TO_SET_END) return 'Ball kommt von hinten — Setter läuft ans Netz';
		if (t < T_A2_MOVE_START)   return 'A1 startet Anlauf';
		if (t < T_SET)             return 'A1 & A2 laufen an — gestaffelt (Treppe)';
		if (t < T_BALL_END)        return `Setter entscheidet: Ball zu ${target}!`;
		if (t < T_JUMP_DECOY)      return `${target} springt — ${decoy} springt kurz danach`;
		if (t < T_JUMP_DECOY + JUMP_DURATION) return 'Treppeneffekt: beide zeitversetzt in der Luft!';
		return 'Angriff abgeschlossen';
	});

	// Fortschrittsbalken-Breite
	let progressW = $derived(t * 100);
</script>

<div class="ta-wrapper">
	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="ta-header">
		<span class="ta-title">Treppenangriff (Staffel)</span>
		<p class="ta-subtitle">
			Zwei Angreifer laufen <strong>zeitlich versetzt</strong> an — A1 kurz und schnell nahe dem Setter,
			A2 mit leichter Verzögerung aussen. Die Staffelung erzeugt die namensgebende "Treppe" der Absprungzeitpunkte.
		</p>
	</div>

	<!-- ── SVG ────────────────────────────────────────────────────────────────── -->
	<div class="ta-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="ta-svg"
			role="img"
			aria-label="Animierter Treppenangriff, Draufsicht"
		>
			<!-- ╔══ Hintergrund ══════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f1f5f9" rx="10" />

			<!-- ╔══ Spielfeld ════════════════════════════════════════════════════╗ -->
			<rect x={FIELD_X} y={FIELD_Y} width={DRAW_W} height={DRAW_H} fill="#fef9ee" rx="2" />

			<!-- 3m-Linie -->
			<line x1={FIELD_X} y1={LINE_3M_Y} x2={FIELD_X + DRAW_W} y2={LINE_3M_Y}
				stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="7,5" opacity="0.6" />
			<text x={FIELD_X - 6} y={LINE_3M_Y + 3} text-anchor="end"
				fill="#94a3b8" font-size="8" font-family="sans-serif">3m</text>

			<!-- Mittelinie vertikal -->
			<line x1={fx(4.5)} y1={FIELD_Y} x2={fx(4.5)} y2={FIELD_Y + DRAW_H}
				stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4" opacity="0.35" />

			<!-- Feldrahmen -->
			<rect x={FIELD_X} y={FIELD_Y} width={DRAW_W} height={DRAW_H}
				fill="none" stroke="#64748b" stroke-width="2.5" />

			<!-- ╔══ Netz ════════════════════════════════════════════════════════╗ -->
			<rect x={FIELD_X - 6} y={FIELD_Y - 10} width="6" height="14" rx="2" fill="#475569" />
			<rect x={FIELD_X + DRAW_W} y={FIELD_Y - 10} width="6" height="14" rx="2" fill="#475569" />
			<rect x={FIELD_X} y={FIELD_Y - 6} width={DRAW_W} height="7" rx="2" fill="#94a3b8" opacity="0.85" />
			<rect x={FIELD_X} y={FIELD_Y - 6} width={DRAW_W} height="7" rx="2"
				fill="none" stroke="#475569" stroke-width="1.2" />
			<text x={FIELD_X + DRAW_W / 2} y={FIELD_Y - 9} text-anchor="middle"
				fill="#64748b" font-size="8" font-family="sans-serif" font-weight="600">NETZ</text>

			<!-- ╔══ Anlauf-Spuren (gestrichelt) ════════════════════════════════╗ -->
			<!-- A1-Spur: blau -->
			<path d={A1_TRAIL_PATH}
				fill="none" stroke="#2563eb" stroke-width="2"
				stroke-dasharray="6,4"
				opacity={a1TrailOpacity} />
			<!-- Absprungpunkt A1 -->
			<circle cx={fx(A1_TARGET.x)} cy={fy(A1_TARGET.y)} r="5"
				fill="none" stroke="#2563eb" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />

			<!-- A2-Spur: orange -->
			<path d={A2_TRAIL_PATH}
				fill="none" stroke="#d97706" stroke-width="2"
				stroke-dasharray="6,4"
				opacity={a2TrailOpacity} />
			<!-- Absprungpunkt A2 -->
			<circle cx={fx(A2_TARGET.x)} cy={fy(A2_TARGET.y)} r="5"
				fill="none" stroke="#d97706" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />

			<!-- Absprung-Label A1 -->
			<text x={LABEL_A1_X} y={LABEL_A1_Y}
				fill="#2563eb" font-size="8" font-family="sans-serif"
				opacity="0.55">Absprung A1</text>
			<!-- Absprung-Label A2 -->
			<text x={LABEL_A2_X} y={LABEL_A2_Y}
				text-anchor="end"
				fill="#d97706" font-size="8" font-family="sans-serif"
				opacity="0.55">Absprung A2</text>

			<!-- ╔══ Ball-Flugbahn ═══════════════════════════════════════════════╗ -->
			{#if ballPos.visible}
				<circle cx={ballPos.x} cy={ballPos.y} r="7"
					fill="#fbbf24" stroke="#d97706" stroke-width="1.5" opacity="0.95" />
				<!-- Ball-Glanzpunkt -->
				<circle cx={ballPos.x - 2} cy={ballPos.y - 2} r="2.5"
					fill="white" opacity="0.5" />
			{/if}

			<!-- ╔══ Setter-Laufspur ══════════════════════════════════════════════╗ -->
			<path d={SETTER_TRAIL_PATH}
				fill="none" stroke="#0f172a" stroke-width="1.5"
				stroke-dasharray="4,4" opacity="0.2" />

			<!-- ╔══ Setter (animiert) ════════════════════════════════════════════╗ -->
			<circle cx={setterPos.x} cy={setterPos.y} r="16" fill="#0f172a" opacity="0.9" />
			<text x={setterPos.x} y={setterPos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">S</text>
			<text x={setterPos.x + 20} y={setterPos.y - 12}
				fill="#0f172a" font-size="8" font-family="sans-serif" opacity="0.65">Setter</text>

			<!-- ╔══ Angreifer A1 ═════════════════════════════════════════════════╗ -->
			<!-- Schatten -->
			<ellipse cx={a1Pos.x} cy={fy(A1_START.y) + 3}
				rx="13" ry="4.5" fill="#475569" opacity="0.08" />
			<circle cx={a1Pos.x} cy={a1Pos.y} r="15"
				fill={a1Pos.jumping ? '#1d4ed8' : '#2563eb'}
				stroke={a1Pos.jumping ? '#93c5fd' : 'none'}
				stroke-width={a1Pos.jumping ? 2.5 : 0}
				opacity="0.95" />
			<text x={a1Pos.x} y={a1Pos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">A1</text>
			<!-- Sprung-Indikator A1 -->
			{#if a1Pos.jumping}
				<text x={a1Pos.x} y={a1Pos.y - 20} text-anchor="middle"
					fill="#2563eb" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.85">↑</text>
			{/if}

			<!-- ╔══ Angreifer A2 ═════════════════════════════════════════════════╗ -->
			<ellipse cx={a2Pos.x} cy={fy(A2_START.y) + 3}
				rx="13" ry="4.5" fill="#475569" opacity="0.08" />
			<circle cx={a2Pos.x} cy={a2Pos.y} r="15"
				fill={a2Pos.jumping ? '#b45309' : '#d97706'}
				stroke={a2Pos.jumping ? '#fde68a' : 'none'}
				stroke-width={a2Pos.jumping ? 2.5 : 0}
				opacity="0.95" />
			<text x={a2Pos.x} y={a2Pos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">A2</text>
			{#if a2Pos.jumping}
				<text x={a2Pos.x} y={a2Pos.y - 20} text-anchor="middle"
					fill="#d97706" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.85">↑</text>
			{/if}

			<!-- ╔══ Grundlinie-Label ════════════════════════════════════════════╗ -->
			<text x={FIELD_X + DRAW_W / 2} y={FIELD_Y + DRAW_H + 20}
				text-anchor="middle" fill="#94a3b8" font-size="8" font-family="sans-serif">Grundlinie</text>
		</svg>
	</div>

	<!-- ── Fortschrittsbalken ─────────────────────────────────────────────────── -->
	<div class="ta-progress-bar">
		<div class="ta-progress-fill" style="width: {progressW}%"></div>
	</div>

	<!-- ── Phasen-Label ───────────────────────────────────────────────────────── -->
	<div class="ta-phase-label">{phaseLabel}</div>

	<!-- ── Steuerung ─────────────────────────────────────────────────────────── -->
	<div class="ta-controls">
		<button class="ta-btn ta-btn-play" onclick={togglePlay}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="ta-btn ta-btn-reset" onclick={reset}>
			↺ Reset
		</button>
	</div>

	<!-- ── Legende ────────────────────────────────────────────────────────────── -->
	<div class="ta-legend">
		<div class="ta-legend-item">
			<span class="ta-legend-dot" style="background:#0f172a"></span>
			<span>S — Setter</span>
		</div>
		<div class="ta-legend-item">
			<span class="ta-legend-dot" style="background:#2563eb"></span>
			<span>A1 — Schnellangriff (nahe Setter)</span>
		</div>
		<div class="ta-legend-item">
			<span class="ta-legend-dot" style="background:#d97706"></span>
			<span>A2 — Aussenangriff (zeitverzögert)</span>
		</div>
	</div>
</div>

<style>
	.ta-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	.ta-header { display: flex; flex-direction: column; gap: 0.25rem; }

	.ta-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
	}

	.ta-subtitle {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	.ta-svg-wrapper { width: 100%; overflow: hidden; border-radius: 0.5rem; }
	.ta-svg { width: 100%; height: auto; display: block; }

	/* ── Fortschritt ──────────────────────────────────────────── */
	.ta-progress-bar {
		height: 4px;
		background: #e2e8f0;
		border-radius: 2px;
		overflow: hidden;
	}
	.ta-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #2563eb, #d97706);
		border-radius: 2px;
		transition: width 0.05s linear;
	}

	/* ── Phasen-Label ─────────────────────────────────────────── */
	.ta-phase-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #1e3a5f;
		text-align: center;
		min-height: 1.2em;
		padding: 0.2rem 0.5rem;
		background: #eff6ff;
		border-radius: 0.35rem;
	}

	/* ── Steuerung ────────────────────────────────────────────── */
	.ta-controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.ta-btn {
		padding: 0.45rem 1.2rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		background: #f8fafc;
		color: #475569;
		font-size: 0.83rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.ta-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }

	.ta-btn-play {
		border-color: #2563eb;
		color: #2563eb;
		background: #eff6ff;
	}
	.ta-btn-play:hover { background: #dbeafe; }

	/* ── Legende ──────────────────────────────────────────────── */
	.ta-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.2rem;
	}

	.ta-legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: #475569;
	}

	.ta-legend-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	@media (max-width: 600px) {
		.ta-wrapper { padding: 1rem; }
		.ta-legend { flex-direction: column; gap: 0.35rem; }
	}
</style>
