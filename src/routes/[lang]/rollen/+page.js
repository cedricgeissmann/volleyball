import { loadRollen } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const rollen = await loadRollen(lang);
	return {
		rollen,
	};
}
