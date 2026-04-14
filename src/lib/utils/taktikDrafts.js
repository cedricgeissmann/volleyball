/**
 * localStorage-Verwaltung für Taktikboard-Entwürfe.
 *
 * Konzept:
 * - Jeder Entwurf hat eine eindeutige UUID als Key
 * - Ein Entwurf kann "von" einer bestehenden Übung geforkt sein (sourceId)
 * - Mehrere Entwürfe werden im localStorage gehalten (keine automatische Bereinigung)
 * - Der Nutzer kann Entwürfe explizit löschen
 */

const STORAGE_KEY = 'tv-muttenz-taktik-drafts';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TaktikDraftMeta
 * @property {string} [beschreibung] - Kurzbeschreibung der Übung
 * @property {string} [fokus] - Fokus-Bereich (z.B. "Block & Verteidigung")
 * @property {string} [kategorie] - Kategorie (z.B. "Taktik")
 * @property {string[]} [ziele] - Lernziele
 * @property {string[]} [anleitung] - Schritt-für-Schritt Anleitung
 * @property {number} [dauer] - Dauer in Minuten
 */

/**
 * @typedef {Object} TaktikDraft
 * @property {string} id - Eindeutige UUID des Entwurfs
 * @property {string} titel - Titel (aus animation.beschreibung oder manuell gesetzt)
 * @property {string|null} sourceId - ID der Ursprungs-Übung (null = neu)
 * @property {string|null} sourceTitel - Titel der Ursprungs-Übung (für Anzeige)
 * @property {import('./taktikEngine.js').TaktikAnimation} animation - Animationsdaten
 * @property {number} createdAt - Unix-Timestamp (ms) der Erstellung
 * @property {number} updatedAt - Unix-Timestamp (ms) der letzten Änderung
 * @property {string} [beschreibung] - Kurzbeschreibung der Übung
 * @property {string} [fokus] - Fokus-Bereich
 * @property {string} [kategorie] - Kategorie
 * @property {string[]} [ziele] - Lernziele
 * @property {string[]} [anleitung] - Schritt-für-Schritt Anleitung
 * @property {number} [dauer] - Dauer in Minuten
 */

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/**
 * Erzeugt eine einfache UUID (ohne externe Bibliothek)
 * @returns {string}
 */
function generateId() {
	return (
		Date.now().toString(36) +
		'-' +
		Math.random().toString(36).substring(2, 8)
	);
}

/**
 * Liest alle Entwürfe aus dem localStorage
 * @returns {TaktikDraft[]}
 */
export function loadAllDrafts() {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}

/**
 * Schreibt alle Entwürfe in den localStorage
 * @param {TaktikDraft[]} drafts
 */
function saveAllDrafts(drafts) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Speichert einen Entwurf (neu oder aktualisiert).
 * Wenn id angegeben und bereits vorhanden → updatedAt wird gesetzt.
 * Wenn id nicht vorhanden → neuer Entwurf wird erstellt.
 *
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @param {object} [meta]
 * @param {string} [meta.id] - Vorhandene ID (für Update)
 * @param {string} [meta.titel] - Titel-Override
 * @param {string|null} [meta.sourceId] - Ursprungs-Übungs-ID
 * @param {string|null} [meta.sourceTitel] - Ursprungs-Übungs-Titel
 * @param {string} [meta.beschreibung]
 * @param {string} [meta.fokus]
 * @param {string} [meta.kategorie]
 * @param {string[]} [meta.ziele]
 * @param {string[]} [meta.anleitung]
 * @param {number} [meta.dauer]
 * @returns {TaktikDraft} Der gespeicherte Entwurf
 */
