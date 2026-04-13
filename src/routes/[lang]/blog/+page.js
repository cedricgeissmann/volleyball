import { getAllBlogPostsWithFallback } from '$lib/utils/blogLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const { items: posts, isFallback } = await getAllBlogPostsWithFallback(lang);
	
	return {
		posts,
		isFallback,
		lang,
	};
}

// Aktiviere prerendering für die Blog-Übersicht
export const prerender = true;
