<script>
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import QRCode from '$lib/components/shared/QRCode.svelte';
	import { getAbsoluteURL } from '$lib/utils/qrGenerator.js';

	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});

	const persons = [
		{
			id: 'bernstein',
			nameKey: 'Nikolai Bernstein',
			roleKey: 'cla_bernstein_role',
			affiliationKey: 'cla_bernstein_affil',
			descKey: 'cla_bernstein_desc',
			tagsKey: 'cla_bernstein_tags',
			keyInsightKey: 'cla_bernstein_key_insight',
			keyInsightKey2: 'cla_bernstein_key_insight2',
			photo: `${base}/cla/bernstein.jpg`,
			initials: 'NB',
			color: '#1d4ed8'
		},
		{
			id: 'gibson',
			nameKey: 'J. J. Gibson',
			roleKey: 'cla_gibson_role',
			affiliationKey: 'cla_gibson_affil',
			descKey: 'cla_gibson_desc',
			tagsKey: 'cla_gibson_tags',
			keyInsightKey: 'cla_gibson_key_insight',
			photo: `${base}/cla/gibson.jpg`,
			initials: 'JG',
			color: '#059669'
		},
		{
			id: 'franz-bosch',
			nameKey: 'Franz Bosch',
			roleKey: 'cla_franz_bosch_role',
			affiliationKey: 'cla_franz_bosch_affil',
			descKey: 'cla_franz_bosch_desc',
			tagsKey: 'cla_franz_bosch_tags',
			keyInsightKey: 'cla_franz_bosch_key_insight',
			photo: null,
			initials: 'FB',
			color: '#7c3aed'
		},
		{
			id: 'rob-gray',
			nameKey: 'Rob Gray',
			roleKey: 'cla_rob_gray_role',
			affiliationKey: 'cla_rob_gray_affil',
			descKey: 'cla_rob_gray_desc',
			tagsKey: 'cla_rob_gray_tags',
			keyInsightKey: 'cla_rob_gray_key_insight',
			photo: null,
			initials: 'RG',
			color: '#e63e11'
		}
	];

	function printPage() {
		window.print();
	}
</script>

<svelte:head>
	<title>{$_('nav_cla')} - TV Muttenz Volleyball</title>
	<meta name="description" content={$_('meta_cla_desc')} />
</svelte:head>

