<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.post.metadata.title} - VC Damen Pfungen</title>
	{#if data.post.metadata.description}
		<meta name="description" content={data.post.metadata.description} />
	{/if}
</svelte:head>

<data.post.component />
