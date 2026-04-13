import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-static';
import mdsvexConfig from './mdsvex.config.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries and mdsvex files
		runes: ({ filename }) => {
			const parts = filename.split(/[/\\]/);
			// Disable runes for node_modules
			if (parts.includes('node_modules')) return undefined;
			// Disable runes for .md and .svx files (MDSvex compatibility)
			if (filename.endsWith('.md') || filename.endsWith('.svx')) return false;
			// Enable runes for everything else
			return true;
		},
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true,
		}),
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/volleyball' : '',
		},
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			entries: ['*'],
		},
	},
	preprocess: [mdsvex(mdsvexConfig)],
	extensions: ['.svelte', '.svx', '.md'],
};

export default config;
