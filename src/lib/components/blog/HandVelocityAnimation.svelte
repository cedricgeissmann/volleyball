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
import { browser } from '$app/environment';
import { handVelocityMax } from '$lib/stores/serviceVelocity.js';

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
const UA_ANGLE_START      = -130 * Math.PI / 180; // Oberarm bei -130° (nach unten-hinten, klassische Ausholposition)
const EL_OFFSET_START     =   90 * Math.PI / 180; // Unterarm nach oben relativ zum Oberarm (eingeklappt nach hinten)

// ─── Hüft-Ausholen und Schwung ────────────────────────────────────────────────
// Phase 1: Ausholen  →  10° gegen UZS  (Torso kippt leicht nach hinten)
// Phase 2: Schwung   →  30° im UZS     (netto 20° vorwärts ab Startposition)
// Phase 3: Rückkehr  →  zurück auf -90° (aufrecht) nach dem Schlag
const HIP_BACK_DEG   = 10;    // Ausholwinkel (gegen UZS)
const HIP_SWING_DEG  = 30;    // Gesamtschwung im UZS ab Ausholposition
const HIP_BACK_DUR   = 0.12;  // Dauer Ausholen (fest)
const HIP_RETURN_DUR = 0.30;  // Dauer der Rückkehr in s nach Peak

// Schulter & Ellbogen — feste Amplituden
const SH_TOTAL_DEG  = 180;   // Schulter schwingt insgesamt 180° nach vorne
// Ellbogen zweiphasig:
//   Phase 1 (Rückfall): Unterarm dreht ENTGEGEN der Schulter — bleibt hinter dem Kopf
//   Phase 2 (Peitsche): Unterarm schnellt VORWÄRTS durch den Schlag
const EL_BACK_DEG   = 180;   // Rückfall-Amplitude (°) — Unterarm fällt zurück
const EL_FWD_DEG    = 120;   // Vorwärts-Amplitude (°) — Peitsche nach vorne

// ─── Fixer Peak-Zeitpunkt (relativ zu tSim) ───────────────────────────────────
// Echter physikalischer Höhepunkt des Sprungs: vy0 / g → vy=0 an diesem Punkt.
// Alle Gelenke enden ihren Schwung EXAKT hier.
const PEAK_T_SIM = JUMP_VY0 / G_PX;   // s nach Absprung (~0.335 s)

// ─── Startwinkel linker Arm ───────────────────────────────────────────────────
const LA_UA_ANGLE_START  = -30 * Math.PI / 180;

// ─── Gesamtdauer Simulation ───────────────────────────────────────────────────
const FLIGHT_T  = 2 * JUMP_VY0 / G_PX;   // ~0.67 s
const SIM_TOTAL = JUMP_T + FLIGHT_T + 0.20;  // etwas Puffer nach Landung

// ─── Timing linker Arm ────────────────────────────────────────────────────────
// Wurf beginnt auf dem 2. Schritt, Arm hebt bis zum Absprung (JUMP_T).
// t ist hier ABSOLUT (nicht tSim).
const TOSS_T      = 2 * STEP_DUR;   // Zeitpunkt des Wurfs (~0.44 s)
const LA_SH_START = TOSS_T;         // Arm-Heben beginnt mit dem Wurf
const LA_SH_END   = JUMP_T;         // Arm ist beim Absprung oben gestreckt

// ─── Dynamisches Timing berechnen ─────────────────────────────────────────────
// Jedes Gelenk: Dauer = Amplitude / ω  → start = PEAK_T_SIM - Dauer
// Die smoothstep-Phase läuft dann von start → PEAK_T_SIM.
// Minimum-Startzeit: 0 (kann nicht vor Absprung starten)
// smoothstep hat seine maximale Ableitung bei x=0.5 (Mitte des Intervalls).
// Damit die maximale Winkelgeschwindigkeit (= maximale Handgeschwindigkeit) genau
// bei PEAK_T_SIM liegt, muss PEAK_T_SIM die Mitte des Intervalls sein:
//   start = PEAK_T_SIM - dur/2
//   end   = PEAK_T_SIM + dur/2
function hipTiming(wHipDeg) {
	const dur   = Math.max(0.05, HIP_SWING_DEG / wHipDeg);
	const start = Math.max(0, PEAK_T_SIM - dur / 2);
	const end   = PEAK_T_SIM + dur / 2;
	// Ausholen endet kurz bevor der Vorwärtsschwung startet
	const backEnd   = Math.max(0, start - 0.02);
	const backStart = Math.max(0, backEnd - HIP_BACK_DUR);
	return { start, end, backStart, backEnd };
}

