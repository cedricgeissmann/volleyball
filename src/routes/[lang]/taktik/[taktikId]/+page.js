import { loadTaktikUebungByIdWithFallback, loadAnimation } from '$lib/utils/contentLoader.js';
import { error } from '@sveltejs/kit';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return [
		{ lang: 'de', taktikId: 'W-aufstellung' },
		{ lang: 'en', taktikId: 'W-aufstellung' },
		{ lang: 'de', taktikId: 'doppelblock' },
		{ lang: 'en', taktikId: 'doppelblock' },
	];
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang, taktikId } = params;
	const { item: uebung, isFallback } = await loadTaktikUebungByIdWithFallback(taktikId, lang);

	if (!uebung) {
		error(404, `Taktik-Übung "${taktikId}" nicht gefunden`);
	}

	let animationData = null;
	if (uebung.animation) {
		animationData = await loadAnimation(uebung.animation);
	}

	return {
		uebung,
		animationData,
		isFallback,
		lang,
	};
}
