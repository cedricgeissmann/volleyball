<script lang="ts">
	/**
	 * StackAttack — Animierte Draufsicht: Stackangriff (Hintereinanderangriff)
	 *
	 * Koordinatensystem (Draufsicht, angreifende Seite):
	 *   x: 0 = linke Seitenlinie, 9m = rechte Seitenlinie
	 *   y: 0 = Netz (oben im SVG), 9m = Grundlinie (unten)
	 *
	 * Stackangriff:
	 *   A1 und A2 starten gleichzeitig hintereinander in Zone 4/5 (links, x≈4.2/3.2).
	 *   Setter: x=6.2, identisch mit Treppe und Kreuz.
	 *   A1 (vorne) läuft geradeaus auf seinen Absprungpunkt nahe dem Setter (x≈4.2).
	 *   A2 (hinten) folgt zunächst hinter A1, weicht dann zufällig ab:
	 *     - links  → Absprung aussen links (x≈3.2), wie Treppe/Kreuz
	 *     - rechts → Absprung mitte-rechts  (x≈5.2), wie Kreuz
	 *   Ball und Abbiegeseite werden jedes Mal neu gewürfelt.
	 *
	 * Animation-Phasen:
	 *   0.00–0.22  Ball fliegt von hinten zum Setter
	 *   0.05–0.42  A1 läuft geradeaus zum Absprungpunkt (x=4.2)
	 *   0.05–0.50  A2 läuft hinter A1, biegt dann links/rechts ab
	 *   0.25       Setter spielt den Ball
	 *   0.44       A1 springt (immer zuerst)
	 *   0.55       A2 springt kurz danach
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

	// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
	function lerp(a: number, b: number, tNorm: number): number {
		return a + (b - a) * Math.max(0, Math.min(1, tNorm));
	}

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

	// ─── Setter — identisch mit Treppe & Kreuz ───────────────────────────────────
	const SETTER_START  = { x: 6.2, y: 3.0 };
	const SETTER_TARGET = { x: 6.2, y: 0.9 };

	// ─── Angreifer-Startpositionen (gleiche Zone wie Treppe/Kreuz) ───────────────
	// Beide starten hintereinander in x≈4.2 (Zone 4/Mitte-links nahe Setter)
	const A1_START = { x: 4.2, y: 3.4 };  // vorne — wie Treppe A1
	const A2_START = { x: 4.2, y: 4.8 };  // hinten — direkt hinter A1

	// A1 Absprungpunkt: immer nahe Setter (kurzer Schnellangriff) — wie Treppe A1
	const A1_TARGET = { x: 4.2, y: 0.5 };

	// A2 Absprungpunkte je nach Abbiegeseite:
	//   links  → wie Treppe A2 / Kreuz A2-Ziel  (x=3.2, Aussenposition links)
	//   rechts → wie Kreuz A1-Ziel              (x=5.2, Mitte-rechts)
	const A2_TARGET_LEFT  = { x: 3.2, y: 0.6 };
	const A2_TARGET_RIGHT = { x: 5.2, y: 0.6 };

	// Ball-Kontrollpunkte (über Netz), orientiert an Treppe/Kreuz
	const BALL_TO_A1_CP       = { x: 5.5, y: -0.6 };  // wie Treppe
	const BALL_TO_A2_LEFT_CP  = { x: 2.0, y: -0.8 };  // wie Treppe A2
	const BALL_TO_A2_RIGHT_CP = { x: 5.8, y: -0.7 };  // wie Kreuz A1

	// ─── Zufällige Parameter (neu bei jedem Zyklus) ───────────────────────────────
	// a2side:       'left' = A2 biegt links ab, 'right' = rechts
	// targetPlayer: 1 = A1 bekommt Ball, 2 = A2
	function randomParams(): { a2side: 'left'|'right'; targetPlayer: 1|2 } {
		return {
			a2side:       Math.random() < 0.5 ? 'left' : 'right',
			targetPlayer: Math.random() < 0.5 ? 1 : 2,
		};
	}

	// ─── Svelte-Zustand ───────────────────────────────────────────────────────────
	let t         = $state(0);
	let running   = $state(false);
	let rafId     = $state(0);
	let startTime = $state(0);

	let params = $state(randomParams());

	// ─── Positionen (reaktiv auf params.a2side) ──────────────────────────────────
	// Startpositionen sind fix — gleiche Zone wie Treppe und Kreuz
	// Nur A2-Absprungpunkt variiert je nach Abbiegeseite
	let positions = $derived.by(() => {
		const a2Target = params.a2side === 'left' ? A2_TARGET_LEFT : A2_TARGET_RIGHT;
		const ballToA2CP = params.a2side === 'left' ? BALL_TO_A2_LEFT_CP : BALL_TO_A2_RIGHT_CP;
		return {
			a1StartX: A1_START.x,   a1StartY: A1_START.y,
			a1TargetX: A1_TARGET.x, a1TargetY: A1_TARGET.y,
			a2StartX: A2_START.x,   a2StartY: A2_START.y,
			a2TargetX: a2Target.x,  a2TargetY: a2Target.y,
			ballToA1CP: BALL_TO_A1_CP,
			ballToA2CP,
		};
	});

	// ─── Animation-Timing ────────────────────────────────────────────────────────
	const ANIM_DURATION = 3400;

	const T_BALL_TO_SET_START = 0.00;
	const T_BALL_TO_SET_END   = 0.22;
	const T_A1_MOVE_START = 0.05;
	const T_A1_MOVE_END   = 0.42;
	const T_A2_MOVE_START = 0.05;   // gleichzeitiger Start mit A1
	const T_A2_MOVE_END   = 0.50;
	const T_SET           = 0.25;
	const T_BALL_END      = 0.46;
	const T_JUMP_A1       = 0.44;   // A1 springt immer zuerst
	const T_JUMP_A2       = 0.55;   // A2 springt danach
	const JUMP_DURATION   = 0.14;
	const JUMP_HEIGHT_PX  = 18;

	const T_SETTER_MOVE_START = 0.00;
	const T_SETTER_MOVE_END   = 0.20;

	// ─── Setter-Position ─────────────────────────────────────────────────────────
	let setterPos = $derived.by(() => {
		const pt = easeOut(phaseT(T_SETTER_MOVE_START, T_SETTER_MOVE_END, t));
		return {
			x: fx(lerp(SETTER_START.x, SETTER_TARGET.x, pt)),
			y: fy(lerp(SETTER_START.y, SETTER_TARGET.y, pt)),
		};
	});

	// ─── A1-Position ─────────────────────────────────────────────────────────────
	// A1 läuft geradeaus (leicht gebogener Bezier) zum Absprungpunkt
	let a1Pos = $derived.by(() => {
		const { a1StartX, a1StartY, a1TargetX, a1TargetY } = positions;
		// Kontrollpunkt: leicht zur Feldmitte hin gebogen
		const cpX = a1StartX + (4.5 - a1StartX) * 0.15;
		const cpY = (a1StartY + a1TargetY) / 2;
		const pt = easeOut(phaseT(T_A1_MOVE_START, T_A1_MOVE_END, t));
		const pos = bezier2(fx(a1StartX), fy(a1StartY), fx(cpX), fy(cpY), fx(a1TargetX), fy(a1TargetY), pt);
		const jumping = t >= T_JUMP_A1 && t < T_JUMP_A1 + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(T_JUMP_A1, T_JUMP_A1 + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping };
	});

	// ─── A2-Position ─────────────────────────────────────────────────────────────
	// A2 läuft zunächst hinter A1 her, biegt dann zur Seite ab.
	// Wir modellieren das als 2-Segment-Pfad: gerade Phase → Abbiegephase.
	// Umsetzung: Bezier von Start zu Ziel, aber mit einem starken seitlichen CP.
	let a2Pos = $derived.by(() => {
		const { a2StartX, a2StartY, a1TargetX, a2TargetX, a2TargetY } = positions;

		const pt = easeOut(phaseT(T_A2_MOVE_START, T_A2_MOVE_END, t));

		// A2 läuft die erste Hälfte gerade (hinter A1), dann biegt er seitwärts ab.
		// Wir splitten den Weg in zwei Abschnitte:
		//   Phase 1 (pt 0→0.5): von Start direkt nach vorne (gleiche x wie A1)
		//   Phase 2 (pt 0.5→1): von der Zwischenposition seitlich zum Ziel
		const midX = a1TargetX;
		const midY = a2StartY * 0.4 + a2TargetY * 0.6; // ca. auf Höhe 3m-Linie

		let pos: { x: number; y: number };
		if (pt <= 0.5) {
			const t2 = pt / 0.5;
			const cpX = a2StartX;
			const cpY = (a2StartY + midY) / 2;
			pos = bezier2(fx(a2StartX), fy(a2StartY), fx(cpX), fy(cpY), fx(midX), fy(midY), t2);
		} else {
			const t2 = (pt - 0.5) / 0.5;
			// Kontrollpunkt: biegt seitlich aus — zwischen midX und a2TargetX, nah am Netz
			const cpX = (midX + a2TargetX) / 2;
			const cpY = midY * 0.3 + a2TargetY * 0.7;
			pos = bezier2(fx(midX), fy(midY), fx(cpX), fy(cpY), fx(a2TargetX), fy(a2TargetY), t2);
		}

		const jumping = t >= T_JUMP_A2 && t < T_JUMP_A2 + JUMP_DURATION;
		const jumpOff = jumping ? -JUMP_HEIGHT_PX * Math.sin(Math.PI * phaseT(T_JUMP_A2, T_JUMP_A2 + JUMP_DURATION, t)) : 0;
		return { x: pos.x, y: pos.y + jumpOff, jumping };
	});

	// ─── Ball-Position ────────────────────────────────────────────────────────────
	const BALL_FROM      = { x: 4.5, y: 7.5 };
	const BALL_TO_SET_CP = { x: 5.2, y: 4.0 };  // wie Treppe (Setter bei x=6.2)

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
		const bt = easeOut(phaseT(T_SET, T_BALL_END, t));
		const { a1TargetX, a1TargetY, a2TargetX, a2TargetY, ballToA1CP, ballToA2CP } = positions;
		const isA1 = params.targetPlayer === 1;
		const targetX = isA1 ? a1TargetX : a2TargetX;
		const targetY = isA1 ? a1TargetY : a2TargetY;
		const cp = isA1 ? ballToA1CP : ballToA2CP;
		const pos = bezier2(setterPos.x, setterPos.y, fx(cp.x), fy(cp.y), fx(targetX), fy(targetY), bt);
		return { x: pos.x, y: pos.y, visible: true };
	});

	// ─── Spur-Pfade (statisch, reaktiv auf params) ────────────────────────────────
	let trailPaths = $derived.by(() => {
		const { a1StartX, a1StartY, a1TargetX, a1TargetY,
		        a2StartX, a2StartY, a2TargetX, a2TargetY } = positions;

		const a1CpX = a1StartX + (4.5 - a1StartX) * 0.15;
		const a1CpY = (a1StartY + a1TargetY) / 2;
		const a1Path = `M ${fx(a1StartX).toFixed(1)} ${fy(a1StartY).toFixed(1)} Q ${fx(a1CpX).toFixed(1)} ${fy(a1CpY).toFixed(1)} ${fx(a1TargetX).toFixed(1)} ${fy(a1TargetY).toFixed(1)}`;

		// A2-Spur: zwei Segmente (gerade + Abbiegung)
		const midX = a1TargetX;
		const midY = a2StartY * 0.4 + a2TargetY * 0.6;
		const cp1X = a2StartX;
		const cp1Y = (a2StartY + midY) / 2;
		const cp2X = (midX + a2TargetX) / 2;
		const cp2Y = midY * 0.3 + a2TargetY * 0.7;
		const a2Path = `M ${fx(a2StartX).toFixed(1)} ${fy(a2StartY).toFixed(1)} Q ${fx(cp1X).toFixed(1)} ${fy(cp1Y).toFixed(1)} ${fx(midX).toFixed(1)} ${fy(midY).toFixed(1)} Q ${fx(cp2X).toFixed(1)} ${fy(cp2Y).toFixed(1)} ${fx(a2TargetX).toFixed(1)} ${fy(a2TargetY).toFixed(1)}`;

		return { a1Path, a2Path };
	});

	// ─── Phasen-Label ────────────────────────────────────────────────────────────
	let phaseLabel = $derived.by(() => {
		const target = params.targetPlayer === 1 ? 'A1' : 'A2';
		const decoy  = params.targetPlayer === 1 ? 'A2' : 'A1';
		const a2dir  = params.a2side === 'left' ? 'links' : 'rechts';
		if (t < T_BALL_TO_SET_END) return 'A1 & A2 starten hintereinander — Ball kommt von hinten';
		if (t < 0.30)              return 'A1 & A2 laufen gleichzeitig an — hintereinander';
		if (t < T_SET)             return `A2 biegt ${a2dir} ab — Stack entfaltet sich`;
		if (t < T_BALL_END)        return `Setter spielt zu ${target}!`;
		if (t < T_JUMP_A2)         return `A1 springt — A2 folgt kurz danach`;
		if (t < T_JUMP_A2 + JUMP_DURATION) return `${decoy} täuscht Sprung an — Block gebunden!`;
		return 'Angriff abgeschlossen';
	});

	// ─── Animation-Loop ───────────────────────────────────────────────────────────
	function tick(now: number) {
		if (!running) return;
		const elapsed = (now - startTime) / ANIM_DURATION;
		const newT = elapsed % 1;
		if (newT < t) {
			params = randomParams();
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
		params = randomParams();
	}

	$effect(() => {
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Statische Werte ─────────────────────────────────────────────────────────
	const SETTER_TRAIL = `M ${fx(SETTER_START.x).toFixed(1)} ${fy(SETTER_START.y).toFixed(1)} L ${fx(SETTER_TARGET.x).toFixed(1)} ${fy(SETTER_TARGET.y).toFixed(1)}`;
	const LINE_3M_Y = fy(3.0);

	let progressW = $derived(t * 100);
</script>

<div class="sa-wrapper">
	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="sa-header">
		<span class="sa-title">Stackangriff</span>
		<p class="sa-subtitle">
			A1 und A2 starten <strong>gleichzeitig hintereinander</strong> in Richtung Netz.
			A2 weicht kurz vor dem Absprung zufällig zur Seite ab und greift
			<strong>neben A1</strong> an. Stack-Seite und Zuspiel werden jedes Mal neu gewürfelt.
		</p>
	</div>

	<!-- ── SVG ────────────────────────────────────────────────────────────────── -->
	<div class="sa-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="sa-svg"
			role="img"
			aria-label="Animierter Stackangriff, Draufsicht"
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
			<!-- A1-Spur: blau -->
			<path d={trailPaths.a1Path}
				fill="none" stroke="#2563eb" stroke-width="2"
				stroke-dasharray="6,4" opacity="0.30" />
			<!-- Absprungpunkt A1 -->
			<circle cx={fx(positions.a1TargetX)} cy={fy(positions.a1TargetY)} r="5"
				fill="none" stroke="#2563eb" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />
			<text x={fx(positions.a1TargetX)} y={fy(positions.a1TargetY) + 14}
				text-anchor="middle" fill="#2563eb" font-size="8" font-family="sans-serif" opacity="0.55"
			>Absprung A1</text>

			<!-- A2-Spur: orange -->
			<path d={trailPaths.a2Path}
				fill="none" stroke="#d97706" stroke-width="2"
				stroke-dasharray="6,4" opacity="0.30" />
			<!-- Absprungpunkt A2 -->
			<circle cx={fx(positions.a2TargetX)} cy={fy(positions.a2TargetY)} r="5"
				fill="none" stroke="#d97706" stroke-width="1.5"
				stroke-dasharray="3,2" opacity="0.45" />
			<text x={fx(positions.a2TargetX)} y={fy(positions.a2TargetY) + 14}
				text-anchor="middle" fill="#d97706" font-size="8" font-family="sans-serif" opacity="0.55"
			>Absprung A2</text>

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

			<!-- ╔══ Angreifer A1 (vorne) ════════════════════════════════════════╗ -->
			<ellipse cx={a1Pos.x} cy={a1Pos.y + 4} rx="13" ry="4.5" fill="#475569" opacity="0.08" />
			<circle cx={a1Pos.x} cy={a1Pos.y} r="15"
				fill={a1Pos.jumping ? '#1d4ed8' : '#2563eb'}
				stroke={a1Pos.jumping ? '#93c5fd' : 'none'}
				stroke-width={a1Pos.jumping ? 2.5 : 0}
				opacity="0.95" />
			<text x={a1Pos.x} y={a1Pos.y + 4} text-anchor="middle"
				fill="white" font-size="9" font-family="sans-serif" font-weight="700">A1</text>
			{#if a1Pos.jumping}
				<text x={a1Pos.x} y={a1Pos.y - 20} text-anchor="middle"
					fill="#2563eb" font-size="10" font-family="sans-serif" font-weight="700" opacity="0.85">↑</text>
			{/if}

			<!-- ╔══ Angreifer A2 (hinten) ═══════════════════════════════════════╗ -->
			<ellipse cx={a2Pos.x} cy={a2Pos.y + 4} rx="13" ry="4.5" fill="#475569" opacity="0.08" />
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
	<div class="sa-progress-bar">
		<div class="sa-progress-fill" style="width: {progressW}%"></div>
	</div>

	<!-- ── Phasen-Label ───────────────────────────────────────────────────────── -->
	<div class="sa-phase-label">{phaseLabel}</div>

	<!-- ── Steuerung ─────────────────────────────────────────────────────────── -->
	<div class="sa-controls">
		<button class="sa-btn sa-btn-play" onclick={togglePlay}>
			{running ? '⏸ Pause' : '▶ Play'}
		</button>
		<button class="sa-btn sa-btn-reset" onclick={reset}>
			↺ Reset
		</button>
	</div>

	<!-- ── Legende ────────────────────────────────────────────────────────────── -->
	<div class="sa-legend">
		<div class="sa-legend-item">
			<span class="sa-legend-dot" style="background:#0f172a"></span>
			<span>S — Setter (Mitte)</span>
		</div>
		<div class="sa-legend-item">
			<span class="sa-legend-dot" style="background:#2563eb"></span>
			<span>A1 — vorderer Angreifer (springt zuerst)</span>
		</div>
		<div class="sa-legend-item">
			<span class="sa-legend-dot" style="background:#d97706"></span>
			<span>A2 — hinterer Angreifer (biegt seitlich ab)</span>
		</div>
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
		gap: 0.9rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	.sa-header { display: flex; flex-direction: column; gap: 0.25rem; }

	.sa-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
	}

	.sa-subtitle {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	.sa-svg-wrapper { width: 100%; overflow: hidden; border-radius: 0.5rem; }
	.sa-svg { width: 100%; height: auto; display: block; }

	/* ── Fortschritt ──────────────────────────────────────────── */
	.sa-progress-bar {
		height: 4px;
		background: #e2e8f0;
		border-radius: 2px;
		overflow: hidden;
	}
	.sa-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #2563eb, #d97706);
		border-radius: 2px;
		transition: width 0.05s linear;
	}

	/* ── Phasen-Label ─────────────────────────────────────────── */
	.sa-phase-label {
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
	.sa-controls {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.sa-btn {
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
	.sa-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }

	.sa-btn-play {
		border-color: #2563eb;
		color: #2563eb;
		background: #eff6ff;
	}
	.sa-btn-play:hover { background: #dbeafe; }

	/* ── Legende ──────────────────────────────────────────────── */
	.sa-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem 1.2rem;
	}

	.sa-legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: #475569;
	}

	.sa-legend-dot {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	@media (max-width: 600px) {
		.sa-wrapper { padding: 1rem; }
		.sa-legend { flex-direction: column; gap: 0.35rem; }
	}
</style>