<!-- ── Screen-Ansicht ──────────────────────────────────────────────────────── -->
<div class="cla-page no-print">
	<div class="page-title-row">
		<div>
			<h1>{$_('nav_cla')}</h1>
			<p class="intro">{$_('placeholder_cla_title')}</p>
			<p class="cla-intro-text">{$_('cla_intro')}</p>
		</div>
		<button class="btn-print" onclick={printPage}>
			{$_('btn_print')} ↗
		</button>
	</div>

	<div class="persons-grid">
		{#each persons as person}
			<article class="person-card">
				<div class="card-photo-wrap">
					{#if person.photo}
						<img src={person.photo} alt={person.nameKey} class="card-photo" />
					{:else}
						<div class="card-avatar" style="background: {person.color}">
							<span>{person.initials}</span>
						</div>
					{/if}
				</div>

				<div class="card-body">
					<div class="card-header">
						<h2 class="card-name">{person.nameKey}</h2>
						<span class="card-role">{$_(person.roleKey)}</span>
						<span class="card-affil">{$_(person.affiliationKey)}</span>
					</div>

				<p class="card-desc">{$_(person.descKey)}</p>

				<div class="card-tags">
					{#each $_(person.tagsKey).split(' · ') as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>

				<blockquote class="card-insight" style="--accent: {person.color}">
					{$_(person.keyInsightKey)}
				</blockquote>
				{#if person.keyInsightKey2}
					<blockquote class="card-insight" style="--accent: {person.color}">
						{$_(person.keyInsightKey2)}
					</blockquote>
				{/if}

				<a
					href="{base}/{currentLang}/cla/{person.id}"
					class="btn-learn-more"
					style="--accent: {person.color}"
				>
					{$_('cla_learn_more')} →
				</a>
				</div>
			</article>
		{/each}
	</div>
</div>

<!-- ── Druckversion ────────────────────────────────────────────────────────── -->
<div class="print-page print-only">
	<header class="print-header">
		<div class="print-header-title">
			<span class="print-club">TV Muttenz Volleyball</span>
			<h1 class="print-h1">{$_('nav_cla')}</h1>
		</div>
		<p class="print-intro">{$_('cla_intro')}</p>
	</header>

	<div class="print-grid">
		{#each persons as person}
			<div class="print-card" style="--accent: {person.color}">
				<!-- Linke Spalte: Foto/Avatar + QR -->
				<div class="print-card-left">
					{#if person.photo}
						<img src={person.photo} alt={person.nameKey} class="print-photo" />
					{:else}
						<div class="print-avatar" style="background: {person.color}">
							<span>{person.initials}</span>
						</div>
					{/if}
					<div class="print-qr">
						<QRCode url={getAbsoluteURL(`/cla/${person.id}`, currentLang)} size={90} />
					</div>
				</div>

				<!-- Rechte Spalte: Inhalt -->
				<div class="print-card-right">
					<div class="print-card-top">
						<div class="print-name-block">
							<h2 class="print-name">{person.nameKey}</h2>
							<span class="print-role" style="color: {person.color}">{$_(person.roleKey)}</span>
							<span class="print-affil">{$_(person.affiliationKey)}</span>
						</div>
					</div>
				<p class="print-desc">{$_(person.descKey)}</p>
				<p class="print-insight" style="border-left-color: {person.color}">
					{$_(person.keyInsightKey)}
				</p>
				{#if person.keyInsightKey2}
					<p class="print-insight" style="border-left-color: {person.color}">
						{$_(person.keyInsightKey2)}
					</p>
				{/if}
				<div class="print-tags">
						{#each $_(person.tagsKey).split(' · ') as tag}
							<span class="print-tag" style="background: {person.color}20; color: {person.color}">{tag}</span>
						{/each}
					</div>
					<p class="print-url">cedricgeissmann.github.io/volleyball/{currentLang}/cla/{person.id}</p>
				</div>
			</div>
		{/each}
	</div>

	<footer class="print-footer">
		<span>TV Muttenz Volleyball · Constraints-Led Approach</span>
		<span>cedricgeissmann.github.io/volleyball</span>
	</footer>
</div>

<style>
	/* ── Screen: allgemein ──────────────────────────────────────────────────── */
	.print-only {
		display: none;
	}

	.cla-page {
		max-width: var(--content-width-wide, 1200px);
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	.page-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: var(--spacing-2xl, 3rem);
	}

	h1 {
		color: var(--color-primary);
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-3xl);
	}

	.intro {
		color: var(--color-text-secondary);
		font-size: var(--font-size-lg);
		margin-bottom: var(--spacing-sm);
	}

	.cla-intro-text {
		color: var(--color-text-secondary);
		font-size: var(--font-size-base);
		max-width: 680px;
		margin: 0;
	}

	.btn-print {
		flex-shrink: 0;
		background: var(--color-primary);
		color: white;
		border: none;
		padding: 0.55rem 1.1rem;
		border-radius: 0.4rem;
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: filter 150ms;
		white-space: nowrap;
	}

	.btn-print:hover {
		filter: brightness(0.88);
	}

	/* ── Screen: Grid & Cards ───────────────────────────────────────────────── */
	.persons-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--spacing-xl);
	}

	.person-card {
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: all var(--transition-normal);
	}

	.person-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-card);
		transform: translateY(-4px);
	}

	.card-photo-wrap {
		width: 100%;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: var(--color-bg-secondary, #f5f5f5);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-photo {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}

	.card-avatar {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-avatar span {
		font-size: 3.5rem;
		font-weight: 700;
		color: white;
		letter-spacing: -0.02em;
		opacity: 0.9;
	}

	.card-body {
		padding: var(--space-xl, 1.5rem);
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1rem);
		flex: 1;
	}

	.card-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-name {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin: 0;
	}

	.card-role {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-affil {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.card-desc {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		margin: 0;
		flex: 1;
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag {
		font-size: 0.72rem;
		font-weight: var(--font-weight-medium);
		padding: 0.2rem 0.55rem;
		border-radius: 99px;
		background: var(--color-bg-secondary, #f0f0f0);
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.card-insight {
		margin: 0;
		padding: 0.45rem 0.7rem;
		border-left: 3px solid var(--accent, var(--color-primary));
		background: color-mix(in srgb, var(--accent, var(--color-primary)) 8%, transparent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		font-size: var(--font-size-sm);
		font-style: italic;
		color: var(--color-text);
		line-height: 1.5;
	}

	.btn-learn-more {
		display: inline-block;
		align-self: flex-start;
		margin-top: auto;
		background: var(--accent, var(--color-primary));
		color: #fff;
		padding: var(--space-sm, 0.5rem) var(--space-lg, 1.25rem);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		text-decoration: none;
		transition: all var(--transition-fast);
	}

	.btn-learn-more:hover {
		filter: brightness(0.88);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	/* ── Responsive ─────────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.cla-page {
			padding: var(--spacing-lg) var(--spacing-md);
		}

		h1 {
			font-size: var(--font-size-2xl);
		}

		.persons-grid {
			grid-template-columns: 1fr;
		}

		.page-title-row {
			flex-direction: column;
		}
	}

	/* ── Print ───────────────────────────────────────────────────────────────── */
	@media print {
		.no-print {
			display: none !important;
		}

		.print-only {
			display: block !important;
		}

		@page {
			size: A4 portrait;
			margin: 1cm 1.2cm;
		}

		/* Gesamtseite */
		.print-page {
			width: 100%;
			font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
			color: #111;
		}

		/* Header */
		.print-header {
			margin-bottom: 0.6cm;
			padding-bottom: 0.4cm;
			border-bottom: 2px solid #ff3500;
		}

		.print-header-title {
			display: flex;
			align-items: baseline;
			gap: 0.7cm;
			margin-bottom: 0.2cm;
		}

		.print-club {
			font-size: 8pt;
			font-weight: 600;
			color: #ff3500;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}

		.print-h1 {
			font-size: 16pt;
			font-weight: 700;
			color: #111;
			margin: 0;
		}

		.print-intro {
			font-size: 8pt;
			color: #555;
			line-height: 1.5;
			margin: 0;
		}

		/* 2×2 Raster */
		.print-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.5cm;
		}

		/* Einzelne Karte */
		.print-card {
			border: 1.5px solid var(--accent);
			border-radius: 5px;
			display: flex;
			flex-direction: row;
			overflow: hidden;
			page-break-inside: avoid;
			break-inside: avoid;
		}

		/* Linke Spalte */
		.print-card-left {
			width: 2.4cm;
			flex-shrink: 0;
			background: #f8f8f8;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: space-between;
			padding: 0.25cm 0.2cm;
			border-right: 1px solid #e5e5e5;
		}

		.print-photo {
			width: 1.8cm;
			height: 1.8cm;
			border-radius: 50%;
			object-fit: cover;
			object-position: center top;
			border: 2px solid var(--accent);
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.print-avatar {
			width: 1.8cm;
			height: 1.8cm;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.print-avatar span {
			font-size: 14pt;
			font-weight: 700;
			color: white;
		}

		.print-qr {
			margin-top: 0.15cm;
		}

		/* Rechte Spalte */
		.print-card-right {
			flex: 1;
			padding: 0.3cm 0.35cm;
			display: flex;
			flex-direction: column;
			gap: 0.15cm;
			overflow: hidden;
		}

		.print-card-top {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 0.2cm;
		}

		.print-name-block {
			display: flex;
			flex-direction: column;
			gap: 1pt;
		}

		.print-name {
			font-size: 11pt;
			font-weight: 700;
			color: #111;
			margin: 0;
			line-height: 1.2;
		}

		.print-role {
			font-size: 7pt;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.print-affil {
			font-size: 7pt;
			color: #666;
		}

		.print-desc {
			font-size: 7.5pt;
			color: #333;
			line-height: 1.45;
			margin: 0;
		}

		.print-insight {
			margin: 0;
			padding: 2pt 4pt 2pt 5pt;
			border-left: 2pt solid #ccc;
			font-size: 7pt;
			font-style: italic;
			color: #444;
			line-height: 1.4;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.print-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 2pt;
		}

		.print-tag {
			font-size: 6pt;
			font-weight: 600;
			padding: 1pt 4pt;
			border-radius: 99px;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.print-url {
			font-size: 6pt;
			color: #888;
			margin: 0;
			margin-top: auto;
			word-break: break-all;
		}

		/* Footer */
		.print-footer {
			margin-top: 0.5cm;
			padding-top: 0.3cm;
			border-top: 1px solid #ddd;
			display: flex;
			justify-content: space-between;
			font-size: 7pt;
			color: #888;
		}

		/* Globale Print-Overrides */
		a[href]:after {
			content: none !important;
		}
	}
</style>
