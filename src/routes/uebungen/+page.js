import { loadUebungen, loadAnimation } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const uebungen = await loadUebungen();
	
	// Lade Animationen für Übungen mit animation-Property
	const uebungenMitAnimationen = await Promise.all(
		uebungen.map(async (uebung) => {
			if (uebung.animation) {
				const animationData = await loadAnimation(uebung.animation);
				return { ...uebung, animationData };
			}
			return uebung;
		})
	);
	
	return {
		uebungen: uebungenMitAnimationen,
	};
}
