import { loadTeams } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').PageLoad} */
export async function load() {
	const teams = await loadTeams();

	return {
		teams,
	};
}