function shTiming(wShDeg) {
	const dur   = Math.max(0.05, SH_TOTAL_DEG / wShDeg);
	const start = Math.max(0, PEAK_T_SIM - dur / 2);
	const end   = PEAK_T_SIM + dur / 2;
	return { start, end };
}

function elTiming(wElDeg, shTimingObj) {
	// Phase 1 (Rückfall): startet gleichzeitig mit der Schulter, doppelt so schnell → halbe Dauer
	const backDur   = (shTimingObj.end - shTimingObj.start) / 2;
	const backStart = shTimingObj.start;
	const backEnd   = shTimingObj.start + backDur;
	const back = { start: backStart, end: backEnd };
	// Phase 2 (Peitsche): Mitte liegt beim Peak, Dauer = EL_FWD_DEG / wEl
	const fwdDur   = Math.max(0.05, EL_FWD_DEG / wElDeg);
	const fwdStart = Math.max(0, PEAK_T_SIM - fwdDur / 2);
	const fwdEnd   = PEAK_T_SIM + fwdDur / 2;
	return { back, fwd: { start: fwdStart, end: fwdEnd } };
}

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


const DEG = Math.PI / 180;

// ─── Kinematik: Hüfte ────────────────────────────────────────────────────────
// timing = { start, end, backStart, backEnd } — dynamisch aus hipTiming(wHipDeg)
function torsoSwingAngle(t, timing) {
	const back = -(HIP_BACK_DEG * DEG) * phase(t, timing.backStart, timing.backEnd);
	const fwd  = (HIP_SWING_DEG * DEG) * phase(t, timing.start, timing.end);
	return TORSO_ANGLE_START + back + fwd;
}

// timing = { start, end } — dynamisch aus shTiming(wShDeg)
function uaAngle(t, timing) {
	return UA_ANGLE_START + (SH_TOTAL_DEG * DEG) * phase(t, timing.start, timing.end);
}

// timing = { back: {start,end}, fwd: {start,end} } — aus elTiming()
// Phase 1: Unterarm dreht ZURÜCK (entgegen Schulter) → bleibt hinter Kopf
// Phase 2: Unterarm peitscht VORWÄRTS durch den Schlag
function elOffset(t, timing) {
	const back = -(EL_BACK_DEG * DEG) * phase(t, timing.back.start, timing.back.end);
	const fwd  =  (EL_FWD_DEG  * DEG) * phase(t, timing.fwd.start,  timing.fwd.end);
	return EL_OFFSET_START + back + fwd;
}

// ─── Kinematik linker Arm ─────────────────────────────────────────────────────
// Phase 1: Oberarm hebt von -30° nach -90° (senkrecht nach oben) während des Anlaufs.
// Phase 2: Sobald der rechte Armschwung startet, dreht der Oberarm im UZS nach unten (+90°).
//          Unterarm bleibt dabei immer senkrecht nach oben zeigend (Weltwinkel = -90°).
const LA_TOTAL_DEG  = -60;    // Heben: -30° → -90°
const LA_PULL_DEG   = +180;   // Einziehen im UZS: -90° → +90° (Oberarm zeigt nach unten)
const LA_PULL_DUR   =  0.20;  // Dauer des Einziehens in s

