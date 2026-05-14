<script>
// @ts-nocheck
/**
 * HandVelocityAnimation.svelte
 *
 * Vollständig kinematisches Arm-Modell mit Hüftgelenk.
 *
 * Gelenk-Kette (Seitenriss, Figur läuft nach rechts):
 *
 *   Hüfte → Torso(torsoAngle) → Schulter → Oberarm(uaAngle) → Ellbogen → Unterarm(laAngle) → Hand
 *
 * Koordinaten: Canvas-Standard — 0° = nach rechts, positive Winkel = Uhrzeigersinn (nach unten)
 *
 * ── Startposition ──────────────────────────────────────────────────────────────
 *   Torso:    senkrecht  → torsoAngle =  -π/2  (zeigt nach oben)
 *   Oberarm:  nach links → uaAngle    =   π    (Ellbogen hinter dem Kopf)
 *   Unterarm: nach unten → laAngle    =  +π/2  → elOffset = laAngle - uaAngle = -π/2
 *
 * ── Bewegung (alle im Uhrzeigersinn = Winkel wächst) ───────────────────────────
 *   Hüfte:    torsoAngle dreht von -π/2 → 0  (Torso kippt nach vorne)
 *   Schulter: uaAngle    dreht von  π   → ca. -0.3  (Arm von hinten nach vorne-oben)
 *   Ellbogen: elOffset   dreht von -π/2 → 0         (Unterarm streckt sich, verzögert)
 *
 * ── Slider (Winkelgeschwindigkeiten, rad/s) ────────────────────────────────────
 *   ωHip:  Hüft-Rotation      (rad/s) → bestimmt Torso-Kipp-Amplitude
 *   ωSh:   Schulter-Schwung   (rad/s) → bestimmt Oberarm-Schwung-Amplitude
 *   ωEl:   Ellbogen-Peitsche  (rad/s) → bestimmt Unterarm-Peitsch-Amplitude
 *
 *   Δangle = ω × Phasendauer  →  End-Winkel = Start-Winkel + Δangle
 *   (Uhrzeigersinn → positiv → Winkel wächst)
 *
 * ── Handgeschwindigkeit ────────────────────────────────────────────────────────
 *   vHand_x = Δhand.x / Δt  (numerische Ableitung, m/s)
 */

import { onMount } from 'svelte';

// ─── Skalierung ───────────────────────────────────────────────────────────────
const PX_PER_M = 80;
const FPS      = 60;
const DT       = 1 / FPS;

// ─── Canvas ───────────────────────────────────────────────────────────────────
const W        = 680;
const H        = 340;
const GROUND_Y = H - 40;

// ─── Körper-Geometrie (Pixel) ────────────────────────────────────────────────
const TORSO_LEN = Math.round(0.55 * PX_PER_M);  // 55 cm Torso
const UA_LEN    = Math.round(0.30 * PX_PER_M);  // 30 cm Oberarm
const LA_LEN    = Math.round(0.28 * PX_PER_M);  // 28 cm Unterarm

// ─── Hüfte-Y (fest am Boden verankert, Figur "steht") ────────────────────────
// Hüfte sitzt 0.95 m über Boden
const HIP_Y0 = GROUND_Y - Math.round(0.95 * PX_PER_M);

// ─── Startwinkel ─────────────────────────────────────────────────────────────
// torsoAngle:  Torso-Richtung (von Hüfte zur Schulter)
//   -π/2 = senkrecht nach oben (aufrechte Haltung)
const TORSO_ANGLE_START = -Math.PI / 2;

// uaAngle: Oberarm-Richtung (von Schulter zum Ellbogen)
//   π = nach links → Ellbogen liegt hinter dem Kopf
const UA_ANGLE_START = Math.PI;

// elOffset: Unterarm-Winkel relativ zum Oberarm
//   Unterarm zeigt nach unten (+π/2 absolut) bei Oberarm auf π:
//   elOffset = π/2 - π = -π/2
const EL_OFFSET_START = -Math.PI / 2;

