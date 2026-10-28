<script>
	// @ts-nocheck
	/**
	 * Vorteil-Flip (Vergleichsansicht)
	 *
	 * Zwei Raster nebeneinander:
	 *   links  — fester Standarddruck als Referenz
	 *   rechts — der vom Nutzer eingestellte Aufschlagdruck
	 *
	 * Die 25 Felder eines Satzes sind immer in derselben Reihenfolge sortiert:
	 *
	 *   [ Fehler | kein Vorteil ]  →  [ Vorteil erobert | Ass ]
	 *     ─── beim Gegner ───          ─────── bei uns ───────
	 *
	 * Dadurch wächst die gegnerische Seite von vorne und unsere von hinten.
	 * Die Nahtstelle in der Mitte verschiebt sich sichtbar — das ist die
	 * Überkreuzung, um die es geht.
	 */

	const SERVES = 25; // Aufschläge pro Satz (Grössenordnung)
	const N = 20000; // Simulationsläufe pro Auswertung
	const STANDARD = 40; // Referenz: kontrollierter Druck

	let serveRisk = $state(80);

	// Früher Regler, jetzt fest: durchschnittliches Team
	const DEF = 50;
	const CTR = 50;

	// ─── Modell ───────────────────────────────────────────────────────────────
	function model(risk) {
		const r = risk / 100;
		const d = DEF / 100;
		const c = CTR / 100;
		return {
			ace: 0.005 + 0.2 * Math.pow(r, 2.2), // Asse wachsen überproportional
			err: 0.02 + 0.08 * r + 0.34 * r * r, // Fehler explodieren am oberen Ende
			pressure: Math.min(0.9, 0.1 + 0.8 * Math.pow(r, 0.7)), // Druckwirkung sättigt
			defGain: d,
			ourKill: 0.28 + 0.24 * c,
			ourErr: 0.13 - 0.05 * c,
		};
	}

	function serve(m) {
		if (Math.random() < m.err) return { kind: 'err', won: false, hadAdv: false };
		if (Math.random() < m.ace) return { kind: 'ace', won: true, hadAdv: false };

		const oos = Math.random() < m.pressure; // Gegner out of system?
		let advOpp = true; // Vorteil startet beim Gegner (Sideout)
		let hadAdv = false;

		for (let i = 0; i < 16; i++) {
			if (advOpp) {
				const base = i === 0 ? (oos ? 0.36 : 0.66) : 0.38;
				const kill = base * (1 - 0.3 * m.defGain);
				const oppErr = (i === 0 ? (oos ? 0.15 : 0.05) : 0.09) * (1 + 0.3 * m.defGain);
				const x = Math.random();
				if (x < kill) return { kind: 'rally', won: false, hadAdv };
				if (x < kill + oppErr) return { kind: 'rally', won: true, hadAdv };
				advOpp = false; // Ball kommt zurück → wir haben den Vorteil
				hadAdv = true;
			} else {
				const x = Math.random();
				if (x < m.ourKill) return { kind: 'rally', won: true, hadAdv };
				if (x < m.ourKill + m.ourErr) return { kind: 'rally', won: false, hadAdv };
				advOpp = true; // Vorteil zurück zum Gegner
			}
		}
		return { kind: 'rally', won: Math.random() < 0.5, hadAdv };
	}

	function simulate(risk, n) {
		const m = model(risk);
		let errs = 0,
			aces = 0,
			rallies = 0,
			ralliesWon = 0,
			advRallies = 0;
		for (let i = 0; i < n; i++) {
			const res = serve(m);
			if (res.kind === 'err') errs++;
			else if (res.kind === 'ace') aces++;
			else {
				rallies++;
				if (res.won) ralliesWon++;
				if (res.hadAdv) advRallies++;
			}
		}
		const pts = aces + ralliesWon;
		return {
			errs: (errs / n) * SERVES,
			aces: (aces / n) * SERVES,
			advRallies: (advRallies / n) * SERVES,
			breaks: (pts / n) * SERVES,
		};
	}

	/**
	 * Verteilt die 25 Felder in fester Reihenfolge:
	 *   err → rally → adv → ace
	 * Gegnerseite wächst von vorne, unsere Seite von hinten.
	 */
	function toTiles(res) {
		let e = Math.round(res.errs);
		let a = Math.round(res.aces);
		let adv = Math.round(res.advRallies);
		let total = e + a + adv;
		while (total > SERVES) {
			if (adv > 0) adv--;
			else if (a > 0) a--;
			else e--;
			total = e + a + adv;
		}
		const rally = SERVES - total;
		return [
			...Array(e).fill('err'),
			...Array(rally).fill('rally'),
			...Array(adv).fill('adv'),
			...Array(a).fill('ace'),
		];
	}

	const countOf = (tiles, k) => tiles.filter((t) => t === k).length;

	// Referenz wird einmal berechnet und bleibt stabil
	const stdResult = simulate(STANDARD, N);
	const stdTiles = toTiles(stdResult);

	let result = $derived(simulate(serveRisk, N));
	let tiles = $derived(toTiles(result));

	// Breakpunkte über das ganze Risikospektrum (einmalig, daher stabil)
	const curve = (() => {
		const pts = [];
		for (let r = 0; r <= 100; r += 5) pts.push({ r, breaks: simulate(r, 8000).breaks });
		return pts;
	})();
	const best = curve.reduce((a, b) => (b.breaks > a.breaks ? b : a), curve[0]);
	const maxBreaks = Math.max(...curve.map((p) => p.breaks), 1);

	const one = (v) => v.toFixed(1).replace('.', ',');
	const signed = (v) => (v >= 0 ? '+' : '−') + one(Math.abs(v));

	const labelFor = (v) =>
		v <= 20 ? 'sehr sicher' : v <= 45 ? 'kontrollierter Druck' : v <= 70 ? 'aggressiv' : 'Vollrisiko';

	let riskLabel = $derived(labelFor(serveRisk));
	let delta = $derived(result.breaks - stdResult.breaks);