function leftUaAngle(t, shStart) {
	// Phase 1: Heben
	const raise = LA_TOTAL_DEG * DEG * phase(t, LA_SH_START, LA_SH_END);
	// Phase 2: Einziehen im UZS — startet wenn der rechte Armschwung beginnt
	const pullStart = JUMP_T + shStart;
	const pull = LA_PULL_DEG * DEG * phase(t, pullStart, pullStart + LA_PULL_DUR);
	return LA_UA_ANGLE_START + raise + pull;
}

// ─── Arm-Weltpositionen berechnen ─────────────────────────────────────────────
// timings = { hip, sh, el } — Timing-Objekte aus hipTiming/shTiming/elTiming
// peakHipAngle:    null = normaler Schwung, Zahl = Winkel beim Peak (für Torso-Rückkehr)
// peakT:           null = kein Return, Zahl = Zeitpunkt des Peaks (absolut)
function computeArm(t, hipX, timings, peakHipAngle = null, peakT = null) {
	// tSim: Zeit seit Absprung — Arm-Kinematik läuft erst ab Absprung
	const ts = Math.max(0, toTSim(t));

	// Torso-Winkel (basierend auf tSim)
	let tA = torsoSwingAngle(ts, timings.hip);
	if (peakHipAngle !== null && peakT !== null && t > peakT) {
		const returnEnd = peakT + HIP_RETURN_DUR;
		tA = peakHipAngle + (TORSO_ANGLE_UPRIGHT - peakHipAngle) * phase(t, peakT, returnEnd);
	}

	const uaA  = uaAngle(ts, timings.sh);
	const laA  = uaA + elOffset(ts, timings.el);
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
function computeLeftArm(t, shPos, shStart = PEAK_T_SIM) {
	// Linke Schulter sitzt im Seitenriss leicht vor dem Körper (= nach rechts/vorne)
	const lShPos = { x: shPos.x + 8, y: shPos.y + 4 };
	const luaA   = leftUaAngle(t, shStart);
	const lElPos = {
		x: lShPos.x + Math.cos(luaA) * UA_LEN,
		y: lShPos.y + Math.sin(luaA) * UA_LEN
	};
	// Unterarm zeigt immer senkrecht nach oben (Weltwinkel = -90°)
	const lHandPos = {
		x: lElPos.x + Math.cos(-Math.PI / 2) * LA_LEN,
		y: lElPos.y + Math.sin(-Math.PI / 2) * LA_LEN
	};
	return { lShPos, lElPos, lHandPos, luaA };
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────
const LS_KEY = 'vb_hand_velocity_v1';

function lsLoad() {
	if (!browser) return {};
	try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}

function lsSave(patch) {
	if (!browser) return;
	try {
		const prev = lsLoad();
		localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...patch }));
	} catch {}
}

// ─── Umrechnung °/s → m/s für Anzeige ────────────────────────────────────────
const R_HIP = (TORSO_LEN + UA_LEN + LA_LEN) / PX_PER_M;
const R_SH  = (UA_LEN + LA_LEN) / PX_PER_M;
const R_EL  = LA_LEN / PX_PER_M;
const degSToMS = (wDeg, r) => (wDeg * Math.PI / 180 * r).toFixed(1);

// ─── Slider-Defaults ─────────────────────────────────────────────────────────
const W_HIP_DEF = 230;
const W_SH_DEF  = 570;
const W_EL_DEF  = 800;
const V_RUN_DEF = 3.0;

