<script>
	/**
	 * Arbeitsspeicher-Slots — wie viel passt gleichzeitig in den Kopf?
	 *
	 * Jede Spielsituation braucht eine bestimmte Anzahl "Slots". Die Kapazität
	 * ist individuell (Regler) und schrumpft unter Druck (Regler). Was nicht
	 * mehr hineinpasst, fällt hinten raus — und zwar genau das, was wir für ein
	 * gutes Resultat gebraucht hätten.
	 *
	 * Mit "Chunking" lassen sich zusammengehörende Inhalte zu einem einzigen
	 * Slot zusammenfassen — das ist der eigentliche Lerneffekt.
	 */

	/**
	 * @typedef {Object} Item
	 * @property {string} label
	 * @property {number} cost      Slots, die der Inhalt roh belegt
	 * @property {string} [chunk]   Gruppe, die beim Chunking zu 1 Slot verschmilzt
	 * @property {string} [note]
	 */

	/** @type {{id: string, name: string, sub: string, items: Item[], tip: string}[]} */
	const SCENARIOS = [
		{
			id: 'annahme-easy',
			name: 'Annahme — Ball kommt zu mir',
			sub: 'Ich bin vorher ausgerichtet, der Ball kommt direkt. Alles passt locker rein.',
			items: [
				{ label: 'Ballkontakt', cost: 1 },
				{ label: 'Ziel (Zuspielposition)', cost: 1, chunk: 'ausrichtung' },
			],
			tip: 'Einfache Situation: zwei Inhalte, keine Verdrängung. Hier gelingt die Annahme fast immer.',
		},
		{
			id: 'annahme-move',
			name: 'Annahme — ich muss mich bewegen',
			sub: 'Position stimmt nicht mehr, alles muss über die Arme korrigiert werden.',
			items: [
				{ label: 'Ballkontakt', cost: 1, note: 'frisst unter Druck alles andere' },
				{ label: 'Ziel (Zuspielposition)', cost: 1, chunk: 'ausrichtung' },
				{ label: 'Armwinkel / Abprallrichtung', cost: 1, chunk: 'ausrichtung' },
				{ label: 'Schulterorientierung', cost: 1, chunk: 'ausrichtung' },
				{ label: 'Hüfte & Position im Feld', cost: 2, chunk: 'ausrichtung' },
			],
			tip: 'Je stressiger es wird, desto mehr zieht sich alles auf "Ball treffen" zusammen — und genau die Inhalte, die den Ball ans Ziel bringen, fallen raus.',
		},
		{
			id: 'angriff-ball',
			name: 'Angriff — zum Ball springen',
			sub: 'Timing und Position werden im Anlauf laufend neu berechnet.',
			items: [
				{ label: 'Ball einholen (Timing)', cost: 2, note: 'laufende Neuberechnung' },
				{ label: 'Absprungpunkt korrigieren', cost: 2 },
				{ label: 'Technik (Schlag / Shot / Finte)', cost: 1, chunk: 'plan' },
				{ label: 'Zielzone im gegnerischen Feld', cost: 1, chunk: 'plan' },
				{ label: 'Block lesen', cost: 1, chunk: 'plan' },
			],
			tip: 'Was übrig bleibt, ist "Angriff" — also hart und gerade schlagen. Technik und Ziel waren längst gelöscht.',
		},
		{
			id: 'angriff-zone',
			name: 'Angriff — in die Zone springen',
			sub: 'Absprungpunkt steht vorher fest, der Ball kommt dorthin.',
			items: [
				{ label: 'Anlauftiming', cost: 1, note: 'nach dem Anlauf frei' },
				{ label: 'Angriffszone', cost: 1, note: 'nach dem Absprung frei' },
				{ label: 'Technik (Schlag / Shot / Finte)', cost: 1, chunk: 'plan' },
				{ label: 'Zielzone im gegnerischen Feld', cost: 1, chunk: 'plan' },
			],
			tip: 'Gleich viele Inhalte — aber zwei davon lösen sich während der Aktion auf. Beim Schlag sind Technik und Ziel noch da.',
		},
		{
			id: 'service',
			name: 'Service — rückwärts geplant',
			sub: 'Alles ausser dem Treffpunkt ist vor der Aktion entschieden.',
			items: [
				{ label: 'Treffpunkt am Ball', cost: 1 },
				{ label: 'Orientierung zum Feld', cost: 1, chunk: 'plan' },
				{ label: 'Schlagkraft (Gefühl)', cost: 1, chunk: 'plan', note: 'wird intern, braucht keinen Slot' },
			],
			tip: 'Weil der Plan vor dem Wurf fertig ist, bleibt im Moment des Schlags fast alles frei.',
		},
	];

	let scenarioId = $state(SCENARIOS[1].id);
	let capacity = $state(6);
	let stress = $state(1);
	let chunking = $state(false);

	const STRESS_LABEL = ['ruhig', 'leichter Druck', 'Spieldruck', 'Matchball'];

	let scenario = $derived(SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]);
	let effCapacity = $derived(Math.max(2, capacity - stress));

	// Chunking: alle Inhalte einer Gruppe verschmelzen zu einem einzigen Slot.
	let items = $derived.by(() => {
		if (!chunking) return scenario.items.map((it) => ({ ...it, merged: 0 }));
		/** @type {(Item & {merged: number})[]} */
		const out = [];
		/** @type {Map<string, number>} */
		const seen = new Map();
		for (const it of scenario.items) {
			if (!it.chunk) {
				out.push({ ...it, merged: 0 });
				continue;
			}
			const idx = seen.get(it.chunk);
			if (idx === undefined) {
				seen.set(it.chunk, out.length);
				out.push({ ...it, cost: 1, merged: 1, note: undefined });
			} else {
				const target = out[idx];
				target.merged += 1;
				target.label = `${target.label} + ${it.label.replace(/\s*\(.*\)/, '')}`;
			}
		}
		return out;
	});

	// Slots in Reihenfolge füllen — was nicht mehr reinpasst, wird verdrängt.
	let filled = $derived.by(() => {
		let used = 0;
		return items.map((it) => {
			const start = used;
			const fits = start + it.cost <= effCapacity;
			if (fits) used += it.cost;
			return { ...it, start, fits };
		});
	});

	let used = $derived(filled.filter((f) => f.fits).reduce((a, f) => a + f.cost, 0));
	let dropped = $derived(filled.filter((f) => !f.fits));
	let free = $derived(Math.max(0, effCapacity - used));

	const COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#db2777'];
