import { loadConstraintsWithFallback } from '$lib/utils/contentLoader.js';

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
	const { items: constraints, isFallback } = await loadConstraintsWithFallback(lang);
	return {
		constraints,
		isFallback,
		lang,
	};
}
