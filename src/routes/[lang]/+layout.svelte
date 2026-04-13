<script>
	import '$lib/styles/global.css';
	import '$lib/styles/print.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { locale } from 'svelte-i18n';

	let { children, data } = $props();

	// Set the locale from the route parameter
	// i18n is already initialized in +layout.js
	$effect(() => {
		if (data?.lang) {
			locale.set(data.lang);
			// Set the html lang attribute correctly
			document.documentElement.lang = data.lang;
		}
	});
</script>

<div class="app">
	<Header />

	<main class="main-content">
		{@render children()}
	</main>

	<Footer />
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
