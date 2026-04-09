<script>
	import { base } from '$app/paths';
</script>

<footer class="footer">
	<div class="container">
		<p class="copyright">
			© {new Date().getFullYear()} TV Muttenz Volleyball | Cedric Geissmann -
			<a href="mailto:cedric.geissmann@gmail.com">cedric.geissmann@gmail.com</a>
		</p>
		<a href="{base}/datenschutz" class="privacy-link">Datenschutz</a>
	</div>
</footer>

<style>
	.footer {
		background: var(--color-background-subtle);
		border-top: 1px solid var(--color-gray-200);
		padding: var(--space-xl) 0;
		margin-top: auto;
	}

	.container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: var(--max-width-content);
		margin-inline: auto;
		padding-inline: var(--space-lg);
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.copyright {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.copyright a {
		color: var(--color-text-secondary);
	}

	.copyright a:hover {
		color: var(--color-primary);
	}

	.privacy-link {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		opacity: 0.8;
		transition: opacity var(--transition-fast);
	}

	.privacy-link:hover {
		opacity: 1;
		color: var(--color-primary);
	}

	@media (max-width: 768px) {
		.container {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}
</style>
