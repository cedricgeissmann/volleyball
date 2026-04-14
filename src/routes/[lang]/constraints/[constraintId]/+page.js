import { error } from '@sveltejs/kit';
import { loadConstraintByIdWithFallback, loadConstraints } from '$lib/utils/contentLoader.js';

export const prerender = true;

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
	const deConstraints = await loadConstraints('de');

	const entries = [];

	for (const constraint of deConstraints) {
		entries.push({ lang: 'de', constraintId: constraint.id });
		entries.push({ lang: 'en', constraintId: constraint.id });
	}

	return entries;
}

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { constraintId, lang } = params;
	const { item: constraint, isFallback } = await loadConstraintByIdWithFallback(constraintId, lang);

	if (!constraint) {
		throw error(404, 'Constraint nicht gefunden');
	}

	return {
		constraint,
		isFallback,
		lang,
	};
}
