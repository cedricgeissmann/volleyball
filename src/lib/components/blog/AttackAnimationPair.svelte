<script>
	import AttackTimingAnimation from './AttackTimingAnimation.svelte';
	import AttackApproachAnimation from './AttackApproachAnimation.svelte';

	let timingResult = $state(/** @type {number|undefined} */ (undefined));
</script>

<AttackTimingAnimation oncomplete={(t) => (timingResult = t)} />

<AttackApproachAnimation externalSetTimeS={timingResult} />
