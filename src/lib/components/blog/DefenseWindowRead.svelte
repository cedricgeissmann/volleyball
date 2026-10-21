<script>
	/**
	 * Dasselbe Konzept in der Verteidigung — das gegnerische Angriffsfenster lesen.
	 *
	 * Draufsicht im Querformat: links der Gegner, rechts wir. Der Block stellt sich
	 * zum bedienten Fenster und nimmt einen Teil des möglichen Schlagwinkels weg.
	 * Was übrig bleibt, ist der Angriffsbereich, den die Verteidigung abdecken
	 * muss — messbar in Grad.
	 *
	 * Verwendung im Blog:
	 *   <DefenseWindowRead />
	 */

	// ─── Geometrie (Draufsicht, Meter) ───────────────────────────────────────────
	const FW = 9, FD = 9;             // Feldbreite / Feldtiefe pro Hälfte
	const TD = 5.5;                   // sichtbare Tiefe der gegnerischen Hälfte
	const PPM = 30;
	const PAD = 20;
	const W = (TD + FD) * PPM + 2 * PAD;
	const H = FW * PPM + 2 * PAD;

	/** Welt: x = −4.5…4.5 (Feldbreite), z = −9 (Gegner) … +9 (wir), Netz bei z = 0 */
	/** @param {number} z */
	const px = (z) => PAD + (TD + z) * PPM;        // Tiefe → horizontal
	/** @param {number} x */
	const py = (x) => PAD + (FW / 2 - x) * PPM;    // Breite → vertikal (+x oben)

	const BLOCK_Z = 0;                // Blockhände stehen in der Netzebene

	/**
	 * @typedef {{x: number, z: number, role: string, key?: boolean}} Player
	 * @typedef {{id: string, name: string, short: string, x: number, z: number, color: string,
	 *   fan: [{x: number, z: number}, {x: number, z: number}],
	 *   block: {from: number, to: number}, blockIntent: string,
	 *   players: Player[], cue: string, memory: string[]}} Win
	 */

	/** @type {Win[]} */
	const WINDOWS = [
		{
			id: 'aussen',
			name: 'Aussen (Zone 4)',
			short: 'Aussen',
			x: 3.2, z: -1.0,
			color: '#2563eb',
			fan: [{ x: 4.4, z: 2.0 }, { x: -4.4, z: 5.0 }],
			block: { from: 2.8, to: 4.5 },
			blockIntent: 'Zweierblock stellt die Linie zu — der Angreifer kann nur noch diagonal.',
			players: [
				{ x: 3.2, z: 0.5, role: 'Block' },
				{ x: 4.2, z: 0.5, role: 'Block' },
				{ x: 3.1, z: 5.4, role: 'Riegel' },
				{ x: -3.3, z: 3.2, role: 'Zone 2' },
				{ x: -2.4, z: 7.0, role: 'Libero', key: true },
				{ x: -1.2, z: 8.2, role: 'Zone 6' },
			],
			cue: 'Hohes Zuspiel, langer Anlauf — wir haben Zeit, den Block zu stellen und uns dahinter einzurichten.',
			memory: ['Diagonale ist offen', 'Linie gehört dem Block', 'Finte kurz in Zone 2'],
		},
		{
			id: 'quick',
			name: 'Quick (Zone 3)',
			short: 'Quick',
			x: 0.3, z: -1.0,
			color: '#f59e0b',
			fan: [{ x: -4.4, z: 3.0 }, { x: 4.4, z: 3.0 }],
			block: { from: -0.2, to: 0.8 },
			blockIntent: 'Nur der Mittelblocker kommt an — er nimmt die Mitte, beide Seiten bleiben offen.',
			players: [
				{ x: 0.3, z: 0.5, role: 'Block' },
				{ x: -3.4, z: 3.0, role: 'kurz L' },
				{ x: 3.4, z: 3.0, role: 'kurz R' },
				{ x: -4.0, z: 6.6, role: 'Zone 5', key: true },
				{ x: 4.1, z: 6.4, role: 'Zone 1' },
				{ x: 0.2, z: 8.2, role: 'Libero' },
			],
			cue: 'Das Fenster öffnet sich fast gleichzeitig mit dem Zuspiel — der Block ist allein, der Winkel bleibt breit.',
			memory: ['Zwei offene Sektoren', 'Nur eine Vorentscheidung: kurz oder lang', 'Block bekommt keine Hilfe'],
		},
		{
			id: 'rechts',
			name: 'Rechts (Zone 2)',
			short: 'Rechts',
			x: -3.2, z: -1.0,
			color: '#7c3aed',
			fan: [{ x: -4.4, z: 2.0 }, { x: 4.4, z: 5.0 }],
			block: { from: -4.5, to: -2.8 },
			blockIntent: 'Spiegelbild zu Aussen: Linie zu, Diagonale offen.',
			players: [
				{ x: -3.2, z: 0.5, role: 'Block' },
				{ x: -4.2, z: 0.5, role: 'Block' },
				{ x: -3.1, z: 5.4, role: 'Riegel' },
				{ x: 3.3, z: 3.2, role: 'Zone 4' },
				{ x: 2.4, z: 7.0, role: 'Libero', key: true },
				{ x: 1.2, z: 8.2, role: 'Zone 6' },
			],
			cue: 'Gleiche Information wie bei Aussen, nur gespiegelt — die Vorentscheidung ist dieselbe.',
			memory: ['Diagonale ist offen', 'Linie gehört dem Block', 'Finte kurz in Zone 4'],
		},
		{
			id: 'pipe',
			name: 'Pipe (Hinterfeld)',
			short: 'Pipe',
			x: 0.0, z: -3.2,
			color: '#0d9488',
			fan: [{ x: -4.4, z: 7.0 }, { x: 4.4, z: 7.0 }],
			block: { from: -1.9, to: 0.5 },
			blockIntent: 'Der Block nimmt die Diagonale auf Position 5 weg. Offen bleibt nur Position 1 — und genau die decken wir ab, 5 lassen wir bewusst frei.',
			players: [
				{ x: -1.6, z: 0.5, role: 'Block' },
				{ x: -0.7, z: 0.5, role: 'Block' },
				{ x: 0.2, z: 0.5, role: 'Block' },
				{ x: 3.3, z: 7.2, role: 'Position 1', key: true },
				{ x: 2.0, z: 3.6, role: 'Position 1 kurz' },
				{ x: -2.0, z: 7.6, role: 'Blockschatten' },
			],
			cue: 'Flacherer Winkel, mehr Tiefe — die Verteidigung steht weiter hinten und bleibt lange stehen.',
			memory: ['Nur Position 1 ist offen', 'Position 5 gehört dem Block', 'Tiefe Bälle, Blockschatten absichern'],
		},
	];

	let active = $state('aussen');
	let withBlock = $state(true);
	let current = $derived(WINDOWS.find((w) => w.id === active) ?? WINDOWS[0]);

	// ─── Winkel-Mathematik ───────────────────────────────────────────────────────
	const DEG = 180 / Math.PI;

	/** Winkel (rad) von der Angreiferposition zu einem Punkt, 0 = gerade ins Feld. */
	/** @param {Win} w @param {number} ax @param {number} az */
	const ang = (w, ax, az) => Math.atan2(ax - w.x, az - w.z);

	/** Austrittspunkt eines Strahls aus unserem Feld (Rechteck x ±4.5, z 0…9). */
	/** @param {Win} w @param {number} th */
	function exit(w, th) {
		const dx = Math.sin(th), dz = Math.cos(th);
		let t = Infinity;
		if (dz > 1e-6) t = Math.min(t, (FD - w.z) / dz);
		if (dx > 1e-6) t = Math.min(t, (FW / 2 - w.x) / dx);
		if (dx < -1e-6) t = Math.min(t, (-FW / 2 - w.x) / dx);
		if (!isFinite(t)) t = 12;
		return { x: w.x + dx * t, z: w.z + dz * t };
	}

	/** Sektor-Polygon (Apex = Angreifer), wird am eigenen Feld geclippt. */
	/** @param {Win} w @param {number} a @param {number} b */
	function sector(w, a, b) {
		const n = 18;
		let pts = `${px(w.z)},${py(w.x)}`;
		for (let i = 0; i <= n; i++) {
			const p = exit(w, a + ((b - a) * i) / n);
			pts += ` ${px(p.z)},${py(p.x)}`;
		}
		return pts;
	}

	let geo = $derived.by(() => {
		const w = current;
		const a0 = ang(w, w.fan[0].x, w.fan[0].z);
		const a1 = ang(w, w.fan[1].x, w.fan[1].z);
		const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
		const b0 = ang(w, w.block.from, BLOCK_Z);
		const b1 = ang(w, w.block.to, BLOCK_Z);
		const bl = Math.max(lo, Math.min(b0, b1));
		const bh = Math.min(hi, Math.max(b0, b1));
		/** @type {[number, number][]} */
		const open = [];
		if (bh > bl) {
			if (bl - lo > 0.03) open.push([lo, bl]);
			if (hi - bh > 0.03) open.push([bh, hi]);
		} else {
			open.push([lo, hi]);
		}
		const total = (hi - lo) * DEG;
		const rest = open.reduce((s, [a, b]) => s + (b - a) * DEG, 0);
		return {
			lo, hi, open,
			total: Math.round(total),
			rest: Math.round(rest),
			cut: Math.round(((total - rest) / total) * 100),
			shadow: bh > bl ? /** @type {[number, number]} */ ([bl, bh]) : null,
		};
	});

	/** Bewegungs-Bogen für den Schlüsselverteidiger in den offenen Sektoren. */
	let arcs = $derived.by(() => {
		const w = current;
		const key = w.players.find((p) => p.key) ?? w.players[w.players.length - 1];
		const r = Math.hypot(key.x - w.x, key.z - w.z);
		const list = withBlock ? geo.open : [/** @type {[number, number]} */ ([geo.lo, geo.hi])];
		return list.map(([a, b]) => {
			let d = '';
			const n = 14;
			for (let i = 0; i <= n; i++) {
				const th = a + ((b - a) * i) / n;
				d += `${i === 0 ? 'M' : 'L'}${px(w.z + Math.cos(th) * r)},${py(w.x + Math.sin(th) * r)} `;
			}
			return d;
		});
	});

	// Zonennummern auf unserer Seite (zur Orientierung)
	const ZONES = [
		{ n: '4', x: -3, z: 1.6 }, { n: '3', x: 0, z: 1.6 }, { n: '2', x: 3, z: 1.6 },
		{ n: '5', x: -3, z: 8.4 }, { n: '6', x: 0, z: 8.4 }, { n: '1', x: 3, z: 8.4 },
	];
