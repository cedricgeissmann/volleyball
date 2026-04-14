import { loadTaktikUebungenWithFallback, loadAnimation } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return [
		{ lang: 'de' },
		{ lang: 'en' }
	];
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const { items: uebungen, isFallback } = await loadTaktikUebungenWithFallback(lang);

	// Animationsdaten parallel laden
	const uebungenMitAnimation = await Promise.all(
		uebungen.map(async (/** @type {any} */ uebung) => {
			if (uebung.animation) {
				const animationData = await loadAnimation(uebung.animation);
				return { ...uebung, animationData };
			}
			return uebung;
		})
	);

	return {
		uebungen: uebungenMitAnimation,
		isFallback,
		lang,
	};
}