</script>

<div class="wm-wrap">
	<div class="wm-head">
		<h4>Arbeitsspeicher — was passt noch rein?</h4>
		<p>
			Wähle eine Situation. Jeder Inhalt belegt einen oder mehrere <b>Slots</b>. Die Kapazität ist
			individuell und <b>schrumpft unter Druck</b>. Was nicht mehr hineinpasst, fällt hinten raus.
		</p>
	</div>

	<div class="wm-tabs" role="group" aria-label="Situation">
		{#each SCENARIOS as s}
			<button class="wm-tab" class:active={s.id === scenarioId} onclick={() => (scenarioId = s.id)}>
				{s.name}
			</button>
		{/each}
	</div>

	<p class="wm-sub">{scenario.sub}</p>

	<div class="wm-bar" aria-label="Arbeitsspeicher-Slots">
		{#each Array(effCapacity) as _, i}
			{@const owner = filled.find((f) => f.fits && i >= f.start && i < f.start + f.cost)}
			{@const idx = owner ? filled.indexOf(owner) : -1}
			<div
				class="wm-slot"
				class:empty={!owner}
				style={owner ? `background:${COLORS[idx % COLORS.length]}1a; border-color:${COLORS[idx % COLORS.length]}` : ''}
			>
				{#if owner && i === owner.start}
					<span class="wm-slot-label" style="color:{COLORS[idx % COLORS.length]}">{owner.label}</span>
					{#if owner.merged > 0}<span class="wm-chip">Chunk</span>{/if}
				{:else if owner}
					<span class="wm-slot-cont" style="color:{COLORS[idx % COLORS.length]}">↑ belegt</span>
				{:else}
					<span class="wm-slot-free">frei</span>
				{/if}
			</div>
		{/each}
		{#each Array(capacity - effCapacity) as _}
			<div class="wm-slot blocked"><span class="wm-slot-free">durch Druck blockiert</span></div>
		{/each}
	</div>

	<div class="wm-stats">
		<div class="wm-stat"><span class="wm-lbl">Kapazität</span><span class="wm-val">{effCapacity}</span><span class="wm-sub2">von {capacity} Slots</span></div>
		<div class="wm-stat"><span class="wm-lbl">belegt</span><span class="wm-val">{used}</span><span class="wm-sub2">{free} frei</span></div>
		<div class="wm-stat"><span class="wm-lbl">verdrängt</span><span class="wm-val" style="color:{dropped.length ? '#ef4444' : '#16a34a'}">{dropped.length}</span><span class="wm-sub2">Inhalte</span></div>
	</div>

	{#if dropped.length}
		<div class="wm-dropped">
			<strong>Fällt aus dem Arbeitsspeicher:</strong>
			{#each dropped as d}<span class="wm-drop-chip">{d.label}</span>{/each}
		</div>
	{:else}
		<div class="wm-ok"><strong>Alles drin.</strong> Die Aktion kann so geplant ausgeführt werden, wie sie gedacht war.</div>
	{/if}

	<div class="wm-controls">
		<label class="wm-ctrl">
			<span>Kapazität: <b>{capacity}</b> Slots</span>
			<input type="range" min="4" max="8" step="1" bind:value={capacity} />
		</label>
		<label class="wm-ctrl">
			<span>Druck: <b>{STRESS_LABEL[stress]}</b></span>
			<input type="range" min="0" max="3" step="1" bind:value={stress} />
		</label>
		<label class="wm-toggle">
			<input type="checkbox" bind:checked={chunking} />
			<span>Chunking — Gelerntes zu einem Slot zusammenfassen</span>
		</label>
	</div>

	<div class="wm-note">{scenario.tip}</div>
</div>

<style>
	.wm-wrap {
		background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
		padding: 1.5rem; margin: 2rem 0; display: flex; flex-direction: column; gap: 1rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}
	.wm-head h4 { margin: 0 0 0.3rem; color: var(--color-primary, #1e3a5f); font-size: 1.15rem; }
	.wm-head p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
	.wm-tabs { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.wm-tab {
		padding: 0.4rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem;
		background: #f8fafc; color: #475569; font-size: 0.78rem; font-weight: 600;
		cursor: pointer; transition: all 0.15s;
	}
	.wm-tab:hover { background: #e2e8f0; }
	.wm-tab.active { background: var(--color-primary, #1e3a5f); color: #fff; border-color: var(--color-primary, #1e3a5f); }
	.wm-sub { margin: 0; font-size: 0.85rem; color: #475569; font-style: italic; }

	.wm-bar { display: flex; flex-direction: column; gap: 0.35rem; }
	.wm-slot {
		display: flex; align-items: center; gap: 0.5rem; min-height: 2.2rem;
		padding: 0.35rem 0.75rem; border: 1.5px solid #e2e8f0; border-radius: 0.45rem;
		background: #f8fafc; font-size: 0.85rem;
	}
	.wm-slot.empty { border-style: dashed; }
	.wm-slot.blocked { border-style: dashed; background: repeating-linear-gradient(45deg, #fef2f2, #fef2f2 6px, #fee2e2 6px, #fee2e2 12px); border-color: #fecaca; }
	.wm-slot-label { font-weight: 700; }
	.wm-slot-cont { font-size: 0.75rem; opacity: 0.6; }
	.wm-slot-free { font-size: 0.75rem; color: #94a3b8; }
	.wm-chip { font-size: 0.65rem; background: #0f766e; color: #fff; padding: 0.1rem 0.4rem; border-radius: 999px; letter-spacing: 0.03em; }

	.wm-stats { display: flex; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.7rem 1rem; }
	.wm-stat { display: flex; flex-direction: column; padding: 0 1rem; flex: 1 1 100px; border-left: 1px solid #e2e8f0; }
	.wm-stat:first-child { border-left: none; }
	.wm-lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; font-weight: 500; }
	.wm-val { font-size: 1.1rem; font-weight: 700; color: #1e293b; font-family: monospace; }
	.wm-sub2 { font-size: 0.68rem; color: #94a3b8; font-family: monospace; }

	.wm-dropped { background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 0 0.4rem 0.4rem 0; padding: 0.65rem 1rem; font-size: 0.82rem; color: #7f1d1d; line-height: 1.8; }
	.wm-drop-chip { display: inline-block; background: #fee2e2; border: 1px solid #fecaca; border-radius: 999px; padding: 0.1rem 0.55rem; margin-left: 0.35rem; font-size: 0.76rem; }
	.wm-ok { background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 0 0.4rem 0.4rem 0; padding: 0.65rem 1rem; font-size: 0.82rem; color: #14532d; }

	.wm-controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.5rem; align-items: center; }
	.wm-ctrl { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; color: #475569; flex: 1 1 180px; }
	.wm-ctrl input { width: 100%; accent-color: var(--color-primary, #1e3a5f); }
	.wm-toggle { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; color: #475569; flex: 1 1 100%; }
	.wm-toggle input { accent-color: #0f766e; }

	.wm-note { background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 0 0.4rem 0.4rem 0; padding: 0.65rem 1rem; font-size: 0.82rem; color: #475569; line-height: 1.55; }
	@media (max-width: 600px) {
		.wm-wrap { padding: 1rem; }
		.wm-stat { flex-basis: 45%; border-left: none; padding: 0.2rem 0; }
	}
</style>
