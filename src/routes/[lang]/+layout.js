import { redirect } from '@sveltejs/kit';
import { initI18n } from '$lib/i18n';

const availableLanguages = ['de', 'en'];
const defaultLanguage = 'de';

/**
 * @param {Object} params
 * @param {string} params.lang
 * @param {Object} url
 */
export async function load({ params, url }) {
	const lang = params.lang;

	// Validate language tag
	if (!availableLanguages.includes(lang)) {
		// Redirect to default language (de) if invalid
		const newPath = url.pathname.replace(`/${lang}`, `/${defaultLanguage}`);
		throw redirect(307, newPath);
	}

	// Initialize i18n for server-side rendering
	await initI18n(lang);

	return {
		lang,
	};
}
