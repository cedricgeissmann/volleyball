<script>
	import { _ } from 'svelte-i18n';
	import QRCode from 'qrcode';

	// ─── Aspekte-Konfiguration ───────────────────────────────────────────────
	// stance ist jetzt IMMER sichtbar (kein Toggle), nur toss/ballFlight/servePosition togglebar
	let aspects = $state({
		toss: true,           // Aufwurf-Art
		ballFlight: true,     // Ballflugeigenschaften
		servePosition: false, // Aufschlagposition (inkl. Flugbahn) — standardmässig aus
	});

	// ─── Aspekt-Definitionen ─────────────────────────────────────────────────
	const stanceOptions = ['jump', 'stand'];

	const tossOptions = [
		{ id: 'high_no_spin',       label_de: 'Hoch, kein Drall',  label_en: 'High, no spin' },
		{ id: 'high_topspin',       label_de: 'Hoch, Topspin',     label_en: 'High, topspin' },
		{ id: 'high_sidespin_left', label_de: 'Hoch, Linksdrall',  label_en: 'High, left spin' },
		{ id: 'high_sidespin_right',label_de: 'Hoch, Rechtsdrall', label_en: 'High, right spin' },
		{ id: 'low_no_spin',        label_de: 'Tief, kein Drall',  label_en: 'Low, no spin' },
		{ id: 'low_topspin',        label_de: 'Tief, Topspin',     label_en: 'Low, topspin' },
		{ id: 'low_sidespin_left',  label_de: 'Tief, Linksdrall',  label_en: 'Low, left spin' },
		{ id: 'low_sidespin_right', label_de: 'Tief, Rechtsdrall', label_en: 'Low, right spin' },
		{ id: 'external',           label_de: 'Fremdzuwurf',       label_en: 'External toss' },
	];

	const ballFlightOptions = [
		{ id: 'low_net',   label_de: 'Knapp übers Netz', label_en: 'Just over the net' },
		{ id: 'high_net',  label_de: 'Hoch übers Netz',  label_en: 'High over the net' },
		{ id: 'with_spin', label_de: 'Mit Drall',         label_en: 'With spin' },
		{ id: 'no_spin',   label_de: 'Ohne Drall',        label_en: 'No spin' },
		{ id: 'float',     label_de: 'Flatterball',       label_en: 'Float ball' },
	];

	// Aufschlagpositionen: immer hinter der Grundlinie (y=1.0), nur x variiert
	const servePositions = [
		{ id: 'pos1',      x: 0.83, y: 1.0, label_de: 'Position 1',  label_en: 'Position 1' },
		{ id: 'pos6',      x: 0.50, y: 1.0, label_de: 'Position 6',  label_en: 'Position 6' },
		{ id: 'pos5',      x: 0.17, y: 1.0, label_de: 'Position 5',  label_en: 'Position 5' },
		{ id: 'pos_right', x: 0.92, y: 1.0, label_de: 'Rechte Ecke', label_en: 'Right corner' },
		{ id: 'pos_left',  x: 0.08, y: 1.0, label_de: 'Linke Ecke',  label_en: 'Left corner' },
	];

	// ─── Zielzonen ──────────────────────────────────────────────────────────
	// SVG obere Hälfte: y=0 = Grundlinie Gegner, y=0.5 = Netz
	// Feldtiefe = 9m → 60px/m → 540px pro Hälfte
	//
	// Tiefe-Definitionen (normalisiert 0–1 über ganzes SVG):
	//   Kurz  = 3.5m vom Netz → Landepunkt bei y = 0.5 - 3.5/9 * 0.5 ≈ 0.306
	//           Mittelpunkt kurze Zone: (0.306 + 0.5) / 2 ≈ 0.403
	//   Lang  = hinter der Kurz-Linie bis Grundlinie
	//           Mittelpunkt lange Zone: 0.306 / 2 ≈ 0.153
	//
	// x-Positionen (Feld 9m breit, Drittel à 3m):
	//   Linkes Drittel:  x ≈ 0.17   (Zonen 1/2)
	//   Mitte:           x ≈ 0.50   (Zonen 3/6)
	//   Rechtes Drittel: x ≈ 0.83   (Zonen 4/5)
	//   Zwischen links+mitte:  x ≈ 0.33
	//   Zwischen mitte+rechts: x ≈ 0.67
	//
	// Hinweis Spiegelung: Gegner steht uns gegenüber (180°)
	//   Gegner-Zone 1 (rechts hinten) → erscheint links im SVG (x=0.17)
	//   Gegner-Zone 5 (links hinten)  → erscheint rechts im SVG (x=0.83)

	// 3.5m-Linie: y = 0.5 - (3.5/9)*0.5 ≈ 0.306 (normalisiert, obere Hälfte)
	// "Kurz" = Ball landet HINTER der 3.5m-Linie (weiter von Netz weg als 3.5m)
	//   → Bereich: 0.306 bis ~0.0, Mittelpunkt nahe Linie: y ≈ 0.22
	// "Lang" = Ball landet noch weiter hinten (nahe Grundlinie)
	//   → Mittelpunkt: y ≈ 0.09
	const SHORT_LINE_Y = 0.5 - (3.5 / 9) * 0.5; // ≈ 0.306
	const Y_SHORT = SHORT_LINE_Y / 2 + SHORT_LINE_Y * 0.25; // ≈ 0.22  (kurz: direkt hinter 3.5m-Linie)
	const Y_LONG  = SHORT_LINE_Y * 0.28;                    // ≈ 0.086 (lang: nahe Grundlinie)

	const targetZones = [
		// ── Klassische Zonen (lang) ──
		{ id: 'z1_long', x: 0.17, y: Y_LONG,  label_de: 'Zone 1 lang', label_en: 'Zone 1 deep' },
		{ id: 'z5_long', x: 0.83, y: Y_LONG,  label_de: 'Zone 5 lang', label_en: 'Zone 5 deep' },
		{ id: 'z6_long', x: 0.50, y: Y_LONG,  label_de: 'Zone 6 lang', label_en: 'Zone 6 deep' },
		// ── Klassische Zonen (kurz, 3.5m vom Netz) ──
		{ id: 'z1_short', x: 0.17, y: Y_SHORT, label_de: 'Zone 1 kurz', label_en: 'Zone 1 short' },
		{ id: 'z5_short', x: 0.83, y: Y_SHORT, label_de: 'Zone 5 kurz', label_en: 'Zone 5 short' },
		{ id: 'z6_short', x: 0.50, y: Y_SHORT, label_de: 'Zone 6 kurz', label_en: 'Zone 6 short' },
		// ── Zwischenzonen (lang) ──
		{ id: 'z16_long', x: 0.33, y: Y_LONG,  label_de: 'Zwischen 1/6 lang', label_en: 'Between 1/6 deep' },
		{ id: 'z56_long', x: 0.67, y: Y_LONG,  label_de: 'Zwischen 5/6 lang', label_en: 'Between 5/6 deep' },
		// ── Zwischenzonen (kurz) ──
		{ id: 'z16_short', x: 0.33, y: Y_SHORT, label_de: 'Zwischen 1/6 kurz', label_en: 'Between 1/6 short' },
		{ id: 'z56_short', x: 0.67, y: Y_SHORT, label_de: 'Zwischen 5/6 kurz', label_en: 'Between 5/6 short' },
	];

	// Alle 6 Zonen-Positionen für Labels (Orientierungshilfe, immer klassische Zonenmitten)
	const allZoneLabels = [
		{ x: 0.17, y: 0.17, label: '1' },
		{ x: 0.17, y: 0.42, label: '2' },
		{ x: 0.50, y: 0.42, label: '3' },
		{ x: 0.83, y: 0.42, label: '4' },
		{ x: 0.83, y: 0.17, label: '5' },
		{ x: 0.50, y: 0.17, label: '6' },
	];

	// ─── Aktuelle Konfiguration ──────────────────────────────────────────────
	let currentConfig = $state(generateConfig());

	/** @param {any[]} arr */
	function pick(arr) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	function generateConfig() {
		return {
			toss:     pick(tossOptions),
			flight:   pick(ballFlightOptions),
			stance:   pick(stanceOptions),
			position: pick(servePositions),
			target:   pick(targetZones),
		};
	}

	function nextConfig() {
		currentConfig = generateConfig();
	}

	// ─── Timer ───────────────────────────────────────────────────────────────
	let timerEnabled   = $state(false);
	let timerSeconds   = $state(10);
	let timerCountdown = $state(timerSeconds);
	/** @type {ReturnType<typeof setInterval> | null} */
	let timerInterval = null;

	function startTimer() {
		stopTimer();
		timerCountdown = timerSeconds;
		timerInterval = setInterval(() => {
			timerCountdown -= 1;
			if (timerCountdown <= 0) {
				nextConfig();
				timerCountdown = timerSeconds;
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval !== null) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	$effect(() => {
		if (timerEnabled) {
			startTimer();
		} else {
			stopTimer();
			timerCountdown = timerSeconds;
		}
		return () => stopTimer();
	});

	$effect(() => {
		timerSeconds;
		if (timerEnabled) startTimer();
	});

	// ─── SVG-Konstanten ──────────────────────────────────────────────────────
	const SVG_W     = 540;
	const SVG_H     = 1080;
	const NET_Y     = 540;
	const SVG_EXTRA = 100;

	/** @param {number} nx */
	function fieldX(nx) { return nx * SVG_W; }
	/** @param {number} ny */
	function fieldY(ny) { return ny * SVG_H; }

	/** @param {{x: number, y: number}} pos @param {{x: number, y: number}} target */
	function ballArcPath(pos, target) {
		const x1 = fieldX(pos.x);
		const y1 = fieldY(pos.y);
		const x2 = fieldX(target.x);
		const y2 = fieldY(target.y);
		const mx  = (x1 + x2) / 2;
		const cy  = NET_Y - 80;
		return `M ${x1} ${y1} Q ${mx} ${cy} ${x2} ${y2}`;
	}

	// Sprachermittlung
	const lang = $derived.by(() => {
		if (typeof window !== 'undefined') {
			const parts = window.location.pathname.split('/').filter(Boolean);
			const lp    = parts[0] === 'volleyball' ? parts[1] : parts[0];
			return lp === 'en' ? 'en' : 'de';
		}
		return 'de';
	});

	/** @param {{label_de: string, label_en: string}} item */
	function label(item) {
		return lang === 'en' ? item.label_en : item.label_de;
	}

	// ─── QR-Code ────────────────────────────────────────────────────────────
	let showQr       = $state(false);
	let qrDataUrl    = $state('');
	let qrError      = $state(false);

	async function toggleQr() {
		if (showQr) {
			showQr = false;
			return;
		}
		qrError = false;
		qrDataUrl = '';
		showQr = true;
		try {
			const url = typeof window !== 'undefined' ? window.location.href : '';
			qrDataUrl = await QRCode.toDataURL(url, {
				width: 280,
				margin: 2,
				color: { dark: '#111111', light: '#ffffff' }
			});
		} catch {
			qrError = true;
		}
	}

	// Zielzonen-Label aufgeteilt: "Zone 1" | "kurz" bzw. "Zwischen 1/6" | "lang"
	const targetLabelLine1 = $derived.by(() => {
		const parts = label(currentConfig.target).split(' ');
		// Format DE: "Zone 1 kurz" / "Zwischen 1/6 lang"
		// Format EN: "Zone 1 short" / "Between 1/6 deep"
		// Letztes Wort = kurz/lang/short/deep → Rest = Zeile 1
		return parts.slice(0, -1).join(' ');
	});
	const targetLabelLine2 = $derived.by(() => {
		const parts = label(currentConfig.target).split(' ');
		return parts[parts.length - 1];
	});
</script>

<svelte:head>
	<title>{$_('nav_service_matrix')} - TV Muttenz Volleyball</title>
	<meta name="description" content={$_('sm_meta_desc')} />
</svelte:head>

<div class="page">
	<h1>{$_('nav_service_matrix')}</h1>

	<!-- ─── Stance (immer sichtbar, prominent) ─────────────────────────── -->
	<div class="stance-banner" class:jump={currentConfig.stance === 'jump'}>
		<span class="stance-icon">{currentConfig.stance === 'jump' ? '🏃' : '🧍'}</span>
		<span class="stance-text">
			{currentConfig.stance === 'jump' ? $_('sm_stance_jump') : $_('sm_stance_stand')}
		</span>
	</div>

	<!-- ─── Hauptbereich: Feld oben, Info darunter ──────────────────────── -->
	<div class="main-layout">

		<!-- Spielfeld-SVG -->
		<div class="court-wrapper">
			<svg
				viewBox="0 0 {SVG_W} {SVG_H + SVG_EXTRA}"
				class="court-svg"
				role="img"
				aria-label={$_('sm_court_aria')}
			>
				<defs>
					<filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.7)" />
					</filter>
					<filter id="label-shadow" x="-10%" y="-10%" width="120%" height="120%">
						<feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="rgba(0,0,0,0.5)" />
					</filter>
				</defs>

			<!-- ── Obere Hälfte (Gegnerseite) ── -->
			<rect x="0" y="0" width={SVG_W} height={NET_Y} fill="#3a7d44" />
			<!-- Angriffszone (0–3m vom Netz) etwas heller -->
			<rect x="0" y={NET_Y - 180} width={SVG_W} height="180" fill="#4a9955" />
			<!-- Feldlinien -->
			<rect x="0" y="0" width={SVG_W} height={NET_Y} fill="none" stroke="white" stroke-width="4" />
			<line x1="0" y1={NET_Y - 180} x2={SVG_W} y2={NET_Y - 180} stroke="white" stroke-width="3" />
			<!-- Mittellinie gestrichelt -->
			<line x1={SVG_W/2} y1="0" x2={SVG_W/2} y2={NET_Y - 180}
				stroke="white" stroke-width="2" stroke-dasharray="10,8" opacity="0.6" />
			<!-- "Gegner"-Label -->
			<text x={SVG_W/2} y="80"
				text-anchor="middle" fill="white" font-size="28" font-weight="600"
				font-family="sans-serif" filter="url(#text-shadow)" opacity="0.9"
			>{$_('sm_opponent')}</text>

			<!-- ── Zonen-Labels dauerhaft (Orientierung) ── -->
			{#each allZoneLabels as z}
				<text
					x={fieldX(z.x)}
					y={fieldY(z.y) + 12}
					text-anchor="middle"
					fill="white"
					font-size="52"
					font-weight="bold"
					font-family="sans-serif"
					filter="url(#label-shadow)"
					opacity="0.35"
				>{z.label}</text>
			{/each}

			<!-- ── Zielzone (immer sichtbar) ── -->
			<circle
				cx={fieldX(currentConfig.target.x)}
				cy={fieldY(currentConfig.target.y)}
				r="52"
				fill="rgba(255, 80, 0, 0.25)"
				stroke="#ff5000"
				stroke-width="4"
				stroke-dasharray="12,6"
			/>
			<circle
				cx={fieldX(currentConfig.target.x)}
				cy={fieldY(currentConfig.target.y)}
				r="15"
				fill="#ff5000"
				opacity="0.95"
			/>
			<!-- Zonen-Label: zwei Zeilen (Zonenname + kurz/lang) -->
			<text
				x={fieldX(currentConfig.target.x)}
				y={fieldY(currentConfig.target.y) - 62}
				text-anchor="middle"
				fill="white"
				font-size="28"
				font-weight="bold"
				font-family="sans-serif"
				filter="url(#text-shadow)"
			>{targetLabelLine1}</text>
			<text
				x={fieldX(currentConfig.target.x)}
				y={fieldY(currentConfig.target.y) - 32}
				text-anchor="middle"
				fill="#ffcc66"
				font-size="24"
				font-weight="bold"
				font-family="sans-serif"
				filter="url(#text-shadow)"
			>{targetLabelLine2}</text>

				<!-- ── Untere Hälfte (eigene Seite / Aufschläger) ── -->
				<rect x="0" y={NET_Y} width={SVG_W} height={NET_Y} fill="#1e4a7a" />
				<rect x="0" y={NET_Y} width={SVG_W} height="180" fill="#264f82" />
				<rect x="0" y={NET_Y} width={SVG_W} height={NET_Y} fill="none" stroke="white" stroke-width="4" />
				<line x1="0" y1={NET_Y + 180} x2={SVG_W} y2={NET_Y + 180} stroke="white" stroke-width="3" />
				<line x1={SVG_W/2} y1={NET_Y + 180} x2={SVG_W/2} y2={SVG_H}
					stroke="white" stroke-width="2" stroke-dasharray="10,8" opacity="0.6" />
				<text x={SVG_W/2} y={NET_Y + 260}
					text-anchor="middle" fill="white" font-size="28" font-weight="600"
					font-family="sans-serif" filter="url(#text-shadow)" opacity="0.9"
				>{$_('sm_server')}</text>

				<!-- ── Netz ── -->
				<rect x="0" y={NET_Y - 10} width={SVG_W} height="20" fill="#666" rx="2" />
				{#each Array(9) as _, i}
					<line x1={i * 60} y1={NET_Y - 10} x2={i * 60} y2={NET_Y + 10}
						stroke="#888" stroke-width="2" />
				{/each}
				<line x1="-8" y1={NET_Y - 28} x2="-8" y2={NET_Y + 10} stroke="#555" stroke-width="6" stroke-linecap="round" />
				<line x1={SVG_W + 8} y1={NET_Y - 28} x2={SVG_W + 8} y2={NET_Y + 10} stroke="#555" stroke-width="6" stroke-linecap="round" />

				<!-- ── Aufschlagposition + Flugbahn (nur wenn Toggle aktiv) ── -->
				{#if aspects.servePosition}
					<circle
						cx={fieldX(currentConfig.position.x)}
						cy={SVG_H + 36}
						r="28"
						fill="#1565C0"
						opacity="0.9"
					/>
					<text
						x={fieldX(currentConfig.position.x)}
						y={SVG_H + 46}
						text-anchor="middle"
						fill="white"
						font-size="28"
						font-family="sans-serif"
					>▲</text>
					<text
						x={fieldX(currentConfig.position.x)}
						y={SVG_H + 84}
						text-anchor="middle"
						fill="white"
						font-size="22"
						font-weight="bold"
						font-family="sans-serif"
						filter="url(#text-shadow)"
					>{label(currentConfig.position)}</text>
					<path
						d={ballArcPath({ x: currentConfig.position.x, y: 0.995 }, currentConfig.target)}
						fill="none"
						stroke="#ff5000"
						stroke-width="4"
						stroke-dasharray="14,9"
						opacity="0.75"
					/>
				{/if}
			</svg>
		</div>

		<!-- ─── Info + Controls ───────────────────────────────────────────── -->
		<div class="bottom-section">

			<!-- Info-Cards -->
			<div class="info-row">
				{#if aspects.toss}
				<div class="info-card">
					<div class="info-card-label">{$_('sm_aspect_toss')}</div>
					<div class="info-card-value">{label(currentConfig.toss)}</div>
				</div>
				{/if}

				{#if aspects.ballFlight}
				<div class="info-card">
					<div class="info-card-label">{$_('sm_aspect_ball_flight')}</div>
					<div class="info-card-value">{label(currentConfig.flight)}</div>
				</div>
				{/if}
			</div>

			<!-- Controls -->
			<div class="controls">
				<button class="btn-next" onclick={nextConfig}>
					{$_('sm_next')}
				</button>

				<div class="timer-section">
					<div class="timer-top">
						<label class="toggle-pill timer-toggle" class:active={timerEnabled}>
							<input type="checkbox" bind:checked={timerEnabled} />
							{$_('sm_timer_enable')}
						</label>

						{#if timerEnabled}
						<div class="timer-display">
							<span class="timer-countdown">{timerCountdown}</span>
							<span class="timer-unit">s</span>
						</div>
						{/if}
					</div>

					<div class="timer-config">
						<label for="timer-seconds">{$_('sm_timer_seconds')}:</label>
						<input
							id="timer-seconds"
							type="number"
							min="3"
							max="120"
							bind:value={timerSeconds}
							class="timer-input"
						/>
					</div>
				</div>
			</div>

			<!-- Aspekte-Toggles -->
			<div class="toggles-bar">
				<span class="toggles-label">{$_('sm_show_aspects')}:</span>
				<label class="toggle-pill" class:active={aspects.toss}>
					<input type="checkbox" bind:checked={aspects.toss} />
					{$_('sm_aspect_toss')}
				</label>
				<label class="toggle-pill" class:active={aspects.ballFlight}>
					<input type="checkbox" bind:checked={aspects.ballFlight} />
					{$_('sm_aspect_ball_flight')}
				</label>
				<label class="toggle-pill" class:active={aspects.servePosition}>
					<input type="checkbox" bind:checked={aspects.servePosition} />
					{$_('sm_aspect_serve_position')}
				</label>
			</div>

			<!-- QR-Code -->
			<button class="btn-qr" onclick={toggleQr}>
				{showQr ? $_('sm_qr_hide') : $_('sm_qr_show')}
			</button>

			{#if showQr}
			<div class="qr-panel">
				<p class="qr-title">{$_('sm_qr_title')}</p>
				{#if qrError}
					<p class="qr-error">{$_('qr_error')}</p>
				{:else if qrDataUrl}
					<img src={qrDataUrl} alt="QR-Code" class="qr-img" />
					<p class="qr-hint">{$_('sm_qr_hint')}</p>
				{:else}
					<p class="qr-loading">{$_('qr_loading')}</p>
				{/if}
			</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-md) var(--space-md);
	}

	h1 {
		color: var(--color-primary);
		font-size: var(--font-size-2xl);
		margin-bottom: var(--space-sm);
	}

	/* ── Stance Banner (immer sichtbar) ── */
	.stance-banner {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		background: #e8f5e9;
		border: 2px solid #43a047;
		margin-bottom: var(--space-md);
		transition: all 0.2s ease;
	}

	.stance-banner.jump {
		background: #fff3e0;
		border-color: #fb8c00;
	}

	.stance-icon {
		font-size: 2rem;
		line-height: 1;
	}

	.stance-text {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
	}

	/* ── Layout ── */
	.main-layout {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	/* ── Court SVG ── */
	.court-wrapper {
		background: #1a3a5c;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;
		/* Auf Handy: Feld auf ~55% der Viewport-Höhe beschränken */
		max-height: 55svh;
		display: flex;
		align-items: stretch;
	}

	.court-svg {
		width: 100%;
		height: auto;
		display: block;
		max-height: 55svh;
		object-fit: contain;
	}

	/* ── Bottom Section ── */
	.bottom-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	/* ── Toggles-Bar ── */
	.toggles-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-gray-50);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
	}

	.toggles-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
	}

	.toggle-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 12px;
		border-radius: 999px;
		border: 1.5px solid var(--color-gray-300);
		background: white;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
		user-select: none;
	}

	.toggle-pill input { display: none; }

	.toggle-pill.active {
		border-color: var(--color-primary);
		background: rgba(255, 53, 0, 0.08);
		color: var(--color-primary);
	}

	.toggle-pill:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* ── Info Row ── */
	.info-row {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.info-card {
		flex: 1;
		min-width: 130px;
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		box-shadow: var(--shadow-sm);
	}

	.info-card-label {
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--color-text-muted);
		margin-bottom: 2px;
		font-weight: var(--font-weight-medium);
	}

	.info-card-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		line-height: 1.2;
	}

	/* ── Controls ── */
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.btn-next {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		cursor: pointer;
		transition: background var(--transition-fast), transform var(--transition-fast);
	}

	.btn-next:hover  { background: var(--color-primary-hover); transform: translateY(-1px); }
	.btn-next:active { transform: translateY(0); }

	.timer-section {
		background: var(--color-gray-50);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.timer-top {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.timer-toggle { align-self: flex-start; }

	.timer-display {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.timer-countdown {
		font-size: 2.2rem;
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
		line-height: 1;
	}

	.timer-unit {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
	}

	.timer-config {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.timer-input {
		width: 64px;
		padding: 4px 8px;
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		text-align: center;
	}

	/* ── QR-Code ── */
	.btn-qr {
		width: 100%;
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		color: var(--color-text-secondary);
		border: 1.5px solid var(--color-gray-300);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: border-color var(--transition-fast), color var(--transition-fast);
	}

	.btn-qr:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.qr-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
	}

	.qr-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-bold);
		color: var(--color-text);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.qr-img {
		width: 200px;
		height: 200px;
		border-radius: var(--radius-sm);
	}

	.qr-hint {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
	}

	.qr-loading,
	.qr-error {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.qr-error { color: var(--color-primary); }

	/* ── Grosse Bildschirme: nebeneinander ── */
	@media (min-width: 900px) {
		.page {
			max-width: 1100px;
		}

		.main-layout {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: var(--space-xl);
			align-items: start;
		}

		.court-wrapper,
		.court-svg {
			max-height: none;
		}
	}
</style>