export function saveDraft(animation, meta = {}) {
	const drafts = loadAllDrafts();
	const now = Date.now();

	const titel =
		meta.titel ||
		animation.beschreibung ||
		'Unbenannter Entwurf';

	// Update?
	if (meta.id) {
		const idx = drafts.findIndex((d) => d.id === meta.id);
		if (idx !== -1) {
			const updated = {
				...drafts[idx],
				titel,
				animation: JSON.parse(JSON.stringify(animation)), // deep clone
				updatedAt: now,
				beschreibung: meta.beschreibung ?? drafts[idx].beschreibung,
				fokus: meta.fokus ?? drafts[idx].fokus,
				kategorie: meta.kategorie ?? drafts[idx].kategorie,
				ziele: meta.ziele ?? drafts[idx].ziele,
				anleitung: meta.anleitung ?? drafts[idx].anleitung,
				dauer: meta.dauer ?? drafts[idx].dauer,
			};
			drafts[idx] = updated;
			saveAllDrafts(drafts);
			return updated;
		}
	}

	// Neu
	const draft = /** @type {TaktikDraft} */ ({
		id: generateId(),
		titel,
		sourceId: meta.sourceId ?? null,
		sourceTitel: meta.sourceTitel ?? null,
		animation: JSON.parse(JSON.stringify(animation)),
		createdAt: now,
		updatedAt: now,
		beschreibung: meta.beschreibung ?? '',
		fokus: meta.fokus ?? '',
		kategorie: meta.kategorie ?? 'Taktik',
		ziele: meta.ziele ?? [],
		anleitung: meta.anleitung ?? [],
		dauer: meta.dauer ?? undefined,
	});

	drafts.unshift(draft); // Neueste zuerst
	saveAllDrafts(drafts);
	return draft;
}

/**
 * Lädt einen einzelnen Entwurf per ID
 * @param {string} id
 * @returns {TaktikDraft|null}
 */
export function loadDraft(id) {
	return loadAllDrafts().find((d) => d.id === id) ?? null;
}

/**
 * Löscht einen Entwurf per ID
 * @param {string} id
 */
export function deleteDraft(id) {
	const drafts = loadAllDrafts().filter((d) => d.id !== id);
	saveAllDrafts(drafts);
}

/**
 * Erstellt einen Fork einer bestehenden Übung als neuen Entwurf.
 * @param {import('./taktikEngine.js').TaktikAnimation} animation
 * @param {string} sourceId
 * @param {string} sourceTitel
 * @returns {TaktikDraft}
 */
export function forkAnimation(animation, sourceId, sourceTitel) {
	return saveDraft(animation, {
		titel: `${sourceTitel} (Entwurf)`,
		sourceId,
		sourceTitel,
	});
}

/**
 * Gibt Metadaten aller Entwürfe zurück (ohne die grossen Animationsdaten)
 * @returns {Omit<TaktikDraft, 'animation'>[]}
 */
export function listDraftsMeta() {
	return loadAllDrafts().map(({ animation: _, ...meta }) => meta);
}

/**
 * Formatiert einen Timestamp als lesbares Datum
 * @param {number} ts
 * @returns {string}
 */
export function formatDraftDate(ts) {
	return new Date(ts).toLocaleDateString('de-CH', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/**
 * Erzeugt einen YAML-String aus einem Draft (für den Export).
 * Kein externes YAML-Package nötig – einfache Serialisierung.
 * @param {TaktikDraft} draft
 * @returns {string}
 */
export function draftToYaml(draft) {
	const slug = draft.titel
		.toLowerCase()
		.replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'entwurf';

	const animFilename = `${slug}.taktik.json`;

	/** @param {string} s */
	const yamlStr = (s) => {
		if (!s) return "''";
		// Multiline oder Sonderzeichen → quoted
		if (s.includes('\n') || s.includes(':') || s.includes('#') || s.startsWith(' ')) {
			return `"${s.replace(/"/g, '\\"')}"`;
		}
		return s;
	};

	const lines = [
		`id: ${slug}`,
		`typ: taktik`,
		`titel: ${yamlStr(draft.titel)}`,
	];

	if (draft.beschreibung) lines.push(`beschreibung: ${yamlStr(draft.beschreibung)}`);
	lines.push(`kategorie: ${yamlStr(draft.kategorie || 'Taktik')}`);
	if (draft.dauer) lines.push(`dauer: ${draft.dauer}`);
	if (draft.fokus) lines.push(`fokus: ${yamlStr(draft.fokus)}`);

	if (draft.ziele && draft.ziele.length > 0) {
		lines.push('ziele:');
		draft.ziele.forEach((z) => lines.push(`  - ${yamlStr(z)}`));
	}

	lines.push(`animation: ${animFilename}`);

	if (draft.anleitung && draft.anleitung.length > 0) {
		lines.push('anleitung:');
		draft.anleitung.forEach((a) => lines.push(`  - ${yamlStr(a)}`));
	}

	return lines.join('\n') + '\n';
}
