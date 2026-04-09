import { loadTeams } from '$lib/utils/contentLoader.js';
import { getTeamRoutes } from '$lib/utils/routes.js';
import { error } from '@sveltejs/kit';

export const prerender = true;

export const entries = getTeamRoutes;

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const teams = await loadTeams();
	const team = teams.find((t) => t.id === params.teamId);

	if (!team) {
		throw error(404, 'Team nicht gefunden');
	}

	return {
		team,
	};
}
