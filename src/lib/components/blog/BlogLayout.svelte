<script>
	// Frontmatter-Props von mdsvex
	let { title = '', date = '', author = '', tags = [], excerpt = '', children } = $props();
</script>

<article class="blog-post">
	<header>
		<h1>{title}</h1>
		{#if date || author}
			<div class="meta">
				{#if date}
					<time datetime={date}>{new Date(date).toLocaleDateString('de-DE')}</time>
				{/if}
				{#if author}
					<span class="author">von {author}</span>
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

	@media (max-width: 768px) {
		.blog-post {
			padding: var(--space-md);
		}
	}
</style>
