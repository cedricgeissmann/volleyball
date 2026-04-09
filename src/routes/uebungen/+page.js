import { loadUebungen } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const uebungen = await loadUebungen();
	return {
		uebungen,
	};
}