const _ls = lsLoad();
let wHip = $state(Math.max(50, _ls.wHip ?? W_HIP_DEF));
let wSh  = $state(_ls.wSh  ?? W_SH_DEF);
let wEl  = $state(_ls.wEl  ?? W_EL_DEF);
let vRun = $state(_ls.vRun ?? V_RUN_DEF);

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

	// ── Timing-Objekte einmalig berechnen (abhängig von Slider-Werten) ────
	const shT = shTiming(wSh);
	const timings = {
		hip: hipTiming(wHip),
		sh:  shT,
		el:  elTiming(wEl, shT)
	};

	const vxPerFrame = vRun * PX_PER_M / FPS;
	let hipX = W * 0.25;

	// ── Einziger Pass: alle Frames berechnen ─────────────────────────────
	const newFrames  = [];
	const newHistory = [];
	let prevHandPos = null;
	let t0 = 0, hx0 = hipX;

	while (t0 <= SIM_TOTAL + DT * 0.5) {
		const arm  = computeArm(t0, hx0, timings);
		const left = computeLeftArm(t0, arm.shPos, shT.start);

		let vxHandMS = 0, vyHandMS = 0;
		if (prevHandPos) {
			vxHandMS = ((arm.handPos.x - prevHandPos.x) / PX_PER_M) / DT;
			vyHandMS = ((arm.handPos.y - prevHandPos.y) / PX_PER_M) / DT;
		}
		prevHandPos = { ...arm.handPos };

		newFrames.push({
			t:        t0,
			hipX:     hx0,
			tA:       arm.tA,
			uaA:      arm.uaA,
			laA:      arm.laA,
			hipPos:   { ...arm.hipPos },
			shPos:    { ...arm.shPos },
			elPos:    { ...arm.elPos },
			handPos:  { ...arm.handPos },
			vHand:    vxHandMS,
			vyHand:   vyHandMS,
			lShPos:   { ...left.lShPos },
			lElPos:   { ...left.lElPos },
			lHandPos: { ...left.lHandPos },
			ballPos:  { x: 0, y: 0 },   // wird unten gesetzt
			ballLoosed: false,
			isPeak:     false
		});

		if (newHistory.length === 0 || t0 - newHistory[newHistory.length - 1].t >= 0.025) {
			newHistory.push({ t: t0, v: vxHandMS });
		}

		t0 += DT; hx0 += vxPerFrame;
	}

	// ── peakIdx = Frame mit maximalem vx_hand ────────────────────────────
	let peakIdx = 0;
	for (let i = 1; i < newFrames.length; i++) {
		if (newFrames[i].vHand > newFrames[peakIdx].vHand) peakIdx = i;
	}
	newFrames[peakIdx].isPeak = true;
	vHandXMax = newFrames[peakIdx].vHand;
	const peakT        = newFrames[peakIdx].t;
	const peakHipAngle = newFrames[peakIdx].tA;

	// ── Torso-Rückkehr: Frames nach Peak mit aufrechtem Torso neu berechnen ─
	for (let i = peakIdx + 1; i < newFrames.length; i++) {
		const { t: ft, hipX: fhipX } = newFrames[i];
		const arm = computeArm(ft, fhipX, timings, peakHipAngle, peakT);
		newFrames[i].tA      = arm.tA;
		newFrames[i].uaA     = arm.uaA;
		newFrames[i].laA     = arm.laA;
		newFrames[i].hipPos  = { ...arm.hipPos };
		newFrames[i].shPos   = { ...arm.shPos };
		newFrames[i].elPos   = { ...arm.elPos };
		newFrames[i].handPos = { ...arm.handPos };
		// Linken Arm ebenfalls aktualisieren (Schulterposition ändert sich)
		const left = computeLeftArm(ft, arm.shPos, shT.start);
		newFrames[i].lShPos   = { ...left.lShPos };
		newFrames[i].lElPos   = { ...left.lElPos };
		newFrames[i].lHandPos = { ...left.lHandPos };
	}

	// ── tossIdx = Frame am nächsten zu TOSS_T ────────────────────────────
	let tossIdx = 0;
	let bestDist = Infinity;
	for (let i = 0; i < newFrames.length; i++) {
		const d = Math.abs(newFrames[i].t - TOSS_T);
		if (d < bestDist) { bestDist = d; tossIdx = i; }
	}
	for (let i = tossIdx; i < newFrames.length; i++) newFrames[i].ballLoosed = true;

	// ── Ball-Wurfphysik ───────────────────────────────────────────────────
	// Ball soll bei peakT exakt an der Position der rechten Hand sein.
	// Parabelgleichung rückwärts: vy_toss = (y_target - y_toss - 0.5*G_PX*dt²) / dt
	const tossFrame   = newFrames[tossIdx];
	const peakFrame   = newFrames[peakIdx];
	const tossLeft    = computeLeftArm(tossFrame.t, tossFrame.shPos, shT.start);
	const ballTossPos = { ...tossLeft.lHandPos };
	const dtToss      = peakT - tossFrame.t;
	const ballTossVy  = (peakFrame.handPos.y - ballTossPos.y - 0.5 * G_PX * dtToss * dtToss) / dtToss;
	const ballTossVx  = (peakFrame.handPos.x - ballTossPos.x) / dtToss;

	// Ball-Impuls nach Schlag: horizontale Komponente aus Hand, vertikale so dass Winkel = 10° nach oben
	const ballVx0 = peakFrame.vHand * PX_PER_M;
	const ballVy0 = -Math.abs(ballVx0) * Math.tan(10 * Math.PI / 180);  // 10° über Horizont
	const ballStartPos = { ...peakFrame.handPos };

	// ── Ball-Positionen in alle Frames schreiben ──────────────────────────
	for (let i = 0; i < newFrames.length; i++) {
		const f = newFrames[i];
		if (i < tossIdx) {
			// Ball in linker Hand
			f.ballPos = { ...f.lHandPos };
		} else if (i < peakIdx) {
			// Ball fliegt als Parabel zur rechten Hand
			const elapsed = f.t - tossFrame.t;
			f.ballPos = {
				x: ballTossPos.x + ballTossVx * elapsed,
				y: ballTossPos.y + ballTossVy * elapsed + 0.5 * G_PX * elapsed * elapsed
			};
		} else {
			// Nach Schlag: Ball mit Handimpuls
			const elapsed = f.t - peakT;
			f.ballPos = {
				x: ballStartPos.x + ballVx0 * elapsed,
				y: ballStartPos.y + ballVy0 * elapsed + 0.5 * G_PX * elapsed * elapsed
			};
		}
	}

	frames  = newFrames;
	history = newHistory;

	scrubFrame  = 0;
	scrubActive = true;
	simTime     = frames[0].t;
	vHandX      = frames[0].vHand;
	handVelocityMax.set(vHandXMax);
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
	const hipX    = W * 0.25;
	const shT     = shTiming(wSh);
	const timings = { hip: hipTiming(wHip), sh: shT, el: elTiming(wEl, shT) };
	const arm     = computeArm(0, hipX, timings);
	const left    = computeLeftArm(0, arm.shPos);
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

