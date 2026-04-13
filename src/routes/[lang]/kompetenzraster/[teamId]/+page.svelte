<script>
	import AssessmentForm from '$lib/components/kompetenzraster/AssessmentForm.svelte';
	import HistoryView from '$lib/components/kompetenzraster/HistoryView.svelte';
	import { _ } from 'svelte-i18n';

	/** @type {{ data: { team: any } }} */
	let { data } = $props();
	const { team } = data;

	let activeTab = $state('assessment');
	let historyKey = $state(0); // Für Re-Rendering nach Save

	function handleAssessmentSaved() {
		// Switch to History Tab und force reload
		activeTab = 'history';
		historyKey += 1;
	}
</script>

<svelte:head>
	<title>{$_('heading_competency_matrix')} {team.name} - TV Muttenz Volleyball</title>
	<meta name="description" content="{$_('meta_competency_desc')} {team.name}" />
</svelte:head>

<div class="container">
	<header class="page-header">
		<h1>{$_('heading_competency_matrix')}</h1>
		<p class="subtitle">{$_('assessment_track_development')} {team.name}</p>
	</header>

	<div class="info-box">
		<p>
			<strong>💾 {$_('assessment_privacy')}</strong>
			{$_('assessment_privacy_local')} {$_('assessment_privacy_no_access')}
		</p>
		<p>
			<strong>⭐ {$_('assessment_tip')}</strong> {$_('assessment_tip_focus')}
		</p>
	</div>

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'assessment'} onclick={() => (activeTab = 'assessment')}>
			{$_('heading_assessment')}
		</button>
		<button class="tab" class:active={activeTab === 'history'} onclick={() => (activeTab = 'history')}>
			{$_('heading_my_development')}
		</button>
	</div>

	<div class="tab-content">
		{#if activeTab === 'assessment'}
			<AssessmentForm {team} onSaved={handleAssessmentSaved} />
		{:else}
			{#key historyKey}
				<HistoryView {team} />
			{/key}
		{/if}
	</div>
</div>

<style>
	.container {
		padding-block: var(--space-3xl);
		max-width: var(--max-width-content);
		margin-inline: auto;
		padding-inline: var(--space-lg);
	}

	.page-header {
		text-align: center;
		margin-bottom: var(--space-2xl);
	}

	.page-header h1 {
		color: var(--color-primary);
		margin-bottom: var(--space-md);
	}

	.subtitle {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
	}

	.info-box {
		background: var(--color-gray-50);
		padding: var(--space-lg);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-2xl);
		border-left: 4px solid var(--color-primary);
	}

	.info-box p {
		margin: var(--space-sm) 0;
		font-size: var(--font-size-sm);
	}

	.tabs {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-2xl);
		border-bottom: 2px solid var(--color-gray-200);
	}

	.tab {
		background: none;
		border: none;
		padding: var(--space-md) var(--space-lg);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		border-bottom: 3px solid transparent;
		margin-bottom: -2px;
	}

	.tab:hover {
		color: var(--color-primary);
	}

	.tab.active {
		color: var(--color-primary);
		border-bottom-color: var(--color-primary);
	}

	.tab-content {
		margin-top: var(--space-xl);
	}

	@media (max-width: 768px) {
		.tabs {
			width: 100%;
		}

		.tab {
			flex: 1;
			padding: var(--space-sm) var(--space-md);
		}
	}
</style>
