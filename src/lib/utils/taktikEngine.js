/**
 * Taktik-Engine: Interpolation und Pfeil-Generierung für Taktik-Animationen
 */

// ---------------------------------------------------------------------------
// Pfeil-Stil-Definitionen
// ---------------------------------------------------------------------------

/**
 * Laufwege (Spielerbewegungen)
 * @type {Record<string, {color: string, width: number, dashArray: string, label: string}>}
 */
export const PLAYER_MOVE_STYLES = {
	sprint: {
		color: '#1565C0',
		width: 4,
		dashArray: 'none',
		label: 'Sprint',
	},
	lauf: {
		color: '#1E88E5',
		width: 3,
		dashArray: 'none',
		label: 'Lauf',
	},
	schritt: {
		color: '#90CAF9',
		width: 2,
		dashArray: '6,4',
		label: 'Schritt',
	},
};

/**
 * Ballwege
 * @type {Record<string, {color: string, width: number, dashArray: string, label: string}>}
 */
export const BALL_MOVE_STYLES = {
	angriff: {
		color: '#D32F2F',
		width: 4,
		dashArray: '8,5',
		label: 'Angriff',
	},
	finte: {
		color: '#E64A19',
		width: 3,
		dashArray: '5,4',
		label: 'Finte',
	},
	downball: {
		color: '#F57C00',
		width: 3,
		dashArray: '12,5',
		label: 'Downball',
	},
	pass: {
		color: '#2E7D32',
		width: 3,
		dashArray: '8,5',
		label: 'Pass',
	},
	gratisball: {
		color: '#558B2F',
		width: 3,
		dashArray: '3,4',
		label: 'Gratisball',
	},
	service: {
		color: '#6A1B9A',
		width: 3,
		dashArray: '8,5',
		label: 'Aufschlag',
	},
};

/** Standard-Stil wenn kein moveType angegeben */
export const DEFAULT_PLAYER_STYLE = PLAYER_MOVE_STYLES.lauf;
export const DEFAULT_BALL_STYLE = BALL_MOVE_STYLES.pass;

// ---------------------------------------------------------------------------
// Koordinaten-Helpers
// ---------------------------------------------------------------------------

/**
 * Linearer Interpolations-Wert
 * @param {number} a
 * @param {number} b
 * @param {number} t - Fortschritt 0..1
 * @returns {number}
 */
