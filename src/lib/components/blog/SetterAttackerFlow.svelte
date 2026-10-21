<script>
	/**
	 * Verbindung Zuspieler ↔ Angreifer — drei Zeitstrahlen.
	 *
	 *   Zuspieler : Weg zur Position, Zuspielbewegung, Kontakt
	 *   Ball      : Flug zum Fenster + Verweildauer im Fenster
	 *   Angreifer : Anlauf, Absprung, Flug, Schlag
	 *
	 * Der Regler verschiebt den **Commit** — den Moment, in dem der Angreifer
	 * seinen Anlauf startet und das Timing nicht mehr ändern kann. Je nach
	 * Szenario (hoher Aussenball oder Quick) muss dieser Moment deutlich vor dem
	 * Zuspielkontakt liegen: Der Angreifer legt sich fest, bevor er weiss, wohin
	 * der Ball geht.
	 *
	 * Beschriftung: Namen stehen nur dann im Balken, wenn sie wirklich
	 * hineinpassen (Abschätzung über die Zeichenbreite). Alles andere wird über
	 * die nummerierte Legende unter der Grafik aufgelöst — so wird nichts
	 * gequetscht, egal wie schmal ein Balken wird.
	 *
	 * Verwendung im Blog:
	 *   <SetterAttackerFlow />
	 */

	// ─── Zeitachse (0 = Kontakt des Zuspielers) ──────────────────────────────────
	const T0 = -2.0;
	const T1 = 1.4;
	const W = 820, H = 300;
	const PAD = 26;

	/** @param {number} t */
	const x = (t) => PAD + ((t - T0) / (T1 - T0)) * (W - 2 * PAD);
	const PPS = (W - 2 * PAD) / (T1 - T0); // Pixel pro Sekunde

	// ─── Szenarien: wann ist der Ball im Fenster? ────────────────────────────────
	const SCENARIOS = [
		{ id: 'aussen', name: 'Aussen (Zone 4)', winT0: 0.80, winT1: 0.98, color: '#2563eb' },
		{ id: 'quick', name: 'Quick (Zone 3)', winT0: 0.30, winT1: 0.46, color: '#f59e0b' },
	];
	let scId = $state('aussen');
	let sc = $derived(SCENARIOS.find((s) => s.id === scId) ?? SCENARIOS[0]);

	// ─── Handlungsketten ─────────────────────────────────────────────────────────
	const SETTER_STEPS = [
		{ n: 1, t0: -2.0, t1: -0.95, label: 'Ball lesen, Weg zur Position', short: 'lesen', full: 'Ball lesen und Weg zur Zuspielposition' },
		{ n: 2, t0: -0.95, t1: -0.28, label: 'Position einnehmen', short: 'Position', full: 'Position einnehmen, Rhythmus zeigen' },
		{ n: 3, t0: -0.28, t1: 0.0, label: 'Zuspielbewegung', short: 'Zuspiel', full: 'Zuspielbewegung — ab hier lesbar' },
		{ n: 4, t0: 0.0, t1: 0.1, label: 'Kontakt', short: '', full: 'Kontakt' },
	];
	const SETTER_COLORS = ['#0f766e', '#0d9488', '#047857', '#065f46'];

	const ATTACK_STEPS = [
		{ n: 1, d: 0.5, label: 'Zuspieler lesen', short: 'lesen', full: 'Zuspieler lesen, Startposition', color: '#60a5fa' },
		{ n: 2, d: 0.33, label: '1. Schritt', short: '1.', full: '1. Schritt', color: '#3b82f6' },
		{ n: 3, d: 0.3, label: '2. Schritt', short: '2.', full: '2. Schritt', color: '#3b82f6' },
		{ n: 4, d: 0.28, label: 'Absprung', short: 'Sprung', full: 'Stemmschritt und Absprung', color: '#2563eb' },
		{ n: 5, d: 0.25, label: 'Flugphase', short: 'Flug', full: 'Flugphase', color: '#1d4ed8' },
		{ n: 6, d: 0.12, label: 'Schlag', short: '', full: 'Schlag', color: '#1e3a8a' },
	];
	const TO_HIT = ATTACK_STEPS.slice(0, 5).reduce((a, s) => a + s.d, 0); // 1.66 s

	// Commit = Start des Anlaufs. Ab hier ist das Timing gesetzt.
	let commit = $state(-0.8);

	let steps = $derived.by(() => {
		let t = commit;
		return ATTACK_STEPS.map((s) => {
			const seg = { ...s, t0: t, t1: t + s.d };
			t += s.d;
			return seg;
		});
	});
	let hitTime = $derived(commit + TO_HIT);
	let idealCommit = $derived(+((sc.winT0 + sc.winT1) / 2 - TO_HIT).toFixed(2));

	let quality = $derived.by(() => {
		if (hitTime < sc.winT0 - 0.09)
			return {
				tone: 'early',
				text: `Zu früh: Die Hand ist ${((sc.winT0 - hitTime) * 1000).toFixed(0)} ms vor dem Ball im Fenster. Der Angreifer wartet in der Luft und fällt dem Ball entgegen — meist noch spielbar, aber ohne Druck.`,
			};
		if (hitTime > sc.winT1 + 0.09)
			return {
				tone: 'late',
				text: `Zu spät: Der Ball hat das Fenster ${((hitTime - sc.winT1) * 1000).toFixed(0)} ms vorher wieder verlassen. Der Angreifer springt von unten an den Ball — Form 1, das Spiel stockt.`,
			};
		return {
			tone: 'good',
			text: 'Flüssig: Hand und Ball sind gleichzeitig im Fenster. Der Angreifer steht oben und wählt den Schlagzeitpunkt — Form 2.',
		};
	});

	// ─── Beschriftung ────────────────────────────────────────────────────────────
	const FS = 13;
	/**
	 * Welcher Text passt in den Balken? Abschätzung über die mittlere
	 * Zeichenbreite — lieber gar kein Text als ein gequetschter.
	 * @param {{label?: string, short?: string}} step @param {number} w
	 */
	function pick(step, w) {
		const fits = (/** @type {string} */ s) => s.length * FS * 0.52 + 10 <= w;
		if (step.label && fits(step.label)) return step.label;
		if (step.short && fits(step.short)) return step.short;
		return '';
	}

	// ─── Geometrie der Spuren ────────────────────────────────────────────────────
	const BAR = 34;
	const LANE = [
		{ title: 'Zuspieler', ty: 42, by: 48 },
		{ title: 'Ball', ty: 102, by: 108 },
		{ title: 'Angreifer', ty: 162, by: 168 },
	];
	const AXIS_Y = 232;

	let flightLab = $derived(pick({ label: 'Flug zum Fenster', short: 'Flug' }, x(sc.winT0) - x(0)));