function drawFrame(snap) {
	if (!overlayCanvas) return;
	const ctx = overlayCanvas.getContext('2d');
	ctx.clearRect(0, 0, W, H);
	// Hintergrund
	ctx.fillStyle = '#f8fafc';
	ctx.fillRect(0, 0, W, H);

	// ── Boden ──────────────────────────────────────────────────────────
	ctx.fillStyle = '#e2e8f0';
	ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
	ctx.strokeStyle = '#94a3b8';
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
	ctx.strokeStyle = '#818cf8';
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
	ctx.fillStyle = '#64748b';
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
	ctx.strokeStyle = '#2563eb';
	const ts = Math.max(0, snap.t - JUMP_T);
	const inAir = snap.t > JUMP_T && snap.hipPos.y < HIP_Y0 - 2;

	const hasLanded = snap.t > JUMP_T && !inAir;

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
	} else if (hasLanded) {
		// Nach der Landung: Beine gerade (stehend)
		const footOffY = Math.round(0.45 * PX_PER_M);
		ctx.beginPath();
		ctx.moveTo(hipPos.x - 6, hipPos.y);
		ctx.lineTo(hipPos.x - 6, hipPos.y + footOffY);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(hipPos.x + 6, hipPos.y);
		ctx.lineTo(hipPos.x + 6, hipPos.y + footOffY);
		ctx.stroke();
	} else {
		// Laufzyklus: 4 Schritte über JUMP_T.
		// 1 Schritt = 1 Halbwelle des Pendels. 4 Schritte = 2 volle Zyklen.
		// (tClamped / JUMP_T) läuft 0→1, * 2 * 2π = 2 volle Zyklen = 4 Halbwellen.
		const tClamped  = Math.min(snap.t, JUMP_T);
		const stepPhase = tClamped / JUMP_T;   // 0 → 1 über den gesamten Anlauf
		const swingAng  = Math.sin(stepPhase * Math.PI * 4) * 0.35; // 4 Halbwellen = 4 Schritte
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
	ctx.fillStyle = '#2563eb';
	ctx.fill();

	// ── Torso ──────────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(hipPos.x, hipPos.y);
	ctx.lineTo(shPos.x, shPos.y);
	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth   = 6;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Kopf ───────────────────────────────────────────────────────────
	const kopfX = shPos.x + Math.cos(snap.tA) * 14;
	const kopfY = shPos.y + Math.sin(snap.tA) * 14;
	ctx.beginPath();
	ctx.arc(kopfX, kopfY, 11, 0, Math.PI * 2);
	ctx.fillStyle = '#93c5fd';
	ctx.strokeStyle = '#2563eb';
	ctx.lineWidth = 1.5;
	ctx.fill();
	ctx.stroke();

	// ── Schulter-Punkt ─────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(shPos.x, shPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#64748b';
	ctx.fill();

	// ── Rechter Oberarm ────────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(shPos.x, shPos.y);
	ctx.lineTo(elPos.x, elPos.y);
	ctx.strokeStyle = '#059669';
	ctx.lineWidth   = 7;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Rechter Ellbogen ───────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(elPos.x, elPos.y, 5, 0, Math.PI * 2);
	ctx.fillStyle = '#64748b';
	ctx.fill();

	// ── Rechter Unterarm ───────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(elPos.x, elPos.y);
	ctx.lineTo(handPos.x, handPos.y);
	ctx.strokeStyle = '#d97706';
	ctx.lineWidth   = 5;
	ctx.lineCap     = 'round';
	ctx.stroke();

	// ── Rechte Hand ────────────────────────────────────────────────────
	ctx.beginPath();
	ctx.arc(handPos.x, handPos.y, 6, 0, Math.PI * 2);
	ctx.fillStyle = '#f59e0b';
	ctx.fill();

	// ── Peak-Markierung ────────────────────────────────────────────────
	if (snap.isPeak) {
		ctx.beginPath();
		ctx.arc(handPos.x, handPos.y, 10, 0, Math.PI * 2);
		ctx.strokeStyle = '#dc2626';
		ctx.lineWidth   = 2;
		ctx.setLineDash([3, 3]);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = '#dc2626';
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

	// Dynamische Skala: Maximum der Kurve + 20% Puffer, mind. 5 m/s
	const vMax = Math.max(5, ...history.map(h => Math.abs(h.v)));
	const V_DISP = Math.ceil(vMax * 1.2);

	ctx.fillStyle = 'rgba(241,245,249,0.92)';
	if (ctx.roundRect) ctx.roundRect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H, 4);
	else ctx.rect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H);
	ctx.fill();
	ctx.strokeStyle = '#e2e8f0';
	ctx.lineWidth = 1;
	ctx.beginPath();
	if (ctx.roundRect) ctx.roundRect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H, 4);
	else ctx.rect(HIST_PAD, HIST_Y0, HIST_W_PX, HIST_H);
	ctx.stroke();

	ctx.strokeStyle = '#cbd5e1';
	ctx.setLineDash([4, 4]);
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(HIST_PAD, ZERO_Y); ctx.lineTo(HIST_PAD + HIST_W_PX, ZERO_Y);
	ctx.stroke();
	ctx.setLineDash([]);

	ctx.fillStyle = '#94a3b8';
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
	ctx.strokeStyle = snap.vHand < 0 ? '#dc2626' : snap.vHand < 10 ? '#d97706' : '#059669';
	ctx.stroke();

	// Scrubber-Cursor
	if (scrubActive) {
		const cursorX = HIST_PAD + (snap.t / T_MAX) * HIST_W_PX;
		ctx.strokeStyle = 'rgba(15,23,42,0.5)';
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
		ctx.fillStyle = '#0f172a';
		ctx.fill();
	}
}

