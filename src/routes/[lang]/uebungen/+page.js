import { loadUebungen } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const uebungen = await loadUebungen(lang);
	return {
		uebungen,
	};
}
