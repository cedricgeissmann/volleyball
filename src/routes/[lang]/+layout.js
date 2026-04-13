import { redirect } from '@sveltejs/kit';

const availableLanguages = ['de', 'en'];
const defaultLanguage = 'de';

/**
 * @param {Object} params
 * @param {string} params.lang
 * @param {Object} url
 */
export function load({ params, url }) {
	const lang = params.lang;

	// Validate language tag
	if (!availableLanguages.includes(lang)) {
		// Redirect to default language (de) if invalid
		const newPath = url.pathname.replace(`/${lang}`, `/${defaultLanguage}`);
		throw redirect(307, newPath);
	}

	return {
		lang,
	};
}
