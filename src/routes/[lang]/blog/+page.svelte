<script>
	import { base } from '$app/paths';
	
	let { data } = $props();
</script>

<svelte:head>
	<title>Blog - VC Damen Pfungen</title>
	<meta name="description" content="Blog über Volleyball-Training und CLA" />
</svelte:head>

<div class="blog-page">
	<h1>Blog</h1>
	<p class="intro">Gedanken und Erfahrungen zum Volleyball-Training</p>

	{#if data.posts && data.posts.length > 0}
		<div class="posts-list">
			{#each data.posts as post}
				<article class="post-card">
					<a href="{base}/blog/{post.slug}" class="post-link">
						<h2>{post.title}</h2>
						{#if post.date}
							<time class="post-date" datetime={post.date}>
								{new Date(post.date).toLocaleDateString('de-DE', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</time>
						{/if}
						{#if post.description}
							<p class="post-description">{post.description}</p>
						{/if}
						{#if post.tags && post.tags.length > 0}
							<div class="post-tags">
								{#each post.tags as tag}
									<span class="tag">{tag}</span>
								{/each}
							</div>
						{/if}
					</a>
				</article>
			{/each}
		</div>
	{:else}
		<div class="placeholder">
			<p>Noch keine Blog-Posts vorhanden.</p>
		</div>
	{/if}
</div>

<style>
	.blog-page {
		max-width: var(--content-width-text);
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-3xl);
	}

	.intro {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-xl);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.post-card {
		background-color: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius);
		transition: box-shadow 0.2s ease, transform 0.2s ease;
	}

	.post-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.post-link {
		display: block;
		padding: var(--spacing-lg);
		text-decoration: none;
		color: inherit;
	}

	.post-card h2 {
		color: var(--color-primary);
		font-size: var(--font-size-xl);
		margin-bottom: var(--spacing-sm);
		line-height: 1.3;
	}

	.post-date {
		display: block;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-md);
	}

	.post-description {
		color: var(--color-text);
		font-size: var(--font-size-base);
		line-height: 1.6;
		margin-bottom: var(--spacing-md);
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.tag {
		display: inline-block;
		padding: var(--spacing-2xs) var(--spacing-sm);
		background-color: var(--color-primary);
		color: white;
		border-radius: calc(var(--border-radius) / 2);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.placeholder {
		background-color: var(--color-bg-secondary);
		border: 2px dashed var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-xl);
		text-align: center;
	}

	.placeholder p {
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-sm);
	}

	.placeholder p:last-child {
		margin-bottom: 0;
	}

	@media (max-width: 768px) {
		.blog-page {
			padding: var(--spacing-lg) var(--spacing-md);
		}

		h1 {
			font-size: var(--font-size-2xl);
		}

		.post-card h2 {
			font-size: var(--font-size-lg);
		}
	}
</style>
