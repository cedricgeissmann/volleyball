<script lang="ts">
	/**
	 * IntentionAnimation — Draufsicht, kein Netz
	 *
	 * Zwei Spieler A (oben) und B (unten) auf einem 9m×16m Feld.
	 * Situation 1 (Standard): A spielt zu B, B spielt zurück.
	 * Situation 2 (S&P): A↔B im Wechsel, Rallye bis B nicht erreichbar.
	 *
	 * Einheitliche Phase-Verwaltung: ein `phaseStart`-Timestamp,
	 * ein `tickFn` der per rAF aufgerufen wird.
	 */

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W = 480;
	const SVG_H = 620;
	const MARGIN_L = 36, MARGIN_T = 24, MARGIN_R = 36, MARGIN_B = 24;
	const FIELD_W_M = 9.0, FIELD_H_M = 16.0;
	const FIELD_PX_W = SVG_W - MARGIN_L - MARGIN_R;
	const FIELD_PX_H = SVG_H - MARGIN_T - MARGIN_B;
	const PX_PER_M = Math.min(FIELD_PX_W / FIELD_W_M, FIELD_PX_H / FIELD_H_M);
	const DRAW_W = FIELD_W_M * PX_PER_M;
	const DRAW_H = FIELD_H_M * PX_PER_M;
	const FIELD_X = MARGIN_L + (FIELD_PX_W - DRAW_W) / 2;
	const FIELD_Y = MARGIN_T + (FIELD_PX_H - DRAW_H) / 2;

	function fx(xM: number) { return FIELD_X + xM * PX_PER_M; }
	function fy(yM: number) { return FIELD_Y + yM * PX_PER_M; }

	// ─── Stammpositionem ──────────────────────────────────────────────────────────
	const A_HOME = { x: 4.5, y: 2.5 };
	const B_HOME = { x: 4.5, y: 13.5 };
	const A_HOME_SVG = { x: fx(A_HOME.x), y: fy(A_HOME.y) };
	const B_HOME_SVG = { x: fx(B_HOME.x), y: fy(B_HOME.y) };

	const R_PLAYER = 15;
	const R_BALL = 10;

	// ─── Timing ───────────────────────────────────────────────────────────────────
	const MOVE_START_FRAC = 0.40;
	const DUR_STD_BALL  = 1600;
	const DUR_STD_OUT   = 1000;
	const DUR_STD_SHOW  = 1200;
	const DUR_STD_PAUSE = 2000;  // 2s Pause zwischen Durchläufen
	const DUR_SP_BALL   = 1100;
	const DUR_SP_ATTACK = 820;
	const DUR_SP_CONTACT = 200;
	const DUR_SP_PAUSE  = 2000;  // 2s Pause nach Fehler
	const SPEED_SLOW    = 3.2;   // m/s Spieler zum Ball
	const SPEED_RETURN  = 3.0;   // m/s zurück zur Stammpos (langsamer als Sprint)
	const RET_START_FRAC = 0.20; // Rücklauf beginnt erst wenn Ball 20% der Strecke hat

	// ─── Mathe ────────────────────────────────────────────────────────────────────
	function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
	function easeOut(x: number) { return 1 - (1 - x) * (1 - x); }
	function easeInOut(x: number) { return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2; }
	function dist2(ax: number, ay: number, bx: number, by: number) { return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2); }
	function angleOf(fx2: number, fy2: number, tx: number, ty: number) { return Math.atan2(ty - fy2, tx - fx2); }

	function bezier2(p0x: number, p0y: number, cpx: number, cpy: number, p1x: number, p1y: number, t: number) {
		const u = 1 - t;
		return { x: u*u*p0x + 2*u*t*cpx + t*t*p1x, y: u*u*p0y + 2*u*t*cpy + t*t*p1y };
	}

	function flatArcCp(from: {x:number,y:number}, to: {x:number,y:number}) {
		return { x: (from.x + to.x)/2 + (Math.random()*0.6-0.3), y: (from.y + to.y)/2 - 1.2 };
	}

	/**
	 * Zufälliges Ziel für den Hinflug von `from` Richtung `toHome`.
	 * Distanz = 65–80% von PLAYER_DIST, leichte seitliche Streuung (±1.5m).
	 */
	function randomTarget(from: {x:number,y:number}, toHome: {x:number,y:number}) {
		const angle = angleOf(from.x, from.y, toHome.x, toHome.y);
		const d = PLAYER_DIST * (0.65 + Math.random() * 0.15);
		const lateral = (Math.random() * 2 - 1) * 1.5;
		const isGoalB = toHome.y > 8;
		const rawY = from.y + Math.sin(angle) * d + Math.sin(angle + Math.PI/2) * lateral;
		return {
			x: Math.max(0, Math.min(FIELD_W_M, from.x + Math.cos(angle) * d + Math.cos(angle + Math.PI/2) * lateral)),
			y: isGoalB
				? Math.min(toHome.y, rawY)   // nicht weiter als B_HOME.y
				: Math.max(toHome.y, rawY),  // nicht weiter als A_HOME.y
		};
	}

	function canReach(home: {x:number,y:number}, target: {x:number,y:number}, durationMs: number) {
		const dM = dist2(home.x, home.y, target.x, target.y);
		return (dM / SPEED_SLOW) * 1000 <= (1 - MOVE_START_FRAC) * durationMs;
	}

	// ─── Schulter ─────────────────────────────────────────────────────────────────
	/**
	 * Schulterwinkel: senkrecht auf die relevante Richtung.
	 * Mit Absicht: senkrecht zur Ziellinie (contact→goal).
	 * Ohne Absicht: senkrecht zur Laufrichtung (runFrom→contact).
	 */
	function calcShoulderAngle(
		contact: {x:number,y:number},
		goal: {x:number,y:number},
		runFrom: {x:number,y:number},
		withIntent: boolean
	) {
		if (withIntent) {
			return angleOf(contact.x, contact.y, goal.x, goal.y) + Math.PI / 2;
		} else {
			return angleOf(runFrom.x, runFrom.y, contact.x, contact.y) + Math.PI / 2;
		}
	}

	/** Schulterachse initial: senkrecht zur Verbindungslinie */
	function initShoulderAngle(fromHome: {x:number,y:number}, toHome: {x:number,y:number}) {
		return angleOf(fromHome.x, fromHome.y, toHome.x, toHome.y) + Math.PI / 2;
	}

	function shoulderLineSvg(posM: {x:number,y:number}, angle: number, len = 28) {
		const cx = fx(posM.x), cy = fy(posM.y);
		return {
			x1: cx - Math.cos(angle) * len, y1: cy - Math.sin(angle) * len,
			x2: cx + Math.cos(angle) * len, y2: cy + Math.sin(angle) * len,
		};
	}

	// Feste Distanz zwischen Stammpositionem (A_HOME ↔ B_HOME)
	const PLAYER_DIST = dist2(A_HOME.x, A_HOME.y, B_HOME.x, B_HOME.y); // ≈ 11m

	function calcBallLanding(
		contact: {x:number,y:number},
		goal: {x:number,y:number},
		runFrom: {x:number,y:number},
		withIntent: boolean
	) {
		const toGoal = angleOf(contact.x, contact.y, goal.x, goal.y);

		// Ballflugdistanz: 65–80% von PLAYER_DIST
		const d = PLAYER_DIST * (0.65 + Math.random() * 0.15);

		let angle: number;
		if (withIntent) {
			angle = toGoal;
		} else {
			// Seitlicher Fehler durch falsche Schulterausrichtung
			const runDir = angleOf(runFrom.x, runFrom.y, contact.x, contact.y);
			let delta = runDir - toGoal;
			while (delta >  Math.PI) delta -= 2 * Math.PI;
			while (delta < -Math.PI) delta += 2 * Math.PI;
			const maxDelta = Math.PI / 3;
			angle = toGoal + Math.max(-maxDelta, Math.min(maxDelta, delta));
		}

		// Ball nie über die Stammposition des Zielspielers hinaus:
		// goal.y bestimmt ob Ziel oben (A, y≈2.5) oder unten (B, y≈13.5)
		const isGoalA = goal.y < 8;
		return {
			x: Math.max(0, Math.min(FIELD_W_M, contact.x + Math.cos(angle) * d)),
			y: isGoalA
				? Math.max(goal.y, contact.y + Math.sin(angle) * d)   // nicht weiter als A_HOME.y (oben)
				: Math.min(goal.y, contact.y + Math.sin(angle) * d),  // nicht weiter als B_HOME.y (unten)
		};
	}

	// ─── Reaktiver Zustand ────────────────────────────────────────────────────────
	let situation    = $state<'standard' | 'salzpfeffer'>('standard');
	let withIntention = $state(false);
	let running      = $state(false);

	// Spielerpositionen
	let aPosM = $state({ ...A_HOME });
	let bPosM = $state({ ...B_HOME });

	// Ball
	let ballSvgX = $state(fx(A_HOME.x));
	let ballSvgY = $state(fy(A_HOME.y));
	let ballVisible = $state(false);

	// Schulterwinkel
	let bShoulderAngle = $state(initShoulderAngle(B_HOME, A_HOME));
	let aShoulderAngle = $state(initShoulderAngle(A_HOME, B_HOME));

	// Vorschau
	let showPreviewBall  = $state(false);
	let showPreviewRunB  = $state(false);
	let showPreviewRunA  = $state(false);
	let showOutgoing     = $state(false);

	// Ballflug-Kurve (Standard)
	let ballFromSvg = $state({ x: fx(A_HOME.x), y: fy(A_HOME.y) });
	let ballToSvg   = $state({ x: fx(B_HOME.x), y: fy(B_HOME.y) });
	let ballCpSvg   = $state({ x: fx(4.5),      y: fy(8.0) });

	// Rückspielweg (Standard)
	let outFromSvg = $state({ x: 0, y: 0 });
	let outToSvg   = $state({ x: 0, y: 0 });

	// Laufwegvorschau
	let bRunPreviewSvg = $state({ from: B_HOME_SVG, to: B_HOME_SVG });
	let aRunPreviewSvg = $state({ from: A_HOME_SVG, to: A_HOME_SVG });

	// Landepunkt (Standard, Anzeige)
	let landingPosM  = $state<{x:number,y:number}|null>(null);
	let landingDistM = $state(0);

	// S&P Fehlerzustand
	let spFailed = $state(false);
	let spFailedLabel = $state<'A'|'B'>('B');

	// Phasen-Label
	let phaseLabel = $state('Drücke Start');

	// ─── Ablauf-Engine ────────────────────────────────────────────────────────────
	// Jede Phase ist eine Funktion die von rAF aufgerufen wird.
	// Sie gibt true zurück wenn sie fertig ist (und lädt die nächste Phase).

	let rafId = 0;
	let phaseStart = 0;
	let currentPhase = 'idle';

	// Gemeinsam genutzte Hilfsdaten zwischen Phasen
	let _bTargetM = { ...B_HOME };
	let _bRunFromM = { ...B_HOME };
	let _outToM    = { x: A_HOME.x, y: A_HOME.y };
	let _outFromM  = { ...B_HOME };

	function elapsed() { return performance.now() - phaseStart; }

	function beginPhase(name: string) {
		currentPhase = name;
		phaseStart = performance.now();
	}

	function stopAll() {
		cancelAnimationFrame(rafId);
		rafId = 0;
		running = false;
		currentPhase = 'idle';
		phaseLabel = 'Gestoppt';
		ballVisible = false;
		showPreviewBall = false;
		showPreviewRunB = false;
		showPreviewRunA = false;
		showOutgoing    = false;
		spFailed = false;
		landingPosM = null;
		bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);
		aShoulderAngle = initShoulderAngle(A_HOME, B_HOME);
	}

	// ─── Standard ─────────────────────────────────────────────────────────────────

	function stdSetup() {
		_bTargetM = randomTarget(A_HOME, B_HOME);
		_bRunFromM = { ...B_HOME };

		const from = A_HOME, to = _bTargetM;
		const cp = flatArcCp(from, to);
		ballFromSvg = { x: fx(from.x), y: fy(from.y) };
		ballToSvg   = { x: fx(to.x),   y: fy(to.y) };
		ballCpSvg   = { x: fx(cp.x),   y: fy(cp.y) };

		bRunPreviewSvg = { from: { x: fx(B_HOME.x), y: fy(B_HOME.y) }, to: { x: fx(_bTargetM.x), y: fy(_bTargetM.y) } };

		aPosM = { ...A_HOME };
		bPosM = { ...B_HOME };
		ballSvgX = ballFromSvg.x;
		ballSvgY = ballFromSvg.y;
		ballVisible = true;
		landingPosM = null;
		showPreviewBall = true;
		showPreviewRunB = true;
		showOutgoing    = false;

		// Schulterwinkel B: senkrecht zum Mitspieler (Startzustand)
		bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);

		phaseLabel = 'Ball kommt zu Spieler B';
		beginPhase('std_flying');
	}

	function stdTick() {
		const e = elapsed();

		if (currentPhase === 'std_flying') {
			const t = easeOut(Math.min(1, e / DUR_STD_BALL));
			const pos = bezier2(ballFromSvg.x, ballFromSvg.y, ballCpSvg.x, ballCpSvg.y, ballToSvg.x, ballToSvg.y, t);
			ballSvgX = pos.x;
			ballSvgY = pos.y;

			// Schulter live aktualisieren bei Toggle
			bShoulderAngle = calcShoulderAngle(_bTargetM, A_HOME, B_HOME, withIntention);

			if (t >= MOVE_START_FRAC) {
				const moveT = easeInOut(Math.min(1, (t - MOVE_START_FRAC) / (1 - MOVE_START_FRAC)));
				bPosM = { x: lerp(B_HOME.x, _bTargetM.x, moveT), y: lerp(B_HOME.y, _bTargetM.y, moveT) };
				showPreviewRunB = false;
				phaseLabel = 'Spieler B läuft zum Ball';
			}

			if (e >= DUR_STD_BALL) {
				bPosM = { ..._bTargetM };
				ballSvgX = ballToSvg.x;
				ballSvgY = ballToSvg.y;
				showPreviewBall = false;
				beginPhase('std_contact');
				phaseLabel = 'Spieler B berührt den Ball';
			}
		}

		else if (currentPhase === 'std_contact') {
			if (e >= 180) {
				const land = calcBallLanding(_bTargetM, A_HOME, B_HOME, withIntention);
				_outFromM = { ..._bTargetM };
				_outToM   = { ...land };
				outFromSvg = { x: fx(_bTargetM.x), y: fy(_bTargetM.y) };
				outToSvg   = { x: fx(land.x),       y: fy(land.y) };
				showOutgoing = true;
				beginPhase('std_outgoing');
				phaseLabel = 'Ball fliegt…';
			}
		}

		else if (currentPhase === 'std_outgoing') {
			const t = easeOut(Math.min(1, e / DUR_STD_OUT));
			const pos = bezier2(outFromSvg.x, outFromSvg.y, (outFromSvg.x+outToSvg.x)/2, (outFromSvg.y+outToSvg.y)/2-12, outToSvg.x, outToSvg.y, t);
			ballSvgX = pos.x;
			ballSvgY = pos.y;

			// B kehrt zurück — erst nach 20% des Ballflugs
			if (t >= RET_START_FRAC) {
				const dRet = dist2(_bTargetM.x, _bTargetM.y, B_HOME.x, B_HOME.y);
				const retDur = Math.max(400, (dRet / SPEED_RETURN) * 1000);
				const retProgress = (e - RET_START_FRAC * DUR_STD_OUT) / retDur;
				const retT = easeOut(Math.min(1, retProgress));
				bPosM = { x: lerp(_bTargetM.x, B_HOME.x, retT), y: lerp(_bTargetM.y, B_HOME.y, retT) };
			}

			if (e >= DUR_STD_OUT) {
				showOutgoing = false;
				landingPosM  = { ..._outToM };
				landingDistM = dist2(_outToM.x, _outToM.y, A_HOME.x, A_HOME.y);
				phaseLabel = `Abweichung vom Ziel: ${landingDistM.toFixed(1)} m`;
				beginPhase('std_show');
			}
		}

		else if (currentPhase === 'std_show') {
			if (e >= DUR_STD_SHOW) {
				bPosM = { ...B_HOME };
				beginPhase('std_pause');
				phaseLabel = 'Nächste Runde…';
			}
		}

		else if (currentPhase === 'std_pause') {
			if (e >= DUR_STD_PAUSE) {
				stdSetup();
				// stdSetup hat beginPhase aufgerufen — rAF normal weiterlaufen lassen
			}
		}

		rafId = requestAnimationFrame(stdTick);
	}

	// ─── Salz & Pfeffer ───────────────────────────────────────────────────────────

	// SP-Flugdaten
	let spFrom    = $state({ ...A_HOME });
	let spTo      = $state({ ...B_HOME });
	let spFromSvg = $state({ x: fx(A_HOME.x), y: fy(A_HOME.y) });
	let spToSvg   = $state({ x: fx(B_HOME.x), y: fy(B_HOME.y) });
	let spCpSvg   = $state({ x: fx(4.5),      y: fy(8.0) });
	let spDur     = $state(DUR_SP_BALL);

	// SP-Rollen
	let spSender  = $state<'A'|'B'>('A');
	let spRecv    = $state<'A'|'B'>('B');
	let spSenderHome = $state({ ...A_HOME });
	let spRecvHome   = $state({ ...B_HOME });
	let spSenderPos  = $state({ ...A_HOME }); // wo Sender gerade steht beim Abspiel
	let spRecvPos    = $state({ ...B_HOME }); // wo Empfänger steht beim Abspiel
	let spContact    = $state({ ...B_HOME }); // wo Ball beim Empfänger landet

	// SP-Return-Hilfe
	let _spRetFrom      = { x: 0, y: 0 };
	let _spRetTo        = { x: 0, y: 0 };
	let _spRetDur       = 500;
	let _spRetDelay     = 0;   // ms – Rücklauf beginnt erst nach diesem Offset im sp_return-Tick
	let _spRetIsB       = true;

	// Nächste Runde nach Return
	let _spNext: {
		sender: 'A'|'B', recv: 'A'|'B',
		sHome: {x:number,y:number}, rHome: {x:number,y:number},
		sPos: {x:number,y:number}, rPos: {x:number,y:number},
	} | null = null;

	let spRound = 0;

	function spInitFlight(
		sender: 'A'|'B', recv: 'A'|'B',
		sHome: {x:number,y:number}, rHome: {x:number,y:number},
		sPos: {x:number,y:number},  rPos: {x:number,y:number},
	) {
		spSender = sender; spRecv = recv;
		spSenderHome = { ...sHome }; spRecvHome = { ...rHome };
		spSenderPos  = { ...sPos };  spRecvPos  = { ...rPos };

		// Zufälliges Ziel auf Seite des Empfängers
		const target = randomTarget(sPos, rHome);
		spContact = { ...target };

		// Ball-Kurve
		const cp = flatArcCp(sPos, target);
		spFrom    = { ...sPos };
		spTo      = { ...target };
		spFromSvg = { x: fx(sPos.x),   y: fy(sPos.y) };
		spToSvg   = { x: fx(target.x), y: fy(target.y) };
		spCpSvg   = { x: fx(cp.x),     y: fy(cp.y) };

		// Laufweg-Vorschau des Empfängers
		const recvCurPos = recv === 'B' ? bPosM : aPosM;
		if (recv === 'B') {
			bRunPreviewSvg = { from: { x: fx(recvCurPos.x), y: fy(recvCurPos.y) }, to: { x: fx(target.x), y: fy(target.y) } };
			showPreviewRunB = true;
			showPreviewRunA = false;
		} else {
			aRunPreviewSvg = { from: { x: fx(recvCurPos.x), y: fy(recvCurPos.y) }, to: { x: fx(target.x), y: fy(target.y) } };
			showPreviewRunA = true;
			showPreviewRunB = false;
		}

		// Schulterwinkel des Empfängers setzen
		if (recv === 'B') bShoulderAngle = calcShoulderAngle(target, sHome, rHome, withIntention);
		else              aShoulderAngle = calcShoulderAngle(target, sHome, rHome, withIntention);

		spDur = spRound % 3 === 2 ? DUR_SP_ATTACK : DUR_SP_BALL;
		showPreviewBall = true;

		phaseLabel = sender === 'A' ? 'A spielt zu B' : 'B spielt zu A';
		beginPhase('sp_flying');
	}

	function spTick() {
		const e = elapsed();

		if (currentPhase === 'sp_flying') {
			const t = easeOut(Math.min(1, e / spDur));
			const pos = bezier2(spFromSvg.x, spFromSvg.y, spCpSvg.x, spCpSvg.y, spToSvg.x, spToSvg.y, t);
			ballSvgX = pos.x;
			ballSvgY = pos.y;

			// Schulter live bei Toggle
			if (spRecv === 'B') bShoulderAngle = calcShoulderAngle(spContact, spSenderHome, spRecvHome, withIntention);
			else                aShoulderAngle = calcShoulderAngle(spContact, spSenderHome, spRecvHome, withIntention);

			// Empfänger läuft bei 40%
			if (t >= MOVE_START_FRAC) {
				const moveT = easeInOut(Math.min(1, (t - MOVE_START_FRAC) / (1 - MOVE_START_FRAC)));
				if (spRecv === 'B') {
					bPosM = { x: lerp(spRecvPos.x, spContact.x, moveT), y: lerp(spRecvPos.y, spContact.y, moveT) };
					showPreviewRunB = false;
				} else {
					aPosM = { x: lerp(spRecvPos.x, spContact.x, moveT), y: lerp(spRecvPos.y, spContact.y, moveT) };
					showPreviewRunA = false;
				}
				phaseLabel = `${spRecv} läuft zum Ball`;
			}

			if (e >= spDur) {
				if (spRecv === 'B') bPosM = { ...spContact };
				else                aPosM = { ...spContact };
				showPreviewBall = false;
				ballSvgX = spToSvg.x;
				ballSvgY = spToSvg.y;

				// Kann Spieler Ball erreichen?
				const rHome = spRecv === 'B' ? B_HOME : A_HOME;
				if (!withIntention && !canReach(rHome, spContact, spDur)) {
					spFailed = true;
					spFailedLabel = spRecv;
					phaseLabel = `${spRecv} erreicht den Ball nicht rechtzeitig!`;
					beginPhase('sp_failed');
				} else {
					beginPhase('sp_contact');
					phaseLabel = `${spRecv} berührt den Ball`;
				}
			}
		}

		else if (currentPhase === 'sp_contact') {
			if (e >= DUR_SP_CONTACT) {
				spRound++;

				// Rückspiel berechnen
				const contact = { ...spContact };
				const land = calcBallLanding(contact, spSenderHome, spRecvHome, withIntention);

				// Clamp auf Zielfeld
				const nextRecv: 'A'|'B' = spRecv === 'B' ? 'A' : 'B';
				land.x = Math.max(0.2, Math.min(8.8, land.x));
				land.y = nextRecv === 'B'
					? Math.max(9.5, Math.min(15.5, land.y))
					: Math.max(0.5, Math.min(6.5, land.y));

				const nextSender  = spRecv;
				const nextSenderH = spRecvHome;
				const nextRecvH   = spSenderHome;
				const nextSenderP = spRecv === 'B' ? { ...bPosM } : { ...aPosM };
				const nextRecvP   = spRecv === 'B' ? { ...aPosM } : { ...bPosM };

				_spNext = { sender: nextSender, recv: nextRecv, sHome: nextSenderH, rHome: nextRecvH, sPos: nextSenderP, rPos: nextRecvP };

				// Sender läuft zurück zu Stammpos — erst nach RET_START_FRAC des nächsten Ballflugs
				const nextDur  = spRound % 3 === 2 ? DUR_SP_ATTACK : DUR_SP_BALL;
				const dRet     = dist2(nextSenderP.x, nextSenderP.y, nextSenderH.x, nextSenderH.y);
				_spRetFrom  = { ...nextSenderP };
				_spRetTo    = { ...nextSenderH };
				_spRetDur   = Math.max(280, (dRet / SPEED_RETURN) * 1000);
				_spRetDelay = RET_START_FRAC * nextDur;
				_spRetIsB   = nextSender === 'B';

				beginPhase('sp_return');
			}
		}

		else if (currentPhase === 'sp_return') {
			if (e >= _spRetDelay) {
				const retT = easeOut(Math.min(1, (e - _spRetDelay) / _spRetDur));
				if (_spRetIsB) bPosM = { x: lerp(_spRetFrom.x, _spRetTo.x, retT), y: lerp(_spRetFrom.y, _spRetTo.y, retT) };
				else           aPosM = { x: lerp(_spRetFrom.x, _spRetTo.x, retT), y: lerp(_spRetFrom.y, _spRetTo.y, retT) };
			}

			if (e >= _spRetDelay + _spRetDur) {
				const n = _spNext!;
				const sPos = n.sender === 'B' ? { ...bPosM } : { ...aPosM };
				const rPos = n.recv   === 'B' ? { ...bPosM } : { ...aPosM };
				spInitFlight(n.sender, n.recv, n.sHome, n.rHome, sPos, rPos);
				// spInitFlight hat beginPhase gesetzt — rAF normal weiterlaufen lassen
			}
		}

		else if (currentPhase === 'sp_failed') {
			if (e >= DUR_SP_PAUSE) {
				spFailed = false;
				spRound = 0;
				// Spieler bleiben wo sie sind — der gescheiterte Spieler läuft
				// von seiner aktuellen Position zum nächsten Ball
				bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);
				aShoulderAngle = initShoulderAngle(A_HOME, B_HOME);
				// A serviert neu, Empfänger (B) startet von aktueller Pos
				spInitFlight('A', 'B', A_HOME, B_HOME, A_HOME, { ...bPosM });
				// spInitFlight hat beginPhase gesetzt — rAF normal weiterlaufen lassen
			}
		}

		rafId = requestAnimationFrame(spTick);
	}

	// ─── Start / Stop ─────────────────────────────────────────────────────────────
	function startAnimation() {
		cancelAnimationFrame(rafId);
		running = true;
		spFailed = false;
		landingPosM = null;

		if (situation === 'standard') {
			stdSetup();
			rafId = requestAnimationFrame(stdTick);
		} else {
			spRound = 0;
			aPosM = { ...A_HOME };
			bPosM = { ...B_HOME };
			ballVisible = true;
			bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);
			aShoulderAngle = initShoulderAngle(A_HOME, B_HOME);
			spInitFlight('A', 'B', A_HOME, B_HOME, A_HOME, B_HOME);
			rafId = requestAnimationFrame(spTick);
		}
	}

	function switchSituation(s: 'standard' | 'salzpfeffer') {
		stopAll();
		situation = s;
		aPosM = { ...A_HOME };
		bPosM = { ...B_HOME };
		ballVisible = false;
		phaseLabel = 'Drücke Start';
		bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);
		aShoulderAngle = initShoulderAngle(A_HOME, B_HOME);
	}

	// Toggle im Ruhezustand: Schulter auf senkrecht zum Mitspieler
	$effect(() => {
		void withIntention;
		if (!running) {
			bShoulderAngle = initShoulderAngle(B_HOME, A_HOME);
			aShoulderAngle = initShoulderAngle(A_HOME, B_HOME);
		}
	});

	$effect(() => {
		return () => cancelAnimationFrame(rafId);
	});

	// ─── Derived SVG ─────────────────────────────────────────────────────────────
	let aSvgX = $derived(fx(aPosM.x));
	let aSvgY = $derived(fy(aPosM.y));
	let bSvgX = $derived(fx(bPosM.x));
	let bSvgY = $derived(fy(bPosM.y));

	let bShoulder = $derived(shoulderLineSvg(bPosM, bShoulderAngle, 28));
	let aShoulder = $derived(shoulderLineSvg(aPosM, aShoulderAngle, 28));
	let shoulderColor = $derived(withIntention ? '#2E7D32' : '#C62828');

	let landingSvg = $derived(landingPosM ? { x: fx(landingPosM.x), y: fy(landingPosM.y) } : null);

	let ballPreviewPath = $derived(
		`M ${ballFromSvg.x.toFixed(1)} ${ballFromSvg.y.toFixed(1)} Q ${ballCpSvg.x.toFixed(1)} ${ballCpSvg.y.toFixed(1)} ${ballToSvg.x.toFixed(1)} ${ballToSvg.y.toFixed(1)}`
	);
	let spBallPreviewPath = $derived(
		`M ${spFromSvg.x.toFixed(1)} ${spFromSvg.y.toFixed(1)} Q ${spCpSvg.x.toFixed(1)} ${spCpSvg.y.toFixed(1)} ${spToSvg.x.toFixed(1)} ${spToSvg.y.toFixed(1)}`
	);

	function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 9): string {
		const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy);
		if (len < 1) return '';
		const ux = dx/len, uy = dy/len, px = -uy, py = ux;
		return `${x2},${y2} ${x2-ux*size+px*size*0.5},${y2-uy*size+py*size*0.5} ${x2-ux*size-px*size*0.5},${y2-uy*size-py*size*0.5}`;
	}