// ─── Slider → localStorage ────────────────────────────────────────────────────
// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMount(() => { startSim(); });
</script>

<!-- ─── Template ──────────────────────────────────────────────────────────────── -->
<div class="widget">
	<div class="sim-area">
		<canvas bind:this={overlayCanvas} class="overlay-canvas" width={W} height={H}></canvas>
	</div>

	<div class="metrics">
		<div class="metric">
			<span class="mlabel">Handgeschwindigkeit (aktuell)</span>
			<span class="mval" class:neg={vHandX < 0}>{vHandX.toFixed(1)} m/s</span>
		</div>
		<div class="metric">
			<span class="mlabel">Handgeschwindigkeit (Maximum)</span>
			<span class="mval peak">{vHandXMax.toFixed(1)} m/s ({(vHandXMax * 3.6).toFixed(1)} km/h)</span>
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
			<input id="s-run" type="range" min="0" max="8" step="0.1" value={vRun}
				oninput={e => { vRun = +e.target.value; lsSave({ vRun }); startSim(); }} />
		</div>
		<div class="srow">
			<label for="s-hip">Hüft-Rotation <span class="sval">{Math.round(wHip)} °/s — {degSToMS(wHip, R_HIP)} m/s</span></label>
			<input id="s-hip" type="range" min="50" max="700" step="10" value={wHip}
				oninput={e => { wHip = +e.target.value; lsSave({ wHip }); startSim(); }} />
		</div>
		<div class="srow">
			<label for="s-sh">Schulter-Schwung <span class="sval">{Math.round(wSh)} °/s — {degSToMS(wSh, R_SH)} m/s</span></label>
			<input id="s-sh" type="range" min="0" max="1500" step="10" value={wSh}
				oninput={e => { wSh = +e.target.value; lsSave({ wSh }); startSim(); }} />
		</div>
		<div class="srow">
			<label for="s-el">Ellbogen-Peitsche <span class="sval">{Math.round(wEl)} °/s — {degSToMS(wEl, R_EL)} m/s</span></label>
			<input id="s-el" type="range" min="0" max="2000" step="10" value={wEl}
				oninput={e => { wEl = +e.target.value; lsSave({ wEl }); startSim(); }} />
		</div>
	</div>
