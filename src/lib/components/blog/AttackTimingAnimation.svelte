<script>
	/**
	 * Interaktive Angriffs-Timing-Animation — Frontalansicht (Aufriss auf das Netz)
	 *
	 * Perspektive: Blick von der Angreifer-Seite direkt auf das Netz.
	 *   - SVG-x = Feldbreite (9m, Zone 5 links → Zone 1 rechts)
	 *   - SVG-y = Höhe über Boden
	 *   - Tiefe (welche Netzseite) wird durch Ball-Skalierung angedeutet:
	 *     Setter-Seite (hinter Netz) = kleine Ballgrösse
	 *     Angreifer-Seite (vor Netz) = grosse Ballgrösse
	 *
	 * Das Netz trennt die Szene horizontal: Ball fliegt von HINTER dem Netz
	 * (Setterseite, visuell gedimmt/kleiner) ÜBER das Netz auf die VORDERE Seite
	 * (Angriffszone).
	 *
	 * Echtes Volleyball-Netz: Oberkante = Netzhöhe, Unterkante ≈ 1m über Boden
	 * (das Netz ist ca. 1m breit/tief und hängt frei).
	 */

	// ─── Physik ───────────────────────────────────────────────────────────────────
	const G = 9.81; // m/s²

	// Netzhöhen
	const NET_HEIGHTS = [
		{ id: 'herren', label: 'Herren', heightM: 2.43 },
		{ id: 'damen',  label: 'Damen',  heightM: 2.24 },
	];

	// Netz-Geometrie (real)
	// NET_BOTTOM_M wird reaktiv berechnet: genau 1m unter der Netzkante
	const ANTENNA_ABOVE_M = 0.80;  // Antenne ragt 80cm über Netzkante
	const FIELD_WIDTH_M   = 9.0;
	const SETTER_X_M      = 5.5;   // Standard-Passposition: 3.5m von rechts

	// ─── Zuspieler-Grösse ─────────────────────────────────────────────────────────
	const SETTER_HEIGHT_MIN_M = 1.55;
	const SETTER_HEIGHT_MAX_M = 2.05;
	const SETTER_HEIGHT_DEF_M = 1.75;

	// Sprungpass: Zuspieler springt diese Höhe (Schwerpunkt)
	const JUMP_SET_HEIGHT_M = 0.35; // ca. 35cm Absprung beim Sprungpass

	// ─── Pass-Positionen ──────────────────────────────────────────────────────────
	// xM: x-Position in Metern (von links)
	// spreadM: Standardabweichung der Passposition in Metern (0 = perfekte Position)
	const PASS_POSITIONS = [
		{ id: 'standard', label: 'Standard',  xM: 5.5,  spreadM: 0.0  },
		{ id: 'gut',      label: 'Gut',        xM: 5.5,  spreadM: 0.3  },
		{ id: 'mittel',   label: 'Mittel',     xM: 5.5,  spreadM: 0.7  },
		{ id: 'schlecht', label: 'Schlecht',   xM: 5.5,  spreadM: 1.4  },
	];

	// Schlagzone-Höhen (reaktiv auf Netzhöhe — Unterkante bündig mit Netzkante)
	// Werden weiter unten als $derived berechnet

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W      = 640;
	const SVG_H      = 400;
	const PX_PER_M   = 58;
	const MARGIN_L   = 48;  // links: Platz für Höhen-Beschriftung
	const MARGIN_R   = 12;
	const GROUND_Y   = SVG_H - 44; // Boden-y

	// Feldbreite im SVG
	const FIELD_W_PX  = FIELD_WIDTH_M * PX_PER_M; // 9 * 58 = 522px
	const FIELD_LEFT  = MARGIN_L;
	const FIELD_RIGHT = MARGIN_L + FIELD_W_PX;

	// Netz-x-Positionen (gesamte Feldbreite)
	const NET_LEFT_X  = FIELD_LEFT;
	const NET_RIGHT_X = FIELD_RIGHT;

	// Antennen: auf der Seitenlinie, ragen ANTENNA_ABOVE_M über die Netzkante
	const ANTENNA_WIDTH_PX = 3; // px Breite der Antenne

	/** @param {number} xM */
	function fx(xM) { return FIELD_LEFT + xM * PX_PER_M; }
	/** @param {number} yM */
	function fy(yM) { return GROUND_Y - yM * PX_PER_M; }

	// ─── Angriffszonen (5 Zonen: Z5 links bis Z1 rechts, je 1.5m breit) ─────────
	// Zonenmitten: 0.9 / 2.7 / 4.5 / 6.3 / 8.1m (Mitte der jeweiligen 1.8m-Felder)
	// Zonenbreite: 1.5m (halbe Breite = 0.75m) → 0.15m Lücke auf jeder Seite
	const ZONES = [
		{ id: 'z5', label: 'Z5', color: '#2563eb', xM: 0.9 },
		{ id: 'z4', label: 'Z4', color: '#0891b2', xM: 2.7 },
		{ id: 'z3', label: 'Z3', color: '#7c3aed', xM: 4.5 },
		{ id: 'z2', label: 'Z2', color: '#d97706', xM: 6.3 },
		{ id: 'z1', label: 'Z1', color: '#dc2626', xM: 8.1 },
	];

	// Zone-Breite: 1.5m, halbe Breite = 0.75m
	const ZONE_HALF_W_M = 0.75;

	// ─── Timing-Typen ────────────────────────────────────────────────────────────
	// peakAboveNetM = Abstand Ball-Mittelpunkt über Netzkante am Scheitelpunkt
	// Shoot/Quick: Ballunterkante 20cm über Netz → Mittelpunkt = 0.20 + 0.105 = 0.305m
	const TIMINGS = [
		{
			id: 'quick',
			label: 'Shoot / Quick',
			color: '#dc2626',
			peakAboveNetM: 0.305,  // Ballunterkante exakt 20cm über Netz
			errorScale: 0.04,      // kleiner Fehler (schnell, präzise)
			description: 'Flaches, schnelles Zuspiel knapp über das Netz.',
		},
		{
			id: 'normal',
			label: 'Normal',
			color: '#16a34a',
			peakAboveNetM: 0.955, // Ballunterkante knapp über Antennenspitze (0.80 + 0.105 + 0.05)
			errorScale: 0.10,     // mittlerer Fehler
			description: 'Klassisches Zuspiel mit mittlerer Höhe.',
		},
		{
			id: 'oos',
			label: 'Out of System',
			color: '#ea580c',
			peakAboveNetM: 2.2,
			errorScale: 0.28,      // grosser Fehler (ausser Kontrolle)
			description: 'Hohes Notfall-Zuspiel – viel Zeit für den Angreifer.',
		},
	];

	// Ball-Radius in Metern (für Shoot/Quick: Unterkante 20cm über Netz)
	const BALL_RADIUS_M = 0.105; // Volleyball-Radius real ~10.5cm

	// ─── Setter-Geometrie (proportional zur Körpergrösse) ─────────────────────────
	/**
	 * Berechnet alle relevanten Proportionen des Zuspielers.
	 * Basis: 1.75m = 101.5px bei 58px/m
	 *   - Hände: 103/175 * height = 58.9% der Körpergrösse
	 *   - Schulter: 79/101.5 * height
	 *   - Kopf-Mitte: 93/101.5 * height
	 *   - Hüfte: 47/101.5 * height
	 * @param {number} heightM - Körpergrösse in Metern
	 * @param {boolean} isJump - Sprungpass?
	 * @param {number} groundY - SVG-y des Bodens
	 */
	function setterGeometry(heightM, isJump, groundY) {
		const hPx       = heightM * PX_PER_M;
		const scale     = hPx / (1.75 * PX_PER_M); // Skalierungsfaktor relativ zu 1.75m
		// Fussposition (Sprungpass: Füsse leicht über Boden)
		const jumpOffsetPx = isJump ? JUMP_SET_HEIGHT_M * PX_PER_M * 0.55 : 0;
		const feetY     = groundY - jumpOffsetPx;
		// Proportionen (normalisiert auf 1.75m-Figur)
		const hipY      = feetY   - 47  * scale;
		const shoulderY = feetY   - 79  * scale;
		const headY     = feetY   - 93  * scale;
		const handY     = feetY   - 103 * scale;
		const headR     = 8 * scale;
		const bodyW     = 6 * scale;  // halbe Breite Hüfte/Schulter
		const armW      = 9 * scale;  // halbe Breite Hände
		return { feetY, hipY, shoulderY, headY, handY, headR, bodyW, armW, scale };
	}

	// ─── Physik-Berechnung ────────────────────────────────────────────────────────
	// Ball fällt nach der Schlagzone noch EXTRA_DROP_M unter die Schlagzone-Unterkante
	const EXTRA_DROP_M = 0.5;

	/**
	 * Berechnet die Ballflugkurve.
	 *
	 * @param {number} targetXM       - Ziel-x der Angriffszone
	 * @param {number} peakAboveNetM  - Wie weit der Ball-Mittelpunkt über der Netzkante ist
	 * @param {number} netHeightM     - Netzhöhe in Metern
	 * @param {number} hitZoneMinM    - Unterkante Schlagzone
	 * @param {number} hitZoneMaxM    - Oberkante Schlagzone
	 * @param {number} errDy          - Zufälliger Fehler auf Scheitelpunkt-Höhe (m)
	 * @param {number} errDx          - Zufälliger Fehler auf Ziel-x (m)
	 * @param {boolean} isQuick  - Quick darf auch auf Aufwärtsast gezählt werden
	 * @param {number} xStartM   - effektive x-Startposition (nach Streuung)
	 * @param {number} yStartM   - Handposition in Metern über Boden
	 */
	function calcTrajectory(targetXM, peakAboveNetM, netHeightM, hitZoneMinM, hitZoneMaxM, errDy = 0, errDx = 0, isQuick = false, xStartM = SETTER_X_M, yStartM = 1.776) {
		// Ball startet in den Händen des Zuspielers (Position inkl. Streuung)
		const xStart = xStartM;
		const yStart = yStartM;

		// Scheitelpunkt mit Fehler
		const yPeak = netHeightM + peakAboveNetM + errDy;

		// Die Parabel wird so ausgerichtet dass der Ball targetXM genau bei
		// hitZoneMidM durchquert — das ist by design der Form-2-Punkt.
		// Streuung (errDy) verschiebt den Scheitelpunkt leicht.
		const hitZoneMidM = (hitZoneMinM + hitZoneMaxM) / 2;

		// Für Quick liegt der Scheitelpunkt schon in der Zone
		const yPassThrough = yPeak >= hitZoneMidM ? hitZoneMidM : yPeak;

		// Ziel-x mit Fehler — Ball soll targetXM bei yPassThrough erreichen
		const xTarget = targetXM + errDx;
		const dx      = xTarget - xStart;

		// Aufwärts bis Scheitelpunkt
		const tUp     = Math.sqrt(2 * Math.max(0.01, yPeak - yStart) / G);
		// Zeit vom Scheitelpunkt bis yPassThrough (Abwärtsast)
		const tToMid  = Math.sqrt(2 * Math.max(0, yPeak - yPassThrough) / G);
		// Gesamtdauer bis zum Endpunkt (EXTRA_DROP_M unter Schlagzone-Unterkante)
		const yEnd    = Math.max(0.1, hitZoneMinM - EXTRA_DROP_M);
		const tDown   = Math.sqrt(2 * Math.max(0, yPeak - Math.min(yPeak, yEnd)) / G);
		const flightTimeS = tUp + tDown;

		// x-Geschwindigkeit: Ball soll bei t = tUp + tToMid an x = xTarget sein
		// x(t) = xStart + vx * t  →  vx = dx / (tUp + tToMid)
		// Überschreibe dx so dass der Ball targetXM genau bei tUp+tToMid erreicht
		// (statt am Endpunkt). Dazu skalieren wir dx entsprechend.
		const tAtTarget = tUp + tToMid;
		// dx bleibt das gleiche — aber die x-Bewegung ist gleichmässig, also
		// erreicht der Ball xTarget bei t = tAtTarget und ist danach schon
		// etwas weiter. Wir wollen dass der Ball bei xTarget ankommt wenn er
		// hitZoneMidM erreicht, also setzen wir xTarget als Ziel bei tAtTarget:
		const dxAdj = (flightTimeS > 0 && tAtTarget > 0)
			? dx * (flightTimeS / tAtTarget)
			: dx;

		// Kraft-Vektor (normalisiert) für Pfeil-Darstellung
		const xAtPeak = xStart + dxAdj * (tUp / flightTimeS);
		const dfx = xAtPeak - xStart;
		const dfy = yPeak - yStart;
		const fMag = Math.sqrt(dfx * dfx + dfy * dfy);
		const forceX = dfx / fMag;
		const forceY = dfy / fMag;

		// Punkte berechnen
		const N = 120;
		/** @type {{xM: number, yM: number, t: number}[]} */
		const points = [];
		for (let i = 0; i <= N; i++) {
			const p = i / N;
			const t = p * flightTimeS;
			const xM = xStart + dxAdj * p;
			let yM;
			if (t <= tUp) {
				yM = yPeak - G / 2 * Math.pow(tUp - t, 2);
			} else {
				const tf = t - tUp;
				yM = yPeak - G / 2 * tf * tf;
			}
			points.push({ xM, yM, t });
		}

		// ── Timing-Fenster ──────────────────────────────────────────────────────
		const xZoneMin = targetXM - ZONE_HALF_W_M;
		const xZoneMax = targetXM + ZONE_HALF_W_M;

		let hwEnter = 1, hwLeave = 1;
		let tEnter = flightTimeS, tLeave = flightTimeS;

		let entryIdx = -1;

		if (isQuick) {
			// Erster Eintritt (Aufwärts oder Abwärts)
			for (let i = 0; i < points.length; i++) {
				const { xM, yM } = points[i];
				if (yM >= hitZoneMinM && yM <= hitZoneMaxM && xM >= xZoneMin && xM <= xZoneMax) {
					entryIdx = i;
					break;
				}
			}
		} else {
			// Nur Abwärtsast: suche ab Scheitelpunkt vorwärts
			const peakIdx = Math.round(tUp / flightTimeS * N);
			for (let i = peakIdx; i < points.length; i++) {
				const { xM, yM } = points[i];
				if (yM >= hitZoneMinM && yM <= hitZoneMaxM && xM >= xZoneMin && xM <= xZoneMax) {
					entryIdx = i;
					break;
				}
			}
		}

		if (entryIdx >= 0) {
			tEnter  = points[entryIdx].t;
			hwEnter = entryIdx / N;

			// Austritt: erster Punkt nach entryIdx der die Zone verlässt
			let exitIdx = points.length - 1;
			for (let i = entryIdx + 1; i < points.length; i++) {
				const { xM, yM } = points[i];
				if (yM < hitZoneMinM || yM > hitZoneMaxM || xM < xZoneMin || xM > xZoneMax) {
					exitIdx = i - 1;
					break;
				}
			}
			tLeave  = points[exitIdx].t;
			hwLeave = exitIdx / N;
		}

		const hitWindowS = Math.max(0, tLeave - tEnter);

		// Netz-Überquerung: Scheitelpunkt
		const netCrossProgress = tUp / flightTimeS;

		return { points, flightTimeS, hitWindowS, hwEnter, hwLeave, tEnter, tLeave, forceX, forceY, netCrossProgress };
	}

	// ─── Reaktiver Zustand ────────────────────────────────────────────────────────
	/** @type {{ oncomplete?: (flightTimeS: number) => void }} */
	let { oncomplete } = $props();

	const FORMS = [
		{ id: 'form1', label: 'Form 1', color: '#dc2626' },
		{ id: 'form2', label: 'Form 2', color: '#16a34a' },
	];

	// ─── Persistierte IDs ────────────────────────────────────────────────────────
	// SSR-safe: localStorage nur im Browser verwenden (nicht beim Pre-Render)
	/** @param {string} key @param {string} def */
	function loadId(key, def) {
		try { return localStorage.getItem(key) ?? def; } catch { return def; }
	}
	/** @param {string} key @param {string} val */
	function saveId(key, val) {
		try { localStorage.setItem(key, val); } catch { /* SSR / quota */ }
	}
	/** @param {string} key @param {number} def */
	function loadNum(key, def) {
		try {
			const v = localStorage.getItem(key);
			if (v === null) return def;
			const n = parseFloat(v);
			return isNaN(n) ? def : n;
		} catch { return def; }
	}
	/** @param {string} key @param {number} val */
	function saveNum(key, val) {
		try { localStorage.setItem(key, String(val)); } catch { /* SSR / quota */ }
	}
	/** @param {string} key @param {boolean} def */
	function loadBool(key, def) {
		try {
			const v = localStorage.getItem(key);
			if (v === null) return def;
			return v === 'true';
		} catch { return def; }
	}
	/** @param {string} key @param {boolean} val */
	function saveBool(key, val) {
		try { localStorage.setItem(key, val ? 'true' : 'false'); } catch { /* SSR / quota */ }
	}

	let _formId       = $state(/** @type {'form1'|'form2'} */ (/** @type {any} */ (loadId('ata_form',    'form2'))));
	let _zoneId       = $state(loadId('ata_zone',    ZONES[2].id)); // Z3 als Standard
	let _timingId     = $state(loadId('ata_timing',  TIMINGS[1].id));
	let _netId        = $state(loadId('ata_net',     NET_HEIGHTS[0].id));
	let _passId       = $state(loadId('ata_pass',    PASS_POSITIONS[0].id));
	let _setterHeight = $state(loadNum('ata_setter_height', SETTER_HEIGHT_DEF_M));
	let _jumpSet      = $state(loadBool('ata_jump_set', false));

	let selectedForm    = $derived(/** @type {'form1'|'form2'} */ (_formId));
	let selectedZone    = $derived(ZONES.find(z => z.id === _zoneId)       ?? ZONES[2]);
	let selectedTiming  = $derived(TIMINGS.find(t => t.id === _timingId)   ?? TIMINGS[1]);
	let selectedNetType = $derived(NET_HEIGHTS.find(n => n.id === _netId)  ?? NET_HEIGHTS[0]);
	let selectedPassPos = $derived(PASS_POSITIONS.find(p => p.id === _passId) ?? PASS_POSITIONS[0]);

	// Klemmung der Zuspieler-Grösse
	let setterHeightM = $derived(
		Math.max(SETTER_HEIGHT_MIN_M, Math.min(SETTER_HEIGHT_MAX_M, _setterHeight))
	);

	// Setter-Geometrie reaktiv auf Grösse und Sprungpass
	let setterGeo = $derived(setterGeometry(setterHeightM, _jumpSet, GROUND_Y));

	// Setter-Handposition in Metern (für Trajektorie)
	let setterHandM = $derived(
		(setterGeo.handY < GROUND_Y ? (GROUND_Y - setterGeo.handY) / PX_PER_M : 0)
	);

	// Änderungen in localStorage schreiben
	$effect(() => { saveId('ata_form',   _formId);   });
	$effect(() => { saveId('ata_zone',   _zoneId);   });
	$effect(() => { saveId('ata_timing', _timingId); });
	$effect(() => { saveId('ata_net',    _netId);    });
	$effect(() => { saveId('ata_pass',   _passId);   });
	$effect(() => { saveNum('ata_setter_height', _setterHeight); });
	$effect(() => { saveBool('ata_jump_set', _jumpSet); });

	let animState       = $state(/** @type {'idle'|'running'|'done'} */ ('idle'));
	let animProgress    = $state(0);
	let elapsedMs       = $state(0);

	// Zufälliger Fehler für den aktuellen Abspiel-Versuch
	let currentErrDy    = $state(0);  // Höhenfehler in Metern
	let currentErrDx    = $state(0);  // x-Fehler in Metern
	// Effektive Setter-x-Position (Standard + Streuung)
	let currentSetterX  = $state(SETTER_X_M);

	/** @type {number|null} */
	let rafId = null;
	let animStartTime = 0;

	// Reaktiv auf alle Auswahl-Parameter
	let netHeightM   = $derived(selectedNetType.heightM);
	// Schlagzone: feste Höhe relativ zur Netzkante.
	let hitZoneMinM  = $derived(netHeightM);
	let hitZoneMaxM  = $derived(netHeightM + 0.75);
	let hitZoneMidM  = $derived((hitZoneMinM + hitZoneMaxM) / 2);
	let traj         = $derived(calcTrajectory(
		selectedZone.xM, selectedTiming.peakAboveNetM, netHeightM,
		hitZoneMinM, hitZoneMaxM,
		currentErrDy, currentErrDx,
		selectedTiming.id === 'quick',
		currentSetterX,
		setterHandM,
	));

	// Vergleichstrajektorie: gleiche Parameter aber ohne Sprung (Bodenstand)
	// Damit kann der Zeitunterschied durch den Sprungpass berechnet werden.
	let setterHandGroundM = $derived(
		(() => {
			const geoGround = setterGeometry(setterHeightM, false, GROUND_Y);
			return (geoGround.handY < GROUND_Y ? (GROUND_Y - geoGround.handY) / PX_PER_M : 0);
		})()
	);
	let trajGround = $derived(_jumpSet ? calcTrajectory(
		selectedZone.xM, selectedTiming.peakAboveNetM, netHeightM,
		hitZoneMinM, hitZoneMaxM,
		0, 0,
		selectedTiming.id === 'quick',
		SETTER_X_M,
		setterHandGroundM,
	) : null);
	// Zeitgewinn durch Sprungpass in ms (positiv = Sprung ist schneller)
	let jumpSavingMs = $derived(
		_jumpSet && trajGround
			? (trajGround.tLeave - traj.tLeave) * 1000
			: 0
	);

	// SVG-x des Setters (reaktiv auf currentSetterX)
	let setterSvgX = $derived(fx(currentSetterX));

	// Netz SVG-y Positionen (reaktiv auf Netzhöhe)
	// Netzunterkante = genau 1m unter Netzkante
	let netBottomM   = $derived(netHeightM - 1.0);
	let netTopY      = $derived(fy(netHeightM));
	let netBottomY   = $derived(fy(netBottomM));
	// Pfosten: genau bis zur Netzkante oben (= netTopY)
	let postTopY     = $derived(netTopY);
	// Antennen: 80cm über Netzkante
	let antennaTopY  = $derived(fy(netHeightM + ANTENNA_ABOVE_M));

	// Aktueller Ball-Punkt
	let ballPt = $derived(() => {
		const pts = traj.points;
		const idx = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		return pts[Math.max(0, idx)];
	});

	// Ball ist vor dem Netz (Angreifer-Seite)?
	let ballBeforeNet = $derived(animProgress > traj.netCrossProgress);

	// Ball in Schlagzone?
	let inHitZone = $derived(
		(animState === 'running' || animState === 'done') &&
		animProgress >= traj.hwEnter &&
		animProgress <= traj.hwLeave,
	);

	// Ball-Skalierung: hinter Netz = kleiner (Perspektive / Tiefe)
	let ballScale = $derived(() => {
		const p = animProgress;
		const nc = traj.netCrossProgress;
		if (p <= nc) {
			// Setter-Seite: scale von 0.62 → 0.78
			return 0.62 + (p / nc) * 0.16;
		} else {
			// Angreifer-Seite: scale von 0.78 → 1.0
			return 0.78 + ((p - nc) / (1 - nc)) * 0.22;
		}
	});

	// Trail-Pfad bis zum aktuellen Fortschritt
	let trailSegments = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0 || animProgress === 0) return { behind: '', before: '' };
		const nc  = traj.netCrossProgress;
		const end = Math.min(Math.floor(animProgress * pts.length), pts.length - 1);
		const vis = pts.slice(0, end + 1);

		const splitIdx = Math.floor(nc * pts.length);

		const toPath = (/** @type {typeof pts} */ arr) => {
			if (arr.length < 2) return '';
			return arr.map((p, i) =>
				`${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`
			).join(' ');
		};

		if (end <= splitIdx) {
			return { behind: toPath(vis), before: '' };
		} else {
			const behindPts = pts.slice(0, splitIdx + 1);
			const beforePts = [pts[splitIdx], ...vis.slice(splitIdx + 1)];
			return { behind: toPath(behindPts), before: toPath(beforePts) };
		}
	});

	// Vorschau-Pfad (Idle)
	let previewPath = $derived(() => {
		const pts = traj.points;
		if (pts.length === 0) return '';
		return pts.map((p, i) =>
			`${i === 0 ? 'M' : 'L'} ${fx(p.xM).toFixed(1)} ${fy(p.yM).toFixed(1)}`
		).join(' ');
	});

	// Kraft-Pfeil
	const FORCE_BASE = 48;
	let fLen      = $derived(FORCE_BASE * (0.65 + selectedTiming.peakAboveNetM / 3.5));
	let forceVis  = $derived(animState === 'running' && animProgress < 0.14);
	let forceOpac = $derived(forceVis ? Math.max(0, 1 - animProgress / 0.14) : 0);

	let fax2 = $derived(setterSvgX + traj.forceX * fLen);
	let fay2 = $derived(setterGeo.handY - traj.forceY * fLen);

	// Schlagzone SVG-x
	let hzX = $derived(fx(selectedZone.xM));

	// Kontaktzeitpunkt (form-spezifisch) in Sekunden — direkt aus absoluten Zeiten
	// Form 1 = Ende Schlagfenster (tLeave), Form 2 = Mitte (tEnter + Fenster/2)
	let contactTimeS = $derived(
		selectedForm === 'form1'
			? traj.tLeave
			: traj.tEnter + traj.hitWindowS * 0.5
	);
	// Progress-Wert für Kontaktpunkt (für SVG-Positionierung)
	let contactProg = $derived(contactTimeS / traj.flightTimeS);

	// Zeitbalken-Konstanten
	const BAR_X = FIELD_LEFT;
	const BAR_W = FIELD_W_PX;
	const BAR_Y = 18;
	const BAR_H = 8;

	/** Erzeugt eine normalverteilte Zufallszahl mit Standardabweichung 1 */
	function randGauss() {
		const u1 = Math.random(), u2 = Math.random();
		return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
	}

	// ─── Animation-Steuerung ─────────────────────────────────────────────────────
	function startAnimation() {
		if (rafId !== null) cancelAnimationFrame(rafId);

		// Passposition-Streuung: Setter steht nicht immer an der Idealposition
		const spread = selectedPassPos.spreadM;
		currentSetterX = selectedPassPos.xM + randGauss() * spread;
		// Begrenzen auf das Feld
		currentSetterX = Math.max(0.3, Math.min(FIELD_WIDTH_M - 0.3, currentSetterX));

		// Zuspiel-Fehler proportional zur Kraft (errorScale)
		const es = selectedTiming.errorScale;
		currentErrDy = randGauss() * es;
		currentErrDx = randGauss() * es * 0.6;

		animProgress  = 0;
		elapsedMs     = 0;
		animState     = 'running';
		animStartTime = performance.now();

		const duration = traj.flightTimeS * 1000;

		/** @param {number} now */
		function frame(now) {
			const elapsed  = now - animStartTime;
			const progress = Math.min(elapsed / duration, 1);
			animProgress = progress;
			elapsedMs    = elapsed;
			if (progress < 1) {
				rafId = requestAnimationFrame(frame);
			} else {
				animProgress = 1;
				animState    = 'done';
				rafId = null;
				oncomplete?.(contactTimeS);
			}
		}
		rafId = requestAnimationFrame(frame);
	}

	function resetAnimation() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		animProgress   = 0;
		elapsedMs      = 0;
		animState      = 'idle';
		currentErrDy   = 0;
		currentErrDx   = 0;
		currentSetterX = selectedPassPos.xM;
	}

	$effect(() => { selectedZone; selectedTiming; selectedNetType; selectedPassPos; selectedForm; setterHeightM; _jumpSet; resetAnimation(); });
	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });
