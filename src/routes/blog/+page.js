import { getAllBlogPosts } from '$lib/utils/blogLoader.js';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const posts = await getAllBlogPosts();
	
	return {
		posts
	};
}

// Aktiviere prerendering für die Blog-Übersicht
export const prerender = true;
