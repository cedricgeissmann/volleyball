<svelte:options runes={false} />

<script>
	// MDSvex compatibility wrapper - runes mode disabled
	import BlogLayout from './BlogLayout.svelte';
	
	export let title = '';
	export let date = '';
	export let author = '';
	export let tags = [];
	export let excerpt = '';
</script>

<BlogLayout {title} {date} {author} {tags} {excerpt}>
	<slot />
</BlogLayout>
