<script>
	/**
	 * CombinationAttackView — Draufsicht Volleyball-Feld
	 *
	 * Angriffssituation: gegnerischer Angreifer auf P4 = von unserer Seite gesehen
	 * RECHTS am Netz (x ≈ 7.5m).
	 *
	 * Koordinatensystem (Draufsicht, unsere Verteidiger-Seite):
	 *   x: 0 = linke Seitenlinie, 9m = rechte Seitenlinie
	 *   y: 0 = Netz (oben im SVG), 9m = unsere Grundlinie (unten)
	 *
	 * Angreifer steht jenseits des Netzes bei (x=7.5, y<0) — wird oberhalb
	 * des Feldes dargestellt.
	 *
	 * Doppelblock: unsere Blocker bei (x≈6.2, y≈0) und (x≈8.0, y≈0) am Netz.
	 * Der Block deckt einen Winkelbereich ab → "Blockschatten" ins Feld.
	 * Alles ausserhalb = Angriffszonen als Kreissektoren vom Angreifer-Ursprung.
	 *
	 * Zonen:
	 *  1. Linie        — rechts an der Seitenlinie vorbei (rechter Blocker-Rand)
	 *  2. Diagonale    — weit links diagonal (linker Blocker-Rand)
	 *  3. Finte (Toggle) — kurzer Ball durch/über die Blocklücke
	 */

	// ─── Feldmasse ────────────────────────────────────────────────────────────────
	const FIELD_W_M = 9.0;
	const FIELD_H_M = 9.0;

	// ─── SVG-Layout ───────────────────────────────────────────────────────────────
	const SVG_W = 520;
	const SVG_H = 580;   // etwas höher für Angreifer-Symbol oberhalb

	// Feld beginnt mit Abstand oben (Platz für Angreifer-Symbol + Netz)
	const MARGIN_L = 38;
	const MARGIN_T = 72;  // Platz oben für Angreifer + Netz-Label
	const MARGIN_R = 38;
	const MARGIN_B = 32;

	const FIELD_PX_W = SVG_W - MARGIN_L - MARGIN_R;
	const FIELD_PX_H = SVG_H - MARGIN_T - MARGIN_B;

	const PX_PER_M = Math.min(FIELD_PX_W / FIELD_W_M, FIELD_PX_H / FIELD_H_M);

	const DRAW_W = FIELD_W_M * PX_PER_M;
	const DRAW_H = FIELD_H_M * PX_PER_M;
	const FIELD_X = MARGIN_L + (FIELD_PX_W - DRAW_W) / 2;
	const FIELD_Y = MARGIN_T;

	/** Meter → SVG x */
	function fx(/** @type {number} */ xM) { return FIELD_X + xM * PX_PER_M; }
	/** Meter → SVG y (0 = Netz) */
	function fy(/** @type {number} */ yM) { return FIELD_Y + yM * PX_PER_M; }

	// ─── Angreifer ────────────────────────────────────────────────────────────────
	// Gegnerischer P4: nahe der rechten Seitenlinie → bessere Winkel (breite Diagonale)
	const ATK_X_M  = 8.5;   // x-Position in Metern (nahe rechter Seitenlinie)
	const ATK_Y_M  = -1.2;  // y-Position (jenseits Netz, negativ)
	// WINKEL: Angreifer-Position bestimmt den Ursprung aller Angriffswinkel.
	// ATK_X_M näher an 9.0 → schmalere Linie, breitere Diagonale
	// ATK_X_M näher an 4.5 → symmetrischere Winkelverteilung
	// SVG-Koordinaten des Angreifers
	const ATK_SVG_X = fx(ATK_X_M);
	const ATK_SVG_Y = fy(ATK_Y_M);

	// ─── Block ────────────────────────────────────────────────────────────────────
	// Block nach links verschoben: Linie (rechts) bleibt offen, mehr Winkel diagonal
	const BLOCK_LEFT_M  = 7.5;   // linke Kante
	const BLOCK_RIGHT_M = 8.5;   // rechte Kante — Lücke zur Seitenlinie (~0.5m)
	// WINKEL: Block-Kanten bestimmen Blockschatten + Grenzen von Linie/Diagonale.
	// BLOCK_LEFT_M weiter links  → mehr Blockschatten, Diagonale beginnt früher
	// BLOCK_RIGHT_M weiter rechts → schliesst Linie, weniger Linien-Zone
	// Lücke = 9.0 - BLOCK_RIGHT_M (aktuell ~0.5m zur Seitenlinie)
	const BLOCK_Y_M     = 0.0;

	// Block-Mittelpunkte der 2 Blocker
	const BLOCKER_1 = { id: 'b1', label: 'B', x: 7.75, y: 0.0, role: 'blocker' };
	const BLOCKER_2 = { id: 'b2', label: 'B', x: 8.25, y: 0.0, role: 'blocker' };

	// ─── Verteidiger ──────────────────────────────────────────────────────────────
	// Verschiebung nach links für Angriff von rechts (P4 gegnerisch)
	// P1: Linie — recht nah an der rechten Seitenlinie, mittlere Tiefe
	// L (Libero P5): links-hinten, für die lange Diagonale
	// P6: Links-Mitte-hinten
	// P2: Weiter vorne links (für den Hintere-Linie-Bereich)
	//
	// Winkel-Parameter pro Verteidiger (direkt hier anpassbar):
	//   fwdAngleDeg  — Ausrichtung der Vorwärts-Zone (0°=rechts, 90°=unten, 180°=links)
	//   bwdAngleDeg  — Ausrichtung der Rückwärts-Zone (normalerweise fwdAngleDeg + 180°)
	//   halfOpenDeg  — Halbe Öffnung beider Zonen in Grad (z.B. 55° → 110° Gesamtöffnung)
	//   radiusM      — Reichweite der Verteidigungs-Zone in Metern
	const DEFENDERS = [
		{
			id: 'p1', label: 'Z', x: 8.75, y: 5.5, role: 'defender',
			fwdAngleDeg: -95,   // Vorwärts-Zone: Richtung Angreifer (oben-links)
			bwdAngleDeg: 90,   // Rückwärts-Zone: Richtung Grundlinie
			halfOpenDeg: 10,    // Halbe Öffnung jeder Zone
			radiusM: 4.2,       // Reichweite in Metern
		},
		{
			id: 'p5', label: 'L', x: 2.5, y: 6.0, role: 'libero',
			fwdAngleDeg: -80,   // Vorwärts-Zone: schräg Richtung Angreifer
			bwdAngleDeg: 150,   // Rückwärts-Zone
			halfOpenDeg: 50,
			radiusM: 3.2,       // Libero hat grössere Reichweite
		},
		{
			id: 'p6', label: 'A2', x: 6.5, y: 8.0, role: 'defender',
			fwdAngleDeg: -110,   // Vorwärts-Zone: Richtung Netz-Mitte
			bwdAngleDeg: 95,   // Rückwärts-Zone: Grundlinie
			halfOpenDeg: 80,
			radiusM: 2.2,
		},
		{
			id: 'p2', label: 'A1', x: 3.2, y: 2.2, role: 'defender',
			fwdAngleDeg: -20,   // Vorwärts-Zone: leicht nach rechts-oben
			bwdAngleDeg: 160,   // Rückwärts-Zone
			halfOpenDeg: 30,
			radiusM: 3.2,
		},
	];

	const ALL_PLAYERS = [BLOCKER_1, BLOCKER_2, ...DEFENDERS];

	// Verteidiger-Reichweite in Metern (Fallback falls kein radiusM im Objekt)
	const DEFENSE_RADIUS_M = 2.2;
	const LIBERO_RADIUS_M  = 2.7;

	// ─── Kreissektor-Geometrie ────────────────────────────────────────────────────
	//
	// Kreissektoren gehen vom Angreifer-Punkt aus.
	// Der Radius ist "weit genug" um das Feld zu überstreichen (~15m reicht sicher).
	// Die Winkel werden aus Block-Kanten berechnet.
	//
	// Koordinaten-Konvention für Winkel:
	//   0° = nach rechts (+x), Winkel im SVG-Koordinatensystem (y nach unten)
	//   atan2(dy, dx) mit dy = fy(y) - ATK_SVG_Y, dx = fx(x) - ATK_SVG_X
	//
	// Vom Angreifer (rechts oben) aus gesehen:
	//   - Rechte Seitenlinie (Linie-Schlag): Winkel in Richtung rechte untere Ecke
	//   - Linke untere Ecke (lange Diagonale): Winkel stark nach links
	//   - Block-Schatten: Winkelbereich zwischen linker und rechter Block-Kante
	//
	// Block-Kanten:
	//   Links:  (BLOCK_LEFT_M,  BLOCK_Y_M) → der Winkel des linken Block-Randes
	//   Rechts: (BLOCK_RIGHT_M, BLOCK_Y_M) → der Winkel des rechten Block-Randes

	const SECTOR_R_M = 13.0; // Sektor-Radius in Metern (grosszügig, wird am Feldrand geclippt)
	const SECTOR_R_PX = SECTOR_R_M * PX_PER_M;

	/** Winkel vom Angreifer zu einem Punkt (in Bogenmass, SVG-Koordinaten) */
	function angleToPoint(/** @type {number} */ xM, /** @type {number} */ yM) {
		const dx = fx(xM) - ATK_SVG_X;
		const dy = fy(yM) - ATK_SVG_Y;
		return Math.atan2(dy, dx);
	}

	/** Winkel → Punkt auf dem Sektor-Kreis um den Angreifer */
	function sectorPoint(/** @type {number} */ angleRad) {
		return {
			x: ATK_SVG_X + Math.cos(angleRad) * SECTOR_R_PX,
			y: ATK_SVG_Y + Math.sin(angleRad) * SECTOR_R_PX,
		};
	}

	/**
	 * Erzeugt einen SVG-Pfad für einen Kreissektor (Pie-Slice) vom Angreifer aus.
	 * @param {number} aStart   Start-Winkel (Bogenmass)
	 * @param {number} aEnd     End-Winkel (Bogenmass)
	 * @param {number} [rPx]    Optionaler Radius in SVG-Pixeln (default: SECTOR_R_PX)
	 */
	function sectorPath(aStart, aEnd, rPx = SECTOR_R_PX) {
		const p1 = { x: ATK_SVG_X + Math.cos(aStart) * rPx, y: ATK_SVG_Y + Math.sin(aStart) * rPx };
		const p2 = { x: ATK_SVG_X + Math.cos(aEnd)   * rPx, y: ATK_SVG_Y + Math.sin(aEnd)   * rPx };
		const largeArc = Math.abs(aEnd - aStart) > Math.PI ? 1 : 0;
		return [
			`M ${ATK_SVG_X.toFixed(1)} ${ATK_SVG_Y.toFixed(1)}`,
			`L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
			`A ${rPx.toFixed(1)} ${rPx.toFixed(1)} 0 ${largeArc} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
			'Z',
		].join(' ');
	}

	// ─── Block-Winkel berechnen ───────────────────────────────────────────────────
	// Linke Kante des Blocks (linker Blocker-Rand) → begrenzt die Diagonale-Zone
	const ANGLE_BLOCK_LEFT  = angleToPoint(BLOCK_LEFT_M,  BLOCK_Y_M);
	// Rechte Kante des Blocks (rechter Blocker-Rand) → begrenzt die Linie-Zone
	const ANGLE_BLOCK_RIGHT = angleToPoint(BLOCK_RIGHT_M, BLOCK_Y_M);

	// Feldeck-Winkel (für Zone-Grenzen)
	// WINKEL: Feldeck-Winkel begrenzen die Angriffszonen am Feldrand.
	// ANGLE_BOTTOM_LEFT: linke Begrenzung der Diagonale (y=2.0 statt 0.0 → Zone beginnt nicht ganz am Netz)
	// ANGLE_BOTTOM_RIGHT / ANGLE_RIGHT_LINE: rechte Begrenzung der Linie-Zone
	// → angleToPoint(x, y) anpassen, um Zone weiter/enger zu machen
	const ANGLE_BOTTOM_LEFT  = angleToPoint(0.0, 2.0);
	const ANGLE_BOTTOM_RIGHT = angleToPoint(FIELD_W_M, FIELD_H_M);
	const ANGLE_RIGHT_LINE   = angleToPoint(FIELD_W_M, 0.0);
	const ANGLE_LEFT_LINE    = angleToPoint(0.0, 0.0);

	// ─── Zonen-Definition ────────────────────────────────────────────────────────
	//
	//  Blockschatten: Winkel zwischen linker und rechter Block-Kante
	//    (direkt hinter dem Block — vom Angreifer aus "versteckt")
	//
	//  Linie: rechts am Block vorbei bis zur rechten Seitenlinie
	//    von ANGLE_BLOCK_RIGHT bis ANGLE_RIGHT_LINE (rechter Feldrand)
	//    aber nur bis Grundlinie → in SVG durch clipPath auf Feld begrenzt
	//
	//  Diagonale: links am Block vorbei, tief ins Feld
	//    von ANGLE_BOTTOM_LEFT bis ANGLE_BLOCK_LEFT
	//    (lange Diagonale Richtung linke hintere Ecke)
	//
	//  Finte (Toggle): enger Sektor genau durch die Blocklücke (Mitte)
	//    nur ein kleiner Winkelbereich knapp neben der Blockmitte

	// Mittelwinkel des Blocks (für Finte-Sektor)
	const ANGLE_BLOCK_MID = (ANGLE_BLOCK_LEFT + ANGLE_BLOCK_RIGHT) / 2;
	// WINKEL: Finte-Sektor — Öffnung und Reichweite des Tipballs hinter den Block.
	// FINTE_HALF_ANGLE: halbe Öffnung in Bogenmass (0.38 rad ≈ 22°)
	//   grösser → breitere Finte-Zone; kleiner → präziserer Tipball
	// FINTE_R_M: Radius in Metern — wie weit der Ball fliegt (aktuell 3.5m)
	//   grösser → Finte reicht tiefer ins Feld
	const FINTE_HALF_ANGLE = 0.72; // ±~22° Öffnung — breit aber kurz
	// Finte hat einen kurzen Radius (flacher Ball knapp hinter Block)
	const FINTE_R_M = 4.5;

	// ─── Svelte-Zustand ───────────────────────────────────────────────────────────
	let showDefenseZones = $state(true);
	let showPerception   = $state(false);
	let showFinte        = $state(false);

	// ─── SVG clipPath für Feld-Begrenzung ────────────────────────────────────────
	// Alle Sektoren werden auf das Spielfeld geclippt
	const FIELD_CLIP_ID = 'field-clip';

	// ─── Polygon-Überschneidung (für Perception-Toggle) ──────────────────────────
	/**
	 * Berechnet ob Kreis (cx, cy, r) [in Metern] einen SVG-Kreissektor überschneidet.
	 * Wir nähern den Sektor durch einen Sample-Grid an: Punkte im Feld prüfen ob sie
	 * (a) im Kreis liegen und (b) im Winkelbereich des Sektors vom Angreifer aus.
	 * @param {number} defX @param {number} defY @param {number} defR
	 * @param {number} aStart @param {number} aEnd
	 */
	function defenderInSector(defX, defY, defR, aStart, aEnd) {
		// Sample: 15x15 Grid über Verteidigungs-Kreis
		const SAMPLES = 14;
		for (let i = 0; i <= SAMPLES; i++) {
			for (let j = 0; j <= SAMPLES; j++) {
				const sx = defX - defR + (i / SAMPLES) * defR * 2;
				const sy = defY - defR + (j / SAMPLES) * defR * 2;
				// Im Feld?
				if (sx < 0 || sx > FIELD_W_M || sy < 0 || sy > FIELD_H_M) continue;
				// Im Kreis?
				if ((sx - defX) ** 2 + (sy - defY) ** 2 > defR * defR) continue;
				// Im Sektor-Winkel?
				const angle = angleToPoint(sx, sy);
				// Normalisierung: Winkel in [aStart, aEnd] prüfen
				// (beide schon in normalem atan2-Bereich)
				if (angleBetween(angle, aStart, aEnd)) return true;
			}
		}
		return false;
	}

	/**
	 * Prüft ob ein Winkel zwischen aStart und aEnd liegt (im Uhrzeigersinn).
	 * @param {number} a @param {number} aStart @param {number} aEnd
	 */
	function angleBetween(a, aStart, aEnd) {
		// Normalisiere auf [aStart, aStart + 2π)
		let diff = aEnd - aStart;
		if (diff < 0) diff += Math.PI * 2;
		let da = a - aStart;
		if (da < 0) da += Math.PI * 2;
		return da <= diff;
	}

	// ─── Zonen-Definitionen ───────────────────────────────────────────────────────
	// Linie: rechts am Block vorbei (schmaler Winkel rechts)
	//   von Block-rechter-Kante bis rechte Seitenlinie (~90°-ish)
	const ZONE_LINIE = {
		id: 'linie',
		label: 'Linie',
		color: '#2563eb',
		aStart: ANGLE_BLOCK_RIGHT,
		aEnd:   ANGLE_RIGHT_LINE,
		description: 'Entlang der rechten Seitenlinie, am Block vorbei',
	};

	// Diagonale: links am Block vorbei, tief diagonal
	//   von linker unterer Ecke bis Block-linker-Kante
	const ZONE_DIAGONALE = {
		id: 'diagonale',
		label: 'Diagonale',
		color: '#d97706',
		aStart: ANGLE_BOTTOM_LEFT,
		aEnd:   ANGLE_BLOCK_LEFT,
		description: 'Lange Diagonale, tief in die linke Feldhälfte',
	};

	// Blockschatten: direkt hinter dem Block (geblockte Zone)
	const ZONE_BLOCK_SHADOW = {
		id: 'block_shadow',
		label: 'Blockschatten',
		color: '#1e3a5f',
		aStart: ANGLE_BLOCK_LEFT,
		aEnd:   ANGLE_BLOCK_RIGHT,
		description: 'Direkt hinter dem Block — durch Doppelblock abgedeckt',
	};

	// Finte: breiter Sektor, aber kurzer Radius (flacher Ball knapp hinter Block)
	const ZONE_FINTE = {
		id: 'finte',
		label: 'Finte',
		color: '#7c3aed',
		aStart: ANGLE_BLOCK_MID - FINTE_HALF_ANGLE,
		aEnd:   ANGLE_BLOCK_MID + FINTE_HALF_ANGLE,
		rPx:    FINTE_R_M * PX_PER_M,  // kurzer Radius
		description: 'Kurzer Tipball hinter den Block — breit, aber flach',
	};

	// Alle Angriffszonen (ohne Finte — die wird separat behandelt)
	const ATTACK_ZONES = [ZONE_LINIE, ZONE_DIAGONALE];

	// ─── Überschneidungen (Perception) ───────────────────────────────────────────
	let zoneOverlaps = $derived(
		[...ATTACK_ZONES, ...(showFinte ? [ZONE_FINTE] : [])].map(zone => {
			const hits = DEFENDERS.map(p => {
				const overlaps = defenderInSector(p.x, p.y, p.radiusM, zone.aStart, zone.aEnd);
				return { playerId: p.id, overlaps };
			});
			const anyHit = hits.some(h => h.overlaps);
			return { id: zone.id, anyHit, hits };
		})
	);

	// ─── Gerichtete Verteidigungs-Segmente ────────────────────────────────────────
	/**
	 * Berechnet für einen Verteidiger das gerichtete Kreissegment (Bogen) in
	 * Richtung der Angriffszone-Überschneidung.
	 *
	 * Idee: Vom Verteidiger aus gesehen liegt die Angriffszone in einer bestimmten
	 * Richtung. Wir berechnen den Mittelpunkt der Überschneidungsfläche und zeichnen
	 * ein Kreissegment (Tortenstück, halbe Öffnung ~50°) in diese Richtung.
	 * Hinter dem Verteidiger (entgegengesetzte Richtung) ein "Verteidigungsschatten".
	 *
	 * @param {number} defX @param {number} defY  Verteidiger-Position (m)
	 * @param {number} defR                        Reichweite (m)
	 * @param {number} zoneAStart @param {number} zoneAEnd  Angriffssektor-Winkel
	 * @returns {{ dirAngle: number, hasCoverage: boolean }}
	 */
	function defenderDirectionForZone(defX, defY, defR, zoneAStart, zoneAEnd) {
		// Finde den Schwerpunkt der Überschneidungspunkte (Sample-Grid)
		const SAMPLES = 16;
		let sumX = 0, sumY = 0, count = 0;
		for (let i = 0; i <= SAMPLES; i++) {
			for (let j = 0; j <= SAMPLES; j++) {
				const sx = defX - defR + (i / SAMPLES) * defR * 2;
				const sy = defY - defR + (j / SAMPLES) * defR * 2;
				if (sx < 0 || sx > FIELD_W_M || sy < 0 || sy > FIELD_H_M) continue;
				if ((sx - defX) ** 2 + (sy - defY) ** 2 > defR * defR) continue;
				const angle = angleToPoint(sx, sy);
				if (angleBetween(angle, zoneAStart, zoneAEnd)) {
					sumX += sx; sumY += sy; count++;
				}
			}
		}
		if (count === 0) return { dirAngle: 0, hasCoverage: false };
		// Richtung vom Verteidiger zum Schwerpunkt der Überschneidung
		const ctrX = sumX / count;
		const ctrY = sumY / count;
		const dx = fx(ctrX) - fx(defX);
		const dy = fy(ctrY) - fy(defY);
		return { dirAngle: Math.atan2(dy, dx), hasCoverage: true };
	}

	/**
	 * SVG-Pfad für ein gerichtetes Kreissegment (Tortenstück) um einen Verteidiger.
	 * @param {number} cx @param {number} cy  SVG-Mittelpunkt
	 * @param {number} rPx                    Radius in SVG-px
	 * @param {number} dirAngle               Richtung (Bogenmass, SVG-Koordinaten)
	 * @param {number} halfOpen               Halbe Öffnung des Segments (Bogenmass)
	 */
	function defSegmentPath(cx, cy, rPx, dirAngle, halfOpen) {
		const a1 = dirAngle - halfOpen;
		const a2 = dirAngle + halfOpen;
		const p1x = cx + Math.cos(a1) * rPx;
		const p1y = cy + Math.sin(a1) * rPx;
		const p2x = cx + Math.cos(a2) * rPx;
		const p2y = cy + Math.sin(a2) * rPx;
		const largeArc = (halfOpen * 2) > Math.PI ? 1 : 0;
		return [
			`M ${cx.toFixed(1)} ${cy.toFixed(1)}`,
			`L ${p1x.toFixed(1)} ${p1y.toFixed(1)}`,
			`A ${rPx.toFixed(1)} ${rPx.toFixed(1)} 0 ${largeArc} 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)}`,
			'Z',
		].join(' ');
	}

	// WINKEL: Verteidiger-Segmente — Öffnung des Wahrnehmungs-Sektors pro Spieler.
	// DEF_HALF_OPEN: halbe Öffnung des aktiven Segments in Bogenmass (0.96 rad ≈ 55°)
	//   grösser → Verteidiger "sieht" einen breiteren Bereich; Wert zwischen 0.5–1.4 sinnvoll
	// DEF_SHADOW_HALF_OPEN: halbe Öffnung des Schatten-Segments hinter dem Verteidiger (0.42 rad ≈ 24°)
	//   bestimmt wie gross der "blinde Fleck" hinten wirkt
	const DEF_HALF_OPEN = 0.96; // ~55°
	// Schattenöffnung hinter dem Verteidiger
	const DEF_SHADOW_HALF_OPEN = 0.42; // ~41°

	/**
	 * Für jeden Verteidiger: berechne die Richtung zur nächstgelegenen Angriffszone.
	 * Wenn mehrere Zonen überschneiden, nimm die grösste Überschneidung.
	 */
	// defenderDirections wird nicht mehr für das Rendering der Verteidigungszonen
	// verwendet — die Winkel kommen jetzt direkt aus den DEFENDERS-Objekten (fwdAngleDeg/bwdAngleDeg).
	// Diese $derived bleibt für etwaige künftige Nutzung erhalten, wird aber im SVG nicht mehr referenziert.

	// Spieler-Radien
	const PLAYER_R        = 15;
	const PLAYER_R_LIBERO = 18;

	// Vorberechnete Werte für SVG-Labels (können nicht als {@const} im SVG-Root stehen)
	const BS_ANGLE     = (ZONE_BLOCK_SHADOW.aStart + ZONE_BLOCK_SHADOW.aEnd) / 2;
	const BS_LABEL_R   = 2.2 * PX_PER_M;
	const BS_LABEL_X   = ATK_SVG_X + Math.cos(BS_ANGLE) * BS_LABEL_R;
	const BS_LABEL_Y   = ATK_SVG_Y + Math.sin(BS_ANGLE) * BS_LABEL_R;

	const BLOCK_LEFT_PX  = fx(BLOCK_LEFT_M);
	const BLOCK_RIGHT_PX = fx(BLOCK_RIGHT_M);
	const BLOCK_TOP_Y    = fy(BLOCK_Y_M) - 14;
	const BLOCK_BOT_Y    = fy(BLOCK_Y_M) + 14;
	const BLOCK_MID_X    = fx((BLOCKER_1.x + BLOCKER_2.x) / 2);
