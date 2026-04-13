import { register, init } from 'svelte-i18n';

import de from './translations/de.json';
import en from './translations/en.json';

// Register translations
register('de', () => Promise.resolve(de));
register('en', () => Promise.resolve(en));

// Initialize i18n
export function initI18n(initialLocale = 'de') {
	init({
		fallbackLocale: 'de',
		initialLocale,
	});
}

export { _, locale, t } from 'svelte-i18n';
