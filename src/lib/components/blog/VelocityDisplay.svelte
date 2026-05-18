<script>
// @ts-nocheck
import { handVelocityMax } from '$lib/stores/serviceVelocity.js';

/**
 * Zeigt einen live-aktualisierten Geschwindigkeitswert aus dem HandVelocityAnimation-Widget an.
 *
 * Props:
 *   factor  — Multiplikator (z.B. 0.6 für 60% des Maximalwerts), Default 1.0
 *   kmh     — wenn true, zeigt km/h in Klammern dahinter an
 */
let { factor = 1.0, kmh = false } = $props();
</script>

{#if $handVelocityMax > 0}
  {($handVelocityMax * factor).toFixed(1)} m/s{#if kmh} ({($handVelocityMax * factor * 3.6).toFixed(1)} km/h){/if}
{:else}
  — m/s
{/if}
