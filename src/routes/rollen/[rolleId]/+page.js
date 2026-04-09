import { loadRollen } from '$lib/utils/contentLoader.js';
import { getRollenRoutes } from '$lib/utils/routes.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const rollen = await loadRollen();
	const rolle = rollen.find((r) => r.id === params.rolleId);

	if (!rolle) {
		throw error(404, 'Rolle nicht gefunden');
	}

	return {
		rolle,
	};
}

/** @type {import('./$types').EntryGenerator} */
export function entries() {
	return getRollenRoutes();
}

export const prerender = true;
