<script>
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';

	let { data } = $props();
	const { uebung } = data;

	const pageUrl = browser ? window.location.href : getAbsoluteURL(`/uebungen/${uebung.id}`);

	function handlePrint() {
		// Wait a bit to ensure QR code is rendered
		setTimeout(() => {
			window.print();
		}, 100);
	}
</script>

<svelte:head>
	<title>{uebung.titel} - Übungen - TV Muttenz Volleyball</title>
	<meta name="description" content={uebung.beschreibung || uebung.titel} />
</svelte:head>

<div class="uebung-detail">
	<header class="page-header">
		<div class="header-content">
			<a href="{base}/uebungen" class="back-link">← Zurück zu Übungen</a>
			<h1>{uebung.titel}</h1>
			{#if uebung.kategorie}
				<span class="category-badge">{uebung.kategorie}</span>
			{/if}
			{#if uebung.beschreibung}
				<p class="description">{uebung.beschreibung}</p>
			{/if}
		</div>
		<div class="qr-section">
			<QRCode url={pageUrl} size={150} />
			<p class="qr-hint">Scannen für schnellen Zugriff</p>
		</div>
	</header>

	<div class="content-grid">
		<section class="card">
			<h2>Info</h2>
			<dl class="info-list">
				{#if uebung.dauer}
					<div class="info-item">
						<dt>Dauer</dt>
						<dd>{uebung.dauer} Minuten</dd>
					</div>
				{/if}
				{#if uebung.fokus}
					<div class="info-item">
						<dt>Fokus</dt>
						<dd>{uebung.fokus}</dd>
					</div>
				{/if}
				{#if uebung.kategorie}
					<div class="info-item">
						<dt>Kategorie</dt>
						<dd>{uebung.kategorie}</dd>
					</div>
				{/if}
			</dl>
		</section>

		{#if uebung.ziele && uebung.ziele.length > 0}
			<section class="card full-width">
				<h2>Lernziele</h2>
				<ul class="points-list">
					{#each uebung.ziele as ziel}
						<li>{ziel}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<div class="actions print-hide">
		<button class="btn btn-primary" onclick={handlePrint}>Drucken</button>
	</div>
</div>

<style>
	.uebung-detail {
		max-width: var(--content-width-wide);
		margin: 0 auto;
		padding: var(--spacing-lg);
	}

	.page-header {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--spacing-xl);
		margin-bottom: var(--spacing-2xl);
		padding-bottom: var(--spacing-xl);
		border-bottom: 2px solid var(--color-border);
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.back-link {
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: color var(--transition-normal);
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	.page-header h1 {
		color: var(--color-primary);
		margin: 0;
	}

	.category-badge {
		display: inline-block;
		background-color: var(--color-primary);
		color: white;
		padding: 4px 12px;
		border-radius: 4px;
		font-size: var(--font-size-sm);
		font-weight: 600;
		width: fit-content;
	}

	.description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		line-height: 1.6;
		margin: 0;
	}

	.qr-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.qr-hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		margin: 0;
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.card {
		background-color: var(--color-bg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-lg);
	}

	.card.full-width {
		grid-column: 1 / -1;
	}

	.card h2 {
		color: var(--color-text);
		margin-top: 0;
		margin-bottom: var(--spacing-md);
		font-size: var(--font-size-xl);
	}

	.info-list,
	.constraints-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.info-item,
	.constraint-item {
		display: grid;
		grid-template-columns: 120px 1fr;
		gap: var(--spacing-sm);
	}

	dt {
		font-weight: 600;
		color: var(--color-text);
	}

	dd {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.constraint-item dt {
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.instructions {
		white-space: pre-wrap;
		line-height: 1.8;
		color: var(--color-text);
	}

	.points-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.points-list li {
		padding-left: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
		position: relative;
		line-height: 1.6;
	}

	.points-list li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-primary);
		font-weight: bold;
	}

	.actions {
		display: flex;
		justify-content: center;
		gap: var(--spacing-md);
		padding-top: var(--spacing-xl);
		margin-top: var(--spacing-xl);
		border-top: 2px solid var(--color-border);
	}

	.btn {
		padding: var(--spacing-sm) var(--spacing-lg);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		background-color: var(--color-bg);
		color: var(--color-text);
		font-size: var(--font-size-base);
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-normal);
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	@media (max-width: 768px) {
		.uebung-detail {
			padding: var(--spacing-md);
		}

		.page-header {
			grid-template-columns: 1fr;
		}

		.qr-section {
			order: -1;
			justify-self: center;
		}

		.content-grid {
			grid-template-columns: 1fr;
		}

		.info-item,
		.constraint-item {
			grid-template-columns: 100px 1fr;
		}
	}

	@media print {
		.print-hide {
			display: none;
		}

		.page-header {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-xl);
		}

		.qr-section {
			page-break-inside: avoid;
		}

		.qr-hint {
			display: none;
		}

		.card {
			page-break-inside: avoid;
			margin-bottom: var(--spacing-md);
		}

		.back-link {
			display: none;
		}
	}
</style>
