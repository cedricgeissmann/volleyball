<script>
	/**
	 * Service-Vereinfachung — statische Visualisierung (keine Simulation).
	 *
	 * Links: Seitenansicht des Felds mit der Planungskette, die rückwärts vom
	 * Landepunkt bis zum Treffpunkt am Ball führt.
	 * Rechts/unten: Jeder Planungsschritt wird vor der Aktion entschieden und
	 * damit bewusst aus dem Arbeitsspeicher geworfen. Übrig bleibt genau das,
	 * was im Moment des Schlags wirklich gebraucht wird.
	 */

	// ─── Geometrie der Seitenansicht ────────────────────────────────────────────
	const W = 620;
	const H = 250;
	const GROUND = 196;
	const PPM = 16.5; // Pixel pro Meter (Längsrichtung ~ 18 m Feld + Aufschlagraum)
	const X0 = 36; // Standort Aufschläger
	/** @param {number} m */
	const fx = (m) => X0 + m * PPM;
	/** @param {number} m */
	const fy = (m) => GROUND - m * PPM;

	const NET_X = fx(9.2);
	const NET_TOP = fy(2.43);
	const CONTACT = { x: fx(0.3), y: fy(2.9) };
	const CROSS = { x: NET_X, y: fy(3.3) };
	const APEX = { x: fx(5.5), y: fy(3.95) };
	const LAND = { x: fx(15.6), y: GROUND };

	// Flugbahn als quadratische Bezier-Kurven (rein illustrativ gezeichnet)
	const PATH = `M ${CONTACT.x} ${CONTACT.y} Q ${APEX.x} ${fy(4.6)} ${CROSS.x} ${CROSS.y} T ${LAND.x} ${LAND.y}`;

	const STEPS = [
		{
			n: 1,
			title: 'Landepunkt festlegen',
			q: 'Wo soll der Ball den Boden berühren?',
			out: 'Zielzone',
			keep: false,
			detail: 'Eine Zone, kein Punkt. Damit ist das Ziel entschieden und muss nicht mehr gesucht werden.',
		},
		{
			n: 2,
			title: 'Netzüberquerung ableiten',
			q: 'Wie hoch muss der Ball über das Netz?',
			out: 'Flugbahn',
			keep: false,
			detail: 'Aus dem Landepunkt ergibt sich die Höhe über dem Netz von selbst — ein Blickpunkt statt einer Rechnung.',
		},
		{
			n: 3,
			title: 'Treffpunkt am Ball ableiten',
			q: 'Wo und wie treffe ich den Ball dafür?',
			out: 'Orientierung zum Feld',
			keep: true,
			detail: 'Das ist der einzige Inhalt, der den Moment des Schlags überleben muss.',
		},
		{
			n: 4,
			title: 'Kraft dem Gefühl überlassen',
			q: 'Wie fest schlage ich?',
			out: 'Kraftdosierung',
			keep: false,
			detail: 'Die Schlaghärte ist ein internes Gefühl. Wer sie bewusst steuert, verbrennt einen Slot ohne Gegenwert.',
		},
	];
</script>

