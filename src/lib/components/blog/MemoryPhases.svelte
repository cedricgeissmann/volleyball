<script>
	/**
	 * Arbeitsspeicher im Verlauf einer Aktion — statische Visualisierung.
	 *
	 * Zeigt Phase für Phase, welche Inhalte belegt bleiben, welche bewusst
	 * freigegeben werden und welche unkontrolliert verdrängt werden.
	 * Zwei Varianten lassen sich direkt nebeneinander vergleichen.
	 *
	 *   <MemoryPhases track="angriff" />
	 */

	/** @typedef {'belegt'|'frei'|'weg'|'neu'} State */

	/**
	 * @typedef {Object} Track
	 * @property {string} title
	 * @property {string} [sub]
	 * @property {string[]} phases
	 * @property {{name: string, tone: 'bad'|'good', sub: string, rows: {label: string, states: State[]}[], verdict: string}[]} variants
	 */

	/** @type {Record<string, Track>} */
	const TRACKS = {
		angriff: {
			title: 'Angriff: Was überlebt bis zum Schlag?',
			sub: 'Dieselben vier Inhalte, zwei verschiedene Absichten — verfolgt über die Phasen der Aktion.',
			phases: ['Vor dem Anlauf', 'Anlauf', 'Absprung', 'Flugphase', 'Schlag'],
			variants: [
				{
					name: 'Ich springe zum Ball',
					tone: 'bad',
					sub: 'Timing und Absprungpunkt werden laufend an den Ball angepasst.',
					rows: [
						{ label: 'Timing / Ball einholen', states: ['belegt', 'belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Absprungpunkt', states: ['belegt', 'belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Technik', states: ['belegt', 'weg', 'weg', 'weg', 'weg'] },
						{ label: 'Zielzone', states: ['belegt', 'weg', 'weg', 'weg', 'weg'] },
					],
					verdict:
						'Die laufende Berechnung hört nie auf — also verdrängt sie alles andere. Im Schlag ist nur noch «treffen» übrig.',
				},
				{
					name: 'Ich springe in die Zone',
					tone: 'good',
					sub: 'Absprungpunkt vorher festgelegt, in der Luft wird nichts mehr korrigiert.',
					rows: [
						{ label: 'Anlauftiming', states: ['belegt', 'belegt', 'frei', 'frei', 'frei'] },
						{ label: 'Angriffszone', states: ['belegt', 'belegt', 'belegt', 'frei', 'frei'] },
						{ label: 'Technik', states: ['belegt', 'belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Zielzone', states: ['belegt', 'belegt', 'belegt', 'belegt', 'belegt'] },
					],
					verdict:
						'Zwei Inhalte erledigen sich von selbst und geben ihren Slot frei. Technik und Ziel überleben bis zum Schlag.',
				},
			],
		},
		annahme: {
			title: 'Annahme: früh raten statt spät korrigieren',
			sub: 'Die halbe Flugdistanz des Service entscheidet, wie voll der Speicher beim Kontakt ist.',
			phases: ['Vor dem Service', 'Erste Ballhälfte', 'Zweite Ballhälfte', 'Kontakt'],
			variants: [
				{
					name: 'Ich warte und korrigiere spät',
					tone: 'bad',
					sub: 'Die Ausrichtung passiert erst, wenn der Ball schon fast da ist.',
					rows: [
						{ label: 'Ballkontakt', states: ['belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Ziel', states: ['belegt', 'belegt', 'belegt', 'weg'] },
						{ label: 'Armwinkel', states: ['belegt', 'belegt', 'belegt', 'weg'] },
						{ label: 'Hüfte & Schulter', states: ['belegt', 'belegt', 'weg', 'weg'] },
					],
					verdict: 'Alles passiert gleichzeitig — und zwar genau dann, wenn am wenigsten Zeit ist.',
				},
				{
					name: 'Ich rate früh und stelle mich ein',
					tone: 'good',
					sub: 'Position, Hüfte und Schultern stehen, bevor der Ball die Netzkante passiert.',
					rows: [
						{ label: 'Ballkontakt', states: ['belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Ziel', states: ['belegt', 'belegt', 'belegt', 'belegt'] },
						{ label: 'Armwinkel', states: ['belegt', 'belegt', 'frei', 'frei'] },
						{ label: 'Hüfte & Schulter', states: ['belegt', 'frei', 'frei', 'frei'] },
					],
					verdict:
						'Im Moment des Kontakts sind nur noch zwei Inhalte aktiv — und beide zählen für das Resultat.',
				},
			],
		},
	};

	let { track = 'angriff' } = $props();
	let data = $derived(TRACKS[track] ?? TRACKS.angriff);

	/** @type {Record<State, string>} */
	const LEGEND = {
		belegt: 'belegt',
		frei: 'Slot frei',
		weg: 'verdrängt',
		neu: 'neu',
	};
</script>

<figure class="mp">
	<figcaption class="mp-head">
		<h4>{data.title}</h4>
		{#if data.sub}<p>{data.sub}</p>{/if}
	</figcaption>

	{#each data.variants as v}
		<section class="mp-variant mp-{v.tone}">
			<header class="mp-var-head">
				<span class="mp-badge">{v.name}</span>
				<span class="mp-var-sub">{v.sub}</span>
			</header>

			<div class="mp-grid" style="--cols: {data.phases.length}">
				<div class="mp-corner"></div>
				{#each data.phases as p}
					<div class="mp-phase">{p}</div>
				{/each}

				{#each v.rows as row}
					<div class="mp-rowlabel">{row.label}</div>
					{#each row.states as s, i}
						<div class="mp-cell mp-s-{s}" title="{row.label}: {LEGEND[s]}">
							<span class="mp-pill">
								{#if s === 'belegt'}●{:else if s === 'frei'}○{:else if s === 'neu'}＋{:else}✕{/if}
							</span>
							{#if i === 0 || row.states[i - 1] !== s}
								<span class="mp-state">{LEGEND[s]}</span>
							{/if}
						</div>
					{/each}
				{/each}
			</div>

			<p class="mp-verdict">{v.verdict}</p>
		</section>
	{/each}

	<div class="mp-legend">
		<span><i class="mp-dot belegt"></i> belegt — kostet einen Slot</span>
		<span><i class="mp-dot frei"></i> freigegeben — erledigt sich während der Aktion</span>
		<span><i class="mp-dot weg"></i> verdrängt — unfreiwillig verloren</span>
	</div>
</figure>

<style>
	.mp {
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem 1.5rem 1.4rem;
		margin: 2rem 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.04);
	}
	.mp-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.mp-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}

	.mp-variant {
		border: 1px solid #e2e8f0;
		border-radius: 0.6rem;
		padding: 0.85rem 0.9rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.mp-bad {
		background: #fffbf7;
		border-color: #fed7aa;
	}
	.mp-good {
		background: #f7fdf9;
		border-color: #bbf7d0;
	}
	.mp-var-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}
	.mp-badge {
		font-size: 0.78rem;
		font-weight: 700;
		color: #fff;
		border-radius: 999px;
		padding: 0.15rem 0.65rem;
	}
	.mp-bad .mp-badge {
		background: #ea580c;
	}
	.mp-good .mp-badge {
		background: #16a34a;
	}
	.mp-var-sub {
		font-size: 0.78rem;
		color: #64748b;
	}

	.mp-grid {
		display: grid;
		grid-template-columns: minmax(6.5rem, 1.1fr) repeat(var(--cols), minmax(0, 1fr));
		gap: 0.2rem;
	}
	.mp-corner {
		background: transparent;
	}
	.mp-phase {
		font-size: 0.63rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-weight: 700;
		color: #94a3b8;
		text-align: center;
		padding: 0.2rem 0.1rem;
		line-height: 1.2;
	}
	.mp-rowlabel {
		font-size: 0.75rem;
		font-weight: 600;
		color: #334155;
		display: flex;
		align-items: center;
		padding-right: 0.3rem;
	}
	.mp-cell {
		border-radius: 0.3rem;
		padding: 0.3rem 0.15rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		min-height: 2.3rem;
		justify-content: center;
	}
	.mp-pill {
		font-size: 0.8rem;
		line-height: 1;
	}
	.mp-state {
		font-size: 0.56rem;
		letter-spacing: 0.02em;
		text-align: center;
		line-height: 1.1;
	}
	.mp-s-belegt {
		background: #dbeafe;
		color: #1d4ed8;
	}
	.mp-s-frei {
		background: #dcfce7;
		color: #15803d;
		border: 1px dashed #86efac;
	}
	.mp-s-weg {
		background: #fee2e2;
		color: #b91c1c;
	}
	.mp-s-neu {
		background: #ccfbf1;
		color: #0f766e;
	}

	.mp-verdict {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.5;
		color: #475569;
	}

	.mp-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		font-size: 0.72rem;
		color: #64748b;
		border-top: 1px solid #f1f5f9;
		padding-top: 0.6rem;
	}
	.mp-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.mp-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}
	.mp-dot.belegt {
		background: #2563eb;
	}
	.mp-dot.frei {
		background: #16a34a;
	}
	.mp-dot.weg {
		background: #ef4444;
	}

	@media (max-width: 640px) {
		.mp {
			padding: 1rem;
		}
		.mp-grid {
			grid-template-columns: minmax(5rem, 1fr) repeat(var(--cols), minmax(0, 1fr));
		}
		.mp-state {
			display: none;
		}
		.mp-rowlabel {
			font-size: 0.68rem;
		}
	}
</style>
