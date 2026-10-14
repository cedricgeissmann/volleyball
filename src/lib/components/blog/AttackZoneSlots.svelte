<script>
	/**
	 * Angriff: zum Ball springen vs. in die Zone springen
	 *
	 * Frontalansicht auf das Netz. Oben läuft die Aktion ab, unten zeigt ein
	 * Balken, was in jeder Phase im Arbeitsspeicher liegt.
	 *
	 *  - Modus "zum Ball": Anlauf und Absprung werden laufend an den Ball
	 *    angepasst. Timing und Position fressen bis zum Schlag alle Slots,
	 *    Technik und Ziel sind längst verdrängt.
	 *  - Modus "in die Zone": Der Absprungpunkt steht vorher fest. Nach dem
	 *    Anlauf wird der Timing-Slot frei, nach dem Absprung der Zonen-Slot —
	 *    im Schlag sind Technik und Ziel noch da.
	 */

	// ─── Geometrie (Frontalansicht) ──────────────────────────────────────────────
	const PPM = 42;
	const X_MIN = -5.0, X_MAX = 2.6;
	const Y_MAX = 4.0;
	const SVG_W = (X_MAX - X_MIN) * PPM;
	const SVG_H = Y_MAX * PPM + 34;

	const NET_H = 2.43;
	const ZONE_X = -3.0;          // Mitte der Angriffszone (Zone 4)
	const ZONE_W = 1.0;           // Breite der Zone
	const REACH = 0.55;           // seitliches Schlagfenster im Sprung
	const SETTER_X = 1.1, SETTER_Y = 2.25;

	/** @param {number} xm */ function fx(xm) { return (xm - X_MIN) * PPM; }
	/** @param {number} ym */ function fy(ym) { return Y_MAX * PPM - ym * PPM; }

	// ─── Modus & Pass-Streuung ───────────────────────────────────────────────────
	/** @type {'ball'|'zone'} */
	let mode = $state(/** @type {'ball'|'zone'} */ ('ball'));
	let spread = $state(0.35);                  // Ungenauigkeit des Zuspiels in m
	let side = $state(1);                       // Richtung der Abweichung
	let ballX = $derived(ZONE_X + side * spread);

	// ─── Phasen ──────────────────────────────────────────────────────────────────
	const PHASES = [
		{ id: 'anlauf', name: 'Anlauf', t0: 0.0, t1: 0.46 },
		{ id: 'absprung', name: 'Absprung', t0: 0.46, t1: 0.6 },
		{ id: 'flug', name: 'Flugphase', t0: 0.6, t1: 0.85 },
		{ id: 'schlag', name: 'Schlag', t0: 0.85, t1: 1.0 },
	];

	/** Inhalte im Arbeitsspeicher je Phase und Modus */
	const MEM = {
		ball: {
			anlauf: [
				{ l: 'Ball einholen (Timing)', s: 'aktiv' },
				{ l: 'Absprungpunkt laufend korrigieren', s: 'aktiv' },
				{ l: 'Technik', s: 'weg' },
				{ l: 'Zielzone', s: 'weg' },
			],
			absprung: [
				{ l: 'Ball einholen (Timing)', s: 'aktiv' },
				{ l: 'Absprungpunkt laufend korrigieren', s: 'aktiv' },
				{ l: 'Technik', s: 'weg' },
				{ l: 'Zielzone', s: 'weg' },
			],
			flug: [
				{ l: 'Ball suchen / anpassen', s: 'aktiv' },
				{ l: 'Technik', s: 'weg' },
				{ l: 'Zielzone', s: 'weg' },
			],
			schlag: [
				{ l: '«Angriff» — einfach treffen', s: 'aktiv' },
				{ l: 'Technik', s: 'weg' },
				{ l: 'Zielzone', s: 'weg' },
			],
		},
		zone: {
			anlauf: [
				{ l: 'Anlauftiming', s: 'aktiv' },
				{ l: 'Angriffszone', s: 'aktiv' },
				{ l: 'Technik', s: 'aktiv' },
				{ l: 'Zielzone', s: 'aktiv' },
			],
			absprung: [
				{ l: 'Anlauftiming', s: 'frei' },
				{ l: 'Angriffszone', s: 'aktiv' },
				{ l: 'Technik', s: 'aktiv' },
				{ l: 'Zielzone', s: 'aktiv' },
			],
			flug: [
				{ l: 'Anlauftiming', s: 'frei' },
				{ l: 'Angriffszone', s: 'frei' },
				{ l: 'Technik', s: 'aktiv' },
				{ l: 'Zielzone', s: 'aktiv' },
			],
			schlag: [
				{ l: 'Anlauftiming', s: 'frei' },
				{ l: 'Angriffszone', s: 'frei' },
				{ l: 'Technik', s: 'aktiv' },
				{ l: 'Zielzone', s: 'aktiv' },
			],
		},
	};

	// ─── Animation ───────────────────────────────────────────────────────────────
	let t = $state(0);
	let playing = $state(false);
	/** @type {number|null} */ let raf = null;
	let t0ms = 0;
	const DUR = 2600;

	/** @param {number} now */
	function frame(now) {
		const p = (now - t0ms) / DUR;
		if (p >= 1) { t = 1; playing = false; raf = null; return; }
		t = p;
		raf = requestAnimationFrame(frame);
	}
	function play() {
		if (raf) cancelAnimationFrame(raf);
		t = 0; playing = true; t0ms = performance.now();
		raf = requestAnimationFrame(frame);
	}
	function newPass() {
		side = Math.random() < 0.5 ? -1 : 1;
		play();
	}
	/** @param {'ball'|'zone'} m */
	function setMode(m) { mode = m; play(); }
	$effect(() => () => { if (raf) cancelAnimationFrame(raf); });

	let phase = $derived(PHASES.find((p) => t >= p.t0 && t <= p.t1) ?? PHASES[0]);
	let memory = $derived(MEM[mode][/** @type {'anlauf'} */ (phase.id)]);
	let freeSlots = $derived(memory.filter((m) => m.s === 'frei').length);
	let lostSlots = $derived(memory.filter((m) => m.s === 'weg').length);

	// ─── Ballflug ────────────────────────────────────────────────────────────────
	const T_CONTACT = 0.9;
	const CONTACT_Y = 2.95;
	/** @param {number} tt */
	function ballPos(tt) {
		const u = Math.min(1, tt / T_CONTACT);
		const x = SETTER_X + (ballX - SETTER_X) * u;
		const y = SETTER_Y + (CONTACT_Y - SETTER_Y) * u + 1.5 * Math.sin(Math.PI * u);
		return { x, y };
	}

	// ─── Angreifer ───────────────────────────────────────────────────────────────
	// "zum Ball": zielt auf den Ball, springt später (Korrektur kostet Zeit)
	// "in die Zone": zielt auf die Zonenmitte, springt zum geplanten Zeitpunkt
	let jumpStart = $derived(mode === 'zone' ? 0.46 : 0.56);
	let targetX = $derived(mode === 'zone' ? ZONE_X : ballX);
	const START_X = -0.4;

	/** @param {number} tt */
	function playerX(tt) {
		const u = Math.min(1, tt / jumpStart);
		const e = 1 - (1 - u) ** 2;
		return START_X + (targetX - START_X) * e;
	}
	/** @param {number} tt */
	function playerY(tt) {
		if (tt <= jumpStart) return 0;
		const u = Math.min(1, (tt - jumpStart) / (1 - jumpStart));
		return 0.85 * Math.sin(Math.PI * Math.min(1, u * 1.08));
	}

	let px = $derived(playerX(t));
	let py = $derived(playerY(t));
	let ball = $derived(ballPos(t));
	let handY = $derived(1.95 + py * 1.15);

	// Treffer bewerten: liegt der Ball beim Kontakt im Schlagfenster?
	let gap = $derived(Math.abs(ballX - playerX(T_CONTACT)));
	let inWindow = $derived(gap <= REACH);
	let late = $derived(mode === 'ball');
