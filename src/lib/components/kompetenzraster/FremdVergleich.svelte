<script>
	/**
	 * @type {{
	 *   team: {
	 *     id: string,
	 *     name: string,
	 *     ziele: Array<{titel: string, beschreibung: string}>
	 *   },
	 *   selbsteinschaetzung: Record<string, number>,
	 *   fremdeinschaetzung: Record<string, number>
	 * }}
	 */
	let { team, selbsteinschaetzung, fremdeinschaetzung } = $props();

	import { createKompetenzId } from '$lib/utils/kompetenzraster.js';
	import { _ } from 'svelte-i18n';

	/**
	 * @param {number} diff
	 */
	function getDiffClass(diff) {
		if (diff > 0) return 'higher';
		if (diff < 0) return 'lower';
		return 'same';
	}
</script>

<div class="fremd-vergleich">
	<h3>{$_('heading_comparison')}</h3>
	<p class="info">{$_('comparison_view_only')}</p>

	<div class="vergleich-grid">
		{#each team.ziele as ziel}
			{@const kompetenzId = createKompetenzId(ziel.titel)}
			{@const selbst = selbsteinschaetzung[kompetenzId]}
			{@const fremd = fremdeinschaetzung[kompetenzId]}

			{#if selbst && fremd}
				{@const diff = fremd - selbst}
				<div class="vergleich-item {getDiffClass(diff)}">
					<div class="kompetenz-name">{ziel.titel}</div>
					<div class="werte">
						<div class="wert selbst">
							<span class="label">{$_('comparison_self')}</span>
							<span class="value">{selbst}</span>
						</div>
						<div class="wert fremd">
							<span class="label">{$_('comparison_external')}:</span>
							<span class="value">{fremd}</span>
						</div>
						<div class="diff">
							{#if diff > 0}
								<span class="arrow">↑</span> +{diff}
							{:else if diff < 0}
								<span class="arrow">↓</span> {diff}
							{:else}
								<span class="arrow">→</span> 0
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.fremd-vergleich {
		margin-top: var(--space-2xl);
		padding: var(--space-xl);
		background: var(--color-gray-50);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-gray-200);
	}

	.fremd-vergleich h3 {
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-secondary);
	}

	.info {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-lg);
		font-style: italic;
	}

	.vergleich-grid {
		display: grid;
		gap: var(--space-md);
	}

	.vergleich-item {
		background: white;
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-gray-300);
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.vergleich-item.higher {
		border-left-color: #4caf50;
		background: #f1f8f4;
	}

	.vergleich-item.lower {
		border-left-color: #f44336;
		background: #fef5f5;
	}

	.vergleich-item.same {
		border-left-color: #2196f3;
		background: #f3f8fc;
	}

	.kompetenz-name {
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}

	.werte {
		display: flex;
		gap: var(--space-lg);
		align-items: center;
	}

	.wert {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	.wert .label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.wert .value {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
	}

	.diff {
		font-weight: var(--font-weight-bold);
		font-size: var(--font-size-lg);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
	}

	.vergleich-item.higher .diff {
		color: #2e7d32;
	}

	.vergleich-item.lower .diff {
		color: #c62828;
	}

	.vergleich-item.same .diff {
		color: #1976d2;
	}

	@media (max-width: 768px) {
		.vergleich-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.werte {
			width: 100%;
			justify-content: space-around;
		}
	}
</style>
