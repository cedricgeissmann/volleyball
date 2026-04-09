<script>
	/**
	 * @type {{
	 *   goal: {
	 *     titel: string,
	 *     beschreibung: string
	 *   }
	 * }}
	 */
	let { goal } = $props();
</script>

<div class="goal-card">
	<h4>{goal.titel}</h4>
	<p>{goal.beschreibung}</p>
</div>

<style>
	.goal-card {
		background: var(--color-background-elevated);
		border-left: 4px solid var(--color-primary);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-fast);
	}

	.goal-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateX(4px);
	}

	.goal-card h4 {
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-primary);
		font-size: var(--font-size-lg);
	}

	.goal-card p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}
</style>
