<script>
// @ts-nocheck
/**
 * HandVelocityAnimation.svelte
 *
 * Kinematisches Arm-Modell mit Hüftgelenk + linkem Wurfarm + Ball.
 *
 * Rechter Arm (Schlagarm):
 *   Hüfte → Torso → Schulter → Oberarm → Unterarm → Hand
 *   Ellbogen startet hinter dem Kopf, Unterarm nach unten.
 *   Alle Gelenke drehen im Uhrzeigersinn.
 *
 * Linker Arm (Wurfarm):
 *   Hält den Ball zu Beginn gestreckt nach vorne-oben.
 *   Bewegt sich nach oben (Gegenuhr). Lässt den Ball genau dann los,
 *   wenn die rechte Hand ihre maximale x-Geschwindigkeit erreicht.
 *   Danach: Ball fliegt als Parabel (Gravitation g = 9.81 m/s²).
 *
 * Slider (Winkelgeschwindigkeiten):
 *   - Laufgeschwindigkeit (m/s)
 *   - Hüft-Rotation    (°/s, Spitze)
 *   - Schulter-Schwung (°/s, Spitze)
 *   - Ellbogen-Peitsche(°/s, Spitze)
 */

import { onMount } from 'svelte';

// ─── Skalierung ───────────────────────────────────────────────────────────────
const PX_PER_M = 80;
const FPS      = 60;
const DT       = 1 / FPS;
const G_PX     = 9.81 * PX_PER_M;   // Gravitation in px/s²

// ─── Canvas ───────────────────────────────────────────────────────────────────
const W        = 680;
const H        = 340;
const GROUND_Y = H - 40;

// ─── Körper-Geometrie (Pixel) ────────────────────────────────────────────────
const TORSO_LEN = Math.round(0.55 * PX_PER_M);
const UA_LEN    = Math.round(0.30 * PX_PER_M);
const LA_LEN    = Math.round(0.28 * PX_PER_M);
const BALL_R    = 10;

// ─── Hüfte-Y (Bodenhöhe) ─────────────────────────────────────────────────────
const HIP_Y0 = GROUND_Y - Math.round(0.95 * PX_PER_M);

// ─── Sprung ───────────────────────────────────────────────────────────────────
// Anlauf: 4 Schritte à STEP_DUR Sekunden, dann Absprung
const STEP_DUR  = 0.22;           // Dauer eines Schritts in s
const N_STEPS   = 4;
const JUMP_T    = N_STEPS * STEP_DUR;   // Absprung-Zeitpunkt  (~0.88 s)
// Sprung-Anfangsgeschwindigkeit: Spieler springt ca. 0.6 m hoch
// h = vy0² / (2*g)  →  vy0 = sqrt(2 * g * h)
const JUMP_H_M  = 0.55;          // Sprunghöhe in Metern
const JUMP_VY0  = Math.sqrt(2 * 9.81 * JUMP_H_M) * PX_PER_M;  // px/s nach oben

// ─── Startwinkel ─────────────────────────────────────────────────────────────
const TORSO_ANGLE_UPRIGHT = -Math.PI / 2;         // aufrecht (-90°)
const TORSO_ANGLE_START   = -Math.PI / 2;         // Startposition = aufrecht
const UA_ANGLE_START      =  120 * Math.PI / 180; // Oberarm bei 120° (hinten-oben)
const EL_OFFSET_START     = -Math.PI / 2;         // Unterarm nach unten

// ─── Hüft-Ausholen und Schwung ────────────────────────────────────────────────
// Phase 1: Ausholen  →  10° gegen UZS  (Torso kippt leicht nach hinten)
// Phase 2: Schwung   →  30° im UZS     (netto 20° vorwärts ab Startposition)
// Phase 3: Rückkehr  →  zurück auf -90° (aufrecht) nach dem Schlag
const HIP_BACK_DEG   = 10;   // Ausholwinkel (gegen UZS)
const HIP_SWING_DEG  = 30;   // Gesamtschwung im UZS ab Ausholposition

// ─── Startwinkel linker Arm ───────────────────────────────────────────────────
const LA_UA_ANGLE_START  = -30 * Math.PI / 180;