</script>

<div class="ata-wrapper">

	<!-- ── Steuerung ──────────────────────────────────────────────────────────── -->
	<div class="ata-controls">
		<div class="ata-control-group">
			<span class="ata-label">Angriffszone</span>
			<div class="ata-btn-group">
				{#each ZONES as zone (zone.id)}
					<button
						class="ata-btn"
						class:active={selectedZone.id === zone.id}
						style="--zone-color: {zone.color}"
					onclick={() => (_zoneId = zone.id)}
				>{zone.label}</button>
				{/each}
			</div>
		</div>

		<div class="ata-control-group">
			<span class="ata-label">Zuspiel-Timing</span>
			<div class="ata-btn-group">
				{#each TIMINGS as timing (timing.id)}
					<button
						class="ata-btn"
						class:active={selectedTiming.id === timing.id}
						style="--zone-color: {timing.color}"
					onclick={() => (_timingId = timing.id)}
				>{timing.label}</button>
				{/each}
			</div>
		</div>

		<div class="ata-control-group">
			<span class="ata-label">Netzhöhe</span>
			<div class="ata-btn-group">
				{#each NET_HEIGHTS as nh (nh.id)}
					<button
						class="ata-btn"
						class:active={selectedNetType.id === nh.id}
						style="--zone-color: #64748b"
					onclick={() => (_netId = nh.id)}
				>{nh.label} ({nh.heightM.toFixed(2)}m)</button>
				{/each}
			</div>
		</div>

		<div class="ata-control-group">
			<span class="ata-label">Passqualität</span>
			<div class="ata-btn-group">
				{#each PASS_POSITIONS as pp (pp.id)}
					<button
						class="ata-btn"
						class:active={selectedPassPos.id === pp.id}
						style="--zone-color: #f59e0b"
					onclick={() => (_passId = pp.id)}
				>{pp.label}</button>
				{/each}
			</div>
		</div>

		<!-- Zuspieler-Grösse -->
		<div class="ata-control-group">
			<span class="ata-label">Zuspieler-Grösse</span>
			<div class="ata-slider-group">
				<input
					type="range"
					class="ata-slider"
					min={SETTER_HEIGHT_MIN_M}
					max={SETTER_HEIGHT_MAX_M}
					step="0.01"
					bind:value={_setterHeight}
				/>
				<span class="ata-slider-val">{setterHeightM.toFixed(2)} m</span>
			</div>
		</div>

		<!-- Sprungpass-Toggle -->
		<div class="ata-control-group">
			<span class="ata-label">Zuspielart</span>
			<div class="ata-btn-group">
				<button
					class="ata-btn"
					class:active={!_jumpSet}
					style="--zone-color: #475569"
					onclick={() => (_jumpSet = false)}
				>Bodenpass</button>
				<button
					class="ata-btn"
					class:active={_jumpSet}
					style="--zone-color: #7c3aed"
					onclick={() => (_jumpSet = true)}
				>Sprungpass</button>
			</div>
		</div>

		<div class="ata-control-group">
			<span class="ata-label">Angriffsform</span>
			<div class="ata-btn-group">
				{#each FORMS as f (f.id)}
					<button
						class="ata-btn"
						class:active={selectedForm === f.id}
						style="--zone-color: {f.color}"
						onclick={() => (_formId = /** @type {'form1'|'form2'} */ (f.id))}>
						{f.label}
					</button>
				{/each}
			</div>

		</div>

		<p class="ata-timing-desc">{selectedTiming.description}</p>
	</div>

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="ata-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="ata-svg"
			role="img"
			aria-label="Angriffs-Timing-Simulation Frontalansicht"
		>
			<!-- Definitionen für Marker -->
			<defs>
				<marker id="force-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
					<polygon points="0 0, 8 4, 0 8" fill={selectedTiming.color} />
				</marker>
			</defs>

			<!-- ╔══ Hintergrund ════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Hallen-Boden -->
			<rect x="0" y={GROUND_Y + 1} width={SVG_W} height={SVG_H - GROUND_Y} fill="#e8ecf0" />

			<!-- ╔══ Boden-Feldmarkierungen ══════════════════════════════════════╗ -->
			<!-- Feldbelag -->
			<rect x={FIELD_LEFT} y={GROUND_Y - 4} width={FIELD_W_PX} height="6" fill="#d4dde8" rx="1" />
			<!-- Seitenlinien -->
			<line x1={FIELD_LEFT}  y1={GROUND_Y - 3} x2={FIELD_LEFT}  y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			<line x1={FIELD_RIGHT} y1={GROUND_Y - 3} x2={FIELD_RIGHT} y2={GROUND_Y + 12} stroke="#64748b" stroke-width="2.5" />
			<!-- Mittellinie (wo das Netz steht) -->
			<line x1={FIELD_LEFT} y1={GROUND_Y + 1} x2={FIELD_RIGHT} y2={GROUND_Y + 1} stroke="#94a3b8" stroke-width="1" opacity="0.5" />
			<!-- Zonen-Trennlinien (5 Zonen à 1.8m → 4 Trennlinien bei 1.8, 3.6, 5.4, 7.2m) -->
			{#each [1.8, 3.6, 5.4, 7.2] as xM}
				<line x1={fx(xM)} y1={GROUND_Y + 2} x2={fx(xM)} y2={GROUND_Y + 10} stroke="#94a3b8" stroke-width="1" opacity="0.6" />
			{/each}
			<!-- Zonen-Labels am Boden: Z1 rechts bis Z5 links -->
			{#each ZONES as zone (zone.id)}
				<text x={fx(zone.xM)} y={GROUND_Y + 22} text-anchor="middle" fill={zone.color} font-size="9" font-family="sans-serif" font-weight="600" opacity="0.7">{zone.label}</text>
			{/each}

			<!-- Boden-Linie -->
			<line x1={FIELD_LEFT - 10} y1={GROUND_Y} x2={FIELD_RIGHT + 10} y2={GROUND_Y} stroke="#94a3b8" stroke-width="1.5" />

			<!-- ╔══ Pass-Positionen (Bodenmarkierungen, immer sichtbar) ════════╗ -->
			<!-- Streuungsring: zeigt den 1σ-Bereich der Passposition -->
			{#if selectedPassPos.spreadM > 0}
				<ellipse
					cx={fx(selectedPassPos.xM)}
					cy={GROUND_Y - 2}
					rx={selectedPassPos.spreadM * PX_PER_M}
					ry="5"
					fill="#f59e0b"
					opacity="0.15"
				/>
				<ellipse
					cx={fx(selectedPassPos.xM)}
					cy={GROUND_Y - 2}
					rx={selectedPassPos.spreadM * PX_PER_M}
					ry="5"
					fill="none"
					stroke="#f59e0b"
					stroke-width="1"
					stroke-dasharray="3,2"
					opacity="0.5"
				/>
			{/if}
			<!-- Idealposition (Kreuz) -->
			<line
				x1={fx(selectedPassPos.xM) - 6} y1={GROUND_Y - 2}
				x2={fx(selectedPassPos.xM) + 6} y2={GROUND_Y - 2}
				stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" opacity="0.8"
			/>
			<line
				x1={fx(selectedPassPos.xM)} y1={GROUND_Y - 7}
				x2={fx(selectedPassPos.xM)} y2={GROUND_Y + 3}
				stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" opacity="0.8"
			/>
			<!-- Effektive Setter-Position (nur während/nach Animation) -->
			{#if animState !== 'idle' && selectedPassPos.spreadM > 0}
				<circle
					cx={setterSvgX}
					cy={GROUND_Y - 2}
					r="3"
					fill="#f59e0b"
					opacity="0.9"
				/>
			{/if}

			<!-- ╔══ Höhen-Referenzlinien (links) ════════════════════════════════╗ -->
			{#each [1, 2, 3, 4] as hM}
				<line x1={FIELD_LEFT - 8} y1={fy(hM)} x2={FIELD_LEFT} y2={fy(hM)} stroke="#cbd5e1" stroke-width="1" />
				<text x={FIELD_LEFT - 10} y={fy(hM) + 3} text-anchor="end" fill="#94a3b8" font-size="8" font-family="sans-serif">{hM}m</text>
			{/each}

			<!-- ╔══ Alle 5 Angriffszonen (immer sichtbar, über dem Netz) ════════╗ -->
			{#each ZONES as zone (zone.id)}
				{@const zx         = fx(zone.xM)}
				{@const zHalfPx    = ZONE_HALF_W_M * PX_PER_M}
				{@const isSelected = zone.id === selectedZone.id}
				{@const isHit      = inHitZone && isSelected}
				<!-- Bodenmarkierung -->
				<rect
					x={zx - zHalfPx}
					y={GROUND_Y - 4}
					width={zHalfPx * 2}
					height="5"
					rx="2"
					fill={zone.color}
					opacity={isSelected ? 0.3 : 0.12}
				/>
				<!-- Schlagzone-Füllung -->
				<rect
					x={zx - zHalfPx}
					y={fy(hitZoneMaxM)}
					width={zHalfPx * 2}
					height={fy(hitZoneMinM) - fy(hitZoneMaxM)}
					rx="3"
					fill={zone.color}
					opacity={isHit ? 0.22 : (isSelected ? 0.1 : 0.04)}
				/>
				<!-- Schlagzone-Rahmen -->
				<rect
					x={zx - zHalfPx}
					y={fy(hitZoneMaxM)}
					width={zHalfPx * 2}
					height={fy(hitZoneMinM) - fy(hitZoneMaxM)}
					rx="3"
					fill="none"
					stroke={zone.color}
					stroke-width={isHit ? 2 : (isSelected ? 1.5 : 1)}
					stroke-dasharray={isHit ? '' : (isSelected ? '4,3' : '3,4')}
					opacity={isHit ? 0.9 : (isSelected ? 0.55 : 0.3)}
				/>
				<!-- Zonen-Label über Schlagzone -->
				<text
					x={zx}
					y={fy(hitZoneMaxM) - 5}
					text-anchor="middle"
					fill={zone.color}
					font-size="10"
					font-family="sans-serif"
					font-weight={isSelected ? '700' : '500'}
					opacity={isSelected ? (isHit ? 1 : 0.8) : 0.4}
				>{zone.label}</text>
				<!-- "Schlag!"-Text wenn Ball in Schlagzone -->
				{#if isHit}
					<text
						x={zx}
						y={fy(hitZoneMidM) + 4}
						text-anchor="middle"
						fill={zone.color}
						font-size="11"
						font-family="sans-serif"
						font-weight="700"
					>Schlag!</text>
				{/if}
			{/each}

			<!-- ╔══ Trajektorie ─ hinter dem Netz (gedimmt) ════════════════════╗ -->
			{#if animState === 'idle'}
				<!-- Vorschau -->
				<path d={previewPath()} fill="none" stroke={selectedTiming.color} stroke-width="1.5" stroke-dasharray="6,4" opacity="0.25" />
			{:else}
				<!-- Trail hinter Netz -->
				{#if trailSegments().behind}
					<path d={trailSegments().behind} fill="none" stroke={selectedTiming.color} stroke-width="2" stroke-linecap="round" opacity="0.3" />
				{/if}
			{/if}

			<!-- ╔══ Netz ════════════════════════════════════════════════════════╗ -->
			<!-- Netz-Fläche -->
			<rect
				x={NET_LEFT_X}
				y={netTopY}
				width={NET_RIGHT_X - NET_LEFT_X}
				height={netBottomY - netTopY}
				fill="#e2e8f0"
				opacity="0.5"
			/>
			<!-- Horizontale Netzmaschen -->
			{#each Array(5) as _, i}
				<line
					x1={NET_LEFT_X}
					y1={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					x2={NET_RIGHT_X}
					y2={netTopY + (i + 1) * ((netBottomY - netTopY) / 5)}
					stroke="#94a3b8"
					stroke-width="0.8"
					opacity="0.6"
				/>
			{/each}
			<!-- Vertikale Netzmaschen -->
			{#each Array(18) as _, i}
				{@const vx = NET_LEFT_X + (i + 1) * (FIELD_W_PX / 18)}
				<line
					x1={vx} y1={netTopY}
					x2={vx} y2={netBottomY}
					stroke="#94a3b8"
					stroke-width="0.7"
					opacity="0.4"
				/>
			{/each}
			<!-- Netz-Unterkante (Seilzug) -->
			<line x1={NET_LEFT_X} y1={netBottomY} x2={NET_RIGHT_X} y2={netBottomY} stroke="#64748b" stroke-width="2" stroke-linecap="round" />
			<!-- Netz-Oberkante (weißes Band) -->
			<rect x={NET_LEFT_X} y={netTopY - 5} width={FIELD_W_PX} height="7" rx="2" fill="white" stroke="#cbd5e1" stroke-width="1" />

			<!-- Netzpfosten links -->
			<rect x={NET_LEFT_X - 6} y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />
			<!-- Netzpfosten rechts -->
			<rect x={NET_RIGHT_X} y={postTopY} width="6" height={GROUND_Y - postTopY} rx="2" fill="#475569" />

			<!-- ╔══ Antennen (rot-weiß gestreift) ══════════════════════════════╗ -->
			{#each [NET_LEFT_X - ANTENNA_WIDTH_PX / 2, NET_RIGHT_X - ANTENNA_WIDTH_PX / 2] as ax}
				{#each Array(10) as _, seg}
					{@const totalH = netBottomY - antennaTopY}
					{@const segH   = totalH / 10}
					<rect
						x={ax}
						y={antennaTopY + seg * segH}
						width={ANTENNA_WIDTH_PX}
						height={segH + 0.5}
						fill={seg % 2 === 0 ? '#ef4444' : 'white'}
					/>
				{/each}
			{/each}

			<!-- ╔══ Trajektorie ─ vor dem Netz (voll sichtbar) ═════════════════╗ -->
			{#if animState !== 'idle' && trailSegments().before}
				<path d={trailSegments().before} fill="none" stroke={selectedTiming.color} stroke-width="2.5" stroke-linecap="round" opacity="0.75" />
			{/if}

			<!-- ╔══ Zuspieler ════════════════════════════════════════════════════╗ -->
			<!-- Schatten (kleiner/heller beim Sprungpass) -->
			<ellipse
				cx={setterSvgX}
				cy={GROUND_Y - 1}
				rx={11 * setterGeo.scale}
				ry={_jumpSet ? 2 : 3}
				fill="#94a3b8"
				opacity={_jumpSet ? 0.15 : 0.25}
			/>
			<!-- Linkes Bein -->
			<line
				x1={setterSvgX - setterGeo.bodyW} y1={setterGeo.hipY}
				x2={setterSvgX - setterGeo.bodyW * 0.65} y2={setterGeo.feetY}
				stroke="#334155" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8"
			/>
			<!-- Rechtes Bein -->
			<line
				x1={setterSvgX + setterGeo.bodyW} y1={setterGeo.hipY}
				x2={setterSvgX + setterGeo.bodyW * 0.65} y2={setterGeo.feetY}
				stroke="#334155" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8"
			/>
			<!-- Körper -->
			<line
				x1={setterSvgX} y1={setterGeo.hipY}
				x2={setterSvgX} y2={setterGeo.shoulderY}
				stroke="#1e3a5f" stroke-width={3 * setterGeo.scale} stroke-linecap="round" opacity="0.8"
			/>
			<!-- Linker Arm -->
			<line
				x1={setterSvgX - setterGeo.bodyW} y1={setterGeo.shoulderY + 2 * setterGeo.scale}
				x2={setterSvgX - setterGeo.armW}  y2={setterGeo.handY}
				stroke="#1e3a5f" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8"
			/>
			<!-- Rechter Arm -->
			<line
				x1={setterSvgX + setterGeo.bodyW} y1={setterGeo.shoulderY + 2 * setterGeo.scale}
				x2={setterSvgX + setterGeo.armW}  y2={setterGeo.handY}
				stroke="#1e3a5f" stroke-width={2 * setterGeo.scale} stroke-linecap="round" opacity="0.8"
			/>
			<!-- Kopf -->
			<circle cx={setterSvgX} cy={setterGeo.headY} r={setterGeo.headR} fill="#fbbf24" opacity="0.9" />
			<!-- Label -->
			<text
				x={setterSvgX}
				y={setterGeo.headY - setterGeo.headR - 4}
				text-anchor="middle"
				fill="#475569"
				font-size="9"
				font-family="sans-serif"
				opacity="0.7"
			>Zuspieler {(setterHeightM * 100).toFixed(0)}cm{_jumpSet ? ' ↑' : ''}</text>

			<!-- ╔══ Startpunkt-Linie (Handposition des Zuspielers) ════════════╗ -->
			<!-- Zeigt klar auf welcher Höhe die Ballflugzeit beginnt -->
			<!-- Bodenpass: bündig mit der Figur; Sprungpass: deutlich höher -->
			<line
				x1={FIELD_LEFT}
				y1={setterGeo.handY}
				x2={FIELD_RIGHT}
				y2={setterGeo.handY}
				stroke={_jumpSet ? '#7c3aed' : '#64748b'}
				stroke-width="1"
				stroke-dasharray="4,4"
				opacity="0.35"
			/>
			<!-- Höhen-Label der Startposition -->
			<text
				x={FIELD_LEFT - 10}
				y={setterGeo.handY + 3}
				text-anchor="end"
				fill={_jumpSet ? '#7c3aed' : '#64748b'}
				font-size="8"
				font-family="sans-serif"
				font-weight="600"
				opacity="0.85"
			>{setterHandM.toFixed(2)}m</text>
			<line
				x1={FIELD_LEFT - 8}
				y1={setterGeo.handY}
				x2={FIELD_LEFT}
				y2={setterGeo.handY}
				stroke={_jumpSet ? '#7c3aed' : '#64748b'}
				stroke-width="1.5"
				opacity="0.85"
			/>
			<!-- Startpunkt-Kreis beim Setter (pulsiert beim Idle) -->
			{#if animState === 'idle'}
				<circle
					cx={setterSvgX}
					cy={setterGeo.handY}
					r="4"
					fill={_jumpSet ? '#7c3aed' : '#64748b'}
					opacity="0.6"
				/>
				<circle
					cx={setterSvgX}
					cy={setterGeo.handY}
					r="7"
					fill="none"
					stroke={_jumpSet ? '#7c3aed' : '#64748b'}
					stroke-width="1"
					opacity="0.3"
				/>
			{/if}

			<!-- ╔══ Kraft-Pfeil ════════════════════════════════════════════════╗ -->
			{#if forceVis}
				<line
					x1={setterSvgX}
					y1={setterGeo.handY}
					x2={fax2}
					y2={fay2}
					stroke={selectedTiming.color}
					stroke-width="2.5"
					stroke-linecap="round"
					marker-end="url(#force-arrow)"
					opacity={forceOpac}
				/>
				<text
					x={fax2 + 5}
					y={fay2 - 5}
					fill={selectedTiming.color}
					font-size="9"
					font-family="sans-serif"
					font-weight="700"
					opacity={forceOpac}
				>Kraft</text>
			{/if}

			<!-- ╔══ Ball ════════════════════════════════════════════════════════╗ -->
			{#if animState === 'idle'}
				{@const bx = setterSvgX}
				{@const by = setterGeo.handY}
				<!-- Ball -->
				<circle cx={bx} cy={by} r="11" fill="white" stroke={selectedTiming.color} stroke-width="1.8" opacity="0.9" />
				<path d="M {bx - 7} {by} Q {bx} {by - 5} {bx + 7} {by}" fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
				<path d="M {bx - 7} {by} Q {bx} {by + 5} {bx + 7} {by}" fill="none" stroke="#94a3b8" stroke-width="0.9" opacity="0.8" />
				<line x1={bx} y1={by - 10} x2={bx} y2={by + 10} stroke="#e2e8f0" stroke-width="0.8" opacity="0.7" />
			{:else}
				{@const bp  = ballPt()}
				{@const bx  = fx(bp.xM)}
				{@const by  = fy(bp.yM)}
				{@const bs  = ballScale()}
				{@const br  = 11 * bs}
				{@const bop = ballBeforeNet ? 1.0 : 0.6}
				<!-- Ball-Schatten -->
				<ellipse cx={bx} cy={GROUND_Y - 1} rx={br} ry={2.5 * bs} fill="#475569" opacity={0.1 * bs} />
				<!-- Ball -->
				<circle cx={bx} cy={by} r={br} fill="white" stroke={selectedTiming.color} stroke-width={1.8 * bs} opacity={bop} />
				<!-- Volleyball-Linien -->
				<path
					d="M {bx - br * 0.65} {by} Q {bx} {by - br * 0.45} {bx + br * 0.65} {by}"
					fill="none" stroke="#94a3b8" stroke-width={bs * 0.9} opacity={bop * 0.8}
				/>
				<path
					d="M {bx - br * 0.65} {by} Q {bx} {by + br * 0.45} {bx + br * 0.65} {by}"
					fill="none" stroke="#94a3b8" stroke-width={bs * 0.9} opacity={bop * 0.8}
				/>
				<line x1={bx} y1={by - br * 0.9} x2={bx} y2={by + br * 0.9} stroke="#e2e8f0" stroke-width={bs * 0.7} opacity={bop * 0.7} />
			{/if}

			<!-- ╔══ Kontaktpunkt in der Zone (nach Animation) ══════════════════╗ -->
			<!-- Nur der ausgewählte Formkontaktpunkt wird gezeigt -->
			{#if animState === 'done'}
				{@const contactProg = selectedForm === 'form1'
					? traj.hwLeave
					: traj.hwEnter + (traj.hwLeave - traj.hwEnter) * 0.5}
				{@const contactIdx  = Math.min(Math.round(contactProg * traj.points.length), traj.points.length - 1)}
				{@const contactPt   = traj.points[Math.max(0, contactIdx)]}
				{@const cpx         = fx(contactPt.xM)}
				{@const cpy         = fy(contactPt.yM)}
				{@const formColor   = selectedForm === 'form1' ? '#dc2626' : '#16a34a'}
				{@const formLabel   = selectedForm === 'form1' ? 'F1' : 'F2'}
				<!-- Fadenkreuz -->
				<line x1={cpx - 10} y1={cpy} x2={cpx + 10} y2={cpy} stroke={formColor} stroke-width="1.5" opacity="0.7" />
				<line x1={cpx} y1={cpy - 10} x2={cpx} y2={cpy + 10} stroke={formColor} stroke-width="1.5" opacity="0.7" />
				<!-- Kreis -->
				<circle cx={cpx} cy={cpy} r="6" fill={formColor} opacity="0.25" />
				<circle cx={cpx} cy={cpy} r="6" fill="none" stroke={formColor} stroke-width="2" opacity="0.9" />
				<!-- Label -->
				<text
					x={cpx + 10}
					y={cpy - 8}
					fill={formColor}
					font-size="9"
					font-family="sans-serif"
					font-weight="700"
					opacity="0.9"
				>{formLabel}</text>
			{/if}

			<!-- ╔══ Netzhöhen-Label ════════════════════════════════════════════╗ -->
			<text
				x={FIELD_LEFT - 10}
				y={netTopY + 3}
				text-anchor="end"
				fill="#475569"
				font-size="8"
				font-family="sans-serif"
				font-weight="600"
			>{netHeightM.toFixed(2)}m</text>
			<!-- Netzhöhen-Markierung -->
			<line x1={FIELD_LEFT - 8} y1={netTopY} x2={FIELD_LEFT} y2={netTopY} stroke="#475569" stroke-width="1.5" />

			<!-- ╔══ Timer ══════════════════════════════════════════════════════╗ -->
			{#if animState === 'running'}
				{@const inZone    = animProgress >= traj.hwEnter && animProgress <= traj.hwLeave}
				{@const pastZone  = animProgress > traj.hwLeave}
				{@const leaveMs   = traj.tLeave * 1000}
				{@const restMs    = pastZone ? elapsedMs - leaveMs : 0}
				<rect x={SVG_W - 130} y="8" width="118" height="27" rx="6" fill="#1e293b" opacity="0.07" />
				{#if !pastZone}
					<text
						x={SVG_W - 71}
						y="27"
						text-anchor="middle"
						fill={inZone ? selectedZone.color : '#1e293b'}
						font-size="15"
						font-family="monospace"
						font-weight="700"
					>{(elapsedMs / 1000).toFixed(2)}s</text>
				{:else}
					<!-- Flugzeit (bis hwLeave) + Restzeit -->
					<text x={SVG_W - 125} y="27" fill="#64748b" font-size="13" font-family="monospace" font-weight="700"
					>{(leaveMs / 1000).toFixed(2)}s</text>
					<text x={SVG_W - 72} y="27" fill="#94a3b8" font-size="11" font-family="monospace"
					>+{(restMs / 1000).toFixed(2)}s</text>
				{/if}
			{/if}

			<!-- ╔══ Zeitbalken nach Animation ══════════════════════════════════╗ -->
			{#if animState === 'done'}
				{@const f1x   = BAR_X + traj.hwLeave * BAR_W}
				{@const f2x   = BAR_X + (traj.hwEnter + (traj.hwLeave - traj.hwEnter) * 0.5) * BAR_W}
				{@const selX  = selectedForm === 'form1' ? f1x : f2x}
				{@const leaveX = BAR_X + traj.hwLeave * BAR_W}
				<!-- Sprungpass-Vergleich: Bodenpass-Kontaktpunkt als gestrichelte Linie -->
				{#if _jumpSet && trajGround && jumpSavingMs > 1}
					{@const groundContactT = selectedForm === 'form1'
						? trajGround.tLeave
						: trajGround.tEnter + trajGround.hitWindowS * 0.5}
					{@const groundX = BAR_X + (groundContactT / traj.flightTimeS) * BAR_W}
					<line x1={groundX} y1={BAR_Y - 5} x2={groundX} y2={BAR_Y + BAR_H + 5}
						stroke="#7c3aed" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.5" />
					<text x={groundX} y={BAR_Y - 8} text-anchor="middle"
						fill="#7c3aed" font-size="7" font-family="sans-serif" opacity="0.7">Stand</text>
				{/if}
				<!-- Gesamtbalken (zweiteilig: aktiv bis hwLeave, gedimmt danach) -->
				<rect x={BAR_X} y={BAR_Y} width={traj.hwLeave * BAR_W} height={BAR_H} rx="4" fill="#e2e8f0" />
				<rect x={leaveX} y={BAR_Y} width={(1 - traj.hwLeave) * BAR_W} height={BAR_H} rx="4" fill="#e2e8f0" opacity="0.4" />
				<!-- Trennlinie Schlagzone-Ende / Restzeit -->
				<line x1={leaveX} y1={BAR_Y - 4} x2={leaveX} y2={BAR_Y + BAR_H + 4}
					stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2" opacity="0.7" />
				<!-- Schlagfenster -->
				<rect x={BAR_X + traj.hwEnter * BAR_W} y={BAR_Y - 3}
					width={(traj.hwLeave - traj.hwEnter) * BAR_W} height={BAR_H + 6}
					rx="4" fill={selectedZone.color} opacity="0.45" />

				<!-- Form-1-Markierung -->
				<line x1={f1x} y1={BAR_Y - 8} x2={f1x} y2={BAR_Y + BAR_H + 8}
					stroke="#dc2626" stroke-width={selectedForm === 'form1' ? 2.5 : 1.5}
					opacity={selectedForm === 'form1' ? 1 : 0.5} />
				<text x={f1x} y={BAR_Y - 11} text-anchor="middle"
					fill="#dc2626" font-size="8" font-family="sans-serif" font-weight="700"
					opacity={selectedForm === 'form1' ? 1 : 0.5}>F1</text>

				<!-- Form-2-Markierung -->
				<line x1={f2x} y1={BAR_Y - 8} x2={f2x} y2={BAR_Y + BAR_H + 8}
					stroke="#16a34a" stroke-width={selectedForm === 'form2' ? 2.5 : 1.5}
					opacity={selectedForm === 'form2' ? 1 : 0.5} />
				<text x={f2x} y={BAR_Y - 11} text-anchor="middle"
					fill="#16a34a" font-size="8" font-family="sans-serif" font-weight="700"
					opacity={selectedForm === 'form2' ? 1 : 0.5}>F2</text>

				<!-- Aktive Form hervorgehoben -->
				<circle cx={selX} cy={BAR_Y + BAR_H / 2} r="5"
					fill={selectedForm === 'form1' ? '#dc2626' : '#16a34a'} opacity="0.95" />

				<!-- Zeitbeschriftungen -->
				<text x={BAR_X} y={BAR_Y + BAR_H + 12} fill="#64748b" font-size="8" font-family="sans-serif">0s</text>
				<!-- Ende Schlagfenster: absolute Zeit -->
				<text x={leaveX} y={BAR_Y + BAR_H + 12} text-anchor="middle"
					fill="#94a3b8" font-size="8" font-family="sans-serif">{traj.tLeave.toFixed(2)}s</text>
				<!-- Restzeit nach Schlagzone -->
				{@const restS = traj.flightTimeS - traj.tLeave}
				{#if restS > 0.01}
					<text x={BAR_X + BAR_W} y={BAR_Y + BAR_H + 12} text-anchor="end"
						fill="#94a3b8" font-size="8" font-family="sans-serif" opacity="0.6">+{restS.toFixed(2)}s</text>
				{/if}
				<!-- Fenster-Label -->
				<text x={BAR_X + traj.hwEnter * BAR_W + (traj.hwLeave - traj.hwEnter) * BAR_W / 2}
					y={BAR_Y + BAR_H + 24} text-anchor="middle"
					fill={selectedZone.color} font-size="8" font-family="sans-serif" font-weight="700" opacity="0.7">
					{(traj.hitWindowS * 1000).toFixed(0)}ms Fenster
				</text>
			{/if}
		</svg>
	</div>

	<!-- ── Aktions-Zeile ─────────────────────────────────────────────────────── -->
	<div class="ata-action-row">
		{#if animState === 'idle' || animState === 'done'}
			<button class="ata-start-btn" onclick={startAnimation}>
				{animState === 'done' ? '↺ Nochmals' : '▶ Simulation starten'}
			</button>
		{:else}
			<button class="ata-reset-btn" onclick={resetAnimation}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Ergebnis-Panel ────────────────────────────────────────────────────── -->
	{#if animState === 'done'}
		<div class="ata-result-panel">
			<div class="ata-result-item">
				<span class="ata-result-label">Flugzeit ({selectedForm === 'form1' ? 'F1' : 'F2'})</span>
				<span class="ata-result-value">{contactTimeS.toFixed(2)} s</span>
			</div>
			<div class="ata-result-divider"></div>
			<div class="ata-result-item">
				<span class="ata-result-label">Timing-Fenster</span>
				<span class="ata-result-value" style="color: {selectedTiming.color}">
					{(traj.hitWindowS * 1000).toFixed(0)} ms
				</span>
			</div>
			{#if _jumpSet && jumpSavingMs > 1}
				<div class="ata-result-divider"></div>
				<div class="ata-result-item">
					<span class="ata-result-label">Sprungpass-Vorteil</span>
					<span class="ata-result-value" style="color: #7c3aed; font-size: 1.1rem">
						−{jumpSavingMs.toFixed(0)} ms
					</span>
				</div>
			{/if}
			<div class="ata-result-divider"></div>
			<div class="ata-result-item">
				<span class="ata-result-label">Netzhöhe</span>
				<span class="ata-result-value" style="font-size: 1rem; color: #475569">
					{selectedNetType.label} {netHeightM.toFixed(2)}m
				</span>
			</div>
		</div>
	{:else}
		<div class="ata-preview-panel">
			<span>Flugzeit: <strong>{traj.flightTimeS.toFixed(2)} s</strong></span>
			<span>Timing-Fenster: <strong>{(traj.hitWindowS * 1000).toFixed(0)} ms</strong></span>
			{#if _jumpSet && jumpSavingMs > 1}
				<span style="color: #7c3aed">Sprungpass: <strong>−{jumpSavingMs.toFixed(0)} ms</strong></span>
			{/if}
		</div>
	{/if}

</div>

<style>
	.ata-wrapper {
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

	/* ── Steuerung ─────────────────────────────────────────── */
	.ata-controls { display: flex; flex-direction: column; gap: 0.5rem; }

	.ata-control-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.ata-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #64748b;
		min-width: 110px;
		white-space: nowrap;
		font-family: inherit;
	}

	.ata-btn-group { display: flex; gap: 0.25rem; flex-wrap: wrap; }

	.ata-btn {
		padding: 0.28rem 0.8rem;
		border-radius: 0.375rem;
		border: 1.5px solid var(--zone-color, #94a3b8);
		background: transparent;
		color: var(--zone-color, #64748b);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 120ms, color 120ms;
		font-family: inherit;
		line-height: 1.4;
	}
	.ata-btn:hover { background: color-mix(in srgb, var(--zone-color, #94a3b8) 10%, transparent); }
	.ata-btn.active { background: var(--zone-color, #94a3b8); color: white; }

	/* ── Slider ────────────────────────────────────────────── */
	.ata-slider-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.ata-slider {
		width: 160px;
		accent-color: #475569;
		cursor: pointer;
	}
	.ata-slider-val {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		font-family: 'Courier New', monospace;
		min-width: 3.5rem;
	}

	.ata-timing-desc {
		font-size: 0.875rem;
		color: #94a3b8;
		margin: 0;
		font-style: italic;
		font-family: inherit;
	}
	.ata-form-desc {
		font-size: 0.78rem;
		font-style: italic;
		opacity: 0.85;
		font-family: inherit;
	}

	/* ── SVG ──────────────────────────────────────────────── */
	.ata-svg-wrapper { width: 100%; }
	.ata-svg {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 0.5rem;
		border: 1px solid #e2e8f0;
	}

	/* ── Aktions-Zeile ────────────────────────────────────── */
	.ata-action-row { display: flex; justify-content: center; }

	.ata-start-btn, .ata-reset-btn {
		padding: 0.55rem 2.5rem;
		border-radius: 0.5rem;
		border: none;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: background 120ms, transform 120ms, box-shadow 120ms;
		font-family: inherit;
	}
	.ata-start-btn {
		background: #ff3500;
		color: white;
		box-shadow: 0 2px 8px rgba(255,53,0,0.22);
	}
	.ata-start-btn:hover { background: #e62f00; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,53,0,0.28); }
	.ata-start-btn:active { transform: translateY(0); }
	.ata-reset-btn { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
	.ata-reset-btn:hover { background: #e2e8f0; }

	/* ── Ergebnis-Panel ───────────────────────────────────── */
	.ata-result-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 1rem;
		flex-wrap: wrap;
	}
	.ata-result-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
	.ata-result-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; font-family: inherit; }
	.ata-result-value { font-size: 1.3rem; font-weight: 700; color: #1e293b; font-family: 'Courier New', monospace; }
	.ata-result-divider { width: 1px; height: 38px; background: #e2e8f0; }

	/* ── Vorschau-Panel ───────────────────────────────────── */
	.ata-preview-panel {
		display: flex;
		gap: 1.5rem;
		justify-content: center;
		font-size: 0.875rem;
		color: #64748b;
		flex-wrap: wrap;
		font-family: inherit;
	}
	.ata-preview-panel strong { color: #1e293b; }

	/* ── Responsive ───────────────────────────────────────── */
	@media (max-width: 600px) {
		.ata-wrapper { padding: 1rem; }
		.ata-control-group { flex-direction: column; align-items: flex-start; }
		.ata-label { min-width: unset; }
		.ata-result-panel { gap: 0.75rem; }
		.ata-slider { width: 120px; }
	}
</style>
