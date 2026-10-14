<script>
	/**
	 * Arbeitsspeicher-Slots — statische Visualisierung (keine Simulation).
	 *
	 * Zeigt für eine Spielsituation, welche Inhalte im Arbeitsspeicher liegen,
	 * welche Slots sie belegen, was währenddessen wieder frei wird und was
	 * schlicht hinten rausfällt.
	 *
	 * Verwendung im Blog:
	 *   <MemorySlots scenario="annahme-bewegung" />
	 */

	/**
	 * @typedef {Object} Item
	 * @property {string} label
	 * @property {number} [cost]   Anzahl Slots (Standard 1)
	 * @property {'belegt'|'frei'|'chunk'} [state]
	 * @property {string} [note]
	 */

	/**
	 * @typedef {Object} Scenario
	 * @property {string} title
	 * @property {string} [sub]
	 * @property {number} [capacity]
	 * @property {Item[]} items
	 * @property {string[]} [dropped]  Inhalte, die gar nicht mehr hineinpassen
	 * @property {string} [verdict]
	 * @property {'bad'|'ok'|'good'} [tone]
	 */

	/** @type {Record<string, Scenario>} */
	const CATALOG = {
		'annahme-einfach': {
			title: 'Annahme — der Ball kommt direkt zu mir',
			sub: 'Ich stehe schon richtig, der Ball prallt in die vorbereitete Richtung ab.',
			items: [
				{ label: 'Ballkontakt' },
				{ label: 'Ziel (Zuspielposition)' },
			],
			verdict: 'Zwei Inhalte, vier Slots frei. Diese Annahme gelingt fast immer.',
			tone: 'good',
		},
		'annahme-bewegung': {
			title: 'Annahme — ich muss mich bewegen',
			sub: 'Die Position stimmt nicht mehr, alles muss über die Arme korrigiert werden.',
			items: [
				{ label: 'Ballkontakt', cost: 2, note: 'frisst unter Druck immer mehr Platz' },
				{ label: 'Ziel (Zuspielposition)' },
				{ label: 'Armwinkel / Abprallrichtung' },
				{ label: 'Schulterorientierung' },
				{ label: 'Hüfte & Position im Feld', cost: 2 },
			],
			dropped: ['Schulterorientierung', 'Hüfte & Position im Feld'],
			verdict:
				'Je grösser der Druck, desto mehr zieht sich alles auf "Ball treffen" zusammen — und genau die Inhalte, die den Ball ans Ziel bringen würden, fallen hinten raus.',
			tone: 'bad',
		},
		'annahme-vorbereitet': {
			title: 'Annahme — früh geraten, früh ausgerichtet',
			sub: 'Auf der halben Flugdistanz sind Position, Hüfte und Schultern bereits gesetzt.',
			items: [
				{ label: 'Ballkontakt' },
				{ label: 'Ziel (Zuspielposition)' },
				{ label: 'Ausrichtung (Hüfte + Schulter + Armwinkel)', state: 'chunk' },
			],
			verdict:
				'Nichts fällt raus. Die Ausrichtung wurde vor dem Kontakt erledigt und steht als ein einziger Inhalt im Speicher.',
			tone: 'good',
		},
		'angriff-zum-ball': {
			title: 'Angriff — ich springe zum Ball',
			sub: 'Timing und Absprungpunkt werden im Anlauf laufend neu berechnet.',
			items: [
				{ label: 'Ball einholen (Timing)', cost: 2, note: 'laufende Neuberechnung' },
				{ label: 'Absprungpunkt korrigieren', cost: 2 },
				{ label: 'Flugbahn des Balls schätzen', cost: 2 },
				{ label: 'Technik (Schlag / Shot / Finte)' },
				{ label: 'Zielzone im gegnerischen Feld' },
				{ label: 'Block lesen' },
			],
			dropped: ['Technik (Schlag / Shot / Finte)', 'Zielzone im gegnerischen Feld', 'Block lesen'],
			verdict:
				'Übrig bleibt "Angriff" — also hart und gerade schlagen. Der Plan war längst gelöscht, bevor wir in der Luft waren.',
			tone: 'bad',
		},
		'angriff-zone': {
			title: 'Angriff — ich springe in die Zone',
			sub: 'Der Absprungpunkt steht vorher fest, der Ball kommt dorthin.',
			items: [
				{ label: 'Anlauftiming', state: 'frei', note: 'nach dem Anlauf erledigt' },
				{ label: 'Angriffszone', state: 'frei', note: 'nach dem Absprung erledigt' },
				{ label: 'Technik (Schlag / Shot / Finte)' },
				{ label: 'Zielzone im gegnerischen Feld' },
			],
			verdict:
				'Gleich viele Inhalte — aber zwei lösen sich während der Aktion auf. Im Moment des Schlags sind Technik und Ziel noch da.',
			tone: 'good',
		},
		'service-ungeplant': {
			title: 'Service — ohne Plan',
			sub: 'Alles wird erst im Moment des Schlags entschieden.',
			items: [
				{ label: 'Wohin soll der Ball?' },
				{ label: 'Flugbahn vorhersagen', cost: 2 },
				{ label: 'Orientierung zum Feld' },
				{ label: 'Wurf kontrollieren' },
				{ label: 'Treffpunkt am Ball' },
				{ label: 'Schlagkraft dosieren' },
			],
			dropped: ['Treffpunkt am Ball', 'Schlagkraft dosieren'],
			verdict:
				'Ausgerechnet das, was wir im Moment des Schlags wirklich brauchen, hat keinen Platz mehr.',
			tone: 'bad',
		},
		'service-geplant': {
			title: 'Service — rückwärts geplant',
			sub: 'Alles ausser dem Treffpunkt ist vor dem Wurf entschieden.',
			items: [
				{ label: 'Treffpunkt am Ball' },
				{ label: 'Orientierung zum Feld', note: 'steht durch die Aufstellung fest' },
			],
			verdict:
				'Weil der Plan vor dem Wurf fertig ist, bleibt im Moment des Schlags fast alles frei. Zwei Inhalte — das schaffen wir.',
			tone: 'good',
		},
		'zuspiel-geplant': {
			title: 'Zuspiel — Position früh geraten',
			sub: 'Standardhöhe, feste Zielzone, Position vorher eingenommen.',
			items: [
				{ label: 'Zielzone + Zuspielhöhe', state: 'chunk' },
				{ label: 'Block beobachten', state: 'frei', note: 'der Gewinn aus dem freien Platz' },
			],
			verdict:
				'Wer Zielzone und Höhe zu einem Inhalt zusammenfasst, hat plötzlich Slots frei, um den gegnerischen Block zu lesen.',
			tone: 'good',
		},
	};

	let { scenario = 'annahme-bewegung', capacity = 6 } = $props();

	let data = $derived(CATALOG[scenario] ?? CATALOG['annahme-bewegung']);
	let cap = $derived(data.capacity ?? capacity);
	let droppedSet = $derived(new Set(data.dropped ?? []));

	/** Inhalte der Reihe nach in die Slots legen. */
	let placed = $derived.by(() => {
		let used = 0;
		return data.items.map((it) => {
			const cost = it.cost ?? 1;
			const forcedOut = droppedSet.has(it.label);
			const fits = !forcedOut && used + cost <= cap;
			const start = used;
			if (fits) used += cost;
			return { ...it, cost, start, fits, state: it.state ?? 'belegt' };
		});
	});

	let inMemory = $derived(placed.filter((p) => p.fits));
	let out = $derived(placed.filter((p) => !p.fits));
	let usedSlots = $derived(inMemory.reduce((a, p) => a + p.cost, 0));
	let freeSlots = $derived(Math.max(0, cap - usedSlots));

	const COLORS = ['#2563eb', '#0d9488', '#7c3aed', '#d97706', '#db2777', '#0ea5e9'];
