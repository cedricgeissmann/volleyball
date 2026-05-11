<script>
	/**
	 * Interaktive Angriffsanlauf-Animation — Seitenansicht (links → rechts)
	 *
	 * Modell:
	 *   - 4-Schritt-Anlauf mit körpergrössen-abhängigen Schrittlängen
	 *   - Schritt 3 gross (Sprungschritt), Schritt 4 schulterbreit
	 *   - Momentum-Reduktion beim Absprung (~55% der Anlaufgeschwindigkeit)
	 *   - Landung immer vor dem Netz sichergestellt
	 *
	 * Geschwindigkeits-Realismus:
	 *   Volleyball-Anlauf: 2.0–4.5 m/s typisch, Wettkampf bis ~5 m/s.
	 *   Schrittzeiten = Schrittdistanz / effektive Geschwindigkeit je Schritt.
	 *   Beispiel bei 185cm, 3.5 m/s: S1≈300ms, S2≈250ms, S3≈265ms, S4≈175ms.
	 */

	// ─── Physik-Konstanten ────────────────────────────────────────────────────────
	const G = 9.81; // m/s²

	// Horizontale Geschwindigkeit im Sprung = Anlauf × dieser Faktor
	// Form 2 (optimal): ~55% erhalten (voller Anlauf mit Momentum)
	// Form 1 (spät):    ~15% erhalten (Absprung nah am Netz, kaum Anlauf)
	const MOMENTUM_FORM2 = 0.55;
	const MOMENTUM_FORM1 = 0.15;

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W    = 760;
	const SVG_H    = 500;
	const PX_PER_M = 80;
	const MARGIN_L = 54;
	const MARGIN_R = 18;
	const GROUND_Y = SVG_H - 100; // mehr Platz unterhalb des Bodens

	// Netz ganz rechts
	const NET_X_M   = (SVG_W - MARGIN_L - MARGIN_R) / PX_PER_M;  // ≈8.6m
	const NET_SVG_X = MARGIN_L + NET_X_M * PX_PER_M;

	// 3m-Angriffslinie
	const LINE_3M_X_M   = NET_X_M - 3.0;
	const LINE_3M_SVG_X = MARGIN_L + LINE_3M_X_M * PX_PER_M;

	// Anzahl Schritte
	const N_STEPS = 4;
	const STEP_COLORS = ['#0ea5e9', '#f59e0b', '#0ea5e9', '#f59e0b'];
	const STEP_FOOT   = ['R', 'L', 'R', 'L'];

	// Schrittlängen als Faktor der Körpergrösse — realistisch, kompakt:
	// S1: orientierender Schritt (~35% KH), S2: aufbauend (~40%),
	// S3: grosser Sprungschritt (~55%), S4: Bremse/schulterbreit (~28%)
	const STEP_LEN_FACTORS = [0.35, 0.40, 0.55, 0.28];
	// Geschwindigkeits-Faktor pro Schritt (relativ zu approachSpeedMs)
	// S1 langsam, S2 aufbauend, S3 Vollgas, S4 Abbremsschritt
	const STEP_SPEED_FRACS = [0.55, 0.75, 1.0, 0.85];

	// Netzhöhen (nur Buttons, keine freie Eingabe)
	const NET_HEIGHTS = [
		{ id: 'herren', label: 'Herren', heightM: 2.43 },
		{ id: 'damen',  label: 'Damen',  heightM: 2.24 },
	];

	/** @param {number} xM */
	function fx(xM) { return MARGIN_L + xM * PX_PER_M; }
	/** @param {number} yM */
	function fy(yM) { return GROUND_Y - yM * PX_PER_M; }

	// ─── Strichmännchen-Proportionen ─────────────────────────────────────────────
	/**
	 * @param {number} heightM
	 * @param {number} armReachM
	 */
	function figureProps(heightM, armReachM) {
		return {
			hipM:      heightM * 0.44,
			shoulderM: heightM * 0.77,
			headM:     heightM * 0.89,
			headR:     heightM * 0.06,
			handM:     heightM * 0.77 + armReachM,
		};
	}

	// ─── Physik & Schrittmodell ───────────────────────────────────────────────────
	/**
	 * @param {number} jumpHeightM
	 * @param {number} approachSpeedMs
	 * @param {number} athleteHeightM
	 * @param {number} armReachM
	 * @param {number} netHeightM
	 */
	/**
	 * @param {number} jumpHeightM
	 * @param {number} approachSpeedMs
	 * @param {number} athleteHeightM
	 * @param {number} armReachM
	 * @param {number} netHeightM
	 * @param {number} horizMomentumFactor
	 */
	function calcApproach(jumpHeightM, approachSpeedMs, athleteHeightM, armReachM, netHeightM, horizMomentumFactor) {
		const fig = figureProps(athleteHeightM, armReachM);

		// ── Sprungphase (vorab berechnen für Takeoff-Bestimmung) ─────────────────
		const v0        = Math.sqrt(2 * G * jumpHeightM);
		const hangTimeS = 2 * v0 / G;
		const vHoriz    = approachSpeedMs * horizMomentumFactor;
		const flightDistM = vHoriz * hangTimeS;

		// Absprung so wählen dass Landung 0.4m vor dem Netz ist
		const LANDING_CLEARANCE_M = 0.4;
		const takeoffXM = NET_X_M - LANDING_CLEARANCE_M - flightDistM;

		// Schrittlängen: körpergrössen-abhängig
		const stepLengths = STEP_LEN_FACTORS.map(f => f * athleteHeightM);
		const totalApproachDistM = stepLengths.reduce((a, b) => a + b, 0);
		const approachStartXM = takeoffXM - totalApproachDistM;

		// ── Schritte ─────────────────────────────────────────────────────────────
		/**
		 * @type {{
		 *   idx: number,
		 *   xM: number,
		 *   foot: string,
		 *   color: string,
		 *   startT: number,
		 *   endT: number,
		 *   durationMs: number,
		 *   distM: number,
		 *   progress: number,
		 * }[]}
		 */
		const steps = [];
		let cumDistM = 0;
		let cumTimeS = 0;
		for (let i = 0; i < N_STEPS; i++) {
			const distM    = stepLengths[i];
			const speedEff = approachSpeedMs * STEP_SPEED_FRACS[i];
			const durS     = distM / speedEff;
			const startT   = cumTimeS;
			cumDistM += distM;
			cumTimeS += durS;
			const xM = approachStartXM + cumDistM;
			steps.push({
				idx: i,
				xM,
				distM,
				foot:       STEP_FOOT[i],
				color:      STEP_COLORS[i],
				startT,
				endT:       cumTimeS,
				durationMs: durS * 1000,
				progress:   0,
			});
		}

		const approachTimeS = cumTimeS;

		// ── Punkte ───────────────────────────────────────────────────────────────
		const N_PER_STEP = 20;
		const N_FLIGHT   = 120;

		/** @type {{xM: number, yFeetM: number, phase: 'approach'|'flight', t: number}[]} */
		const points = [];

		for (let si = 0; si < N_STEPS; si++) {
			const step   = steps[si];
			const startX = si === 0 ? approachStartXM : steps[si - 1].xM;
			const startPt = si === 0 ? 0 : 1;
			for (let j = startPt; j <= N_PER_STEP; j++) {
				const frac = j / N_PER_STEP;
				points.push({
					xM:     startX + frac * step.distM,
					yFeetM: 0,
					phase:  'approach',
					t:      step.startT + frac * (step.endT - step.startT),
				});
			}
		}

		for (let i = 1; i <= N_FLIGHT; i++) {
			const p  = i / N_FLIGHT;
			const tf = p * hangTimeS;
			const yCgM = v0 * tf - 0.5 * G * tf * tf;
			points.push({
				xM:     takeoffXM + vHoriz * tf,
				yFeetM: Math.max(0, yCgM),
				phase:  'flight',
				t:      approachTimeS + tf,
			});
		}

		const totalTimeS = approachTimeS + hangTimeS;

		for (const s of steps) {
			s.progress = s.endT / totalTimeS;
		}

		const takeoffProgress = approachTimeS / totalTimeS;
		const landingXM       = takeoffXM + flightDistM;

		// ── Schlagzone & optimale Schlagzone ─────────────────────────────────────
		// Normale Schlagzone: Hand >= Netzhöhe
		// Optimale Schlagzone: Hand >= max(netHöhe, maxHand × OPT_ZONE_FRAC)
		// OPT_ZONE_FRAC = 0.82 → obere 18% der Handhöhe (ca. 10-20% unter Max)
		const OPT_ZONE_FRAC = 0.82;

		let hitZoneEnterT  = -1;
		let hitZoneLeaveT  = -1;
		let optZoneEnterT  = -1;
		let optZoneLeaveT  = -1;
		let maxHandHeightM = 0;

		// Erster Durchlauf: maxHandHeight bestimmen
		for (const pt of points) {
			const handH = pt.yFeetM + fig.handM;
			if (handH > maxHandHeightM) maxHandHeightM = handH;
		}

		const optZoneMinH = Math.max(netHeightM, maxHandHeightM * OPT_ZONE_FRAC);

		// Zweiter Durchlauf: Zeiten messen
		// Schlagpunkt-X = x-Position beim Verlassen der optimalen Zone
		let optZoneLeaveXM = 0;

		for (const pt of points) {
			const handH = pt.yFeetM + fig.handM;
			if (pt.phase === 'flight') {
				if (handH >= netHeightM) {
					if (hitZoneEnterT < 0) hitZoneEnterT = pt.t;
					hitZoneLeaveT = pt.t;
				}
				if (handH >= optZoneMinH) {
					if (optZoneEnterT < 0) optZoneEnterT = pt.t;
					optZoneLeaveT  = pt.t;
					optZoneLeaveXM = pt.xM;
				}
			}
		}

		const hitZoneTimeS  = Math.max(0, hitZoneLeaveT  - hitZoneEnterT);
		const optZoneTimeS  = Math.max(0, optZoneLeaveT  - optZoneEnterT);
		const enterProgress = hitZoneEnterT  >= 0 ? hitZoneEnterT  / totalTimeS : 1;
		const leaveProgress = hitZoneLeaveT  >= 0 ? hitZoneLeaveT  / totalTimeS : 1;
		const optEnterProg  = optZoneEnterT  >= 0 ? optZoneEnterT  / totalTimeS : 1;
		const optLeaveProg  = optZoneLeaveT  >= 0 ? optZoneLeaveT  / totalTimeS : 1;

		// Form 2 Zeitpunkt: 10% nach dem Sprung-Höhepunkt (auf dem Abstieg)
		// = Zeitpunkt wo yFeetM = maxFeetHeightM * 0.90 auf dem Absteig
		const maxFeetHeightM = jumpHeightM; // Absprungpunkt ist Referenz, Füsse bei jumpHeightM
		const target90 = maxFeetHeightM * 0.90;
		let form2T = optZoneLeaveT; // Fallback
		let passedPeak = false;
		for (const pt of points) {
			if (pt.phase !== 'flight') continue;
			if (!passedPeak && pt.yFeetM >= maxFeetHeightM * 0.98) passedPeak = true;
			if (passedPeak && pt.yFeetM <= target90) { form2T = pt.t; break; }
		}
		const form2Prog = form2T / totalTimeS;

		return {
			points,
			steps,
			totalTimeS,
			approachTimeS,
			hangTimeS,
			hitZoneTimeS,
			optZoneTimeS,
			maxHandHeightM,
			optZoneMinH,
			enterProgress,
			leaveProgress,
			optEnterProg,
			optLeaveProg,
			optZoneEnterT,
			optZoneLeaveXM,
			optZoneLeaveT,
			form2Prog,
			takeoffProgress,
			takeoffXM,
			landingXM,
			approachStartXM,
			totalApproachDistM,
			fig,
			netHeightM,
			jumpHeightM,
		};
	}

	/** @type {{ externalSetTimeS?: number }} */
	let { externalSetTimeS } = $props();

	const FORMS = [
		{ id: 'form1', label: 'Form 1', color: '#dc2626' },
		{ id: 'form2', label: 'Form 2', color: '#16a34a' },
	];

	// ─── localStorage-Hilfsfunktionen (SSR-safe via try/catch) ──────────────────
	/** @param {string} key @param {string} def */
	function loadStr(key, def) {
		try { return localStorage.getItem(key) ?? def; } catch { return def; }
	}
	/** @param {string} key @param {number} def */
	function loadNum(key, def) {
		try {
			const v = parseFloat(localStorage.getItem(key) ?? '');
			return isNaN(v) ? def : v;
		} catch { return def; }
	}
	/** @param {string} key @param {boolean} def */
	function loadBool(key, def) {
		try {
			const v = localStorage.getItem(key);
			return v === null ? def : v === 'true';
		} catch { return def; }
	}
	/** @param {string} key @param {string|number|boolean} val */
	function save(key, val) {
		try { localStorage.setItem(key, String(val)); } catch { /* SSR / quota */ }
	}

	// ─── Reaktiver Zustand (mit Persistierung) ────────────────────────────────────
	let _formId      = $state(/** @type {'form1'|'form2'} */ (/** @type {any} */ (loadStr('aaa_form',  'form2'))));
	let _netId       = $state(loadStr('aaa_net',   NET_HEIGHTS[0].id));

	let selectedForm = $derived(/** @type {'form1'|'form2'} */ (_formId));
	let selectedNet  = $derived(NET_HEIGHTS.find(n => n.id === _netId) ?? NET_HEIGHTS[0]);

	$effect(() => { save('aaa_form', _formId); });
	$effect(() => { save('aaa_net',  _netId);  });

	// Körpergrösse-Bereich je nach Geschlecht
	let heightRange = $derived(
		selectedNet.id === 'damen'
			? { min: 152, max: 185, default: 165, ticks: [152, 161, 170, 178, 185] }
			: { min: 160, max: 200, default: 175, ticks: [160, 170, 180, 190, 200] }
	);

	let jumpHeightCm    = $state(loadNum('aaa_jump',   60));
	let approachSpeedMs = $state(loadNum('aaa_speed',  3.0));
	let athleteHeightCm = $state(loadNum('aaa_height', 175));
	let setTimeS        = $state(loadNum('aaa_settime', 0.9));
	let slowMotion      = $state(loadBool('aaa_slow',  false));

	$effect(() => { save('aaa_jump',    jumpHeightCm);    });
	$effect(() => { save('aaa_speed',   approachSpeedMs); });
	$effect(() => { save('aaa_height',  athleteHeightCm); });
	$effect(() => { save('aaa_settime', setTimeS);        });
	$effect(() => { save('aaa_slow',    slowMotion);      });

	// Wenn ein externer Wert übergeben wird, überschreibt er den Slider
	$effect(() => {
		if (externalSetTimeS !== undefined) setTimeS = externalSetTimeS;
	});

	let animState    = $state(/** @type {'idle'|'running'|'done'} */ ('idle'));
	let animProgress = $state(0);
	let elapsedMs    = $state(0);

	// Körpergrösse beim Netz-Wechsel NUR auf Default setzen wenn kein gespeicherter Wert da ist
	// (d.h. wenn der gespeicherte Wert ausserhalb des neuen Bereichs liegt)
	$effect(() => {
		const r = heightRange;
		if (athleteHeightCm < r.min || athleteHeightCm > r.max) {
			athleteHeightCm = r.default;
		}
	});

	// Armreichweite abgeleitet (Spannweite ≈ Körpergrösse, Arm ab Schulter ≈ 40% KH)
	let armReachM = $derived(athleteHeightCm / 100 * 0.40);

	// Farbe je nach Sprungkraft
	let jumpColor = $derived(() => {
		const h = jumpHeightCm;
		if (h <= 40) return '#64748b';
		if (h <= 60) return '#2563eb';
		if (h <= 78) return '#16a34a';
		return '#dc2626';
	});

	/** @type {number|null} */
	let rafId = null;
	let animStartTime = 0;

	let sim = $derived(calcApproach(
		jumpHeightCm / 100,
		approachSpeedMs,
		athleteHeightCm / 100,
		armReachM,
		selectedNet.heightM,
		selectedForm === 'form1' ? MOMENTUM_FORM1 : MOMENTUM_FORM2,
	));

	// Aktueller Animationspunkt
	let currentPt = $derived(() => {
		const pts = sim.points;
		if (pts.length === 0) return pts[0];
		const idx = Math.min(Math.floor(animProgress * (pts.length - 1)), pts.length - 1);
		return pts[Math.max(0, idx)];
	});

	let isApproach = $derived(animProgress < sim.takeoffProgress);
	let isFlying   = $derived(animProgress >= sim.takeoffProgress && animProgress < 1);
	let inHitZone  = $derived(animProgress >= sim.enterProgress  && animProgress <= sim.leaveProgress);
	let inOptZone  = $derived(animProgress >= sim.optEnterProg   && animProgress <= sim.optLeaveProg);

	// Zuspiel: Ball-Geschwindigkeit fix ~7.5 m/s (typisches Volleyball-Zuspiel)
	const BALL_SPEED_MS = 7.5;
	// Distanz vom Schlagpunkt (optZoneLeave) zurück = setTimeS × BALL_SPEED_MS
	let setDistM = $derived(setTimeS * BALL_SPEED_MS);
	// Position des Zuspielers = Schlagpunkt-X minus setDistM
	let setterXM = $derived(sim.optZoneLeaveXM - setDistM);

	/**
	 * Wo war der Angreifer zu einem bestimmten Zeitpunkt t im Anlauf?
	 * Gibt zurück: { xM, stepIdx, stepFrac, foot, color, phase, beschreibung }
	 * Wird genutzt um die Angreifer-Position zum Zuspielzeitpunkt zu zeigen.
	 */
	let attackerAtSetTime = $derived(() => {
		const tZuspiel = sim.optZoneLeaveT - setTimeS;

		if (tZuspiel <= 0) {
			// Zuspiel war vor dem Anlaufstart — "vor dem Anlauf"
			return {
				xM: sim.approachStartXM - 0.2,
				stepIdx: -1,
				foot: '—',
				color: '#94a3b8',
				phase: 'before',
				label: 'Vor dem Anlauf',
				detail: `Zuspiel ${Math.abs(tZuspiel * 1000).toFixed(0)}ms vor Anlauf-Start`,
			};
		}

		if (tZuspiel >= sim.approachTimeS) {
			// Angreifer ist bereits in der Luft
			const tFlight = tZuspiel - sim.approachTimeS;
			const frac    = tFlight / sim.hangTimeS;
			return {
				xM: sim.takeoffXM + (sim.landingXM - sim.takeoffXM) * frac,
				stepIdx: 4, // "in der Luft"
				foot: '↑',
				color: '#7c3aed',
				phase: 'flight',
				label: 'In der Luft',
				detail: `${(tFlight * 1000).toFixed(0)}ms nach Absprung`,
			};
		}

		// Zeitpunkt liegt im Anlauf: welcher Schritt?
		let foundStep = null;
		let prevStepEndT = 0;
		for (let i = 0; i < sim.steps.length; i++) {
			const s = sim.steps[i];
			if (tZuspiel <= s.endT) {
				foundStep = s;
				prevStepEndT = i === 0 ? 0 : sim.steps[i - 1].endT;
				break;
			}
		}
		if (!foundStep) {
			foundStep = sim.steps[sim.steps.length - 1];
			prevStepEndT = sim.steps[sim.steps.length - 2]?.endT ?? 0;
		}

		const stepFrac = (tZuspiel - prevStepEndT) / Math.max(0.001, foundStep.endT - prevStepEndT);
		const prevX    = foundStep.idx === 0 ? sim.approachStartXM : sim.steps[foundStep.idx - 1].xM;
		const xM       = prevX + stepFrac * foundStep.distM;

		// Schritt-Phase beschreiben: Anfang = Fuss landet, Mitte = Schwebephase, Ende = nächster Schritt
		const phase = stepFrac < 0.3 ? 'Aufsatz' : stepFrac < 0.7 ? 'Mitte' : 'Abdrücken';

		return {
			xM,
			stepIdx: foundStep.idx,
			foot: foundStep.foot,
			color: foundStep.color,
			phase: 'approach',
			label: `Schritt ${foundStep.idx + 1} (${foundStep.foot}-Fuss)`,
			detail: phase,
			stepFrac,
		};
	});

	let currentStepIdx = $derived(() => {
		if (!isApproach) return -1;
		for (let i = 0; i < sim.steps.length; i++) {
			if (animProgress <= sim.steps[i].progress) return i;
		}
		return sim.steps.length - 1;
	});

	let phaseFrac = $derived(() => {
		if (animProgress <= sim.takeoffProgress) return 0;
		const flightFrac = (animProgress - sim.takeoffProgress) /
			Math.max(0.001, 1 - sim.takeoffProgress);
		return Math.min(1, flightFrac / 0.25);
	});

	let legPhase = $derived(() => {
		if (animProgress >= sim.takeoffProgress) return 0;
		const stepIdx = currentStepIdx();
		if (stepIdx < 0) return 0;
		const step = sim.steps[stepIdx];
		const stepStart = stepIdx === 0 ? 0 : sim.steps[stepIdx - 1].progress;
		const stepFrac  = (animProgress - stepStart) / Math.max(0.001, step.progress - stepStart);
		const dir = stepIdx % 2 === 0 ? 1 : -1;
		return dir * Math.sin(stepFrac * Math.PI);
	});

	// ─── Strichmännchen ───────────────────────────────────────────────────────────
	/**
	 * @param {number} feetSvgX
	 * @param {number} feetYM
	 * @param {number} pf
	 * @param {number} lp
	 * @param {boolean} inZone
	 */
	function figureSvg(feetSvgX, feetYM, pf, lp, inZone) {
		const fig = sim.fig;

		const feetSvgY     = GROUND_Y - feetYM * PX_PER_M;
		const hipSvgY      = feetSvgY  - fig.hipM      * PX_PER_M;
		const shoulderSvgY = feetSvgY  - fig.shoulderM * PX_PER_M;
		const headSvgY     = feetSvgY  - fig.headM     * PX_PER_M;
		const headR        = fig.headR  * PX_PER_M;
		const armLen       = (fig.handM - fig.shoulderM) * PX_PER_M;

		const runArmSwing  = -lp * 0.28;
		const hitArmAngle  = (Math.PI * 0.55 + runArmSwing) * (1 - pf) + (-Math.PI / 2) * pf;
		const hitArmX      = feetSvgX + Math.cos(hitArmAngle) * armLen * (pf > 0.5 ? 0.82 : 0.88);
		const hitArmY      = shoulderSvgY + Math.sin(hitArmAngle) * armLen;

		const offArmAngle  = (Math.PI * 0.55 - runArmSwing) * (1 - pf) + (-Math.PI / 2 + 0.45) * pf;
		const offArmX      = feetSvgX - Math.cos(offArmAngle) * armLen * 0.72;
		const offArmY      = shoulderSvgY + Math.sin(offArmAngle) * armLen * 0.72;

		const swingPx = lp * 16;
		const isAir   = feetYM > 0.02;

		const kneeFwdX = feetSvgX + (isAir ? 10   : swingPx);
		const kneeBckX = feetSvgX - (isAir ? 10   : swingPx * 0.55);
		const kneeFwdY = hipSvgY  + (isAir ? -12  : 20);
		const kneeBckY = hipSvgY  + (isAir ? -6   : 20);
		const footFwdX = feetSvgX + (isAir ? 16   : swingPx * 1.6);
		const footBckX = feetSvgX - (isAir ? 12   : swingPx * 0.85);
		const footFwdY = isAir ? feetSvgY - 16  : feetSvgY;
		const footBckY = isAir ? feetSvgY - 7   : feetSvgY;

		return {
			feetSvgY, hipSvgY, shoulderSvgY, headSvgY, headR,
			hitArmX, hitArmY, offArmX, offArmY,
			kneeFwdX, kneeBckX, kneeFwdY, kneeBckY,
			footFwdX, footBckX, footFwdY, footBckY,
			handHeightM: feetYM + fig.handM,
		};
	}

	// Höhenskala
	let scaleMarks = $derived(() => {
		const marks = new Set([0, 1, 2, 3]);
		marks.add(sim.netHeightM);
		marks.add(parseFloat(sim.maxHandHeightM.toFixed(2)));
		return [...marks].sort((a, b) => a - b).filter(m => m <= 4.5);
	});

	// Zeitbalken
	const BAR_X = MARGIN_L;
	const BAR_W = SVG_W - MARGIN_L - MARGIN_R;
	const BAR_Y = 18;
	const BAR_H = 10;

	// ─── Animation ────────────────────────────────────────────────────────────────
	const SLOW_FACTOR = 4;

	function makeFrame() {
		/** @param {number} now */
		return function frame(now) {
			const realElapsed = now - animStartTime;
			const speed       = slowMotion ? SLOW_FACTOR : 1;
			// Animation läuft immer bis zum Verlassen der optimalen Zone
			const stopAt   = sim.optLeaveProg > 0 ? sim.optLeaveProg : 1;
			const duration = stopAt * sim.totalTimeS * 1000 * speed;
			const progress = Math.min(realElapsed / duration, 1) * stopAt;
			animProgress = progress;
			elapsedMs    = progress * sim.totalTimeS * 1000;
			if (progress < stopAt) {
				rafId = requestAnimationFrame(frame);
			} else {
				animProgress = stopAt;
				animState    = 'done';
				rafId = null;
			}
		};
	}

	function startAnimation() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		animProgress  = 0;
		elapsedMs     = 0;
		animState     = 'running';
		animStartTime = performance.now();
		rafId = requestAnimationFrame(makeFrame());
	}

	function resetAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		animProgress = 0;
		elapsedMs    = 0;
		animState    = 'idle';
	}

	function toggleSlowMotion() {
		slowMotion = !slowMotion;
		if (animState !== 'running') return;
		if (rafId !== null) cancelAnimationFrame(rafId);
		const speed    = slowMotion ? SLOW_FACTOR : 1;
		const totalDur = sim.totalTimeS * 1000 * speed;
		animStartTime  = performance.now() - animProgress * totalDur;
		rafId = requestAnimationFrame(makeFrame());
	}

	$effect(() => { jumpHeightCm; approachSpeedMs; athleteHeightCm; selectedNet; selectedForm; resetAnimation(); });
	// setTimeS ändert nur Distanzanzeige, keine Animation-Reset nötig
	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });
