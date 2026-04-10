<script>
	import { calculatePositions } from '$lib/utils/animationEngine.js';

	let {
		joints = {},
		scale = 1,
		color = '#333',
		strokeWidth = 3
	} = $props();

	// Berechne Positionen basierend auf Gelenk-Winkeln
	let positions = $derived(calculatePositions(joints));

	// ViewBox berechnen (zentriert um den Körper)
	const padding = 20;
	const viewBoxWidth = 200;
	const viewBoxHeight = 250;
	const centerX = 0;
	const centerY = 0;
</script>

<svg
	viewBox="{centerX - viewBoxWidth/2} {centerY - viewBoxHeight/2} {viewBoxWidth} {viewBoxHeight}"
	class="stickfigure"
	style:--scale={scale}
	style:--color={color}
	style:--stroke-width="{strokeWidth}px"
>
	<!-- Torso (Hüfte zu Brust) -->
	<line
		x1={positions.hip.x}
		y1={positions.hip.y}
		x2={positions.chest.x}
		y2={positions.chest.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Hals -->
	<line
		x1={positions.chest.x}
		y1={positions.chest.y}
		x2={positions.neck.x}
		y2={positions.neck.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Kopf -->
	<circle
		cx={positions.head.x}
		cy={positions.head.y}
		r="15"
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		fill="none"
	/>

	<!-- Linker Arm -->
	<line
		x1={positions.leftShoulder.x}
		y1={positions.leftShoulder.y}
		x2={positions.leftElbow.x}
		y2={positions.leftElbow.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.leftElbow.x}
		y1={positions.leftElbow.y}
		x2={positions.leftWrist.x}
		y2={positions.leftWrist.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.leftWrist.x}
		y1={positions.leftWrist.y}
		x2={positions.leftHand.x}
		y2={positions.leftHand.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Rechter Arm -->
	<line
		x1={positions.rightShoulder.x}
		y1={positions.rightShoulder.y}
		x2={positions.rightElbow.x}
		y2={positions.rightElbow.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.rightElbow.x}
		y1={positions.rightElbow.y}
		x2={positions.rightWrist.x}
		y2={positions.rightWrist.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.rightWrist.x}
		y1={positions.rightWrist.y}
		x2={positions.rightHand.x}
		y2={positions.rightHand.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Linkes Bein -->
	<line
		x1={positions.leftHipJoint.x}
		y1={positions.leftHipJoint.y}
		x2={positions.leftKnee.x}
		y2={positions.leftKnee.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.leftKnee.x}
		y1={positions.leftKnee.y}
		x2={positions.leftAnkleJoint.x}
		y2={positions.leftAnkleJoint.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.leftAnkleJoint.x}
		y1={positions.leftAnkleJoint.y}
		x2={positions.leftFoot.x}
		y2={positions.leftFoot.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Rechtes Bein -->
	<line
		x1={positions.rightHipJoint.x}
		y1={positions.rightHipJoint.y}
		x2={positions.rightKnee.x}
		y2={positions.rightKnee.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.rightKnee.x}
		y1={positions.rightKnee.y}
		x2={positions.rightAnkleJoint.x}
		y2={positions.rightAnkleJoint.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>
	<line
		x1={positions.rightAnkleJoint.x}
		y1={positions.rightAnkleJoint.y}
		x2={positions.rightFoot.x}
		y2={positions.rightFoot.y}
		stroke="var(--color)"
		stroke-width="var(--stroke-width)"
		stroke-linecap="round"
	/>

	<!-- Gelenk-Punkte (optional für Debugging) -->
	{#if false}
		{#each Object.entries(positions) as [name, pos]}
			<circle cx={pos.x} cy={pos.y} r="2" fill="red" />
		{/each}
	{/if}
</svg>

<style>
	.stickfigure {
		width: 100%;
		height: 100%;
		max-width: 300px;
		max-height: 300px;
	}
</style>