</script>

<figure class="saf">
	<figcaption class="head">
		<h4>Die Verbindung als Zeitstrahl</h4>
		<p>
			Drei Handlungsketten auf einer Uhr. Null ist der Moment, in dem der Zuspieler
			den Ball berührt. Verschiebe den Commit — den Start des Anlaufs — und schau,
			ob Hand und Ball gleichzeitig im Fenster ankommen.
		</p>
	</figcaption>

	<div class="tabs">
		{#each SCENARIOS as s}
			<button class="tab" class:on={scId === s.id} onclick={() => (scId = s.id)}>{s.name}</button>
		{/each}
	</div>

	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Zeitstrahl von Zuspieler, Ball und Angreifer">
		<rect x="0" y="0" width={W} height={H} fill="#f8fafc" rx="8" />

		<!-- Angriffsfenster als vertikales Band -->
		<rect x={x(sc.winT0)} y="26" width={x(sc.winT1) - x(sc.winT0)} height={AXIS_Y - 26} fill="#16a34a" opacity="0.14" />
		<line x1={x(sc.winT0)} y1="26" x2={x(sc.winT0)} y2={AXIS_Y} stroke="#16a34a" stroke-width="1.5" />
		<line x1={x(sc.winT1)} y1="26" x2={x(sc.winT1)} y2={AXIS_Y} stroke="#16a34a" stroke-width="1.5" />
		<text x={(x(sc.winT0) + x(sc.winT1)) / 2} y="18" text-anchor="middle" class="lbl green">
			Fenster · {((sc.winT1 - sc.winT0) * 1000).toFixed(0)} ms
		</text>

		<!-- Zuspielkontakt -->
		<line x1={x(0)} y1="26" x2={x(0)} y2={AXIS_Y} stroke="#065f46" stroke-width="2" stroke-dasharray="5 4" />
		<!-- Commit -->
		<line x1={x(commit)} y1="26" x2={x(commit)} y2={AXIS_Y} stroke="#dc2626" stroke-width="2" />

		<!-- ── Spur 1: Zuspieler ── -->
		<text x={PAD} y={LANE[0].ty} class="lane">Zuspieler</text>
		{#each SETTER_STEPS as s, i}
			{@const bw = Math.max(3, x(s.t1) - x(s.t0))}
			{@const lab = pick(s, bw)}
			<rect x={x(s.t0)} y={LANE[0].by} width={bw} height={BAR} rx="6" fill={SETTER_COLORS[i]} opacity="0.9" />
			<text x={x(s.t0) + bw / 2} y={LANE[0].by + BAR / 2 + 5} text-anchor="middle" class={lab ? 'bar' : 'num'}>
				{lab || (bw >= 15 ? s.n : '')}
			</text>
		{/each}

		<!-- ── Spur 2: Ball ── -->
		<text x={PAD} y={LANE[1].ty} class="lane">Ball</text>
		<rect x={x(T0)} y={LANE[1].by + 10} width={x(0) - x(T0)} height={BAR - 20} rx="3" fill="#cbd5e1" />
		<text x={x(0) - 10} y={LANE[1].by + BAR / 2 + 5} text-anchor="end" class="bar muted">unterwegs zum Zuspieler</text>
		<rect x={x(0)} y={LANE[1].by} width={x(sc.winT0) - x(0)} height={BAR} rx="6" fill="#f59e0b" opacity="0.9" />
		{#if flightLab}
			<text x={(x(0) + x(sc.winT0)) / 2} y={LANE[1].by + BAR / 2 + 5} text-anchor="middle" class="bar">{flightLab}</text>
		{/if}
		<rect x={x(sc.winT0)} y={LANE[1].by} width={x(sc.winT1) - x(sc.winT0)} height={BAR} rx="6" fill="#15803d" />

		<!-- ── Spur 3: Angreifer ── -->
		<text x={PAD} y={LANE[2].ty} class="lane">Angreifer</text>
		{#each steps as s}
			{@const bw = Math.max(3, x(s.t1) - x(s.t0))}
			{@const lab = pick(s, bw)}
			<rect x={x(s.t0)} y={LANE[2].by} width={bw} height={BAR} rx="6" fill={s.color} opacity="0.95" />
			<text x={x(s.t0) + bw / 2} y={LANE[2].by + BAR / 2 + 5} text-anchor="middle" class={lab ? 'bar' : 'num'}>
				{lab || (bw >= 15 ? s.n : '')}
			</text>
		{/each}

		<!-- Treffpunkt -->
		<g transform="translate({x(hitTime)}, {LANE[2].by + BAR + 4})">
			<path d="M 0 8 L -7 18 L 7 18 Z" fill={quality.tone === 'good' ? '#15803d' : '#dc2626'} />
		</g>

		<!-- ── Zeitachse ── -->
		<line x1={PAD} y1={AXIS_Y} x2={W - PAD} y2={AXIS_Y} stroke="#cbd5e1" stroke-width="1.5" />
		{#each [-2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0] as tick}
			<line x1={x(tick)} y1={AXIS_Y} x2={x(tick)} y2={AXIS_Y + 6} stroke="#94a3b8" />
			<text x={x(tick)} y={AXIS_Y + 20} text-anchor="middle" class="tick">{tick.toFixed(1)}</text>
		{/each}
		<text x={W - PAD} y={AXIS_Y + 20} text-anchor="end" class="tick">Sekunden</text>

		<!-- Marken unter der Achse, gestaffelt damit sie sich nie überlagern -->
		<g>
			<line x1={x(0)} y1={AXIS_Y} x2={x(0)} y2={AXIS_Y + 34} stroke="#065f46" stroke-width="1" stroke-dasharray="3 3" />
			<text x={x(0)} y={AXIS_Y + 46} text-anchor="middle" class="lbl dark">Zuspielkontakt</text>
		</g>
		<g>
			<line x1={x(commit)} y1={AXIS_Y} x2={x(commit)} y2={AXIS_Y + 52} stroke="#dc2626" stroke-width="1" stroke-dasharray="3 3" />
			<text
				x={Math.min(W - 40, Math.max(42, x(commit)))}
				y={AXIS_Y + 64}
				text-anchor="middle"
				class="lbl danger"
			>Commit</text>
		</g>
	</svg>

	<ul class="legend">
		{#each SETTER_STEPS as s, i}
			<li><span class="dot" style="--c:{SETTER_COLORS[i]}">{s.n}</span>{s.full}</li>
		{/each}
	</ul>
	<ul class="legend">
		{#each ATTACK_STEPS as s}
			<li><span class="dot" style="--c:{s.color}">{s.n}</span>{s.full} · {s.d.toFixed(2)} s</li>
		{/each}
	</ul>

	<div class="controls">
		<label>
			<span class="k">Commit — Start des Anlaufs, relativ zum Zuspielkontakt</span>
			<input type="range" min="-1.9" max="0.3" step="0.02" bind:value={commit} />
			<span class="v">{commit >= 0 ? '+' : ''}{commit.toFixed(2)} s</span>
		</label>
		<div class="presets">
			<button onclick={() => (commit = idealCommit)}>Form 2 — im Fenster</button>
			<button onclick={() => (commit = idealCommit + 0.45)}>Form 1 — nachlaufen</button>
			<button onclick={() => (commit = idealCommit - 0.4)}>Zu früh</button>
		</div>
	</div>

	<p class="verdict" class:good={quality.tone === 'good'} class:bad={quality.tone === 'late'}>
		{quality.text}
	</p>
	<p class="note">
		Der Commit liegt bei {idealCommit.toFixed(2)} s — also
		{Math.abs(idealCommit).toFixed(2)} s <strong>vor</strong> dem Zuspielkontakt.
		Der Angreifer startet, bevor der Ball die Hände des Zuspielers verlässt.
	</p>
</figure>

<style>
	.saf {
		width: 100%;
		max-width: 860px;
		margin: 2rem auto;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.4rem 1.3rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.head h4 { margin: 0 0 0.25rem; font-size: 1.05rem; color: var(--color-primary, #1e3a5f); }
	.head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.55; }

	.tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.tab {
		padding: 0.35rem 0.8rem;
		font-size: 0.8rem;
		font-weight: 600;
		border: 1.5px solid #cbd5e1;
		background: #fff;
		color: #475569;
		border-radius: 999px;
		cursor: pointer;
	}
	.tab.on { background: #2563eb; border-color: #2563eb; color: #fff; }

	svg { width: 100%; height: auto; display: block; }
	:global(.saf .lbl) { font-size: 13px; fill: #64748b; }
	:global(.saf .lbl.green) { fill: #15803d; font-weight: 700; }
	:global(.saf .lbl.dark) { fill: #065f46; font-weight: 700; }
	:global(.saf .lbl.danger) { fill: #dc2626; font-weight: 700; }
	:global(.saf .lane) { font-size: 13px; fill: #475569; font-weight: 700; letter-spacing: 0.02em; }
	:global(.saf .bar) { font-size: 13px; fill: #fff; font-weight: 600; }
	:global(.saf .bar.muted) { fill: #64748b; font-weight: 500; font-size: 12px; }
	:global(.saf .num) { font-size: 13px; fill: #fff; font-weight: 700; }
	:global(.saf .tick) { font-size: 12px; fill: #94a3b8; }

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.9rem;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
		color: #475569;
		line-height: 1.4;
	}
	.dot {
		width: 1.1rem;
		height: 1.1rem;
		flex: none;
		border-radius: 999px;
		background: var(--c);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 700;
		display: grid;
		place-items: center;
	}

	.controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border-top: 1px solid #e2e8f0; padding-top: 0.7rem; }
	.controls label { display: grid; grid-template-columns: 1fr auto; gap: 0.2rem 0.6rem; flex: 1; min-width: 280px; }
	.controls input { grid-column: 1 / -1; width: 100%; }
	.presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
	.presets button {
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
		font-weight: 600;
		border: 1px solid #cbd5e1;
		background: #fff;
		color: #475569;
		border-radius: 6px;
		cursor: pointer;
	}
	.presets button:hover { border-color: #2563eb; color: #1d4ed8; }

	.k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
	.v { font-size: 0.92rem; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

	.verdict {
		margin: 0;
		font-size: 0.85rem;
		line-height: 1.55;
		color: #334155;
		background: #f1f5f9;
		border-left: 3px solid #94a3b8;
		padding: 0.55rem 0.8rem;
		border-radius: 0 0.4rem 0.4rem 0;
	}
	.verdict.good { border-left-color: #16a34a; background: #f0fdf4; }
	.verdict.bad { border-left-color: #dc2626; background: #fef2f2; }
	.note { margin: 0; font-size: 0.78rem; color: #94a3b8; line-height: 1.5; }
</style>
