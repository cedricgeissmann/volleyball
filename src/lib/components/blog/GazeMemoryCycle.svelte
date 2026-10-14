<script>
	/**
	 * Blicktechnik & Arbeitsspeicher — statische Visualisierung (keine Simulation).
	 *
	 * Ein Spielzug als Filmstreifen: An jeder Station schaut der Spieler
	 * irgendwohin und liest dort Information ab. Der Arbeitsspeicher verliert
	 * laufend Inhalte — entscheidend ist, dass jeder Blick neue nachliefert,
	 * sodass immer etwas Brauchbares im Speicher liegt.
	 *
	 * Oben: Blick klebt am Ball. Unten: gelenkter Blick.
	 */

	/** @typedef {{label: string, s: 'neu'|'haelt'|'verblasst'|'weg'}} Chip */

	/** @type {{name: string, tone: 'bad'|'good', sub: string, stations: {gaze: string, when: string, chips: Chip[]}[], verdict: string}[]} */
	const TRACKS = [
		{
			name: 'Blick klebt am Ball',
			tone: 'bad',
			sub: 'Die Augen folgen dem Ball, auch wenn er gerade nichts verrät.',
			stations: [
				{
					when: 'Gegner schlägt auf',
					gaze: '👁 Ball',
					chips: [
						{ label: 'Flugbahn berechnen', s: 'neu' },
						{ label: 'Aufschlägerkörper', s: 'weg' },
					],
				},
				{
					when: 'Annahme läuft',
					gaze: '👁 Ball',
					chips: [
						{ label: 'Flugbahn berechnen', s: 'haelt' },
						{ label: 'eigene Position', s: 'verblasst' },
					],
				},
				{
					when: 'Zuspiel',
					gaze: '👁 Ball',
					chips: [
						{ label: 'Flugbahn berechnen', s: 'neu' },
						{ label: 'Zuspielerhände', s: 'weg' },
					],
				},
				{
					when: 'Mein Anlauf',
					gaze: '👁 Ball',
					chips: [
						{ label: 'Flugbahn berechnen', s: 'haelt' },
						{ label: 'Blockstellung', s: 'weg' },
					],
				},
				{
					when: 'Schlag',
					gaze: '👁 Ball',
					chips: [
						{ label: '«treffen»', s: 'haelt' },
						{ label: 'freies Feld', s: 'weg' },
					],
				},
			],
			verdict:
				'Jeder Blick liefert dieselbe, schnell wertlose Information: eine Flugbahn, die sich beim nächsten Kontakt ohnehin ändert. Es wird nichts Neues nachgeliefert — der Speicher leert sich, statt sich aufzufüllen.',
		},
		{
			name: 'Gelenkter Blick',
			tone: 'good',
			sub: 'Die Augen gehen dorthin, wo gerade Information entsteht. Der Ball nur dann, wenn ich ihn berühre.',
			stations: [
				{
					when: 'Gegner schlägt auf',
					gaze: '👁 Aufschläger',
					chips: [
						{ label: 'Richtung & Tempo geraten', s: 'neu' },
						{ label: 'eigene Zielzone', s: 'haelt' },
					],
				},
				{
					when: 'Annahme läuft',
					gaze: '👁 Ball (kurz)',
					chips: [
						{ label: 'Ballkontakt', s: 'neu' },
						{ label: 'Richtung & Tempo', s: 'verblasst' },
						{ label: 'eigene Zielzone', s: 'haelt' },
					],
				},
				{
					when: 'Zuspiel',
					gaze: '👁 gegnerischer Block',
					chips: [
						{ label: 'Blockstellung', s: 'neu' },
						{ label: 'Ballkontakt', s: 'weg' },
						{ label: 'eigene Zielzone', s: 'haelt' },
					],
				},
				{
					when: 'Mein Anlauf',
					gaze: '👁 freies Feld',
					chips: [
						{ label: 'freie Zone = mein Ziel', s: 'neu' },
						{ label: 'Blockstellung', s: 'verblasst' },
						{ label: 'Technikwahl', s: 'neu' },
					],
				},
				{
					when: 'Schlag',
					gaze: '👁 Ball (kurz)',
					chips: [
						{ label: 'Treffpunkt', s: 'neu' },
						{ label: 'freie Zone = mein Ziel', s: 'haelt' },
						{ label: 'Blockstellung', s: 'weg' },
					],
				},
			],
			verdict:
				'Auch hier geht laufend etwas verloren — das ist normal, der Arbeitsspeicher ist flüchtig. Aber jeder Blick erzeugt neue Inhalte, bevor die alten zerfallen. Dadurch liegt zu jedem Zeitpunkt etwas Brauchbares bereit.',
		},
	];

	/** @type {Record<Chip['s'], string>} */
	const LABEL = {
		neu: 'neu gelesen',
		haelt: 'hält',
		verblasst: 'verblasst',
		weg: 'verloren',
	};
