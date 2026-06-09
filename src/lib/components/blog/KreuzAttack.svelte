<script lang="ts">
	/**
	 * KreuzAttack — Animierte Draufsicht: Kreuzangriff
	 *
	 * Koordinatensystem (Draufsicht, angreifende Seite):
	 *   x: 0 = linke Seitenlinie, 9m = rechte Seitenlinie
	 *   y: 0 = Netz (oben im SVG), 9m = Grundlinie (unten)
	 *
	 * Kreuzangriff ("Combination X / Cross"):
	 *   A1 startet von links, läuft nach rechts zur Mitte/rechten Seite
	 *   A2 startet von rechts (oder hinten), läuft nach links — die Laufwege
	 *   kreuzen sich! Der Gegner-Block weiß nicht, wer den Ball bekommt.
	 *
	 *   Variante hier: A1 kommt aus linker Aussenposition, läuft schräg nach rechts-vorne.
	 *                  A2 kommt aus rechter Hinterposition, läuft schräg nach links-vorne.
	 *                  Die Laufwege kreuzen sich ungefähr in der Mitte des Angriffbereichs.
	 *                  Setter steht rechts am Netz.
	 *
	 * Animation-Phasen:
	 *   0.00–0.45  Beide laufen gleichzeitig an (Laufwege kreuzen sich bei ~0.30)
	 *   0.30       Kreuzungspunkt — maximale Verwirrung für den Block
	 *   0.44       Setter spielt zu A1 (Entscheidung nach der Kreuzung)
	 *   0.44–0.60  Ball fliegt zu A1 (links aussen)
	 *   0.52–0.66  A1 springt, A2 springt kurz danach (Täuschungssprung)
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

	// ─── Spieler-Positionen ───────────────────────────────────────────────────────
	// Setter: bewegt sich von hinten ans Netz
	// WINKEL: Setter-Endposition bestimmt Zuspiel-Winkel zu A1 und A2
	const SETTER_START  = { x: 6.2, y: 3.2 };
	const SETTER_TARGET = { x: 6.2, y: 1.0 };

	// A1: startet links-mitte, läuft schräg nach rechts-vorne (Kreuzungsrichtung)
	// WINKEL: A1-Anlaufrichtung bestimmt den Kreuzungswinkel
	// Startet näher beim Setter, näher an A2
	const A1_START  = { x: 3.2, y: 4.0 };   // näher zusammen (mitte-links)
	const A1_TARGET = { x: 5.2, y: 0.6 };   // Absprung mitte-rechts (kreuzt von links nach rechts)

	// A2: startet rechts-mitte, läuft schräg nach links-vorne (gegenläufig)
	// WINKEL: A2-Anlaufrichtung bestimmt den Kreuzungswinkel
	// A2 kommt FRÜHER am Kreuzungspunkt an als A1 (rechter läuft vor)
	const A2_START  = { x: 5.8, y: 3.6 };   // näher zusammen (mitte-rechts)
	const A2_TARGET = { x: 3.2, y: 0.6 };   // Absprung mitte-links (kreuzt von rechts nach links)

	// Kreuzungspunkt der Laufwege (geometrischer Schnittpunkt der Anlaufpfade)
	const CROSS_X = 4.5;
	const CROSS_Y = 2.1;

	// ─── Ball ──────────────────────────────────────────────────────────────────────
	const BALL_FROM      = { x: 4.5, y: 7.5 };   // Annahme-Position hinten
	const BALL_TO_SET_CP = { x: 5.5, y: 4.2 };   // Kontrollpunkt Pass → Setter
	const BALL_TO_A1_CP  = { x: 5.8, y: -0.7 };  // Kontrollpunkt Setter → A1 (rechts-vorne)
	const BALL_TO_A2_CP  = { x: 3.5, y: -0.7 };  // Kontrollpunkt Setter → A2 (links-vorne)

	// ─── Animation-Timing ────────────────────────────────────────────────────────
	const ANIM_DURATION = 3600; // ms (etwas mehr Zeit für Kreuzung)

	const T_BALL_TO_SET_START = 0.00;
	const T_BALL_TO_SET_END   = 0.22;
	// A2 (rechts) startet leicht früher → passiert den Kreuzungspunkt VOR A1
	// Das erzeugt den "rechter läuft vor"-Effekt im Anlaufweg
	const T_A1_MOVE_START = 0.07;   // A1 startet etwas später
	const T_A2_MOVE_START = 0.03;   // A2 startet früher → kommt früher am Kreuzungspunkt an
	const T_A1_MOVE_END   = 0.46;   // A1 braucht etwas länger (längerer Weg nach rechts)
	const T_A2_MOVE_END   = 0.42;   // A2 kommt früher an (etwas kürzerer Weg)
	const T_SET           = 0.26;   // Setter gibt früh ab (kurz nach Ballerhalt)
	const T_BALL_END      = 0.46;   // Ball erreicht Zielangreifer
	// Absprung FRÜHER — noch während der Ball in der Luft ist (T_JUMP_MAIN < T_BALL_END)
	const T_JUMP_MAIN     = 0.40;   // Zielangreifer springt schon bevor Ball ankommt!
	const T_JUMP_DECOY    = 0.44;   // Täuschungsangreifer springt kurz danach
	const JUMP_DURATION   = 0.14;
	const JUMP_HEIGHT_PX  = 18;

	// Setter-Bewegung
	const T_SETTER_MOVE_START = 0.00;
	const T_SETTER_MOVE_END   = 0.20;

	// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
	function lerp(a: number, b: number, tNorm: number): number {
		return a + (b - a) * Math.max(0, Math.min(1, tNorm));
	}

	// ease-out: schnell starten, langsam ankommen
	function easeOut(x: number): number {
		return 1 - (1 - x) * (1 - x);
	}

	function phaseT(tStart: number, tEnd: number, tCurrent: number): number {
		if (tEnd <= tStart) return 1;
		return Math.max(0, Math.min(1, (tCurrent - tStart) / (tEnd - tStart)));
	}

	function bezier2(p0x: number, p0y: number, cpx: number, cpy: number, p1x: number, p1y: number, bt: number) {
		return {
			x: (1-bt)*(1-bt)*p0x + 2*(1-bt)*bt*cpx + bt*bt*p1x,
			y: (1-bt)*(1-bt)*p0y + 2*(1-bt)*bt*cpy + bt*bt*p1y,
		};
	}

	// ─── Svelte-Zustand ───────────────────────────────────────────────────────────
	let t            = $state(0);
	let running      = $state(false);
	let rafId        = $state(0);
	let startTime    = $state(0);
	// Zufälliges Zuspiel: 1 = A1, 2 = A2 — wird bei jedem Reset/Zyklus neu gewürfelt
	let targetPlayer = $state<1|2>(Math.random() < 0.5 ? 1 : 2);

	// ─── Positionen reaktiv ───────────────────────────────────────────────────────

	// Setter: läuft von hinten ans Netz (ease-out)
	let setterPos = $derived.by(() => {
		const pt = easeOut(phaseT(T_SETTER_MOVE_START, T_SETTER_MOVE_END, t));
		return {
			x: fx(lerp(SETTER_START.x, SETTER_TARGET.x, pt)),
			y: fy(lerp(SETTER_START.y, SETTER_TARGET.y, pt)),
		};
	});

	// A1: läuft von links-mitte nach rechts-vorne (ease-out Bezier)
	// Bezier-Kontrollpunkt: leicht nach rechts gebogen für natürlichen Anlauf
	const A1_CP = { x: A1_START.x + (A1_TARGET.x - A1_START.x) * 0.4 + 0.2, y: (A1_START.y + A1_TARGET.y) / 2 + 0.3 };

	let a1Pos = $derived.by(() => {
		const pt = easeOut(phaseT(T_A1_MOVE_START, T_A1_MOVE_END, t));
		const pos = bezier2(fx(A1_START.x), fy(A1_START.y), fx(A1_CP.x), fy(A1_CP.y), fx(A1_TARGET.x), fy(A1_TARGET.y), pt);
		// A1 springt immer nach A2 (T_JUMP_DECOY), unabhängig vom Zuspiel
		const jumpT = T_JUMP_DECOY;
		const jumping = t >= jumpT && t < jumpT + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(jumpT, jumpT + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping };
	});

	// A2: läuft von rechts-mitte nach links-vorne (ease-out Bezier, gegenläufig)
	// A2 startet früher → kommt FRÜHER am Kreuzungspunkt an (rechter läuft vor)
	// Bezier-Kontrollpunkt: leicht nach links gebogen
	const A2_CP = { x: A2_START.x + (A2_TARGET.x - A2_START.x) * 0.4 - 0.2, y: (A2_START.y + A2_TARGET.y) / 2 + 0.3 };

	let a2Pos = $derived.by(() => {
		const pt = easeOut(phaseT(T_A2_MOVE_START, T_A2_MOVE_END, t));
		const pos = bezier2(fx(A2_START.x), fy(A2_START.y), fx(A2_CP.x), fy(A2_CP.y), fx(A2_TARGET.x), fy(A2_TARGET.y), pt);
		// A2 springt immer zuerst (T_JUMP_MAIN), unabhängig vom Zuspiel
		const jumpT = T_JUMP_MAIN;
		const jumping = t >= jumpT && t < jumpT + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(jumpT, jumpT + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping };
	});

	// Ball: Phase 1 = von hinten zu Setter, Phase 2 = Setter zum zufälligen Zielangreifer
	let ballPos = $derived.by(() => {
		if (t < T_BALL_TO_SET_END) {
			const bt = easeOut(phaseT(T_BALL_TO_SET_START, T_BALL_TO_SET_END, t));
			const pos = bezier2(
				fx(BALL_FROM.x), fy(BALL_FROM.y),
				fx(BALL_TO_SET_CP.x), fy(BALL_TO_SET_CP.y),
				setterPos.x, setterPos.y, bt
			);
			return { x: pos.x, y: pos.y, visible: true };
		}
		if (t < T_SET) {
			return { x: setterPos.x, y: setterPos.y, visible: true };
		}
		// Zuspiel zum zufällig gewählten Angreifer
		const bt = easeOut(phaseT(T_SET, T_BALL_END, t));
		const targetX = targetPlayer === 1 ? A1_TARGET.x : A2_TARGET.x;
		const targetY = targetPlayer === 1 ? A1_TARGET.y : A2_TARGET.y;
		const cpX = targetPlayer === 1 ? BALL_TO_A1_CP.x : BALL_TO_A2_CP.x;
		const cpY = targetPlayer === 1 ? BALL_TO_A1_CP.y : BALL_TO_A2_CP.y;
		const pos = bezier2(
			setterPos.x, setterPos.y,
			fx(cpX), fy(cpY),
			fx(targetX), fy(targetY), bt
		);
		return { x: pos.x, y: pos.y, visible: true };
	});

	// Kreuzungsmoment: A2 passiert den Kreuzungspunkt früher als A1
	// A2 (früher startend) kreuzt bei ~t=0.22, A1 kreuzt bei ~t=0.29
	let crossingNow = $derived.by(() => {
		return t > 0.20 && t < 0.34;
	});

	// Fortschritt
	let progressW = $derived(t * 100);

	// Phasen-Label
	let phaseLabel = $derived.by(() => {
		const target = targetPlayer === 1 ? 'A1' : 'A2';
		const decoy  = targetPlayer === 1 ? 'A2' : 'A1';
		if (t < T_BALL_TO_SET_END) return 'Ball kommt von hinten — Setter läuft ans Netz';
		if (t < 0.23) return 'A2 (rechts) startet Anlauf nach links — A1 kurz danach';
		if (t < 0.27) return 'A2 passiert Kreuzungspunkt — läuft vor A1!';
		if (t < 0.34) return 'Kreuzung! Block verliert Zuordnung — wer greift wo an?';
		if (t < T_SET) return 'Nach der Kreuzung — Setter bereitet Zuspiel vor';
		if (t < T_JUMP_MAIN) return `Setter spielt zu ${target}! Angreifer springen schon an`;
		if (t < T_BALL_END)  return `${target} springt noch während der Ball fliegt!`;
		if (t < T_JUMP_DECOY + JUMP_DURATION) return `${decoy} täuscht Sprung an — Block ist gebunden!`;
		return 'Angriff abgeschlossen';
	});

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

	$effect(() => {
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Vorberechnete statische Werte ────────────────────────────────────────────
	// Anlauf-Pfade (Bezier) — gleiche CPs wie die Bewegungs-Beziers
	const A1_TRAIL = `M ${fx(A1_START.x).toFixed(1)} ${fy(A1_START.y).toFixed(1)} Q ${fx(A1_CP.x).toFixed(1)} ${fy(A1_CP.y).toFixed(1)} ${fx(A1_TARGET.x).toFixed(1)} ${fy(A1_TARGET.y).toFixed(1)}`;
	const A2_TRAIL = `M ${fx(A2_START.x).toFixed(1)} ${fy(A2_START.y).toFixed(1)} Q ${fx(A2_CP.x).toFixed(1)} ${fy(A2_CP.y).toFixed(1)} ${fx(A2_TARGET.x).toFixed(1)} ${fy(A2_TARGET.y).toFixed(1)}`;

	// Setter-Laufspur
	const SETTER_TRAIL = `M ${fx(SETTER_START.x).toFixed(1)} ${fy(SETTER_START.y).toFixed(1)} L ${fx(SETTER_TARGET.x).toFixed(1)} ${fy(SETTER_TARGET.y).toFixed(1)}`;

	// Kreuzungsmarkierung
	const CROSS_SVG_X = fx(CROSS_X);
	const CROSS_SVG_Y = fy(CROSS_Y);

	// 3m-Linie
	const LINE_3M_Y = fy(3.0);
</script>

<div class="ka-wrapper">
	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="ka-header">
		<span class="ka-title">Kreuzangriff</span>
		<p class="ka-subtitle">
			A2 (rechts) startet <strong>leicht früher</strong> und läuft nach links, A1 kurz danach nach rechts.
			Die Laufwege <strong>kreuzen sich — A2 läuft vor</strong>. Die Angreifer springen bereits
			bevor der Ball ankommt. Jeder Durchgang: zufälliges Zuspiel zu A1 oder A2.
		</p>
	</div>

	<!-- ── SVG ────────────────────────────────────────────────────────────────── -->
	<div class="ka-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="ka-svg"
			role="img"
			aria-label="Animierter Kreuzangriff, Draufsicht"
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

			<!-- Mittellinie vertikal -->
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

			<!-- ╔══ Anlauf-Spuren ════════════════════════════════════════════════╗ -->
			<!-- A1-Spur: lila (läuft von links nach rechts-vorne) -->
			<path d={A1_TRAIL}
				fill="none" stroke="#7c3aed" stroke-width="2"
				stroke-dasharray="6,4" opacity="0.30" />
			<!-- A2-Spur: grün (läuft von rechts nach links-vorne, gegenläufig) -->
			<path d={A2_TRAIL}
				fill="none" stroke="#059669" stroke-width="2"
				stroke-dasharray="6,4" opacity="0.30" />

			<!-- Absprungpunkte -->
			<circle cx={fx(A1_TARGET.x)} cy={fy(A1_TARGET.y)} r="5"
				fill="none" stroke="#7c3aed" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />
			<circle cx={fx(A2_TARGET.x)} cy={fy(A2_TARGET.y)} r="5"
				fill="none" stroke="#059669" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />

			<!-- Absprung-Labels -->
			<text x={fx(A1_TARGET.x) - 8} y={fy(A1_TARGET.y) + 14}
				text-anchor="middle" fill="#7c3aed" font-size="8" font-family="sans-serif" opacity="0.55"
			>Absprung A1</text>
			<text x={fx(A2_TARGET.x) + 8} y={fy(A2_TARGET.y) + 14}
				text-anchor="middle" fill="#059669" font-size="8" font-family="sans-serif" opacity="0.55"
			>Absprung A2</text>

			<!-- ╔══ Kreuzungsmarkierung ══════════════════════════════════════════╗ -->
			<!-- X-Symbol am Kreuzungspunkt, leuchtet auf wenn Spieler sich kreuzen -->
			<circle cx={CROSS_SVG_X} cy={CROSS_SVG_Y} r={crossingNow ? 18 : 13}
				fill={crossingNow ? '#fef3c7' : 'transparent'}
				stroke={crossingNow ? '#f59e0b' : '#cbd5e1'}
				stroke-width={crossingNow ? 2 : 1}
				stroke-dasharray={crossingNow ? 'none' : '4,3'}
				opacity={crossingNow ? 0.85 : 0.45}
			/>
			<text x={CROSS_SVG_X} y={CROSS_SVG_Y + 4} text-anchor="middle"
				fill={crossingNow ? '#b45309' : '#94a3b8'}
				font-size={crossingNow ? 14 : 11}
				font-family="sans-serif"
				font-weight="700"
				opacity={crossingNow ? 1 : 0.5}
			>✕</text>
			<text x={CROSS_SVG_X} y={CROSS_SVG_Y - 20} text-anchor="middle"
				fill="#b45309" font-size="8" font-family="sans-serif"
				opacity={crossingNow ? 0.9 : 0.3}
			>Kreuzung!</text>

			<!-- ╔══ Ball-Flugbahn ═══════════════════════════════════════════════╗ -->
			{#if ballPos.visible}
				<circle cx={ballPos.x} cy={ballPos.y} r="7"
					fill="#fbbf24" stroke="#d97706" stroke-width="1.5" opacity="0.95" />
				<circle cx={ballPos.x - 2} cy={ballPos.y - 2} r="2.5"
					fill="white" opacity="0.5" />
			{/if}

			<!-- ╔══ Setter-Laufspur ══════════════════════════════════════════════╗ -->
			<path d={SETTER_TRAIL}
				fill="none" stroke="#0f172a" stroke-width="1.5"
				stroke-dasharray="4,4" opacity="0.2" />

			<!-- ╔══ Setter (animiert) ════════════════════════════════════════════╗ -->
			<circle cx={setterPos.x} cy={setterPos.y} r="16" fill="#0f172a" opacity="0.9" />
			<text x={setterPos.x} y={setterPos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">S</text>
			<text x={setterPos.x + 20} y={setterPos.y - 12}
				fill="#0f172a" font-size="8" font-family="sans-serif" opacity="0.65">Setter</text>

			<!-- ╔══ Angreifer A1 ═════════════════════════════════════════════════╗ -->
			<ellipse cx={a1Pos.x} cy={a1Pos.y + 4} rx="13" ry="4.5" fill="#475569" opacity="0.08" />
			<circle cx={a1Pos.x} cy={a1Pos.y} r="15"
				fill={a1Pos.jumping ? '#5b21b6' : '#7c3aed'}
				stroke={a1Pos.jumping ? '#c4b5fd' : 'none'}
				stroke-width={a1Pos.jumping ? 2.5 : 0}
				opacity="0.95" />
			<text x={a1Pos.x} y={a1Pos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">A1</text>
			{#if a1Pos.jumping}
				<text x={a1Pos.x} y={a1Pos.y - 20} text-anchor="middle"
					fill="#7c3aed" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.85">↑</text>
			{/if}

			<!-- ╔══ Angreifer A2 ═════════════════════════════════════════════════╗ -->
			<ellipse cx={a2Pos.x} cy={a2Pos.y + 4} rx="13" ry="4.5" fill="#475569" opacity="0.08" />
			<circle cx={a2Pos.x} cy={a2Pos.y} r="15"
				fill={a2Pos.jumping ? '#047857' : '#059669'}
				stroke={a2Pos.jumping ? '#6ee7b7' : 'none'}
				stroke-width={a2Pos.jumping ? 2.5 : 0}
				opacity="0.95" />
			<text x={a2Pos.x} y={a2Pos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">A2</text>
			{#if a2Pos.jumping}
				<text x={a2Pos.x} y={a2Pos.y - 20} text-anchor="middle"
					fill="#059669" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.85">↑</text>
			{/if}

			<!-- ╔══ Grundlinie-Label ════════════════════════════════════════════╗ -->
			<text x={FIELD_X + DRAW_W / 2} y={FIELD_Y + DRAW_H + 20}
				text-anchor="middle" fill="#94a3b8" font-size="8" font-family="sans-serif">Grundlinie</text>
		</svg>
	</div>

	<!-- ── Fortschrittsbalken ─────────────────────────────────────────────────── -->
	<div class="ka-progress-bar">
		<div class="ka-progress-fill" style="width: {progressW}%"></div>
	</div>

	<!-- ── Phasen-Label ───────────────────────────────────────────────────────── -->
	<div class="ka-phase-label">{phaseLabel}</div>

	<!-- ── Steuerung ─────────────────────────────────────────────────────────── -->
	<div class="ka-controls">
		<button class="ka-btn ka-btn-play" onclick={togglePlay}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="ka-btn ka-btn-reset" onclick={reset}>
			↺ Reset
		</button>
	</div>

	<!-- ── Legende ────────────────────────────────────────────────────────────── -->
	<div class="ka-legend">
		<div class="ka-legend-item">
			<span class="ka-legend-dot" style="background:#0f172a"></span>
			<span>S — Setter</span>
		</div>
		<div class="ka-legend-item">
			<span class="ka-legend-dot" style="background:#7c3aed"></span>
			<span>A1 — läuft von links-mitte nach rechts (startet nach A2)</span>
		</div>
		<div class="ka-legend-item">
			<span class="ka-legend-dot" style="background:#059669"></span>
			<span>A2 — läuft von rechts-mitte nach links (startet früher, läuft vor!)</span>
		</div>
		<div class="ka-legend-item">
			<span class="ka-legend-dot" style="background:#f59e0b; border-radius: 2px;"></span>
			<span>✕ — Kreuzungspunkt (A2 passiert ihn zuerst)</span>
		</div>
	</div>
</div>

<style>
	.ka-wrapper {
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

	.ka-header { display: flex; flex-direction: column; gap: 0.25rem; }

	.ka-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
	}

	.ka-subtitle {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	.ka-svg-wrapper { width: 100%; overflow: hidden; border-radius: 0.5rem; }
	.ka-svg { width: 100%; height: auto; display: block; }

	/* ── Fortschritt ──────────────────────────────────────────── */
	.ka-progress-bar {
		height: 4px;
		background: #e2e8f0;
		border-radius: 2px;
		overflow: hidden;
	}
	.ka-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #7c3aed, #059669);
		border-radius: 2px;
		transition: width 0.05s linear;
	}

	/* ── Phasen-Label ─────────────────────────────────────────── */
	.ka-phase-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #1e3a5f;
		text-align: center;
		min-height: 1.2em;
		padding: 0.2rem 0.5rem;
		background: #f5f3ff;
		border-radius: 0.35rem;
	}

	/* ── Steuerung ────────────────────────────────────────────── */
	.ka-controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.ka-btn {
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
	.ka-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }

	.ka-btn-play {
		border-color: #7c3aed;
		color: #7c3aed;
		background: #f5f3ff;
	}
	.ka-btn-play:hover { background: #ede9fe; }

	/* ── Legende ──────────────────────────────────────────────── */
	.ka-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.2rem;
	}

	.ka-legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: #475569;
	}

	.ka-legend-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	@media (max-width: 600px) {
		.ka-wrapper { padding: 1rem; }
		.ka-legend { flex-direction: column; gap: 0.35rem; }
	}
</style>