</div>

<style>
	.widget {
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
		padding: 1.25rem 1.5rem; color: #0f172a;
		font-family: system-ui, sans-serif; max-width: 700px; margin: 1.5rem auto;
	}


	.sim-area {
		position: relative; width: 100%; max-width: 680px;
		border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; line-height: 0;
	}
	.overlay-canvas { display: block; width: 100% !important; height: auto !important; }

	.metrics { display: flex; gap: 1.5rem; margin: 0.8rem 0 0.4rem; flex-wrap: wrap; }
	.metric { display: flex; flex-direction: column; gap: 2px; }
	.mlabel { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
	.mval { font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #059669; }
	.mval.neg  { color: #dc2626; }
	.mval.peak { color: #2563eb; }
	.mval.dim  { color: #64748b; font-size: 1rem; font-weight: 400; padding-top: 5px; }

	.scrubber-row {
		margin: 0.6rem 0 0.2rem; display: flex; flex-direction: column; gap: 3px;
		padding: 0.55rem 0.75rem; background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0;
	}
	.scrub-label { font-size: 0.8rem; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
	.scrub-info { color: #0f172a; font-variant-numeric: tabular-nums; }
	.scrub-time { color: #94a3b8; font-size: 0.75rem; margin-left: 0.4rem; }
	.scrub-slider { width: 100%; accent-color: #f59e0b; }

	.controls { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.55rem; }
	.srow { display: flex; flex-direction: column; gap: 2px; }
	.srow label { font-size: 0.8rem; color: #475569; display: flex; justify-content: space-between; }
	.sval { color: #0f172a; font-variant-numeric: tabular-nums; }
	input[type="range"] { width: 100%; accent-color: #3b82f6; }


</style>
