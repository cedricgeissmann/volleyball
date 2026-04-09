<script>
	let { data } = $props();
	const { rollen } = data;
</script>

<svelte:head>
	<title>Rollen - TV Muttenz Volleyball</title>
	<meta name="description" content="Volleyball-Rollen und Positionen im CLA-Ansatz" />
</svelte:head>

<div class="rollen-page">
	<header class="page-header">
		<h1>Rollen</h1>
		<p>Volleyball-Rollen und Positionen im Constraints-Led Approach</p>
	</header>

	{#if rollen.length === 0}
		<div class="empty-state">
			<p>Noch keine Rollen vorhanden.</p>
			<p class="hint">
				Rollen können als YAML-Dateien in <code>src/content/rollen/</code> hinzugefügt werden.
			</p>
		</div>
	{:else}
		<div class="rollen-grid">
			{#each rollen as rolle}
				<a href="/rollen/{rolle.id}" class="rolle-card">
					<h3>{rolle.name}</h3>
					{#if rolle.beschreibung}
						<p class="description">{rolle.beschreibung}</p>
					{/if}
					{#if rolle.fokus}
						<span class="badge">{rolle.fokus}</span>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.rollen-page {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-lg);
	}

	.page-header {
		margin-bottom: var(--spacing-xl);
		text-align: center;
	}

	.page-header h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.page-header p {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		background-color: var(--color-bg-secondary);
		border-radius: var(--border-radius);
		margin-top: var(--spacing-xl);
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}

	.empty-state .hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.empty-state code {
		background-color: var(--color-bg);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
	}

	.rollen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--spacing-md);
	}

	.rolle-card {
		display: block;
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-md);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-normal);
	}

	.rolle-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.rolle-card h3 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-sm);
		line-height: 1.5;
	}

	.badge {
		display: inline-block;
		background-color: var(--color-bg-secondary);
		color: var(--color-text);
		padding: 4px 8px;
		border-radius: 4px;
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	@media (max-width: 768px) {
		.rollen-page {
			padding: var(--spacing-md);
		}

		.rollen-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
