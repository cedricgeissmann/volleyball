import { error } from '@sveltejs/kit';
import { loadRolleByIdWithFallback, loadRollen } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
	// Load all roles for both languages
	const deRollen = await loadRollen('de');
	
	// Generate entries for all role/language combinations
	const entries = [];
	
	// Add entries for both languages (fallback to German if EN not available)
	for (const rolle of deRollen) {
		entries.push({ lang: 'de', rolleId: rolle.id });
		entries.push({ lang: 'en', rolleId: rolle.id });
	}
	
	return entries;
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { rolleId, lang } = params;
	const { item: rolle, isFallback } = await loadRolleByIdWithFallback(rolleId, lang);

	if (!rolle) {
		throw error(404, 'Rolle nicht gefunden');
	}

	return {
		rolle,
		isFallback,
		lang,
	};
}
