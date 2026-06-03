<script>
	import { _ } from 'svelte-i18n';
	import { base } from '$app/paths';
	import { page } from '$app/stores';

	const currentLang = $derived.by(() => {
		const pathParts = $page.url.pathname.split('/').filter(Boolean);
		const firstPart = pathParts[0];
		const langPart = firstPart === 'volleyball' ? pathParts[1] : firstPart;
		return langPart === 'en' ? 'en' : 'de';
	});

	// Related blog slugs
	const BLOG_SLUG_MOTORISCH = 'motorisches-lernen';
	const BLOG_SLUG_SERVICE   = 'service';
</script>

<svelte:head>
	<title>J. J. Gibson – {$_('nav_cla')} - TV Muttenz Volleyball</title>
	<meta name="description" content={$_('cla_gibson_desc')} />
</svelte:head>

<div class="person-page">
	<a href="{base}/{currentLang}/cla" class="back-link">← {$_('nav_cla')}</a>

	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<header class="person-header">
		<div class="photo-wrap">
			<img src="{base}/cla/gibson.jpg" alt="J. J. Gibson" class="person-photo" />
		</div>
		<div class="person-meta">
			<h1>J. J. Gibson</h1>
			<p class="role">{$_('cla_gibson_role')}</p>
			<p class="affil">{$_('cla_gibson_affil')}</p>
			<div class="tags">
				{#each $_('cla_gibson_tags').split(' · ') as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		</div>
	</header>

	<!-- ── Intro ──────────────────────────────────────────────────────────────── -->
	<div class="content">
		<p class="intro-lead">{$_('gibson_intro')}</p>

		<!-- ── Section 1: Affordanzen ───────────────────────────────────────────── -->
		<section class="content-section">
			<h2>{$_('gibson_section1_title')}</h2>

			<p>{$_('gibson_section1_p1')}</p>
			<p>{$_('gibson_section1_p2')}</p>
			<p>{$_('gibson_section1_p3')}</p>

			<blockquote>{$_('gibson_section1_quote')}</blockquote>

			<p>{$_('gibson_section1_p4')}</p>

			<div class="callout">
				<p>{$_('gibson_section1_cta')}</p>
			</div>
		</section>

		<!-- ── Section 2: Direkte Wahrnehmung ───────────────────────────────────── -->
		<section class="content-section">
			<h2>{$_('gibson_section2_title')}</h2>

			<p>{$_('gibson_section2_p1')}</p>
			<p>{$_('gibson_section2_p2')}</p>
			<p>{$_('gibson_section2_p3')}</p>

			<blockquote>{$_('gibson_section2_quote')}</blockquote>

			<p>{$_('gibson_section2_p4')}</p>

			<div class="callout">
				<p>{$_('gibson_section2_cta')}</p>
			</div>
		</section>

		<!-- ── Section 3: Volleyball-Bezug ──────────────────────────────────────── -->
		<section class="content-section">
			<h2>{$_('gibson_section3_title')}</h2>

			<p>{$_('gibson_section3_p1')}</p>
			<p>{$_('gibson_section3_p2')}</p>
			<p>{$_('gibson_section3_p3')}</p>
			<p>{$_('gibson_section3_p4')}</p>
		</section>

		<!-- ── Related Blog Posts ────────────────────────────────────────────────── -->
		<section class="related-section">
			<p class="related-label">{$_('gibson_section3_related')}</p>
			<div class="related-links">
				<a
					href="{base}/{currentLang}/blog/{BLOG_SLUG_MOTORISCH}"
					class="related-card"
				>
					<span class="related-card-arrow">→</span>
					<span>{$_('gibson_related_motorisches_lernen')}</span>
				</a>
				<a
					href="{base}/{currentLang}/blog/{BLOG_SLUG_SERVICE}"
					class="related-card"
				>
					<span class="related-card-arrow">→</span>
					<span>{$_('gibson_related_service')}</span>
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	.person-page {
		max-width: var(--content-width-text, 720px);
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	.back-link {
		display: inline-block;
		color: var(--color-primary);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-xl);
		text-decoration: none;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	/* ── Header ────────────────────────────────────────────────────────────────── */
	.person-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-xl, 1.5rem);
		margin-bottom: var(--spacing-xl);
		padding-bottom: var(--spacing-xl);
		border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
	}

	.photo-wrap {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		border: 3px solid #059669;
	}

	.person-photo {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}

	.person-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.person-meta h1 {
		color: var(--color-primary);
		margin: 0;
		font-size: var(--font-size-3xl);
		line-height: 1.2;
	}

	.role {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: #059669;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0;
	}

	.affil {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.5rem;
	}

	.tag {
		font-size: 0.7rem;
		font-weight: var(--font-weight-medium);
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		background: #ecfdf5;
		color: #059669;
		white-space: nowrap;
	}

	/* ── Content ────────────────────────────────────────────────────────────────── */
	.content {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.intro-lead {
		font-size: var(--font-size-lg, 1.125rem);
		line-height: 1.75;
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xl);
		font-style: italic;
	}

	.content-section {
		margin-bottom: 3rem;
	}

	.content-section h2 {
		font-size: var(--font-size-2xl, 1.5rem);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin-bottom: 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #059669;
	}

	.content-section p {
		font-size: var(--font-size-base, 1rem);
		line-height: 1.8;
		color: var(--color-text);
		margin-bottom: 1rem;
	}

	blockquote {
		border-left: 4px solid #059669;
		background: #ecfdf5;
		padding: 0.9rem 1.25rem;
		border-radius: 0 0.5rem 0.5rem 0;
		margin: 1.5rem 0;
		font-style: italic;
		color: #064e3b;
		font-size: var(--font-size-base, 1rem);
		line-height: 1.6;
	}

	.callout {
		background: var(--color-bg-secondary, #f8fafc);
		border: 1px solid var(--color-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
		margin-top: 0.5rem;
	}

	.callout p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm, 0.875rem);
		line-height: 1.7;
	}

	/* ── Related ────────────────────────────────────────────────────────────────── */
	.related-section {
		padding-top: 2rem;
		border-top: 1px solid var(--color-gray-200, #e5e7eb);
		margin-top: 1rem;
	}

	.related-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-bottom: 0.75rem;
	}

	.related-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.related-card {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		transition: all var(--transition-fast, 150ms);
	}

	.related-card:hover {
		border-color: #059669;
		background: #ecfdf5;
		color: #059669;
		transform: translateX(3px);
	}

	.related-card-arrow {
		color: #059669;
		font-weight: bold;
		flex-shrink: 0;
	}

	/* ── Responsive ─────────────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.person-page {
			padding: var(--spacing-lg) var(--spacing-md);
		}

		.person-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.person-meta h1 {
			font-size: var(--font-size-2xl);
		}

		.content-section h2 {
			font-size: var(--font-size-xl);
		}
	}
</style>
