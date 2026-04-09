<script>
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';

	let { data } = $props();
	const { rolle } = data;

	const pageUrl = browser ? window.location.href : getAbsoluteURL(`/rollen/${rolle.id}`);

	function handlePrint() {
		// Wait a bit to ensure QR code is rendered
		setTimeout(() => {
			window.print();
		}, 100);
	}
</script>

<svelte:head>
	<title>{rolle.name} - Rollen - TV Muttenz Volleyball</title>
	<meta name="description" content={rolle.beschreibung || rolle.name} />
</svelte:head>

<div class="rolle-detail">
	<header class="page-header">
		<div class="header-content">
			<a href="{base}/rollen" class="back-link">← Zurück zu Rollen</a>
			<h1>{rolle.name}</h1>
			{#if rolle.beschreibung}
				<p class="description">{rolle.beschreibung}</p>
			{/if}
		</div>
		<div class="qr-section">
			<QRCode url={pageUrl} size={150} />
			<p class="qr-hint">Scannen für schnellen Zugriff</p>
		</div>
	</header>

	<div class="content-grid">
		{#if rolle.fokus}
			<section class="card">
				<h2>Fokus</h2>
				<p class="focus-text">{rolle.fokus}</p>
			</section>
		{/if}

		{#if rolle.aufgaben && rolle.aufgaben.length > 0}
			<section class="card full-width">
				<h2>Aufgaben</h2>
				<ul class="points-list">
					{#each rolle.aufgaben as aufgabe}
						<li>{aufgabe}</li>
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
	.rolle-detail {
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

	.focus-text {
		color: var(--color-text);
		font-size: var(--font-size-lg);
		line-height: 1.6;
		margin: 0;
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
		.rolle-detail {
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
