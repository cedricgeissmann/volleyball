import yaml from 'js-yaml';

/**
 * @typedef {Object} TrainingTime
 * @property {string} tag - Tag der Woche
 * @property {string} zeit - Zeitraum
 * @property {string} ort - Trainingsort
 */

/**
 * @typedef {Object} TeamGoal
 * @property {string} titel - Titel des Ziels
 * @property {string} beschreibung - Beschreibung des Ziels
 */

/**
 * @typedef {Object} Team
 * @property {string} id - Eindeutige ID
 * @property {string} name - Team-Name
 * @property {string} beschreibung - Team-Beschreibung
 * @property {TrainingTime[]} trainingszeiten - Trainingszeiten
 * @property {TeamGoal[]} ziele - Team-Ziele
 */

/**
 * @typedef {Object} Uebung
 * @property {string} id - Eindeutige ID
 * @property {string} titel - Titel der Übung
 * @property {string} beschreibung - Beschreibung
 * @property {string} kategorie - Kategorie
 * @property {string[]} ziele - Lernziele
 * @property {string} fokus - Fokus-Bereich
 * @property {number} [dauer] - Dauer in Minuten (optional)
 * @property {string} [typ] - Übungstyp (kraft, ausdauer, volleyball, etc.)
 * @property {string|number} [wiederholungen] - Wiederholungen (z.B. "10-20" oder 15)
 * @property {string} [bedingung] - Bedingung für Übungsende
 * @property {string} [animation] - Pfad zur Animations-Datei
 * @property {string[]} [anleitung] - Schritt-für-Schritt Anleitung
 */

/**
 * @typedef {Object} Rolle
 * @property {string} id - Eindeutige ID
 * @property {string} name - Rollen-Name
 * @property {string} beschreibung - Beschreibung
 * @property {string[]} aufgaben - Aufgaben
 * @property {string} fokus - Fokus-Bereich
 */

/**
 * @typedef {Object} Event
 * @property {string} id - Eindeutige ID
 * @property {string} titel - Event-Titel
 * @property {string} datum - Datum (ISO)
 * @property {string} zeit - Zeitraum
 * @property {string} ort - Ort
 * @property {string} beschreibung - Beschreibung
 * @property {string} [team] - Team-ID (optional)
 */

/**
 * Lädt alle Teams für eine Locale
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Team[]>}
 */
export async function loadTeams(locale = 'de') {
	// Versuche zuerst die gewünschte Locale zu laden
	let modules = import.meta.glob('/src/content/teams/**/*.yaml', { eager: true, query: '?raw' });
	const teams = [];

	for (const path in modules) {
		// Prüfe ob der Pfad zur gewünschten Locale gehört
		if (!path.includes(`/teams/${locale}/`)) {
			continue;
		}
		
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const team = /** @type {Team} */ (yaml.load(content));
		teams.push(team);
	}

	// Fallback zu Deutsch wenn keine Teams gefunden
	if (teams.length === 0 && locale !== 'de') {
		return loadTeams('de');
	}

	return teams.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lädt ein Team nach ID für eine Locale
 * @param {string} id - Team-ID
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Team|null>}
 */
export async function loadTeamById(id, locale = 'de') {
	try {
		const module = await import(`/src/content/teams/${locale}/${id}.yaml?raw`);
		return yaml.load(module.default);
	} catch {
		// Fallback zu Deutsch
		if (locale !== 'de') {
			return loadTeamById(id, 'de');
		}
		return null;
	}
}

/**
 * Lädt alle Übungen (inkl. Unterordner) für eine Locale
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Uebung[]>}
 */
export async function loadUebungen(locale = 'de') {
	const modules = import.meta.glob('/src/content/uebungen/**/*.yaml', {
		eager: true,
		query: '?raw',
	});
	const uebungen = [];

	for (const path in modules) {
		// Prüfe ob der Pfad zur gewünschten Locale gehört
		if (!path.includes(`/uebungen/${locale}/`)) {
			continue;
		}
		
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const uebung = /** @type {Uebung} */ (yaml.load(content));
		uebungen.push(uebung);
	}

	// Fallback zu Deutsch wenn keine Übungen gefunden
	if (uebungen.length === 0 && locale !== 'de') {
		return loadUebungen('de');
	}

	return uebungen.sort((a, b) => a.titel.localeCompare(b.titel));
}

