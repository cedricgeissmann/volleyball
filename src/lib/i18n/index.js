import { register, init, waitLocale } from 'svelte-i18n';

import de from './translations/de.json';
import en from './translations/en.json';

// Register translations synchronously
register('de', () => Promise.resolve(de));
register('en', () => Promise.resolve(en));

let isInitialized = false;

// Initialize i18n
export async function initI18n(initialLocale = 'de') {
	if (!isInitialized) {
		init({
			fallbackLocale: 'de',
			initialLocale,
		});
		isInitialized = true;
	}
	// Wait for locale to be loaded
	await waitLocale(initialLocale);
}

export { _, locale, t } from 'svelte-i18n';
