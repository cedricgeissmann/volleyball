<script>
	import { onMount } from 'svelte';
	import { generateQRCode } from '$lib/utils/qrGenerator.js';
	import { browser } from '$app/environment';

	/**
	 * @typedef {Object} Props
	 * @property {string} url - The URL to encode in the QR code
	 * @property {number} [size=200] - Size of the QR code in pixels
	 * @property {string} [className=''] - Additional CSS classes
	 */

	/** @type {Props} */
	let { url, size = 200, className = '' } = $props();

	/** @type {string} */
	let qrDataUrl = $state('');

	/** @type {boolean} */
	let loading = $state(true);

	/** @type {string|null} */
	let error = $state(null);

	async function generateQR() {
		try {
			loading = true;
			error = null;
			qrDataUrl = await generateQRCode(url, size);
		} catch (err) {
			console.error('Failed to generate QR code:', err);
			error = 'QR-Code konnte nicht generiert werden';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await generateQR();

		// Ensure QR code is visible before printing
		if (browser) {
			window.addEventListener('beforeprint', () => {
				// Force visibility
				if (!qrDataUrl && !loading) {
					generateQR();
				}
			});
		}
	});
</script>

<div class="qr-code-container {className}">
	{#if loading}
		<div class="qr-loading" style="width: {size}px; height: {size}px;">
			<span>QR-Code wird generiert...</span>
		</div>
	{:else if error}
		<div class="qr-error" style="width: {size}px; height: {size}px;">
			<span>{error}</span>
		</div>
	{:else if qrDataUrl}
		<img src={qrDataUrl} alt="QR Code for {url}" width={size} height={size} class="qr-image" />
	{/if}
</div>

<style>
	.qr-code-container {
		display: inline-block;
	}

	.qr-loading,
	.qr-error {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-bg-secondary);
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		padding: var(--spacing-md);
		text-align: center;
	}

	.qr-loading span {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.qr-error {
		background-color: #fee;
		border-color: var(--color-primary);
	}

	.qr-error span {
		color: var(--color-primary);
		font-size: var(--font-size-sm);
	}

	.qr-image {
		display: block;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius);
		background-color: white;
		padding: var(--spacing-sm);
	}

	@media print {
		.qr-code-container {
			page-break-inside: avoid;
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.qr-image {
			print-color-adjust: exact;
			-webkit-print-color-adjust: exact;
		}

		.qr-loading,
		.qr-error {
			display: none !important;
		}
	}
</style>