/**
 * Lädt eine Übung nach ID (sucht in allen Unterordnern) für eine Locale
 * @param {string} id - Übungs-ID
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Uebung|null>}
 */
export async function loadUebungById(id, locale = 'de') {
	// In Unterordnern suchen
	const modules = import.meta.glob('/src/content/uebungen/**/*.yaml', {
		eager: true,
		query: '?raw',
	});

	for (const path in modules) {
		// Prüfe ob der Pfad zur gewünschten Locale gehört
		if (!path.includes(`/uebungen/${locale}/`)) {
			continue;
		}
		
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const uebung = /** @type {Uebung} */ (yaml.load(content));
		if (uebung.id === id) {
			return uebung;
		}
	}

	// Fallback zu Deutsch
	if (locale !== 'de') {
		return loadUebungById(id, 'de');
	}

	return null;
}

/**
 * Lädt alle Rollen für eine Locale
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Rolle[]>}
 */
export async function loadRollen(locale = 'de') {
	const modules = import.meta.glob('/src/content/rollen/**/*.yaml', { eager: true, query: '?raw' });
	const rollen = [];

	for (const path in modules) {
		// Prüfe ob der Pfad zur gewünschten Locale gehört
		if (!path.includes(`/rollen/${locale}/`)) {
			continue;
		}
		
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const rolle = /** @type {Rolle} */ (yaml.load(content));
		rollen.push(rolle);
	}

	// Fallback zu Deutsch wenn keine Rollen gefunden
	if (rollen.length === 0 && locale !== 'de') {
		return loadRollen('de');
	}

	return rollen.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lädt eine Rolle nach ID für eine Locale
 * @param {string} id - Rollen-ID
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Rolle|null>}
 */
export async function loadRolleById(id, locale = 'de') {
	try {
		const module = await import(`/src/content/rollen/${locale}/${id}.yaml?raw`);
		return yaml.load(module.default);
	} catch {
		// Fallback zu Deutsch
		if (locale !== 'de') {
			return loadRolleById(id, 'de');
		}
		return null;
	}
}

/**
 * Lädt alle Events
 * @returns {Promise<Event[]>}
 */
export async function loadEvents() {
	const modules = import.meta.glob('/src/content/events/*.yaml', { eager: true, query: '?raw' });
	const events = [];

	for (const path in modules) {
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const event = /** @type {Event} */ (yaml.load(content));
		events.push(event);
	}

	return events.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime());
}

/**
 * Parsed Wiederholungen aus String oder Number
 * @param {string|number} value - Wiederholungen (z.B. "10-20" oder 15)
 * @returns {{min: number, max: number, isRange: boolean}|null}
 */
export function parseRepetitions(value) {
	if (!value) return null;
	if (typeof value === 'number') {
		return { min: value, max: value, isRange: false };
	}
	if (typeof value === 'string' && value.includes('-')) {
		const [min, max] = value.split('-').map((v) => parseInt(v.trim()));
		return { min, max, isRange: true };
	}
	return null;
}

/**
 * Gibt eine zufällige Zahl im Wiederholungsbereich zurück
 * @param {{min: number, max: number, isRange: boolean}} reps - Geparste Wiederholungen
 * @returns {number|null}
 */
export function getRandomReps(reps) {
	if (!reps) return null;
	if (!reps.isRange) return reps.min;
	return Math.floor(Math.random() * (reps.max - reps.min + 1)) + reps.min;
}

/**
 * Formatiert Wiederholungen als String
 * @param {{min: number, max: number, isRange: boolean}} reps - Geparste Wiederholungen
 * @returns {string}
 */
export function formatReps(reps) {
	if (!reps) return '';
	return reps.isRange ? `${reps.min}-${reps.max} Wdh.` : `${reps.min} Wdh.`;
}

/**
 * Lädt eine Animation aus JSON-Datei
 * @param {string} filename - Animation-Dateiname (ohne Pfad)
 * @returns {Promise<any>}
 */
export async function loadAnimation(filename) {
	try {
		const module = await import(`/src/content/animationen/${filename}`);
		return module.default;
	} catch (error) {
		console.error(`Failed to load animation: ${filename}`, error);
		return null;
	}
}
