import { loadTeamById } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { teamId, lang } = params;
	const team = await loadTeamById(teamId, lang);

	if (!team) {
		return {
			status: 404,
			error: new Error('Team nicht gefunden'),
		};
	}

	return {
		team,
	};
}