// ─── Timing ───────────────────────────────────────────────────────────────────
// Hüfte
const HIP_BACK_START = 0.00;  const HIP_BACK_END = 0.12;  // Ausholen
const HIP_FWD_START  = 0.10;  const HIP_FWD_END  = 0.50;  // Vorwärtsschwung
// HIP_RETURN: nach Peak (wird dynamisch gesetzt)
const HIP_RETURN_DUR = 0.30;  // Dauer der Rückkehr in s

// Schulter & Ellbogen (relativ zu tSim = t - JUMP_T)
const SH_START  = 0.08;
const EL_START  = 0.35;
const EL_END    = 0.72;
// Gesamtdauer: Anlauf + Sprung (Flugzeit = 2*vy0/g)
const FLIGHT_T  = 2 * JUMP_VY0 / G_PX;   // ~0.67 s
const SIM_TOTAL = JUMP_T + FLIGHT_T + 0.20;  // etwas Puffer nach Landung

// ─── Timing linker Arm (Wurfbewegung, relativ zu tSim) ───────────────────────
const LA_SH_START = 0.00;
const LA_SH_END   = 0.55;

// ─── Sprung-Hilfsfunktionen ───────────────────────────────────────────────────
// tSim: Zeit seit Absprung (0 beim Absprung, negativ = noch am Boden)
function toTSim(t) { return t - JUMP_T; }

// hipY(t): Y-Position der Hüfte
// Vor Absprung: auf Bodenhöhe; während Flug: Parabel; nach Landung: Bodenhöhe
function hipYAt(t) {
	const ts = toTSim(t);
	if (ts <= 0) return HIP_Y0;
	const y = HIP_Y0 - JUMP_VY0 * ts + 0.5 * G_PX * ts * ts;
	return Math.min(y, HIP_Y0);  // nicht unter Boden
}

// ─── Easing ───────────────────────────────────────────────────────────────────
function smoothstep(x) {
	const t = Math.max(0, Math.min(1, x));
	return t * t * (3 - 2 * t);
}
function phase(t, start, end) {
	return smoothstep((t - start) / (end - start));
}
function peakToTotal(omegaRad, duration) {
	return omegaRad / 1.5 * duration;
}

const DEG = Math.PI / 180;

// ─── Kinematik: Hüfte ────────────────────────────────────────────────────────
// Gibt den Schwing-Winkel zurück (Ausholen + Vorwärts).
// Rückkehr nach Peak wird in computeArm gehandhabt wo peakAngle bekannt ist.
function torsoSwingAngle(t) {
	// Phase 1: Ausholen — 10° gegen Uhrzeigersinn
	const back = -(HIP_BACK_DEG * DEG) * phase(t, HIP_BACK_START, HIP_BACK_END);
	// Phase 2: Vorwärtsschwung — 30° im Uhrzeigersinn
	const fwd  = (HIP_SWING_DEG * DEG) * phase(t, HIP_FWD_START, HIP_FWD_END);
	return TORSO_ANGLE_START + back + fwd;
}

function uaAngle(t, wShDeg) {
	// Schulter dreht die ganze Zeit im Uhrzeigersinn — eine einzige Phase.
	// Der Schwung läuft von SH_START bis SIM_TOTAL durch.
	const swingDelta = peakToTotal(wShDeg * DEG, SIM_TOTAL - SH_START);
	return UA_ANGLE_START + swingDelta * phase(t, SH_START, SIM_TOTAL);
}

// elOffset mit eingefrorenem Wert nach Peak
// frozenOffset: Wert zum Peak-Zeitpunkt (null = noch nicht einfrieren)
function elOffset(t, wElDeg, frozenOffset) {
	if (frozenOffset !== null) return frozenOffset;
	return EL_OFFSET_START + peakToTotal(wElDeg * DEG, EL_END - EL_START) * phase(t, EL_START, EL_END);
}

// ─── Kinematik linker Arm ─────────────────────────────────────────────────────
// Linker Arm hebt von -30° nach -90° (senkrecht nach oben) = gegen Uhrzeigersinn.
// Gesamtdrehung: -60° (Winkel sinkt um 60°).
// Spitzengeschwindigkeit ~300 °/s.
const LA_LIFT_DEG    = 300;   // °/s Spitze
const LA_TOTAL_DEG   = -60;   // Gesamtdrehung in °  (negativ = gegen Uhrzeigersinn)