</script>

<div class="aaa-wrapper">

	<!-- ── Steuerung ────────────────────────────────────────────────────────────── -->
	<div class="aaa-controls">

		<!-- Netzhöhe: Buttons oben, steuert auch Körpergrösse-Bereich -->
		<div class="aaa-net-row">
			<span class="aaa-slider-name">Netzhöhe</span>
			<div class="aaa-btn-group">
				{#each NET_HEIGHTS as nh (nh.id)}
					<button
						class="aaa-net-btn"
						class:active={selectedNet.id === nh.id}
						onclick={() => (_netId = nh.id)}>
						{nh.label} — {nh.heightM.toFixed(2)} m
					</button>
				{/each}
			</div>
		</div>

		<!-- Sprungkraft -->
		<div class="aaa-slider-row">
			<label class="aaa-slider-label">
				<span class="aaa-slider-name">Sprungkraft</span>
				<span class="aaa-slider-value" style="color: {jumpColor()}">{jumpHeightCm} cm</span>
			</label>
			<input type="range" class="aaa-range" min="25" max="95" step="1"
				bind:value={jumpHeightCm}
				style="--track-color: {jumpColor()}" />
			<div class="aaa-slider-ticks">
				<span>25</span><span>40</span><span>55</span><span>70</span><span>85</span><span>95</span>
			</div>
		</div>

		<!-- Anlauftempo -->
		<div class="aaa-slider-row">
			<label class="aaa-slider-label">
				<span class="aaa-slider-name">Anlauftempo</span>
				<span class="aaa-slider-value" style="color: #0ea5e9">{approachSpeedMs.toFixed(1)} m/s</span>
			</label>
			<input type="range" class="aaa-range" min="1.5" max="5.5" step="0.1"
				bind:value={approachSpeedMs}
				style="--track-color: #0ea5e9" />
			<div class="aaa-slider-ticks">
				<span>1.5</span><span>2.5</span><span>3.5</span><span>4.5</span><span>5.5</span>
			</div>
		</div>

		<!-- Körpergrösse — Bereich je nach Geschlecht -->
		<div class="aaa-slider-row">
			<label class="aaa-slider-label">
				<span class="aaa-slider-name">Körpergrösse</span>
				<span class="aaa-slider-value" style="color: #7c3aed">{athleteHeightCm} cm</span>
			</label>
			<input type="range" class="aaa-range"
				min={heightRange.min} max={heightRange.max} step="1"
				bind:value={athleteHeightCm}
				style="--track-color: #7c3aed" />
			<div class="aaa-slider-ticks">
				{#each heightRange.ticks as t}
					<span>{t}</span>
				{/each}
			</div>
		</div>

		<!-- Zuspiel-Zeit -->
		<div class="aaa-slider-row">
			<label class="aaa-slider-label">
				<span class="aaa-slider-name">Zuspiel-Zeit</span>
				<span class="aaa-slider-value" style="color: #b45309">{setTimeS.toFixed(1)} s</span>
			</label>
			<input type="range" class="aaa-range" min="0.3" max="3.0" step="0.1"
				bind:value={setTimeS}
				style="--track-color: #b45309" />
			<div class="aaa-slider-ticks">
				<span>0.3</span><span>1.0</span><span>1.5</span><span>2.0</span><span>3.0</span>
			</div>
		</div>

		<!-- Angriffsform -->
		<div class="aaa-net-row">
			<span class="aaa-slider-name">Angriffsform</span>
			<div class="aaa-btn-group">
				{#each FORMS as f (f.id)}
					<button
						class="aaa-net-btn"
						class:active={selectedForm === f.id}
						style="--fc: {f.color}; border-color: {f.color}; color: {selectedForm === f.id ? 'white' : f.color}; background: {selectedForm === f.id ? f.color : 'transparent'}"
						onclick={() => (_formId = /** @type {'form1'|'form2'} */ (f.id))}>
						{f.label}
					</button>
				{/each}
			</div>
	
		</div>

	</div>

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="aaa-svg-wrapper">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="aaa-svg" role="img"
			aria-label="Angriffsanlauf-Simulation Seitenansicht">

			<defs>
				<marker id="aaa-arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
					<polygon points="0 6, 3 0, 6 6" fill="#16a34a" />
				</marker>
			</defs>

			<!-- ╔══ Hintergrund ════════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />

			<!-- ╔══ Bodenbereich ════════════════════════════════════════════════════╗
			     Layout (y = GROUND_Y):
			     Zeile A  y+0..+10   : Markierungsstriche (Schritte, Absprung, Landung)
			     Zeile B  y+12..+22  : Labels Schritte + Absprung/Landung
			     Zeile C  y+30..+40  : Schrittweiten (cm), nur wenn bekannt
			     Zeile D  y+50..+60  : Distanz-Markierungen (Netz-Abstand)
			     Zeile E  y+68..+78  : 3m-Linie Label
			══╝ -->

			<!-- Bodenlinie -->
			<line x1={MARGIN_L - 10} y1={GROUND_Y} x2={SVG_W - MARGIN_R} y2={GROUND_Y}
				stroke="#94a3b8" stroke-width="1.5" />

			<!-- 3m-Angriffslinie — durchgehend durch alle Zonen -->
			<line x1={LINE_3M_SVG_X} y1={fy(0)} x2={LINE_3M_SVG_X} y2={GROUND_Y + 75}
				stroke="#dc2626" stroke-width="1.5" stroke-dasharray="6,3" opacity="0.55" />
			<text x={LINE_3M_SVG_X} y={GROUND_Y + 75} text-anchor="middle"
				fill="#dc2626" font-size="9" font-family="sans-serif" font-weight="700" opacity="0.85">
				3m-Linie
			</text>

			<!-- Distanz-Markierungen (Abstand zum Netz) — Zeile D -->
			{#if true}
				{@const distMarks = [1, 2, 4, 5, 6]}
				{#each distMarks as d}
					{@const markX = MARGIN_L + (NET_X_M - d) * PX_PER_M}
					{#if markX > MARGIN_L + 20}
						<line x1={markX} y1={GROUND_Y + 46} x2={markX} y2={GROUND_Y + 54}
							stroke="#94a3b8" stroke-width="1" opacity="0.4" />
						<text x={markX} y={GROUND_Y + 63} text-anchor="middle"
							fill="#94a3b8" font-size="8" font-family="sans-serif" opacity="0.6">
							{d}m
						</text>
					{/if}
				{/each}
				<!-- Trennlinie für Netz-Distanz-Zeile -->
				<line x1={MARGIN_L} y1={GROUND_Y + 46} x2={NET_SVG_X} y2={GROUND_Y + 46}
					stroke="#e2e8f0" stroke-width="1" />
				<text x={MARGIN_L} y={GROUND_Y + 43} fill="#cbd5e1"
					font-size="7" font-family="sans-serif">← Abstand zum Netz</text>
			{/if}

			<!-- Schritt-Fussabdrücke — Zeile A+B -->
			{#each sim.steps as step, i}
				{@const svgX     = fx(step.xM)}
				{@const isActive = animState === 'running' && currentStepIdx() === i}
				{@const isDone   = animState !== 'idle' && animProgress >= step.progress}
				{@const opacity  = animState === 'idle' ? 0.4 : (isDone ? 1 : (isActive ? 1 : 0.2))}

				<!-- Markierungsstrich -->
				<line x1={svgX} y1={GROUND_Y - 2} x2={svgX} y2={GROUND_Y + 10}
					stroke={step.color} stroke-width={isActive ? 3 : 2} opacity={opacity} />
				<!-- Pfeilspitze oben (zeigt Auftrittspunkt) -->
				<polygon points="{svgX - 4},{GROUND_Y - 2} {svgX + 4},{GROUND_Y - 2} {svgX},{GROUND_Y - 9}"
					fill={step.color} opacity={opacity} />
				<!-- Label: "1·R" kompakt -->
				<text x={svgX} y={GROUND_Y + 21} text-anchor="middle"
					fill={step.color} font-size="9" font-family="sans-serif" font-weight="700"
					opacity={opacity}>{i + 1}·{step.foot}</text>

				<!-- Schrittzeit (nach Animation) — Zeile B unten -->
				{#if isDone || animState === 'done'}
					<text x={svgX} y={GROUND_Y + 31} text-anchor="middle"
						fill={step.color} font-size="7.5" font-family="monospace"
						opacity={animState === 'done' ? 0.85 : 0.65}>{step.durationMs.toFixed(0)}ms</text>
				{/if}

				<!-- Schrittweite — Zeile C, nur idle/done -->
				{#if animState !== 'running'}
					{@const prevX = i === 0 ? fx(sim.approachStartXM) : fx(sim.steps[i-1].xM)}
					{@const midX  = (prevX + svgX) / 2}
					<text x={midX} y={GROUND_Y + 42} text-anchor="middle"
						fill={step.color} font-size="7.5" font-family="monospace"
						opacity="0.55">{(step.distM * 100).toFixed(0)}cm</text>
				{/if}
			{/each}

			<!-- Absprungpunkt -->
			{#if true}
				{@const takeoffSvgX  = fx(sim.takeoffXM)}
				{@const isInAir      = animState !== 'idle' && animProgress >= sim.takeoffProgress}
				{@const hangDoneMs   = animState === 'done' ? sim.hangTimeS * 1000 :
				                       (isInAir ? (animProgress - sim.takeoffProgress) / Math.max(0.001, 1 - sim.takeoffProgress) * sim.hangTimeS * 1000 : 0)}
				<line x1={takeoffSvgX} y1={GROUND_Y - 2} x2={takeoffSvgX} y2={GROUND_Y + 10}
					stroke="#f59e0b" stroke-width="2.5" />
				<text x={takeoffSvgX} y={GROUND_Y + 21} text-anchor="middle"
					fill="#f59e0b" font-size="9" font-family="sans-serif" font-weight="700">
					↑ Absp.
				</text>
				<!-- Hangtime analog zu Schrittzeiten -->
				{#if isInAir || animState === 'done'}
					<text x={takeoffSvgX} y={GROUND_Y + 31} text-anchor="middle"
						fill="#f59e0b" font-size="7.5" font-family="monospace"
						opacity={animState === 'done' ? 0.85 : 0.65}>
						{hangDoneMs.toFixed(0)}ms
					</text>
				{/if}
			{/if}

			<!-- Landepunkt -->
			{#if true}
				{@const landSvgX = fx(sim.landingXM)}
				{#if landSvgX < NET_SVG_X - 4}
					<line x1={landSvgX} y1={GROUND_Y - 2} x2={landSvgX} y2={GROUND_Y + 10}
						stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.55" />
					<text x={landSvgX} y={GROUND_Y + 21} text-anchor="middle"
						fill="#7c3aed" font-size="9" font-family="sans-serif" opacity="0.65">
						↓ Land.
					</text>
				{/if}
			{/if}

			<!-- Schritt-Zeitlabels oberhalb (während Animation) -->
			{#each sim.steps as step, i}
				{@const svgX   = fx(step.xM)}
				{@const isDone = animState === 'running' && animProgress >= step.progress}
				{#if isDone}
					<text x={svgX} y={GROUND_Y - 14} text-anchor="middle"
						fill={step.color} font-size="8" font-family="monospace" font-weight="700"
						opacity="0.8">{step.durationMs.toFixed(0)}ms</text>
				{/if}
			{/each}

			<!-- ╔══ Höhenskala ══════════════════════════════════════════════════════╗ -->
			<line x1={MARGIN_L - 2} y1={fy(0)} x2={MARGIN_L - 2} y2={fy(4.5)}
				stroke="#cbd5e1" stroke-width="1.5" />
			<line x1={MARGIN_L - 2} y1={fy(4.5)} x2={MARGIN_L - 2} y2={fy(4.5) - 8}
				stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#aaa-arrow-up)" />

			{#each scaleMarks() as hM}
				{@const isNet = Math.abs(hM - sim.netHeightM) < 0.01}
				{@const isMax = Math.abs(hM - sim.maxHandHeightM) < 0.02}
				<line x1={MARGIN_L - 10} y1={fy(hM)} x2={MARGIN_L - 2} y2={fy(hM)}
					stroke={isNet ? '#475569' : (isMax ? jumpColor() : '#cbd5e1')}
					stroke-width={isNet ? 2 : (isMax ? 1.5 : 1)} />
				<text x={MARGIN_L - 13} y={fy(hM) + 3} text-anchor="end"
					fill={isNet ? '#475569' : (isMax ? jumpColor() : '#94a3b8')}
					font-size={isNet || isMax ? 9 : 8} font-family="sans-serif"
					font-weight={isNet || isMax ? '600' : '400'}>{hM.toFixed(2)}m</text>
			{/each}

			<!-- ╔══ Schlagzonen ══════════════════════════════════════════════════════╗ -->
			{#if true}
				{@const zoneTopY    = fy(sim.maxHandHeightM)}
				{@const zoneBotY    = fy(sim.netHeightM)}
				{@const optTopY     = fy(sim.optZoneMinH)}
				{@const optBotY     = fy(sim.netHeightM)}

				<!-- Normale Schlagzone (Hintergrund) -->
				<rect x={MARGIN_L} y={zoneTopY} width={SVG_W - MARGIN_L - MARGIN_R}
					height={zoneBotY - zoneTopY}
					fill="#16a34a" opacity={inHitZone ? 0.07 : 0.04} />

				<!-- Optimale Schlagzone (heller Bereich, eigene Farbe #f97316 orange) -->
				<rect x={MARGIN_L} y={optTopY} width={SVG_W - MARGIN_L - MARGIN_R}
					height={optBotY - optTopY}
					fill={inOptZone ? '#f97316' : '#f97316'} opacity={inOptZone ? 0.18 : 0.08} />
				<!-- Rahmen optimale Zone -->
				<rect x={MARGIN_L} y={optTopY} width={SVG_W - MARGIN_L - MARGIN_R}
					height={optBotY - optTopY} fill="none"
					stroke="#f97316" stroke-width={inOptZone ? 2 : 1.2}
					stroke-dasharray={inOptZone ? '' : '6,4'}
					opacity={inOptZone ? 0.9 : 0.45} />

				<!-- Labels -->
				<text x={MARGIN_L + 6} y={optTopY - 4}
					fill="#f97316" font-size="8" font-family="sans-serif" font-weight="700"
					opacity={inOptZone ? 1 : 0.6}>
					{inOptZone ? 'Optimale Schlagzone!' : 'Opt. Schlagzone'}
				</text>
				<text x={MARGIN_L + 6} y={zoneTopY - 4}
					fill={jumpColor()} font-size="7.5" font-family="sans-serif" opacity="0.5">
					Max. Reichweite
				</text>

				<!-- Horizontale Linien -->
				<line x1={MARGIN_L} y1={fy(sim.netHeightM)} x2={SVG_W - MARGIN_R} y2={fy(sim.netHeightM)}
					stroke="#475569" stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
				<line x1={MARGIN_L} y1={fy(sim.maxHandHeightM)} x2={SVG_W - MARGIN_R} y2={fy(sim.maxHandHeightM)}
					stroke={jumpColor()} stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
				<line x1={MARGIN_L} y1={optTopY} x2={SVG_W - MARGIN_R} y2={optTopY}
					stroke="#f97316" stroke-width="1" stroke-dasharray="4,3" opacity="0.4" />
			{/if}

			<!-- ╔══ Schlagpunkt & Angreifer-Position zum Zuspiel ═══════════════════════╗ -->
			{#if sim.optZoneLeaveXM > 0}
				{@const hitSvgX   = fx(sim.optZoneLeaveXM)}
				{@const atSet     = attackerAtSetTime()}
				{@const atSetSvgX = fx(atSet.xM)}

				<!-- Schlagpunkt-Lot (orange, vom Schlagpunkt zum Boden) -->
				<line x1={hitSvgX} y1={fy(sim.optZoneMinH)} x2={hitSvgX} y2={GROUND_Y}
					stroke="#f97316" stroke-width="1.5"
					stroke-dasharray={animState === 'done' ? '' : '4,3'}
					opacity={animState === 'done' ? 0.7 : 0.25} />
				{#if animState === 'done'}
					<circle cx={hitSvgX} cy={fy(sim.optZoneMinH)} r="5"
						fill="#f97316" opacity="0.9" />
					<text x={hitSvgX + 7} y={fy(sim.optZoneMinH) - 5}
						fill="#f97316" font-size="8.5" font-family="sans-serif" font-weight="700">
						Schlagpunkt
					</text>
				{/if}

				<!-- Angreifer-Position zum Zuspielzeitpunkt -->
				{#if atSet.phase === 'approach' && atSetSvgX > MARGIN_L + 5 && atSetSvgX < fx(sim.takeoffXM) - 5}
					<!-- Raute am Boden -->
					<polygon
						points="{atSetSvgX},{GROUND_Y - 14} {atSetSvgX + 7},{GROUND_Y - 7} {atSetSvgX},{GROUND_Y} {atSetSvgX - 7},{GROUND_Y - 7}"
						fill={atSet.color} opacity="0.85" />
					<!-- Label-Box -->
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill="white" opacity="0.92" />
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill={atSet.color} opacity="0.1" />
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill="none" stroke={atSet.color} stroke-width="1.2" opacity="0.5" />
					<text x={atSetSvgX} y={GROUND_Y - 27} text-anchor="middle"
						fill={atSet.color} font-size="8.5" font-family="sans-serif" font-weight="700">
						{atSet.label}
					</text>
					<text x={atSetSvgX} y={GROUND_Y - 18} text-anchor="middle"
						fill={atSet.color} font-size="7.5" font-family="sans-serif" opacity="0.85">
						{atSet.detail}
					</text>
				{:else if atSet.phase === 'flight'}
					<!-- Raute an der Flugposition -->
					<polygon
						points="{atSetSvgX},{GROUND_Y - 14} {atSetSvgX + 7},{GROUND_Y - 7} {atSetSvgX},{GROUND_Y} {atSetSvgX - 7},{GROUND_Y - 7}"
						fill="#7c3aed" opacity="0.85" />
					<!-- Label-Box -->
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill="white" opacity="0.92" />
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill="#7c3aed" opacity="0.1" />
					<rect x={atSetSvgX - 34} y={GROUND_Y - 40} width="68" height="24" rx="4"
						fill="none" stroke="#7c3aed" stroke-width="1.2" opacity="0.5" />
					<text x={atSetSvgX} y={GROUND_Y - 27} text-anchor="middle"
						fill="#7c3aed" font-size="8.5" font-family="sans-serif" font-weight="700">
						{atSet.label}
					</text>
					<text x={atSetSvgX} y={GROUND_Y - 18} text-anchor="middle"
						fill="#7c3aed" font-size="7.5" font-family="sans-serif" opacity="0.85">
						{atSet.detail}
					</text>
				{/if}
			{/if}

			<!-- ╔══ Netz ═════════════════════════════════════════════════════════════╗ -->
			{#if true}
				{@const netTopY    = fy(sim.netHeightM)}
				{@const netBottomY = fy(sim.netHeightM - 1.0)}
				<rect x={NET_SVG_X - 5} y={netTopY} width="10" height={netBottomY - netTopY}
					fill="#e2e8f0" opacity="0.6" />
				{#each Array(6) as _, i}
					<line x1={NET_SVG_X - 5}
						y1={netTopY + (i + 1) * ((netBottomY - netTopY) / 6)}
						x2={NET_SVG_X + 5}
						y2={netTopY + (i + 1) * ((netBottomY - netTopY) / 6)}
						stroke="#94a3b8" stroke-width="0.8" opacity="0.5" />
				{/each}
				<rect x={NET_SVG_X - 5} y={netTopY - 4} width="10" height="6" rx="2"
					fill="white" stroke="#cbd5e1" stroke-width="1" />
				<rect x={NET_SVG_X - 3} y={netTopY} width="6" height={GROUND_Y - netTopY}
					rx="2" fill="#475569" />
				<text x={NET_SVG_X - 10} y={netTopY - 6} text-anchor="end" fill="#475569"
					font-size="9" font-family="sans-serif" font-weight="600" opacity="0.7">
					{sim.netHeightM.toFixed(2)}m
				</text>
			{/if}

			<!-- ╔══ Trajektorie ══════════════════════════════════════════════════════╗ -->
			{#if true}
				{@const allPts  = sim.points}
				{@const flightPts = allPts.filter(p => p.phase === 'flight')}
				{@const toD = (/** @type {typeof allPts} */ pts) =>
					pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${(GROUND_Y - p.yFeetM * PX_PER_M).toFixed(1)}`).join(' ')}

				<!-- Gesamte Parabel (gestrichelt im Idle, gezogen im Verlauf) -->
				{#if animState === 'idle'}
					{#if flightPts.length > 1}
						<path d={toD(flightPts)} fill="none" stroke={jumpColor()}
							stroke-width="2" stroke-dasharray="6,4" opacity="0.22" />
					{/if}
				{:else}
					{@const endIdx  = Math.min(Math.floor(animProgress * (allPts.length - 1)), allPts.length - 1)}
					{@const airPts  = allPts.slice(0, endIdx + 1).filter(p => p.phase === 'flight')}
					{#if airPts.length > 1}
						<path d={toD(airPts)} fill="none" stroke={jumpColor()}
							stroke-width="2.5" stroke-linecap="round" opacity="0.55" />
					{/if}
				{/if}

				<!-- Optimale Schlagzone auf der Parabel (orange, dicker) -->
				{#if sim.optZoneTimeS > 0}
					{@const optPts = flightPts.filter(p =>
						p.t >= sim.optZoneEnterT && p.t <= sim.optZoneLeaveT)}
					{#if optPts.length > 1}
						<path d={toD(optPts)} fill="none"
							stroke="#f97316" stroke-width="5"
							stroke-linecap="round"
							opacity={animState === 'idle' ? 0.45 : (inOptZone ? 0.95 : 0.6)} />
					{/if}

					<!-- Form-1-Punkt auf Parabel: Eintritt in die opt. Zone (spät/nah) -->
					{#if true}
						{@const f1pt = flightPts.find(p => p.t >= sim.optZoneEnterT)}
						{#if f1pt}
							{@const f1x = fx(f1pt.xM)}
							{@const f1y = GROUND_Y - f1pt.yFeetM * PX_PER_M}
							<circle cx={f1x} cy={f1y} r="6"
								fill="#dc2626"
								stroke="white" stroke-width="1.5"
								opacity={selectedForm === 'form1' ? 1 : 0.4} />
							<text x={f1x + 9} y={f1y + 4}
								fill="#dc2626" font-size="8.5" font-family="sans-serif" font-weight="700"
								opacity={selectedForm === 'form1' ? 1 : 0.4}>F1</text>
						{/if}
					{/if}

					<!-- Form-2-Punkt auf Parabel: 10% nach Peak (sim.form2Prog) -->
					{#if true}
						{@const f2t  = sim.form2Prog * sim.totalTimeS}
						{@const f2pt = flightPts.reduce((prev, p) =>
							Math.abs(p.t - f2t) < Math.abs(prev.t - f2t) ? p : prev, flightPts[0])}
						{#if f2pt}
							{@const f2x = fx(f2pt.xM)}
							{@const f2y = GROUND_Y - f2pt.yFeetM * PX_PER_M}
							<circle cx={f2x} cy={f2y} r="6"
								fill="#16a34a"
								stroke="white" stroke-width="1.5"
								opacity={selectedForm === 'form2' ? 1 : 0.4} />
							<text x={f2x + 9} y={f2y + 4}
								fill="#16a34a" font-size="8.5" font-family="sans-serif" font-weight="700"
								opacity={selectedForm === 'form2' ? 1 : 0.4}>F2</text>
						{/if}
					{/if}
				{/if}
			{/if}

			<!-- ╔══ Strichmännchen ═══════════════════════════════════════════════════╗ -->
			{#if true}
				{@const pt  = currentPt()}
				{@const lp  = legPhase()}
				{@const pf  = phaseFrac()}
				{@const fig = figureSvg(fx(pt.xM), pt.yFeetM, pf, lp, inHitZone)}

				<ellipse cx={fx(pt.xM)} cy={GROUND_Y - 1}
					rx={14 + (pt.yFeetM > 0 ? pt.yFeetM * 7 : 0)} ry="4"
					fill="#94a3b8"
					opacity={pt.yFeetM > 0 ? Math.max(0.04, 0.22 - pt.yFeetM * 0.16) : 0.2} />

				<line x1={fx(pt.xM)} y1={fig.hipSvgY} x2={fig.kneeBckX} y2={fig.kneeBckY}
					stroke="#475569" stroke-width="2.5" stroke-linecap="round" opacity="0.6" />
				<line x1={fig.kneeBckX} y1={fig.kneeBckY} x2={fig.footBckX} y2={fig.footBckY}
					stroke="#475569" stroke-width="2" stroke-linecap="round" opacity="0.6" />

				<line x1={fx(pt.xM)} y1={fig.hipSvgY} x2={fx(pt.xM)} y2={fig.shoulderSvgY}
					stroke="#1e3a5f" stroke-width="3.5" stroke-linecap="round" opacity="0.85" />

				<line x1={fx(pt.xM)} y1={fig.shoulderSvgY} x2={fig.offArmX} y2={fig.offArmY}
					stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" opacity="0.65" />

				<line x1={fx(pt.xM)} y1={fig.hipSvgY} x2={fig.kneeFwdX} y2={fig.kneeFwdY}
					stroke="#1e3a5f" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />
				<line x1={fig.kneeFwdX} y1={fig.kneeFwdY} x2={fig.footFwdX} y2={fig.footFwdY}
					stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" opacity="0.8" />

				<line x1={fx(pt.xM)} y1={fig.shoulderSvgY} x2={fig.hitArmX} y2={fig.hitArmY}
					stroke={inOptZone ? '#f97316' : (inHitZone ? jumpColor() : '#1e3a5f')}
					stroke-width={inOptZone ? 4 : (inHitZone ? 3.5 : 2.5)}
					stroke-linecap="round" opacity={inOptZone || inHitZone ? 1 : 0.85} />
				<circle cx={fig.hitArmX} cy={fig.hitArmY} r={inOptZone ? 5 : 4}
					fill={inOptZone ? '#f97316' : (inHitZone ? jumpColor() : '#1e3a5f')}
					opacity={inOptZone || inHitZone ? 1 : 0.7} />

				<circle cx={fx(pt.xM)} cy={fig.headSvgY} r={fig.headR}
					fill="#fbbf24" opacity="0.9" />

				{#if pt.yFeetM > 0.05}
					<line x1={MARGIN_L - 2} y1={fig.hitArmY} x2={fig.hitArmX} y2={fig.hitArmY}
						stroke={inOptZone ? '#f97316' : (inHitZone ? jumpColor() : '#94a3b8')}
						stroke-width="1" stroke-dasharray="3,3"
						opacity={inOptZone ? 0.8 : (inHitZone ? 0.7 : 0.3)} />
				{/if}
			{/if}

			<!-- ╔══ Live-Timer ═══════════════════════════════════════════════════════╗ -->
			{#if animState === 'running'}
				<rect x={SVG_W - 108} y="8" width="92" height="30" rx="6"
					fill="#1e293b" opacity="0.07" />
				<text x={SVG_W - 62} y="28" text-anchor="middle" fill="#1e293b"
					font-size="15" font-family="monospace" font-weight="700">
					{(elapsedMs / 1000).toFixed(2)}s
				</text>
				{#if isApproach}
					<text x={SVG_W - 62} y="47" text-anchor="middle" fill="#64748b"
						font-size="9" font-family="sans-serif">
						Schritt {(currentStepIdx() + 1)}
					</text>
				{:else if isFlying}
					<text x={SVG_W - 62} y="47" text-anchor="middle"
						fill={inOptZone ? '#f97316' : (inHitZone ? jumpColor() : '#7c3aed')}
						font-size="9" font-family="sans-serif" font-weight="700">
						{inOptZone ? 'OPT. ZONE!' : (inHitZone ? 'Schlagzone' : 'Hangtime')}
					</text>
				{/if}
			{/if}

			<!-- ╔══ Zeitbalken (nach Animation) ══════════════════════════════════════╗ -->
			{#if animState === 'done'}
				<rect x={BAR_X} y={BAR_Y} width={BAR_W} height={BAR_H} rx="4" fill="#e2e8f0" />

				{#each sim.steps as step, i}
					{@const xStart = BAR_X + (i === 0 ? 0 : sim.steps[i-1].progress) * BAR_W}
					{@const segW   = (step.progress - (i === 0 ? 0 : sim.steps[i-1].progress)) * BAR_W}
					<rect x={xStart} y={BAR_Y} width={segW} height={BAR_H}
						fill={step.color} opacity="0.65" />
					{#if i > 0}
						<line x1={xStart} y1={BAR_Y - 1} x2={xStart} y2={BAR_Y + BAR_H + 1}
							stroke="white" stroke-width="1.5" opacity="0.8" />
					{/if}
					{@const labelX = xStart + segW / 2}
					<text x={labelX} y={BAR_Y + BAR_H + 11} text-anchor="middle"
						fill={step.color} font-size="7.5" font-family="monospace" font-weight="700">
						{step.durationMs.toFixed(0)}ms
					</text>
					<text x={labelX} y={BAR_Y + BAR_H + 20} text-anchor="middle"
						fill={step.color} font-size="7" font-family="sans-serif" opacity="0.75">
						{i + 1}.{step.foot}
					</text>
				{/each}

				<rect x={BAR_X + sim.takeoffProgress * BAR_W} y={BAR_Y - 2}
					width={(1 - sim.takeoffProgress) * BAR_W} height={BAR_H + 4}
					rx="3" fill={jumpColor()} opacity="0.7" />

				<!-- Normale Schlagzone -->
				{#if sim.hitZoneTimeS > 0}
					<rect x={BAR_X + sim.enterProgress * BAR_W} y={BAR_Y - 3}
						width={(sim.leaveProgress - sim.enterProgress) * BAR_W} height={BAR_H + 6}
						rx="2" fill="#16a34a" opacity="0.4" />
				{/if}

				<!-- Optimale Schlagzone (hervorgehoben) -->
				{#if sim.optZoneTimeS > 0}
					<rect x={BAR_X + sim.optEnterProg * BAR_W} y={BAR_Y - 6}
						width={(sim.optLeaveProg - sim.optEnterProg) * BAR_W} height={BAR_H + 12}
						rx="3" fill="#f97316" opacity="0.9" />
					<text
						x={BAR_X + (sim.optEnterProg + (sim.optLeaveProg - sim.optEnterProg) / 2) * BAR_W}
						y={BAR_Y - 9} text-anchor="middle"
						fill="#f97316" font-size="8" font-family="sans-serif" font-weight="700">
						{(sim.optZoneTimeS * 1000).toFixed(0)}ms
					</text>
				{/if}

				<line x1={BAR_X + sim.takeoffProgress * BAR_W} y1={BAR_Y - 4}
					x2={BAR_X + sim.takeoffProgress * BAR_W} y2={BAR_Y + BAR_H + 4}
					stroke="#f59e0b" stroke-width="2" />

				<text x={BAR_X} y={BAR_Y + BAR_H + 30} fill="#94a3b8"
					font-size="8" font-family="sans-serif">0s</text>
				<text x={BAR_X + sim.optLeaveProg * BAR_W} y={BAR_Y + BAR_H + 30} text-anchor="middle"
					fill="#f97316" font-size="8" font-family="sans-serif" font-weight="700">
					{(sim.optZoneLeaveT).toFixed(2)}s ↑
				</text>

				{@const legY = BAR_Y + BAR_H + 40}
				<rect x={BAR_X} y={legY} width="10" height="6" rx="2" fill="#0ea5e9" opacity="0.65" />
				<text x={BAR_X + 13} y={legY + 6} fill="#64748b" font-size="8" font-family="sans-serif">Schritte</text>
				<rect x={BAR_X + 65} y={legY} width="10" height="6" rx="2" fill={jumpColor()} opacity="0.7" />
				<text x={BAR_X + 78} y={legY + 6} fill={jumpColor()} font-size="8" font-family="sans-serif">Hangtime</text>
				<rect x={BAR_X + 140} y={legY} width="10" height="6" rx="2" fill="#16a34a" opacity="0.6" />
				<text x={BAR_X + 153} y={legY + 6} fill="#16a34a" font-size="8" font-family="sans-serif">Schlagzone</text>
				<rect x={BAR_X + 215} y={legY} width="10" height="6" rx="2" fill="#f97316" opacity="0.9" />
				<text x={BAR_X + 228} y={legY + 6} fill="#f97316" font-size="8" font-family="sans-serif">Opt. Zone</text>
			{/if}

			<!-- ╔══ Idle-Label ════════════════════════════════════════════════════╗ -->
			{#if animState === 'idle'}
				<text x={SVG_W / 2} y={fy(2.8)} text-anchor="middle"
					fill="#94a3b8" font-size="12" font-family="sans-serif" opacity="0.5">
					▶ Simulation starten
				</text>
			{/if}
		</svg>
	</div>

	<!-- ── Aktions-Zeile ──────────────────────────────────────────────────────── -->
	<div class="aaa-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="aaa-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Simulation starten'}
			</button>
		{:else}
			<button class="aaa-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
		<button class="aaa-slow-btn" class:active={slowMotion} onclick={toggleSlowMotion}
			title="Zeitlupe: Animation 4× langsamer">
			{slowMotion ? '🐢 Zeitlupe' : '🐇 Normal'}
		</button>
	</div>

	<!-- ── Ergebnis-Panel ────────────────────────────────────────────────────── -->
	{#if animState === 'done'}
		<div class="aaa-result-panel">
			{#each sim.steps as step}
				<div class="aaa-result-item">
					<span class="aaa-result-label" style="color: {step.color}">
						Schritt {step.idx + 1} ({step.foot})
					</span>
					<span class="aaa-result-value" style="color: {step.color}; font-size: 1rem">
						{step.durationMs.toFixed(0)} ms
					</span>
					<span class="aaa-result-sub" style="color: {step.color}">
						{(step.distM * 100).toFixed(0)} cm
					</span>
				</div>
				<div class="aaa-result-divider"></div>
			{/each}
			<div class="aaa-result-item">
				<span class="aaa-result-label">Hangtime</span>
				<span class="aaa-result-value" style="color: {jumpColor()}">
					{sim.hangTimeS.toFixed(2)} s
				</span>
			</div>
			<div class="aaa-result-divider"></div>
			<div class="aaa-result-item">
				<span class="aaa-result-label">Opt. Zone</span>
				<span class="aaa-result-value" style="color: #f97316; font-size: 1rem">
					{sim.optZoneTimeS > 0 ? (sim.optZoneTimeS * 1000).toFixed(0) + ' ms' : '—'}
				</span>
			</div>
			<div class="aaa-result-divider"></div>
			<div class="aaa-result-item">
				<span class="aaa-result-label">Schlagpunkt</span>
				<span class="aaa-result-value" style="color: #f97316; font-size: 1rem">
					{sim.optZoneLeaveT.toFixed(2)} s
				</span>
			</div>
			<div class="aaa-result-divider"></div>
			<div class="aaa-result-item">
				<span class="aaa-result-label">Angreifer bei Zuspiel</span>
				{#if true}
					{@const atSet = attackerAtSetTime()}
					<span class="aaa-result-value" style="color: {atSet.color}; font-size: 0.95rem">
						{atSet.label}
					</span>
					<span class="aaa-result-sub" style="color: {atSet.color}">
						{atSet.detail}
					</span>
				{/if}
			</div>
		</div>
	{:else}
		<div class="aaa-preview-panel">
			<span>Opt. Zone: <strong style="color: #f97316">{sim.optZoneTimeS > 0 ? (sim.optZoneTimeS * 1000).toFixed(0) + ' ms' : '—'}</strong></span>
			<span>Max. Hand: <strong>{sim.maxHandHeightM.toFixed(2)} m</strong></span>
			<span>Zuspiel bei: <strong style="color: {attackerAtSetTime().color}">{attackerAtSetTime().label}</strong></span>
		</div>
	{/if}

</div>

<style>
	.aaa-wrapper {
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

	/* ── Slider-Steuerung ──────────────────────────────────────────────────── */
	.aaa-controls { display: flex; flex-direction: column; gap: 0.6rem; }

	.aaa-slider-row {
		display: grid;
		grid-template-columns: 200px 1fr;
		grid-template-rows: auto auto;
		align-items: center;
		gap: 0 0.75rem;
	}

	.aaa-slider-label {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		grid-column: 1;
		grid-row: 1;
	}
	.aaa-slider-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: #64748b;
		font-family: inherit;
	}
	.aaa-slider-value {
		font-size: 0.85rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
		min-width: 60px;
		text-align: right;
	}

	.aaa-range {
		grid-column: 2;
		grid-row: 1 / 3;
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: #e2e8f0;
		outline: none;
		cursor: pointer;
		accent-color: var(--track-color, #0ea5e9);
	}
	.aaa-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px; height: 16px;
		border-radius: 50%;
		background: var(--track-color, #0ea5e9);
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0,0,0,0.2);
		transition: transform 100ms;
	}
	.aaa-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
	.aaa-range::-moz-range-thumb {
		width: 16px; height: 16px;
		border-radius: 50%;
		background: var(--track-color, #0ea5e9);
		border: none;
		cursor: pointer;
	}

	.aaa-slider-ticks {
		grid-column: 2;
		grid-row: 2;
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		color: #94a3b8;
		font-family: inherit;
		padding: 0 2px;
		margin-top: 1px;
	}

	/* ── Netzhöhe-Buttons ────────────────────────────────── */
	.aaa-net-row {
		display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid #f1f5f9;
		margin-bottom: 0.2rem;
	}
	.aaa-btn-group { display: flex; gap: 0.35rem; }
	.aaa-net-btn {
		padding: 0.3rem 1.1rem;
		border-radius: 0.375rem;
		border: 1.5px solid #64748b;
		background: transparent;
		color: #64748b;
		font-size: 0.875rem; font-weight: 500;
		cursor: pointer;
		transition: background 120ms, color 120ms;
		font-family: inherit;
	}
	.aaa-net-btn:hover { background: #f1f5f9; }
	.aaa-net-btn.active { background: #475569; color: white; border-color: #475569; }
	.aaa-form-desc {
		font-size: 0.78rem;
		font-style: italic;
		opacity: 0.85;
		font-family: inherit;
	}

	/* ── SVG ──────────────────────────────────────────────── */
	.aaa-svg-wrapper { width: 100%; }
	.aaa-svg {
		width: 100%; height: auto; display: block;
		border-radius: 0.5rem; border: 1px solid #e2e8f0;
	}

	/* ── Aktions-Zeile ────────────────────────────────────── */
	.aaa-action-row {
		display: flex; justify-content: center;
		align-items: center; gap: 0.75rem; flex-wrap: wrap;
	}
	.aaa-start-btn, .aaa-reset-btn {
		padding: 0.55rem 2.5rem; border-radius: 0.5rem; border: none;
		font-size: 1rem; font-weight: 700; cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.aaa-start-btn {
		background: #ff3500; color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.aaa-start-btn:hover {
		background: #e62f00; transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255,53,0,0.28);
	}
	.aaa-start-btn:active { transform: translateY(0); }
	.aaa-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.aaa-reset-btn:hover { background: #e2e8f0; }
	.aaa-slow-btn {
		padding: 0.45rem 1.1rem; border-radius: 0.5rem;
		border: 1.5px solid #94a3b8; background: #f8fafc; color: #475569;
		font-size: 0.875rem; font-weight: 600; cursor: pointer;
		transition: background 120ms, border-color 120ms, color 120ms;
		font-family: inherit;
	}
	.aaa-slow-btn:hover { background: #f1f5f9; border-color: #64748b; }
	.aaa-slow-btn.active { background: #fef9c3; border-color: #ca8a04; color: #92400e; }
	.aaa-slow-btn.active:hover { background: #fef08a; }

	/* ── Ergebnis-Panel ───────────────────────────────────── */
	.aaa-result-panel {
		display: flex; align-items: center; justify-content: center;
		gap: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0;
		border-radius: 0.5rem; padding: 0.9rem; flex-wrap: wrap;
	}
	.aaa-result-item {
		display: flex; flex-direction: column; align-items: center; gap: 1px;
	}
	.aaa-result-label {
		font-size: 0.65rem; color: #94a3b8;
		text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit;
	}
	.aaa-result-value {
		font-size: 1.1rem; font-weight: 700; color: #1e293b;
		font-family: 'Courier New', monospace;
	}
	.aaa-result-sub {
		font-size: 0.7rem; font-family: monospace; opacity: 0.75;
	}
	.aaa-result-divider { width: 1px; height: 42px; background: #e2e8f0; }

	/* ── Vorschau-Panel ───────────────────────────────────── */
	.aaa-preview-panel {
		display: flex; gap: 1rem; justify-content: center;
		font-size: 0.8rem; color: #64748b; flex-wrap: wrap; font-family: inherit;
	}
	.aaa-preview-panel strong { color: #1e293b; }

	/* ── Responsive ───────────────────────────────────────── */
	@media (max-width: 600px) {
		.aaa-wrapper { padding: 1rem; }
		.aaa-slider-row {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto auto;
		}
		.aaa-slider-label { grid-column: 1; grid-row: 1; }
		.aaa-range { grid-column: 1; grid-row: 2; }
		.aaa-slider-ticks { grid-column: 1; grid-row: 3; }
		.aaa-result-panel { gap: 0.5rem; }
	}
</style>
