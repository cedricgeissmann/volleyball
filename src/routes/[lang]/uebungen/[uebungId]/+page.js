import { loadUebungById, loadAnimation } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { uebungId, lang } = params;
	const uebung = await loadUebungById(uebungId, lang);

	if (!uebung) {
		return {
			status: 404,
			error: new Error('Übung nicht gefunden'),
		};
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
