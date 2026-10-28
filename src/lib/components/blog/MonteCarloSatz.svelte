<script>
	// @ts-nocheck
	/**
	 * Monte-Carlo-Satzsimulator
	 *
	 * Simuliert tausende Sätze aus zwei Zahlen (Sideout-Quote beider Teams) und
	 * zeigt, was davon reiner Zufall ist: Serienlängen, Comebacks, Satzgewinn.
	 *
	 * Modell: Wer serviert, gewinnt den Rally mit (1 − Sideout des Gegners).
	 */

	let soUs = $state(62); // unsere Sideout-Quote
	let soThem = $state(62); // Sideout-Quote des Gegners
	let nSets = $state(2000);
	let seed = $state(1);

	const MAXSTREAK_BINS = ['1–2', '3', '4', '5', '6', '7+'];

	function binOf(len) {
		if (len <= 2) return 0;
		if (len >= 7) return 5;
		return len - 2;
	}

	/** Spielt einen Satz, liefert Kennzahlen + optional den Verlauf. */
	function playSet(pUs, pThem, trace = false) {
		let a = 0,
			b = 0;
		let weServe = Math.random() < 0.5;
		let streak = 0,
			streakOwner = null,
			maxUs = 0,
			maxThem = 0;
		let wasDown5 = false;
		let wasUp5 = false;
		const path = [];

		while (true) {
			const pWin = weServe ? 1 - pThem : pUs;
			const weWin = Math.random() < pWin;

			if (weWin) a++;
			else b++;
			weServe = weWin;

			if (streakOwner === weWin) streak++;
			else {
				streakOwner = weWin;
				streak = 1;
			}
			if (weWin) maxUs = Math.max(maxUs, streak);
			else maxThem = Math.max(maxThem, streak);

			if (b - a >= 5) wasDown5 = true;
			if (a - b >= 5) wasUp5 = true;
			if (trace) path.push(a - b);

			if ((a >= 25 || b >= 25) && Math.abs(a - b) >= 2) break;
			if (a > 40 || b > 40) break;
		}
		return { a, b, won: a > b, maxUs, maxThem, wasDown5, wasUp5, path };
	}

	function simulate() {
		seed; // Dependency für "Neu würfeln"
		const pUs = soUs / 100;
		const pThem = soThem / 100;
		const n = nSets;

		let won = 0;
		let down5 = 0,
			down5Won = 0;
		let up5 = 0,
			up5Lost = 0;
		let streak4plus = 0;
		const hist = [0, 0, 0, 0, 0, 0];
		let sumMax = 0;

		for (let i = 0; i < n; i++) {
			const s = playSet(pUs, pThem);
			if (s.won) won++;
			const longest = Math.max(s.maxUs, s.maxThem);
			hist[binOf(longest)]++;
			sumMax += longest;
			if (longest >= 4) streak4plus++;
			if (s.wasDown5) {
				down5++;
				if (s.won) down5Won++;
			}
			if (s.wasUp5) {
				up5++;
				if (!s.won) up5Lost++;
			}
		}

		return {
			winRate: won / n,
			hist: hist.map((v) => v / n),
			avgMax: sumMax / n,
			streak4plus: streak4plus / n,
			down5Rate: down5 / n,
			comeback: down5 ? down5Won / down5 : 0,
			blown: up5 ? up5Lost / up5 : 0,
			example: playSet(pUs, pThem, true),
		};
	}

	let r = $derived.by(() => {
		soUs;
		soThem;
		nSets;
		seed;
		return simulate();
	});

	let maxHist = $derived(Math.max(...r.hist, 0.01));
	const pct = (v) => `${(v * 100).toFixed(0)} %`;

	// Verlaufskurve des Beispielsatzes
	let polyline = $derived.by(() => {
		const p = r.example.path;
		const span = Math.max(6, ...p.map((v) => Math.abs(v)));
		return p
			.map((v, i) => `${(i / (p.length - 1 || 1)) * 100},${50 - (v / span) * 46}`)
			.join(' ');
	});
</script>

