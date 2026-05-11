/**
 * Erstellt einen persistierten $state-Wert der im localStorage gespeichert wird.
 * SSR-safe: localStorage wird nur im Browser verwendet.
 *
 * @template T
 * @param {string} key        - localStorage-Schlüssel
 * @param {T}      defaultVal - Standardwert falls kein gespeicherter Wert vorhanden
 * @returns {{ value: T }}
 */
export function persisted(key, defaultVal) {
	// Initialwert aus localStorage lesen (nur im Browser)
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
	let initial = defaultVal;
	if (stored !== null) {
		try { initial = JSON.parse(stored); } catch { /* ungültiger Wert → Default */ }
	}

	let value = $state(initial);

	// Bei Änderung in localStorage schreiben
	$effect(() => {
		try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota etc. */ }
	});

	return {
		get value() { return value; },
		set value(v) { value = v; },
	};
}
