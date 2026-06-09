<script>
	/**
	 * Tau-Animation — veranschaulicht die optische Variable τ (Tau) für Time-to-Contact.
	 *
	 * Tau = θ / (dθ/dt)
	 *   θ      = aktueller optischer Winkel des Balls (proportional zu scheinbarer Grösse)
	 *   dθ/dt  = Ausdehnungsrate (wie schnell θ wächst)
	 *
	 * Physik: Ball bewegt sich mit konstanter Geschwindigkeit v auf den Beobachter zu.
	 * Startdistanz D(t) = D0 - v*t  →  θ(t) ≈ 2r/D(t)
	 * τ(t) = D(t)/v = (D0 - v*t)/v
	 * → τ nimmt linear ab bis 0 (Aufprall).
	 *
	 * Zufällige Ausdehnungsrate: v wird bei jedem Neustart zufällig gewählt (0.5–3 m/s),
	 * entspricht verschiedenen Servicetempis / Abstands-Situationen.
	 */

	// ─── Physik-Parameter ────────────────────────────────────────────────────────
	const BALL_RADIUS_M = 0.105;    // Volleyball-Radius in Metern
	const D0_MIN        = 6.0;      // Mindest-Startdistanz in Metern
	const D0_MAX        = 14.0;     // Maximal-Startdistanz in Metern
	const V_MIN         = 3.0;      // Mindestgeschwindigkeit m/s
	const V_MAX         = 18.0;     // Maximalgeschwindigkeit m/s (~65 km/h)

	// ─── Anzeigebereich ──────────────────────────────────────────────────────────
	// Ball-Grösse in SVG-Pixeln: proportional zu θ, skaliert auf den SVG-Bereich.
	// Bei Aufprall (D→0) hätte der Ball unendliche Grösse — wir stoppen bei D_STOP_M.
	const D_STOP_M = 0.3; // Ball "trifft" Beobachter bei dieser Distanz

	// ─── SVG-Layout ──────────────────────────────────────────────────────────────
	const SVG_W  = 560;
	const SVG_H  = 360;
	const CX     = SVG_W / 2;
	const CY     = SVG_H / 2 - 20; // Ball-Mittelpunkt leicht über Mitte

	// Maximaler Ball-Radius in SVG-Pixeln (entspricht D_STOP_M)
	// Bei D_STOP_M: θ = 2*r/D_STOP → als SVG-Radius skalieren auf ~0.85 * halbe SVG-Höhe
	const R_MAX_PX = SVG_H * 0.42;

	// ─── Zustand ─────────────────────────────────────────────────────────────────
	/** @type {'idle' | 'running' | 'impact'} */
	let phase    = $state('idle');
	let elapsed  = $state(0);     // Verstrichene Zeit seit Start in Sekunden
	let velocity = $state(0);     // Aktuell gewählte Geschwindigkeit m/s
	let d0       = $state(10.0);  // Startdistanz m

	/** @type {number | null} */
	let rafId     = null;
	let startTime = 0;

	// ─── Abgeleitete Grössen ─────────────────────────────────────────────────────
	// Aktuelle Distanz
	let distM = $derived(Math.max(D_STOP_M, d0 - velocity * elapsed));

	// Optischer Winkel (in Bogenmass, proportional zu scheinbarer Grösse)
	let theta = $derived(2 * BALL_RADIUS_M / distM);

	// Ausdehnungsrate: dθ/dt = 2*r*v / D^2
	let thetaDot = $derived(2 * BALL_RADIUS_M * velocity / (distM * distM));

	// Tau = θ / (dθ/dt) = D/v (Time-to-Contact in Sekunden)
	let tau = $derived(thetaDot > 0 ? theta / thetaDot : 0);

	// Ball-Radius in SVG-Pixeln: linear skaliert zwischen D0 und D_STOP
	// θ(D) = 2r/D  →  r_px(D) = R_MAX_PX * (D_STOP/D)
	let ballRadPx = $derived(R_MAX_PX * (D_STOP_M / distM));

	// Tau-Balken: von τ(D0) bis 0
	let tauTotal = $derived(d0 / velocity);
	let tauFrac  = $derived(tauTotal > 0 ? Math.min(1, tau / tauTotal) : 0);

	// Ausdehnungsrate in Anzeige-Einheit: %/s der Bildfeldgrösse → gut verständlich
	// Alternative: direkt in m/s Ballgeschwindigkeit
	// Wir zeigen θ̇ in 1/s (das ist physikalisch korrekt und lehrreich)
	let thetaDotDisplay = $derived(thetaDot.toFixed(3));

	// km/h Anzeige der Ballgeschwindigkeit
	let velocityKmh = $derived((velocity * 3.6).toFixed(1));

	// Farbcodierung: τ-abhängig (grün → gelb → rot)
	function getTauColor(/** @type {string} */ p, /** @type {number} */ t) {
		if (p === 'impact') return '#ef4444';
		if (t > 1.5) return '#16a34a';
		if (t > 0.8) return '#eab308';
		if (t > 0.4) return '#f97316';
		return '#ef4444';
	}
	let tauColor = $derived(() => getTauColor(phase, tau));

	// Hintergrundfarbe (leicht rot bei Aufprall)
	let bgColor = $derived(/** @type {string} */ (phase) === 'impact' ? '#fef2f2' : '#f8fafc');

	// ─── Steuerung ───────────────────────────────────────────────────────────────
	function pickRandom() {
		velocity = V_MIN + Math.random() * (V_MAX - V_MIN);
		d0       = D0_MIN + Math.random() * (D0_MAX - D0_MIN);
	}

	function start() {
		if (rafId !== null) cancelAnimationFrame(rafId);
		pickRandom();
		elapsed   = 0;
		phase     = 'running';
		startTime = performance.now();

		const totalDuration = (d0 - D_STOP_M) / velocity; // s

		/** @param {number} now */
		function frame(now) {
			const dt = (now - startTime) / 1000;
			elapsed = dt;

			if (dt >= totalDuration) {
				elapsed = totalDuration;
				phase   = 'impact';
				rafId   = null;
				return;
			}
			rafId = requestAnimationFrame(frame);
		}
		rafId = requestAnimationFrame(frame);
	}

	function reset() {
		if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
		elapsed = 0;
		phase   = 'idle';
	}

	$effect(() => () => { if (rafId !== null) cancelAnimationFrame(rafId); });

	// ─── SVG Hilfswerte ──────────────────────────────────────────────────────────
	// Tiefeneffekt: Gitterlinien, die sich zum Zentrum hin verjüngen
	const GRID_LINES = 8;
	/** Berechnet Perspektivgitter-Linien */
	function gridLines() {
		/** @type {string[]} */
		const lines = [];
		const vp = { x: CX, y: CY }; // Fluchtpunkt = Ballmitte
		for (let i = 0; i < GRID_LINES; i++) {
			const angle = (i / GRID_LINES) * Math.PI * 2;
			const ex = CX + Math.cos(angle) * SVG_W * 0.75;
			const ey = CY + Math.sin(angle) * SVG_H * 0.75;
			lines.push(`M ${vp.x} ${vp.y} L ${ex} ${ey}`);
		}
		return lines;
	}

	const GRID = gridLines();

	// ─── Tau-Balken ──────────────────────────────────────────────────────────────
	const BAR_X  = 30;
	const BAR_W  = SVG_W - 60;
	const BAR_Y  = SVG_H - 52;
	const BAR_H  = 12;
