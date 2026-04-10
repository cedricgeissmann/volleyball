<script>
	import { onMount, onDestroy } from 'svelte';
	import { getJointsAtTime } from '$lib/utils/animationEngine.js';

	let {
		animationData,
		autoplay = true,
		children
	} = $props();

	let currentTime = $state(0);
	let isPlaying = $state(false);
	let animationFrameId = $state(/** @type {number|null} */ (null));
	let startTime = $state(/** @type {number|null} */ (null));

	// Berechne aktuelle Gelenk-Positionen
	let currentJoints = $derived(
		animationData
			? getJointsAtTime(
					animationData.keyframes,
					currentTime,
					animationData.duration,
					animationData.loop
			  )
			: {}
	);

	/**
	 * @param {number} timestamp
	 */
	function animate(timestamp) {
		if (!startTime) startTime = timestamp;
		const elapsed = timestamp - (startTime || 0);

		if (animationData) {
			if (animationData.loop) {
				currentTime = elapsed % animationData.duration;
			} else {
				currentTime = Math.min(elapsed, animationData.duration);
				if (elapsed >= animationData.duration) {
					isPlaying = false;
					return;
				}
			}
		}

		if (isPlaying) {
			animationFrameId = requestAnimationFrame(animate);
		}
	}

	function play() {
		if (!isPlaying) {
			isPlaying = true;
			startTime = null;
			animationFrameId = requestAnimationFrame(animate);
		}
	}

	function pause() {
		isPlaying = false;
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	}

	function reset() {
		currentTime = 0;
		startTime = null;
	}

	onMount(() => {
		if (autoplay && animationData) {
			play();
		}
	});

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

{#if animationData}
	{@render children({ joints: currentJoints, isPlaying, play, pause, reset, currentTime })}
{/if}
