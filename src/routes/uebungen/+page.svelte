<script>
	let { data } = $props();

	const { uebungen } = data;

	/**
	 * Gruppiert Übungen nach Kategorie
	 * @param {any[]} items
	 * @returns {Record<string, any[]>}
	 */
	function groupByCategory(items) {
		/** @type {Record<string, any[]>} */
		const grouped = {};
		for (const item of items) {
			const category = item.kategorie || 'Sonstiges';
			if (!grouped[category]) {
				grouped[category] = [];
			}
			grouped[category].push(item);
		}
		return grouped;
	}

	const groupedUebungen = groupByCategory(uebungen);
	const categories = Object.keys(groupedUebungen).sort();
</script>

<svelte:head>
	<title>Übungen - TV Muttenz Volleyball</title>
	<meta name="description" content="Volleyball-Übungen basierend auf dem Constraints-Led Approach" />
</svelte:head>

<div class="uebungen-page">
	<header class="page-header">
		<h1>Übungen</h1>
		<p>Volleyball-Übungen basierend auf dem Constraints-Led Approach</p>
	</header>

	{#if uebungen.length === 0}
		<div class="empty-state">
			<p>Noch keine Übungen vorhanden.</p>
			<p class="hint">
				Übungen können als YAML-Dateien in <code>src/content/uebungen/</code> hinzugefügt werden.
			</p>
		</div>
	{:else}
		<div class="categories">
			{#each categories as category}
				<section class="category-section">
					<h2>{category}</h2>
					<div class="uebungen-grid">
						{#each groupedUebungen[category] as uebung}
							<a href="/uebungen/{uebung.id}" class="uebung-card">
								<h3>{uebung.titel}</h3>
								{#if uebung.beschreibung}
									<p class="description">{uebung.beschreibung}</p>
								{/if}
								{#if uebung.dauer}
									<div class="setup-info">
										<span class="badge">{uebung.dauer} Min</span>
										{#if uebung.fokus}
											<span class="badge">{uebung.fokus}</span>
										{/if}
									</div>
								{/if}
							</a>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	.uebungen-page {
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

	.category-section {
		margin-bottom: var(--spacing-xl);
	}

	.category-section h2 {
		color: var(--color-text);
		margin-bottom: var(--spacing-md);
		padding-bottom: var(--spacing-sm);
		border-bottom: 2px solid var(--color-primary);
	}

	.uebungen-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--spacing-md);
	}

	.uebung-card {
		display: block;
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-md);
		text-decoration: none;
		color: inherit;
		transition: all var(--transition-normal);
	}

	.uebung-card:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.uebung-card h3 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-sm);
		line-height: 1.5;
	}

	.setup-info {
		display: flex;
		gap: var(--spacing-xs);
		flex-wrap: wrap;
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
		.uebungen-page {
			padding: var(--spacing-md);
		}

		.uebungen-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
