import { loadUebungen } from '$lib/utils/contentLoader.js';
import { getUebungRoutes } from '$lib/utils/routes.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const uebungen = await loadUebungen();
	const uebung = uebungen.find((u) => u.id === params.uebungId);

	if (!uebung) {
		throw error(404, 'Übung nicht gefunden');
	}

	return {
		uebung,
	};
}

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return getUebungRoutes();
}

export const prerender = true;
