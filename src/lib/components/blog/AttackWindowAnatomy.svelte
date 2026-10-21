<script>
	/**
	 * Das Angriffsfenster aus Sicht des Zuspielers — 2D, Blick von vorne (entlang
	 * des Netzes).
	 *
	 * Die Frage, um die es hier geht, ist nicht "wie gross ist das Fenster",
	 * sondern: **wie muss der Zuspieler das Fenster treffen, damit der Ball
	 * möglichst lange darin bleibt?**
	 *
	 * Physik: Der Ball fliegt als Parabel. Festgelegt ist der Kontaktpunkt des
	 * Zuspielers. Frei wählbar sind
	 *   - die Scheitelhöhe (wie hoch spiele ich)
	 *   - die Lage des Scheitelpunkts (wie weit vor dem Fenster kippt der Ball)
	 *
	 * Daraus folgt alles andere: Horizontalgeschwindigkeit, Flugzeit, Eintritts-
	 * punkt ins Fenster und — die eigentliche Währung — die Verweildauer im
	 * Fenster.
	 *
	 * Ergebnis zum Entdecken: Das Maximum liegt nicht beim hohen Ball und nicht
	 * beim flach durchgeschossenen, sondern dort, wo der Scheitelpunkt knapp vor
	 * dem Fenster auf Höhe der oberen Kante liegt — der Ball fällt dann durch die
	 * obere Ecke ein und driftet langsam durch das ganze Volumen.
	 *
	 * Verwendung im Blog:
	 *   <AttackWindowAnatomy />
	 */

	const G = 9.81;
	const NET_H = 2.43;
	const NET_LOW = NET_H - 1.0;     // Netzunterkante
	const COURT_HW = 4.5;            // halbe Feldbreite = Antennenabstand zur Mitte
	const ANT_TOP = NET_H + 0.8;     // Antenne ragt 0.8 m über die Netzkante

	// ─── Szenarien ───────────────────────────────────────────────────────────────
	// sx/sy  = Kontaktpunkt des Zuspielers (x = Abstand zur Fenstermitte)
	// x0/x1  = seitliche Grenzen des Fensters, y0/y1 = Höhengrenzen
	const SCENARIOS = [
		{
			id: 'aussen',
			name: 'Aussen — Zone 4',
			goal: 'top',
			sx: 4.2, sy: 2.15,
			x0: -0.6, x1: 0.6,
			y0: 2.45, y1: 3.05,
			axMin: -1.2, axMax: 3.4,
			pad: { l: 1.0, r: 0.7 },
			// Lage der Fenstermitte auf dem Feld (x = 0 ist die Feldmitte zwischen den Antennen)
			courtX: -3.2,
			start: { apexX: 1.65, apexH: 3.8 },
			presets: [
				{ label: 'Zu hoch', apexX: 1.68, apexH: 4.4 },
				{ label: 'Durchgeschossen', apexX: -1.2, apexH: 3.0 },
				{ label: 'Zu kurz', apexX: 3.02, apexH: 3.4 },
			],
			hint: 'Der Klassiker: 4–5 m Flugweg. Hier entscheidet sich, ob der Angreifer Zeit im Fenster hat oder dem Ball hinterherspringt.',
		},
		{
			id: 'quick',
			name: 'Quick — Zone 3',
			// Hier zielt der Zuspieler auf die *untere* Ecke auf seiner Seite: Der Ball
			// steigt ins Fenster hinein, darf oben nicht heraus und fällt unten wieder
			// heraus. Deshalb liegt das Fenster auch ganz nah beim Zuspielkontakt.
			goal: 'bottom',
			sx: 0.45, sy: 2.1,
			x0: -0.3, x1: 0.3,
			y0: 2.6, y1: 3.4,
			axMin: -0.6, axMax: 0.38,
			pad: { l: 1.9, r: 1.5 },
			courtX: 0.95,
			start: { apexX: 0.1, apexH: 3.0 },
			presets: [
				{ label: 'Oben raus', apexX: 0.1, apexH: 4.0 },
				{ label: 'Zu flach', apexX: -0.3, apexH: 2.9 },
				{ label: 'Zu weit vorne', apexX: -0.1, apexH: 3.3 },
			],
			hint: 'Das Fenster liegt fast über dem Zuspieler. Der Ball steigt durch die untere Ecke hinein, kippt im Fenster und fällt unten wieder heraus — oben darf er nicht hinaus.',
		},
	];

	let scId = $state('aussen');
	let sc = $derived(SCENARIOS.find((s) => s.id === scId) ?? SCENARIOS[0]);

	let apexX = $state(SCENARIOS[0].start.apexX);
	let apexH = $state(SCENARIOS[0].start.apexH);

	/** @param {string} id */
	function pickScenario(id) {
		const next = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
		scId = id;
		apexX = next.start.apexX;
		apexH = next.start.apexH;
	}

	// ─── Flugbahn ────────────────────────────────────────────────────────────────
	/**
	 * Parabel durch den Zuspielkontakt mit Scheitel bei (apexX, apexH).
	 * Der Ball läuft von grossem x (Zuspieler) zu kleinem x (Fenster).
	 */
	/** @param {any} s @param {number} ax @param {number} ah */
	function solve(s, ax, ah) {
		const rise = ah - s.sy;
		const d = s.sx - ax;
		if (rise <= 0.02 || d <= 0.08) return null;
		const k = rise / (d * d);          // y = ah − k·(x − ax)²
		const vx = Math.sqrt(G / (2 * k)); // Horizontalgeschwindigkeit
		const y = (/** @type {number} */ x) => ah - k * (x - ax) * (x - ax);
		const vy = (/** @type {number} */ x) => 2 * k * vx * (x - ax); // + = steigt

		// Verweildauer: numerisch abtasten
		let xIn = null, xOut = null;
		let aboveOnly = true, belowOnly = true;
		let overTop = false;
		for (let x = s.sx; x >= s.x0 - 0.6; x -= 0.004) {
			const yy = y(x);
			if (x <= s.x1 && x >= s.x0) {
				if (yy > s.y1) { belowOnly = false; overTop = true; }
				else if (yy < s.y0) aboveOnly = false;
				else {
					aboveOnly = false;
					belowOnly = false;
					if (xIn === null) xIn = x;
					xOut = x;
				}
			}
		}

		const dwell = xIn !== null && xOut !== null ? (xIn - xOut) / vx : 0;
		// Wo verlässt der Ball das Fenster? (unten / seitlich / oben)
		const exitSide =
			xOut === null ? null
			: y(xOut) <= s.y0 + 0.04 ? 'unten'
			: y(xOut) >= s.y1 - 0.04 ? 'oben'
			: 'seitlich';
		return {
			k, vx, y, vy, xIn, xOut, dwell, overTop, exitSide,
			miss: xIn === null ? (aboveOnly ? 'hoch' : belowOnly ? 'tief' : 'daneben') : null,
			tFlight: (s.sx - (xIn ?? 0)) / vx,
		};
	}

	/** Bestmögliche Verweildauer für ein Szenario (einmal pro Szenario gesucht). */
	const bestCache = new Map();
	/** @param {any} s */
	function best(s) {
		if (bestCache.has(s.id)) return bestCache.get(s.id);
		let b = { dwell: 0, apexX: s.start.apexX, apexH: s.start.apexH };
		for (let ax = s.axMin; ax <= s.axMax; ax += 0.02) {
			for (let ah = s.y0 - 0.3; ah <= 4.6; ah += 0.02) {
				const r = solve(s, ax, ah);
				if (!r || r.dwell <= b.dwell) continue;
				// Beim Quick zählt nur, was auch wirklich "unten raus" fällt und oben drin bleibt.
				if (s.goal === 'bottom' && (r.overTop || r.exitSide !== 'unten')) continue;
				b = { dwell: r.dwell, apexX: +ax.toFixed(2), apexH: +ah.toFixed(2) };
			}
		}
		bestCache.set(s.id, b);
		return b;
	}

	let flight = $derived(solve(sc, apexX, apexH));
	let optimum = $derived(best(sc));
	let ratio = $derived(flight && optimum.dwell > 0 ? flight.dwell / optimum.dwell : 0);

	// ─── Bewertung ───────────────────────────────────────────────────────────────
	let entryText = $derived.by(() => {
		if (!flight || flight.xIn === null) return '—';
		const yIn = flight.y(flight.xIn);
		if (sc.goal === 'bottom') {
			if (flight.xIn < sc.x1 - 0.02) return 'von unten, erst in der Fenstermitte';
			if (yIn <= sc.y0 + 0.3) return 'durch die untere Ecke';
			if (yIn >= sc.y1 - 0.05) return 'ganz oben — zu hoch';
			return 'seitlich, aber zu hoch';
		}
		if (yIn >= sc.y1 - 0.03) return 'durch die obere Kante';
		if (flight.xIn >= sc.x1 - 0.02) return 'seitlich, aus Richtung Zuspieler';
		return 'spät, über die hintere Hälfte';
	});

	let exitText = $derived(flight && flight.exitSide ? `${flight.exitSide} aus dem Fenster` : '—');

	let verdict = $derived.by(() => {
		if (!flight) return { tone: 'bad', text: 'Diese Kombination gibt es nicht — der Scheitelpunkt muss über dem Kontaktpunkt und vor dem Zuspieler liegen.' };
		if (sc.goal === 'bottom') {
			if (flight.overTop)
				return { tone: 'bad', text: 'Der Ball steigt oben aus dem Fenster heraus. Beim Quick soll er im Fenster kippen — der Scheitelpunkt muss unter die Oberkante.' };
			if (flight.miss === 'tief')
				return { tone: 'bad', text: 'Der Ball erreicht das Fenster gar nicht — er bleibt darunter. Höher spielen.' };
			if (flight.miss)
				return { tone: 'bad', text: 'Der Ball verfehlt das Fenster.' };
			if (flight.exitSide !== 'unten')
				return { tone: 'ok', text: 'Der Ball verlässt das Fenster seitlich statt unten. Der Scheitelpunkt liegt zu weit vorne — er gehört in die Fenstermitte, dann fällt der Ball unten wieder heraus.' };
			if (ratio > 0.9)
				return { tone: 'good', text: 'So soll es aussehen: Der Ball steigt durch die untere Ecke auf der Zuspielerseite ins Fenster, kippt knapp unter der Oberkante und fällt unten wieder heraus. Der Angreifer kann im Auf- und im Abstieg schlagen.' };
			if (ratio > 0.7)
				return { tone: 'ok', text: 'Brauchbar. Der Ball ist im Fenster, aber noch nicht so lange wie möglich — etwas höher kippen lassen, näher an der Oberkante.' };
			return { tone: 'ok', text: 'Der Ball ist nur kurz im Fenster. Er soll tief in der Zuspielerecke eintreten, im Fenster kippen und unten wieder herausfallen.' };
		}
		if (flight.miss === 'hoch')
			return { tone: 'bad', text: 'Der Ball fliegt über das Fenster hinweg. Zu hoch gespielt oder der Scheitelpunkt liegt zu weit hinten — der Angreifer kommt gar nicht an den Ball.' };
		if (flight.miss === 'tief')
			return { tone: 'bad', text: 'Der Ball fällt vor dem Fenster durch. Zu kurz gespielt — der Angreifer müsste den Anlauf abbrechen.' };
		if (flight.miss)
			return { tone: 'bad', text: 'Der Ball verfehlt das Fenster.' };
		if (ratio > 0.9)
			return { tone: 'good', text: 'So soll es aussehen: Der Scheitelpunkt liegt knapp vor dem Fenster, der Ball fällt durch die obere Ecke ein und driftet langsam durch das ganze Volumen. Der Angreifer kann den Schlagzeitpunkt wählen.' };
		if (ratio > 0.7)
			return { tone: 'ok', text: 'Brauchbar. Der Ball ist im Fenster, aber noch nicht so lange wie möglich — ein tieferer Scheitelpunkt näher am Fenster bringt mehr Zeit.' };
		if (flight.vx > 8)
			return { tone: 'ok', text: 'Durchgeschossen: flach und schnell. Der Ball ist zwar im Fenster, aber nur kurz — der Angreifer muss den Treffpunkt exakt erwischen.' };
		return { tone: 'ok', text: 'Der Ball streift das Fenster nur. Er kommt zu steil von oben oder erst in der hinteren Hälfte an — der Angreifer verliert seinen Spielraum.' };
	});

	// ─── Zeichnung ───────────────────────────────────────────────────────────────
	const W = 680, H = 300, PADX = 26, PADY = 26;
	// tief genug, damit das ganze Netz (Oberkante 2.43 m bis 1.43 m) im Bild ist
	const Y_LO = 1.35;

	// Antennen in den lokalen Koordinaten des Szenarios (x = 0 ist die Fenstermitte)
	let antL = $derived(-COURT_HW - sc.courtX);
	let antR = $derived(COURT_HW - sc.courtX);

	let geom = $derived.by(() => {
		const xLeft = sc.x0 - sc.pad.l;
		const xRight = sc.sx + sc.pad.r;
		const yTop = Math.max(apexH + 0.35, 3.6);
		const ppm = Math.min((W - 2 * PADX) / (xRight - xLeft), (H - 2 * PADY) / (yTop - Y_LO));
		const usedW = (xRight - xLeft) * ppm;
		const ox = (W - usedW) / 2 - xLeft * ppm;
		const oy = H - PADY + Y_LO * ppm;
		return { ppm, px: (/** @type {number} */ m) => ox + m * ppm, py: (/** @type {number} */ m) => oy - m * ppm };
	});

	// ─── Übersicht: ganzes Netz von Antenne zu Antenne ────────────────────────
	const WO = 680, HO = 150, PADO = 14;
	let over = $derived.by(() => {
		const xLeft = antL - 0.6, xRight = antR + 0.6;
		const yLo = NET_LOW - 0.2, yHi = ANT_TOP + 0.45;
		const ppm = Math.min((WO - 2 * PADO) / (xRight - xLeft), (HO - 2 * PADO) / (yHi - yLo));
		const ox = (WO - (xRight - xLeft) * ppm) / 2 - xLeft * ppm;
		const oy = HO - PADO + yLo * ppm;
		return { ppm, px: (/** @type {number} */ m) => ox + m * ppm, py: (/** @type {number} */ m) => oy - m * ppm };
	});

	let path = $derived.by(() => {
		if (!flight) return '';
		const pts = [];
		for (let x = sc.sx; x >= sc.x0 - sc.pad.l; x -= 0.03) {
			const y = flight.y(x);
			if (y < Y_LO) break;
			pts.push(`${geom.px(x).toFixed(1)},${geom.py(y).toFixed(1)}`);
		}
		return pts.length ? `M ${pts.join(' L ')}` : '';
	});

	let insidePath = $derived.by(() => {
		if (!flight || flight.xIn === null) return '';
		const pts = [];
		for (let x = flight.xIn; x >= flight.xOut; x -= 0.01) {
			pts.push(`${geom.px(x).toFixed(1)},${geom.py(flight.y(x)).toFixed(1)}`);
		}
		return pts.length ? `M ${pts.join(' L ')}` : '';
	});

	/** Ballpositionen im 50-ms-Takt — die Punktdichte zeigt das Tempo. */
	let ticks = $derived.by(() => {
		if (!flight) return [];
		const out = [];
		for (let t = 0; t < 2.2; t += 0.05) {
			const x = sc.sx - flight.vx * t;
			if (x < sc.x0 - sc.pad.l) break;
			const y = flight.y(x);
			if (y < Y_LO) break;
			out.push({ x: geom.px(x), y: geom.py(y), inside: x <= sc.x1 && x >= sc.x0 && y <= sc.y1 && y >= sc.y0 });
		}
		return out;
	});
