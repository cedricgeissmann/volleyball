<script>
	/**
	 * Haupt-SVG-Board: Rendert Feld + Zonen + Pfeile + Objekte.
	 * Erhält bereits berechnete Positionen (interpoliert).
	 */
	import CourtHalf from './CourtHalf.svelte';
	import CourtFull from './CourtFull.svelte';
	import TaktikPlayer from './TaktikPlayer.svelte';
	import TaktikBall from './TaktikBall.svelte';
	import TaktikArrow from './TaktikArrow.svelte';
	import TaktikZone from './TaktikZone.svelte';

	/**
	 * @typedef {import('$lib/utils/taktikEngine.js').TaktikAnimation} TaktikAnimation
	 * @typedef {import('$lib/utils/taktikEngine.js').Arrow} Arrow
	 */

	/**
	 * @type {{
	 *   animation: TaktikAnimation,
	 *   positions: Record<string, {x: number, y: number}>,
	 *   arrows?: Arrow[],
	 *   showNumbersOnArrows?: boolean,
	 *   showZoneLabels?: boolean,
	 *   showCourtLabels?: boolean,
	 *   maxWidth?: number
	 * }}
	 */
	let {
		animation,
		positions,
		arrows = [],
		showNumbersOnArrows = false,
		showZoneLabels = true,
		showCourtLabels = true,
		maxWidth = 540,
	} = $props();

	// Felddimensionen im SVG
	const FIELD_W = 540;
	const FIELD_H_HALF = 540;
	const FIELD_H_FULL = 1080;

	const isHalf = $derived(animation.court === 'volleyball-half');
	const fieldHeight = $derived(isHalf ? FIELD_H_HALF : FIELD_H_FULL);
	const fieldWidth = FIELD_W;

	// ViewBox mit etwas Padding für Netzpfosten
	const padding = 12;
	const viewBox = $derived(`${-padding} ${-padding} ${fieldWidth + padding * 2} ${fieldHeight + padding * 2}`);

	// Aspect Ratio für responsives Sizing
	const aspectRatio = $derived(fieldWidth / fieldHeight);
</script>

<div class="taktik-board-wrapper" style="max-width: {maxWidth}px;">
	<svg
		viewBox={viewBox}
		class="taktik-board-svg"
		role="img"
		aria-label="Taktikboard"
		style="aspect-ratio: {aspectRatio}; width: 100%;"
	>
		<!-- Feld -->
		{#if isHalf}
			<CourtHalf showLabels={showCourtLabels} />
		{:else}
			<CourtFull showLabels={showCourtLabels} />
		{/if}

		<!-- Statische Zonen -->
		{#if animation.zones}
			{#each animation.zones as zone (zone.id)}
				<TaktikZone
					x={zone.x}
					y={zone.y}
					width={zone.width}
					height={zone.height}
					color={zone.color}
					label={showZoneLabels ? zone.label : undefined}
					{fieldWidth}
					fieldHeight={fieldHeight}
				/>
			{/each}
		{/if}

		<!-- Pfeile (unterhalb der Spieler) -->
		{#each arrows as arrow (arrow.objectId + '-' + arrow.stepIndex)}
			<TaktikArrow
				x1={arrow.x1}
				y1={arrow.y1}
				x2={arrow.x2}
				y2={arrow.y2}
				moveType={arrow.moveType}
				objectType={arrow.objectType}
				{fieldWidth}
				fieldHeight={fieldHeight}
				arrowIndex={arrow.arrowIndex}
				showNumber={showNumbersOnArrows}
			/>
		{/each}

		<!-- Objekte (Spieler + Ball) -->
		{#each Object.entries(animation.objects) as [id, obj] (id)}
			{@const pos = positions[id]}
			{#if pos}
				{#if obj.type === 'player'}
					<TaktikPlayer
						x={pos.x}
						y={pos.y}
						label={obj.label ?? id}
						team={obj.team ?? 'home'}
						{fieldWidth}
						fieldHeight={fieldHeight}
					/>
				{:else if obj.type === 'ball'}
					<TaktikBall
						x={pos.x}
						y={pos.y}
						{fieldWidth}
						fieldHeight={fieldHeight}
					/>
				{/if}
			{/if}
		{/each}
	</svg>
</div>

<style>
	.taktik-board-wrapper {
		width: 100%;
	}

	.taktik-board-svg {
		display: block;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
	}
</style>
