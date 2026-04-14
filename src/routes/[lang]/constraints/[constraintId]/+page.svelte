<script>
	import { base } from '$app/paths';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import TranslationFallbackBanner from '$lib/components/shared/TranslationFallbackBanner.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	const { constraint, isFallback } = data;
	const lang = data.lang ?? 'de';

	const qrUrl = getAbsoluteURL(`/constraints/${constraint.id}`, lang);

	/** @param {string} schwierigkeit */
	function getDifficultyKey(schwierigkeit) {
		const map = /** @type {Record<string,string>} */ ({
			'einfach': 'constraint_difficulty_easy',
			'mittel': 'constraint_difficulty_medium',
			'schwer': 'constraint_difficulty_hard',
		});
		return map[schwierigkeit] ?? schwierigkeit;
	}

	/** @param {string} kategorie */
	function getCategoryKey(kategorie) {
		const map = /** @type {Record<string,string>} */ ({
			'Angriff': 'constraint_category_attack',
			'Verteidigung': 'constraint_category_defense',
			'Aufbau': 'constraint_category_setup',
			'Allgemein': 'constraint_category_general',
		});
		return map[kategorie] ?? kategorie;
	}
</script>

<svelte:head>
	<title>{constraint.name} - Constraints - TV Muttenz Volleyball</title>
	<meta name="description" content={constraint.beschreibung || constraint.name} />
</svelte:head>

<div class="constraint-detail">
	<TranslationFallbackBanner {lang} {isFallback} />

	<header class="page-header">
		<a href="{base}/{lang}/constraints" class="back-button">← {$_('btn_back_to_constraints')}</a>
		<div class="header-content">
			<h1>{constraint.name}</h1>
			<div class="header-badges">
				{#if constraint.kategorie}
					<span class="badge badge-category">{$_(getCategoryKey(constraint.kategorie))}</span>
				{/if}
				{#if constraint.schwierigkeit}
					<span class="badge badge-difficulty badge-difficulty--{constraint.schwierigkeit}">
						{$_(getDifficultyKey(constraint.schwierigkeit))}
					</span>
				{/if}
			</div>
			{#if constraint.beschreibung}
				<p class="description">{constraint.beschreibung}</p>
			{/if}
		</div>
	</header>

	<div class="content-grid">
		{#if constraint.erklaerung}
			<section class="card full-width">
				<h2>{$_('heading_explanation')}</h2>
				<div class="text-content">
					{#each constraint.erklaerung.trim().split('\n') as line}
						{#if line.trim()}
							<p>{line.trim()}</p>
						{/if}
					{/each}
				</div>
			</section>
		{/if}

		{#if constraint.nutzen}
			<section class="card full-width benefit-card">
				<h2>{$_('heading_benefit')}</h2>
				<div class="text-content">
					{#each constraint.nutzen.trim().split('\n') as line}
						{#if line.trim()}
							<p>{line.trim()}</p>
						{/if}
					{/each}
				</div>
			</section>
		{/if}
	</div>

	<div class="qr-section">
		<div class="qr-wrapper">
			<QRCode url={qrUrl} size={180} />
		</div>
		<p class="qr-url">{qrUrl}</p>
	</div>
</div>

<style>
	.constraint-detail {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-xl);
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-3xl);
		padding-bottom: var(--spacing-2xl);
		border-bottom: 2px solid var(--color-border);
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		padding: var(--spacing-md) var(--spacing-lg);
		background-color: var(--color-primary);
		color: white;
		text-decoration: none;
		border-radius: var(--border-radius);
		font-size: var(--font-size-base);
		font-weight: 600;
		transition: all var(--transition-normal);
		width: fit-content;
	}

	.back-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		background-color: var(--color-primary-dark, var(--color-primary));
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.page-header h1 {
		color: var(--color-primary);
		margin: 0;
	}

	.header-badges {
		display: flex;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.badge {
		display: inline-block;
		padding: 4px 12px;
		border-radius: 99px;
		font-size: var(--font-size-sm);
		font-weight: 600;
		line-height: 1.5;
	}

	.badge-category {
		background-color: rgba(255, 53, 0, 0.1);
		color: var(--color-primary);
		border: 1px solid rgba(255, 53, 0, 0.3);
	}

	.badge-difficulty--einfach {
		background-color: #dcfce7;
		color: #166534;
		border: 1px solid #bbf7d0;
	}

	.badge-difficulty--mittel {
		background-color: #fef9c3;
		color: #854d0e;
		border: 1px solid #fef08a;
	}

	.badge-difficulty--schwer {
		background-color: #fee2e2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		line-height: 1.6;
		margin: 0;
		font-style: italic;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--spacing-2xl);
		margin-bottom: var(--spacing-2xl);
	}

	.card {
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-xl);
	}

	.benefit-card {
		border-color: var(--color-primary);
		background-color: rgba(255, 53, 0, 0.03);
	}

	.card.full-width {
		grid-column: 1 / -1;
	}

	.card h2 {
		color: var(--color-text);
		margin-top: 0;
		margin-bottom: var(--spacing-lg);
		font-size: var(--font-size-xl);
	}

	.benefit-card h2 {
		color: var(--color-primary);
	}

	.text-content p {
		color: var(--color-text);
		font-size: var(--font-size-base);
		line-height: 1.8;
		margin: 0 0 var(--spacing-md) 0;
	}

	.text-content p:last-child {
		margin-bottom: 0;
	}

	.qr-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		padding: var(--spacing-2xl) 0;
		border-top: 2px solid var(--color-border);
		margin-top: var(--spacing-xl);
	}

	.qr-wrapper {
		background-color: white;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: inline-flex;
	}

	.qr-url {
		color: #aaaaaa;
		font-size: var(--font-size-sm);
		font-family: monospace;
		word-break: break-all;
		text-align: center;
		margin: 0;
	}

	@media (max-width: 768px) {
		.constraint-detail {
			padding: var(--spacing-md);
		}
	}

	@media print {
		.page-header {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-xl);
		}

		.card {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-md);
		}

		.back-button {
			display: none;
		}

		.qr-section {
			page-break-inside: avoid;
		}

		.qr-url {
			color: #aaaaaa;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}
</style>