// ─── Timing (Sekunden) ────────────────────────────────────────────────────────
const HIP_START = 0.00;  const HIP_END = 0.45;   // Hüft-Rotation
const SH_START  = 0.08;  const SH_END  = 0.52;   // Schulter-Schwung
const EL_START  = 0.22;  const EL_END  = 0.60;   // Ellbogen-Peitsche (verzögert)
const SIM_TOTAL = 0.90;

// ─── Easing ───────────────────────────────────────────────────────────────────
// smoothstep: beschleunigt UND bremst ab (S-Kurve, 0→1)
function smoothstep(x) {
	const t = Math.max(0, Math.min(1, x));
	return t * t * (3 - 2 * t);
}
function phase(t, start, end) {
	return smoothstep((t - start) / (end - start));
}

// ─── Kinematik: Winkel als Funktion von t und Winkelgeschwindigkeiten ─────────
//
// ω ist die SPITZEN-Winkelgeschwindigkeit (Grad/s → intern rad/s).
// Die smoothstep-Kurve hat einen Peak in der Mitte der Phase.
// Die Ableitung von smoothstep hat ihr Maximum bei x=0.5 mit Wert 1.5/Dauer.
// Daher: Δangle (Gesamtdrehung) = ω_peak × Dauer × (2/3)
//   → wer ω_peak vorgibt, bekommt genau diese Spitzengeschwindigkeit in der Mitte.
//
// Umrechnung: ωDeg [°/s] → ωRad [rad/s] = ωDeg × π/180
//
function peakToTotal(omegaRad, duration) {
	// Integral von smoothstep' über [0,1] = 1 (per Definition).
	// Spitzenwert der Ableitung (bei x=0.5) = 1.5.
	// Also: Δangle = omegaRad / 1.5 × duration
	return omegaRad / 1.5 * duration;
}

const DEG = Math.PI / 180;  // Hilfskonstante: 1° in Radiant

function torsoAngle(t, wHipDeg) {
	const delta = peakToTotal(wHipDeg * DEG, HIP_END - HIP_START);
	return TORSO_ANGLE_START + delta * phase(t, HIP_START, HIP_END);
}

function uaAngle(t, wShDeg) {
	const delta = peakToTotal(wShDeg * DEG, SH_END - SH_START);
	return UA_ANGLE_START + delta * phase(t, SH_START, SH_END);
}

function elOffset(t, wElDeg) {
	const delta = peakToTotal(wElDeg * DEG, EL_END - EL_START);
	return EL_OFFSET_START + delta * phase(t, EL_START, EL_END);
}

// ─── Arm-Weltpositionen berechnen ─────────────────────────────────────────────
// Gibt { hipPos, shPos, elPos, handPos, tA, uaA, laA } zurück
function computeArm(t, hipX, wHip, wSh, wEl) {
	const tA = torsoAngle(t, wHip);
	const uaA = uaAngle(t, wSh);
	const laA = uaA + elOffset(t, wEl);

	const hipPos = { x: hipX, y: HIP_Y0 };

	// Schulter = Hüfte + Torso-Vektor
	const shPos = {
		x: hipX   + Math.cos(tA) * TORSO_LEN,
		y: HIP_Y0 + Math.sin(tA) * TORSO_LEN
	};

	// Ellbogen = Schulter + Oberarm-Vektor
	const elPos = {
		x: shPos.x + Math.cos(uaA) * UA_LEN,
		y: shPos.y + Math.sin(uaA) * UA_LEN
	};

	// Hand = Ellbogen + Unterarm-Vektor
	const handPos = {
		x: elPos.x + Math.cos(laA) * LA_LEN,
		y: elPos.y + Math.sin(laA) * LA_LEN
	};

	return { hipPos, shPos, elPos, handPos, tA, uaA, laA };
}

// ─── Slider-Defaults (Winkelgeschwindigkeiten, Grad/s) ───────────────────────
// Hüfte:    ~230 °/s  ≈ 4 rad/s
// Schulter: ~570 °/s  ≈ 10 rad/s
// Ellbogen: ~800 °/s  ≈ 14 rad/s (schneller → Peitscheneffekt)
const W_HIP_DEF = 230;
const W_SH_DEF  = 570;
const W_EL_DEF  = 800;
const V_RUN_DEF = 3.0;

