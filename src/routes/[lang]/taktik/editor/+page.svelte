<script>
	/**
	 * Taktikboard-Editor
	 *
	 * Features:
	 * - Visueller Editor (Drag & Drop, Klick-Platzierung)
	 * - Entwürfe im localStorage gespeichert (mehrere, persistent)
	 * - Fork: bestehende Übung als Basis für neuen Entwurf
	 * - Autosave: jede Änderung wird automatisch im aktiven Entwurf gespeichert
	 * - Als Datei speichern (Download .taktik.json für Repo-Update)
	 * - JSON Import (bestehende Datei laden)
	 * - URL-Parameter: ?draft=<id> (Entwurf laden), ?fork=<sourceId>&title=<titel>
	 */
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import TaktikBoard from '$lib/components/uebungen/taktik/TaktikBoard.svelte';
	import TaktikAnimation from '$lib/components/uebungen/taktik/TaktikAnimation.svelte';
	import {
		generateArrows,
		PLAYER_MOVE_STYLES,
		BALL_MOVE_STYLES,
	} from '$lib/utils/taktikEngine.js';
	import {
		saveDraft,
		loadDraft,
		loadAllDrafts,
		deleteDraft,
		formatDraftDate,
	} from '$lib/utils/taktikDrafts.js';

	// ---------------------------------------------------------------------------
	// URL-Parameter
	// ---------------------------------------------------------------------------

	const urlParams = $derived(new URLSearchParams($page.url.search));
	const draftIdParam = $derived(urlParams.get('draft'));
	const forkSourceId = $derived(urlParams.get('fork'));
	const forkSourceTitel = $derived(urlParams.get('title') ?? '');

	// ---------------------------------------------------------------------------
	// Editor-Zustand
	// ---------------------------------------------------------------------------

	/** @type {'volleyball-half' | 'volleyball-full'} */
	let courtType = $state('volleyball-half');

	let activeStepIndex = $state(0);

	/** @type {'select' | 'player-home' | 'player-away' | 'ball'} */
	let activeTool = $state('select');

	let nextPlayerLabel = $state('A');
	let showPreview = $state(false);
	let showDraftPanel = $state(false);
	let importError = $state('');
	let saveStatus = $state(/** @type {'idle'|'saved'|'error'} */('idle'));

	// Entwurf-Metadaten
	let currentDraftId = $state(/** @type {string|null} */(null));
	let currentDraftTitel = $state('Neuer Entwurf');
	let currentSourceId = $state(/** @type {string|null} */(null));
	let currentSourceTitel = $state(/** @type {string|null} */(null));

	// Alle gespeicherten Entwürfe (für Panel)
	let allDrafts = $state(/** @type {import('$lib/utils/taktikDrafts.js').TaktikDraft[]} */([]));

	/**
	 * @type {import('$lib/utils/taktikEngine.js').TaktikAnimation}
	 */
	let animation = $state({
		type: 'taktik',
		court: 'volleyball-half',
		loop: false,
		beschreibung: '',
		objects: {},
		zones: [],
		steps: [{ duration: 0, positions: {} }],
	});

	// Court-Typ mit Animation sync halten
	$effect(() => {
		animation.court = courtType;
	});

	// ---------------------------------------------------------------------------
	// Initialisierung: URL-Parameter auswerten
	// ---------------------------------------------------------------------------

	onMount(() => {
		allDrafts = loadAllDrafts();

		// Bestehenden Entwurf laden
		if (draftIdParam) {
			const draft = loadDraft(draftIdParam);
			if (draft) {
				loadDraftIntoEditor(draft);
				return;
			}
		}

		// Fork einer bestehenden Übung
		if (forkSourceId) {
			currentSourceId = forkSourceId;
			currentSourceTitel = forkSourceTitel || forkSourceId;
			currentDraftTitel = `${currentSourceTitel} (Entwurf)`;
			// Die Animationsdaten kommen via postMessage von der Detailseite ODER
			// via sessionStorage (robustere Methode für statische Sites)
			const sessionData = sessionStorage.getItem('taktik-fork-data');
			if (sessionData) {
				try {
					const data = JSON.parse(sessionData);
					if (data.animation) {
						animation = data.animation;
						courtType = data.animation.court ?? 'volleyball-half';
					}
					sessionStorage.removeItem('taktik-fork-data');
				} catch {
					// ignore
				}
			}
			return;
		}
	});

	// ---------------------------------------------------------------------------
	// Autosave: jede Animation-Änderung speichert in localStorage
	// ---------------------------------------------------------------------------

	let autosaveTimer = /** @type {ReturnType<typeof setTimeout>|null} */(null);

	$effect(() => {
		// Trigger bei jeder Änderung von animation (deep tracking via JSON)
		const _ = JSON.stringify(animation);
		const titel = currentDraftTitel;

		if (autosaveTimer) clearTimeout(autosaveTimer);
		autosaveTimer = setTimeout(() => {
			autosave();
		}, 800); // 800ms Debounce
	});

	function autosave() {
		try {
			const draft = saveDraft(animation, {
				id: currentDraftId ?? undefined,
				titel: currentDraftTitel,
				sourceId: currentSourceId,
				sourceTitel: currentSourceTitel,
			});
			currentDraftId = draft.id;
			allDrafts = loadAllDrafts();
			saveStatus = 'saved';
			setTimeout(() => { saveStatus = 'idle'; }, 2000);
		} catch {
			saveStatus = 'error';
		}
	}

	// ---------------------------------------------------------------------------
	// Entwurf-Verwaltung
	// ---------------------------------------------------------------------------

	function loadDraftIntoEditor(/** @type {import('$lib/utils/taktikDrafts.js').TaktikDraft} */ draft) {
		animation = JSON.parse(JSON.stringify(draft.animation));
		courtType = draft.animation.court ?? 'volleyball-half';
		currentDraftId = draft.id;
		currentDraftTitel = draft.titel;
		currentSourceId = draft.sourceId;
		currentSourceTitel = draft.sourceTitel;
		activeStepIndex = 0;
		showDraftPanel = false;
	}

	function newDraft() {
		currentDraftId = null;
		currentDraftTitel = 'Neuer Entwurf';
		currentSourceId = null;
		currentSourceTitel = null;
		courtType = 'volleyball-half';
		animation = {
			type: 'taktik',
			court: 'volleyball-half',
			loop: false,
			beschreibung: '',
			objects: {},
			zones: [],
			steps: [{ duration: 0, positions: {} }],
		};
		nextPlayerLabel = 'A';
		activeStepIndex = 0;
		showDraftPanel = false;
	}

	function removeDraft(/** @type {string} */ id) {
		deleteDraft(id);
		allDrafts = loadAllDrafts();
		if (currentDraftId === id) {
			// Ersten verbleibenden laden oder neu starten
			if (allDrafts.length > 0) {
				loadDraftIntoEditor(allDrafts[0]);
			} else {
				newDraft();
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Datei-Export (Download als .taktik.json)
	// ---------------------------------------------------------------------------

	function saveAsFile() {
		// Dateiname: aus Titel ableiten (slug)
		const slug = currentDraftTitel
			.toLowerCase()
			.replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] ?? c))
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		const filename = `${slug || 'taktik'}.taktik.json`;

		const json = JSON.stringify(animation, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ---------------------------------------------------------------------------
	// JSON Import
	// ---------------------------------------------------------------------------

	function handleImport(/** @type {Event} */ e) {
		const input = /** @type {HTMLInputElement} */ (e.target);
		const file = input.files?.[0];
		if (!file) return;
		importError = '';

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const data = JSON.parse(/** @type {string} */ (ev.target?.result));
				if (data.type !== 'taktik') {
					importError = 'Ungültiges Format: type muss "taktik" sein.';
					return;
				}
				// Als neuen Entwurf laden (kein currentDraftId überschreiben)
				currentDraftId = null;
				const baseName = file.name.replace(/\.taktik\.json$/, '').replace(/\.json$/, '');
				currentDraftTitel = baseName || 'Importierter Entwurf';
				currentSourceId = null;
				currentSourceTitel = null;
				animation = data;
				courtType = data.court ?? 'volleyball-half';
				activeStepIndex = 0;
			} catch {
				importError = 'JSON konnte nicht gelesen werden.';
			}
		};
		reader.readAsText(file);
	}

	// ---------------------------------------------------------------------------
	// SVG-Feld-Interaktion
	// ---------------------------------------------------------------------------

	const FIELD_W = 540;
	const FIELD_H_HALF = 540;
	const FIELD_H_FULL = 1080;
	const padding = 12;

	const fieldHeight = $derived(courtType === 'volleyball-half' ? FIELD_H_HALF : FIELD_H_FULL);
	const activeStep = $derived(animation.steps[activeStepIndex] ?? animation.steps[0]);
	const activePositions = $derived(activeStep?.positions ?? {});
	const previewArrows = $derived(generateArrows(animation, animation.objects, activeStepIndex));

	/** @type {SVGSVGElement} */
	let svgEl;
	let draggingId = $state('');
	let didDrag = $state(false);

	function clientToNorm(/** @type {number} */ clientX, /** @type {number} */ clientY) {
		if (!svgEl) return { x: 0.5, y: 0.5 };
		const rect = svgEl.getBoundingClientRect();
		const x = ((clientX - rect.left) / rect.width * (FIELD_W + padding * 2) - padding) / FIELD_W;
		const y = ((clientY - rect.top) / rect.height * (fieldHeight + padding * 2) - padding) / fieldHeight;
		return {
			x: Math.max(0, Math.min(1, x)),
			y: Math.max(0, Math.min(1, y)),
		};
	}

	function handleSvgClick(/** @type {MouseEvent} */ e) {
		if (didDrag) { didDrag = false; return; }
		const { x, y } = clientToNorm(e.clientX, e.clientY);

		if (activeTool === 'ball') {
			if (!animation.objects['ball']) {
				animation.objects = { ...animation.objects, ball: { type: 'ball' } };
			}
			setPosition('ball', x, y);
		} else if (activeTool === 'player-home' || activeTool === 'player-away') {
			const team = activeTool === 'player-home' ? 'home' : 'away';
			const id = `p_${Date.now()}`;
			animation.objects = { ...animation.objects, [id]: { type: 'player', label: nextPlayerLabel, team } };
			setPosition(id, x, y);
			nextPlayerLabel = String.fromCharCode(nextPlayerLabel.charCodeAt(0) + 1);
			if (nextPlayerLabel > 'Z') nextPlayerLabel = 'A';
		}
	}

	function setPosition(/** @type {string} */ id, /** @type {number} */ x, /** @type {number} */ y) {
		const updatedSteps = animation.steps.map((step, i) => {
			// Neues Objekt: in alle Schritte eintragen; bestehendes: nur aktiven Schritt
			if (i === activeStepIndex || !step.positions[id]) {
				return { ...step, positions: { ...step.positions, [id]: { x, y } } };
			}
			return step;
		});
		// Aktiven Schritt immer updaten (override falls oben schon gesetzt)
		updatedSteps[activeStepIndex] = {
			...updatedSteps[activeStepIndex],
			positions: { ...updatedSteps[activeStepIndex].positions, [id]: { x, y } },
		};
		animation.steps = updatedSteps;
	}

	// Drag & Drop
	function handleMouseDown(/** @type {MouseEvent} */ e, /** @type {string} */ id) {
		if (activeTool !== 'select') return;
		e.preventDefault();
		draggingId = id;
		didDrag = false;
	}

	function handleMouseMove(/** @type {MouseEvent} */ e) {
		if (!draggingId) return;
		didDrag = true;
		const { x, y } = clientToNorm(e.clientX, e.clientY);
		setPosition(draggingId, x, y);
	}

	function handleMouseUp() { draggingId = ''; }

	function handleTouchStart(/** @type {TouchEvent} */ e, /** @type {string} */ id) {
		if (activeTool !== 'select') return;
		e.preventDefault();
		draggingId = id;
		didDrag = false;
	}

	function handleTouchMove(/** @type {TouchEvent} */ e) {
		if (!draggingId) return;
		e.preventDefault();
		didDrag = true;
		const t = e.touches[0];
		const { x, y } = clientToNorm(t.clientX, t.clientY);
		setPosition(draggingId, x, y);
	}

	function handleTouchEnd() { draggingId = ''; }

	// ---------------------------------------------------------------------------
	// Schritte
	// ---------------------------------------------------------------------------

	function addStep() {
		const last = animation.steps[animation.steps.length - 1];
		animation.steps = [...animation.steps, { duration: 1500, positions: { ...last.positions } }];
		activeStepIndex = animation.steps.length - 1;
	}

	function removeStep(/** @type {number} */ i) {
		if (animation.steps.length <= 1) return;
		animation.steps = animation.steps.filter((_, idx) => idx !== i);
		if (activeStepIndex >= animation.steps.length) activeStepIndex = animation.steps.length - 1;
	}

	function updateStepDuration(/** @type {number} */ i, /** @type {string|number} */ v) {
		const steps = [...animation.steps];
		steps[i] = { ...steps[i], duration: Number(v) };
		animation.steps = steps;
	}

	// ---------------------------------------------------------------------------
	// Objekte
	// ---------------------------------------------------------------------------

	function removeObject(/** @type {string} */ id) {
		const { [id]: _, ...rest } = animation.objects;
		animation.objects = rest;
		animation.steps = animation.steps.map((step) => {
			const { [id]: __, ...positions } = step.positions;
			return { ...step, positions };
		});
	}

	function updateObjectLabel(/** @type {string} */ id, /** @type {string} */ label) {
		animation.objects = { ...animation.objects, [id]: { ...animation.objects[id], label } };
	}

	// ---------------------------------------------------------------------------
	// Pfeile
	// ---------------------------------------------------------------------------

	function setArrowType(/** @type {string} */ objectId, /** @type {string} */ moveType) {
		const steps = [...animation.steps];
		const step = { ...steps[activeStepIndex] };
		const arrows = { ...(step.arrows ?? {}) };
		if (moveType) { arrows[objectId] = { moveType }; }
		else { delete arrows[objectId]; }
		step.arrows = arrows;
		steps[activeStepIndex] = step;
		animation.steps = steps;
	}

	const allPlayerMoveTypes = Object.entries(PLAYER_MOVE_STYLES);
	const allBallMoveTypes = Object.entries(BALL_MOVE_STYLES);