</script>

<figure class="ms">
	<figcaption class="ms-head">
		<h4>{data.title}</h4>
		{#if data.sub}<p>{data.sub}</p>{/if}
	</figcaption>

	<div class="ms-bar">
		{#each Array(cap) as _, i}
			{@const owner = inMemory.find((p) => i >= p.start && i < p.start + p.cost)}
			{@const idx = owner ? placed.indexOf(owner) : -1}
			{@const color = COLORS[idx % COLORS.length]}
			<div
				class="ms-slot"
				class:empty={!owner}
				class:released={owner?.state === 'frei'}
				style={owner ? `--c:${color}` : ''}
			>
				<span class="ms-num">{i + 1}</span>
				{#if owner && i === owner.start}
					<span class="ms-label">{owner.label}</span>
					{#if owner.state === 'chunk'}<span class="ms-chip chunk">1 Chunk</span>{/if}
					{#if owner.state === 'frei'}<span class="ms-chip freed">wird während der Aktion frei</span>{/if}
					{#if owner.note}<span class="ms-note-inline">{owner.note}</span>{/if}
				{:else if owner}
					<span class="ms-cont">↑ derselbe Inhalt, zweiter Slot</span>
				{:else}
					<span class="ms-free">frei</span>
				{/if}
			</div>
		{/each}
	</div>

	{#if out.length}
		<div class="ms-out">
			<span class="ms-out-title">Fällt aus dem Arbeitsspeicher</span>
			<div class="ms-out-list">
				{#each out as o}<span class="ms-out-chip">{o.label}</span>{/each}
			</div>
		</div>
	{/if}

	<div class="ms-stats">
		<div><span class="ms-k">Kapazität</span><span class="ms-v">{cap}</span></div>
		<div><span class="ms-k">belegt</span><span class="ms-v">{usedSlots}</span></div>
		<div><span class="ms-k">frei</span><span class="ms-v" style="color:#16a34a">{freeSlots}</span></div>
		<div>
			<span class="ms-k">verdrängt</span>
			<span class="ms-v" style="color:{out.length ? '#ef4444' : '#16a34a'}">{out.length}</span>
		</div>
	</div>

	{#if data.verdict}
		<p class="ms-verdict" class:bad={data.tone === 'bad'} class:good={data.tone === 'good'}>
			{data.verdict}
		</p>
	{/if}
</figure>

<style>
	.ms {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem 1.4rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.ms-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.ms-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}

	.ms-bar {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.ms-slot {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 2.1rem;
		padding: 0.3rem 0.7rem;
		border: 1.5px solid var(--c, #e2e8f0);
		border-radius: 0.45rem;
		background: color-mix(in srgb, var(--c, #f8fafc) 8%, #fff);
		font-size: 0.85rem;
	}
	.ms-slot.empty {
		border-style: dashed;
		border-color: #cbd5e1;
		background: #f8fafc;
	}
	.ms-slot.released {
		border-style: dashed;
	}
	.ms-num {
		font-family: monospace;
		font-size: 0.7rem;
		color: #94a3b8;
		width: 1rem;
		flex-shrink: 0;
	}
	.ms-label {
		font-weight: 700;
		color: var(--c, #1e293b);
	}
	.ms-cont {
		font-size: 0.75rem;
		color: var(--c, #94a3b8);
		opacity: 0.65;
	}
	.ms-free {
		font-size: 0.75rem;
		color: #94a3b8;
	}
	.ms-note-inline {
		font-size: 0.72rem;
		color: #94a3b8;
		font-style: italic;
	}
	.ms-chip {
		font-size: 0.64rem;
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
		letter-spacing: 0.02em;
		font-weight: 600;
		color: #fff;
	}
	.ms-chip.chunk {
		background: #0f766e;
	}
	.ms-chip.freed {
		background: #16a34a;
	}

	.ms-out {
		background: #fef2f2;
		border-left: 3px solid #ef4444;
		border-radius: 0 0.4rem 0.4rem 0;
		padding: 0.6rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.ms-out-title {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: #b91c1c;
	}
	.ms-out-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.ms-out-chip {
		background: #fee2e2;
		border: 1px solid #fecaca;
		color: #7f1d1d;
		border-radius: 999px;
		padding: 0.12rem 0.6rem;
		font-size: 0.76rem;
		text-decoration: line-through;
	}

	.ms-stats {
		display: flex;
		flex-wrap: wrap;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 0.5rem;
		padding: 0.55rem 0.9rem;
	}
	.ms-stats > div {
		display: flex;
		flex-direction: column;
		flex: 1 1 80px;
		padding: 0 0.8rem;
		border-left: 1px solid #e2e8f0;
	}
	.ms-stats > div:first-child {
		border-left: none;
	}
	.ms-k {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		font-weight: 600;
	}
	.ms-v {
		font-size: 1.05rem;
		font-weight: 700;
		font-family: monospace;
		color: #1e293b;
	}

	.ms-verdict {
		margin: 0;
		padding: 0.6rem 0.95rem;
		border-radius: 0 0.4rem 0.4rem 0;
		font-size: 0.85rem;
		line-height: 1.55;
		background: #f8fafc;
		border-left: 3px solid #94a3b8;
		color: #475569;
	}
	.ms-verdict.bad {
		background: #fff7ed;
		border-left-color: #f97316;
		color: #7c2d12;
	}
	.ms-verdict.good {
		background: #f0fdf4;
		border-left-color: #16a34a;
		color: #14532d;
	}

	@media (max-width: 600px) {
		.ms {
			padding: 1rem;
		}
		.ms-stats > div {
			flex-basis: 45%;
			border-left: none;
			padding: 0.2rem 0;
		}
	}
</style>
