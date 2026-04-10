<script>
	import { onMount } from 'svelte';
	import AnimationController from '../base/AnimationController.svelte';
	import StickFigure from '../base/StickFigure.svelte';
	import { loadAnimation } from '$lib/utils/contentLoader.js';

	let {
		animationFile,
		autoplay = true,
		scale = 1,
		color = '#333',
		strokeWidth = 3
	} = $props();

	let animationData = $state(/** @type {any} */ (null));
	let loading = $state(true);
	let error = $state(/** @type {any} */ (null));

	onMount(async () => {
		try {
			if (animationFile) {
				animationData = await loadAnimation(animationFile);
			}
		} catch (err) {
			console.error('Failed to load animation:', err);
			error = err;
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="animation-loading">Lade Animation...</div>
{:else if error}
	<div class="animation-error">Fehler beim Laden der Animation</div>
{:else if animationData}
	<div class="stickfigure-animation">
		<AnimationController {animationData} {autoplay}>
			{#snippet children(props)}
				<StickFigure joints={props.joints} {scale} {color} {strokeWidth} />
			{/snippet}
		</AnimationController>
	</div>
{:else}
	<div class="animation-placeholder">Keine Animation verfügbar</div>
{/if}

<style>
	.stickfigure-animation {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		height: 100%;
		min-height: 200px;
	}

	.animation-loading,
	.animation-error,
	.animation-placeholder {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 200px;
		color: #666;
		font-style: italic;
	}

	.animation-error {
		color: #d32f2f;
	}
</style>
