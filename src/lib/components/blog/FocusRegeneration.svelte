<script>
	/**
	 * Fokus-Slot und Regeneration — Visualisierung eines Verlaufs.
	 *
	 * Aufbau des Arbeitsspeichers:
	 *   - Slot 1 abwärts: alles, was die Situation liefert (abgelesene
	 *     Information, Flugbahn, Ballkontakt). Wächst nach unten und braucht je
	 *     nach Moment unterschiedlich viel Platz — die Flugbahn auch mal 4 Slots.
	 *   - Slot 6 aufwärts: das Fokus-Element ("worauf richte ich die
	 *     Aufmerksamkeit?"). Es wächst nach oben, wenn Platz da ist, wächst
	 *     manchmal gar nicht und geht manchmal sogar zurück.
	 *
	 * Sobald der Fokus vollständig verdrängt ist, bricht der Durchlauf ab und
	 * startet von vorne: genau das passiert beim Umlernen im Spiel.
	 */

	const CAP = 6;

	/**
	 * @typedef {Object} Event
	 * @property {string} when
	 * @property {'info'|'ball'} kind
	 * @property {string} label
	 * @property {[number, number]} size   min/max Slots, die der Inhalt braucht
	 * @property {string} [second]         optionaler zweiter Inhalt
	 * @property {number} [grow]           Bonus auf das Fokuswachstum
	 */

	/**
	 * @typedef {Object} Topic
	 * @property {string} title
	 * @property {string} sub
	 * @property {string} focusLabel
	 * @property {Event[]} script
	 * @property {string} lesson
	 */

	/** @type {Record<string, Topic>} */
	const TOPICS = {
		blicktechnik: {
			title: 'Umlernen kostet Slots — und der Fokus muss ständig neu gesetzt werden',
			sub: 'Von oben füllt die Situation den Speicher, von unten wächst der Fokus dagegen an. Wird er ganz verdrängt, beginnt alles von vorne.',
			focusLabel: 'Fokus: Blicktechnik',
			script: [
				{ when: 'Gegner bereitet Service vor', kind: 'info', label: 'Körperposition des Gegners', size: [1, 2], grow: 1 },
				{ when: 'Ball ist unterwegs', kind: 'ball', label: 'Flugbahn des Balls', size: [2, 4] },
				{ when: 'Annahme', kind: 'ball', label: 'Ballkontakt', size: [2, 4] },
				{ when: 'Direkt nach der Annahme', kind: 'info', label: 'Nachwirkung Ballkontakt', size: [0, 1], grow: 1 },
				{ when: 'Zuspiel des Gegners', kind: 'info', label: 'Zuspielerposition', size: [1, 2], grow: 1 },
				{ when: 'Angriff des Gegners', kind: 'info', label: 'Schulter des Angreifers', second: 'freie Zone bei mir', size: [2, 3] },
				{ when: 'Ball kommt zu mir', kind: 'ball', label: 'Flugbahn des Balls', size: [2, 4] },
				{ when: 'Mein Ballkontakt', kind: 'ball', label: 'Ballkontakt', size: [2, 4] },
			],
			lesson:
				'Der Fokus-Slot steuert den Blick nicht. Er sorgt nur dafür, dass wir überhaupt wieder hinschauen. Weil ihn jeder Ballkontakt zusammendrückt und früher oder später ganz auslöscht, ist Umlernen kein einmaliger Entschluss, sondern ein ständiges Neusetzen — mehrmals pro Spielzug.',
		},
		schulter: {
			title: 'Dasselbe Muster bei Schulterposition und Orientierung im Feld',
			sub: 'Der Fokus-Slot heisst jetzt anders, das Verhalten bleibt identisch.',
			focusLabel: 'Fokus: Schulter & Orientierung',
			script: [
				{ when: 'Vor dem Service', kind: 'info', label: 'Ziel (Zuspielposition)', size: [1, 2], grow: 1 },
				{ when: 'Ball unterwegs', kind: 'ball', label: 'Flugbahn des Balls', size: [2, 4] },
				{ when: 'Kurz vor dem Kontakt', kind: 'info', label: 'Hüfte & Schulter zum Ziel', size: [1, 3], grow: 1 },
				{ when: 'Ballkontakt', kind: 'ball', label: 'Ballkontakt', size: [3, 4] },
				{ when: 'Danach', kind: 'info', label: 'Nachwirkung Ballkontakt', size: [0, 1], grow: 1 },
			],
			lesson:
				'Ob Blicktechnik, Schulterstellung oder Orientierung im Feld: Wir belegen nie die Bewegung selbst, sondern nur den Fokus darauf. Und der muss nach jedem Ballkontakt neu entstehen.',
		},
	};

	let { topic = 'blicktechnik' } = $props();
	let data = $derived(TOPICS[topic] ?? TOPICS.blicktechnik);

	// ─── Zufall ────────────────────────────────────────────────────────────────
	/** @param {number} a @param {number} b */
	const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

	/**
	 * Veränderung des Fokus pro Moment: Der Arbeitsspeicher ist flüchtig, also
	 * geht es oft zurück. Manchmal bleibt es gleich, manchmal wächst er gut.
	 * In ruhigen Momenten (`bonus`) gelingt das Nachschieben leichter.
	 */
	function focusDelta(bonus = 0) {
		const r = Math.random();
		const base = r < 0.2 ? -2 : r < 0.5 ? -1 : r < 0.7 ? 0 : r < 0.92 ? 1 : 2;
		return base + bonus;
	}

	// ─── Zustand ───────────────────────────────────────────────────────────────
	/**
	 * @typedef {Object} Step
	 * @property {string} when
	 * @property {string} note
	 * @property {'seed'|'push'|'reset'|'gain'} tone
	 * @property {{t: 'info'|'ball'|'fokus'|'leer', label?: string}[]} cells
	 * @property {number} focus
	 * @property {number} content
	 */

	/** @type {Step[]} */
	let history = $state([]);
	let focus = $state(2);
	let cursor = $state(0); // Position im Skript
	let runs = $state(1);
	let dead = $state(false);
	let mode = $state(/** @type {'anim'|'grid'} */ ('anim'));
	let playing = $state(false);
	let started = $state(false);

	/** @type {ReturnType<typeof setTimeout>|null} */
	let timer = null;
	const STEP_MS = 2400;
	const DEAD_MS = 2600;

	let current = $derived(history.length ? history[history.length - 1] : null);

	/** Einen Moment erzeugen und an die Historie anhängen. */
	function nextStep() {
		const ev = data.script[cursor % data.script.length];

		// Inhalte von oben: zufällige Grösse
		const n = Math.min(CAP, randInt(ev.size[0], ev.size[1]));
		/** @type {{t: 'info'|'ball'|'fokus'|'leer', label?: string}[]} */
		const cells = [];
		for (let i = 0; i < n; i++) {
			const label = ev.second && i >= Math.ceil(n / 2) ? ev.second : ev.label;
			cells.push({ t: ev.kind, label });
		}

		// Fokus von unten: erst eigene Veränderung, dann Verdrängung durch oben.
		// Im allerersten Moment setzen wir ihn bewusst — danach ist er auf sich gestellt.
		const wanted =
			history.length === 0
				? Math.max(2, focus + focusDelta(ev.grow ?? 0))
				: focus + focusDelta(ev.grow ?? 0);
		const room = CAP - n;
		const decayed = wanted <= 0;
		const squeezed = wanted > room;
		const got = Math.max(0, Math.min(wanted, room));

		while (cells.length < CAP - got) cells.push({ t: 'leer' });
		for (let i = 0; i < got; i++) cells.push({ t: 'fokus' });

		/** @type {Step['tone']} */
		let tone = 'gain';
		let note = '';
		if (got === 0) {
			tone = 'reset';
			note = decayed
				? 'Der Fokus ist von selbst zerfallen — nichts hat ihn nachgeschoben.'
				: `${ev.label} braucht ${n} Slots und drückt den Fokus vollständig heraus.`;
		} else if (squeezed) {
			tone = 'push';
			note = `${ev.label} braucht ${n} Slots — der Fokus wird auf ${got} zusammengedrückt.`;
		} else if (got > focus) {
			tone = 'seed';
			note = `Platz vorhanden: der Fokus wächst von ${focus} auf ${got} Slots.`;
		} else if (got < focus) {
			tone = 'push';
			note = `Der Fokus geht von ${focus} auf ${got} Slots zurück — das passiert einfach so.`;
		} else {
			tone = 'gain';
			note = `Der Fokus hält seine ${got} Slots und liest weiter Information ab.`;
		}

		history = [...history, { when: ev.when, note, tone, cells, focus: got, content: n }];
		focus = got;
		cursor += 1;
		dead = got === 0;
	}

	function restart() {
		history = [];
		focus = 2;
		cursor = 0;
		dead = false;
		runs += 1;
		nextStep();
	}

	function tick() {
		if (dead) restart();
		else nextStep();
		schedule();
	}
	function schedule() {
		if (timer) clearTimeout(timer);
		if (!playing) return;
		timer = setTimeout(tick, dead ? DEAD_MS : STEP_MS);
	}
	function stop() {
		if (timer) clearTimeout(timer);
		timer = null;
		playing = false;
	}
	function play() {
		playing = true;
		if (!history.length) nextStep();
		schedule();
	}
	function toggle() {
		playing ? stop() : play();
	}
	function manualStep() {
		stop();
		if (dead) restart();
		else nextStep();
	}
	function manualRestart() {
		stop();
		restart();
	}

	// Erst auf dem Client starten (Zufall → keine Hydration-Diskrepanz)
	$effect(() => {
		if (started) return;
		started = true;
		nextStep();
		const reduced =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!reduced) play();
		return stop;
	});

	let maxFocus = $derived(history.reduce((a, s) => Math.max(a, s.focus), 0));
	/** @param {Step['tone']} tone */
	function toneLabel(tone) {
		return tone === 'seed'
			? 'Fokus wächst'
			: tone === 'push'
				? 'zusammengedrückt'
				: tone === 'reset'
					? 'Fokus verloren'
					: 'Fokus hält';
	}
