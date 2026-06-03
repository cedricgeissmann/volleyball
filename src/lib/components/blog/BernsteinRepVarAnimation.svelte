<script>
	/**
	 * "Wiederholung ohne Wiederholung" — Arm-Swing-Animation
	 *
	 * Zeigt einen Angriffsschlag-Arm der sich mehrfach wiederholt.
	 * Die Gelenk-Trajektorien (Schulter, Ellbogen, Handgelenk) variieren
	 * bei jedem Schlag — der Treffpunkt (Hand am Ball) bleibt immer gleich.
	 *
	 * Outcome-Variabilität: minimal (Treffpunkt fixiert)
	 * Ausführungs-Variabilität: hoch (Gelenk-Wege unterschiedlich)
	 */

	import { _ } from 'svelte-i18n';
	import { onDestroy } from 'svelte';

	// ─── SVG ───────────────────────────────────────────────────────────────────
	const W = 500;
	const H = 320;

	// Körper-Ankerpunkt (Schulter-Basis, fix)
	// Die Schulter selbst kann leicht variieren (Schultergürtel-Rotation)
	const SHOULDER_BASE_X = 195;
	const SHOULDER_BASE_Y = 130;

	// Segment-Längen (proportional zum Torso ~70px)
	const L_UPPER = 55;  // Oberarm
	const L_LOWER = 48;  // Unterarm
	// Hand/Finger: kurzes Endstück vom Handgelenk zum Kontaktpunkt
	const L_HAND  = 14;

	// Treffpunkt (Kontakt von Handfläche/Fingern — immer gleich)
	const HIT_X = 345;
	const HIT_Y = 72;

	// Farben der einzelnen Schläge
	const SWING_COLORS = [
		'#1d4ed8',
		'#7c3aed',
		'#059669',
		'#d97706',
		'#dc2626',
		'#0891b2',
	];

	const N_SWINGS = SWING_COLORS.length;

	// ─── Variantendefinition ───────────────────────────────────────────────────
	// Jeder Schlag hat leicht andere Ellbogen-Koordinate auf dem Weg zum Ziel.
	// Schulter ist fix. Handgelenk/Hand landet immer am HIT_X/HIT_Y.
	// Die Varianz liegt im Ellbogen-Bogen: mehr/weniger Beugung, leicht anderes
	// Timing der Streckung — modelliert durch unterschiedliche Zwischen-Positionen
	// des Ellbogens entlang der Schwingbahn.

	/** @param {number} seed */
	function seededRand(seed) {
		let s = seed;
		return () => {
			s = (s * 16807) % 2147483647;
			return (s - 1) / 2147483646;
		};
	}

	/**
	 * Berechnet für einen gegebenen t-Wert [0..1] die Armposition.
	 * t=0: Ausholposition, t=1: Treffpunkt
	 *
	 * Varianz liegt auf DREI Gelenken:
	 *   - Schulter: leichte Verschiebung (Schultergürtel-Rotation, x/y)
	 *   - Ellbogen: Bogen-Abweichung senkrecht zur Oberarm-Achse + Timing
	 *   - Handgelenk: leichte Abweichung vom "idealen" Winkel, sodass
	 *     die HAND (L_HAND weiter) immer am Treffpunkt landet,
	 *     aber das Handgelenk selbst variiert.
	 *
	 * @param {number} t Fortschritt [0..1]
	 * @param {number} shoulderVarX Schulter-Offset X [-1..1]
	 * @param {number} shoulderVarY Schulter-Offset Y [-1..1]
	 * @param {number} elbowVar     Ellbogen senkrecht zur Oberarm-Achse [-1..1]
	 * @param {number} timingShift  Timing-Versatz Ellbogen [-0.2..0.2]
	 * @param {number} wristVar     Handgelenk-Winkelversatz [-1..1]
	 */
	function computeArm(t, shoulderVarX, shoulderVarY, elbowVar, timingShift, wristVar) {
		const ease = t * t * (3 - 2 * t);

		// ── Schulter: leichte Verschiebung je nach Schultergürtel-Rotation ──
		// Amplitude ±7px in x, ±5px in y — verschwindet bei t=0 und t=1 (glatt)
		const sEnv = Math.sin(t * Math.PI);   // 0 → 1 → 0
		const shoulderX = SHOULDER_BASE_X + shoulderVarX * 7 * sEnv;
		const shoulderY = SHOULDER_BASE_Y + shoulderVarY * 5 * sEnv;

		// ── Oberarm-Winkel: Aushol → Kontakt ──
		const shoulderAngleStart = -60;   // Rad: nach hinten/oben
		const shoulderAngleEnd   = 30;    // Rad: nach vorne/oben
		const shoulderAngle = (shoulderAngleStart + (shoulderAngleEnd - shoulderAngleStart) * ease) * Math.PI / 180;

		// ── Ellbogen: senkrecht zur Oberarm-Achse verschoben ──
		// Modelliert unterschiedliche Streckungsbögen und seitliche Abweichungen
		const tElbow  = Math.max(0, Math.min(1, t + timingShift));
		const eElbow  = tElbow * tElbow * (3 - 2 * tElbow);
		// Perpendicular-Vektor zum Oberarm (90° gedreht)
		const perpX = -Math.sin(shoulderAngle);
		const perpY =  Math.cos(shoulderAngle);
		// Maximale Abweichung in der Mitte der Bewegung
		const elbowDeviation = elbowVar * 14 * Math.sin(t * Math.PI);

		const elbowX = shoulderX + L_UPPER * Math.cos(shoulderAngle) + perpX * elbowDeviation;
		const elbowY = shoulderY + L_UPPER * Math.sin(shoulderAngle) + perpY * elbowDeviation;

		// ── Unterarm + Handgelenk: zeigt grob zum Treffpunkt ──
		// Der "ideale" Unterarm-Winkel führt die Hand (L_HAND weiter) exakt zum HIT.
		// Das Handgelenk selbst weicht durch wristVar leicht ab.
		const dxHit = HIT_X - elbowX;
		const dyHit = HIT_Y - elbowY;
		// Winkel vom Ellbogen zum Treffpunkt (als wäre Arm gestreckt bis dort)
		const angleToHit = Math.atan2(dyHit, dxHit);
		// Nötige Länge Ellbogen→Treffpunkt
		const distToHit  = Math.sqrt(dxHit * dxHit + dyHit * dyHit);
		// Natürlicher Unterarm-Winkel: Ellbogen bleibt gebeugt, streckt sich erst spät
		const elbowBend  = 50 + eElbow * 120; // 50° → 170°
		const naturalFA  = shoulderAngle + (elbowBend * Math.PI / 180) - Math.PI;
		// Blend zu Ziel-Winkel (Hand muss treffen)
		const blend = Math.pow(ease, 1.2);
		// Ziel-Unterarm-Winkel: Handgelenk L_LOWER weiter, Hand L_HAND weiter → Treffpunkt
		// wristVar verschiebt das Handgelenk senkrecht — kompensiert durch Hand-Segment
		const wristDev     = wristVar * 9 * Math.sin(t * Math.PI); // ±9px senkrecht
		// Unterarm-Winkel zum Treffpunkt (Hand = Endstück L_HAND)
		// Vereinfachung: Unterarm zeigt so, dass Handgelenk + Handstück = Treffpunkt
		// → Wir verschieben das Handgelenk lateral und passen den Hand-Winkel an
		const forearmAngle = naturalFA * (1 - blend) + angleToHit * blend;

		const wristX = elbowX + L_LOWER * Math.cos(forearmAngle) + (-Math.sin(forearmAngle)) * wristDev;
		const wristY = elbowY + L_LOWER * Math.sin(forearmAngle) + ( Math.cos(forearmAngle)) * wristDev;

		// Hand-Endstück: vom Handgelenk zum fixierten Treffpunkt (bei t=1)
		// Für t < 1 zeigt die Hand in natürlicher Verlängerung des Unterarms
		const handAngleNatural = forearmAngle;
		const handAngleTarget  = Math.atan2(HIT_Y - wristY, HIT_X - wristX);
		const handBlend = Math.pow(ease, 0.8);
		const handAngle = handAngleNatural * (1 - handBlend) + handAngleTarget * handBlend;

		const handX = wristX + L_HAND * Math.cos(handAngle);
		const handY = wristY + L_HAND * Math.sin(handAngle);

		return { shoulderX, shoulderY, elbowX, elbowY, wristX, wristY, handX, handY };
	}

	// ─── Pfade berechnen ───────────────────────────────────────────────────────
	// Für jeden Schlag: N Punkte entlang der Schwingbahn, gespeichert als
	// {elbow, wrist} Arrays → daraus Pfad-Strings

	const N_STEPS = 60;

	/** @typedef {{ sx: number, sy: number, ex: number, ey: number, wx: number, wy: number, hx: number, hy: number }[]} ArmPath */

	// Varianz-Parameter je Schlag (deterministisch per seededRand)
	const swingParams = SWING_COLORS.map((_, idx) => {
		const rng = seededRand(idx * 97 + 31);
		return {
			shoulderVarX: (rng() - 0.5) * 2,   // -1..1 → Schulter X
			shoulderVarY: (rng() - 0.5) * 2,   // -1..1 → Schulter Y
			elbowVar:     (rng() - 0.5) * 2,   // -1..1 → Ellbogen-Abweichung
			timingShift:  (rng() - 0.5) * 0.35, // Timing
			wristVar:     (rng() - 0.5) * 2,   // -1..1 → Handgelenk-Abweichung
		};
	});

	/** @type {ArmPath[]} */
	const swingPaths = swingParams.map(({ shoulderVarX, shoulderVarY, elbowVar, timingShift, wristVar }) => {
		return Array.from({ length: N_STEPS + 1 }, (_, i) => {
			const t = i / N_STEPS;
			const { shoulderX, shoulderY, elbowX, elbowY, wristX, wristY, handX, handY } =
				computeArm(t, shoulderVarX, shoulderVarY, elbowVar, timingShift, wristVar);
			return { sx: shoulderX, sy: shoulderY, ex: elbowX, ey: elbowY, wx: wristX, wy: wristY, hx: handX, hy: handY };
		});
	});

	/**
	 * Erzeugt SVG-Pfad aus einem Array von Punkten.
	 * @param {number[]} xs
	 * @param {number[]} ys
	 */
	function pointsToPath(xs, ys) {
		return xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
	}

	// Trajektorien als Pfade (für die Nachspur-Darstellung)
	const elbowTracePaths = swingPaths.map(pts =>
		pointsToPath(pts.map(p => p.ex), pts.map(p => p.ey))
	);
	const wristTracePaths = swingPaths.map(pts =>
		pointsToPath(pts.map(p => p.wx), pts.map(p => p.wy))
	);
	const handTracePaths = swingPaths.map(pts =>
		pointsToPath(pts.map(p => p.hx), pts.map(p => p.hy))
	);

	// ─── Animationssteuerung ───────────────────────────────────────────────────
	// Ablauf: Schlag 1 animiert → kurz eingeblendet → Schlag 2 animiert → ...
	// Nach allen Schlägen: alle Trajektorien gleichzeitig sichtbar → Neustart

	const SWING_DURATION  = 700;  // ms pro Schlag-Animation
	const SHOW_DURATION   = 500;  // ms Pause nach einem Schlag
	const FINAL_PAUSE     = 2000; // ms alle sichtbar
	const PER_SWING = SWING_DURATION + SHOW_DURATION;
	const TOTAL = N_SWINGS * PER_SWING + FINAL_PAUSE;

	let elapsed  = $state(0);
	let rafId    = /** @type {number|null} */ (null);
	let lastTs   = 0;

	/** @param {number} ts */
	function frame(ts) {
		if (lastTs === 0) lastTs = ts;
		const dt = Math.min(ts - lastTs, 50); // max 50ms step (tab-wechsel schutz)
		lastTs = ts;
		elapsed = (elapsed + dt) % TOTAL;
		rafId = requestAnimationFrame(frame);
	}

	$effect(() => {
		rafId = requestAnimationFrame(frame);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = null;
			lastTs = 0;
		};
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	// Derived: welcher Schlag ist aktiv, wie weit
	let activeSwing = $derived(Math.min(Math.floor(elapsed / PER_SWING), N_SWINGS - 1));
	let swingPhase  = $derived(() => {
		const rem = elapsed % PER_SWING;
		return Math.min(rem / SWING_DURATION, 1);
	});
	let allVisible  = $derived(elapsed >= N_SWINGS * PER_SWING);

	// Aktuelle Arm-Position (für den animierten Arm)
	let currentArm = $derived(() => {
		const phase = swingPhase();
		if (allVisible) {
			// Zeige End-Position mit neutralen Parametern
			return computeArm(1, 0, 0, 0, 0, 0);
		}
		const p = swingParams[activeSwing];
		return computeArm(phase, p.shoulderVarX, p.shoulderVarY, p.elbowVar, p.timingShift, p.wristVar);
	});

	// Teilpfad für aktiven Schlag bis zum aktuellen phase-Wert
	let activeElbowPath = $derived(() => {
		if (allVisible) return '';
		const pts = swingPaths[activeSwing];
		const endIdx = Math.floor(swingPhase() * N_STEPS);
		const slice = pts.slice(0, endIdx + 1);
		if (slice.length < 2) return '';
		return pointsToPath(slice.map(p => p.ex), slice.map(p => p.ey));
	});
	let activeWristPath = $derived(() => {
		if (allVisible) return '';
		const pts = swingPaths[activeSwing];
		const endIdx = Math.floor(swingPhase() * N_STEPS);
		const slice = pts.slice(0, endIdx + 1);
		if (slice.length < 2) return '';
		return pointsToPath(slice.map(p => p.wx), slice.map(p => p.wy));
	});
	let activeHandPath = $derived(() => {
		if (allVisible) return '';
		const pts = swingPaths[activeSwing];
		const endIdx = Math.floor(swingPhase() * N_STEPS);
		const slice = pts.slice(0, endIdx + 1);
		if (slice.length < 2) return '';
		return pointsToPath(slice.map(p => p.hx), slice.map(p => p.hy));
	});

	// Ball-Position: folgt der Hand-Endposition
	let ballPos = $derived(() => {
		const arm = currentArm();
		return { x: arm.handX, y: arm.handY };
	});

	// Treffpunkt-Puls: kurz aufleuchten wenn phase ≈ 1
	let hitPulse = $derived(() => {
		if (allVisible) return 0;
		const p = swingPhase();
		if (p > 0.88) return (p - 0.88) / 0.12;
		return 0;
	});
</script>

<div class="rv-wrapper">
	<svg
		viewBox="0 0 {W} {H}"
		class="rv-svg"
		role="img"
		aria-label="Wiederholung ohne Wiederholung"
	>
		<defs>
			<!-- Glow-Filter für Treffpunkt -->
			<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="4" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<!-- Hintergrund -->
		<rect width={W} height={H} fill="#f8fafc" rx="12" />

		<!-- ── Torso + Kopf (statisch, basierend auf SHOULDER_BASE) ───────── -->
		<!-- Rumpf -->
		<line
			x1={SHOULDER_BASE_X} y1={SHOULDER_BASE_Y}
			x2={SHOULDER_BASE_X - 10} y2={SHOULDER_BASE_Y + 70}
			stroke="#334155" stroke-width="4" stroke-linecap="round"
		/>
		<!-- Hüfte -->
		<line
			x1={SHOULDER_BASE_X - 16} y1={SHOULDER_BASE_Y + 70}
			x2={SHOULDER_BASE_X + 4} y2={SHOULDER_BASE_Y + 70}
			stroke="#334155" stroke-width="4" stroke-linecap="round"
		/>
		<!-- Linker Arm (Gleichgewichtsarm, statisch leicht nach vorne) -->
		<line
			x1={SHOULDER_BASE_X - 6} y1={SHOULDER_BASE_Y + 5}
			x2={SHOULDER_BASE_X - 38} y2={SHOULDER_BASE_Y + 45}
			stroke="#475569" stroke-width="3" stroke-linecap="round" opacity="0.5"
		/>
		<!-- Linker Unterarm -->
		<line
			x1={SHOULDER_BASE_X - 38} y1={SHOULDER_BASE_Y + 45}
			x2={SHOULDER_BASE_X - 50} y2={SHOULDER_BASE_Y + 30}
			stroke="#475569" stroke-width="2.5" stroke-linecap="round" opacity="0.5"
		/>
		<!-- Beine -->
		<line
			x1={SHOULDER_BASE_X - 16} y1={SHOULDER_BASE_Y + 70}
			x2={SHOULDER_BASE_X - 22} y2={SHOULDER_BASE_Y + 140}
			stroke="#334155" stroke-width="3.5" stroke-linecap="round"
		/>
		<line
			x1={SHOULDER_BASE_X + 4} y1={SHOULDER_BASE_Y + 70}
			x2={SHOULDER_BASE_X + 10} y2={SHOULDER_BASE_Y + 140}
			stroke="#334155" stroke-width="3.5" stroke-linecap="round"
		/>
		<!-- Kopf -->
		<circle cx={SHOULDER_BASE_X - 2} cy={SHOULDER_BASE_Y - 22} r="18"
			fill="none" stroke="#334155" stroke-width="3"
		/>

		<!-- ── Fertige Trajektorien (Schulter + Ellbogen + Handgelenk-Spur) ── -->
		{#each SWING_COLORS as color, i}
			{#if i < activeSwing || allVisible}
				<!-- Ellbogen-Spur (gestrichelt) -->
				<path
					d={elbowTracePaths[i]}
					fill="none"
					stroke={color}
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity={allVisible ? 0.4 : 0.3}
					stroke-dasharray="4,3"
				/>
				<!-- Handgelenk-Spur -->
				<path
					d={wristTracePaths[i]}
					fill="none"
					stroke={color}
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity={allVisible ? 0.5 : 0.4}
					stroke-dasharray="2,2"
				/>
				<!-- Hand-Spur (durchgezogen, am deutlichsten) -->
				<path
					d={handTracePaths[i]}
					fill="none"
					stroke={color}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					opacity={allVisible ? 0.6 : 0.5}
				/>
				<!-- Endpunkt-Kreis (Treffpunkt des jeweiligen Schlags) -->
				{@const lastPt = swingPaths[i][N_STEPS]}
				<circle cx={lastPt.hx} cy={lastPt.hy} r="4"
					fill={color} opacity={allVisible ? 0.7 : 0.55}
				/>
			{/if}
		{/each}

		<!-- ── Aktive Trajektorie (wird gerade gezeichnet) ─────────────────── -->
		{#if !allVisible}
			<!-- Elbow-Spur (gestrichelt) -->
			{#if activeElbowPath()}
				<path
					d={activeElbowPath()}
					fill="none"
					stroke={SWING_COLORS[activeSwing]}
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-dasharray="4,3"
					opacity="0.6"
				/>
			{/if}
			<!-- Wrist-Spur (fein gestrichelt) -->
			{#if activeWristPath()}
				<path
					d={activeWristPath()}
					fill="none"
					stroke={SWING_COLORS[activeSwing]}
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray="2,2"
					opacity="0.7"
				/>
			{/if}
			<!-- Hand-Spur (durchgezogen) -->
			{#if activeHandPath()}
				<path
					d={activeHandPath()}
					fill="none"
					stroke={SWING_COLORS[activeSwing]}
					stroke-width="2.5"
					stroke-linecap="round"
					opacity="0.9"
				/>
			{/if}

			<!-- Arm-Linien (aktuell) -->
			{@const arm = currentArm()}
			<!-- Oberarm: Schulter → Ellbogen -->
			<line
				x1={arm.shoulderX} y1={arm.shoulderY}
				x2={arm.elbowX} y2={arm.elbowY}
				stroke={SWING_COLORS[activeSwing]}
				stroke-width="4.5"
				stroke-linecap="round"
				opacity="0.9"
			/>
			<!-- Unterarm: Ellbogen → Handgelenk -->
			<line
				x1={arm.elbowX} y1={arm.elbowY}
				x2={arm.wristX} y2={arm.wristY}
				stroke={SWING_COLORS[activeSwing]}
				stroke-width="4"
				stroke-linecap="round"
				opacity="0.9"
			/>
			<!-- Hand-Segment: Handgelenk → Treffpunkt -->
			<line
				x1={arm.wristX} y1={arm.wristY}
				x2={arm.handX} y2={arm.handY}
				stroke={SWING_COLORS[activeSwing]}
				stroke-width="3"
				stroke-linecap="round"
				opacity="0.9"
			/>
			<!-- Gelenk-Punkte -->
			<circle cx={arm.elbowX} cy={arm.elbowY} r="4.5"
				fill={SWING_COLORS[activeSwing]} opacity="0.85"
			/>
			<circle cx={arm.wristX} cy={arm.wristY} r="3.5"
				fill={SWING_COLORS[activeSwing]} opacity="0.8"
			/>
			<!-- Schulter-Gelenk (bewegt sich leicht mit) -->
			<circle cx={arm.shoulderX} cy={arm.shoulderY} r="5.5"
				fill="#1e293b" opacity="0.75"
			/>
			<!-- Ball an der Hand -->
			{@const ball = ballPos()}
			<circle cx={ball.x} cy={ball.y} r="11"
				fill="white"
				stroke={SWING_COLORS[activeSwing]}
				stroke-width="2"
				opacity="0.95"
			/>
			<!-- Volleyball-Linien -->
			<path
				d="M {ball.x - 7} {ball.y} Q {ball.x} {ball.y - 4} {ball.x + 7} {ball.y}"
				fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.7"
			/>
			<path
				d="M {ball.x} {ball.y - 7} Q {ball.x + 4} {ball.y} {ball.x} {ball.y + 7}"
				fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.5"
			/>
		{/if}

		<!-- ── Schulter-Basis-Label (fix, immer sichtbar) ───────────────────── -->
		<circle cx={SHOULDER_BASE_X} cy={SHOULDER_BASE_Y} r="4"
			fill="#1e293b" opacity="0.3"
		/>
		<text x={SHOULDER_BASE_X - 14} y={SHOULDER_BASE_Y - 8}
			font-size="9" font-family="sans-serif" fill="#64748b" opacity="0.55"
		>Schulter</text>

		<!-- ── Treffpunkt (fix, immer sichtbar) ────────────────────────────── -->
		<!-- Fadenkreuz -->
		<line x1={HIT_X - 16} y1={HIT_Y} x2={HIT_X + 16} y2={HIT_Y}
			stroke="#1e293b" stroke-width="1.5" opacity="0.4"
		/>
		<line x1={HIT_X} y1={HIT_Y - 16} x2={HIT_X} y2={HIT_Y + 16}
			stroke="#1e293b" stroke-width="1.5" opacity="0.4"
		/>
		<!-- Treffpunkt-Kreis (pulsiert beim Aufschlag) -->
		<circle cx={HIT_X} cy={HIT_Y} r={10 + hitPulse() * 8}
			fill="none"
			stroke="#1e293b"
			stroke-width={hitPulse() > 0 ? 2.5 : 1.5}
			opacity={0.25 + hitPulse() * 0.5}
			filter={hitPulse() > 0.3 ? 'url(#glow)' : ''}
		/>
		<circle cx={HIT_X} cy={HIT_Y} r="5"
			fill="#1e293b"
			opacity={0.5 + hitPulse() * 0.4}
		/>
		<!-- Label -->
		<text x={HIT_X + 18} y={HIT_Y + 4}
			font-size="10" font-family="sans-serif"
			fill="#1e293b" font-weight="600" opacity="0.65"
		>Treffpunkt</text>

		<!-- ── Schlag-Zähler ────────────────────────────────────────────────── -->
		{#if !allVisible}
			<text x={W - 16} y="22"
				text-anchor="end"
				font-size="11" font-family="monospace" font-weight="700"
				fill="#64748b"
			>{activeSwing + 1} / {N_SWINGS}</text>
		{:else}
			<text x={W / 2} y="22"
				text-anchor="middle"
				font-size="11" font-family="sans-serif" font-weight="600"
				fill="#1d4ed8" opacity="0.8"
			>{N_SWINGS} verschiedene Wege — ein Treffpunkt</text>
		{/if}
	</svg>

	<p class="rv-caption">{$_('bernstein_repvar_caption')}</p>
</div>

<style>
	.rv-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin: 2rem 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	.rv-svg {
		width: 100%;
		display: block;
		max-height: 320px;
	}

	.rv-caption {
		font-size: 0.78rem;
		color: #94a3b8;
		text-align: center;
		margin: 0.5rem 0 0;
	}
</style>