function lerp(a, b, t) {
	return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Interpolation zwischen zwei Schritten
// ---------------------------------------------------------------------------

/**
 * Interpoliert alle Objekt-Positionen zwischen zwei Schritten.
 * @param {Record<string, {x: number, y: number}>} posA - Positionen Schritt A
 * @param {Record<string, {x: number, y: number}>} posB - Positionen Schritt B
 * @param {number} t - Fortschritt 0..1
 * @returns {Record<string, {x: number, y: number}>}
 */
export function interpolatePositions(posA, posB, t) {
	const result = {};
	// Alle Keys aus beiden Schritten
	const keys = new Set([...Object.keys(posA), ...Object.keys(posB)]);
	for (const key of keys) {
		const a = posA[key] ?? posB[key];
		const b = posB[key] ?? posA[key];
		result[key] = {
			x: lerp(a.x, b.x, t),
			y: lerp(a.y, b.y, t),
		};
	}
	return result;
}

/**
 * Gibt die interpolierten Positionen für einen bestimmten Zeitpunkt zurück.
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @param {number} time - Aktuelle Zeit in ms (ab Beginn der Animation)
 * @returns {{positions: Record<string, {x: number, y: number}>, stepIndex: number, progress: number}}
 */
export function getPositionsAtTime(animation, time) {
	const steps = animation.steps;
	if (!steps || steps.length === 0) {
		return { positions: {}, stepIndex: 0, progress: 0 };
	}

	// Kumulierte Zeit berechnen
	let elapsed = 0;
	for (let i = 0; i < steps.length - 1; i++) {
		const stepDuration = steps[i].duration ?? 1000;
		if (time <= elapsed + stepDuration) {
			const t = stepDuration > 0 ? (time - elapsed) / stepDuration : 1;
			const tClamped = Math.max(0, Math.min(1, t));
			return {
				positions: interpolatePositions(steps[i].positions, steps[i + 1].positions, tClamped),
				stepIndex: i,
				progress: tClamped,
			};
		}
		elapsed += stepDuration;
	}

	// Letzter Schritt
	return {
		positions: steps[steps.length - 1].positions,
		stepIndex: steps.length - 1,
		progress: 1,
	};
}

/**
 * Gibt die Gesamtdauer der Animation zurück
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @returns {number} Dauer in ms
 */
export function getTotalDuration(animation) {
	if (!animation.steps || animation.steps.length === 0) return 0;
	// Summe aller step durations (letzter Schritt hat keine eigene duration als Übergang)
	return animation.steps.slice(0, -1).reduce((sum, step) => sum + (step.duration ?? 1000), 0);
}

// ---------------------------------------------------------------------------
// Pfeil-Generierung für Animation-Playback
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Arrow
 * @property {string} objectId - ID des Objekts
 * @property {string} objectType - "player" oder "ball"
 * @property {number} x1 - Startpunkt X (normalisiert)
 * @property {number} y1 - Startpunkt Y (normalisiert)
 * @property {number} x2 - Endpunkt X (normalisiert)
 * @property {number} y2 - Endpunkt Y (normalisiert)
 * @property {string} moveType - Bewegungstyp
 * @property {number} stepIndex - Schritt-Index aus dem dieser Pfeil stammt
 * @property {number} arrowIndex - Globaler Pfeil-Index (für Nummerierung)
 */

/**
 * Generiert alle Pfeile aus der Animation (für Playback: nur bis zum aktuellen Schritt).
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @param {Record<string, {type: string, label?: string, team?: string}>} objects
 * @param {number} upToStepIndex - Nur Pfeile bis zu diesem Schritt anzeigen (-1 = alle)
 * @returns {Arrow[]}
 */
export function generateArrows(animation, objects, upToStepIndex = -1) {
	const arrows = [];
	const steps = animation.steps;
	if (!steps || steps.length < 2) return arrows;

	const limit = upToStepIndex === -1 ? steps.length - 1 : Math.min(upToStepIndex, steps.length - 1);

	let arrowIndex = 1;
	for (let i = 0; i < limit; i++) {
		const stepFrom = steps[i];
		const stepTo = steps[i + 1];
		const arrowOverrides = stepFrom.arrows ?? {};

		for (const objectId of Object.keys(stepFrom.positions)) {
			const posFrom = stepFrom.positions[objectId];
			const posTo = stepTo.positions[objectId];

			// Kein Pfeil wenn Position unverändert (Threshold: < 1%)
			if (!posTo) continue;
			const dx = posTo.x - posFrom.x;
			const dy = posTo.y - posFrom.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < 0.005) continue;

			const objectDef = objects[objectId];
			const objectType = objectDef?.type ?? 'player';
			const arrowOverride = arrowOverrides[objectId];
			const moveType = arrowOverride?.moveType ?? (objectType === 'ball' ? 'pass' : 'lauf');

			arrows.push({
				objectId,
				objectType,
				x1: posFrom.x,
				y1: posFrom.y,
				x2: posTo.x,
				y2: posTo.y,
				moveType,
				stepIndex: i,
				arrowIndex: arrowIndex++,
			});
		}
	}

	return arrows;
}

/**
 * Gibt den Pfeil-Stil für einen gegebenen moveType und Objekt-Typ zurück.
 * @param {string} moveType
 * @param {string} objectType - "player" oder "ball"
 * @returns {{color: string, width: number, dashArray: string, label: string}}
 */
export function getArrowStyle(moveType, objectType) {
	if (objectType === 'ball') {
		return BALL_MOVE_STYLES[moveType] ?? DEFAULT_BALL_STYLE;
	}
	return PLAYER_MOVE_STYLES[moveType] ?? DEFAULT_PLAYER_STYLE;
}

// ---------------------------------------------------------------------------
// Print-Overlay: Alle Wege überlagert
// ---------------------------------------------------------------------------

/**
 * Generiert alle Pfeile für die Druckansicht (alle Schritte überlagert).
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @param {Record<string, {type: string, label?: string, team?: string}>} objects
 * @returns {Arrow[]}
 */
export function generatePrintArrows(animation, objects) {
	return generateArrows(animation, objects, -1);
}

/**
 * Gibt die Startpositionen aller Objekte zurück (erster Schritt).
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @returns {Record<string, {x: number, y: number}>}
 */
export function getStartPositions(animation) {
	if (!animation.steps || animation.steps.length === 0) return {};
	return animation.steps[0].positions ?? {};
}

// ---------------------------------------------------------------------------
// Typen (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TaktikStep
 * @property {number} duration - Übergangsdauer in ms
 * @property {Record<string, {x: number, y: number}>} positions
 * @property {Record<string, {moveType: string}>} [arrows]
 */

/**
 * @typedef {Object} TaktikZone
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} color
 * @property {string} [label]
 */

/**
 * @typedef {Object} TaktikObject
 * @property {'player'|'ball'} type
 * @property {string} [label]
 * @property {'home'|'away'} [team]
 */

/**
 * @typedef {Object} TaktikAnimation
 * @property {'taktik'} type
 * @property {'volleyball-half'|'volleyball-full'} court
 * @property {boolean} [loop]
 * @property {string} [beschreibung]
 * @property {Record<string, TaktikObject>} objects
 * @property {TaktikZone[]} [zones]
 * @property {TaktikStep[]} steps
 */