function leftUaAngle(t) {
	return LA_UA_ANGLE_START + (LA_TOTAL_DEG * DEG) * phase(t, LA_SH_START, LA_SH_END);
}

// ─── Arm-Weltpositionen berechnen ─────────────────────────────────────────────
// frozenElOffset:  null = normal, Zahl = eingefroren nach Peak
// peakHipAngle:    null = normaler Schwung, Zahl = Winkel beim Peak (für Rückkehr)
// peakT:           null = kein Return, Zahl = Zeitpunkt des Peaks (absolut)
function computeArm(t, hipX, wHip, wSh, wEl, frozenElOffset = null, peakHipAngle = null, peakT = null) {
	// tSim: Zeit seit Absprung — Arm-Kinematik läuft erst ab Absprung
	const ts = Math.max(0, toTSim(t));

	// Torso-Winkel (basierend auf tSim)
	let tA = torsoSwingAngle(ts);
	if (peakHipAngle !== null && peakT !== null && t > peakT) {
		const tsPeak    = Math.max(0, toTSim(peakT));
		const returnEnd = peakT + HIP_RETURN_DUR;
		tA = peakHipAngle + (TORSO_ANGLE_UPRIGHT - peakHipAngle) * phase(t, peakT, returnEnd);
	}

	const uaA  = uaAngle(ts, wSh);
	const laA  = uaA + elOffset(ts, wEl, frozenElOffset);
	const hipY = hipYAt(t);

	const hipPos = { x: hipX, y: hipY };
	const shPos  = {
		x: hipX + Math.cos(tA) * TORSO_LEN,
		y: hipY + Math.sin(tA) * TORSO_LEN
	};
	const elPos  = {
		x: shPos.x + Math.cos(uaA) * UA_LEN,
		y: shPos.y + Math.sin(uaA) * UA_LEN
	};
	const handPos = {
		x: elPos.x + Math.cos(laA) * LA_LEN,
		y: elPos.y + Math.sin(laA) * LA_LEN
	};
	return { hipPos, shPos, elPos, handPos, tA, uaA, laA };
}

// ─── Linken Arm berechnen ─────────────────────────────────────────────────────
// Linke Schulter = Schulter-X - 2*Schulterbreite, gleiche Y wie rechte Schulter
// (Im Seitenriss vereinfacht: linke Schulter etwas nach links versetzt)
function computeLeftArm(t, shPos) {
	// Linke Schulter sitzt im Seitenriss leicht vor dem Körper (= nach rechts/vorne)
	const lShPos = { x: shPos.x + 8, y: shPos.y + 4 };
	const luaA   = leftUaAngle(t);
	const lElPos = {
		x: lShPos.x + Math.cos(luaA) * UA_LEN,
		y: lShPos.y + Math.sin(luaA) * UA_LEN
	};
	// Unterarm gestreckt (selber Winkel wie Oberarm)
	const lHandPos = {
		x: lElPos.x + Math.cos(luaA) * LA_LEN,
		y: lElPos.y + Math.sin(luaA) * LA_LEN
	};
	return { lShPos, lElPos, lHandPos, luaA };
}

// ─── Slider-Defaults ─────────────────────────────────────────────────────────
const W_HIP_DEF = 230;
const W_SH_DEF  = 570;
const W_EL_DEF  = 800;
const V_RUN_DEF = 3.0;

