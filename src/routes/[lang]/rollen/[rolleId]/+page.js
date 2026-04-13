import { loadRolleById } from '$lib/utils/contentLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { rolleId, lang } = params;
	const rolle = await loadRolleById(rolleId, lang);

	if (!rolle) {
		return {
			status: 404,
			error: new Error('Rolle nicht gefunden'),
		};
	}

	return {
		rolle,
	};
}
