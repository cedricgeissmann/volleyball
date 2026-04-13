import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
	extensions: ['.svx', '.md'],
	layout: resolve(__dirname, 'src/lib/components/blog/BlogLayoutWrapper.svelte'),
	smartypants: {
		dashes: 'oldschool',
	},
	remarkPlugins: [],
	rehypePlugins: [],
};