</script>

<div class="cav-wrapper">

	<!-- ── Header ────────────────────────────────────────────────────────────── -->
	<div class="cav-header">
		<span class="cav-title">Draufsicht: Angriff P4 mit Doppelblock</span>
		<p class="cav-subtitle">
			Der gegnerische Angreifer (P4, <strong>rechts am Netz</strong>) trifft auf einen
			Doppelblock. Die Kreissektoren zeigen, welche Zonen er trotzdem angreifen kann —
			und wo die Verteidiger stehen müssen.
		</p>
	</div>

	<!-- ── SVG ───────────────────────────────────────────────────────────────── -->
	<div class="cav-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="cav-svg"
			role="img"
			aria-label="Draufsicht Volleyball-Feld, Angriff P4 rechts"
		>
			<defs>
				<!-- Feld-ClipPath: begrenzt alle Sektoren auf das Spielfeld -->
				<clipPath id={FIELD_CLIP_ID}>
					<rect x={FIELD_X} y={FIELD_Y} width={DRAW_W} height={DRAW_H} />
				</clipPath>

				<!-- ClipPaths für Überschneidungen: Sektor als Clip für Verteidigerkreis -->
				{#each [...ATTACK_ZONES, ZONE_FINTE] as zone}
					<clipPath id="sclip-{zone.id}">
						<path d={sectorPath(zone.aStart, zone.aEnd)} />
					</clipPath>
				{/each}
			</defs>

			<!-- ╔══ Hintergrund ════════════════════════════════════════════════╗ -->
			<rect width={SVG_W} height={SVG_H} fill="#f1f5f9" rx="10" />

			<!-- ╔══ Spielfeld-Belag ════════════════════════════════════════════╗ -->
			<rect
				x={FIELD_X} y={FIELD_Y}
				width={DRAW_W} height={DRAW_H}
				fill="#fef9ee"
				rx="2"
			/>

			<!-- ╔══ Blockschatten (immer sichtbar) ════════════════════════════╗ -->
			<!-- Direkt hinter dem Block — die abgedeckte Zone -->
			<path
				d={sectorPath(ZONE_BLOCK_SHADOW.aStart, ZONE_BLOCK_SHADOW.aEnd)}
				fill={ZONE_BLOCK_SHADOW.color}
				opacity="0.13"
				clip-path="url(#{FIELD_CLIP_ID})"
			/>
			<path
				d={sectorPath(ZONE_BLOCK_SHADOW.aStart, ZONE_BLOCK_SHADOW.aEnd)}
				fill="none"
				stroke={ZONE_BLOCK_SHADOW.color}
				stroke-width="1.5"
				stroke-dasharray="5,4"
				opacity="0.35"
				clip-path="url(#{FIELD_CLIP_ID})"
			/>
			<!-- Blockschatten-Label -->
			<text
				x={BS_LABEL_X}
				y={BS_LABEL_Y + 4}
				text-anchor="middle"
				fill={ZONE_BLOCK_SHADOW.color}
				font-size="9"
				font-family="sans-serif"
				font-weight="600"
				opacity="0.6"
			>Block­schatten</text>

			<!-- ╔══ Angriffszonen (Kreissektoren) ══════════════════════════════╗ -->
			{#each ATTACK_ZONES as zone}
				<!-- Sektor-Füllung -->
				<path
					d={sectorPath(zone.aStart, zone.aEnd)}
					fill={zone.color}
					opacity="0.16"
					clip-path="url(#{FIELD_CLIP_ID})"
				/>
				<!-- Sektor-Rand -->
				<path
					d={sectorPath(zone.aStart, zone.aEnd)}
					fill="none"
					stroke={zone.color}
					stroke-width="2"
					stroke-linejoin="round"
					opacity="0.7"
					clip-path="url(#{FIELD_CLIP_ID})"
				/>
				<!-- Zonen-Label in der Mitte des Sektors -->
				{@const midAngle = (zone.aStart + zone.aEnd) / 2}
				{@const labelR   = 3.5 * PX_PER_M}
				<text
					x={ATK_SVG_X + Math.cos(midAngle) * labelR}
					y={ATK_SVG_Y + Math.sin(midAngle) * labelR + 4}
					text-anchor="middle"
					fill={zone.color}
					font-size="11"
					font-family="sans-serif"
					font-weight="700"
					opacity="0.9"
				>{zone.label}</text>
			{/each}

			<!-- ╔══ Finte-Sektor (Toggle, kurzer Radius) ══════════════════════╗ -->
			{#if showFinte}
				<path
					d={sectorPath(ZONE_FINTE.aStart, ZONE_FINTE.aEnd, ZONE_FINTE.rPx)}
					fill={ZONE_FINTE.color}
					opacity="0.22"
					clip-path="url(#{FIELD_CLIP_ID})"
				/>
				<path
					d={sectorPath(ZONE_FINTE.aStart, ZONE_FINTE.aEnd, ZONE_FINTE.rPx)}
					fill="none"
					stroke={ZONE_FINTE.color}
					stroke-width="2"
					opacity="0.8"
					clip-path="url(#{FIELD_CLIP_ID})"
				/>
				<text
					x={ATK_SVG_X + Math.cos(ANGLE_BLOCK_MID) * (ZONE_FINTE.rPx * 0.55)}
					y={ATK_SVG_Y + Math.sin(ANGLE_BLOCK_MID) * (ZONE_FINTE.rPx * 0.55) + 4}
					text-anchor="middle"
					fill={ZONE_FINTE.color}
					font-size="10"
					font-family="sans-serif"
					font-weight="700"
					opacity="0.9"
				>Finte</text>
			{/if}

		<!-- ╔══ Verteidigungszonen: gerichtete Segmente (Toggle) ═══════════╗ -->
		{#if showDefenseZones}
			{#each DEFENDERS as p}
				{@const rPx      = p.radiusM * PX_PER_M}
				{@const psvx     = fx(p.x)}
				{@const psvy     = fy(p.y)}
				{@const fwdRad   = p.fwdAngleDeg * (Math.PI / 180)}
				{@const bwdRad   = p.bwdAngleDeg * (Math.PI / 180)}
				{@const halfOpen = p.halfOpenDeg * (Math.PI / 180)}
				<!-- Vorwärts-Zone (Zone nach vorne) -->
				<path
					d={defSegmentPath(psvx, psvy, rPx, fwdRad, halfOpen)}
					fill={p.role === 'libero' ? '#dc2626' : '#374151'}
					opacity={p.role === 'libero' ? 0.14 : 0.09}
				/>
				<path
					d={defSegmentPath(psvx, psvy, rPx, fwdRad, halfOpen)}
					fill="none"
					stroke={p.role === 'libero' ? '#dc2626' : '#64748b'}
					stroke-width="1.5"
					stroke-dasharray="5,3"
					opacity={p.role === 'libero' ? 0.55 : 0.35}
				/>
				<!-- Rückwärts-Zone (Zone nach hinten) -->
				<path
					d={defSegmentPath(psvx, psvy, rPx * 0.65, bwdRad, halfOpen)}
					fill={p.role === 'libero' ? '#dc2626' : '#374151'}
					opacity={p.role === 'libero' ? 0.07 : 0.04}
				/>
				<path
					d={defSegmentPath(psvx, psvy, rPx * 0.65, bwdRad, halfOpen)}
					fill="none"
					stroke={p.role === 'libero' ? '#dc2626' : '#64748b'}
					stroke-width="1"
					stroke-dasharray="3,4"
					opacity={p.role === 'libero' ? 0.30 : 0.18}
				/>
			{/each}
		{/if}

		<!-- ╔══ Direkte Wahrnehmung: gerichtete Überschneidungs-Segmente ══╗ -->
		{#if showPerception}
			{#each DEFENDERS as p}
				{@const rPx      = p.radiusM * PX_PER_M}
				{@const psvx     = fx(p.x)}
				{@const psvy     = fy(p.y)}
				{@const fwdRad   = p.fwdAngleDeg * (Math.PI / 180)}
				{@const halfOpen = p.halfOpenDeg * (Math.PI / 180)}
				{#each [...ATTACK_ZONES, ...(showFinte ? [ZONE_FINTE] : [])] as zone}
					{@const dir = defenderDirectionForZone(p.x, p.y, p.radiusM, zone.aStart, zone.aEnd)}
					{#if dir.hasCoverage}
						<!-- Überschneidungs-Segment: in Richtung der Zone eingefärbt -->
						<path
							d={defSegmentPath(psvx, psvy, rPx, fwdRad, halfOpen)}
							fill={zone.color}
							opacity={p.role === 'libero' ? 0.40 : 0.22}
							clip-path="url(#sclip-{zone.id})"
						/>
						<path
							d={defSegmentPath(psvx, psvy, rPx, fwdRad, halfOpen)}
							fill="none"
							stroke={zone.color}
							stroke-width={p.role === 'libero' ? 2.5 : 1.5}
							opacity={p.role === 'libero' ? 0.8 : 0.5}
							clip-path="url(#sclip-{zone.id})"
						/>
					{/if}
				{/each}
			{/each}
		{/if}

			<!-- ╔══ Feldmarkierungen (über den Sektoren, für Lesbarkeit) ════════╗ -->
			<!-- Feld-Rahmen -->
			<rect
				x={FIELD_X} y={FIELD_Y}
				width={DRAW_W} height={DRAW_H}
				fill="none"
				stroke="#64748b"
				stroke-width="2.5"
			/>
			<!-- 3m-Linie -->
			<line
				x1={FIELD_X} y1={fy(3.0)}
				x2={FIELD_X + DRAW_W} y2={fy(3.0)}
				stroke="#94a3b8"
				stroke-width="1.2"
				stroke-dasharray="7,5"
				opacity="0.6"
			/>
			<text x={FIELD_X - 6} y={fy(3.0) + 3} text-anchor="end" fill="#94a3b8" font-size="8" font-family="sans-serif">3m</text>
			<!-- Mittellinie vertikal (Orientierung) -->
			<line
				x1={fx(4.5)} y1={FIELD_Y}
				x2={fx(4.5)} y2={FIELD_Y + DRAW_H}
				stroke="#cbd5e1"
				stroke-width="1"
				stroke-dasharray="4,4"
				opacity="0.4"
			/>

			<!-- ╔══ Netz ════════════════════════════════════════════════════════╗ -->
			<!-- Netzpfosten links -->
			<rect x={FIELD_X - 6} y={FIELD_Y - 10} width="6" height="14" rx="2" fill="#475569" />
			<!-- Netzpfosten rechts -->
			<rect x={FIELD_X + DRAW_W} y={FIELD_Y - 10} width="6" height="14" rx="2" fill="#475569" />
			<!-- Netzband -->
			<rect x={FIELD_X} y={FIELD_Y - 6} width={DRAW_W} height="7" rx="2" fill="#94a3b8" opacity="0.85" />
			<rect x={FIELD_X} y={FIELD_Y - 6} width={DRAW_W} height="7" rx="2" fill="none" stroke="#475569" stroke-width="1.2" />
			<text x={FIELD_X + DRAW_W / 2} y={FIELD_Y - 9} text-anchor="middle" fill="#64748b" font-size="8" font-family="sans-serif" font-weight="600">NETZ</text>

			<!-- ╔══ Block-Körper (geschlossen, am Netz) ════════════════════════╗ -->
			<!-- Geschlossener Block: ein Rechteck über beide Blocker -->
			<!-- Block-Schutzbereich (Körper) -->
			<rect
				x={BLOCK_LEFT_PX}
				y={BLOCK_TOP_Y}
				width={BLOCK_RIGHT_PX - BLOCK_LEFT_PX}
				height={BLOCK_BOT_Y - BLOCK_TOP_Y}
				rx="10"
				fill="#1e3a5f"
				opacity="0.85"
			/>
			<!-- Block-Rand -->
			<rect
				x={BLOCK_LEFT_PX}
				y={BLOCK_TOP_Y}
				width={BLOCK_RIGHT_PX - BLOCK_LEFT_PX}
				height={BLOCK_BOT_Y - BLOCK_TOP_Y}
				rx="10"
				fill="none"
				stroke="#0f172a"
				stroke-width="1.5"
				opacity="0.5"
			/>
			<!-- Block-Label -->
			<text
				x={(BLOCK_LEFT_PX + BLOCK_RIGHT_PX) / 2}
				y={fy(BLOCK_Y_M) + 4}
				text-anchor="middle"
				fill="white"
				font-size="9"
				font-family="sans-serif"
				font-weight="700"
			>BLOCK</text>
			<!-- Trennlinie zwischen den 2 Blockern (kleine Lücke andeuten) -->
			<line
				x1={BLOCK_MID_X}
				y1={BLOCK_TOP_Y + 3}
				x2={BLOCK_MID_X}
				y2={BLOCK_BOT_Y - 3}
				stroke="white"
				stroke-width="1"
				opacity="0.3"
			/>

			<!-- ╔══ Block-Kanten-Linien (Schatten-Grenzen) ════════════════════╗ -->
			<!-- Zeigen die Winkel der Schatten-Grenzen als gestrichelte Linien -->
			{#each [BLOCK_LEFT_M, BLOCK_RIGHT_M] as bxM}
				<line
					x1={ATK_SVG_X}
					y1={ATK_SVG_Y}
					x2={fx(bxM)}
					y2={fy(BLOCK_Y_M)}
					stroke="#1e3a5f"
					stroke-width="1"
					stroke-dasharray="4,3"
					opacity="0.4"
				/>
			{/each}

		<!-- ╔══ Zonen-Randlinien: Angreifer → Feldrand (gestrichelt) ═════╗ -->
		<!-- Ränder jeder Angriffszone als gestrichelte Linien vom Angreifer -->
		{#each ATTACK_ZONES as zone}
			{#each [zone.aStart, zone.aEnd] as angle}
				{@const p = sectorPoint(angle)}
				<line
					x1={ATK_SVG_X}
					y1={ATK_SVG_Y}
					x2={p.x}
					y2={p.y}
					stroke={zone.color}
					stroke-width="1"
					stroke-dasharray="4,3"
					opacity="0.5"
				/>
			{/each}
		{/each}

		<!-- ╔══ Angreifer-Symbol ════════════════════════════════════════════╗ -->
		<!-- Kreis mit Label, oberhalb des Feldes rechts -->
			<circle cx={ATK_SVG_X} cy={ATK_SVG_Y} r="18" fill="#16a34a" opacity="0.95" />
			<text
				x={ATK_SVG_X}
				y={ATK_SVG_Y - 3}
				text-anchor="middle"
				fill="white"
				font-size="9"
				font-family="sans-serif"
				font-weight="700"
			>A P4</text>
			<text
				x={ATK_SVG_X}
				y={ATK_SVG_Y + 8}
				text-anchor="middle"
				fill="white"
				font-size="7"
				font-family="sans-serif"
				opacity="0.85"
			>(Gegner)</text>
			<!-- Pfeil nach unten zum Netz -->
			<line
				x1={ATK_SVG_X}
				y1={ATK_SVG_Y + 18}
				x2={ATK_SVG_X}
				y2={FIELD_Y - 7}
				stroke="#16a34a"
				stroke-width="2"
				stroke-linecap="round"
				opacity="0.7"
			/>

			<!-- ╔══ Verteidiger ════════════════════════════════════════════════╗ -->
			{#each DEFENDERS as p}
				{@const isLibero = p.role === 'libero'}
				{@const psvx    = fx(p.x)}
				{@const psvy    = fy(p.y)}
				{@const r       = isLibero ? PLAYER_R_LIBERO : PLAYER_R}

				<!-- Schatten -->
				<ellipse cx={psvx} cy={psvy + 3} rx={r * 0.8} ry={r * 0.28} fill="#475569" opacity="0.1" />

				<!-- Kreis -->
				<circle
					cx={psvx} cy={psvy} r={r}
					fill={isLibero ? '#dc2626' : '#374151'}
					opacity={isLibero ? 1.0 : 0.85}
				/>

				<!-- Libero-Ring -->
				{#if isLibero}
					<circle cx={psvx} cy={psvy} r={r + 5} fill="none"
						stroke="#dc2626" stroke-width="2.5" stroke-dasharray="5,3" opacity="0.65" />
				{/if}

				<!-- Label -->
				<text
					x={psvx} y={psvy + 4}
					text-anchor="middle"
					fill="white"
					font-size={isLibero ? 10 : 9}
					font-family="sans-serif"
					font-weight="700"
				>{p.label}</text>

				<!-- Libero-Beschriftung -->
				{#if isLibero}
					<text x={psvx + r + 7} y={psvy - r + 2}
						fill="#dc2626" font-size="8" font-family="sans-serif" font-weight="700" opacity="0.85"
					>Libero</text>
				{/if}
			{/each}

			<!-- ╔══ Grundlinie-Label ════════════════════════════════════════════╗ -->
			<text
				x={FIELD_X + DRAW_W / 2}
				y={FIELD_Y + DRAW_H + 20}
				text-anchor="middle"
				fill="#94a3b8"
				font-size="8"
				font-family="sans-serif"
			>Grundlinie</text>

			<!-- Seiten-Labels -->
			<text x={FIELD_X - 6} y={FIELD_Y + DRAW_H / 2}
				text-anchor="end" dominant-baseline="middle"
				fill="#94a3b8" font-size="8" font-family="sans-serif"
				transform="rotate(-90 {FIELD_X - 20} {FIELD_Y + DRAW_H / 2})"
			>9 m</text>
		</svg>
	</div>

	<!-- ── Toggles ───────────────────────────────────────────────────────────── -->
	<div class="cav-toggle-row">
		<button
			class="cav-toggle"
			class:active={showDefenseZones}
			onclick={() => (showDefenseZones = !showDefenseZones)}
		>
			<span class="cav-toggle-icon">{showDefenseZones ? '◉' : '○'}</span>
			Verteidigungszonen
		</button>
		<button
			class="cav-toggle cav-toggle-finte"
			class:active={showFinte}
			onclick={() => (showFinte = !showFinte)}
		>
			<span class="cav-toggle-icon">{showFinte ? '◉' : '○'}</span>
			Finte
		</button>
		<button
			class="cav-toggle cav-toggle-perception"
			class:active={showPerception}
			onclick={() => (showPerception = !showPerception)}
		>
			<span class="cav-toggle-icon">{showPerception ? '◉' : '○'}</span>
			Direkte Wahrnehmung
		</button>
	</div>

	<!-- ── Zonen-Panel ───────────────────────────────────────────────────────── -->
	<div class="cav-zone-panel">
		{#each ATTACK_ZONES as zone}
			{@const overlap = zoneOverlaps.find(o => o.id === zone.id)}
			<div class="cav-zone-item" style="border-left-color: {zone.color}">
				<span class="cav-zone-label" style="color: {zone.color}">{zone.label}</span>
				<span class="cav-zone-desc">{zone.description}</span>
				{#if showPerception && overlap}
					<span class="cav-zone-badge" class:covered={overlap.anyHit} class:open={!overlap.anyHit}>
						{overlap.anyHit ? 'Verteidigt' : 'Offen'}
					</span>
				{/if}
			</div>
		{/each}
		<!-- Block-Schatten -->
		<div class="cav-zone-item" style="border-left-color: #1e3a5f">
			<span class="cav-zone-label" style="color: #1e3a5f">Blockschatten</span>
			<span class="cav-zone-desc">Direkt hinter dem geschlossenen Block — nicht angreifbar</span>
			<span class="cav-zone-badge" style="background:#f0f4ff;color:#1e3a5f">Geblockt</span>
		</div>
		{#if showFinte}
			{@const fOverlap = zoneOverlaps.find(o => o.id === 'finte')}
			<div class="cav-zone-item" style="border-left-color: #7c3aed">
				<span class="cav-zone-label" style="color:#7c3aed">Finte</span>
				<span class="cav-zone-desc">{ZONE_FINTE.description}</span>
				{#if showPerception && fOverlap}
					<span class="cav-zone-badge" class:covered={fOverlap.anyHit} class:open={!fOverlap.anyHit}>
						{fOverlap.anyHit ? 'Verteidigt' : 'Offen'}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ── Erklärung ─────────────────────────────────────────────────────────── -->
	<div class="cav-explainer">
		<strong>Direkte Wahrnehmung:</strong>
		Kennt ein Verteidiger die Angriffszone vor dem Schlag, kann er sich
		<em>antizipativ</em> positionieren. Die Überschneidung (Verteidigungs­radius ∩ Angriffssektor)
		zeigt: ist meine Zone abgedeckt? Der <span style="color:#dc2626;font-weight:600">Libero</span>
		hat die grösste Reichweite und ist ideal für die lange Diagonale positioniert.
	</div>

</div>

<style>
	.cav-wrapper {
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

	.cav-header { display: flex; flex-direction: column; gap: 0.25rem; }

	.cav-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
	}

	.cav-subtitle {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	.cav-svg-wrapper { width: 100%; overflow: hidden; border-radius: 0.5rem; }
	.cav-svg { width: 100%; height: auto; display: block; }

	/* ── Toggles ────────────────────────────────────────────────────── */
	.cav-toggle-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }

	.cav-toggle {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.9rem;
		border: 2px solid #e2e8f0;
		border-radius: 0.5rem;
		background: #f8fafc;
		color: #475569;
		font-size: 0.83rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.cav-toggle:hover { border-color: #cbd5e1; background: #f1f5f9; }

	.cav-toggle.active {
		border-color: #1e3a5f;
		background: #eff6ff;
		color: #1e3a5f;
		font-weight: 600;
	}

	.cav-toggle-finte.active {
		border-color: #7c3aed;
		background: #f5f3ff;
		color: #7c3aed;
	}

	.cav-toggle-perception.active {
		border-color: #0891b2;
		background: #f0fdfa;
		color: #0e7490;
	}

	.cav-toggle-icon { font-size: 0.85rem; line-height: 1; }

	/* ── Zonen-Panel ────────────────────────────────────────────────── */
	.cav-zone-panel {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.45rem;
	}

	.cav-zone-item {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		padding: 0.45rem 0.7rem;
		border-left: 3px solid;
		background: #f8fafc;
		border-radius: 0 0.3rem 0.3rem 0;
	}

	.cav-zone-label { font-size: 0.8rem; font-weight: 700; }
	.cav-zone-desc  { font-size: 0.72rem; color: #64748b; line-height: 1.35; }

	.cav-zone-badge {
		display: inline-block;
		margin-top: 0.15rem;
		padding: 0.08rem 0.4rem;
		border-radius: 0.2rem;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.cav-zone-badge.covered { background: #fef2f2; color: #dc2626; }
	.cav-zone-badge.open    { background: #f0fdf4; color: #16a34a; }

	/* ── Erklärung ──────────────────────────────────────────────────── */
	.cav-explainer {
		background: #f5f3ff;
		border-left: 3px solid #7c3aed;
		border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.6rem 1rem;
		font-size: 0.81rem;
		color: #334155;
		line-height: 1.55;
	}

	.cav-explainer strong { color: #5b21b6; }

	@media (max-width: 600px) {
		.cav-wrapper { padding: 1rem; }
		.cav-toggle-row { flex-direction: column; }
		.cav-zone-panel { grid-template-columns: 1fr 1fr; }
	}
</style>