</script>

<svelte:head>
	<title>Taktikboard Editor – TV Muttenz Volleyball</title>
</svelte:head>

<div class="editor-page">

	<!-- ===== HEADER ===== -->
	<div class="editor-header">
		<a href="{base}/de/taktik" class="back-link">← Taktik</a>

		<div class="draft-title-area">
			<input
				class="draft-title-input"
				bind:value={currentDraftTitel}
				placeholder="Entwurf-Titel..."
				aria-label="Entwurf-Titel"
			/>
			{#if currentSourceId}
				<span class="fork-badge">Basiert auf: {currentSourceTitel}</span>
			{/if}
			<span class="save-status" class:visible={saveStatus !== 'idle'}>
				<span class="save-msg" class:active={saveStatus === 'saved'}>✓ Gespeichert</span>
				<span class="save-msg" class:active={saveStatus === 'error'}>⚠ Fehler beim Speichern</span>
			</span>
		</div>

		<div class="header-actions">
			<button
				class="btn-secondary"
				onclick={() => showDraftPanel = !showDraftPanel}
				class:active={showDraftPanel}
				title="Entwürfe verwalten"
			>
				Entwürfe ({allDrafts.length})
			</button>
			<button class="btn-secondary" onclick={newDraft} title="Leeren Entwurf starten">
				+ Neu
			</button>
			<label class="btn-secondary" title="JSON-Datei importieren">
				Importieren
				<input type="file" accept=".json" onchange={handleImport} style="display:none" />
			</label>
			<button class="btn-primary" onclick={saveAsFile} title="Als .taktik.json herunterladen">
				Datei speichern
			</button>
			<button
				class="btn-secondary"
				onclick={() => showPreview = !showPreview}
				class:active={showPreview}
			>
				{showPreview ? 'Editor' : 'Vorschau'}
			</button>
		</div>
	</div>

	{#if importError}
		<div class="error-banner">{importError} <button onclick={() => importError = ''}>✕</button></div>
	{/if}

	<!-- ===== ENTWURF-PANEL ===== -->
	{#if showDraftPanel}
		<div class="draft-panel">
			<div class="draft-panel-header">
				<h2>Gespeicherte Entwürfe</h2>
				<button class="btn-icon" onclick={() => showDraftPanel = false} aria-label="Schliessen">✕</button>
			</div>

			{#if allDrafts.length === 0}
				<p class="draft-empty">Noch keine Entwürfe gespeichert. Beginne mit dem Bearbeiten – Entwürfe werden automatisch gespeichert.</p>
			{:else}
				<div class="draft-list">
					{#each allDrafts as draft (draft.id)}
						<div class="draft-item" class:current={draft.id === currentDraftId}>
							<div class="draft-item-info">
								<span class="draft-item-titel">{draft.titel}</span>
								{#if draft.sourceTitel}
									<span class="draft-item-source">Basiert auf: {draft.sourceTitel}</span>
								{/if}
								<span class="draft-item-date">
									{formatDraftDate(draft.updatedAt)}
									· {draft.animation.court === 'volleyball-half' ? 'Halbfeld' : 'Ganzfeld'}
									· {draft.animation.steps?.length ?? 0} Schritte
								</span>
							</div>
							<div class="draft-item-actions">
								{#if draft.id === currentDraftId}
									<span class="badge-current">Aktiv</span>
								{:else}
									<button class="btn-load" onclick={() => loadDraftIntoEditor(draft)}>Laden</button>
								{/if}
								<button
									class="btn-icon btn-danger"
									onclick={() => removeDraft(draft.id)}
									title="Entwurf löschen"
									aria-label="Entwurf löschen"
								>✕</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if showPreview}
		<!-- ===== VORSCHAU ===== -->
		<div class="preview-mode">
			<TaktikAnimation {animation} autoplay={false} maxWidth={600} />
		</div>
	{:else}
		<!-- ===== EDITOR ===== -->
		<div class="editor-layout">

			<!-- SIDEBAR -->
			<aside class="editor-sidebar">

				<!-- Feld -->
				<div class="sidebar-section">
					<h3>Feld</h3>
					<div class="btn-group">
						<button class="btn-option" class:active={courtType === 'volleyball-half'} onclick={() => courtType = 'volleyball-half'}>Halbfeld</button>
						<button class="btn-option" class:active={courtType === 'volleyball-full'} onclick={() => courtType = 'volleyball-full'}>Ganzfeld</button>
					</div>
				</div>

				<!-- Werkzeuge -->
				<div class="sidebar-section">
					<h3>Werkzeug</h3>
					<div class="tools-grid">
						<button class="tool-btn" class:active={activeTool === 'select'} onclick={() => activeTool = 'select'} title="Auswählen / Verschieben">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-7 1-3 7L5 3z"/></svg>
							Auswählen
						</button>
						<button class="tool-btn" class:active={activeTool === 'player-home'} onclick={() => activeTool = 'player-home'} title="Heim-Spieler">
							<span class="player-dot home">{nextPlayerLabel}</span>
							Heim
						</button>
						<button class="tool-btn" class:active={activeTool === 'player-away'} onclick={() => activeTool = 'player-away'} title="Gäste-Spieler">
							<span class="player-dot away">{nextPlayerLabel}</span>
							Gäste
						</button>
						<button class="tool-btn" class:active={activeTool === 'ball'} onclick={() => activeTool = 'ball'} title="Ball">
							<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="#f0f0f0" stroke="#555" stroke-width="1.5"/></svg>
							Ball
						</button>
					</div>
				</div>

				<!-- Beschreibung -->
				<div class="sidebar-section">
					<h3>Beschreibung</h3>
					<textarea bind:value={animation.beschreibung} placeholder="Kurze Beschreibung..." rows="2" class="textarea"></textarea>
				</div>

				<!-- Objekte -->
				<div class="sidebar-section">
					<h3>Objekte</h3>
					{#if Object.keys(animation.objects).length === 0}
						<p class="hint">Klicke auf das Feld um Spieler oder den Ball zu platzieren.</p>
					{:else}
						<div class="objects-list">
							{#each Object.entries(animation.objects) as [id, obj] (id)}
								<div class="object-row">
									<span
										class="object-dot"
										style="background: {obj.type === 'ball' ? '#555' : obj.team === 'away' ? '#C62828' : '#1565C0'}"
									>{obj.type === 'ball' ? '●' : (obj.label ?? '?')}</span>

									{#if obj.type === 'player'}
										<input
											class="label-input"
											value={obj.label ?? id}
											maxlength="3"
											aria-label="Spieler-Label"
											onchange={(e) => updateObjectLabel(id, e.currentTarget.value)}
										/>
									{:else}
										<span class="object-name">Ball</span>
									{/if}

									<!-- Pfeil-Typ für aktuellen Schritt (nicht letzter Schritt) -->
									{#if activeStepIndex < animation.steps.length - 1}
										<select
											class="arrow-select"
											value={activeStep.arrows?.[id]?.moveType ?? ''}
											onchange={(e) => setArrowType(id, e.currentTarget.value)}
											title="Bewegungstyp ab diesem Schritt"
										>
											<option value="">Standard</option>
											{#if obj.type === 'ball'}
												{#each allBallMoveTypes as [key, style]}
													<option value={key}>{style.label}</option>
												{/each}
											{:else}
												{#each allPlayerMoveTypes as [key, style]}
													<option value={key}>{style.label}</option>
												{/each}
											{/if}
										</select>
									{/if}

									<button class="btn-icon btn-danger-sm" onclick={() => removeObject(id)} title="Entfernen">✕</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Schritte -->
				<div class="sidebar-section">
					<h3>Schritte</h3>
					<div class="steps-list">
						{#each animation.steps as step, i}
							<div class="step-row" class:active={i === activeStepIndex}>
								<button class="step-btn" onclick={() => activeStepIndex = i}>
									{i + 1}
								</button>
								<input
									type="number" min="0" max="10000" step="100"
									value={step.duration}
									class="duration-input"
									title="Dauer in ms bis zum nächsten Schritt"
									onchange={(e) => updateStepDuration(i, e.currentTarget.value)}
								/>
								<span class="ms-label">ms</span>
								{#if animation.steps.length > 1}
									<button class="btn-icon btn-danger-sm" onclick={() => removeStep(i)} title="Schritt löschen">✕</button>
								{/if}
							</div>
						{/each}
						<button class="btn-add-step" onclick={addStep}>+ Schritt</button>
					</div>
				</div>

				<!-- Loop -->
				<div class="sidebar-section sidebar-inline">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={animation.loop} />
						Animation wiederholen
					</label>
				</div>

			</aside>

			<!-- BOARD -->
			<div class="board-area">
				<div class="board-hint">
					{#if activeTool === 'select'}
						Spieler/Ball ziehen um zu verschieben (Schritt {activeStepIndex + 1})
					{:else if activeTool === 'ball'}
						Klicken um den Ball zu platzieren
					{:else}
						Klicken um Spieler zu platzieren · nächstes Label: <strong>{nextPlayerLabel}</strong>
					{/if}
				</div>

				<div
					class="board-container"
					role="application"
					aria-label="Taktikboard Editor"
					onmousemove={handleMouseMove}
					onmouseup={handleMouseUp}
					onmouseleave={handleMouseUp}
					ontouchmove={handleTouchMove}
					ontouchend={handleTouchEnd}
				>
					<svg
						bind:this={svgEl}
						viewBox="{-padding} {-padding} {FIELD_W + padding * 2} {fieldHeight + padding * 2}"
						style="width: 100%; aspect-ratio: {FIELD_W}/{fieldHeight}; display: block;"
						onclick={handleSvgClick}
						style:cursor={activeTool === 'select' ? 'default' : 'crosshair'}
					>
						<!-- Feld -->
						{#if courtType === 'volleyball-half'}
							{#await import('$lib/components/uebungen/taktik/CourtHalf.svelte') then { default: CourtHalf }}
								<CourtHalf showLabels={false} />
							{/await}
						{:else}
							{#await import('$lib/components/uebungen/taktik/CourtFull.svelte') then { default: CourtFull }}
								<CourtFull showLabels={false} />
							{/await}
						{/if}

						<!-- Pfeile -->
						{#each previewArrows as arrow (arrow.objectId + '-' + arrow.stepIndex)}
							{#await import('$lib/components/uebungen/taktik/TaktikArrow.svelte') then { default: TaktikArrow }}
								<TaktikArrow
									x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2}
									moveType={arrow.moveType} objectType={arrow.objectType}
									fieldWidth={FIELD_W} fieldHeight={fieldHeight}
								/>
							{/await}
						{/each}

						<!-- Objekte -->
						{#each Object.entries(animation.objects) as [id, obj] (id)}
							{@const pos = activePositions[id]}
							{#if pos}
								<g
									role="button" tabindex="0"
									aria-label="{obj.type === 'ball' ? 'Ball' : 'Spieler ' + (obj.label ?? id)} verschieben"
									style:cursor={activeTool === 'select' ? 'grab' : 'default'}
									onmousedown={(e) => handleMouseDown(e, id)}
									ontouchstart={(e) => handleTouchStart(e, id)}
								>
									{#if obj.type === 'player'}
										{#await import('$lib/components/uebungen/taktik/TaktikPlayer.svelte') then { default: TaktikPlayer }}
											<TaktikPlayer
												x={pos.x} y={pos.y}
												label={obj.label ?? id}
												team={obj.team ?? 'home'}
												fieldWidth={FIELD_W} fieldHeight={fieldHeight}
												highlighted={draggingId === id}
											/>
										{/await}
									{:else if obj.type === 'ball'}
										{#await import('$lib/components/uebungen/taktik/TaktikBall.svelte') then { default: TaktikBall }}
											<TaktikBall x={pos.x} y={pos.y} fieldWidth={FIELD_W} fieldHeight={fieldHeight} />
										{/await}
									{/if}
								</g>
							{/if}
						{/each}
					</svg>
				</div>

				<!-- JSON-Vorschau -->
				<details class="json-preview">
					<summary>JSON-Vorschau (zum Kopieren)</summary>
					<pre>{JSON.stringify(animation, null, 2)}</pre>
				</details>
			</div>

		</div>
	{/if}
</div>

<style>
	.editor-page {
		height: calc(100vh - var(--header-height) - var(--footer-height));
		min-height: 400px;
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		max-width: var(--content-width-wide);
		margin-inline: auto;
		overflow: hidden;
	}

	/* ---- Header ---- */
	.editor-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.back-link {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		text-decoration: none;
		white-space: nowrap;
	}
	.back-link:hover { color: var(--color-primary); }

	.draft-title-area {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
		min-width: 200px;
	}

	.draft-title-input {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		padding: 2px 4px;
		min-width: 180px;
		transition: border-color var(--transition-fast);
	}
	.draft-title-input:focus {
		outline: none;
		border-bottom-color: var(--color-primary);
	}

	.fork-badge {
		font-size: var(--font-size-xs);
		padding: 2px var(--space-xs);
		background: #E3F2FD;
		color: #1565C0;
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.save-status {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		opacity: 0;
		transition: opacity var(--transition-fast);
		/* Reserve fixed space to prevent layout reflow when text appears */
		display: inline-block;
		width: 12ch;
		height: 1.2em;
		position: relative;
		vertical-align: middle;
	}
	.save-status.visible { opacity: 1; }
	.save-msg {
		position: absolute;
		left: 0;
		top: 0;
		white-space: nowrap;
		visibility: hidden;
	}
	.save-msg.active {
		visibility: visible;
	}

	.header-actions {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.btn-primary, .btn-secondary {
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}
	.btn-primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}
	.btn-primary:hover { background: var(--color-primary-hover); }
	.btn-secondary:hover, .btn-secondary.active { background: var(--color-gray-100); }

	.btn-icon {
		width: 24px; height: 24px;
		border-radius: 50%;
		border: 1px solid var(--color-gray-300);
		background: none;
		cursor: pointer;
		font-size: 12px;
		display: flex; align-items: center; justify-content: center;
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}
	.btn-icon:hover { background: var(--color-gray-100); }
	.btn-danger:hover { background: #FFEBEE; color: #C62828; border-color: #C62828; }
	.btn-danger-sm {
		width: 18px; height: 18px; font-size: 10px;
	}
	.btn-danger-sm:hover { background: #FFEBEE; color: #C62828; border-color: #C62828; }

	.error-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #FFEBEE;
		color: #C62828;
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
	}
	.error-banner button {
		background: none; border: none; cursor: pointer; color: #C62828;
	}

	/* ---- Entwurf-Panel ---- */
	.draft-panel {
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
		box-shadow: var(--shadow-lg);
	}

	.draft-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.draft-panel-header h2 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		margin: 0;
	}

	.draft-empty {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.draft-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-height: 320px;
		overflow-y: auto;
	}

	.draft-item {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
		background: var(--color-background);
		transition: border-color var(--transition-fast);
	}
	.draft-item:hover { border-color: var(--color-gray-400); }
	.draft-item.current {
		border-color: var(--color-primary);
		background: #FFF8F7;
	}

	.draft-item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.draft-item-titel {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.draft-item-source {
		font-size: var(--font-size-xs);
		color: #1565C0;
	}

	.draft-item-date {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.draft-item-actions {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	.btn-load {
		padding: 2px var(--space-sm);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		background: none;
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.btn-load:hover { background: var(--color-gray-100); }

	.badge-current {
		font-size: var(--font-size-xs);
		padding: 2px var(--space-xs);
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-sm);
	}

	/* ---- Editor-Layout ---- */
	.editor-layout {
		display: grid;
		grid-template-columns: 270px 1fr;
		gap: var(--space-lg);
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	.editor-sidebar {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		overflow-y: auto;
		min-height: 0;
	}

	.sidebar-section {
		background: var(--color-background-elevated);
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
	}

	.sidebar-inline {
		display: flex;
		align-items: center;
	}

	.sidebar-section h3 {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 var(--space-xs);
	}

	.hint {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		margin: 0;
	}

	.btn-group {
		display: flex;
		gap: 4px;
	}

	.btn-option {
		flex: 1;
		padding: 4px var(--space-sm);
		border-radius: var(--radius-sm);
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.btn-option.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

	.tools-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
	}

	.tool-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		font-size: 11px;
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.tool-btn.active { border-color: var(--color-primary); background: #FFF3F0; color: var(--color-primary); }

	.player-dot {
		display: inline-flex; align-items: center; justify-content: center;
		width: 20px; height: 20px;
		border-radius: 50%;
		font-size: 11px; font-weight: bold; color: white;
	}
	.player-dot.home { background: #1565C0; }
	.player-dot.away { background: #C62828; }

	.textarea {
		width: 100%;
		padding: 4px var(--space-xs);
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		resize: vertical;
		font-family: var(--font-family-base);
		box-sizing: border-box;
	}

	/* Objekte */
	.objects-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.object-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.object-dot {
		display: inline-flex; align-items: center; justify-content: center;
		width: 20px; height: 20px;
		border-radius: 50%;
		font-size: 10px; font-weight: bold; color: white;
		flex-shrink: 0;
	}

	.label-input {
		width: 36px;
		padding: 1px 3px;
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		text-align: center;
	}

	.object-name {
		flex: 1;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.arrow-select {
		flex: 1;
		font-size: 10px;
		padding: 1px 2px;
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		min-width: 0;
	}

	/* Schritte */
	.steps-list {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.step-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.step-btn {
		width: 24px; height: 24px;
		border-radius: var(--radius-sm);
		border: 1.5px solid var(--color-gray-300);
		background: var(--color-background);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-bold);
		cursor: pointer;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}
	.step-row.active .step-btn {
		background: var(--color-primary); color: white; border-color: var(--color-primary);
	}

	.duration-input {
		width: 58px;
		padding: 2px 4px;
		border: 1px solid var(--color-gray-300);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		text-align: right;
	}

	.ms-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.btn-add-step {
		width: 100%;
		padding: 4px;
		border-radius: var(--radius-sm);
		border: 1.5px dashed var(--color-gray-400);
		background: none;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
		margin-top: 2px;
	}
	.btn-add-step:hover { border-color: var(--color-primary); color: var(--color-primary); }

	.checkbox-label {
		display: flex; align-items: center; gap: var(--space-sm);
		font-size: var(--font-size-sm); cursor: pointer;
	}

	/* Board */
	.board-area {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		min-width: 0;
	}

	.board-hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		background: var(--color-gray-50);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-gray-200);
	}

	.board-container {
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-md);
		user-select: none;
		-webkit-user-select: none;
	}

	/* JSON */
	.json-preview {
		border: 1px solid var(--color-gray-200);
		border-radius: var(--radius-md);
	}
	.json-preview summary {
		padding: var(--space-xs) var(--space-md);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.json-preview pre {
		font-family: var(--font-family-mono);
		font-size: 10px;
		padding: var(--space-md);
		overflow: auto;
		max-height: 260px;
		margin: 0;
		background: var(--color-gray-50);
		border-top: 1px solid var(--color-gray-200);
	}

	/* Vorschau */
	.preview-mode {
		max-width: 600px;
		margin-inline: auto;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.editor-page {
			height: auto;
			min-height: unset;
			overflow: visible;
		}
		.editor-layout {
			grid-template-columns: 1fr;
			overflow-y: visible;
		}
		.editor-sidebar {
			overflow-y: visible;
		}
	}
</style>
