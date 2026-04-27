<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	// Frontmatter-Props von mdsvex
	let { title = '', date = '', author = '', tags = [], excerpt = '', children } = $props();

	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});
</script>

<article class="blog-post">
	<nav class="back-nav">
		<a href="{base}/{currentLang}/blog">← {$_('btn_back_to_overview')}</a>
	</nav>
	
	<header>
		<h1>{title}</h1>
		{#if date || author}
			<div class="meta">
				{#if date}
					<time datetime={date}>{new Date(date).toLocaleDateString('de-DE')}</time>
				{/if}
				{#if author}
					<span class="author">{$_('form_from')} {author}</span>
				{/if}
			</div>
		{/if}
		{#if tags && tags.length > 0}
			<div class="tags">
				{#each tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		{/if}
	</header>

	<div class="content">
		{@render children()}
	</div>
</article>

<style>
	.blog-post {
		max-width: 800px;
		margin-inline: auto;
		padding: var(--space-xl);
	}

	.back-nav {
		margin-block-end: var(--space-lg);
	}

	.back-nav a {
		color: var(--color-primary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: color 0.2s;
	}

	.back-nav a:hover {
		color: var(--color-secondary);
		text-decoration: underline;
	}

	.blog-post h1 {
		color: var(--color-primary);
		margin-block-start: 0;
	}

	.meta {
		display: flex;
		gap: var(--space-md);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-block: var(--space-md);
	}

	.tags {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
		margin-block: var(--space-md);
	}

	.tag {
		background: var(--color-primary);
		color: var(--color-text-inverse);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	.content {
		line-height: 1.7;
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word;
		hyphens: auto;
	}

	.content :global(h1),
	.content :global(h2),
	.content :global(h3),
	.content :global(h4),
	.content :global(h5),
	.content :global(h6) {
		overflow-wrap: break-word;
		word-wrap: break-word;
	}

	.content :global(h2) {
		margin-block-start: var(--space-2xl);
		color: var(--color-secondary);
	}

	.content :global(h3) {
		margin-block-start: var(--space-xl);
		color: var(--color-secondary);
	}

	.content :global(p) {
		margin-block: var(--space-md);
		text-align: justify;
	}

	.content :global(ul),
	.content :global(ol) {
		margin-block: var(--space-md);
		padding-left: var(--space-xl);
	}

	.content :global(li) {
		margin-block: var(--space-sm);
	}

	.content :global(code) {
		background: var(--color-gray-100);
		padding: 0.2em 0.4em;
		border-radius: var(--radius-sm);
		font-family: var(--font-family-mono);
		font-size: 0.9em;
		color: var(--color-primary);
	}

	.content :global(pre) {
		background: var(--color-gray-100);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin-block: var(--space-lg);
	}

	.content :global(pre code) {
		background: none;
		padding: 0;
		color: inherit;
	}

	.content :global(blockquote) {
		border-left: 4px solid var(--color-primary);
		padding-left: var(--space-md);
		margin-left: 0;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-block: var(--space-lg);
		font-size: var(--font-size-sm);
		overflow-x: auto;
		display: block;
	}

	.content :global(th),
	.content :global(td) {
		padding: var(--space-sm);
		text-align: left;
		border: 1px solid var(--color-gray-200);
	}

	.content :global(th) {
		background: var(--color-gray-100);
		font-weight: var(--font-weight-medium);
	}

	.content :global(img) {
		max-width: 100%;
		height: auto;
	}

	@media (max-width: 768px) {
		.blog-post {
			padding: var(--space-md);
		}

		.blog-post h1 {
			font-size: 1.75rem;
			line-height: 1.2;
		}

		.content :global(h2) {
			font-size: 1.5rem;
			margin-block-start: var(--space-xl);
		}

		.content :global(h3) {
			font-size: 1.25rem;
			margin-block-start: var(--space-lg);
		}

		.content :global(table) {
			font-size: 0.85rem;
		}

		.content :global(th),
		.content :global(td) {
			padding: var(--space-xs);
		}

		.content :global(ul),
		.content :global(ol) {
			padding-left: var(--space-lg);
		}
	}

	@media (max-width: 480px) {
		.blog-post {
			padding: var(--space-sm);
		}

		.blog-post h1 {
			font-size: 1.5rem;
		}

		.content :global(h2) {
			font-size: 1.3rem;
		}

		.content :global(h3) {
			font-size: 1.15rem;
		}

		.content :global(table) {
			font-size: 0.75rem;
		}

		.meta {
			flex-direction: column;
			gap: var(--space-xs);
		}
	}
</style>
