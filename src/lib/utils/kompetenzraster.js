const STORAGE_KEY = 'tv-muttenz-kompetenzraster';
const FOCUS_KEY = 'tv-muttenz-kompetenz-fokus';
const FREMD_KEY = 'tv-muttenz-fremdeinschaetzung';

/**
 * @typedef {Object} KompetenzBewertung
 * @property {string} kompetenzId - ID der Kompetenz (z.B. "defense-first")
 * @property {number} wert - Bewertung 1-5
 */

/**
 * @typedef {Object} AssessmentEntry
 * @property {string} datum - ISO Datum
 * @property {string} teamId - Team-ID
 * @property {KompetenzBewertung[]} bewertungen - Selbsteinschätzung
 * @property {string} [notizen] - Optional: Notizen
 */

/**
 * Erstellt eine Kompetenz-ID aus dem Titel
 * @param {string} titel
 * @returns {string}
 */
export function createKompetenzId(titel) {
	return titel
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Lädt die Assessment-History
 * @returns {AssessmentEntry[]}
 */
export function loadAssessmentHistory() {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch (error) {
		console.error('Failed to load assessment history:', error);
		return [];
	}
}

/**
 * Speichert ein neues Assessment
 * @param {AssessmentEntry} entry
 */
export function saveAssessment(entry) {
	if (typeof window === 'undefined') return;
	try {
		const history = loadAssessmentHistory();
		history.push(entry);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch (error) {
		console.error('Failed to save assessment:', error);
	}
}

/**
 * Löscht die komplette History
 */
export function clearAssessmentHistory() {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		console.error('Failed to clear assessment history:', error);
	}
}

/**
 * Lädt die Fokus-Kompetenzen
 * @returns {string[]} Array von Kompetenz-IDs
 */
export function loadFocusKompetenzen() {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(FOCUS_KEY);
		return data ? JSON.parse(data) : [];
	} catch (error) {
		console.error('Failed to load focus kompetenzen:', error);
		return [];
	}
}

/**
 * Speichert die Fokus-Kompetenzen
 * @param {string[]} fokusIds
 */
export function saveFocusKompetenzen(fokusIds) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(FOCUS_KEY, JSON.stringify(fokusIds));
	} catch (error) {
		console.error('Failed to save focus kompetenzen:', error);
	}
}

/**
 * Togglet eine Kompetenz im Fokus
 * @param {string} kompetenzId
 * @returns {string[]} Aktualisierte Fokus-Liste
 */
export function toggleFocus(kompetenzId) {
	const fokus = loadFocusKompetenzen();
	const index = fokus.indexOf(kompetenzId);

	if (index >= 0) {
		fokus.splice(index, 1);
	} else {
		fokus.push(kompetenzId);
	}

	saveFocusKompetenzen(fokus);
	return fokus;
}

/**
 * Berechnet die Veränderung seit dem letzten Assessment
 * @param {string} teamId
 * @returns {Map<string, number>} Kompetenz-ID -> Veränderung
 */
export function calculateChanges(teamId) {
	const history = loadAssessmentHistory();
	const teamHistory = history.filter((entry) => entry.teamId === teamId);

	if (teamHistory.length < 2) {
		return new Map();
	}

	const latest = teamHistory[teamHistory.length - 1];
	const previous = teamHistory[teamHistory.length - 2];

	const changes = new Map();

	for (const bewertung of latest.bewertungen) {
		const prevBewertung = previous.bewertungen.find((b) => b.kompetenzId === bewertung.kompetenzId);
		if (prevBewertung) {
			changes.set(bewertung.kompetenzId, bewertung.wert - prevBewertung.wert);
		}
	}

	return changes;
}

/**
 * Holt das letzte Assessment für ein Team
 * @param {string} teamId
 * @returns {AssessmentEntry | null}
 */
export function getLatestAssessment(teamId) {
	const history = loadAssessmentHistory();
	const teamHistory = history.filter((entry) => entry.teamId === teamId);

	if (teamHistory.length === 0) return null;

	return teamHistory[teamHistory.length - 1];
}

/**
 * Exportiert die History als JSON-Download
 */
export function exportHistory() {
	if (typeof window === 'undefined') return;

	const history = loadAssessmentHistory();
	const dataStr = JSON.stringify(history, null, 2);
	const blob = new Blob([dataStr], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = `kompetenzraster-${new Date().toISOString().split('T')[0]}.json`;
	link.click();

	URL.revokeObjectURL(url);
}

/**
 * Lädt die gespeicherte Fremdeinschätzung für ein Team
 * @param {string} teamId
 * @returns {Object | null}
 */
export function loadFremdeinschaetzung(teamId) {
	if (typeof window === 'undefined') return null;
	try {
		const data = localStorage.getItem(FREMD_KEY);
		if (!data) return null;

		const fremdData = JSON.parse(data);
		return fremdData.teamId === teamId ? fremdData : null;
	} catch (error) {
		console.error('Failed to load fremdeinschätzung:', error);
		return null;
	}
}

/**
 * Speichert eine Fremdeinschätzung (überschreibt die vorherige)
 * @param {string} teamId
 * @param {Object} bewertungen
 * @param {string} datum
 */
export function saveFremdeinschaetzung(teamId, bewertungen, datum) {
	if (typeof window === 'undefined') return;
	try {
		const data = {
			teamId,
			datum,
			bewertungen,
		};
		localStorage.setItem(FREMD_KEY, JSON.stringify(data));
	} catch (error) {
		console.error('Failed to save fremdeinschätzung:', error);
	}
}

/**
 * Löscht die Fremdeinschätzung
 */
export function clearFremdeinschaetzung() {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(FREMD_KEY);
	} catch (error) {
		console.error('Failed to clear fremdeinschätzung:', error);
	}
}
