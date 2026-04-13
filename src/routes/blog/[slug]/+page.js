import { error } from '@sveltejs/kit';
import { getBlogPostBySlug, getBlogPostSlugs } from '$lib/utils/blogLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	try {
		const post = await getBlogPostBySlug(params.slug);
		
		return {
			post
		};
	} catch (e) {
		throw error(404, {
			message: `Blog-Post "${params.slug}" nicht gefunden`
		});
	}
}

/**
 * Generiert alle möglichen Routen für Static Site Generation
 * @returns {Promise<Array<{slug: string}>>}
 */
export async function entries() {
	const slugs = await getBlogPostSlugs();
	return slugs.map(slug => ({ slug }));
}

// Aktiviere prerendering für statische Blog-Posts
export const prerender = true;