</script>

<figure class="gz">
	<figcaption class="gz-head">
		<h4>Blicktechnik: verlieren und gleichzeitig nachliefern</h4>
		<p>
			Fünf Stationen eines Spielzugs. Unter jeder Station steht, was der Blick dort gerade in den
			<b>Arbeitsspeicher</b> legt — und was in derselben Zeit zerfällt.
		</p>
	</figcaption>

	{#each TRACKS as t}
		<section class="gz-track gz-{t.tone}">
			<header class="gz-th">
				<span class="gz-badge">{t.name}</span>
				<span class="gz-sub">{t.sub}</span>
			</header>

			<div class="gz-strip">
				{#each t.stations as st, i}
					<div class="gz-station">
						<span class="gz-when">{st.when}</span>
						<span class="gz-gaze">{st.gaze}</span>
						<div class="gz-mem">
							{#each st.chips as c}
								<span class="gz-chip gz-{c.s}" title={LABEL[c.s]}>{c.label}</span>
							{/each}
						</div>
						<span class="gz-count">
							{st.chips.filter((c) => c.s !== 'weg').length} im Speicher
						</span>
					</div>
					{#if i < t.stations.length - 1}
						<div class="gz-arrow" aria-hidden="true">→</div>
					{/if}
				{/each}
			</div>

			<p class="gz-verdict">{t.verdict}</p>
		</section>
	{/each}

	<div class="gz-legend">
		<span><i class="gz-dot neu"></i> neu gelesen</span>
		<span><i class="gz-dot haelt"></i> hält</span>
		<span><i class="gz-dot verblasst"></i> verblasst</span>
		<span><i class="gz-dot weg"></i> verloren</span>
	</div>
</figure>

<style>
	.gz {
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
	.gz-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.gz-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}

	.gz-track {
		border: 1px solid #e2e8f0;
		border-radius: 0.6rem;
		padding: 0.85rem 0.9rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.gz-bad {
		background: #fffbf7;
		border-color: #fed7aa;
	}
	.gz-good {
		background: #f7fdf9;
		border-color: #bbf7d0;
	}
	.gz-th {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
	}
	.gz-badge {
		font-size: 0.78rem;
		font-weight: 700;
		color: #fff;
		border-radius: 999px;
		padding: 0.15rem 0.65rem;
	}
	.gz-bad .gz-badge {
		background: #ea580c;
	}
	.gz-good .gz-badge {
		background: #16a34a;
	}
	.gz-sub {
		font-size: 0.78rem;
		color: #64748b;
	}

	.gz-strip {
		display: flex;
		align-items: stretch;
		gap: 0.25rem;
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}
	.gz-station {
		flex: 1 1 0;
		min-width: 8.5rem;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 0.45rem;
		padding: 0.45rem 0.5rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.gz-when {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		font-weight: 700;
	}
	.gz-gaze {
		font-size: 0.78rem;
		font-weight: 700;
		color: #1e3a5f;
	}
	.gz-mem {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-top: 0.1rem;
	}
	.gz-chip {
		font-size: 0.68rem;
		line-height: 1.25;
		padding: 0.2rem 0.4rem;
		border-radius: 0.3rem;
		border: 1px solid transparent;
	}
	.gz-neu {
		background: #dcfce7;
		border-color: #86efac;
		color: #15803d;
		font-weight: 700;
	}
	.gz-haelt {
		background: #dbeafe;
		border-color: #bfdbfe;
		color: #1d4ed8;
	}
	.gz-verblasst {
		background: #fef9c3;
		border-color: #fde68a;
		color: #a16207;
		opacity: 0.85;
	}
	.gz-weg {
		background: #f8fafc;
		border-color: #e2e8f0;
		color: #cbd5e1;
		text-decoration: line-through;
	}
	.gz-count {
		margin-top: auto;
		font-size: 0.62rem;
		font-family: monospace;
		color: #94a3b8;
		padding-top: 0.25rem;
	}
	.gz-arrow {
		align-self: center;
		color: #cbd5e1;
		font-size: 0.9rem;
		flex: 0 0 auto;
	}

	.gz-verdict {
		margin: 0;
		font-size: 0.82rem;
		line-height: 1.55;
		color: #475569;
	}

	.gz-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1rem;
		font-size: 0.72rem;
		color: #64748b;
		border-top: 1px solid #f1f5f9;
		padding-top: 0.6rem;
	}
	.gz-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.gz-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}
	.gz-dot.neu {
		background: #16a34a;
	}
	.gz-dot.haelt {
		background: #2563eb;
	}
	.gz-dot.verblasst {
		background: #eab308;
	}
	.gz-dot.weg {
		background: #cbd5e1;
	}

	@media (max-width: 640px) {
		.gz {
			padding: 1rem;
		}
		.gz-arrow {
			display: none;
		}
	}
</style>