</script>

<div class="tau-wrapper">

	<!-- ── Kopfzeile ────────────────────────────────────────────────────────────── -->
	<div class="tau-header">
		<div class="tau-title-row">
			<span class="tau-label-key">τ (Tau)</span>
			<span class="tau-eq">= θ / (dθ/dt) = Distanz / Geschwindigkeit</span>
		</div>
		<p class="tau-subtitle">
			Das visuelle System schätzt die Zeit bis zum Aufprall direkt aus der optischen Ausdehnungsrate — ohne Distanz oder Geschwindigkeit explizit zu kennen.
		</p>
	</div>

	<!-- ── SVG ──────────────────────────────────────────────────────────────────── -->
	<div class="tau-svg-wrapper">
		<svg
			viewBox="0 0 {SVG_W} {SVG_H}"
			class="tau-svg"
			role="img"
			aria-label="Tau-Animation: Ball mit Time-to-Contact"
		>
			<!-- Hintergrund -->
			<rect width={SVG_W} height={SVG_H} fill={bgColor} rx="10" />

			<!-- Perspektivgitter (Fluchtpunkt = Ballmitte) -->
			{#each GRID as d}
				<path
					d={d}
					fill="none"
					stroke="#cbd5e1"
					stroke-width="1"
					opacity={phase === 'impact' ? 0.15 : 0.2}
				/>
			{/each}

			<!-- Boden-Linie (Horizont) -->
			<line
				x1={0} y1={CY + 60}
				x2={SVG_W} y2={CY + 60}
				stroke="#e2e8f0"
				stroke-width="1.5"
				stroke-dasharray="6,4"
				opacity="0.5"
			/>

			<!-- ╔══ Ball ═══════════════════════════════════════════════════════╗ -->
			{#if phase !== 'idle'}
				<!-- Schatten -->
				<ellipse
					cx={CX}
					cy={CY + 58}
					rx={ballRadPx * 0.6}
					ry={ballRadPx * 0.12}
					fill="#475569"
					opacity={0.08 * (ballRadPx / R_MAX_PX)}
				/>
				<!-- Ball -->
				<circle
					cx={CX}
					cy={CY}
					r={ballRadPx}
					fill="white"
					stroke={tauColor()}
					stroke-width={Math.max(1.5, ballRadPx * 0.06)}
				/>
				<!-- Volleyball-Linie horizontal -->
				<path
					d="M {CX - ballRadPx * 0.65} {CY} Q {CX} {CY - ballRadPx * 0.45} {CX + ballRadPx * 0.65} {CY}"
					fill="none"
					stroke="#94a3b8"
					stroke-width={Math.max(0.8, ballRadPx * 0.03)}
					opacity="0.7"
				/>
				<path
					d="M {CX - ballRadPx * 0.65} {CY} Q {CX} {CY + ballRadPx * 0.45} {CX + ballRadPx * 0.65} {CY}"
					fill="none"
					stroke="#94a3b8"
					stroke-width={Math.max(0.8, ballRadPx * 0.03)}
					opacity="0.7"
				/>
				<!-- Volleyball-Linie vertikal -->
				<line
					x1={CX} y1={CY - ballRadPx * 0.9}
					x2={CX} y2={CY + ballRadPx * 0.9}
					stroke="#e2e8f0"
					stroke-width={Math.max(0.6, ballRadPx * 0.025)}
					opacity="0.6"
				/>

				<!-- Aufprall-Flash -->
				{#if phase === 'impact'}
					<circle
						cx={CX}
						cy={CY}
						r={ballRadPx * 1.18}
						fill="none"
						stroke="#ef4444"
						stroke-width="4"
						opacity="0.45"
					/>
					<text
						x={CX}
						y={CY - ballRadPx - 18}
						text-anchor="middle"
						fill="#ef4444"
						font-size="22"
						font-family="sans-serif"
						font-weight="700"
					>Aufprall!</text>
				{/if}

			{:else}
				<!-- Idle: kleiner Platzhalter-Ball -->
				<circle cx={CX} cy={CY} r="22" fill="white" stroke="#cbd5e1" stroke-width="2" />
				<path
					d="M {CX - 14} {CY} Q {CX} {CY - 10} {CX + 14} {CY}"
					fill="none" stroke="#94a3b8" stroke-width="1.2" opacity="0.7"
				/>
				<path
					d="M {CX - 14} {CY} Q {CX} {CY + 10} {CX + 14} {CY}"
					fill="none" stroke="#94a3b8" stroke-width="1.2" opacity="0.7"
				/>
				<line x1={CX} y1={CY - 20} x2={CX} y2={CY + 20} stroke="#e2e8f0" stroke-width="1" opacity="0.6" />
				<text
					x={CX}
					y={CY + 50}
					text-anchor="middle"
					fill="#94a3b8"
					font-size="13"
					font-family="sans-serif"
				>Simulation starten →</text>
			{/if}

			<!-- ╔══ Tau-Countdown (gross) ═══════════════════════════════════════╗ -->
			{#if phase === 'running'}
				<text
					x={SVG_W - 20}
					y={40}
					text-anchor="end"
					fill={tauColor()}
					font-size="38"
					font-family="monospace"
					font-weight="700"
				>{tau.toFixed(2)}<tspan font-size="16" fill="#64748b"> s</tspan></text>
				<text
					x={SVG_W - 20}
					y={58}
					text-anchor="end"
					fill="#94a3b8"
					font-size="11"
					font-family="sans-serif"
				>Time-to-Contact τ</text>
			{:else if phase === 'impact'}
				<text
					x={SVG_W - 20}
					y={40}
					text-anchor="end"
					fill="#ef4444"
					font-size="38"
					font-family="monospace"
					font-weight="700"
				>0.00<tspan font-size="16" fill="#ef4444"> s</tspan></text>
				<text
					x={SVG_W - 20}
					y={58}
					text-anchor="end"
					fill="#ef4444"
					font-size="11"
					font-family="sans-serif"
				>Time-to-Contact τ</text>
			{/if}

			<!-- ╔══ Physik-Kennzahlen (oben links) ════════════════════════════╗ -->
			{#if phase !== 'idle'}
				<rect x={16} y={10} width={160} height={60} rx="7" fill="#1e293b" opacity="0.06" />
				<!-- θ̇ -->
				<text x={26} y={30} fill="#64748b" font-size="11" font-family="sans-serif">Ausdehnungsrate θ̇</text>
				<text x={26} y={46} fill="#1e293b" font-size="15" font-family="monospace" font-weight="700">
					{thetaDotDisplay} /s
				</text>
				<!-- Geschwindigkeit -->
				<text x={26} y={62} fill="#94a3b8" font-size="10" font-family="sans-serif">
					{velocityKmh} km/h · {d0.toFixed(1)} m Start
				</text>
			{/if}

			<!-- ╔══ Tau-Fortschrittsbalken (unten) ════════════════════════════╗ -->
			{#if phase !== 'idle'}
				<!-- Hintergrundbalken -->
				<rect
					x={BAR_X} y={BAR_Y}
					width={BAR_W} height={BAR_H}
					rx="6"
					fill="#e2e8f0"
				/>
				<!-- Füllbalken (schrumpft von rechts nach links) -->
				<rect
					x={BAR_X} y={BAR_Y}
					width={tauFrac * BAR_W} height={BAR_H}
					rx="6"
					fill={tauColor()}
					opacity="0.85"
				/>
				<!-- Tau-Marke (aktuelle Position) -->
				{#if phase === 'running'}
					<line
						x1={BAR_X + tauFrac * BAR_W}
						y1={BAR_Y - 5}
						x2={BAR_X + tauFrac * BAR_W}
						y2={BAR_Y + BAR_H + 5}
						stroke={tauColor()}
						stroke-width="2.5"
					/>
				{/if}
				<!-- Beschriftungen -->
				<text
					x={BAR_X}
					y={BAR_Y + BAR_H + 16}
					fill="#ef4444"
					font-size="10"
					font-family="sans-serif"
					font-weight="600"
				>Aufprall</text>
				<text
					x={BAR_X + BAR_W}
					y={BAR_Y + BAR_H + 16}
					text-anchor="end"
					fill="#16a34a"
					font-size="10"
					font-family="sans-serif"
					font-weight="600"
				>τ₀ = {tauTotal.toFixed(2)} s</text>
				<!-- Schwellenwerte-Marker -->
				{#each [{ thresh: 0.8, col: '#eab308', lbl: '0.8' }, { thresh: 1.5, col: '#16a34a', lbl: '1.5' }] as marker}
					{@const mx = BAR_X + (marker.thresh / tauTotal) * BAR_W}
					{#if mx < BAR_X + BAR_W && mx > BAR_X}
						<line
							x1={mx} y1={BAR_Y - 3}
							x2={mx} y2={BAR_Y + BAR_H + 3}
							stroke={marker.col}
							stroke-width="1.5"
							stroke-dasharray="3,2"
							opacity="0.7"
						/>
						<text
							x={mx}
							y={BAR_Y - 6}
							text-anchor="middle"
							fill={marker.col}
							font-size="9"
							font-family="sans-serif"
							opacity="0.85"
						>{marker.lbl}s</text>
					{/if}
				{/each}
			{/if}
		</svg>
	</div>

	<!-- ── Aktions-Zeile ─────────────────────────────────────────────────────── -->
	<div class="tau-action-row">
		{#if phase === 'idle' || phase === 'impact'}
			<button class="tau-start-btn" onclick={start}>
				{phase === 'impact' ? '↺ Neuer Versuch (zufällige Rate)' : '▶ Simulation starten'}
			</button>
		{:else}
			<button class="tau-reset-btn" onclick={reset}>■ Stop</button>
		{/if}
	</div>

	<!-- ── Info-Panel ────────────────────────────────────────────────────────── -->
	{#if phase !== 'idle'}
		<div class="tau-info-panel">
			<div class="tau-info-item">
				<span class="tau-info-label">Ballgeschwindigkeit</span>
				<span class="tau-info-value">{velocityKmh} km/h</span>
			</div>
			<div class="tau-info-divider"></div>
			<div class="tau-info-item">
				<span class="tau-info-label">Ausdehnungsrate θ̇</span>
				<span class="tau-info-value">{thetaDotDisplay} /s</span>
			</div>
			<div class="tau-info-divider"></div>
			<div class="tau-info-item">
				<span class="tau-info-label">Time-to-Contact τ</span>
				<span class="tau-info-value" style="color: {tauColor()}; font-size: 1.3rem;">
					{phase === 'impact' ? '0.00' : tau.toFixed(2)} s
				</span>
			</div>
			<div class="tau-info-divider"></div>
			<div class="tau-info-item">
				<span class="tau-info-label">Startdistanz</span>
				<span class="tau-info-value">{d0.toFixed(1)} m</span>
			</div>
		</div>
	{:else}
		<div class="tau-preview-panel">
			<span>τ = θ / θ̇ — direkt aus dem Bild, ohne Distanzmessung</span>
		</div>
	{/if}

	<!-- ── Erklärungsbox ─────────────────────────────────────────────────────── -->
	<div class="tau-explainer">
		<strong>Wie es funktioniert:</strong>
		Bei jedem Neustart wird eine zufällige Ballgeschwindigkeit ({(V_MIN * 3.6).toFixed(0)}–{(V_MAX * 3.6).toFixed(0)} km/h) und Startdistanz ({D0_MIN.toFixed(0)}–{D0_MAX.toFixed(0)} m) gewählt.
		Der Ball dehnt sich mit dieser Rate aus. τ ergibt sich rein aus dem visuellen Bild:
		je schneller die Ausdehnung, desto kleiner τ — unabhängig davon, ob du die Distanz oder die Geschwindigkeit kennst.
	</div>

</div>

<style>
	.tau-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	/* ── Header ────────────────────────────────────────────────────── */
	.tau-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.tau-title-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.tau-label-key {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
		font-family: 'Georgia', serif;
	}

	.tau-eq {
		font-size: 0.85rem;
		color: #64748b;
		font-family: monospace;
	}

	.tau-subtitle {
		font-size: 0.82rem;
		color: #64748b;
		margin: 0;
		line-height: 1.5;
	}

	/* ── SVG ────────────────────────────────────────────────────────── */
	.tau-svg-wrapper {
		width: 100%;
		overflow: hidden;
		border-radius: 0.5rem;
	}

	.tau-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	/* ── Aktions-Zeile ──────────────────────────────────────────────── */
	.tau-action-row {
		display: flex;
		justify-content: center;
	}

	.tau-start-btn,
	.tau-reset-btn {
		padding: 0.6rem 1.6rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.18s, transform 0.1s;
	}

	.tau-start-btn {
		background: var(--color-primary, #1e3a5f);
		color: white;
	}

	.tau-start-btn:hover {
		background: #2d5a8e;
		transform: translateY(-1px);
	}

	.tau-reset-btn {
		background: #e2e8f0;
		color: #475569;
	}

	.tau-reset-btn:hover {
		background: #cbd5e1;
	}

	/* ── Info-Panel ─────────────────────────────────────────────────── */
	.tau-info-panel {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 0;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		align-items: center;
	}

	.tau-info-item {
		display: flex;
		flex-direction: column;
		padding: 0 1rem;
	}

	.tau-info-item:first-child {
		padding-left: 0;
	}

	.tau-info-label {
		font-size: 0.72rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 500;
	}

	.tau-info-value {
		font-size: 1.1rem;
		font-weight: 700;
		color: #1e293b;
		font-family: monospace;
	}

	.tau-info-divider {
		width: 1px;
		height: 36px;
		background: #e2e8f0;
		flex-shrink: 0;
	}

	/* ── Preview-Panel ──────────────────────────────────────────────── */
	.tau-preview-panel {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.6rem 1rem;
		color: #64748b;
		font-size: 0.85rem;
		text-align: center;
		font-style: italic;
	}

	/* ── Erklärungsbox ──────────────────────────────────────────────── */
	.tau-explainer {
		background: #f0f9ff;
		border-left: 3px solid #0ea5e9;
		border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem;
		font-size: 0.82rem;
		color: #334155;
		line-height: 1.55;
	}

	.tau-explainer strong {
		color: #0369a1;
	}

	/* ── Responsive ─────────────────────────────────────────────────── */
	@media (max-width: 600px) {
		.tau-wrapper {
			padding: 1rem;
		}

		.tau-info-panel {
			flex-direction: column;
			gap: 0.5rem;
		}

		.tau-info-divider {
			width: 100%;
			height: 1px;
		}

		.tau-info-item {
			padding: 0;
		}

		.tau-label-key {
			font-size: 1.1rem;
		}
	}
</style>
