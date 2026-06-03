<script>
	/**
	 * Freiheitsgrade-Animation (Bernstein)
	 *
	 * Zeigt drei Zustände eines Angriffsschlag-Stick-Figures:
	 *   Stufe 1 (Anfänger): Arm und Hüfte eingefroren — nur Schulter bewegt sich
	 *   Stufe 2 (Fortgeschritten): Ellbogen freigegeben, leichte Hüftrotation
	 *   Stufe 3 (Experte): alle Gelenke aktiv, fließende Bewegung
	 *
	 * Die Gelenke werden visuell markiert: rot = eingefroren, grün = aktiv/frei
	 */

	import { _, locale } from 'svelte-i18n';
	import { onDestroy } from 'svelte';

	// ─── SVG-Konstanten ────────────────────────────────────────────────────────
	const W = 520;
	const H = 300;
	// drei Figuren nebeneinander
	const COLS = 3;
	const COL_W = W / COLS;

	// ─── Figur-Geometrie ────────────────────────────────────────────────────────
	// Basis: stehende Figur, Angriffsvorbereitung (Arm-Ausholbewegung)
	// Ankerpunkt: Hüfte
	const BASE_HIP_Y = 220;
	const BASE_HIP_X = COL_W / 2;

	// Körperlängen in px
	const L_TORSO   = 60;
	const L_UPPER_ARM = 40;
	const L_LOWER_ARM = 35;
	const L_THIGH   = 55;
	const L_SHIN    = 50;
	const L_HEAD_R  = 14;

	// Gelenk-Farben
	const COLOR_FROZEN = '#ef4444'; // rot
	const COLOR_ACTIVE = '#22c55e'; // grün
	const COLOR_JOINT  = '#334155'; // neutral (Verbindung)

	// Schwerpunkt-Farbe je Stufe
	const STAGE_COLORS = ['#64748b', '#f59e0b', '#1d4ed8'];

	/**
	 * Berechnet alle Punkte der Stick-Figure für eine gegebene Animationsphase.
	 * @param {number} stageIndex 0=Anfänger, 1=Fortgeschritten, 2=Experte
	 * @param {number} t Animationsphase [0..1] — Ausholbewegung → Kontakt
	 * @param {number} colX x-Mittelpunkt der Spalte
	 */
	function computeFigure(stageIndex, t, colX) {
		// Easing: smooth sine
		const ease = (Math.sin(t * Math.PI - Math.PI / 2) + 1) / 2;

		// ─── Stufenspezifische Winkelverläufe ─────────────────────────────────
		// Alle Winkel in Grad, positiv = im Uhrzeigersinn
		// Schulter-Elevation (Ausholbewegung nach hinten → nach vorne/oben)
		// t=0: Arm ausgeholt (hinter Kopf), t=1: Kontaktpunkt (Arm oben vorne)
		const shoulderBase  = -80; // hinten
		const shoulderEnd   = 40;  // vorne oben
		const shoulderAngle = shoulderBase + (shoulderEnd - shoulderBase) * ease;

		// Ellbogen-Streckung: Anfänger = steif (160°), Experte = dynamisch (60° → 160°)
		let elbowAngle;
		if (stageIndex === 0) {
			// Eingefroren: fast gestreckt, kaum Bewegung
			elbowAngle = 155 + ease * 10;
		} else if (stageIndex === 1) {
			// Mittlere Beugung → Streckung
			elbowAngle = 90 + ease * 80;
		} else {
			// Stark gebeugt → vollständig gestreckt (Peitsche)
			elbowAngle = 55 + ease * 115;
		}

		// Handgelenk-Aktion: nur Experte hat Handgelenks-Snap
		let wristAngle;
		if (stageIndex < 2) {
			wristAngle = 175;
		} else {
			wristAngle = 150 + ease * 30;
		}

		// Hüftrotation (angedeutet durch Torso-Neigung)
		let torsoTilt;
		if (stageIndex === 0) {
			torsoTilt = 2; // kaum Neigung
		} else if (stageIndex === 1) {
			torsoTilt = 8 * ease;
		} else {
			torsoTilt = 18 * ease;
		}

		// Absprung-Offset (Experte springt leicht)
		const jumpOffset = stageIndex === 2 ? 15 * Math.sin(ease * Math.PI) : 0;

		// ─── Positionen berechnen ──────────────────────────────────────────────
		const hipX = colX;
		const hipY = BASE_HIP_Y - jumpOffset;

		// Torso-Endpunkt (Schulter)
		const torsoRad = ((-90) + torsoTilt) * Math.PI / 180;
		const chestX = hipX + L_TORSO * Math.cos(torsoRad);
		const chestY = hipY + L_TORSO * Math.sin(torsoRad);

		// Kopf
		const headX = chestX;
		const headY = chestY - L_HEAD_R * 2 - 4;

		// Schlagarm: rechts (positiv x)
		const shRad = (shoulderAngle - 90 + torsoTilt) * Math.PI / 180;
		const shoulderX = chestX + 12;
		const shoulderY = chestY + 4;
		const elbowX = shoulderX + L_UPPER_ARM * Math.cos(shRad);
		const elbowY = shoulderY + L_UPPER_ARM * Math.sin(shRad);

		// Unterarm-Winkel relativ zum Oberarm
		const elRad = (shoulderAngle - 90 + torsoTilt - (180 - elbowAngle)) * Math.PI / 180;
		const wristX = elbowX + L_LOWER_ARM * Math.cos(elRad);
		const wristY = elbowY + L_LOWER_ARM * Math.sin(elRad);

		// Nicht-Schlagarm (links, wenig bewegt)
		const lShoulderX = chestX - 10;
		const lShoulderY = chestY + 4;
		const lElbowX = lShoulderX - 20;
		const lElbowY = lShoulderY + 20;
		const lWristX = lElbowX - 10;
		const lWristY = lElbowY + 15;

		// Beine
		const lHipX = hipX - 10;
		const rHipX = hipX + 10;
		// Linkes Bein (vorne beim Sprung)
		const lKneeX = lHipX - 5 + (stageIndex === 2 ? -5 * ease : 0);
		const lKneeY = hipY + 30 + (stageIndex === 2 ? -8 * ease : 0);
		const lAnkleX = lKneeX;
		const lAnkleY = lKneeY + L_SHIN;
		// Rechtes Bein
		const rKneeX = rHipX + 5;
		const rKneeY = hipY + 30;
		const rAnkleX = rKneeX;
		const rAnkleY = rKneeY + L_SHIN;

		// ─── Freiheitsgrad-Status je Gelenk ────────────────────────────────────
		/** @type {Record<string, boolean>} true = aktiv/frei, false = eingefroren */
		const dof = {
			shoulder: stageIndex >= 1,
			elbow: stageIndex >= 1,
			wrist: stageIndex >= 2,
			hip: stageIndex >= 1,
			knee: stageIndex >= 2,
		};

		return {
			hipX, hipY, chestX, chestY, headX, headY,
			shoulderX, shoulderY, elbowX, elbowY, wristX, wristY,
			lShoulderX, lShoulderY, lElbowX, lElbowY, lWristX, lWristY,
			lHipX, rHipX, lKneeX, lKneeY, lAnkleX, lAnkleY,
			rKneeX, rKneeY, rAnkleX, rAnkleY,
			dof,
			jumpOffset,
		};
	}

	// ─── Animationssteuerung ───────────────────────────────────────────────────
	let animPhase = $state(0); // 0..1
	let direction = $state(1);
	let rafId = /** @type {number|null} */ (null);
	let lastTs = 0;
	const PERIOD = 2200; // ms für einen kompletten Vor/Rück-Zyklus

	/** @param {number} ts */
	function frame(ts) {
		if (lastTs === 0) lastTs = ts;
		const dt = ts - lastTs;
		lastTs = ts;

		animPhase += direction * dt / PERIOD;
		if (animPhase >= 1) { animPhase = 1; direction = -1; }
		if (animPhase <= 0) { animPhase = 0; direction = 1; }

		rafId = requestAnimationFrame(frame);
	}

	// Figures als reaktives derived
	let figs = $derived([
		computeFigure(0, animPhase, COL_W * 0 + COL_W / 2),
		computeFigure(1, animPhase, COL_W * 1 + COL_W / 2),
		computeFigure(2, animPhase, COL_W * 2 + COL_W / 2),
	]);

	$effect(() => {
		rafId = requestAnimationFrame(frame);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = null;
			lastTs = 0;
		};
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	const STAGE_LABELS_DE = ['Anfänger', 'Fortgeschritten', 'Experte'];
	const STAGE_LABELS_EN = ['Beginner', 'Advanced', 'Expert'];

	// DoF-Labels (welche Gelenke eingefroren/aktiv) je Stufe
	const DOF_SUMMARY = [
		{ frozen: ['Schulter', 'Ellbogen', 'Handgelenk', 'Hüfte'], active: [] },
		{ frozen: ['Handgelenk'], active: ['Schulter', 'Ellbogen', 'Hüfte'] },
		{ frozen: [], active: ['Schulter', 'Ellbogen', 'Handgelenk', 'Hüfte', 'Knie'] },
	];
	const DOF_SUMMARY_EN = [
		{ frozen: ['Shoulder', 'Elbow', 'Wrist', 'Hip'], active: [] },
		{ frozen: ['Wrist'], active: ['Shoulder', 'Elbow', 'Hip'] },
		{ frozen: [], active: ['Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee'] },
	];
</script>

<div class="dof-wrapper">
	<svg
		viewBox="0 0 {W} {H}"
		class="dof-svg"
		role="img"
		aria-label="Freiheitsgrade Animation"
	>
		<!-- Hintergrund -->
		<rect width={W} height={H} fill="#f8fafc" rx="10" />

		<!-- Boden-Linie -->
		<line x1="20" y1="270" x2={W - 20} y2="270" stroke="#e2e8f0" stroke-width="1.5" />

		<!-- Spalten-Trennlinien -->
		{#each [1, 2] as i}
			<line
				x1={COL_W * i}
				y1="20"
				x2={COL_W * i}
				y2={H - 10}
				stroke="#e2e8f0"
				stroke-width="1"
				stroke-dasharray="4,4"
			/>
		{/each}

		<!-- Figuren -->
		{#each figs as fig, stageIndex}
			{@const c = STAGE_COLORS[stageIndex]}
			{@const sw = 2.5}

			<!-- Schatten -->
			<ellipse
				cx={fig.hipX}
				cy="271"
				rx={14 - stageIndex * 2}
				ry={3 - fig.jumpOffset * 0.05}
				fill="#94a3b8"
				opacity={0.2 - stageIndex * 0.03}
			/>

			<!-- Beine links -->
			<line
				x1={fig.lHipX} y1={fig.hipY}
				x2={fig.lKneeX} y2={fig.lKneeY}
				stroke={fig.dof.knee ? COLOR_JOINT : COLOR_JOINT}
				stroke-width={sw} stroke-linecap="round"
			/>
			<line
				x1={fig.lKneeX} y1={fig.lKneeY}
				x2={fig.lAnkleX} y2={fig.lAnkleY}
				stroke={COLOR_JOINT} stroke-width={sw} stroke-linecap="round"
			/>
			<!-- Beine rechts -->
			<line
				x1={fig.rHipX} y1={fig.hipY}
				x2={fig.rKneeX} y2={fig.rKneeY}
				stroke={COLOR_JOINT} stroke-width={sw} stroke-linecap="round"
			/>
			<line
				x1={fig.rKneeX} y1={fig.rKneeY}
				x2={fig.rAnkleX} y2={fig.rAnkleY}
				stroke={COLOR_JOINT} stroke-width={sw} stroke-linecap="round"
			/>

			<!-- Torso -->
			<line
				x1={fig.hipX} y1={fig.hipY}
				x2={fig.chestX} y2={fig.chestY}
				stroke={COLOR_JOINT}
				stroke-width={sw + 0.5} stroke-linecap="round"
			/>

			<!-- Nicht-Schlagarm (links, gedimmt) -->
			<line
				x1={fig.lShoulderX} y1={fig.lShoulderY}
				x2={fig.lElbowX} y2={fig.lElbowY}
				stroke={COLOR_JOINT} stroke-width={sw * 0.8} stroke-linecap="round" opacity="0.5"
			/>
			<line
				x1={fig.lElbowX} y1={fig.lElbowY}
				x2={fig.lWristX} y2={fig.lWristY}
				stroke={COLOR_JOINT} stroke-width={sw * 0.8} stroke-linecap="round" opacity="0.5"
			/>

			<!-- Schlagarm -->
			<line
				x1={fig.shoulderX} y1={fig.shoulderY}
				x2={fig.elbowX} y2={fig.elbowY}
				stroke={c} stroke-width={sw + 0.5} stroke-linecap="round"
			/>
			<line
				x1={fig.elbowX} y1={fig.elbowY}
				x2={fig.wristX} y2={fig.wristY}
				stroke={c} stroke-width={sw + 0.5} stroke-linecap="round"
			/>

			<!-- Kopf -->
			<circle cx={fig.headX} cy={fig.headY} r={L_HEAD_R}
				stroke={COLOR_JOINT} stroke-width={sw * 0.9} fill="none"
			/>

			<!-- Gelenk-Marker: Schulter -->
			<circle cx={fig.shoulderX} cy={fig.shoulderY} r="5"
				fill={fig.dof.shoulder ? COLOR_ACTIVE : COLOR_FROZEN}
				opacity="0.85"
			/>
			<!-- Gelenk-Marker: Ellbogen -->
			<circle cx={fig.elbowX} cy={fig.elbowY} r="4.5"
				fill={fig.dof.elbow ? COLOR_ACTIVE : COLOR_FROZEN}
				opacity="0.85"
			/>
			<!-- Gelenk-Marker: Handgelenk -->
			<circle cx={fig.wristX} cy={fig.wristY} r="4"
				fill={fig.dof.wrist ? COLOR_ACTIVE : COLOR_FROZEN}
				opacity="0.85"
			/>
			<!-- Gelenk-Marker: Hüfte -->
			<circle cx={fig.hipX} cy={fig.hipY} r="5"
				fill={fig.dof.hip ? COLOR_ACTIVE : COLOR_FROZEN}
				opacity="0.75"
			/>
			<!-- Gelenk-Marker: Knie links -->
			<circle cx={fig.lKneeX} cy={fig.lKneeY} r="3.5"
				fill={fig.dof.knee ? COLOR_ACTIVE : COLOR_FROZEN}
				opacity="0.65"
			/>
		{/each}

		<!-- Legende -->
		<g transform="translate(16, 285)">
			<circle cx="6" cy="6" r="5" fill={COLOR_FROZEN} />
			<text x="14" y="10" font-size="9" font-family="sans-serif" fill="#64748b">{$_('bernstein_dof_label_frozen')}</text>
			<circle cx="76" cy="6" r="5" fill={COLOR_ACTIVE} />
			<text x="84" y="10" font-size="9" font-family="sans-serif" fill="#64748b">{$_('bernstein_dof_label_active')}</text>
		</g>
	</svg>

	<!-- Stage-Labels und DoF-Übersicht -->
	<div class="dof-stage-row">
		{#each [0, 1, 2] as stageIndex}
			{@const isEn = $locale === 'en'}
			{@const label = isEn ? STAGE_LABELS_EN[stageIndex] : STAGE_LABELS_DE[stageIndex]}
			{@const summary = isEn ? DOF_SUMMARY_EN[stageIndex] : DOF_SUMMARY[stageIndex]}
			<div class="dof-stage-card" style="--stage-color: {STAGE_COLORS[stageIndex]}">
				<div class="dof-stage-title">{label}</div>
				<div class="dof-chips">
					{#each summary.frozen as joint}
						<span class="dof-chip frozen">{joint}</span>
					{/each}
					{#each summary.active as joint}
						<span class="dof-chip active">{joint}</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<p class="dof-caption">{$_('bernstein_dof_caption')}</p>
</div>

<style>
	.dof-wrapper {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin: 2rem 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04);
	}

	.dof-svg {
		width: 100%;
		display: block;
		max-height: 300px;
	}

	.dof-stage-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.dof-stage-card {
		border: 1px solid var(--stage-color, #e2e8f0);
		border-radius: 0.5rem;
		padding: 0.6rem 0.75rem;
		background: color-mix(in srgb, var(--stage-color, #e2e8f0) 6%, white);
	}

	.dof-stage-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--stage-color, #334155);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.4rem;
	}

	.dof-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.dof-chip {
		font-size: 0.68rem;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
		font-weight: 500;
	}

	.dof-chip.frozen {
		background: #fee2e2;
		color: #dc2626;
	}

	.dof-chip.active {
		background: #dcfce7;
		color: #16a34a;
	}

	.dof-caption {
		font-size: 0.78rem;
		color: #94a3b8;
		text-align: center;
		margin: 0.6rem 0 0;
	}

	@media (max-width: 480px) {
		.dof-stage-row {
			grid-template-columns: 1fr;
		}
	}
</style>
