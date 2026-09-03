<script>
	/**
	 * Annahme im Riegel — Draufsicht auf das ganze Feld (beide Hälften)
	 *
	 * Ein zufälliger Aufschlag kommt von der Gegenseite über das Netz und driftet
	 * seitlich. Der annehmende Spieler läuft in zwei Etappen:
	 *   1. direkt zum Ball (schnell — die relative Geschwindigkeit ist dabei egal)
	 *   2. Angleichphase kurz vor dem Kontakt: die x-Geschwindigkeit des Balls
	 *      wird mit dem Schwerpunkt übernommen, v_rel geht gegen null
	 * Für jeden der drei Annahmespieler wird die relative x-Geschwindigkeit zum
	 * Ball (parallel zum Netz) eingezeichnet:
	 *   grün  = klein (einfach) oder Ball innerhalb der kontrollierten Zone
	 *   grau  = mittel
	 *   rot   = gross (schwierig)
	 */

	// ─── Geometrie ───────────────────────────────────────────────────────────────
	const PPM = 34;                        // Pixel pro Meter
	const HALF_D = 9;                      // Feldtiefe je Hälfte
	const HALF_W = 4.5;                    // halbe Feldbreite
	const TOP = 46;                        // Rand oben (Aufschlagraum)
	const NET_Y = TOP + HALF_D * PPM;      // Bildschirm-y des Netzes
	const SVG_W = 9 * PPM + 86;
	const SVG_H = NET_Y + HALF_D * PPM + 46;
	const CX = SVG_W / 2;

	const ZONE_R_M = 2.0;                  // Bewegungsradius je Spieler
	const ARM_M = 0.9;                     // seitliche Armreichweite
	const MAX_V = 3.5;                     // maximale Schwerpunkt-Geschwindigkeit in x

	// Bewertung
	const EASY_V = 1.0;                    // m/s — darunter gilt v_rel als klein
	const NEAR_X = 0.30;                   // m — Breite der kontrollierten Zone um den Schwerpunkt
	const SYNC_T = 0.40;                   // s — Dauer der Angleichphase vor dem Kontakt
	const ACC = 9;                         // m/s² — Beschleunigung des Schwerpunkts
	const SLIDE_M = 0.60;                  // m — so weit kann man vor dem Kontakt mitgleiten
	const TRACK_N = 120;                   // Schritte der Bewegungssimulation

	const C_EASY = '#16a34a';              // in der Zone UND v_rel klein
	const C_MID = '#f97316';               // in der Zone, aber v_rel gross
	const C_HARD = '#ef4444';              // v_rel klein, aber Ball nicht in der Zone
	const C_NEUTRAL = '#94a3b8';           // alles andere
	const PX_PER_MS = 16;                  // Pfeillänge pro m/s

	/** @param {number} xm */ function fx(xm) { return CX + xm * PPM; }
	/** @param {number} dm Tiefe in m ab Netz (negativ = Gegenseite) */
	function fy(dm) { return NET_Y + dm * PPM; }

	// Grundaufstellung des Annahmeriegels
	const BASE = [
		{ id: 'L', name: 'Links',  x: -3.0, d: 6.4 },
		{ id: 'M', name: 'Mitte',  x:  0.0, d: 7.0 },
		{ id: 'R', name: 'Rechts', x:  3.0, d: 6.4 },
	];

	// ─── zufälliger Aufschlag ────────────────────────────────────────────────────
	/** @param {number} a @param {number} b */
	function rand(a, b) { return a + Math.random() * (b - a); }

	// Der Aufschlag fliegt geradlinig: Richtung und seitliche Geschwindigkeit
	// bleiben über die ganze Flugbahn gleich — auch beim Überqueren des Netzes.
	function makeServe() {
		const serveD = -(HALF_D + 0.8);                 // hinter der gegnerischen Grundlinie
		const hitD = +rand(5.4, 8.1).toFixed(2);        // Tiefe des Kontaktpunkts
		const totalD = hitD - serveD;                   // Gesamtstrecke in Feldtiefe
		const totalT = +rand(1.05, 1.5).toFixed(2);     // Flugzeit Aufschlag → Kontakt
		let serveX = 0, hitX = 0;
		for (let i = 0; i < 60; i++) {
			serveX = +rand(-3.6, 3.6).toFixed(2);
			hitX = +rand(-4.2, 4.2).toFixed(2);
			const vx = Math.abs(hitX - serveX) / totalT;  // konstante x-Geschwindigkeit
			if (vx > 0.3 && vx < 3.6) break;
		}
		const fNet = -serveD / totalD;                  // Anteil der Strecke bis zum Netz
		return {
			serveX, serveD, hitX, hitD, totalT,
			inX: +(serveX + (hitX - serveX) * fNet).toFixed(3),  // x beim Überqueren des Netzes
			T: totalT * (1 - fNet),                       // Flugzeit Netz → Kontakt
			uNet: fNet,
		};
	}

	let scn = $state(makeServe());

	/** @type {'angleichen'|'nurhin'} */
	let mode = $state(/** @type {'angleichen'|'nurhin'} */ ('angleichen'));

	// ─── Ballkinematik (Draufsicht) ──────────────────────────────────────────────
	// u = 0 beim Aufschlag, u = 1 beim Kontakt — geradlinig, konstante Geschwindigkeit
	/** @param {number} u */
	function ballXAt(u) { return scn.serveX + (scn.hitX - scn.serveX) * u; }
	/** @param {number} u */
	function ballDAt(u) { return scn.serveD + (scn.hitD - scn.serveD) * u; }
	let ballVx = $derived((scn.hitX - scn.serveX) / scn.totalT);

	// ─── wer übernimmt? ──────────────────────────────────────────────────────────
	let takerIdx = $derived(
		BASE.reduce((best, p, i) => (Math.abs(p.x - scn.hitX) < Math.abs(BASE[best].x - scn.hitX) ? i : best), 0)
	);
	let taker = $derived(BASE[takerIdx]);

	// Beginn der Angleichphase (Anteil der Flugzeit)
	let uSync = $derived(Math.max(0.35, Math.min(0.9, 1 - SYNC_T / scn.totalT)));

	// Der Kontaktpunkt steht von Anfang an fest (gerade Flugbahn) — der Spieler
	// läuft direkt darauf zu. Damit er im Kontaktmoment mit dem Ball mitgeht,
	// zielt er auf einen Punkt, der um die Mitgleitstrecke gegen die Ballrichtung
	// versetzt ist (höchstens SLIDE_M) und gleitet die letzten SYNC_T mit.
	let syncT = $derived(scn.totalT * (1 - uSync));
	// Anteil der Ballgeschwindigkeit, den wir übernehmen können
	let syncW = $derived(
		mode === 'nurhin' ? 0 : Math.min(1, SLIDE_M / Math.max(0.01, Math.abs(ballVx) * syncT))
	);
	let vSync = $derived(syncW * ballVx);            // Zielgeschwindigkeit im Kontakt
	let aimX = $derived(scn.hitX - vSync * syncT);   // Ziel des direkten Laufwegs

	// Bewegungssimulation des übernehmenden Spielers.
	// Etappe 1 (0 … uSync): direkt zum Zielpunkt — so schnell wie nötig.
	// Etappe 2 (uSync … 1): Angleichphase — mit vSync mitgleiten bis zum Kontaktpunkt.
	// Modus 'nurhin': Zielpunkt = Kontaktpunkt, dort abstoppen (vSync = 0).
	let track = $derived.by(() => {
		const dt = scn.totalT / TRACK_N;
		let x = taker.x, v = 0;
		const X = [x], V = [0];
		for (let n = 1; n <= TRACK_N; n++) {
			const uu = (n - 1) / TRACK_N;
			let vDes;
			if (uu < uSync) {
				const tr = Math.max((uSync - uu) * scn.totalT, 0.22);
				vDes = (aimX - x) / tr;                              // direkt zum Zielpunkt
			} else {
				const tr = Math.max((1 - uu) * scn.totalT, 0.10);
				const xRef = aimX + vSync * (uu - uSync) * scn.totalT;
				vDes = vSync + Math.max(-1.5, Math.min(1.5, (xRef - x) / tr));
			}
			vDes = Math.max(-MAX_V, Math.min(MAX_V, vDes));
			v += Math.max(-ACC * dt, Math.min(ACC * dt, vDes - v));
			x += v * dt;
			const lo = taker.x - ZONE_R_M, hi = taker.x + ZONE_R_M;   // Bewegungsradius
			if (x < lo) { x = lo; v = Math.max(v, 0); }
			if (x > hi) { x = hi; v = Math.min(v, 0); }
			X.push(x); V.push(v);
		}
		return { X, V };
	});

	/** @param {number[]} arr @param {number} u */
	function sample(arr, u) {
		const t = Math.max(0, Math.min(1, u)) * TRACK_N;
		const i = Math.min(TRACK_N - 1, Math.floor(t));
		return arr[i] + (arr[i + 1] - arr[i]) * (t - i);
	}
	/** @param {number} u */
	function comXAt(u) { return sample(track.X, u); }
	/** @param {number} u */
	function comVxAt(u) { return sample(track.V, u); }

	let comVx = $derived(track.V[TRACK_N]);   // Schwerpunkt-Geschwindigkeit im Kontaktmoment
	/** @param {number} u */
	function comDAt(u) {
		// Tiefe: früh hin, gegen Ende ruhig stehen
		const s = Math.max(0, Math.min(1, u / uSync));
		const e = 1 - (1 - s) ** 3;
		const target = taker.d + Math.max(-1.5, Math.min(1.5, scn.hitD - taker.d));
		return taker.d + (target - taker.d) * e;
	}
	// Nachbarn sichern ab — ebenfalls ab dem Aufschlag
	/** @param {number} i @param {number} u */
	function pXAt(i, u) {
		if (i === takerIdx) return comXAt(u);
		const s = Math.max(0, Math.min(1, u));
		const e = s * s * (3 - 2 * s);
		const shift = Math.max(-0.7, Math.min(0.7, (scn.hitX - BASE[i].x) * 0.16));
		return BASE[i].x + shift * e;
	}
	/** @param {number} i @param {number} u */
	function pDAt(i, u) {
		if (i === takerIdx) return comDAt(u);
		const s = Math.max(0, Math.min(1, u));
		return BASE[i].d + 0.35 * s * s * (3 - 2 * s);
	}

	// ─── Animation über die ganze Flugbahn ───────────────────────────────────────
	let u = $state(0);                                  // 0 = Aufschlag, 1 = Kontakt
	/** @type {'idle'|'running'|'done'} */
	let phase = $state('idle');
	/** @type {number|null} */
	let rafId = null;
	let startTime = 0;
	let durMs = $derived(scn.totalT * 1150);

	/** @param {number} now */
	function frame(now) {
		const p = (now - startTime) / durMs;
		if (p >= 1) { u = 1; phase = 'done'; rafId = null; return; }
		u = p;
		rafId = requestAnimationFrame(frame);
	}
	function play() {
		if (rafId) cancelAnimationFrame(rafId);
		u = 0; phase = 'running'; startTime = performance.now();
		rafId = requestAnimationFrame(frame);
	}
	function newBall() {
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
		scn = makeServe();
		u = 0; phase = 'idle';
		requestAnimationFrame(() => play());
	}
	/** @param {'angleichen'|'nurhin'} m */
	function setMode(m) {
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
		mode = m; u = 0; phase = 'idle';
		requestAnimationFrame(() => play());
	}
	$effect(() => () => { if (rafId) cancelAnimationFrame(rafId); });

	// ─── relative x-Geschwindigkeit je Spieler ───────────────────────────────────
	const DK = 0.012;
	/** @param {number} i @param {number} uu */
	function relVxOf(i, uu) {
		if (i === takerIdx) return ballVx - comVxAt(uu);
		const s = Math.max(0, uu);
		const db = ballXAt(s + DK) - ballXAt(s - DK);
		const dp = pXAt(i, s + DK) - pXAt(i, s - DK);
		return (db - dp) / (2 * DK * scn.totalT);
	}
	/** @param {number} i @param {number} uu */
	function gapOf(i, uu) { return ballXAt(Math.max(0, uu)) - pXAt(i, Math.max(0, uu)); }

	// Bewertung: grün nur, wenn der Ball in der Kontrollzone ist UND v_rel klein ist.
	/** @param {number} v @param {number} gap */
	function rate(v, gap) {
		const inZone = Math.abs(gap) < NEAR_X;
		const slow = Math.abs(v) < EASY_V;
		if (inZone && slow) return { level: /** @type {const} */ ('im Griff'), color: C_EASY, marker: 'rzArrowEasy' };
		if (inZone) return { level: /** @type {const} */ ('Zone, aber schnell'), color: C_MID, marker: 'rzArrowMid' };
		if (slow) return { level: /** @type {const} */ ('ruhig, aber daneben'), color: C_HARD, marker: 'rzArrowHard' };
		return { level: /** @type {const} */ ('unterwegs'), color: C_NEUTRAL, marker: 'rzArrowNeutral' };
	}

	let players = $derived(BASE.map((p, i) => {
		const v = relVxOf(i, u);
		const gap = gapOf(i, u);
		return { ...p, i, v, gap, ...rate(v, gap) };
	}));

	// Spitzengeschwindigkeit relativ zum Ball während der Anlaufetappe
	let peakRelVx = $derived.by(() => {
		let m = 0;
		for (let n = 0; n <= 20; n++) {
			const s = (n / 20) * uSync;
			m = Math.max(m, Math.abs(relVxOf(takerIdx, s)));
		}
		return m;
	});
	let inSync = $derived(u >= uSync);
	let endRelVx = $derived(ballVx - comVx);
	let endGap = $derived(Math.abs(scn.hitX - comXAt(1)));
	let missed = $derived(endGap > ARM_M);
	let endRate = $derived(rate(endRelVx, endGap));
	let qColor = $derived(endRate.color);

	// Ball-Darstellung (Radius = Flughöhe)
	let ballR = $derived(4 + 6 * Math.sin(Math.PI * Math.max(0, Math.min(1, u))));
	let ballPx = $derived(fx(ballXAt(u)));
	let ballPy = $derived(fy(ballDAt(u)));

	// Punkt, an dem die Angleichphase beginnt (für die Darstellung)
	let syncPx = $derived(fx(ballXAt(uSync)));
	let syncPy = $derived(fy(ballDAt(uSync)));
