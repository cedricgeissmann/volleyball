import { loadTeams } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const teams = await loadTeams(lang);
	return {
		teams,
	};
}
