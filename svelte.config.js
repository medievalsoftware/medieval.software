import adapter from 'svelte-adapter-bun';
import { vitePreprocess } from '@sveltejs/kit/vite';
import { mdsvex } from 'mdsvex';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	kit: {
		adapter: adapter()
	},
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md']
		})
	],
};

export default config;
