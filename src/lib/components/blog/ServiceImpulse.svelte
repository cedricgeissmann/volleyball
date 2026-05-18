<script>
	// @ts-nocheck
	/**
	 * ServiceImpulse.svelte
	 *
	 * Widget zur Impulserhaltung beim Aufschlag.
	 * Zeigt die volle elastische Stoßformel:
	 *   v_ball = 2M / (M + m) × v_hand
	 * Benutzer kann Körpergewicht einstellen und sieht,
	 * dass der Faktor 2M/(M+m) für alle realistischen Werte ≈ 2 ist.
	 */

	// ─── Konstanten ───────────────────────────────────────────────────────────────
	const BALL_MASS = 0.27;   // kg (FIVB)
	const V_HAND    = 16.0;   // m/s — typischer Biomechanik-Spitzenwert

	const BODY_MASS_MIN = 50;
	const BODY_MASS_MAX = 110;
	const BODY_MASS_DEF = 75;

	// ─── LocalStorage ─────────────────────────────────────────────────────────────
	const LS_KEY = 'vb_service_impulse_v3';
	function load() {
		try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
	}
	function save(s) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
	}

	const saved = load();
	let bodyMass = $state(saved?.bodyMass ?? BODY_MASS_DEF);

	// ─── Physik ────────────────────────────────────────────────────────────────────
	// Vollständige elastische Stoßformel (M >> m Grenzfall):
	//   v_ball = 2M / (M + m) × v_hand
	let factor = $derived((2 * bodyMass) / (bodyMass + BALL_MASS));
	let vBall  = $derived(factor * V_HAND);
	let vKmh   = $derived(vBall * 3.6);
	let pBall  = $derived(BALL_MASS * vBall);

	// Zum Vergleich: Faktor bei 50 und 110 kg
	let factor50  = $derived((2 * 50)  / (50  + BALL_MASS));
	let factor110 = $derived((2 * 110) / (110 + BALL_MASS));

	let speedColor = $derived(
		vBall < 20 ? '#64748b' :
		vBall < 25 ? '#16a34a' :
		vBall < 30 ? '#d97706' : '#dc2626'
	);

	const V_BALL_REF = (2 * 110) / (110 + BALL_MASS) * V_HAND; // max bei 110 kg
	let barWidth = $derived((vBall / V_BALL_REF) * 100);

	$effect(() => { save({ bodyMass }); });
</script>

<div class="si-wrapper">

	<!-- ── Formel ─────────────────────────────────────────────────────────────── -->
	<div class="si-formula-block">
		<div class="si-formula-line">
			<span class="si-f-var">v<sub>Ball</sub></span>
			<span class="si-f-eq">=</span>
			<div class="si-f-fraction">
				<span class="si-f-num">2 × M<sub>Körper</sub></span>
				<span class="si-f-den">M<sub>Körper</sub> + m<sub>Ball</sub></span>
			</div>
			<span class="si-f-op">×</span>
			<span class="si-f-term">v<sub>Hand</sub></span>
		</div>
		<div class="si-formula-vals">
			<span class="si-f-val">
				<span class="si-f-fraction-sm">
					<span>2 × {bodyMass}</span>
					<span>{bodyMass} + {BALL_MASS * 1000} g</span>
				</span>
			</span>
			<span class="si-f-sep">×</span>
			<span class="si-f-val">{V_HAND.toFixed(0)} m/s</span>
			<span class="si-f-sep">=</span>
			<span class="si-f-result" style="color: {speedColor}">
				{vBall.toFixed(1)} m/s
			</span>
		</div>
	</div>

	<!-- ── Slider ─────────────────────────────────────────────────────────────── -->
	<div class="si-row">
		<div class="si-row-top">
			<span class="si-label">Körpergewicht</span>
			<span class="si-slider-val">{bodyMass} kg</span>
		</div>
		<input type="range" class="si-slider"
			min={BODY_MASS_MIN} max={BODY_MASS_MAX} step="1"
			bind:value={bodyMass} />
		<div class="si-factor-line">
			Faktor <code>2M/(M+m)</code> = <strong>{factor.toFixed(4)}</strong>
			<span class="si-factor-range">
				(bei 50 kg: {factor50.toFixed(4)} — bei 110 kg: {factor110.toFixed(4)})
			</span>
		</div>
	</div>

	<!-- ── Ergebnis ───────────────────────────────────────────────────────────── -->
	<div class="si-result">
		<div class="si-result-bar-track">
			<div class="si-result-bar-fill"
				style="width: {barWidth.toFixed(1)}%; background: {speedColor};">
			</div>
		</div>
		<div class="si-result-nums">
			<div class="si-result-item">
				<span class="si-result-key">Faktor</span>
				<span class="si-result-val">{factor.toFixed(4)}</span>
			</div>
			<div class="si-result-divider"></div>
			<div class="si-result-item">
				<span class="si-result-key">Ballimpuls</span>
				<span class="si-result-val" style="color: {speedColor}">{pBall.toFixed(3)} <span class="si-unit">kg·m/s</span></span>
			</div>
			<div class="si-result-divider"></div>
			<div class="si-result-item">
				<span class="si-result-key">Ballgeschwindigkeit</span>
				<span class="si-result-val" style="color: {speedColor}">
					{vBall.toFixed(1)} m/s
					<span class="si-unit">/ {vKmh.toFixed(0)} km/h</span>
				</span>
			</div>
		</div>
	</div>

	<!-- ── Hinweis ────────────────────────────────────────────────────────────── -->
	<div class="si-note">
		Der Faktor <code>2M/(M+m)</code> konvergiert gegen 2 sobald M ≫ m.
		Da m<sub>Ball</sub> = 270 g und M<sub>Körper</sub> ≥ 50 kg, liegt der Faktor immer zwischen
		{factor50.toFixed(3)} und {factor110.toFixed(3)} — eine Differenz von weniger als 0,3%.
		Das Körpergewicht ist beim Aufschlag irrelevant.
	</div>

