<script>
	/**
	 * Taktik-Animations-Controller.
	 * Steuert Playback (schrittbasiert mit Interpolation) und Benutzer-Navigation.
	 */
	import { onMount, onDestroy } from 'svelte';
	import TaktikBoard from './TaktikBoard.svelte';
	import {
		getPositionsAtTime,
		getTotalDuration,
		generateArrows,
		getStartPositions,
	} from '$lib/utils/taktikEngine.js';

	/** @typedef {import('$lib/utils/taktikEngine.js').TaktikAnimation} TaktikAnimation */

	/**
	 * @type {{
	 *   animation: TaktikAnimation,
	 *   autoplay?: boolean,
	 *   maxWidth?: number,
	 *   showLegend?: boolean
	 * }}
	 */
	let {
		animation,
		autoplay = false,
		maxWidth = 540,
		showLegend = true,
	} = $props();

	// Playback-Zustand
	let currentTime = $state(0);
	let isPlaying = $state(false);
	let lastTimestamp = $state(0);
	let rafId = /** @type {number|null} */ (null);

	const totalDuration = $derived(getTotalDuration(animation));
	const stepCount = $derived(animation.steps?.length ?? 1);

	// Aktuelle Positionen via Interpolation
	const currentState = $derived(getPositionsAtTime(animation, currentTime));
	const currentPositions = $derived(currentState.positions);
	const currentStepIndex = $derived(currentState.stepIndex);

	// Pfeile: alle abgeschlossenen Schritte + laufender Schritt
	const visibleArrows = $derived(
		generateArrows(animation, animation.objects, currentStepIndex + (currentState.progress < 0.05 ? 0 : 1))
	);

	// Fortschritts-Prozent
	const progressPercent = $derived(totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0);

	// Animation-Loop
	function tick(/** @type {number} */ timestamp) {
		if (!isPlaying) return;
		if (lastTimestamp === 0) lastTimestamp = timestamp;

		const delta = timestamp - lastTimestamp;
		lastTimestamp = timestamp;
		currentTime = Math.min(currentTime + delta, totalDuration);

		if (currentTime >= totalDuration) {
			if (animation.loop) {
				currentTime = 0;
			} else {
				isPlaying = false;
				currentTime = totalDuration;
			}
		}

		if (isPlaying) {
			rafId = requestAnimationFrame(tick);
		}
	}

	function play() {
		if (currentTime >= totalDuration) {
			currentTime = 0;
		}
		isPlaying = true;
		lastTimestamp = 0;
		rafId = requestAnimationFrame(tick);
	}

	function pause() {
		isPlaying = false;
		lastTimestamp = 0;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function reset() {
		pause();
		currentTime = 0;
	}

	function jumpToStep(/** @type {number} */ stepIndex) {
		pause();
		// Berechne kumulierte Zeit bis zu diesem Schritt
		let t = 0;
		const steps = animation.steps ?? [];
		for (let i = 0; i < stepIndex && i < steps.length - 1; i++) {
			t += steps[i].duration ?? 1000;
		}
		currentTime = t;
	}

	/** Einen Schritt vor */
	function stepForward() {
		const nextStep = Math.min(currentStepIndex + 1, stepCount - 1);
		jumpToStep(nextStep);
	}

	/** Einen Schritt zurück */
	function stepBack() {
		const prevStep = Math.max(currentStepIndex - 1, 0);
		jumpToStep(prevStep);
	}

	/** Scrubbing via Progressbar */
	function scrub(/** @type {MouseEvent} */ e) {
		const el = /** @type {HTMLElement} */ (e.currentTarget);
		const rect = el.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		pause();
		currentTime = ratio * totalDuration;
	}

	onMount(() => {
		if (autoplay && totalDuration > 0) {
			play();
		}
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
	});
</script>

<div class="taktik-animation">
	<!-- Board -->
	<TaktikBoard
		{animation}
		positions={currentPositions}
		arrows={visibleArrows}
		{maxWidth}
	/>

	<!-- Schritt-Indikatoren -->
	<div class="step-indicators">
		{#each animation.steps ?? [] as _, i}
			<button
				class="step-dot"
				class:active={i <= currentStepIndex}
				class:current={i === currentStepIndex}
				onclick={() => jumpToStep(i)}
				aria-label="Schritt {i + 1}"
				title="Schritt {i + 1}"
			></button>
		{/each}
	</div>

	<!-- Fortschrittsbalken (klickbar) -->
	<div
		class="progress-bar"
		role="slider"
		aria-label="Animations-Fortschritt"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.round(progressPercent)}
		tabindex="0"
		onclick={scrub}
		onkeydown={(e) => {
			if (e.key === 'ArrowRight') stepForward();
			if (e.key === 'ArrowLeft') stepBack();
		}}
	>
		<div class="progress-fill" style="width: {progressPercent}%"></div>
	</div>

	<!-- Steuerung -->
	<div class="controls">
		<button class="ctrl-btn" onclick={reset} title="Zurücksetzen" aria-label="Zurücksetzen">
			<!-- Reset Icon -->
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="1 4 1 10 7 10"></polyline>
				<path d="M3.51 15a9 9 0 1 0 .49-3.44"></path>
			</svg>
		</button>

		<button class="ctrl-btn" onclick={stepBack} disabled={currentStepIndex <= 0 && currentTime === 0} title="Vorheriger Schritt" aria-label="Vorheriger Schritt">
			<!-- Skip Back Icon -->
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="19 20 9 12 19 4 19 20"></polygon>
				<line x1="5" y1="19" x2="5" y2="5"></line>
			</svg>
		</button>

		{#if isPlaying}
			<button class="ctrl-btn ctrl-primary" onclick={pause} title="Pause" aria-label="Pause">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="4" width="4" height="16"></rect>
					<rect x="14" y="4" width="4" height="16"></rect>
				</svg>
			</button>
		{:else}
			<button class="ctrl-btn ctrl-primary" onclick={play} title="Abspielen" aria-label="Abspielen">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
					<polygon points="5 3 19 12 5 21 5 3"></polygon>
				</svg>
			</button>
		{/if}

		<button class="ctrl-btn" onclick={stepForward} disabled={currentStepIndex >= stepCount - 1} title="Nächster Schritt" aria-label="Nächster Schritt">
			<!-- Skip Forward Icon -->
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polygon points="5 4 15 12 5 20 5 4"></polygon>
				<line x1="19" y1="5" x2="19" y2="19"></line>
			</svg>
		</button>

		<span class="step-label">
			Schritt {currentStepIndex + 1} / {stepCount}
		</span>
	</div>

	<!-- Legende -->
	{#if showLegend}
		<div class="legend">
			<div class="legend-section">
				<span class="legend-title">Laufwege</span>
				<div class="legend-items">
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#1565C0" stroke-width="4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#1565C0" /></svg>
						Sprint
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#1E88E5" stroke-width="3" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#1E88E5" /></svg>
						Lauf
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#90CAF9" stroke-width="2" stroke-dasharray="5,3" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#90CAF9" /></svg>
						Schritt
					</span>
				</div>
			</div>
			<div class="legend-section">
				<span class="legend-title">Ballwege</span>
				<div class="legend-items">
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#D32F2F" stroke-width="4" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#D32F2F" /></svg>
						Angriff
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#E64A19" stroke-width="3" stroke-dasharray="5,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#E64A19" /></svg>
						Finte
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#F57C00" stroke-width="3" stroke-dasharray="11,5" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#F57C00" /></svg>
						Downball
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#2E7D32" stroke-width="3" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#2E7D32" /></svg>
						Pass
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#558B2F" stroke-width="3" stroke-dasharray="3,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#558B2F" /></svg>
						Gratisball
					</span>
					<span class="legend-item">
						<svg width="28" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#6A1B9A" stroke-width="3" stroke-dasharray="7,4" stroke-linecap="round" /><polygon points="22,5 16,2 16,8" fill="#6A1B9A" /></svg>
						Aufschlag
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.taktik-animation {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
	}

	/* Schritt-Punkte */
	.step-indicators {
		display: flex;
		gap: var(--space-xs);
		justify-content: center;
		flex-wrap: wrap;
	}

	.step-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--color-primary);
		background: transparent;
		cursor: pointer;
		padding: 0;
		transition: background var(--transition-fast), transform var(--transition-fast);
	}

	.step-dot.active {
		background: var(--color-primary);
		opacity: 0.5;
	}

	.step-dot.current {
		background: var(--color-primary);
		opacity: 1;
		transform: scale(1.3);
	}

	/* Fortschrittsbalken */
	.progress-bar {
		height: 6px;
		background: var(--color-gray-200);
		border-radius: 3px;
		cursor: pointer;
		position: relative;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: 3px;
		transition: width 0.05s linear;
	}

	/* Steuerung */
	.controls {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
	}

	.ctrl-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		color: var(--color-text);
		cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}

	.ctrl-btn:hover:not(:disabled) {
		background: var(--color-gray-100);
		border-color: var(--color-gray-400);
	}

	.ctrl-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.ctrl-primary {
		width: 44px;
		height: 44px;
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.ctrl-primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
	}

	.step-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		min-width: 90px;
		text-align: center;
	}

	/* Legende */
	.legend {
		display: flex;
		gap: var(--space-lg);
		flex-wrap: wrap;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-gray-50);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-gray-200);
	}

	.legend-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.legend-title {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.legend-items {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.legend-item svg {
		flex-shrink: 0;
	}
</style>
