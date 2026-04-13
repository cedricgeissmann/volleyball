import { error } from '@sveltejs/kit';
import { loadTeamByIdWithFallback, loadTeams } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
	// Load all teams for both languages
	const deTeams = await loadTeams('de');
	
	// Generate entries for all team/language combinations
	const entries = [];
	
	// Add entries for both languages
	for (const team of deTeams) {
		entries.push({ lang: 'de', teamId: team.id });
		entries.push({ lang: 'en', teamId: team.id });
	}
	
	return entries;
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { teamId, lang } = params;
	const { item: team, isFallback } = await loadTeamByIdWithFallback(teamId, lang);

	if (!team) {
		throw error(404, 'Team nicht gefunden');
	}

	return {
		team,
		isFallback,
		lang,
	};
}