let wHip = $state(W_HIP_DEF);
let wSh  = $state(W_SH_DEF);
let wEl  = $state(W_EL_DEF);
let vRun = $state(V_RUN_DEF);

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

	const vxPerFrame = vRun * PX_PER_M / FPS;
	let hipX = W * 0.25;

	const pass1 = [];

	// ── Pass 1a: ohne eingefrorenen Offset — nur für Peak-Suche ──────────
	// (Ellbogen-Offset vor Peak normal, danach egal — wir suchen nur peakIdx)
	{
		let prevHP = null;
		let t0 = 0, hx0 = hipX;
		while (t0 <= SIM_TOTAL + DT * 0.5) {
			const arm = computeArm(t0, hx0, wHip, wSh, wEl, null);
			let vx = 0, vy = 0;
			if (prevHP) {
				vx = ((arm.handPos.x - prevHP.x) / PX_PER_M) / DT;
				vy = ((arm.handPos.y - prevHP.y) / PX_PER_M) / DT;
			}
			prevHP = { ...arm.handPos };
			pass1.push({ t: t0, hipX: hx0, arm, vxHandMS: vx, vyHandMS: vy });
			t0 += DT; hx0 += vxPerFrame;
		}
	}

	// Peak-Frame: maximale vxHandMS
	let peakIdx = 0;
	for (let i = 1; i < pass1.length; i++) {
		if (pass1[i].vxHandMS > pass1[peakIdx].vxHandMS) peakIdx = i;
	}
	vHandXMax = pass1[peakIdx].vxHandMS;

	const peakT          = pass1[peakIdx].t;
	const peakTSim       = Math.max(0, toTSim(peakT));
	const frozenElOffset = elOffset(peakTSim, wEl, null);
	const peakHipAngle   = torsoSwingAngle(peakTSim);

	// Ball-Startbedingungen: Position + voller Handimpuls der rechten Hand
	const peakSnap     = pass1[peakIdx];
	const ballStartPos = { ...peakSnap.arm.handPos };
	const ballVx0      = peakSnap.vxHandMS * PX_PER_M;
	const ballVy0      = peakSnap.vyHandMS * PX_PER_M;

	// ── Pass 2: finale Frames ─────────────────────────────────────────
	const newFrames  = [];
	const newHistory = [];

	let prevHandPos2 = null;

	for (let i = 0; i < pass1.length; i++) {
		const { t: ft, hipX: fhipX } = pass1[i];

		const frozen  = i >= peakIdx ? frozenElOffset : null;
		const hipPeak = i >= peakIdx ? peakHipAngle   : null;
		const pkT     = i >= peakIdx ? peakT          : null;
		const arm     = computeArm(ft, fhipX, wHip, wSh, wEl, frozen, hipPeak, pkT);

		// Handgeschwindigkeit neu aus korrigiertem arm
		let vxHandMS = 0, vyHandMS = 0;
		if (prevHandPos2) {
			vxHandMS = ((arm.handPos.x - prevHandPos2.x) / PX_PER_M) / DT;
			vyHandMS = ((arm.handPos.y - prevHandPos2.y) / PX_PER_M) / DT;
		}
		prevHandPos2 = { ...arm.handPos };

		const left = computeLeftArm(ft, arm.shPos);

		let ballPos;
		if (i < peakIdx) {
			ballPos = { ...left.lHandPos };
		} else {
			const elapsed = ft - peakT;
			ballPos = {
				x: ballStartPos.x + ballVx0 * elapsed,
				y: ballStartPos.y + ballVy0 * elapsed + 0.5 * G_PX * elapsed * elapsed
			};
		}

		newFrames.push({
			t:       ft,
			hipX:    fhipX,
			tA:      arm.tA,
			uaA:     arm.uaA,
			laA:     arm.laA,
			hipPos:  { ...arm.hipPos },
			shPos:   { ...arm.shPos },
			elPos:   { ...arm.elPos },
			handPos: { ...arm.handPos },
			vHand:   i === peakIdx ? vHandXMax : vxHandMS,
			lShPos:   { ...left.lShPos },
			lElPos:   { ...left.lElPos },
			lHandPos: { ...left.lHandPos },
			ballPos:    { ...ballPos },
			ballLoosed: i >= peakIdx,
			isPeak:     i === peakIdx
		});

		if (newHistory.length === 0 || ft - newHistory[newHistory.length - 1].t >= 0.025) {
			newHistory.push({ t: ft, v: i === peakIdx ? vHandXMax : vxHandMS });
		}
	}

	frames  = newFrames;
	history = newHistory;

	scrubFrame  = 0;
	scrubActive = true;
	simTime     = frames[0].t;
	vHandX      = frames[0].vHand;
	drawFrame(frames[0]);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetSim() {
	frames = []; history = [];
	vHandX = 0; vHandXMax = 0; simTime = 0;
	scrubFrame = 0; scrubActive = false;
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
	const left = computeLeftArm(0, arm.shPos);
	drawFrame({
		t: 0, hipX,
		tA: arm.tA, uaA: arm.uaA, laA: arm.laA,
		hipPos: arm.hipPos, shPos: arm.shPos,
		elPos: arm.elPos, handPos: arm.handPos,
		vHand: 0,
		lShPos: left.lShPos, lElPos: left.lElPos, lHandPos: left.lHandPos,
		ballPos: { ...left.lHandPos }, ballLoosed: false, isPeak: false
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
	const { lShPos, lElPos, lHandPos, ballPos } = snap;

	// ── Linker Arm (hinter dem Körper, zuerst zeichnen) ───────────────
	// Linker Oberarm
	ctx.beginPath();
	ctx.moveTo(lShPos.x, lShPos.y);
	ctx.lineTo(lElPos.x, lElPos.y);
	ctx.strokeStyle = '#818cf8';   // indigo
	ctx.lineWidth   = 6;
	ctx.lineCap     = 'round';
	ctx.stroke();
	// Linker Unterarm
	ctx.beginPath();
	ctx.moveTo(lElPos.x, lElPos.y);
	ctx.lineTo(lHandPos.x, lHandPos.y);
	ctx.strokeStyle = '#a5b4fc';
	ctx.lineWidth   = 5;
	ctx.lineCap     = 'round';
	ctx.stroke();
	// Linker Ellbogen
	ctx.beginPath();
	ctx.arc(lElPos.x, lElPos.y, 4, 0, Math.PI * 2);
	ctx.fillStyle = '#94a3b8';
	ctx.fill();

	// ── Ball ───────────────────────────────────────────────────────────
	// Schlagschatten
	ctx.beginPath();
	ctx.arc(ballPos.x + 2, ballPos.y + 2, BALL_R, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(0,0,0,0.3)';
	ctx.fill();
	// Ball
	ctx.beginPath();
	ctx.arc(ballPos.x, ballPos.y, BALL_R, 0, Math.PI * 2);
	const ballGrad = ctx.createRadialGradient(
		ballPos.x - 3, ballPos.y - 3, 2,
		ballPos.x, ballPos.y, BALL_R
	);
	ballGrad.addColorStop(0, '#fef9c3');
	ballGrad.addColorStop(1, '#ca8a04');
	ctx.fillStyle = ballGrad;
	ctx.fill();
	ctx.strokeStyle = snap.isPeak ? '#f97316' : (snap.ballLoosed ? '#fbbf24' : '#a16207');
	ctx.lineWidth   = snap.isPeak ? 2.5 : 1.5;
	ctx.stroke();

	// ── Beine ──────────────────────────────────────────────────────────
	ctx.lineWidth   = 5;
	ctx.lineCap     = 'round';
	ctx.strokeStyle = '#3b82f6';
	const ts = Math.max(0, snap.t - JUMP_T);
	const inAir = snap.t > JUMP_T && snap.hipPos.y < HIP_Y0 - 2;

	if (inAir) {
		// Beine im Sprung: leicht angewinkelt nach unten-hinten
		const kneeOffY = Math.round(0.25 * PX_PER_M);
		const footOffY = Math.round(0.50 * PX_PER_M);
		// Linkes Bein (hinten)
		ctx.beginPath();
		ctx.moveTo(hipPos.x - 6, hipPos.y);
		ctx.lineTo(hipPos.x - 14, hipPos.y + kneeOffY);
		ctx.lineTo(hipPos.x - 10, hipPos.y + footOffY);
		ctx.stroke();
		// Rechtes Bein (vorne)
		ctx.beginPath();
		ctx.moveTo(hipPos.x + 6, hipPos.y);
		ctx.lineTo(hipPos.x + 14, hipPos.y + kneeOffY);
		ctx.lineTo(hipPos.x + 8,  hipPos.y + footOffY);
		ctx.stroke();
	} else {
		// Laufzyklus: Schrittphase aus Simulationszeit
		const stepPhase = (snap.t / STEP_DUR) % 1.0;
		const swingAng  = Math.sin(stepPhase * Math.PI * 2) * 0.35; // ±20°
		// Hinteres Bein
		const b1ax = hipPos.x - 6, b1ay = hipPos.y;
		const b1bx = b1ax + Math.sin(-swingAng) * Math.round(0.45 * PX_PER_M);
		const b1by = b1ay + Math.cos(-swingAng) * Math.round(0.45 * PX_PER_M);
		ctx.beginPath(); ctx.moveTo(b1ax, b1ay); ctx.lineTo(b1bx, b1by); ctx.stroke();
		// Vorderes Bein
		const b2ax = hipPos.x + 6, b2ay = hipPos.y;
		const b2bx = b2ax + Math.sin(swingAng) * Math.round(0.45 * PX_PER_M);
		const b2by = b2ay + Math.cos(swingAng) * Math.round(0.45 * PX_PER_M);
		ctx.beginPath(); ctx.moveTo(b2ax, b2ay); ctx.lineTo(b2bx, b2by); ctx.stroke();
	}

	// ── Hüft-Punkt ─────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(hipPos.x, hipPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#60a5fa';
	ctx.fill();

	// ── Torso ──────────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(hipPos.x, hipPos.y);
	ctx.lineTo(shPos.x, shPos.y);
	ctx.strokeStyle = '#60a5fa';
	ctx.lineWidth   = 6;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Kopf ───────────────────────────────────────────────────────────
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

	// ── Rechter Oberarm ────────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(shPos.x, shPos.y);
	ctx.lineTo(elPos.x, elPos.y);
	ctx.strokeStyle = '#34d399';
	ctx.lineWidth   = 7;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Rechter Ellbogen ───────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(elPos.x, elPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#94a3b8';
	ctx.fill();

	// ── Rechter Unterarm ───────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(elPos.x, elPos.y);
	ctx.lineTo(handPos.x, handPos.y);
	ctx.strokeStyle = '#f59e0b';
	ctx.lineWidth   = 5;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Rechte Hand ────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(handPos.x, handPos.y, 6, 0, Math.PI * 2);
	ctx.fillStyle = '#fbbf24';
	ctx.fill();

	// ── Peak-Markierung ────────────────────────────────────────────────
	if (snap.isPeak) {
		ctx.beginPath();
		ctx.arc(handPos.x, handPos.y, 10, 0, Math.PI * 2);
		ctx.strokeStyle = '#f97316';
		ctx.lineWidth   = 2;
		ctx.setLineDash([3, 3]);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = '#f97316';
		ctx.font      = 'bold 10px system-ui';
		ctx.textAlign = 'left';
		ctx.fillText('v_max', handPos.x + 13, handPos.y + 4);
	}

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
	ctx.strokeStyle = snap.vHand < 0 ? '#f87171' : snap.vHand < 10 ? '#facc15' : '#34d399';
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
onMount(() => { drawIdleFrame(); });
</script>

<!-- ─── Template ──────────────────────────────────────────────────────────────── -->
<div class="widget">
	<h3>Handgeschwindigkeit — Kinematisches Arm-Modell</h3>
	<p class="subtitle">
		Rechter Arm: Hüfte → Torso → Schulter → Oberarm → Unterarm.
		Linker Arm wirft den Ball — Loslassen beim Maximum der Handgeschwindigkeit (v_max).
	</p>

	<div class="sim-area">
		<canvas bind:this={overlayCanvas} class="overlay-canvas" width={W} height={H}></canvas>
	</div>

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

	{#if scrubActive && frames.length > 0}
	<div class="scrubber-row">
		<label for="s-scrub" class="scrub-label">
			Frame
			<span class="scrub-info">
				{scrubFrame + 1} / {frames.length}
				<span class="scrub-time">({frames[scrubFrame].t.toFixed(3)} s)</span>
			</span>
		</label>
		<input id="s-scrub" type="range" min="0" max={frames.length - 1} step="1"
			value={scrubFrame} oninput={onScrubInput} class="scrub-slider" />
	</div>
	{/if}

	<div class="controls">
		<div class="srow">
			<label for="s-run">Laufgeschwindigkeit <span class="sval">{vRun.toFixed(1)} m/s</span></label>
			<input id="s-run" type="range" min="0" max="8" step="0.1" bind:value={vRun} />
		</div>
		<div class="srow">
			<label for="s-hip">Hüft-Rotation <span class="sval">{Math.round(wHip)} °/s</span></label>
			<input id="s-hip" type="range" min="0" max="700" step="10" bind:value={wHip} />
		</div>
		<div class="srow">
			<label for="s-sh">Schulter-Schwung <span class="sval">{Math.round(wSh)} °/s</span></label>
			<input id="s-sh" type="range" min="0" max="1500" step="10" bind:value={wSh} />
		</div>
		<div class="srow">
			<label for="s-el">Ellbogen-Peitsche <span class="sval">{Math.round(wEl)} °/s</span></label>
			<input id="s-el" type="range" min="0" max="2000" step="10" bind:value={wEl} />
		</div>
		<div class="btns">
			<button class="btn-go"    onclick={startSim}>▶ Berechnen</button>
			<button class="btn-reset" onclick={resetSim}>↺ Zurücksetzen</button>
		</div>
	</div>

	<div class="legend">
		<span class="dot" style="background:#60a5fa"></span> Torso
		<span class="dot" style="background:#34d399"></span> Rechter Oberarm
		<span class="dot" style="background:#f59e0b"></span> Rechter Unterarm
		<span class="dot" style="background:#818cf8"></span> Linker Arm
		<span class="dot" style="background:#ca8a04"></span> Ball
	</div>
</div>

<style>
	.widget {
		background: #0f172a; border: 1px solid #1e293b; border-radius: 12px;
		padding: 1.25rem 1.5rem; color: #e2e8f0;
		font-family: system-ui, sans-serif; max-width: 700px; margin: 1.5rem auto;
	}
	h3 { margin: 0 0 0.25rem; font-size: 1.05rem; color: #f1f5f9; }
	.subtitle { font-size: 0.8rem; color: #64748b; margin: 0 0 0.9rem; }

	.sim-area {
		position: relative; width: 100%; max-width: 680px;
		border-radius: 8px; border: 1px solid #1e293b; overflow: hidden; line-height: 0;
	}
	.overlay-canvas { display: block; width: 100% !important; height: auto !important; }

	.metrics { display: flex; gap: 1.5rem; margin: 0.8rem 0 0.4rem; flex-wrap: wrap; }
	.metric { display: flex; flex-direction: column; gap: 2px; }
	.mlabel { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
	.mval { font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #34d399; }
	.mval.neg  { color: #f87171; }
	.mval.peak { color: #60a5fa; }
	.mval.dim  { color: #94a3b8; font-size: 1rem; font-weight: 400; padding-top: 5px; }

	.scrubber-row {
		margin: 0.6rem 0 0.2rem; display: flex; flex-direction: column; gap: 3px;
		padding: 0.55rem 0.75rem; background: #1e293b; border-radius: 8px; border: 1px solid #334155;
	}
	.scrub-label { font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; }
	.scrub-info { color: #e2e8f0; font-variant-numeric: tabular-nums; }
	.scrub-time { color: #64748b; font-size: 0.75rem; margin-left: 0.4rem; }
	.scrub-slider { width: 100%; accent-color: #f59e0b; }

	.controls { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.55rem; }
	.srow { display: flex; flex-direction: column; gap: 2px; }
	.srow label { font-size: 0.8rem; color: #94a3b8; display: flex; justify-content: space-between; }
	.sval { color: #e2e8f0; font-variant-numeric: tabular-nums; }
	input[type="range"] { width: 100%; accent-color: #3b82f6; }

	.btns { display: flex; gap: 0.5rem; margin-top: 0.4rem; flex-wrap: wrap; }
	button { padding: 0.38rem 1rem; border: none; border-radius: 6px; font-size: 0.88rem; cursor: pointer; transition: opacity 0.12s; }
	button:disabled { opacity: 0.3; cursor: default; }
	.btn-go    { background: #2563eb; color: #fff; }
	.btn-go:not(:disabled):hover    { background: #1d4ed8; }
	.btn-reset { background: #334155; color: #e2e8f0; }
	.btn-reset:not(:disabled):hover { background: #475569; }

	.legend { margin-top: 0.6rem; font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
	.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
</style>
