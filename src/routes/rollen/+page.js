import { loadRollen } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const rollen = await loadRollen();
	return {
		rollen,
	};
}
