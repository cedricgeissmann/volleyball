const STORAGE_KEY = 'tv-muttenz-planner-selection';

/**
 * @typedef {Object} PlannerItem
 * @property {'uebung'|'rolle'} type - Item-Typ
 * @property {string} id - Item-ID
 */

/**
 * Speichert die Planner-Auswahl im LocalStorage
 * @param {PlannerItem[]} items - Ausgewählte Items
 */
export function savePlannerSelection(items) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch (error) {
		console.error('Failed to save planner selection:', error);
	}
}

/**
 * Lädt die Planner-Auswahl aus dem LocalStorage
 * @returns {PlannerItem[]} Gespeicherte Items
 */
export function loadPlannerSelection() {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch (error) {
		console.error('Failed to load planner selection:', error);
		return [];
	}
}

/**
 * Löscht die Planner-Auswahl aus dem LocalStorage
 */
export function clearPlannerSelection() {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		console.error('Failed to clear planner selection:', error);
	}
}
