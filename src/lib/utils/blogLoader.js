import { error } from '@sveltejs/kit';
import { base } from '$app/paths';

/**
 * Blog-Post Loader Utilities
 * 
 * Diese Funktionen laden Blog-Posts aus dem /src/content/blog/ Verzeichnis
 * und verarbeiten sie für die Anzeige auf der Website.
 */

/**
 * Lädt alle Blog-Posts mit Metadaten für eine Locale
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Array>} Array von Blog-Posts mit Metadaten
 */
export async function getAllBlogPosts(locale = 'de') {
	// Dynamisches Import aller .md und .svx Dateien aus dem blog Verzeichnis
	const modules = import.meta.glob('/src/content/blog/**/*.{md,svx}', { eager: true });
	
	const posts = [];
	
	for (const [path, module] of Object.entries(modules)) {
		// Überspringe README.txt
		if (path.includes('README')) continue;
		
		// Prüfe ob der Pfad zur gewünschten Locale gehört
		if (!path.includes(`/blog/${locale}/`)) {
			continue;
		}
		
		// Extrahiere den Slug aus dem Dateipfad
		const slug = path.split('/').pop().replace(/\.(md|svx)$/, '');
		
		// Sammle Metadaten und Content
		if (module.metadata) {
			posts.push({
				slug,
				...module.metadata,
				// Füge den Content-Component hinzu, falls benötigt
				component: module.default
			});
		}
	}
	
	// Sortiere nach Datum (neueste zuerst)
	posts.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		return dateB - dateA;
	});
	
	// Filtere nur veröffentlichte Posts
	const filteredPosts = posts.filter(post => post.published !== false);
	
	// Fallback zu Deutsch wenn keine Posts gefunden
	if (filteredPosts.length === 0 && locale !== 'de') {
		return getAllBlogPosts('de');
	}
	
	return filteredPosts;
}

/**
 * Lädt alle Blog-Posts mit isFallback-Flag
 * @param {string} [locale='de']
 * @returns {Promise<{items: Array, isFallback: boolean}>}
 */
export async function getAllBlogPostsWithFallback(locale = 'de') {
	const items = await getAllBlogPosts(locale);
	if (locale !== 'de') {
		const modules = import.meta.glob('/src/content/blog/**/*.{md,svx}', { eager: true });
		const hasLocale = Object.keys(modules).some((p) => p.includes(`/blog/${locale}/`) && !p.includes('README'));
		return { items, isFallback: !hasLocale };
	}
	return { items, isFallback: false };
}

/**
 * Lädt einen spezifischen Blog-Post basierend auf dem Slug für eine Locale
 * @param {string} slug - Der URL-Slug des Blog-Posts
 * @param {string} [locale='de'] - Sprache (de oder en)
 * @returns {Promise<Object>} Blog-Post Objekt mit Metadaten und Component
 */
export async function getBlogPostBySlug(slug, locale = 'de') {
	try {
		// Versuche .md Datei zu laden
		let post;
		try {
			post = await import(`../../content/blog/${locale}/${slug}.md`);
		} catch (e) {
			// Falls .md nicht existiert, versuche .svx
			try {
				post = await import(`../../content/blog/${locale}/${slug}.svx`);
			} catch (e2) {
				// Fallback zu Deutsch
				if (locale !== 'de') {
					return getBlogPostBySlug(slug, 'de');
				}
				throw e2;
			}
		}
		
		if (!post) {
			throw error(404, `Blog-Post "${slug}" nicht gefunden`);
		}
		
		// Prüfe ob der Post veröffentlicht ist
		if (post.metadata && post.metadata.published === false) {
			throw error(404, `Blog-Post "${slug}" ist nicht veröffentlicht`);
		}
		
		return {
			slug,
			metadata: post.metadata,
			component: post.default
		};
	} catch (e) {
		throw error(404, `Blog-Post "${slug}" nicht gefunden`);
	}
}

/**
 * Lädt einen Blog-Post nach Slug, mit isFallback-Flag
 * @param {string} slug
 * @param {string} [locale='de']
 * @returns {Promise<{item: Object, isFallback: boolean}>}
 */
export async function getBlogPostBySlugWithFallback(slug, locale = 'de') {
	if (locale !== 'de') {
		try {
			let post;
			try {
				post = await import(`../../content/blog/${locale}/${slug}.md`);
			} catch {
				post = await import(`../../content/blog/${locale}/${slug}.svx`);
			}
			return {
				item: { slug, metadata: post.metadata, component: post.default },
				isFallback: false
			};
		} catch {
			const item = await getBlogPostBySlug(slug, 'de');
			return { item, isFallback: true };
		}
	}
	const item = await getBlogPostBySlug(slug, locale);
	return { item, isFallback: false };
}

/**
 * Gibt alle Blog-Post Slugs zurück (für Static Site Generation)
 * @returns {Promise<Array<string>>} Array von Slugs
 */
export async function getBlogPostSlugs() {
	const posts = await getAllBlogPosts();
	return posts.map(post => post.slug);
}

/**
 * Generiert alle Blog-Routes für SvelteKit prerender
 * @returns {Promise<Array<string>>} Array von Blog-Post URLs
 */
export async function getBlogRoutes() {
	const slugs = await getBlogPostSlugs();
	return slugs.map(slug => `${base}/blog/${slug}`);
}