</div>

<style>
	.si-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	/* ── Formel ─────────────────────────────────────────── */
	.si-formula-block {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		align-items: center;
	}
	.si-formula-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Courier New', monospace;
	}
	.si-f-var {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
	}
	.si-f-eq {
		font-size: 1.1rem;
		color: #64748b;
	}
	.si-f-fraction {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		font-family: 'Courier New', monospace;
	}
	.si-f-num {
		font-size: 0.9rem;
		font-weight: 600;
		color: #1e293b;
		border-bottom: 1.5px solid #64748b;
		padding: 0 0.3rem 2px;
		white-space: nowrap;
	}
	.si-f-den {
		font-size: 0.9rem;
		color: #1e293b;
		padding: 0 0.3rem;
		white-space: nowrap;
	}
	.si-f-op { font-size: 0.9rem; color: #94a3b8; }
	.si-f-term {
		font-size: 1rem;
		font-weight: 600;
		color: #1e293b;
		background: #e2e8f0;
		border-radius: 0.25rem;
		padding: 0.15rem 0.45rem;
	}
	.si-formula-vals {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: 'Courier New', monospace;
		font-size: 0.82rem;
		color: #64748b;
	}
	.si-f-fraction-sm {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		font-size: 0.78rem;
	}
	.si-f-fraction-sm span:first-child {
		border-bottom: 1px solid #94a3b8;
		padding: 0 0.2rem 1px;
		white-space: nowrap;
	}
	.si-f-fraction-sm span:last-child {
		padding: 0 0.2rem;
		white-space: nowrap;
	}
	.si-f-val { font-weight: 600; color: #475569; }
	.si-f-sep { color: #94a3b8; }
	.si-f-result {
		font-size: 1.1rem;
		font-weight: 700;
		font-family: 'Courier New', monospace;
	}

	/* ── Slider ─────────────────────────────────────────── */
	.si-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.si-row-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.si-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1e293b;
		font-family: inherit;
	}
	.si-slider {
		width: 100%;
		accent-color: #475569;
		cursor: pointer;
	}
	.si-slider-val {
		font-size: 0.9rem;
		font-weight: 700;
		color: #1e293b;
		font-family: 'Courier New', monospace;
	}
	.si-factor-line {
		font-size: 0.78rem;
		color: #475569;
		font-family: 'Courier New', monospace;
	}
	.si-factor-range {
		font-size: 0.72rem;
		color: #94a3b8;
		margin-left: 0.5rem;
	}

	/* ── Ergebnis ────────────────────────────────────────── */
	.si-result { display: flex; flex-direction: column; gap: 0.5rem; }
	.si-result-bar-track {
		height: 10px;
		background: #e2e8f0;
		border-radius: 5px;
		overflow: hidden;
	}
	.si-result-bar-fill {
		height: 100%;
		border-radius: 5px;
		transition: width 150ms ease, background 150ms ease;
	}
	.si-result-nums {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		flex-wrap: wrap;
	}
	.si-result-item { display: flex; flex-direction: column; gap: 2px; }
	.si-result-key {
		font-size: 0.68rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		font-family: inherit;
	}
	.si-result-val {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
		font-family: 'Courier New', monospace;
	}
	.si-unit { font-size: 0.7rem; font-weight: 400; color: #94a3b8; }
	.si-result-divider { width: 1px; height: 36px; background: #e2e8f0; }

	/* ── Hinweis ──────────────────────────────────────────── */
	.si-note {
		font-size: 0.8rem;
		color: #64748b;
		font-family: inherit;
		line-height: 1.5;
		background: #f8fafc;
		border-left: 3px solid #e2e8f0;
		padding: 0.6rem 0.9rem;
		border-radius: 0 0.375rem 0.375rem 0;
	}
	.si-note code {
		font-family: 'Courier New', monospace;
		font-size: 0.78rem;
		background: #e2e8f0;
		padding: 0.05rem 0.3rem;
		border-radius: 0.2rem;
	}

	/* ── Responsive ───────────────────────────────────────── */
	@media (max-width: 600px) {
		.si-wrapper { padding: 1rem; }
		.si-result-nums { gap: 0.75rem; }
		.si-formula-line { flex-wrap: wrap; justify-content: center; }
	}
</style>