</script>

<div class="rz-wrap">
	<div class="rz-head">
		<h4>Annahme im Riegel — zufälliger Aufschlag, ganzes Feld</h4>
		<p>Draufsicht auf beide Feldhälften. Der Aufschlag fliegt <b>geradlinig</b> durch — seine seitliche
		Geschwindigkeit bleibt gleich, der <b>Kontaktpunkt steht damit von Anfang an fest</b>. Der zuständige
		Spieler läuft in <b>zwei Etappen</b>: zuerst <b>direkt auf diesen Punkt zu</b> (dabei ist die relative
		Geschwindigkeit egal, die Pfeile sind gross), dann in den letzten
		{SYNC_T.toFixed(2)} s die <b>Angleichphase</b> — er übernimmt die x-Geschwindigkeit des Balls, damit
		v_rel im Kontaktmoment möglichst klein ist. Der Pfeil zeigt für jeden Spieler seine
		<b>relative x-Geschwindigkeit</b> zum Ball.</p>
	</div>

	<div class="rz-svg-box">
		<svg viewBox="0 0 {SVG_W} {SVG_H}" class="rz-svg" role="img" aria-label="Annahme-Szenario in der Draufsicht auf das ganze Feld">
			<rect width={SVG_W} height={SVG_H} fill="#f8fafc" rx="10" />

			<!-- Gegnerische Hälfte -->
			<rect x={fx(-HALF_W)} y={fy(-HALF_D)} width={2 * HALF_W * PPM} height={HALF_D * PPM}
				fill="#eef2f7" stroke="#cbd5e1" stroke-width="2" />
			<line x1={fx(-HALF_W)} y1={fy(-3)} x2={fx(HALF_W)} y2={fy(-3)} stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="7,5" />
			<text x={fx(-HALF_W) + 6} y={fy(-HALF_D) + 16} font-size="10" fill="#94a3b8" font-family="sans-serif">Gegner</text>

			<!-- Eigene Hälfte -->
			<rect x={fx(-HALF_W)} y={fy(0)} width={2 * HALF_W * PPM} height={HALF_D * PPM}
				fill="#fff7ed" stroke="#cbd5e1" stroke-width="2" />
			<line x1={fx(-HALF_W)} y1={fy(3)} x2={fx(HALF_W)} y2={fy(3)} stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="7,5" />
			<text x={fx(-HALF_W) + 6} y={fy(HALF_D) - 8} font-size="10" fill="#94a3b8" font-family="sans-serif">Annahme</text>

			<!-- Netz -->
			<line x1={fx(-HALF_W - 0.5)} y1={NET_Y} x2={fx(HALF_W + 0.5)} y2={NET_Y} stroke="#475569" stroke-width="4" />
			<text x={fx(HALF_W + 0.5)} y={NET_Y - 7} text-anchor="end" font-size="10.5" fill="#64748b" font-family="sans-serif">Netz</text>

			<!-- x-Achse -->
			<text x={CX} y={SVG_H - 28} text-anchor="middle" font-size="10" fill="#94a3b8" font-family="sans-serif">x — parallel zum Netz →</text>

			<!-- Zonen (2 m Radius, überlappend) -->
			{#each players as p}
				<circle cx={fx(pXAt(p.i, u))} cy={fy(pDAt(p.i, u))} r={ZONE_R_M * PPM}
					fill={p.color} opacity="0.12" stroke={p.color} stroke-opacity="0.5"
					stroke-width="1.5" stroke-dasharray="5,4" />
			{/each}

			<!-- Flugbahn: eine gerade Linie — die Richtung bleibt erhalten -->
			<line x1={fx(scn.serveX)} y1={fy(scn.serveD)} x2={fx(scn.hitX)} y2={fy(scn.hitD)}
				stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.45" />
			<!-- letzter Abschnitt = Angleichphase -->
			<line x1={syncPx} y1={syncPy} x2={fx(scn.hitX)} y2={fy(scn.hitD)}
				stroke="#f59e0b" stroke-width="4" opacity="0.35" stroke-linecap="round" />
			<text x={syncPx + 8} y={syncPy - 4} font-size="9.5" fill="#b45309" font-family="sans-serif">Angleichphase</text>
			<circle cx={fx(scn.inX)} cy={fy(0)} r="3" fill="#f59e0b" opacity="0.5" />
			<circle cx={fx(scn.hitX)} cy={fy(scn.hitD)} r="3.5" fill="#f59e0b" opacity="0.6" />
			<text x={fx(scn.hitX)} y={fy(scn.hitD) + 14} text-anchor="middle" font-size="9" fill="#b45309" font-family="sans-serif">Kontaktpunkt</text>
			<!-- Zielpunkt des direkten Laufwegs (Start der Angleichphase) -->
			<circle cx={fx(aimX)} cy={fy(scn.hitD)} r="3" fill="none" stroke="#2563eb" stroke-width="1.4" stroke-dasharray="2,2" opacity="0.7" />

			<!-- Aufschläger -->
			<circle cx={fx(scn.serveX)} cy={fy(scn.serveD)} r="7" fill="#94a3b8" />
			<text x={fx(scn.serveX)} y={fy(scn.serveD) - 11} text-anchor="middle" font-size="9.5" fill="#64748b" font-family="sans-serif">Aufschlag</text>

			<!-- Weg des übernehmenden Schwerpunkts: Anlauf gestrichelt, Angleichphase durchgezogen -->
			<path d={
				Array.from({ length: 21 }, (_, n) => {
					const s = (n / 20) * uSync;
					return `${n === 0 ? 'M' : 'L'} ${fx(comXAt(s))} ${fy(comDAt(s))}`;
				}).join(' ')
			} fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="4,4" opacity="0.4" />
			<path d={
				Array.from({ length: 11 }, (_, n) => {
					const s = uSync + (n / 10) * (1 - uSync);
					return `${n === 0 ? 'M' : 'L'} ${fx(comXAt(s))} ${fy(comDAt(s))}`;
				}).join(' ')
			} fill="none" stroke="#2563eb" stroke-width="3.2" opacity="0.55" stroke-linecap="round" />

			<!-- Spieler + relative x-Geschwindigkeit -->
			{#each players as p}
				{@const px = fx(pXAt(p.i, u))}
				{@const py = fy(pDAt(p.i, u))}
				{@const len = Math.min(110, Math.abs(p.v) * PX_PER_MS)}
				{@const dir = p.v >= 0 ? 1 : -1}
				<circle cx={fx(p.x)} cy={fy(p.d)} r="3.5" fill="none" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
				<line x1={px - ARM_M * PPM} y1={py} x2={px + ARM_M * PPM} y2={py}
					stroke="#f4b78a" stroke-width="3.5" stroke-linecap="round" opacity="0.7" />
				<!-- kontrollierte Zone (±30 cm um den Schwerpunkt) -->
				<line x1={px - NEAR_X * PPM} y1={py} x2={px + NEAR_X * PPM} y2={py}
					stroke="#0f766e" stroke-width="5" stroke-linecap="round" opacity="0.55" />
				<circle cx={px} cy={py} r="10" fill={p.color} stroke="white" stroke-width="2" />
				<text x={px} y={py + 3.5} text-anchor="middle" font-size="9.5" fill="white" font-family="sans-serif" font-weight="700">{p.id}</text>
				{#if len > 7}
					<line x1={px} y1={py - 19} x2={px + dir * len} y2={py - 19}
						stroke={p.color} stroke-width="3" marker-end="url(#{p.marker})" />
					<text x={px + dir * len / 2} y={py - 24} text-anchor="middle" font-size="10"
						fill={p.color} font-family="monospace" font-weight="700">{Math.abs(p.v).toFixed(1)}</text>
				{:else}
					<text x={px} y={py - 17} text-anchor="middle" font-size="10"
						fill={p.color} font-family="monospace" font-weight="700">v_rel ≈ 0</text>
				{/if}
			{/each}

			<!-- Ball -->
			<circle cx={ballPx} cy={ballPy} r={ballR} fill="white" stroke="#f59e0b" stroke-width="2.2" />

			{#if phase === 'done' && missed}
				<text x={CX} y={SVG_H - 10} text-anchor="middle" font-size="11.5" fill={C_HARD} font-family="sans-serif" font-weight="700">Ziel 1 verfehlt — der Ball ist gar nicht erst in die Zone gekommen.</text>
			{:else if phase === 'done'}
				<text x={CX} y={SVG_H - 10} text-anchor="middle" font-size="11.5" fill={qColor} font-family="sans-serif" font-weight="700">{taker.name} übernimmt · v_rel {Math.abs(endRelVx).toFixed(1)} m/s · Δx {(endGap * 100).toFixed(0)} cm · {endRate.level}</text>
			{/if}

			<defs>
				<marker id="rzArrowEasy" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={C_EASY} />
				</marker>
				<marker id="rzArrowNeutral" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={C_NEUTRAL} />
				</marker>
				<marker id="rzArrowMid" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={C_MID} />
				</marker>
				<marker id="rzArrowHard" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
					<path d="M0,0 L6,3 L0,6 Z" fill={C_HARD} />
				</marker>
			</defs>
		</svg>
	</div>

	<div class="rz-legend">
		<span><i style="background:{C_EASY}"></i> Ball in der Kontrollzone (± {NEAR_X * 100} cm) <b>und</b> v_rel klein (&lt; {EASY_V} m/s)</span>
		<span><i style="background:{C_MID}"></i> in der Kontrollzone, aber v_rel gross</span>
		<span><i style="background:{C_HARD}"></i> v_rel klein, aber Ball nicht in der Kontrollzone</span>
		<span><i style="background:{C_NEUTRAL}"></i> alles andere — noch unterwegs</span>
	</div>

	<div class="rz-stats">
		<div class="rz-stat"><span class="rz-lbl">Ball x-Geschw.</span><span class="rz-val">{ballVx.toFixed(1)} m/s</span>
			<span class="rz-sub">{inSync ? 'Angleichphase' : 'Anlauf zum Ball'}</span></div>
		<div class="rz-stat"><span class="rz-lbl">{taker.name} · v_rel</span>
			<span class="rz-val">{peakRelVx.toFixed(1)} → {Math.abs(endRelVx).toFixed(1)}</span>
			<span class="rz-sub">Anlauf → Kontakt</span></div>
		{#each players as p}
			<div class="rz-stat">
				<span class="rz-lbl">{p.name} · v_rel</span>
				<span class="rz-val" style="color:{p.color}">{p.v.toFixed(1)} m/s</span>
				<span class="rz-sub" style="color:{p.color}">Δx {(Math.abs(p.gap) * 100).toFixed(0)} cm · {p.level}</span>
			</div>
		{/each}
	</div>

	<div class="rz-actions">
		<div class="rz-seg" role="group" aria-label="Verhalten">
			<button class="rz-seg-btn" class:active={mode === 'angleichen'} onclick={() => setMode('angleichen')}>Zum Ball + angleichen</button>
			<button class="rz-seg-btn" class:active={mode === 'nurhin'} onclick={() => setMode('nurhin')}>Nur zum Ball, dann stoppen</button>
		</div>
		<button class="rz-btn-primary" onclick={newBall}>🎲 Neuer Aufschlag</button>
		<button class="rz-btn" onclick={play}>▶ Nochmals</button>
	</div>

	<div class="rz-note">
		<strong>Warum der Laufweg gegen Ende abknickt:</strong> Die beiden Phasen sind hier bewusst überzeichnet
		getrennt — zuerst geht es kompromisslos <em>zum Kontaktpunkt</em>, erst in der Angleichphase <em>mit dem
		Ball</em>. In echt verschmelzen sie zu einer fliessenden Bewegung.
		<br><br>
		<strong>Zwei Ziele, in dieser Reihenfolge:</strong> Zuerst <em>zum Ball</em> — dabei darf die relative
		Geschwindigkeit gross sein, wir laufen so schnell wie nötig. Erst in der Angleichphase kurz vor dem
		Kontakt zählt sie: Wer die x-Geschwindigkeit des Balls dann mit dem Schwerpunkt übernimmt, hält den
		Ball in der kontrollierten Zone (± {NEAR_X * 100} cm) und spielt präzise. Wer nur hinläuft und abstoppt,
		erreicht den Ball zwar, spielt ihn aber mit voller Driftgeschwindigkeit.
	</div>
</div>

<style>
	.rz-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.rz-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.rz-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.rz-svg-box { width: 100%; display: flex; justify-content: center; }
	.rz-svg { width: 100%; max-width: 430px; height: auto; display: block; }
	.rz-stats {
		display: flex; flex-wrap: wrap; gap: 0.5rem 0;
		background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem;
	}
	.rz-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 110px; border-left: 1px solid #e2e8f0; }
	.rz-stat:first-child { border-left: none; }
	.rz-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.rz-val { font-size: 1rem; font-weight: 700; color: #1e293b; font-family: monospace; }
	.rz-sub { font-size: 0.68rem; color: #94a3b8; font-family: monospace; }

	.rz-legend { display: flex; flex-wrap: wrap; gap: 0.35rem 1rem; font-size: 0.75rem; color: #64748b; line-height: 1.4; }
	.rz-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
	.rz-legend i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

	.rz-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; align-items: center; }
	.rz-seg { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 0.5rem; overflow: hidden; }
	.rz-seg-btn {
		padding: 0.5rem 0.85rem; border: none; background: #f1f5f9; color: #64748b;
		font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s;
		border-left: 1px solid #cbd5e1;
	}
	.rz-seg-btn:first-child { border-left: none; }
	.rz-seg-btn:hover { background: #e2e8f0; }
	.rz-seg-btn.active { color: #fff; }
	.rz-seg-btn:nth-child(1).active { background: #16a34a; }
	.rz-stat .rz-val { white-space: nowrap; }
	.rz-seg-btn:nth-child(2).active { background: #ef4444; }
	.rz-btn-primary, .rz-btn {
		padding: 0.55rem 1.1rem; border: none; border-radius: 0.5rem;
		font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: background 0.15s, transform 0.1s;
	}
	.rz-btn-primary { background: var(--color-primary, #1e3a5f); color: #fff; }
	.rz-btn-primary:hover { background: #2d5a8e; transform: translateY(-1px); }
	.rz-btn { background: #e2e8f0; color: #475569; }
	.rz-btn:hover { background: #cbd5e1; }

	.rz-note {
		background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.65rem 1rem; font-size: 0.82rem; color: #475569; line-height: 1.55;
	}
	.rz-note strong { color: #334155; }
	@media (max-width: 600px) {
		.rz-wrap { padding: 1rem; }
		.rz-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
