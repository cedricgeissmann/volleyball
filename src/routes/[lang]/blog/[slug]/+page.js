import { error } from '@sveltejs/kit';
import { getBlogPostBySlug, getBlogPostSlugs } from '$lib/utils/blogLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { slug, lang } = params;
	try {
		const post = await getBlogPostBySlug(slug, lang);
		
		return {
			post
		};
	} catch (e) {
		throw error(404, {
			message: `Blog-Post "${slug}" nicht gefunden`
		});
	}
}

/**
 * Generiert alle möglichen Routen für Static Site Generation
 * @returns {Promise<Array<{lang: string, slug: string}>>}
 */
export async function entries() {
	const slugs = await getBlogPostSlugs();
	const languages = ['de', 'en'];
	const entries = [];
	
	for (const lang of languages) {
		for (const slug of slugs) {
			entries.push({ lang, slug });
		}
	}
	
	return entries;
}

// Aktiviere prerendering für statische Blog-Posts
export const prerender = true;