</script>

<figure class="fr">
	<figcaption class="fr-head">
		<h4>{data.title}</h4>
		<p>{data.sub}</p>
	</figcaption>

	<div class="fr-modes" role="group" aria-label="Darstellung">
		<button class="fr-mode" class:on={mode === 'anim'} onclick={() => (mode = 'anim')}>▶ Ablauf</button>
		<button class="fr-mode" class:on={mode === 'grid'} onclick={() => (mode = 'grid')}>
			▦ Dieser Durchlauf
		</button>
	</div>

	{#if mode === 'anim'}
		<div class="fr-player">
			<div class="fr-stage" class:dead>
				<div class="fr-moment">
					<span class="fr-step">Durchlauf {runs} · Moment {history.length}</span>
					<span class="fr-momentname">{current?.when ?? '—'}</span>
					{#if current}
						<span class="fr-note-tag fr-tag-{current.tone}">{toneLabel(current.tone)}</span>
					{/if}
					<span class="fr-momentnote">{current?.note ?? ''}</span>
				</div>

				<div class="fr-column" aria-live="polite">
					{#each Array(CAP) as _, row}
						{@const c = current?.cells[row] ?? { t: 'leer' }}
						{@const prev = row > 0 ? (current?.cells[row - 1] ?? { t: 'leer' }) : null}
						{@const next = row < CAP - 1 ? (current?.cells[row + 1] ?? { t: 'leer' }) : null}
						<div
							class="fr-slotrow fr-{c.t}"
							class:cont={prev && prev.t === c.t && c.t !== 'leer'}
							style="--d: {c.t === 'fokus' ? (CAP - 1 - row) * 55 : row * 55}ms"
						>
							<span class="fr-slotnum">{row + 1}</span>
							<span class="fr-slottxt">
								{#if c.t === 'leer'}
									<em>frei</em>
								{:else if c.t === 'fokus'}
									{#if !prev || prev.t !== 'fokus'}
										<b>{data.focusLabel}</b><span class="fr-grow">▲ wächst nach oben</span>
									{:else}
										<span class="fr-dim">↑ derselbe Fokus</span>
									{/if}
								{:else if prev && prev.t === c.t && prev.label === c.label}
									<span class="fr-dim">↓ {c.label}</span>
								{:else}
									{c.label}{#if next && next.t === c.t}<span class="fr-grow">▼ wächst nach unten</span>{/if}
								{/if}
							</span>
						</div>
					{/each}
				</div>

				<div class="fr-counts">
					<span class="fr-count sit">{current?.content ?? 0} Slots Situation</span>
					<span class="fr-count fokus" class:zero={!current?.focus}>
						{current?.focus ?? 0} Slots Fokus
					</span>
					<span class="fr-count hist">längster Fokus: {maxFocus}</span>
				</div>

				{#if dead}
					<div class="fr-dead">
						<strong>Fokus komplett verdrängt — Abbruch.</strong>
						Der Durchlauf beginnt von vorne, der Fokus muss neu gesetzt werden.
					</div>
				{/if}
			</div>

			<div class="fr-track" aria-hidden="true">
				{#each history as s}
					<span class="fr-bar fr-tick-{s.tone}" title="{s.when}: Fokus {s.focus}">
						<span class="fr-barfill" style="height: {(s.focus / CAP) * 100}%"></span>
					</span>
				{/each}
			</div>
			<div class="fr-tracklbl">Fokusgrösse im Verlauf dieses Durchlaufs</div>

			<div class="fr-controls">
				<button class="fr-btn fr-btn-main" onclick={toggle}>{playing ? '⏸ Pause' : '▶ Abspielen'}</button>
				<button class="fr-btn" onclick={manualStep}>⏭ Nächster Moment</button>
				<button class="fr-btn" onclick={manualRestart}>↻ Neu starten</button>
			</div>
		</div>
	{:else}
		<div class="fr-scroll">
			<div class="fr-grid" style="--cols: {Math.max(1, history.length)}">
				<div class="fr-corner">Slot</div>
				{#each history as s}
					<div class="fr-when">{s.when}</div>
				{/each}

				{#each Array(CAP) as _, row}
					<div class="fr-rownum">{row + 1}</div>
					{#each history as s}
						{@const c = s.cells[row] ?? { t: 'leer' }}
						{@const prev = row > 0 ? (s.cells[row - 1] ?? { t: 'leer' }) : null}
						<div class="fr-cell fr-{c.t}" class:cont={prev && prev.t === c.t && c.t !== 'leer'}>
							{#if c.t === 'leer'}
								<span class="fr-txt">frei</span>
							{:else if c.t === 'fokus'}
								{#if !prev || prev.t !== 'fokus'}
									<span class="fr-txt fr-strong">{data.focusLabel}</span>
								{:else}
									<span class="fr-txt fr-dim">↑ derselbe Fokus</span>
								{/if}
							{:else if prev && prev.t === c.t && prev.label === c.label}
								<span class="fr-txt fr-dim">↓ {c.label}</span>
							{:else}
								<span class="fr-txt">{c.label}</span>
							{/if}
						</div>
					{/each}
				{/each}

				<div class="fr-corner fr-footcorner"></div>
				{#each history as s}
					<div class="fr-note fr-tone-{s.tone}">
						<span class="fr-note-tag fr-tag-{s.tone}">{toneLabel(s.tone)}</span>
						<span class="fr-note-txt">{s.note}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="fr-legend">
		<span><i class="fr-dot info"></i> abgelesene Information — von Slot 1 nach unten</span>
		<span><i class="fr-dot ball"></i> Flugbahn / Ballkontakt — braucht mal 2, mal 4 Slots</span>
		<span><i class="fr-dot fokus"></i> Fokus-Element — von Slot 6 nach oben</span>
		<span><i class="fr-dot leer"></i> frei</span>
	</div>

	<p class="fr-lesson">{data.lesson}</p>
</figure>

<style>
	.fr {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem 1.4rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.fr-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.fr-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}

	/* ─── Modus-Umschalter ─────────────────────────────────────────────────── */
	.fr-modes {
		display: inline-flex;
		align-self: flex-start;
		border: 1px solid #cbd5e1;
		border-radius: 0.5rem;
		overflow: hidden;
	}
	.fr-mode {
		padding: 0.35rem 0.8rem;
		border: none;
		border-left: 1px solid #cbd5e1;
		background: #f8fafc;
		color: #64748b;
		font-size: 0.76rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s, color 0.2s;
	}
	.fr-mode:first-child {
		border-left: none;
	}
	.fr-mode:hover {
		background: #e2e8f0;
	}
	.fr-mode.on {
		background: var(--color-primary, #1e3a5f);
		color: #fff;
	}

	/* ─── Player ───────────────────────────────────────────────────────────── */
	.fr-player {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.fr-stage {
		border: 1px solid #e2e8f0;
		border-radius: 0.6rem;
		background: #f8fafc;
		padding: 0.8rem 0.9rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		transition: border-color 0.6s ease, background 0.6s ease;
	}
	.fr-stage.dead {
		border-color: #fecaca;
		background: #fff5f5;
	}
	.fr-moment {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.6rem;
		min-height: 2.6rem;
	}
	.fr-step {
		font-family: monospace;
		font-size: 0.66rem;
		color: #94a3b8;
	}
	.fr-momentname {
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--color-primary, #1e3a5f);
	}
	.fr-momentnote {
		flex: 1 1 100%;
		font-size: 0.76rem;
		color: #64748b;
		line-height: 1.4;
	}

	.fr-column {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.fr-slotrow {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 2.1rem;
		padding: 0.3rem 0.7rem;
		border-radius: 0.4rem;
		border: 1.5px solid transparent;
		font-size: 0.82rem;
		transition:
			background-color 0.85s cubic-bezier(0.4, 0, 0.2, 1) var(--d, 0ms),
			border-color 0.85s cubic-bezier(0.4, 0, 0.2, 1) var(--d, 0ms),
			color 0.85s cubic-bezier(0.4, 0, 0.2, 1) var(--d, 0ms);
	}
	.fr-slotrow.cont {
		border-top-style: dashed;
	}
	.fr-slotnum {
		font-family: monospace;
		font-size: 0.68rem;
		opacity: 0.55;
		width: 0.9rem;
		flex-shrink: 0;
	}
	.fr-slottxt {
		line-height: 1.25;
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.4rem;
		transition: opacity 0.6s ease var(--d, 0ms);
	}
	.fr-grow {
		font-size: 0.62rem;
		opacity: 0.6;
		font-weight: 600;
	}

	.fr-counts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.fr-count {
		font-size: 0.7rem;
		font-weight: 700;
		font-family: monospace;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		transition: background-color 0.6s ease, color 0.6s ease;
	}
	.fr-count.sit {
		background: #fef3c7;
		color: #92400e;
	}
	.fr-count.fokus {
		background: #ede9fe;
		color: #6d28d9;
	}
	.fr-count.fokus.zero {
		background: #fee2e2;
		color: #b91c1c;
	}
	.fr-count.hist {
		background: #e2e8f0;
		color: #475569;
	}

	.fr-dead {
		background: #fee2e2;
		border-left: 3px solid #ef4444;
		border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.5rem 0.8rem;
		font-size: 0.78rem;
		color: #7f1d1d;
		line-height: 1.45;
		animation: fr-pop 0.5s ease both;
	}
	@keyframes fr-pop {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.fr-track {
		display: flex;
		gap: 0.15rem;
		align-items: flex-end;
		height: 2.6rem;
		padding: 0 0.1rem;
		border-bottom: 2px solid #e2e8f0;
	}
	.fr-bar {
		flex: 0 1 1.6rem;
		min-width: 0.5rem;
		height: 100%;
		background: #f1f5f9;
		border-radius: 0.2rem 0.2rem 0 0;
		display: flex;
		align-items: flex-end;
		animation: fr-pop 0.45s ease both;
	}
	.fr-barfill {
		width: 100%;
		border-radius: 0.2rem 0.2rem 0 0;
		background: #c4b5fd;
		transition: height 0.6s ease;
	}
	.fr-tick-seed .fr-barfill {
		background: #7c3aed;
	}
	.fr-tick-push .fr-barfill {
		background: #f59e0b;
	}
	.fr-tick-reset {
		background: #fee2e2;
	}
	.fr-tick-gain .fr-barfill {
		background: #16a34a;
	}
	.fr-tracklbl {
		font-size: 0.65rem;
		color: #94a3b8;
		text-align: center;
		margin-top: -0.35rem;
	}

	.fr-controls {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.fr-btn {
		padding: 0.4rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.45rem;
		background: #f1f5f9;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}
	.fr-btn:hover {
		background: #e2e8f0;
	}
	.fr-btn-main {
		min-width: 7.5rem;
		background: var(--color-primary, #1e3a5f);
		border-color: var(--color-primary, #1e3a5f);
		color: #fff;
	}
	.fr-btn-main:hover {
		background: #2d5a8e;
	}

	@media (prefers-reduced-motion: reduce) {
		.fr-slotrow,
		.fr-slottxt,
		.fr-barfill {
			transition: none;
		}
		.fr-bar,
		.fr-dead {
			animation: none;
		}
	}

	/* ─── Rasteransicht ────────────────────────────────────────────────────── */
	.fr-scroll {
		overflow-x: auto;
		padding-bottom: 0.3rem;
	}
	.fr-grid {
		display: grid;
		grid-template-columns: 2.1rem repeat(var(--cols), minmax(8.2rem, 1fr));
		gap: 0.18rem;
		min-width: 100%;
	}
	.fr-corner {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		font-weight: 700;
		display: flex;
		align-items: flex-end;
	}
	.fr-when {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-weight: 700;
		color: #475569;
		text-align: center;
		line-height: 1.2;
		padding: 0 0.1rem 0.2rem;
		border-bottom: 2px solid #e2e8f0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.fr-rownum {
		font-family: monospace;
		font-size: 0.68rem;
		color: #cbd5e1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fr-cell {
		min-height: 2.1rem;
		border-radius: 0.3rem;
		padding: 0.2rem 0.35rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		border: 1px solid transparent;
	}
	.fr-cell.cont {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
		border-top-style: dashed;
	}
	.fr-txt {
		font-size: 0.64rem;
		line-height: 1.2;
		hyphens: auto;
	}
	.fr-strong {
		font-weight: 700;
	}
	.fr-dim {
		opacity: 0.55;
		font-size: 0.72em;
	}

	/* Farben für beide Ansichten */
	.fr-info {
		background: #ccfbf1;
		border-color: #99f6e4;
		color: #0f766e;
	}
	.fr-ball {
		background: #fef3c7;
		border-color: #fcd34d;
		color: #92400e;
		font-weight: 600;
	}
	.fr-fokus {
		background: #ede9fe;
		border-color: #c4b5fd;
		color: #6d28d9;
	}
	.fr-leer {
		background: #f8fafc;
		border: 1px dashed #e2e8f0;
		color: #cbd5e1;
	}

	.fr-footcorner {
		border: none;
	}
	.fr-note {
		margin-top: 0.3rem;
		border-top: 2px solid #e2e8f0;
		padding: 0.3rem 0.25rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		text-align: center;
	}
	.fr-note-tag {
		font-size: 0.58rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-radius: 999px;
		padding: 0.1rem 0.4rem;
		align-self: center;
	}
	.fr-note-txt {
		font-size: 0.63rem;
		color: #64748b;
		line-height: 1.3;
	}
	.fr-tag-seed {
		background: #ede9fe;
		color: #6d28d9;
	}
	.fr-tag-push {
		background: #fef3c7;
		color: #92400e;
	}
	.fr-tag-reset {
		background: #fee2e2;
		color: #b91c1c;
	}
	.fr-tag-gain {
		background: #dcfce7;
		color: #15803d;
	}
	.fr-tone-seed {
		border-top-color: #c4b5fd;
	}
	.fr-tone-push {
		border-top-color: #fcd34d;
	}
	.fr-tone-reset {
		border-top-color: #fecaca;
	}
	.fr-tone-gain {
		border-top-color: #86efac;
	}

	.fr-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		font-size: 0.72rem;
		color: #64748b;
		border-top: 1px solid #f1f5f9;
		padding-top: 0.6rem;
	}
	.fr-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.fr-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}
	.fr-dot.info {
		background: #14b8a6;
	}
	.fr-dot.ball {
		background: #f59e0b;
	}
	.fr-dot.fokus {
		background: #7c3aed;
	}
	.fr-dot.leer {
		background: #e2e8f0;
	}

	.fr-lesson {
		margin: 0;
		padding: 0.65rem 0.95rem;
		border-radius: 0 0.4rem 0.4rem 0;
		background: #f5f3ff;
		border-left: 3px solid #7c3aed;
		color: #4c1d95;
		font-size: 0.85rem;
		line-height: 1.55;
	}

	@media (max-width: 640px) {
		.fr {
			padding: 1rem;
		}
	}
</style>
