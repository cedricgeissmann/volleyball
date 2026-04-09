import { loadTeams, loadUebungen, loadRollen } from './contentLoader.js';

/**
 * Generiert Team-Routes für SSG
 * @returns {Promise<Array<{teamId: string}>>}
 */
export async function getTeamRoutes() {
	const teams = await loadTeams();
	return teams.map((team) => ({ teamId: team.id }));
}

/**
 * Generiert Übungs-Routes für SSG
 * @returns {Promise<Array<{id: string}>>}
 */
export async function getUebungRoutes() {
	const uebungen = await loadUebungen();
	return uebungen.map((uebung) => ({ id: uebung.id }));
}

/**
 * Generiert Rollen-Routes für SSG
 * @returns {Promise<Array<{id: string}>>}
 */
export async function getRollenRoutes() {
	const rollen = await loadRollen();
	return rollen.map((rolle) => ({ id: rolle.id }));
}

/**
 * Generiert Blog-Routes für SSG
 * @returns {Promise<Array<{slug: string}>>}
 */
export async function getBlogRoutes() {
	const modules = import.meta.glob('/src/content/blog/*.{svx,md}');
	const slugs = Object.keys(modules)
		.map((path) => {
			const match = path.match(/\/([^/]+)\.(svx|md)$/);
			return match ? { slug: match[1] } : null;
		})
		.filter(/** @param {any} item */ (item) => item !== null);

	return /** @type {{slug: string}[]} */ (slugs);
}
