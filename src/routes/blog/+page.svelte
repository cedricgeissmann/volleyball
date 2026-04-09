<svelte:head>
	<title>Blog - TV Muttenz Volleyball</title>
	<meta name="description" content="Blog über Volleyball-Training und CLA" />
</svelte:head>

<div class="blog-page">
	<h1>Blog</h1>
	<p class="intro">Gedanken und Erfahrungen zum Volleyball-Training</p>

	<div class="placeholder">
		<p>Diese Seite befindet sich noch im Aufbau.</p>
		<p>Hier werden Blog-Posts über Volleyball-Training und den CLA-Ansatz erscheinen.</p>
	</div>
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
	}
</style>