<figure class="mc">
	<figcaption class="mc-head">
		<h4>Monte-Carlo-Satzsimulator — wie viel davon ist Zufall?</h4>
		<p>
			Zwei Zahlen genügen: die Sideout-Quote beider Teams. Alles andere — Serien, Comebacks,
			«Momentum» — fällt aus dem Zufall heraus.
		</p>
	</figcaption>

	<div class="mc-controls">
		<label>
			<span>Unsere Sideout-Quote <b>{soUs} %</b></span>
			<input type="range" min="35" max="85" bind:value={soUs} />
		</label>
		<label>
			<span>Sideout-Quote Gegner <b>{soThem} %</b></span>
			<input type="range" min="35" max="85" bind:value={soThem} />
		</label>
		<label>
			<span>Simulierte Sätze <b>{nSets}</b></span>
			<input type="range" min="200" max="5000" step="200" bind:value={nSets} />
		</label>
		<button type="button" onclick={() => seed++}>Neu würfeln</button>
	</div>

	<div class="mc-tiles">
		<div class="mc-tile mc-hi">
			<span class="mc-val">{pct(r.winRate)}</span>
			<span class="mc-lab">Satzgewinn</span>
		</div>
		<div class="mc-tile">
			<span class="mc-val">{r.avgMax.toFixed(1).replace('.', ',')}</span>
			<span class="mc-lab">längste Serie Ø</span>
		</div>
		<div class="mc-tile">
			<span class="mc-val">{pct(r.streak4plus)}</span>
			<span class="mc-lab">Sätze mit 4er-Serie</span>
		</div>
		<div class="mc-tile">
			<span class="mc-val">{pct(r.comeback)}</span>
			<span class="mc-lab">Comeback nach −5</span>
		</div>
		<div class="mc-tile">
			<span class="mc-val">{pct(r.blown)}</span>
			<span class="mc-lab">+5 noch verloren</span>
		</div>
	</div>

	<div class="mc-hist">
		<div class="mc-sub">Längste Serie pro Satz (egal welches Team)</div>
		<div class="mc-bars">
			{#each r.hist as v, i}
				<div class="mc-col">
					<div class="mc-colval">{pct(v)}</div>
					<div class="mc-colbar" style="height: {(v / maxHist) * 100}%"></div>
					<div class="mc-collab">{MAXSTREAK_BINS[i]}</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="mc-example">
		<div class="mc-sub">
			Ein zufälliger Satz: Punktedifferenz im Verlauf — Endstand
			<b>{r.example.a}:{r.example.b}</b>, längste Serie
			<b>{Math.max(r.example.maxUs, r.example.maxThem)}</b>
		</div>
		<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Satzverlauf">
			<line x1="0" y1="50" x2="100" y2="50" stroke="#cbd5e1" stroke-width="0.6" />
			<polyline
				points={polyline}
				fill="none"
				stroke="#1d4ed8"
				stroke-width="1.4"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
	</div>

	<p class="mc-verdict">
		Bei diesen Quoten entsteht in <b>{pct(r.streak4plus)}</b> aller Sätze mindestens eine Serie von
		vier Punkten — ohne dass irgendetwas passiert wäre. Die Serie ist kein Signal. Erst unsere
		Reaktion darauf macht sie zu einem.
	</p>
</figure>

<style>
	.mc {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem 1.4rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.05),
			0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.mc-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.mc-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}

	.mc-controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 0.6rem 1.2rem;
		align-items: end;
	}
	.mc-controls label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.78rem;
		color: #475569;
	}
	.mc-controls b {
		color: #1e3a5f;
		float: right;
	}
	.mc-controls input {
		width: 100%;
		accent-color: #1d4ed8;
	}
	.mc-controls button {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		color: #1e3a5f;
		font-size: 0.78rem;
		font-weight: 600;
		border-radius: 0.4rem;
		padding: 0.45rem 0.8rem;
		cursor: pointer;
	}
	.mc-controls button:hover {
		background: #dbeafe;
	}

	.mc-tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
		gap: 0.5rem;
	}
	.mc-tile {
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.5rem 0.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
	}
	.mc-hi {
		background: #eff6ff;
		border-color: #bfdbfe;
	}
	.mc-val {
		font-size: 1.15rem;
		font-weight: 700;
		color: #1e3a5f;
	}
	.mc-lab {
		font-size: 0.64rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #94a3b8;
		text-align: center;
		line-height: 1.2;
	}

	.mc-sub {
		font-size: 0.75rem;
		color: #64748b;
		margin-bottom: 0.4rem;
	}
	.mc-bars {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.4rem;
		height: 7.5rem;
		align-items: end;
	}
	.mc-col {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		align-items: center;
		height: 100%;
		gap: 0.2rem;
	}
	.mc-colbar {
		width: 100%;
		background: linear-gradient(180deg, #3b82f6, #1d4ed8);
		border-radius: 0.25rem 0.25rem 0 0;
		min-height: 2px;
		transition: height 0.25s ease;
	}
	.mc-colval {
		font-size: 0.65rem;
		font-weight: 700;
		color: #1e3a5f;
	}
	.mc-collab {
		font-size: 0.65rem;
		color: #94a3b8;
	}

	.mc-example svg {
		width: 100%;
		height: 6rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.4rem;
	}

	.mc-verdict {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: #334155;
		background: #f8fafc;
		border-left: 3px solid #f97316;
		padding: 0.6rem 0.8rem;
		border-radius: 0 0.4rem 0.4rem 0;
	}

	@media (max-width: 540px) {
		.mc {
			padding: 1rem;
		}
	}
</style>