let wHip = $state(W_HIP_DEF);  // °/s
let wSh  = $state(W_SH_DEF);   // °/s
let wEl  = $state(W_EL_DEF);   // °/s
let vRun = $state(V_RUN_DEF);  // m/s

// ─── Simulations-Zustand ──────────────────────────────────────────────────────
let vHandX    = $state(0);
let vHandXMax = $state(0);
let simTime   = $state(0);
let history   = $state([]);

// ─── Frame-Scrubber ───────────────────────────────────────────────────────────
let frames      = $state([]);
let scrubFrame  = $state(0);
let scrubActive = $state(false);

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlayCanvas;

// ─── Simulation berechnen ─────────────────────────────────────────────────────
function startSim() {
	frames      = [];
	history     = [];
	vHandX      = 0;
	vHandXMax   = 0;
	simTime     = 0;
	scrubActive = false;
	scrubFrame  = 0;

	// Hüfte bewegt sich mit Laufgeschwindigkeit
	const vxPerFrame = vRun * PX_PER_M / FPS;
	let hipX = W * 0.25;

	let prevHandPos = null;
	const newFrames  = [];
	const newHistory = [];

	let t = 0;
	while (t <= SIM_TOTAL + DT * 0.5) {
		const arm = computeArm(t, hipX, wHip, wSh, wEl);

		let vxHandMS = 0;
		if (prevHandPos) {
			const dxPx = arm.handPos.x - prevHandPos.x;
			vxHandMS = (dxPx / PX_PER_M) / DT;
		}
		prevHandPos = { ...arm.handPos };

		if (vxHandMS > vHandXMax) vHandXMax = vxHandMS;

		newFrames.push({
			t,
			hipX,
			tA:      arm.tA,
			uaA:     arm.uaA,
			laA:     arm.laA,
			hipPos:  { ...arm.hipPos },
			shPos:   { ...arm.shPos },
			elPos:   { ...arm.elPos },
			handPos: { ...arm.handPos },
			vHand:   vxHandMS
		});

		if (newHistory.length === 0 || t - newHistory[newHistory.length - 1].t >= 0.025) {
			newHistory.push({ t, v: vxHandMS });
		}

		t    += DT;
		hipX += vxPerFrame;
	}

	frames  = newFrames;
	history = newHistory;

	// Zurück auf Frame 0
	scrubFrame  = 0;
	scrubActive = true;
	simTime     = frames[0].t;
	vHandX      = frames[0].vHand;
	drawFrame(frames[0]);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetSim() {
	frames      = [];
	history     = [];
	vHandX      = 0;
	vHandXMax   = 0;
	simTime     = 0;
	scrubFrame  = 0;
	scrubActive = false;
	drawIdleFrame();
}

// ─── Scrubber ─────────────────────────────────────────────────────────────────
function onScrubInput(e) {
	scrubFrame = Number(e.target.value);
	if (!frames.length) return;
	const snap = frames[scrubFrame];
	vHandX  = snap.vHand;
	simTime = snap.t;
	drawFrame(snap);
}

// ─── Idle-Bild ────────────────────────────────────────────────────────────────
function drawIdleFrame() {
	const hipX = W * 0.25;
	const arm  = computeArm(0, hipX, wHip, wSh, wEl);
	drawFrame({
		t: 0, hipX,
		tA: arm.tA, uaA: arm.uaA, laA: arm.laA,
		hipPos: arm.hipPos, shPos: arm.shPos,
		elPos: arm.elPos, handPos: arm.handPos,
		vHand: 0
	});
}

// ─── Canvas zeichnen ──────────────────────────────────────────────────────────
const HIST_PAD = 8;
const V_DISP   = 25;

function drawFrame(snap) {
	if (!overlayCanvas) return;
	const ctx = overlayCanvas.getContext('2d');
	ctx.clearRect(0, 0, W, H);

	// ── Boden ──────────────────────────────────────────────────────────
	ctx.fillStyle = '#334155';
	ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
	ctx.strokeStyle = '#475569';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y);
	ctx.stroke();

	const { hipPos, shPos, elPos, handPos } = snap;

	// ── Beine (von Hüfte nach Boden, vereinfacht) ──────────────────────
	ctx.lineWidth   = 5;
	ctx.strokeStyle = '#3b82f6';
	ctx.lineCap     = 'round';
	// Hinteres Bein
	ctx.beginPath();
	ctx.moveTo(hipPos.x - 8, hipPos.y);
	ctx.lineTo(hipPos.x - 12, GROUND_Y);
	ctx.stroke();
	// Vorderes Bein
	ctx.beginPath();
	ctx.moveTo(hipPos.x + 8, hipPos.y);
	ctx.lineTo(hipPos.x + 14, GROUND_Y);
	ctx.stroke();

	// ── Hüft-Punkt ─────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(hipPos.x, hipPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#60a5fa';
	ctx.fill();

	// ── Torso (Hüfte → Schulter) ───────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(hipPos.x, hipPos.y);
	ctx.lineTo(shPos.x, shPos.y);
	ctx.strokeStyle = '#60a5fa';
	ctx.lineWidth   = 6;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Kopf (über Schulter) ───────────────────────────────────────────
	// Kopf sitzt auf dem Torso-Vektor verlängert (Hals ≈ 12 px)
	const kopfX = shPos.x + Math.cos(snap.tA) * 14;
	const kopfY = shPos.y + Math.sin(snap.tA) * 14;
	ctx.beginPath();
	ctx.arc(kopfX, kopfY, 11, 0, Math.PI * 2);
	ctx.fillStyle = '#93c5fd';
	ctx.fill();

	// ── Schulter-Punkt ─────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(shPos.x, shPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#94a3b8';
	ctx.fill();

	// ── Oberarm (Schulter → Ellbogen) ──────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(shPos.x, shPos.y);
	ctx.lineTo(elPos.x, elPos.y);
	ctx.strokeStyle = '#34d399';
	ctx.lineWidth   = 7;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Ellbogen-Punkt ─────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(elPos.x, elPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#94a3b8';
	ctx.fill();

	// ── Unterarm (Ellbogen → Hand) ─────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(elPos.x, elPos.y);
	ctx.lineTo(handPos.x, handPos.y);
	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth   = 5;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Hand-Punkt ─────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(handPos.x, handPos.y, 6, 0, Math.PI * 2);
	ctx.fillStyle = '#fbbf24';
	ctx.fill();

	if (history.length < 2) return;

	// ── Verlaufskurve ──────────────────────────────────────────────────
	const HIST_H    = 52;
	const HIST_Y0   = H - HIST_H - 4;
	const HIST_W_PX = W - HIST_PAD * 2;
	const ZERO_Y    = HIST_Y0 + HIST_H / 2;
	const T_MAX     = SIM_TOTAL + 0.05;

	ctx.fillStyle = 'rgba(15,23,42,0.88)';
	if (ctx.roundRect) ctx.roundRect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H, 4);
	else ctx.rect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H);
	ctx.fill();

	ctx.strokeStyle = '#475569';
	ctx.setLineDash([4, 4]);
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(HIST_PAD, ZERO_Y); ctx.lineTo(HIST_PAD + HIST_W_PX, ZERO_Y);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = '#64748b';
	ctx.font      = '9px system-ui';
	ctx.textAlign = 'right';
	ctx.fillText(`+${V_DISP} m/s`, HIST_PAD + HIST_W_PX - 2, HIST_Y0 + 10);
	ctx.fillText(`0`,               HIST_PAD + HIST_W_PX - 2, ZERO_Y + 4);
	ctx.fillText(`−${V_DISP} m/s`, HIST_PAD + HIST_W_PX - 2, HIST_Y0 + HIST_H - 2);

	ctx.lineWidth = 2;
	ctx.lineJoin  = 'round';
	ctx.beginPath();
	let first = true;
	for (const { t, v } of history) {
		const x  = HIST_PAD + (t / T_MAX) * HIST_W_PX;
		const vc = Math.max(-V_DISP, Math.min(V_DISP, v));
		const y  = ZERO_Y - (vc / V_DISP) * (HIST_H / 2 - 3);
		if (first) { ctx.moveTo(x, y); first = false; }
		else        ctx.lineTo(x, y);
	}
	const cv = snap.vHand;
	ctx.strokeStyle = cv < 0 ? '#f87171' : cv < 10 ? '#facc15' : '#34d399';
	ctx.stroke();

	// Scrubber-Cursor
	if (scrubActive) {
		const cursorX = HIST_PAD + (snap.t / T_MAX) * HIST_W_PX;
		ctx.strokeStyle = 'rgba(255,255,255,0.65)';
		ctx.lineWidth   = 1;
		ctx.setLineDash([3, 3]);
		ctx.beginPath();
		ctx.moveTo(cursorX, HIST_Y0); ctx.lineTo(cursorX, HIST_Y0 + HIST_H);
		ctx.stroke();
		ctx.setLineDash([]);

		const vc = Math.max(-V_DISP, Math.min(V_DISP, snap.vHand));
		const cy = ZERO_Y - (vc / V_DISP) * (HIST_H / 2 - 3);
		ctx.beginPath();
		ctx.arc(cursorX, cy, 3, 0, Math.PI * 2);
		ctx.fillStyle = '#fff';
		ctx.fill();
	}
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMount(() => {
	drawIdleFrame();
});
</script>

