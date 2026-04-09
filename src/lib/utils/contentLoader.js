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
 * Lädt alle Teams
 * @returns {Promise<Team[]>}
 */
export async function loadTeams() {
	const modules = import.meta.glob('/src/content/teams/*.yaml', { eager: true, query: '?raw' });
	const teams = [];

	for (const path in modules) {
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const team = /** @type {Team} */ (yaml.load(content));
		teams.push(team);
	}

	return teams.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lädt ein Team nach ID
 * @param {string} id - Team-ID
 * @returns {Promise<Team|null>}
 */
export async function loadTeamById(id) {
	try {
		const module = await import(`/src/content/teams/${id}.yaml?raw`);
		return yaml.load(module.default);
	} catch {
		return null;
	}
}

/**
 * Lädt alle Übungen
 * @returns {Promise<Uebung[]>}
 */
export async function loadUebungen() {
	const modules = import.meta.glob('/src/content/uebungen/*.yaml', {
		eager: true,
		query: '?raw',
	});
	const uebungen = [];

	for (const path in modules) {
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const uebung = /** @type {Uebung} */ (yaml.load(content));
		uebungen.push(uebung);
	}

	return uebungen.sort((a, b) => a.titel.localeCompare(b.titel));
}

/**
 * Lädt eine Übung nach ID
 * @param {string} id - Übungs-ID
 * @returns {Promise<Uebung|null>}
 */
export async function loadUebungById(id) {
	try {
		const module = await import(`/src/content/uebungen/${id}.yaml?raw`);
		return yaml.load(module.default);
	} catch {
		return null;
	}
}

/**
 * Lädt alle Rollen
 * @returns {Promise<Rolle[]>}
 */
export async function loadRollen() {
	const modules = import.meta.glob('/src/content/rollen/*.yaml', { eager: true, query: '?raw' });
	const rollen = [];

	for (const path in modules) {
		const module = /** @type {any} */ (modules[path]);
		const content = module.default;
		const rolle = /** @type {Rolle} */ (yaml.load(content));
		rollen.push(rolle);
	}

	return rollen.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lädt eine Rolle nach ID
 * @param {string} id - Rollen-ID
 * @returns {Promise<Rolle|null>}
 */
export async function loadRolleById(id) {
	try {
		const module = await import(`/src/content/rollen/${id}.yaml?raw`);
		return yaml.load(module.default);
	} catch {
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
