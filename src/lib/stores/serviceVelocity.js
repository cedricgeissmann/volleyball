import { writable } from 'svelte/store';

// Maximale Handgeschwindigkeit aus HandVelocityAnimation (m/s)
// Wird vom Widget geschrieben, vom Blog-Text gelesen
export const handVelocityMax = writable(0);