</script>

<figure class="awa">
	<figcaption class="head">
		<h4>Das Fenster treffen — so, dass der Ball lange darin bleibt</h4>
		<p>
			Blick von vorne auf das Netz. Der Zuspieler legt nur zwei Dinge fest: wie hoch
			er spielt und wo der Ball kippt. Alles andere — Tempo, Flugzeit, Eintrittsecke
			und vor allem die Zeit im Fenster — ergibt sich daraus.
		</p>
	</figcaption>

	<div class="tabs">
		{#each SCENARIOS as s}
			<button class="tab" class:on={scId === s.id} onclick={() => pickScenario(s.id)}>{s.name}</button>
		{/each}
	</div>

	<!-- Übersicht: das ganze Netz mit beiden Antennen — wo liegt das Fenster? -->
	<svg class="over" viewBox="0 0 {WO} {HO}" role="img" aria-label="Das ganze Netz mit Antennen und der Lage des Fensters">
		<rect x="0" y="0" width={WO} height={HO} fill="#f1f5f9" rx="8" />

		<rect
			x={over.px(antL)} y={over.py(NET_H)}
			width={over.px(antR) - over.px(antL)}
			height={Math.max(0, over.py(NET_LOW) - over.py(NET_H))}
			fill="#334155" opacity="0.1"
		/>
		<line x1={over.px(antL)} y1={over.py(NET_H)} x2={over.px(antR)} y2={over.py(NET_H)} stroke="#334155" stroke-width="2" />
		<line x1={over.px(antL)} y1={over.py(NET_LOW)} x2={over.px(antR)} y2={over.py(NET_LOW)} stroke="#334155" stroke-width="1.5" opacity="0.6" />

		<!-- Antennen (rot/weiß, 0.8 m über der Netzkante) -->
		{#each [antL, antR] as ax}
			{#each [0, 1, 2, 3, 4, 5] as i}
				<rect
					x={over.px(ax) - 2.5}
					y={over.py(NET_LOW + ((i + 1) * (ANT_TOP - NET_LOW)) / 6)}
					width="5"
					height={Math.max(0, (over.py(NET_LOW) - over.py(ANT_TOP)) / 6)}
					fill={i % 2 ? '#dc2626' : '#ffffff'}
					stroke="#b91c1c" stroke-width="0.6"
				/>
			{/each}
		{/each}
		<text x={over.px(antL)} y={over.py(ANT_TOP) - 6} text-anchor="middle" class="lbl">Antenne</text>
		<text x={over.px(antR)} y={over.py(ANT_TOP) - 6} text-anchor="middle" class="lbl">Antenne</text>

		<!-- Fenster und Zuspieler an ihrem Platz auf dem Netz -->
		<rect
			x={over.px(sc.x0)} y={over.py(sc.y1)}
			width={Math.max(3, over.px(sc.x1) - over.px(sc.x0))}
			height={Math.max(2, over.py(sc.y0) - over.py(sc.y1))}
			fill="#2563eb" opacity="0.2" stroke="#2563eb" stroke-width="1.5" rx="2"
		/>
		<circle cx={over.px(sc.sx)} cy={over.py(sc.sy)} r="4" fill="#0f766e" />
		<text x={over.px((sc.x0 + sc.x1) / 2)} y={over.py(sc.y1) - 8} text-anchor="middle" class="lbl strong">Fenster</text>
		<text x={over.px(sc.sx)} y={over.py(sc.sy) + 15} text-anchor="middle" class="lbl">Zuspieler</text>
		<text x={PADO + 4} y={HO - 6} class="lbl">Ganzes Netz · 9 m zwischen den Antennen — unten der Ausschnitt</text>
	</svg>

	<svg viewBox="0 0 {W} {H}" role="img" aria-label="Flugbahn des Zuspiels durch das Angriffsfenster">
		<rect x="0" y="0" width={W} height={H} fill="#f8fafc" rx="8" />

		<!-- Boden -->
		<line x1="8" y1={geom.py(Y_LO)} x2={W - 8} y2={geom.py(Y_LO)} stroke="#cbd5e1" stroke-width="1" />

		<!-- Netz -->
		<line x1="14" y1={geom.py(NET_H)} x2={W - 14} y2={geom.py(NET_H)} stroke="#334155" stroke-width="2" />
		<rect x="14" y={geom.py(NET_H)} width={W - 28} height={Math.max(0, geom.py(NET_LOW) - geom.py(NET_H))} fill="#334155" opacity="0.08" />
		<line x1="14" y1={geom.py(NET_LOW)} x2={W - 14} y2={geom.py(NET_LOW)} stroke="#334155" stroke-width="1.5" opacity="0.6" />

		<!-- Antenne, falls sie in diesen Ausschnitt fällt -->
		{#each [antL, antR] as ax}
			{#if geom.px(ax) > 10 && geom.px(ax) < W - 10}
				{#each [0, 1, 2, 3, 4, 5] as i}
					<rect
						x={geom.px(ax) - 3}
						y={geom.py(NET_LOW + ((i + 1) * (ANT_TOP - NET_LOW)) / 6)}
						width="6"
						height={Math.max(0, (geom.py(NET_LOW) - geom.py(ANT_TOP)) / 6)}
						fill={i % 2 ? '#dc2626' : '#ffffff'}
						stroke="#b91c1c" stroke-width="0.6"
					/>
				{/each}
				<text x={geom.px(ax)} y={geom.py(ANT_TOP) - 7} text-anchor="middle" class="lbl">Antenne</text>
			{/if}
		{/each}
		<text x={W - 18} y={geom.py(NET_H) - 8} text-anchor="end" class="lbl">Netzkante · {NET_H} m</text>
		<text x={W - 18} y={geom.py(NET_LOW) + 14} text-anchor="end" class="lbl">Netzunterkante · {NET_LOW.toFixed(2)} m</text>

		<!-- Fenster -->
		<rect
			x={geom.px(sc.x0)} y={geom.py(sc.y1)}
			width={geom.px(sc.x1) - geom.px(sc.x0)}
			height={geom.py(sc.y0) - geom.py(sc.y1)}
			fill="#2563eb" opacity="0.12" stroke="#2563eb" stroke-width="2" rx="3"
		/>
		<text x={(geom.px(sc.x0) + geom.px(sc.x1)) / 2} y={geom.py(sc.y1) - 24} text-anchor="middle" class="lbl strong">
			Angriffsfenster
		</text>

		<!-- Zielecke: beim Aussenzuspiel oben, beim Quick unten — je auf der Seite des Zuspielers -->
		{#if sc.goal === 'bottom'}
			<circle cx={geom.px(sc.x1)} cy={geom.py(sc.y0)} r="6" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="3 3" />
			<text x={geom.px(sc.x1) + 11} y={geom.py(sc.y0) + 16} class="lbl green">Zielecke</text>
			<!-- Unterkante = Austritt -->
			<line x1={geom.px(sc.x0)} y1={geom.py(sc.y0)} x2={geom.px(sc.x1)} y2={geom.py(sc.y0)} stroke="#16a34a" stroke-width="3" opacity="0.5" />
			<text x={geom.px(sc.x0) - 10} y={geom.py(sc.y0) + 15} text-anchor="end" class="lbl green">unten wieder raus</text>
		{:else}
			<circle cx={geom.px(sc.x1)} cy={geom.py(sc.y1)} r="6" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="3 3" />
			<text x={geom.px(sc.x1) + 11} y={geom.py(sc.y1) - 6} class="lbl green">Zielecke</text>
		{/if}

		<!-- Flugbahn -->
		{#if path}
			<path d={path} fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" opacity="0.9" />
		{/if}
		{#if insidePath}
			<path d={insidePath} fill="none" stroke="#16a34a" stroke-width="6" stroke-linecap="round" opacity="0.85" />
		{/if}

		<!-- Scheitelpunkt -->
		<g opacity="0.8">
			<line x1={geom.px(apexX)} y1={geom.py(apexH)} x2={geom.px(apexX)} y2={geom.py(Y_LO + 0.1)} stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 4" />
			<circle cx={geom.px(apexX)} cy={geom.py(apexH)} r="4" fill="#64748b" />
			<text x={geom.px(apexX)} y={geom.py(apexH) - 10} text-anchor="middle" class="lbl">Scheitel</text>
		</g>

		<!-- Ball im 50-ms-Takt -->
		{#each ticks as p}
			<circle cx={p.x} cy={p.y} r={p.inside ? 4.5 : 3} fill={p.inside ? '#15803d' : '#fbbf24'} opacity={p.inside ? 0.95 : 0.65} />
		{/each}

		<!-- Zuspieler -->
		<circle cx={geom.px(sc.sx)} cy={geom.py(sc.sy)} r="7" fill="#0f766e" />
		<text x={geom.px(sc.sx)} y={geom.py(sc.sy) + 24} text-anchor="middle" class="lbl">Zuspielkontakt</text>

		<!-- Ein- und Austritt -->
		{#if flight && flight.xIn !== null}
			<circle cx={geom.px(flight.xIn)} cy={geom.py(flight.y(flight.xIn))} r="5" fill="#fff" stroke="#15803d" stroke-width="2.5" />
			<circle cx={geom.px(flight.xOut)} cy={geom.py(flight.y(flight.xOut))} r="5" fill="#fff" stroke="#15803d" stroke-width="2.5" />
		{/if}

		<!-- Legende -->
		<g transform="translate({W - 186}, 18)">
			<circle cx="7" cy="7" r="4" fill="#fbbf24" />
			<text x="18" y="11" class="lbl">Ballposition alle 50 ms</text>
		</g>
	</svg>

	<div class="controls">
		<label>
			<span class="k">Scheitelhöhe des Zuspiels</span>
			<input type="range" min={(sc.y0 - 0.35).toFixed(2)} max="4.6" step="0.05" bind:value={apexH} />
			<span class="v">{apexH.toFixed(2)} m</span>
		</label>
		<label>
			<span class="k">Scheitelpunkt vor dem Fenster</span>
			<input type="range" min={sc.axMin} max={sc.axMax} step="0.05" bind:value={apexX} />
			<span class="v">{apexX.toFixed(2)} m</span>
		</label>
	</div>

	<div class="presets">
		<button onclick={() => { apexX = optimum.apexX; apexH = optimum.apexH; }}>Längste Zeit im Fenster</button>
		{#each sc.presets as p}
			<button onclick={() => { apexX = p.apexX; apexH = p.apexH; }}>{p.label}</button>
		{/each}
	</div>

	<div class="stats">
		<div>
			<span class="k">Ball im Fenster</span>
			<span class="v big">{flight ? (flight.dwell * 1000).toFixed(0) : '0'} ms</span>
		</div>
		<div><span class="k">Eintritt</span><span class="v">{entryText}</span></div>
		<div><span class="k">Austritt</span><span class="v">{exitText}</span></div>
		<div><span class="k">Flugzeit bis Fenster</span><span class="v">{flight && flight.xIn !== null ? flight.tFlight.toFixed(2) : '—'} s</span></div>
		<div><span class="k">Balltempo horizontal</span><span class="v">{flight ? flight.vx.toFixed(1) : '—'} m/s</span></div>
	</div>

	<div class="meter" aria-hidden="true">
		<div class="meter-bar"><div class="meter-fill" style="width:{Math.min(100, ratio * 100).toFixed(0)}%"></div></div>
		<span class="meter-cap">
			{Math.round(Math.min(100, ratio * 100))} % der maximal möglichen Zeit
			(bestmöglich hier: {(optimum.dwell * 1000).toFixed(0)} ms)
		</span>
	</div>

	<p class="verdict" class:good={verdict.tone === 'good'} class:bad={verdict.tone === 'bad'}>{verdict.text}</p>
	<p class="note">{sc.hint}</p>
</figure>

<style>
	.awa {
		width: 100%;
		max-width: 860px;
		margin: 2rem auto;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.4rem 1.3rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
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
	.over { margin-bottom: -0.3rem; }
	:global(.awa .lbl) { font-size: 12px; fill: #64748b; }
	:global(.awa .lbl.strong) { fill: #1d4ed8; font-weight: 700; }
	:global(.awa .lbl.green) { fill: #15803d; font-weight: 700; }

	.controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.4rem 1.2rem; }
	.controls label { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.15rem 0.6rem; }
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

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.5rem;
		border-top: 1px solid #e2e8f0;
		padding-top: 0.7rem;
	}
	.stats div { display: flex; flex-direction: column; }
	.k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
	.v { font-size: 0.92rem; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
	.v.big { font-size: 1.15rem; color: #15803d; }

	.meter { display: flex; flex-direction: column; gap: 0.25rem; }
	.meter-bar { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
	.meter-fill { height: 100%; background: linear-gradient(90deg, #60a5fa, #16a34a); border-radius: 999px; transition: width 0.12s linear; }
	.meter-cap { font-size: 0.74rem; color: #94a3b8; }

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