</script>

<div class="ia-wrapper">

	<!-- ── Situation Tabs (S&P vorübergehend deaktiviert) ───────────────────── -->
	<!--
	<div class="ia-tabs">
		<button class="ia-tab" class:active={situation === 'standard'} onclick={() => switchSituation('standard')}>
			Standardsituation
		</button>
		<button class="ia-tab" class:active={situation === 'salzpfeffer'} onclick={() => switchSituation('salzpfeffer')}>
			Salz &amp; Pfeffer
		</button>
	</div>
	-->

	<!-- ── SVG Spielfeld ──────────────────────────────────────────────────────── -->
	<svg viewBox="0 0 {SVG_W} {SVG_H}" style="width: 100%; max-width: {SVG_W}px; display: block; margin: 0 auto;" aria-label="Volleyball-Spielfeld Draufsicht">
		<!-- Feldhintergrund -->
		<rect x={fx(0)} y={fy(0)} width={fx(9)-fx(0)} height={fy(16)-fy(0)} fill="#c8e6a0" rx="3" />
		<!-- Feldlinien -->
		<rect x={fx(0)} y={fy(0)} width={fx(9)-fx(0)} height={fy(16)-fy(0)} fill="none" stroke="white" stroke-width="2.5" />
		<!-- Mittellinie -->
		<line x1={fx(0)} y1={fy(8)} x2={fx(9)} y2={fy(8)} stroke="white" stroke-width="1.5" stroke-dasharray="8,5" opacity="0.5" />

		<!-- Stammpositions-Kreuze -->
		{#each [A_HOME_SVG, B_HOME_SVG] as pos}
			<line x1={pos.x-9} y1={pos.y} x2={pos.x+9} y2={pos.y} stroke="rgba(255,255,255,0.5)" stroke-width="1.5" />
			<line x1={pos.x} y1={pos.y-9} x2={pos.x} y2={pos.y+9} stroke="rgba(255,255,255,0.5)" stroke-width="1.5" />
		{/each}

		<!-- Vorschau Ballweg -->
		{#if showPreviewBall && situation === 'standard'}
			<path d={ballPreviewPath} fill="none" stroke="#555" stroke-width="1.8" stroke-dasharray="7,4" opacity="0.6" />
			<polygon points={arrowHead(ballCpSvg.x, ballCpSvg.y, ballToSvg.x, ballToSvg.y)} fill="#555" opacity="0.55" />
		{/if}
		<!-- S&P Ballweg-Vorschau (deaktiviert)
		{#if showPreviewBall && situation === 'salzpfeffer'}
			<path d={spBallPreviewPath} fill="none" stroke="#555" stroke-width="1.8" stroke-dasharray="7,4" opacity="0.6" />
			<polygon points={arrowHead(spCpSvg.x, spCpSvg.y, spToSvg.x, spToSvg.y)} fill="#555" opacity="0.55" />
		{/if}
		-->

		<!-- Vorschau Laufweg B -->
		{#if showPreviewRunB}
			<line x1={bRunPreviewSvg.from.x} y1={bRunPreviewSvg.from.y} x2={bRunPreviewSvg.to.x} y2={bRunPreviewSvg.to.y}
				stroke="#C62828" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.5" />
			<polygon points={arrowHead(bRunPreviewSvg.from.x, bRunPreviewSvg.from.y, bRunPreviewSvg.to.x, bRunPreviewSvg.to.y)}
				fill="#C62828" opacity="0.45" />
		{/if}

		<!-- Vorschau Laufweg A — S&P (deaktiviert)
		{#if showPreviewRunA && situation === 'salzpfeffer'}
			<line x1={aRunPreviewSvg.from.x} y1={aRunPreviewSvg.from.y} x2={aRunPreviewSvg.to.x} y2={aRunPreviewSvg.to.y}
				stroke="#1565C0" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.5" />
			<polygon points={arrowHead(aRunPreviewSvg.from.x, aRunPreviewSvg.from.y, aRunPreviewSvg.to.x, aRunPreviewSvg.to.y)}
				fill="#1565C0" opacity="0.45" />
		{/if}
		-->

		<!-- Rückspielweg (Standard nach Berührung) -->
		{#if showOutgoing}
			<line x1={outFromSvg.x} y1={outFromSvg.y} x2={outToSvg.x} y2={outToSvg.y}
				stroke="#888" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.5" />
		{/if}

		<!-- Landepunkt (Standard) -->
		{#if landingSvg}
			<circle cx={landingSvg.x} cy={landingSvg.y} r="13" fill="rgba(211,47,47,0.15)" stroke="#D32F2F" stroke-width="2" />
			<line x1={landingSvg.x-7} y1={landingSvg.y-7} x2={landingSvg.x+7} y2={landingSvg.y+7} stroke="#D32F2F" stroke-width="2.5" stroke-linecap="round" />
			<line x1={landingSvg.x+7} y1={landingSvg.y-7} x2={landingSvg.x-7} y2={landingSvg.y+7} stroke="#D32F2F" stroke-width="2.5" stroke-linecap="round" />
			<line x1={landingSvg.x} y1={landingSvg.y} x2={A_HOME_SVG.x} y2={A_HOME_SVG.y} stroke="#D32F2F" stroke-width="1.2" stroke-dasharray="4,3" opacity="0.4" />
		{/if}

		<!-- S&P Fehler-Ring (deaktiviert)
		{#if spFailed && situation === 'salzpfeffer'}
			{@const fp = spFailedLabel === 'B' ? bPosM : aPosM}
			<circle cx={fx(fp.x)} cy={fy(fp.y)} r={R_PLAYER+12} fill="none" stroke="#D32F2F" stroke-width="2.5" stroke-dasharray="5,3" />
		{/if}
		-->

		<!-- Schulterachse A — S&P (deaktiviert)
		{#if situation === 'salzpfeffer'}
			<line x1={aShoulder.x1} y1={aShoulder.y1} x2={aShoulder.x2} y2={aShoulder.y2}
				stroke={shoulderColor} stroke-width="3" stroke-linecap="round" opacity="0.85" />
		{/if}
		-->

		<!-- Schulterachse B -->
		<line x1={bShoulder.x1} y1={bShoulder.y1} x2={bShoulder.x2} y2={bShoulder.y2}
			stroke={shoulderColor} stroke-width="3" stroke-linecap="round" opacity="0.85" />

		<!-- Spieler A -->
		<circle cx={aSvgX+1} cy={aSvgY+2} r={R_PLAYER} fill="rgba(0,0,0,0.2)" />
		<circle cx={aSvgX} cy={aSvgY} r={R_PLAYER} fill="#1565C0" stroke="white" stroke-width="2" />
		<text x={aSvgX} y={aSvgY} text-anchor="middle" dominant-baseline="central" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">A</text>

		<!-- Spieler B -->
		<circle cx={bSvgX+1} cy={bSvgY+2} r={R_PLAYER} fill="rgba(0,0,0,0.2)" />
		<circle cx={bSvgX} cy={bSvgY} r={R_PLAYER} fill="#C62828" stroke="white" stroke-width="2" />
		<text x={bSvgX} y={bSvgY} text-anchor="middle" dominant-baseline="central" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">B</text>

		<!-- Ball -->
		{#if ballVisible}
			<circle cx={ballSvgX+1} cy={ballSvgY+2} r={R_BALL} fill="rgba(0,0,0,0.22)" />
			<circle cx={ballSvgX} cy={ballSvgY} r={R_BALL} fill="#F5F5F5" stroke="#555" stroke-width="1.8" />
			<path d="M {ballSvgX-R_BALL*0.6} {ballSvgY-R_BALL*0.35} Q {ballSvgX} {ballSvgY-R_BALL*0.8} {ballSvgX+R_BALL*0.6} {ballSvgY-R_BALL*0.35}" fill="none" stroke="#999" stroke-width="1" />
			<path d="M {ballSvgX-R_BALL*0.6} {ballSvgY+R_BALL*0.35} Q {ballSvgX} {ballSvgY+R_BALL*0.8} {ballSvgX+R_BALL*0.6} {ballSvgY+R_BALL*0.35}" fill="none" stroke="#999" stroke-width="1" />
		{/if}
	</svg>

	<!-- Phasen-Label -->
	<p class="ia-phase-label">{phaseLabel}</p>

	<!-- Steuerung -->
	<div class="ia-controls">
		{#if !running}
			<button class="ia-btn ia-btn-start" onclick={startAnimation}>▶ Start</button>
		{:else}
			<button class="ia-btn ia-btn-stop" onclick={stopAll}>■ Stop</button>
		{/if}
		<button class="ia-toggle" class:active={withIntention} onclick={() => { withIntention = !withIntention; }}>
			{withIntention ? '✓ Mit Absicht' : '✗ Ohne Absicht'}
		</button>
	</div>

	<!-- Legende -->
	<div class="ia-legend">
		<svg width="36" height="12" style="vertical-align: middle; margin-right: 4px; flex-shrink: 0;">
			<line x1="3" y1="6" x2="33" y2="6" stroke={shoulderColor} stroke-width="3" stroke-linecap="round" />
		</svg>
		<span>Schulterachse — {withIntention ? 'senkrecht zum Ziel' : 'folgt Laufrichtung'}</span>
	</div>

	<p class="ia-distance">
		{#if landingPosM}
			Abweichung vom Ziel (Spieler A): <strong>{landingDistM.toFixed(1)} m</strong>
		{:else}
			&nbsp;
		{/if}
	</p>

</div>

<style>
	.ia-wrapper {
		font-family: sans-serif;
		max-width: 520px;
		margin: 2rem auto;
		background: #fafafa;
		border: 1px solid #ddd;
		border-radius: 10px;
		padding: 1rem 1rem 0.8rem;
	}
	.ia-tabs { display: flex; gap: 8px; margin-bottom: 0.6rem; }
	.ia-tab {
		flex: 1; padding: 0.45rem 0.6rem;
		border: 1.5px solid #bbb; border-radius: 6px;
		background: #f0f0f0; cursor: pointer;
		font-size: 0.84rem; font-weight: 600; color: #555;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}
	.ia-tab.active { background: #1565C0; color: white; border-color: #1565C0; }
	.ia-phase-label {
		text-align: center; font-size: 0.87rem; color: #444;
		min-height: 1.3rem; margin: 0.35rem 0 0.45rem; font-style: italic;
	}
	.ia-phase-label.failed { color: #C62828; font-weight: bold; font-style: normal; }
	.ia-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 0.5rem; }
	.ia-btn {
		padding: 0.42rem 1.1rem; border: none; border-radius: 6px;
		font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
		min-width: 88px;
	}
	.ia-btn-start { background: #2E7D32; color: white; }
	.ia-btn-start:hover { background: #1B5E20; }
	.ia-btn-stop  { background: #C62828; color: white; }
	.ia-btn-stop:hover  { background: #B71C1C; }
	.ia-toggle {
		padding: 0.42rem 1.1rem; border: 2px solid #aaa;
		border-radius: 6px; background: #eee; color: #555;
		font-size: 0.9rem; font-weight: 700; cursor: pointer;
		transition: background 0.2s, color 0.2s, border-color 0.2s;
	}
	.ia-toggle.active { background: #2E7D32; border-color: #2E7D32; color: white; }
	.ia-legend {
		font-size: 0.77rem; color: #555; text-align: center;
		margin-top: 0.15rem; margin-bottom: 0.3rem;
		display: flex; align-items: center; justify-content: center; gap: 2px;
	}
	.ia-distance {
		text-align: center; font-size: 0.88rem; color: #C62828;
		margin: 0.2rem 0 0; font-weight: 600;
		min-height: 1.4em;
	}
</style>
