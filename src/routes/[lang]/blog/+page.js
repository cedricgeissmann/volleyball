import { getAllBlogPosts } from '$lib/utils/blogLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const { lang } = params;
	const posts = await getAllBlogPosts(lang);
	
	return {
		posts
	};
}

// Aktiviere prerendering für die Blog-Übersicht
export const prerender = true;