<figure class="sp">
	<figcaption class="sp-head">
		<h4>Service: rückwärts planen heisst bewusst ausräumen</h4>
		<p>
			Die Planung läuft gegen die Flugrichtung — vom Landepunkt zurück zum Treffpunkt. Jeder Schritt,
			der <b>vor</b> der Aktion entschieden wird, belegt <b>während</b> der Aktion keinen Slot mehr.
		</p>
	</figcaption>

	<div class="sp-svgbox">
		<svg viewBox="0 0 {W} {H}" class="sp-svg" role="img" aria-label="Seitenansicht: Planungskette des Service vom Landepunkt zurück zum Treffpunkt">
			<rect width={W} height={H} rx="10" fill="#f8fafc" />

			<!-- Boden & Feld -->
			<line x1="0" y1={GROUND} x2={W} y2={GROUND} stroke="#cbd5e1" stroke-width="2" />
			<rect x={NET_X} y={GROUND - 4} width={fx(18.2) - NET_X} height="4" fill="#2563eb" opacity="0.08" />

			<!-- Zielzone -->
			<rect x={LAND.x - 1.6 * PPM} y={GROUND - 5} width={3.2 * PPM} height="10" rx="3"
				fill="#16a34a" opacity="0.18" stroke="#16a34a" stroke-dasharray="4,3" />

			<!-- Netz -->
			<line x1={NET_X} y1={GROUND} x2={NET_X} y2={NET_TOP} stroke="#475569" stroke-width="3" />
			<rect x={NET_X - 2} y={NET_TOP} width="4" height="8" fill="#475569" />
			<text x={NET_X + 6} y={NET_TOP - 6} font-size="9.5" fill="#64748b" font-family="sans-serif">Netz</text>

			<!-- Flugbahn (nur gezeichnet, nicht berechnet) -->
			<path d={PATH} fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,5" opacity="0.75" />

			<!-- Aufschläger -->
			<line x1={fx(0)} y1={GROUND} x2={fx(0)} y2={fy(1.1)} stroke="#1e3a5f" stroke-width="5" stroke-linecap="round" />
			<circle cx={fx(0)} cy={fy(1.35)} r="8" fill="#1e3a5f" />
			<line x1={fx(0)} y1={fy(1.05)} x2={CONTACT.x} y2={CONTACT.y + 10} stroke="#1e3a5f" stroke-width="4" stroke-linecap="round" />

			<!-- Rückwärts-Planungspfeile: 1 -> 2 -> 3 -->
			<defs>
				<marker id="sp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M 0 0 L 10 5 L 0 10 z" fill="#7c3aed" />
				</marker>
			</defs>
			<path d="M {LAND.x - 10} {GROUND - 26} Q {(LAND.x + CROSS.x) / 2} {fy(4.9)} {CROSS.x + 14} {CROSS.y - 12}"
				fill="none" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#sp-arrow)" />
			<path d="M {CROSS.x - 12} {CROSS.y - 12} Q {APEX.x} {fy(5.3)} {CONTACT.x + 12} {CONTACT.y - 16}"
				fill="none" stroke="#7c3aed" stroke-width="1.8" marker-end="url(#sp-arrow)" />
			<text x={(LAND.x + CROSS.x) / 2} y={fy(5.35)} text-anchor="middle" font-size="9.5" fill="#7c3aed" font-family="sans-serif" font-weight="700">
				Planungsrichtung
			</text>

			<!-- Knoten -->
			<g font-family="sans-serif">
				<!-- 3: Treffpunkt -->
				<circle cx={CONTACT.x} cy={CONTACT.y} r="9" fill="#fff" stroke="#f59e0b" stroke-width="2.5" />
				<circle cx={CONTACT.x - 16} cy={CONTACT.y - 20} r="9" fill="#2563eb" />
				<text x={CONTACT.x - 16} y={CONTACT.y - 16.5} text-anchor="middle" font-size="10" fill="#fff" font-weight="700">3</text>
				<text x={CONTACT.x - 28} y={CONTACT.y - 32} font-size="9.5" fill="#1e3a5f" font-weight="700">Treffpunkt</text>

				<!-- 2: Netzüberquerung -->
				<circle cx={CROSS.x} cy={CROSS.y} r="5.5" fill="#7c3aed" />
				<circle cx={CROSS.x + 2} cy={CROSS.y - 26} r="9" fill="#7c3aed" />
				<text x={CROSS.x + 2} y={CROSS.y - 22.5} text-anchor="middle" font-size="10" fill="#fff" font-weight="700">2</text>
				<text x={CROSS.x + 15} y={CROSS.y - 23} font-size="9.5" fill="#5b21b6" font-weight="700">Höhe über dem Netz</text>

				<!-- 1: Landepunkt -->
				<circle cx={LAND.x} cy={GROUND - 2} r="6" fill="#16a34a" />
				<circle cx={LAND.x} cy={GROUND - 30} r="9" fill="#16a34a" />
				<text x={LAND.x} y={GROUND - 26.5} text-anchor="middle" font-size="10" fill="#fff" font-weight="700">1</text>
				<text x={LAND.x} y={GROUND + 18} text-anchor="middle" font-size="9.5" fill="#15803d" font-weight="700">Zielzone</text>
			</g>
		</svg>
	</div>

	<ol class="sp-steps">
		{#each STEPS as s}
			<li class="sp-step" class:keep={s.keep}>
				<span class="sp-n">{s.n}</span>
				<div class="sp-body">
					<span class="sp-title">{s.title}</span>
					<span class="sp-q">{s.q}</span>
					<span class="sp-detail">{s.detail}</span>
				</div>
				<div class="sp-effect">
					{#if s.keep}
						<span class="sp-tag keep">bleibt im Speicher</span>
					{:else}
						<span class="sp-tag drop">↓ raus aus dem Speicher</span>
					{/if}
					<span class="sp-outlabel">{s.out}</span>
				</div>
			</li>
		{/each}
	</ol>

	<div class="sp-result">
		<span class="sp-result-k">Im Moment des Schlags noch aktiv</span>
		<div class="sp-result-slots">
			<span class="sp-slot">Treffpunkt am Ball</span>
			<span class="sp-slot">Orientierung zum Feld</span>
			<span class="sp-slot free">frei</span>
			<span class="sp-slot free">frei</span>
			<span class="sp-slot free">frei</span>
			<span class="sp-slot free">frei</span>
		</div>
	</div>
</figure>

<style>
	.sp {
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
	.sp-head h4 {
		margin: 0 0 0.25rem;
		font-size: 1.05rem;
		color: var(--color-primary, #1e3a5f);
	}
	.sp-head p {
		margin: 0;
		font-size: 0.85rem;
		color: #64748b;
		line-height: 1.5;
	}
	.sp-svgbox {
		display: flex;
		justify-content: center;
	}
	.sp-svg {
		width: 100%;
		max-width: 620px;
		height: auto;
	}

	.sp-steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.sp-step {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		padding: 0.55rem 0.8rem;
		border: 1px solid #e2e8f0;
		border-left: 3px solid #cbd5e1;
		border-radius: 0 0.45rem 0.45rem 0;
		background: #f8fafc;
	}
	.sp-step.keep {
		border-left-color: #2563eb;
		background: #eff6ff;
	}
	.sp-n {
		flex-shrink: 0;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 50%;
		background: #1e3a5f;
		color: #fff;
		font-size: 0.75rem;
		font-weight: 700;
		display: grid;
		place-items: center;
	}
	.sp-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.sp-title {
		font-size: 0.86rem;
		font-weight: 700;
		color: #1e293b;
	}
	.sp-q {
		font-size: 0.78rem;
		color: #475569;
		font-style: italic;
	}
	.sp-detail {
		font-size: 0.76rem;
		color: #64748b;
		line-height: 1.45;
	}
	.sp-effect {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		text-align: right;
	}
	.sp-tag {
		font-size: 0.64rem;
		font-weight: 700;
		padding: 0.12rem 0.5rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.sp-tag.drop {
		background: #fee2e2;
		color: #b91c1c;
	}
	.sp-tag.keep {
		background: #dbeafe;
		color: #1d4ed8;
	}
	.sp-outlabel {
		font-size: 0.7rem;
		color: #94a3b8;
	}

	.sp-result {
		border: 1px solid #bbf7d0;
		background: #f0fdf4;
		border-radius: 0.5rem;
		padding: 0.65rem 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.sp-result-k {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
		color: #15803d;
	}
	.sp-result-slots {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
		gap: 0.3rem;
	}
	.sp-slot {
		font-size: 0.74rem;
		font-weight: 600;
		text-align: center;
		padding: 0.35rem 0.4rem;
		border-radius: 0.35rem;
		background: #dbeafe;
		color: #1d4ed8;
		border: 1px solid #bfdbfe;
	}
	.sp-slot.free {
		background: #fff;
		color: #94a3b8;
		border: 1px dashed #cbd5e1;
		font-weight: 500;
	}

	@media (max-width: 640px) {
		.sp {
			padding: 1rem;
		}
		.sp-step {
			flex-wrap: wrap;
		}
		.sp-effect {
			align-items: flex-start;
			text-align: left;
			padding-left: 2.1rem;
		}
	}
</style>
