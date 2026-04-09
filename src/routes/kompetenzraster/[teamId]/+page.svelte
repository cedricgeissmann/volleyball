<script>
	import AssessmentForm from '$lib/components/kompetenzraster/AssessmentForm.svelte';
	import HistoryView from '$lib/components/kompetenzraster/HistoryView.svelte';

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
	<title>Kompetenzraster {team.name} - TV Muttenz Volleyball</title>
	<meta name="description" content="Persönliches Kompetenzraster für {team.name}" />
</svelte:head>

<div class="container">
	<header class="page-header">
		<h1>Kompetenzraster</h1>
		<p class="subtitle">Verfolge deine persönliche Entwicklung im Team {team.name}</p>
	</header>

	<div class="info-box">
		<p>
			<strong>💾 Datenschutz:</strong> Alle Daten bleiben ausschließlich auf deinem Gerät gespeichert.
			Niemand sonst hat Zugriff darauf.
		</p>
		<p>
			<strong>⭐ Tipp:</strong> Markiere Kompetenzen als Fokus, um deine Entwicklung gezielt zu verfolgen.
		</p>
	</div>

	<div class="tabs">
		<button class="tab" class:active={activeTab === 'assessment'} onclick={() => (activeTab = 'assessment')}>
			Assessment
		</button>
		<button class="tab" class:active={activeTab === 'history'} onclick={() => (activeTab = 'history')}>
			Meine Entwicklung
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
