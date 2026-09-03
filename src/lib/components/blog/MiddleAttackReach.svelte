<script>
	/**
	 * Angriff durch die Mitte — der Schwerpunkt-Trick
	 *
	 * Ein schneller Ball ("Schuss-Pass") hat eine hohe x-Geschwindigkeit parallel
	 * zum Netz. Der Schlagarm ist zu langsam, um den Ball im Schlagfenster zu
	 * erreichen — ausser der Angreifer driftet im Sprung mit dem Ball mit und
	 * senkt so die relative x-Geschwindigkeit unter die kritische Grenze.
	 *
	 * Zahlen (anschaulich, grössenordnungsrichtig):
	 *   Schlagfenster horizontal:      ~0.50 m
	 *   Armkorrektur-Zeit im Sprung:   ~0.25 s
	 *   → kritische relative x-Geschw.: 0.50 / 0.25 = 2.0 m/s
	 *   Schuss-Pass x-Geschwindigkeit:  ~4.0 m/s
	 *   Seitwärtsdrift des Angreifers:  0 … 2.0 m/s
	 */

	const WINDOW_M = 0.50;
	const ARM_TIME_S = 0.25;
	const CRITICAL = WINDOW_M / ARM_TIME_S; // 2.0 m/s
	const BALL_VX = 4.0;                     // Schuss-Pass

	let drift = $state(0);                   // m/s Seitwärtsdrift des Angreifers
	let relVx = $derived(BALL_VX - drift);
	let reachable = $derived(relVx <= CRITICAL);
	let margin = $derived(CRITICAL - relVx);

	// Balkenlänge relativ (0..BALL_VX)
	function pct(/** @type {number} */ v) { return Math.max(0, Math.min(100, (v / BALL_VX) * 100)); }
</script>

<div class="ma-wrap">
	<div class="ma-head">
		<h4>Angriff durch die Mitte: den Ball mit dem Schwerpunkt einholen</h4>
		<p>Ein Schuss-Pass hat viel x-Geschwindigkeit. Der Schlagarm allein ist zu langsam.
		Driftest du im Sprung nach links mit, sinkt die relative Geschwindigkeit — bis der Ball
		wieder im Schlagfenster liegt.</p>
	</div>

	<div class="ma-numbers">
		<div class="ma-num"><span class="ma-num-v">{WINDOW_M.toFixed(2)} m</span><span class="ma-num-l">Schlagfenster</span></div>
		<div class="ma-op">÷</div>
		<div class="ma-num"><span class="ma-num-v">{ARM_TIME_S.toFixed(2)} s</span><span class="ma-num-l">Arm-Reaktionszeit</span></div>
		<div class="ma-op">=</div>
		<div class="ma-num highlight"><span class="ma-num-v">{CRITICAL.toFixed(1)} m/s</span><span class="ma-num-l">kritische Grenze</span></div>
	</div>

	<!-- Balken -->
	<div class="ma-bars">
		<div class="ma-bar-row">
			<span class="ma-bar-lbl">Ball (Schuss-Pass)</span>
			<div class="ma-track"><div class="ma-fill ball" style="width:{pct(BALL_VX)}%"></div></div>
			<span class="ma-bar-v">{BALL_VX.toFixed(1)} m/s</span>
		</div>
		<div class="ma-bar-row">
			<span class="ma-bar-lbl">− dein Drift</span>
			<div class="ma-track"><div class="ma-fill drift" style="width:{pct(drift)}%"></div></div>
			<span class="ma-bar-v">{drift.toFixed(1)} m/s</span>
		</div>
		<div class="ma-bar-row">
			<span class="ma-bar-lbl">= relativ</span>
			<div class="ma-track">
				<div class="ma-crit" style="left:{pct(CRITICAL)}%"></div>
				<div class="ma-fill rel" class:ok={reachable} style="width:{pct(relVx)}%"></div>
			</div>
			<span class="ma-bar-v" style="color:{reachable ? '#16a34a' : '#ef4444'}">{relVx.toFixed(1)} m/s</span>
		</div>
	</div>

	<div class="ma-verdict" style="background:{reachable ? '#f0fdf4' : '#fef2f2'}; border-color:{reachable ? '#16a34a' : '#ef4444'}">
		{#if reachable}
			✅ <b>Erreichbar.</b> Die relative Geschwindigkeit ({relVx.toFixed(1)} m/s) liegt {margin.toFixed(1)} m/s
			unter der Grenze — der Arm holt den Ball im Schlagfenster ein.
		{:else}
			❌ <b>Zu schnell.</b> Die relative Geschwindigkeit ({relVx.toFixed(1)} m/s) liegt {(-margin).toFixed(1)} m/s
			über der Grenze — mehr mit dem Ball mitdriften.
		{/if}
	</div>

	<label class="ma-slider">
		<span>Seitwärtsdrift des Angreifers: {drift.toFixed(1)} m/s</span>
		<input type="range" min="0" max="2.5" step="0.1" bind:value={drift} />
	</label>

	<div class="ma-note">
		<strong>Der Trick:</strong> Von rechts nach links laufen und im Sprung leicht mitdriften. Kombiniert
		mit Hangtime (y-Geschwindigkeit ≈ 0) bleibt der Schwerpunkt stabil — und du triffst den Ball sauber
		im Fenster.
	</div>
</div>

<style>
	.ma-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.ma-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.ma-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.ma-numbers {
		display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.5rem;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.8rem;
	}
	.ma-num { display: flex; flex-direction: column; align-items: center; padding: 0 0.6rem; }
	.ma-num-v { font-family: monospace; font-weight: 700; font-size: 1.05rem; color: #1e293b; }
	.ma-num-l { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; }
	.ma-num.highlight .ma-num-v { color: #dc2626; }
	.ma-op { font-size: 1.2rem; color: #94a3b8; font-weight: 700; }
	.ma-bars { display: flex; flex-direction: column; gap: 0.55rem; }
	.ma-bar-row { display: grid; grid-template-columns: 130px 1fr 70px; align-items: center; gap: 0.6rem; }
	.ma-bar-lbl { font-size: 0.8rem; color: #475569; text-align: right; }
	.ma-track { position: relative; height: 16px; background: #eef2f7; border-radius: 8px; overflow: visible; }
	.ma-fill { height: 100%; border-radius: 8px; transition: width 0.15s; }
	.ma-fill.ball { background: #f59e0b; }
	.ma-fill.drift { background: #2563eb; }
	.ma-fill.rel { background: #ef4444; }
	.ma-fill.rel.ok { background: #16a34a; }
	.ma-crit { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #dc2626; z-index: 2; }
	.ma-crit::after {
		content: 'Grenze'; position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
		font-size: 0.6rem; color: #dc2626; white-space: nowrap;
	}
	.ma-bar-v { font-family: monospace; font-weight: 700; font-size: 0.85rem; text-align: right; }
	.ma-verdict { border: 1px solid; border-radius: 0.5rem; padding: 0.7rem 1rem; font-size: 0.85rem; color: #334155; line-height: 1.5; }
	.ma-slider { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.82rem; color: #475569; }
	.ma-slider input { width: 100%; }
	.ma-note {
		background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #334155; line-height: 1.55;
	}
	.ma-note strong { color: #0369a1; }
	@media (max-width: 640px) {
		.ma-wrap { padding: 1rem; }
		.ma-bar-row { grid-template-columns: 90px 1fr 60px; }
		.ma-numbers { gap: 0.3rem; }
	}
</style>