</script>

<figure class="dwr">
	<figcaption class="head">
		<h4>Dasselbe Fenster — nur von der anderen Seite gelesen</h4>
		<p>
			Der Block hat eine einzige Aufgabe: möglichst viel Raum aus dem gegnerischen
			Fenster wegnehmen. Man sieht es daran, dass der Angriffsbereich dahinter
			deutlich schmaler wird — und ein Verteidiger dann nur noch eine
			Bewegungsrichtung hat.
		</p>
	</figcaption>

	<div class="body">
		<div class="stage">
			<svg viewBox="0 0 {W} {H}" role="img" aria-label="Draufsicht: gegnerisches Angriffsfenster, Block und unsere Verteidigung">
				<defs>
					<clipPath id="dwr-court">
						<rect x={px(0)} y={py(4.5)} width={FD * PPM} height={FW * PPM} />
					</clipPath>
					<pattern id="dwr-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
						<line x1="0" y1="0" x2="0" y2="7" stroke="#334155" stroke-width="3" opacity="0.35" />
					</pattern>
					<marker id="dwr-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
						<path d="M0,1 L9,5 L0,9 z" fill="#0f172a" />
					</marker>
				</defs>

				<!-- Felder -->
				<rect x={px(-TD)} y={py(4.5)} width={TD * PPM} height={FW * PPM} fill="#f6b48a" opacity="0.45" />
				<rect x={px(0)} y={py(4.5)} width={FD * PPM} height={FW * PPM} fill="#fde8d7" />

				<!-- Zonennummern -->
				{#each ZONES as z}
					<text x={px(z.z)} y={py(z.x) + 4} text-anchor="middle" class="zone">{z.n}</text>
				{/each}

				<!-- Angriffsbereich -->
				<g clip-path="url(#dwr-court)">
					{#if withBlock}
						{#each geo.open as [a, b]}
							<polygon points={sector(current, a, b)} fill={current.color} opacity="0.26" stroke={current.color} stroke-width="1.5" />
						{/each}
						{#if geo.shadow}
							<polygon points={sector(current, geo.shadow[0], geo.shadow[1])} fill="url(#dwr-hatch)" opacity="0.6" />
							<polygon points={sector(current, geo.shadow[0], geo.shadow[1])} fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7" />
						{/if}
					{:else}
						<polygon points={sector(current, geo.lo, geo.hi)} fill={current.color} opacity="0.2" stroke={current.color} stroke-width="1.5" stroke-dasharray="6 4" />
					{/if}
				</g>

				<!-- Linien -->
				<rect x={px(-TD)} y={py(4.5)} width={(TD + FD) * PPM} height={FW * PPM} fill="none" stroke="#fff" stroke-width="2" />
				<line x1={px(3)} y1={py(4.5)} x2={px(3)} y2={py(-4.5)} stroke="#fff" stroke-width="1.5" stroke-dasharray="6 4" />
				<line x1={px(-3)} y1={py(4.5)} x2={px(-3)} y2={py(-4.5)} stroke="#fff" stroke-width="1.5" stroke-dasharray="6 4" />
				<line x1={px(0)} y1={py(4.9)} x2={px(0)} y2={py(-4.9)} stroke="#334155" stroke-width="3.5" />

				<!-- Bewegungsrichtung des Schlüsselverteidigers -->
				<g clip-path="url(#dwr-court)">
					{#each arcs as d}
						<path {d} fill="none" stroke="#0f172a" stroke-width="1.6" stroke-dasharray="5 4"
							marker-start="url(#dwr-arr)" marker-end="url(#dwr-arr)" opacity="0.75" />
					{/each}
				</g>

				<!-- Gegnerische Fenster -->
				{#each WINDOWS as w}
					<g opacity={w.id === active ? 1 : 0.28}>
						<rect
							x={px(w.z) - 0.45 * PPM} y={py(w.x) - 0.75 * PPM}
							width={0.9 * PPM} height={1.5 * PPM} rx="4"
							fill={w.color} opacity="0.3" stroke={w.color} stroke-width="2"
						/>
						<text x={px(w.z) - 0.65 * PPM} y={py(w.x) + 4} text-anchor="end" class="lbl">{w.short}</text>
					</g>
				{/each}

				<!-- Block-Balken am Netz -->
				{#if withBlock}
					<rect
						x={px(-0.12)} y={py(current.block.to)}
						width={0.5 * PPM} height={(current.block.to - current.block.from) * PPM}
						rx="3" fill="#0f172a" opacity="0.8"
					/>
				{/if}

				<!-- Unsere Spieler -->
				{#each current.players as p}
					{#if !(p.role === 'Block' && !withBlock)}
						<circle cx={px(p.z)} cy={py(p.x)} r={p.key ? 9.5 : 8}
							fill={p.key ? current.color : '#1e293b'} stroke="#fff" stroke-width="1.5" />
					{/if}
				{/each}

				<!-- Angreifer -->
				<circle cx={px(current.z)} cy={py(current.x)} r="6.5" fill={current.color} stroke="#fff" stroke-width="1.5" />
			</svg>

			<p class="legend">
				<span class="sw hatch"></span> vom Block weggenommen
				<span class="sw" style="background:{current.color};opacity:0.4"></span> offener Angriffsbereich
				<span class="sw dot" style="background:{current.color}"></span> Verteidiger in der offenen Zone
				<span class="sw arrow">⟷</span> seine Bewegungsrichtung
			</p>
		</div>

		<div class="side">
			<div class="chips">
				{#each WINDOWS as w}
					<button class="chip" class:on={active === w.id} style="--c:{w.color}" onclick={() => (active = w.id)}>
						{w.name}
					</button>
				{/each}
			</div>

			<label class="toggle">
				<input type="checkbox" bind:checked={withBlock} />
				Block stellen
			</label>

			<div class="meter">
				<div class="row">
					<span>Angriffsbereich ohne Block</span><b>{geo.total}°</b>
				</div>
				<div class="row" class:dim={!withBlock}>
					<span>… mit Block</span>
					<b style="color:{current.color}">{withBlock ? `${geo.rest}°` : '—'}</b>
				</div>
				<div class="bar">
					<span class="fill" style="width:{withBlock ? (geo.rest / geo.total) * 100 : 100}%; background:{current.color}"></span>
				</div>
				<p class="note">
					{#if withBlock}
						Der Block nimmt <b>{geo.cut}%</b> des Fensters weg —
						{#if geo.open.length === 1}
							es bleibt <b>eine</b> Richtung. Der Verteidiger kann früher losgehen oder steht schon dort.
						{:else}
							es bleiben <b>{geo.open.length}</b> offene Sektoren. Der Verteidiger muss abwarten.
						{/if}
					{:else}
						Ohne Block muss die Verteidigung den ganzen Winkel decken — jede Bewegung beginnt erst nach dem Schlag.
					{/if}
				</p>
			</div>
		</div>
	</div>

	<div class="hints">
		<div class="block">
			<span class="k">Auftrag an den Block</span>
			<p>{current.blockIntent}</p>
		</div>
		<div class="block">
			<span class="k">Was wir lesen</span>
			<p>{current.cue}</p>
		</div>
		<div class="block">
			<span class="k">Vor dem Schlag im Arbeitsspeicher</span>
			<ul>
				{#each current.memory as m}<li>{m}</li>{/each}
			</ul>
		</div>
	</div>
</figure>

<style>
	.dwr {
		width: 100%;
		max-width: 920px;
		margin: 2rem auto;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.4rem 1.3rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.head h4 { margin: 0 0 0.25rem; font-size: 1.05rem; color: var(--color-primary, #1e3a5f); }
	.head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }

	.body { display: grid; grid-template-columns: minmax(300px, 1.6fr) minmax(190px, 1fr); gap: 1rem; align-items: start; }
	@media (max-width: 680px) { .body { grid-template-columns: 1fr; } }

	.stage { min-width: 0; }
	svg { width: 100%; height: auto; display: block; }
	:global(.dwr .lbl) { font-size: 10.5px; fill: #334155; font-weight: 600; }
	:global(.dwr .zone) { font-size: 13px; fill: #b45309; opacity: 0.35; font-weight: 700; }

	.legend { margin: 0.45rem 0 0; font-size: 0.72rem; color: #64748b; display: flex; flex-wrap: wrap; gap: 0.15rem 0.7rem; align-items: center; }
	.sw { display: inline-block; width: 13px; height: 10px; border-radius: 2px; margin-right: 0.15rem; vertical-align: -1px; }
	.sw.hatch { background: repeating-linear-gradient(45deg, #94a3b8 0 3px, #fff 3px 6px); border: 1px solid #cbd5e1; }
	.sw.dot { width: 10px; height: 10px; border-radius: 50%; }
	.sw.arrow { width: auto; color: #0f172a; font-size: 0.85rem; }

	.side { display: flex; flex-direction: column; gap: 0.7rem; }
	.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
	.chip {
		padding: 0.3rem 0.6rem;
		font-size: 0.74rem;
		font-weight: 600;
		border: 1.5px solid var(--c);
		color: var(--c);
		background: #fff;
		border-radius: 999px;
		cursor: pointer;
	}
	.chip.on { background: var(--c); color: #fff; }
	.toggle { font-size: 0.78rem; color: #475569; display: flex; align-items: center; gap: 0.35rem; }

	.meter { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.7rem; }
	.meter .row { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.78rem; color: #475569; }
	.meter .row.dim { opacity: 0.5; }
	.meter .bar { display: block; height: 7px; background: #e2e8f0; border-radius: 999px; margin: 0.45rem 0 0.4rem; overflow: hidden; }
	.meter .fill { display: block; height: 100%; border-radius: 999px; transition: width 0.25s ease; }
	.note { margin: 0; font-size: 0.78rem; color: #334155; line-height: 1.45; }

	.hints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
	@media (max-width: 680px) { .hints { grid-template-columns: 1fr; } }
	.block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.6rem 0.75rem; }
	.block p { margin: 0.25rem 0 0; font-size: 0.8rem; color: #334155; line-height: 1.45; }
	.block ul { margin: 0.35rem 0 0; padding-left: 1.05rem; }
	.block li { font-size: 0.8rem; color: #334155; line-height: 1.45; }
	.k { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; }
</style>
