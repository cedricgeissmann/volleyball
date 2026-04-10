<script>
	import { generateStartEndSnapshots } from '$lib/utils/svgSnapshot.js';

	let { animation } = $props();

	// Generiere Start- und End-Snapshots
	let snapshots = $derived.by(() => {
		if (!animation) return { start: '', end: '' };
		return generateStartEndSnapshots(animation, {
			color: '#333',
			strokeWidth: 2,
			viewBoxWidth: 200,
			viewBoxHeight: 250
		});
	});
</script>

<div class="print-card-back-kraft">
	<div class="animation-frame">
		<div class="frame-label">Start</div>
		<div class="frame-content">
			{@html snapshots.start}
		</div>
	</div>
	<div class="animation-frame">
		<div class="frame-label">Ende</div>
		<div class="frame-content">
			{@html snapshots.end}
		</div>
	</div>
</div>

<style>
	.print-card-back-kraft {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: row;
		gap: 4mm;
		padding: 2mm;
		box-sizing: border-box;
		background: white;
		/* Rotiere die gesamte Rückseite um 90° gegen den Uhrzeigersinn */
		transform: rotate(-90deg);
		transform-origin: center center;
		/* Vertausche Breite und Höhe wegen Rotation */
		width: 88mm;
		height: 63mm;
		position: absolute;
		top: 50%;
		left: 50%;
		margin-left: -44mm;
		margin-top: -31.5mm;
	}

	.animation-frame {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1mm;
	}

	.frame-label {
		font-size: 10pt;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.frame-content {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.frame-content :global(svg) {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
	}

	/* Print-spezifische Anpassungen */
	@media print {
		.print-card-back-kraft {
			break-inside: avoid;
		}
	}
</style>