</script>

<div class="az-wrap">
	<div class="az-head">
		<h4>Angriff — zum Ball springen oder in die Zone springen?</h4>
		<p>
			Frontalansicht. Oben läuft die Aktion, unten steht, was in dieser Phase im
			<b>Arbeitsspeicher</b> liegt. Das Zuspiel streut — mit dem Regler lässt sich einstellen, wie
			ungenau es ist.
		</p>
	</div>

	<div class="az-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="az-svg" role="img" aria-label="Angriff aus der Zone gegenüber Angriff zum Ball">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Boden -->
			<line x1="0" y1={fy(0)} x2={SVG_W} y2={fy(0)} stroke="#cbd5e1" stroke-width="2" />

			<!-- Netz -->
			<rect x="0" y={fy(NET_H)} width={SVG_W} height={fy(NET_H - 1) - fy(NET_H)}
				fill="#64748b" opacity="0.1" />
			<line x1="0" y1={fy(NET_H)} x2={SVG_W} y2={fy(NET_H)} stroke="#475569" stroke-width="3" />
			<text x={SVG_W - 6} y={fy(NET_H) - 6} text-anchor="end" font-size="10" fill="#64748b" font-family="sans-serif">Netz 2.43 m</text>

			<!-- Angriffszone -->
			<rect x={fx(ZONE_X - ZONE_W / 2)} y={fy(3.5)} width={ZONE_W * PPM} height={3.5 * PPM}
				fill="#2563eb" opacity="0.08" stroke="#2563eb" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="5,4" />
			<text x={fx(ZONE_X)} y={fy(3.62)} text-anchor="middle" font-size="10" fill="#2563eb" font-family="sans-serif" font-weight="700">Angriffszone</text>

			<!-- Flugbahn des Zuspiels -->
			<path d={Array.from({ length: 31 }, (_, n) => {
					const b = ballPos((n / 30) * T_CONTACT);
					return `${n === 0 ? 'M' : 'L'} ${fx(b.x)} ${fy(b.y)}`;
				}).join(' ')}
				fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.5" />

			<!-- Zuspieler -->
			<circle cx={fx(SETTER_X)} cy={fy(0.5)} r="9" fill="#94a3b8" />
			<text x={fx(SETTER_X)} y={fy(0.5) + 24} text-anchor="middle" font-size="9.5" fill="#64748b" font-family="sans-serif">Zuspiel</text>

			<!-- Schlagfenster des Angreifers -->
			{#if py > 0.02}
				<line x1={fx(px - REACH)} y1={fy(handY)} x2={fx(px + REACH)} y2={fy(handY)}
					stroke="#0f766e" stroke-width="5" stroke-linecap="round" opacity="0.35" />
				<text x={fx(px)} y={fy(handY) - 10} text-anchor="middle" font-size="9" fill="#0f766e" font-family="sans-serif">Schlagfenster</text>
			{/if}

			<!-- Angreifer -->
			<line x1={fx(px)} y1={fy(py + 0.15)} x2={fx(px)} y2={fy(py + 1.1)} stroke="#1e3a5f" stroke-width="5" stroke-linecap="round" />
			<line x1={fx(px)} y1={fy(py + 1.05)} x2={fx(px + 0.35)} y2={fy(handY)} stroke="#1e3a5f" stroke-width="4" stroke-linecap="round" />
			<circle cx={fx(px)} cy={fy(py + 1.3)} r="9" fill="#1e3a5f" />

			<!-- Ball -->
			<circle cx={fx(ball.x)} cy={fy(ball.y)} r="7.5" fill="#fff" stroke="#f59e0b" stroke-width="2.4" />

			<!-- Phasenlabel -->
			<text x="10" y="18" font-size="11.5" fill="#1e3a5f" font-family="sans-serif" font-weight="700">
				{phase.name}
			</text>
			{#if t >= T_CONTACT}
				<text x={SVG_W / 2} y={SVG_H - 8} text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="700"
					fill={inWindow && !late ? '#16a34a' : inWindow ? '#f97316' : '#ef4444'}>
					{#if !inWindow}
						Ball ausserhalb des Schlagfensters ({(gap * 100).toFixed(0)} cm)
					{:else if late}
						Getroffen — aber Technik und Ziel sind aus dem Arbeitsspeicher verschwunden
					{:else}
						Getroffen — mit Technik und Ziel noch im Kopf ({(gap * 100).toFixed(0)} cm Korrektur über den Arm)
					{/if}
				</text>
			{/if}
		</svg>
	</div>

	<div class="az-timeline">
		{#each PHASES as p}
			<div class="az-phase" class:on={p.id === phase.id} style="flex: {p.t1 - p.t0} 1 0">{p.name}</div>
		{/each}
	</div>

	<div class="az-mem">
		<div class="az-mem-title">Arbeitsspeicher in dieser Phase</div>
		{#each memory as m}
			<div class="az-row az-{m.s}">
				<span class="az-dot"></span>
				<span class="az-label">{m.l}</span>
				<span class="az-state">
					{#if m.s === 'aktiv'}belegt{:else if m.s === 'frei'}Slot wieder frei{:else}verdrängt{/if}
				</span>
			</div>
		{/each}
	</div>

	<div class="az-stats">
		<div class="az-stat"><span class="az-lbl">freie Slots</span><span class="az-val" style="color:#16a34a">{freeSlots}</span></div>
		<div class="az-stat"><span class="az-lbl">verlorene Inhalte</span><span class="az-val" style="color:{lostSlots ? '#ef4444' : '#16a34a'}">{lostSlots}</span></div>
		<div class="az-stat"><span class="az-lbl">Pass-Abweichung</span><span class="az-val">{(Math.abs(ballX - ZONE_X) * 100).toFixed(0)} cm</span></div>
	</div>

	<div class="az-actions">
		<div class="az-seg" role="group" aria-label="Modus">
			<button class="az-seg-btn" class:active={mode === 'ball'} onclick={() => setMode('ball')}>Zum Ball springen</button>
			<button class="az-seg-btn" class:active={mode === 'zone'} onclick={() => setMode('zone')}>In die Zone springen</button>
		</div>
		<label class="az-ctrl">
			<span>Streuung des Zuspiels: <b>{(spread * 100).toFixed(0)} cm</b></span>
			<input type="range" min="0" max="0.9" step="0.05" bind:value={spread} />
		</label>
		<button class="az-btn-primary" onclick={newPass}>🎲 Neues Zuspiel</button>
		<button class="az-btn" onclick={play} disabled={playing}>▶ Nochmals</button>
	</div>

	<div class="az-note">
		<strong>Der Trick:</strong> Beim Sprung in die Zone geben wir die laufende Timing- und
		Positionsberechnung auf — wir springen an einen vorher festgelegten Punkt und warten dort auf den
		Ball. In der Luft können wir ohnehin nichts mehr am Laufweg ändern. Genau dadurch werden zwei
		Slots frei, und <em>Technik</em> und <em>Zielzone</em> überleben bis zum Schlag. Solange die
		Streuung des Zuspiels im Schlagfenster bleibt, reicht eine kleine Armkorrektur.
	</div>
</div>

<style>
	.az-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.az-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.az-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.az-svg-box { display: flex; justify-content: center; }
	.az-svg { width: 100%; max-width: 460px; height: auto; display: block; }

	.az-timeline { display: flex; gap: 0.25rem; }
	.az-phase {
		text-align: center; font-size: 0.72rem; font-weight: 600; color: #94a3b8;
		background: #f1f5f9; border-radius: 0.35rem; padding: 0.3rem 0.2rem; transition: all 0.15s;
	}
	.az-phase.on { background: var(--color-primary, #1e3a5f); color: #fff; }

	.az-mem { border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
	.az-mem-title { background: #f8fafc; padding: 0.4rem 0.8rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; font-weight: 600; }
	.az-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.8rem; border-top: 1px solid #f1f5f9; font-size: 0.84rem; }
	.az-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
	.az-label { flex: 1; }
	.az-state { font-size: 0.7rem; font-family: monospace; }
	.az-aktiv .az-dot { background: #2563eb; }
	.az-aktiv { color: #1e293b; }
	.az-aktiv .az-state { color: #2563eb; }
	.az-frei .az-dot { background: #16a34a; }
	.az-frei { color: #475569; }
	.az-frei .az-state { color: #16a34a; }
	.az-weg .az-dot { background: #ef4444; }
	.az-weg { color: #94a3b8; text-decoration: line-through; }
	.az-weg .az-state { color: #ef4444; text-decoration: none; }

	.az-stats { display: flex; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem; }
	.az-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 110px; border-left: 1px solid #e2e8f0; }
	.az-stat:first-child { border-left: none; }
	.az-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.az-val { font-size: 1.05rem; font-weight: 700; color: #1e293b; font-family: monospace; }

	.az-actions { display: flex; flex-wrap: wrap; gap: 0.5rem 0.9rem; justify-content: center; align-items: center; }
	.az-seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 0.5rem; overflow: hidden; }
	.az-seg-btn {
		padding: 0.5rem 0.85rem; border: none; background: #f1f5f9; color: #64748b;
		font-size: 0.82rem; font-weight: 600; cursor: pointer; border-left: 1px solid #cbd5e1; transition: all 0.15s;
	}
	.az-seg-btn:first-child { border-left: none; }
	.az-seg-btn:hover { background: #e2e8f0; }
	.az-seg-btn:nth-child(1).active { background: #ef4444; color: #fff; }
	.az-seg-btn:nth-child(2).active { background: #16a34a; color: #fff; }
	.az-ctrl { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.76rem; color: #475569; flex: 1 1 180px; }
	.az-ctrl input { width: 100%; accent-color: var(--color-primary, #1e3a5f); }
	.az-btn-primary, .az-btn { padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem; font-size: 0.86rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
	.az-btn-primary { background: var(--color-primary, #1e3a5f); color: #fff; }
	.az-btn-primary:hover { background: #2d5a8e; }
	.az-btn { background: #e2e8f0; color: #475569; }
	.az-btn:disabled { opacity: 0.5; cursor: default; }

	.az-note { background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 0 0.4rem 0.4rem 0; padding: 0.65rem 1rem; font-size: 0.82rem; color: #475569; line-height: 1.55; }
	.az-note strong { color: #334155; }
	@media (max-width: 600px) {
		.az-wrap { padding: 1rem; }
		.az-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