<!-- ─── Template ──────────────────────────────────────────────────────────────── -->
<div class="widget">
	<h3>Handgeschwindigkeit — Kinematisches Arm-Modell</h3>
	<p class="subtitle">
		Hüfte → Torso → Schulter → Oberarm → Unterarm → Hand.
		Alle Gelenke drehen im Uhrzeigersinn mit Beschleunigung und Abbremsung.
		Die Slider geben die Spitzen-Winkelgeschwindigkeit in °/s an.
	</p>

	<!-- ── Simulations-Bereich ─────────────────────────────────────────────── -->
	<div class="sim-area">
		<canvas
			bind:this={overlayCanvas}
			class="overlay-canvas"
			width={W}
			height={H}
		></canvas>
	</div>

	<!-- ── Messwerte ──────────────────────────────────────────────────────────── -->
	<div class="metrics">
		<div class="metric">
			<span class="mlabel">v Hand x (aktuell)</span>
			<span class="mval" class:neg={vHandX < 0}>{vHandX.toFixed(1)} m/s</span>
		</div>
		<div class="metric">
			<span class="mlabel">v Hand x (Maximum)</span>
			<span class="mval peak">{vHandXMax.toFixed(1)} m/s</span>
		</div>
		<div class="metric">
			<span class="mlabel">Simulationszeit</span>
			<span class="mval dim">{simTime.toFixed(3)} s</span>
		</div>
	</div>

	<!-- ── Frame-Scrubber ─────────────────────────────────────────────────────── -->
	{#if scrubActive && frames.length > 0}
	<div class="scrubber-row">
		<label for="s-scrub" class="scrub-label">
			Frame
			<span class="scrub-info">
				{scrubFrame + 1} / {frames.length}
				<span class="scrub-time">({frames[scrubFrame].t.toFixed(3)} s)</span>
			</span>
		</label>
		<input
			id="s-scrub"
			type="range"
			min="0"
			max={frames.length - 1}
			step="1"
			value={scrubFrame}
			oninput={onScrubInput}
			class="scrub-slider"
		/>
	</div>
	{/if}

	<!-- ── Steuerung ──────────────────────────────────────────────────────────── -->
	<div class="controls">
		<div class="srow">
			<label for="s-run">
				Laufgeschwindigkeit
				<span class="sval">{vRun.toFixed(1)} m/s</span>
			</label>
			<input id="s-run" type="range" min="0" max="8" step="0.1" bind:value={vRun} />
		</div>

		<div class="srow">
			<label for="s-hip">
				Hüft-Rotation
				<span class="sval">{Math.round(wHip)} °/s</span>
			</label>
			<input id="s-hip" type="range" min="0" max="700" step="10" bind:value={wHip} />
		</div>

		<div class="srow">
			<label for="s-sh">
				Schulter-Schwung
				<span class="sval">{Math.round(wSh)} °/s</span>
			</label>
			<input id="s-sh" type="range" min="0" max="1500" step="10" bind:value={wSh} />
		</div>

		<div class="srow">
			<label for="s-el">
				Ellbogen-Peitsche
				<span class="sval">{Math.round(wEl)} °/s</span>
			</label>
			<input id="s-el" type="range" min="0" max="2000" step="10" bind:value={wEl} />
		</div>

		<div class="btns">
			<button class="btn-go"    onclick={startSim}>▶ Berechnen</button>
			<button class="btn-reset" onclick={resetSim}>↺ Zurücksetzen</button>
		</div>
	</div>

	<!-- Legende -->
	<div class="legend">
		<span class="dot" style="background:#60a5fa"></span> Torso
		<span class="dot" style="background:#34d399"></span> Oberarm
		<span class="dot" style="background:#f59e0b"></span> Unterarm / Hand
	</div>
</div>

<!-- ─── Styles ────────────────────────────────────────────────────────────── -->
<style>
	.widget {
		background:    #0f172a;
		border:        1px solid #1e293b;
		border-radius: 12px;
		padding:       1.25rem 1.5rem;
		color:         #e2e8f0;
		font-family:   system-ui, sans-serif;
		max-width:     700px;
		margin:        1.5rem auto;
	}

	h3 { margin: 0 0 0.25rem; font-size: 1.05rem; color: #f1f5f9; }

	.subtitle { font-size: 0.8rem; color: #64748b; margin: 0 0 0.9rem; }

	.sim-area {
		position: relative; width: 100%; max-width: 680px;
		border-radius: 8px; border: 1px solid #1e293b;
		overflow: hidden; line-height: 0;
	}

	.overlay-canvas { display: block; width: 100% !important; height: auto !important; }

	.metrics { display: flex; gap: 1.5rem; margin: 0.8rem 0 0.4rem; flex-wrap: wrap; }

	.metric { display: flex; flex-direction: column; gap: 2px; }

	.mlabel {
		font-size: 0.72rem; color: #64748b;
		text-transform: uppercase; letter-spacing: 0.05em;
	}

	.mval {
		font-size: 1.35rem; font-weight: 700;
		font-variant-numeric: tabular-nums; color: #34d399;
	}
	.mval.neg  { color: #f87171; }
	.mval.peak { color: #60a5fa; }
	.mval.dim  { color: #94a3b8; font-size: 1rem; font-weight: 400; padding-top: 5px; }

	.scrubber-row {
		margin: 0.6rem 0 0.2rem; display: flex; flex-direction: column; gap: 3px;
		padding: 0.55rem 0.75rem; background: #1e293b;
		border-radius: 8px; border: 1px solid #334155;
	}

	.scrub-label {
		font-size: 0.8rem; color: #94a3b8;
		display: flex; justify-content: space-between; align-items: center;
	}

	.scrub-info { color: #e2e8f0; font-variant-numeric: tabular-nums; }

	.scrub-time { color: #64748b; font-size: 0.75rem; margin-left: 0.4rem; }

	.scrub-slider { width: 100%; accent-color: #f59e0b; }

	.controls {
		margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.55rem;
	}

	.srow { display: flex; flex-direction: column; gap: 2px; }

	.srow label {
		font-size: 0.8rem; color: #94a3b8;
		display: flex; justify-content: space-between;
	}

	.sval { color: #e2e8f0; font-variant-numeric: tabular-nums; }

	input[type="range"] { width: 100%; accent-color: #3b82f6; }

	.btns { display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap; }

	button {
		padding: 0.38rem 1rem; border: none; border-radius: 6px;
		font-size: 0.88rem; cursor: pointer; transition: opacity 0.12s;
	}
	button:disabled { opacity: 0.3; cursor: default; }

	.btn-go    { background: #2563eb; color: #fff; }
	.btn-go:not(:disabled):hover    { background: #1d4ed8; }
	.btn-reset { background: #334155; color: #e2e8f0; }
	.btn-reset:not(:disabled):hover { background: #475569; }

	.legend {
		margin-top: 0.6rem; font-size: 0.78rem; color: #94a3b8;
		display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
	}

	.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
</style>
