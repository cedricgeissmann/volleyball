import { error } from '@sveltejs/kit';
import { loadUebungById, loadAnimation, loadUebungen } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
	// Load all exercises for both languages
	const deUebungen = await loadUebungen('de');
	
	// Generate entries for all exercise/language combinations
	const entries = [];
	
	// Add entries for both languages
	for (const uebung of deUebungen) {
		entries.push({ lang: 'de', uebungId: uebung.id });
		entries.push({ lang: 'en', uebungId: uebung.id });
	}
	
	return entries;
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { uebungId, lang } = params;
	const uebung = await loadUebungById(uebungId, lang);

	if (!uebung) {
		throw error(404, 'Übung nicht gefunden');
	}

	// Load animation if available
	let animationData = null;
	if (uebung.animation) {
		animationData = await loadAnimation(uebung.animation);
	}

	return {
		uebung: {
			...uebung,
			animationData,
		},
	};
}