</script>

<figure class="vf">
	<figcaption class="vf-head">
		<h4>Den Vorteil flippen — was ein Aufschlag wirklich wert ist</h4>
		<p>
			Jedes Feld ist einer von 25 Aufschlägen in einem Satz. Links der Standarddruck als Referenz,
			rechts deine Einstellung. Die Felder sind immer gleich sortiert: <b>was beim Gegner bleibt,
			steht vorne</b> — <b>was wir selbst holen, steht hinten</b>. Beobachte, wie sich die Naht in
			der Mitte verschiebt.
		</p>
	</figcaption>

	<label class="vf-slider">
		<span class="vf-slider-top">
			<span>Aufschlagdruck</span>
			<b>{serveRisk} — {riskLabel}</b>
		</span>
		<input type="range" min="0" max="100" step="5" bind:value={serveRisk} />
		<span class="vf-slider-ends">
			<span>sicher rein</span>
			<span>Vollrisiko</span>
		</span>
	</label>

	<div class="vf-pair">
		<div class="vf-panel">
			<p class="vf-panel-head">
				Standard <span>Druck {STANDARD} — {labelFor(STANDARD)}</span>
			</p>
			<div class="vf-tiles">
				{#each stdTiles as t}
					<i class="vf-tile {t}"></i>
				{/each}
			</div>
			<p class="vf-panel-foot">
				<b>{one(stdResult.breaks)}</b> Breakpunkte
			</p>
		</div>

		<div class="vf-panel vf-panel-hi">
			<p class="vf-panel-head">
				Deine Einstellung <span>Druck {serveRisk} — {riskLabel}</span>
			</p>
			<div class="vf-tiles">
				{#each tiles as t}
					<i class="vf-tile {t}"></i>
				{/each}
			</div>
			<p class="vf-panel-foot">
				<b>{one(result.breaks)}</b> Breakpunkte
				<em class:neg={delta < -0.05} class:pos={delta > 0.05}>{signed(delta)}</em>
			</p>
		</div>
	</div>

	<div class="vf-legend">
		<div class="vf-side">
			<p class="vf-side-head">Bleibt beim Gegner — steht vorne</p>
			<ul>
				<li>
					<i class="vf-dot err"></i>
					<b>{countOf(stdTiles, 'err')} → {countOf(tiles, 'err')}</b> Aufschlagfehler
					<em>der Ballwechsel findet nie statt</em>
				</li>
				<li>
					<i class="vf-dot rally"></i>
					<b>{countOf(stdTiles, 'rally')} → {countOf(tiles, 'rally')}</b> kein Vorteil
					<em>wir kamen nie in die Angriffssituation</em>
				</li>
			</ul>
		</div>
		<div class="vf-side">
			<p class="vf-side-head">Holen wir uns — steht hinten</p>
			<ul>
				<li>
					<i class="vf-dot adv"></i>
					<b>{countOf(stdTiles, 'adv')} → {countOf(tiles, 'adv')}</b> Vorteil erobert
					<em>wir waren selbst in der Angriffssituation</em>
				</li>
				<li>
					<i class="vf-dot ace"></i>
					<b>{countOf(stdTiles, 'ace')} → {countOf(tiles, 'ace')}</b> Ass
					<em>genau 1 Punkt, dann ist der Ballwechsel vorbei</em>
				</li>
			</ul>
		</div>
	</div>

	<div class="vf-chart">
		<p class="vf-chart-title">Breakpunkte pro Satz, über das ganze Risikospektrum</p>
		<div class="vf-bars" role="group" aria-label="Breakpunkte je Aufschlagdruck">
			{#each curve as p}
				<button
					type="button"
					class="vf-bar"
					class:is-now={p.r === serveRisk}
					class:is-best={p.r === best.r}
					class:is-std={p.r === STANDARD}
					style="--h: {(p.breaks / maxBreaks) * 100}%"
					onclick={() => (serveRisk = p.r)}
					aria-label="Aufschlagdruck {p.r}: {one(p.breaks)} Breakpunkte"
				>
					<span class="vf-bar-fill"></span>
				</button>
			{/each}
		</div>
		<div class="vf-axis">
			<span>0</span>
			<span>50</span>
			<span>100</span>
		</div>
		<p class="vf-chart-hint">
			Balken anklicken, um den Druck zu übernehmen. <i class="vf-key std"></i> Standard ·
			<i class="vf-key now"></i> deine Einstellung · <i class="vf-key best"></i> bestes Ergebnis
		</p>
	</div>

	<p class="vf-verdict">
		Die meisten Breakpunkte bringt ein Aufschlagdruck von rund <b>{best.r}</b> — also klar unter 100.
		Mehr Druck schiebt die rote Zone von vorne nach innen, schneller als die orange Zone von hinten
		nachwächst. Unter dem Strich fressen die Fehler genau die Ballwechsel auf, in denen wir den
		Vorteil hätten erobern können.
	</p>

	<details class="vf-method">
		<summary>Wie wird das ausgewertet?</summary>
		<div class="vf-method-body">
			<p>
				Das ist eine <b>Simulation, keine Messung</b> — es stecken keine echten Spieldaten drin.
				Das Modell bildet nur die Logik ab, um die es im Text geht.
			</p>

			<p><b>Pro Aufschlag wird dreimal gewürfelt:</b></p>
			<ol>
				<li>
					<b>Fehler?</b> Dann endet alles sofort, Punkt für den Gegner. Die Fehlerquote wächst
					quadratisch mit dem Druck — am oberen Ende explodiert sie.
				</li>
				<li>
					<b>Ass?</b> Ein Punkt für uns, und der Ballwechsel ist vorbei. Asse wachsen
					überproportional mit dem Druck, bleiben aber auch bei Vollrisiko im einstelligen Bereich
					pro Satz.
				</li>
				<li>
					<b>Sonst Ballwechsel.</b> Hier entscheidet der Druck, ob der Gegner <em>out of system</em>
					ist — diese Wirkung sättigt, irgendwann bringt mehr Druck kaum noch Störung.
				</li>
			</ol>

			<p><b>Im Ballwechsel</b> liegt der Vorteil zuerst beim Gegner (er nimmt an). Dann gilt:</p>
			<ul>
				<li>Er schliesst ab → Punkt für ihn, Ballwechsel vorbei.</li>
				<li>Er macht einen Fehler → Punkt für uns.</li>
				<li>
					Der Ball kommt zurück → <b>wir haben den Vorteil</b>, das Feld wird blau. Jetzt gelten
					unsere Abschluss- und Fehlerquoten. Danach kann der Vorteil wieder zurückwandern, bis zu
					16 Mal.
				</li>
			</ul>

			<p><b>Was die Farben bedeuten:</b></p>
			<ul>
				<li>
					<b>Vorteil erobert (blau)</b> heisst nur, dass wir in diesem Ballwechsel mindestens
					einmal in der Angriffssituation waren — unabhängig davon, ob wir den Punkt dann auch
					gemacht haben. Es ist eine <em>Gelegenheit</em>, kein Punkt.
				</li>
				<li>
					<b>Breakpunkte</b> sind dagegen echte Punkte: Asse plus gewonnene Ballwechsel. Das ist
					die Zahl unter jedem Raster und die Höhe der Balken.
				</li>
			</ul>

			<p>
				<b>Rechenweg:</b> Jede Auswertung simuliert {N.toLocaleString('de-CH')} Aufschläge und rechnet
				das Ergebnis auf 25 herunter — so viele Aufschläge hat ein Team in einem Satz etwa. Die
				Felder werden auf ganze Zahlen gerundet, deshalb kann die Summe leicht von den Kommawerten
				abweichen. Block, Verteidigung und Gegenangriff sind fest auf ein durchschnittliches Team
				eingestellt, damit wirklich nur eine Grösse variiert.
			</p>
			<p>
				Die absoluten Zahlen sind Grössenordnungen. Die Aussage steckt nicht in den Werten, sondern
				in der <b>Form der Kurve</b>: Sie steigt, kippt und fällt wieder — das Maximum liegt nicht
				am Ende der Risikoskala.
			</p>
		</div>
	</details>
</figure>

<style>
	.vf {
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
	.vf-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.vf-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}
	.vf-head b {
		color: #475569;
	}

	/* ─── Regler ─────────────────────────────────────────────── */
	.vf-slider {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.vf-slider-top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 0.82rem;
		color: #475569;
	}
	.vf-slider-top b {
		color: #1d4ed8;
	}
	.vf-slider input {
		width: 100%;
		accent-color: #1d4ed8;
	}
	.vf-slider-ends {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: #94a3b8;
	}

	/* ─── Zwei Raster nebeneinander ──────────────────────────── */
	.vf-pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.9rem;
	}
	.vf-panel {
		border: 1px solid #e2e8f0;
		border-radius: 0.55rem;
		padding: 0.6rem 0.7rem 0.5rem;
		background: #f8fafc;
	}
	.vf-panel-hi {
		background: #eff6ff;
		border-color: #bfdbfe;
	}
	.vf-panel-head {
		margin: 0 0 0.5rem;
		font-size: 0.78rem;
		font-weight: 600;
		color: #1e3a5f;
		line-height: 1.3;
	}
	.vf-panel-head span {
		display: block;
		font-weight: 400;
		font-size: 0.68rem;
		color: #94a3b8;
	}
	.vf-tiles {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.25rem;
	}
	.vf-tile {
		display: block;
		aspect-ratio: 1;
		border-radius: 0.25rem;
		transition: background 0.25s ease;
	}
	.vf-panel-foot {
		margin: 0.55rem 0 0;
		font-size: 0.74rem;
		color: #64748b;
	}
	.vf-panel-foot b {
		font-size: 1.05rem;
		color: #1e3a5f;
	}
	.vf-panel-foot em {
		font-style: normal;
		font-weight: 600;
		margin-left: 0.3rem;
		color: #94a3b8;
	}
	.vf-panel-foot em.neg {
		color: #dc2626;
	}
	.vf-panel-foot em.pos {
		color: #16a34a;
	}

	/* ─── Farben ─────────────────────────────────────────────── */
	.vf-tile.err,
	.vf-dot.err {
		background: #ef4444;
	}
	.vf-tile.rally,
	.vf-dot.rally {
		background: #fecaca;
	}
	.vf-tile.adv,
	.vf-dot.adv {
		background: #1d4ed8;
	}
	.vf-tile.ace,
	.vf-dot.ace {
		background: #f59e0b;
	}

	/* ─── Legende ────────────────────────────────────────────── */
	.vf-legend {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.9rem;
	}
	.vf-side-head {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
	}
	.vf-side ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.vf-side li {
		font-size: 0.78rem;
		color: #334155;
		line-height: 1.35;
	}
	.vf-side b {
		color: #1e3a5f;
		font-variant-numeric: tabular-nums;
	}
	.vf-side em {
		display: block;
		font-style: normal;
		font-size: 0.7rem;
		color: #94a3b8;
		padding-left: 1.15rem;
	}
	.vf-dot {
		display: inline-block;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 0.2rem;
		vertical-align: -1px;
		margin-right: 0.4rem;
	}

	/* ─── Balkendiagramm ─────────────────────────────────────── */
	.vf-chart-title {
		margin: 0 0 0.4rem;
		font-size: 0.78rem;
		color: #475569;
	}
	.vf-bars {
		display: flex;
		align-items: flex-end;
		gap: 0.25rem;
		height: 7rem;
		border-bottom: 1px solid #e2e8f0;
	}
	.vf-bar {
		flex: 1;
		height: 100%;
		display: flex;
		align-items: flex-end;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	.vf-bar-fill {
		width: 100%;
		height: var(--h);
		background: #e2e8f0;
		border-radius: 0.2rem 0.2rem 0 0;
		transition: background 0.15s ease;
	}
	.vf-bar:hover .vf-bar-fill {
		background: #94a3b8;
	}
	.vf-bar.is-best .vf-bar-fill {
		background: #93c5fd;
	}
	.vf-bar.is-std .vf-bar-fill {
		background: #64748b;
	}
	.vf-bar.is-now .vf-bar-fill {
		background: #1d4ed8;
	}
	.vf-axis {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: #94a3b8;
		margin-top: 0.2rem;
	}
	.vf-chart-hint {
		margin: 0.35rem 0 0;
		font-size: 0.7rem;
		color: #94a3b8;
	}
	.vf-key {
		display: inline-block;
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 0.15rem;
		vertical-align: -1px;
	}
	.vf-key.std {
		background: #64748b;
	}
	.vf-key.now {
		background: #1d4ed8;
	}
	.vf-key.best {
		background: #93c5fd;
	}

	.vf-verdict {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.6;
		color: #334155;
		background: #f8fafc;
		border-left: 3px solid #1d4ed8;
		padding: 0.6rem 0.8rem;
		border-radius: 0 0.4rem 0.4rem 0;
	}

	/* ─── Methodik ───────────────────────────────────────────── */
	.vf-method {
		border-top: 1px solid #e2e8f0;
		padding-top: 0.8rem;
	}
	.vf-method summary {
		cursor: pointer;
		font-size: 0.8rem;
		font-weight: 600;
		color: #1d4ed8;
	}
	.vf-method-body {
		font-size: 0.78rem;
		line-height: 1.6;
		color: #475569;
	}
	.vf-method-body p {
		margin: 0.7rem 0 0.4rem;
	}
	.vf-method-body ol,
	.vf-method-body ul {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.vf-method-body b {
		color: #1e3a5f;
	}

	@media (max-width: 560px) {
		.vf {
			padding: 1rem;
		}
		.vf-pair,
		.vf-legend {
			grid-template-columns: 1fr;
		}
	}
</style>
