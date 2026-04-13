<script>
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.post.metadata.title} - VC Damen Pfungen</title>
	{#if data.post.metadata.description}
		<meta name="description" content={data.post.metadata.description} />
	{/if}
</svelte:head>

<TranslationFallbackBanner lang={data.lang} isFallback={data.isFallback} />

<data.post.component />
