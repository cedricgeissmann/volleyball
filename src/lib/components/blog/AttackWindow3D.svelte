<script>
	// @ts-nocheck
	/**
	 * Angriffsfenster 3D — wo liegen die Fenster und wie fliegt der Ball hindurch?
	 *
	 * Koordinatensystem (Three.js):
	 *   X = Feldbreite (−4.5 … +4.5), Y = Höhe, Z = Tiefe
	 *   Netz liegt bei Z = 0, unser Feld bei Z > 0, Gegner bei Z < 0.
	 *
	 * Ein Angriffsfenster ist das Raumvolumen, in dem der Angreifer den Ball
	 * schlagen kann: seitlich begrenzt durch die Reichweite, in der Höhe durch
	 * Sprung und Armzug, in der Tiefe durch den Abstand zum Netz.
	 *
	 * Verwendung im Blog:
	 *   <AttackWindow3D />
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// ─── Konstanten ──────────────────────────────────────────────────────────────
	const G        = 9.81;
	const FIELD_W  = 9.0;
	const FIELD_D  = 9.0;
	const BALL_R   = 0.105;
	const NET_H    = 2.43;

	// Zuspielposition (Kontaktpunkt der Hände)
	const SETTER = { x: 1.4, y: 2.3, z: 0.55 };

	// Schlagfenster-Höhe: knapp unter der Netzkante bis zur halben Antenne.
	const Y_LOW  = NET_H - 0.10;   // 2.33
	const Y_HIGH = NET_H + 0.40;   // 2.83 = Mitte des Antennenteils über dem Netz

	// Hohe Züge (Zone 4, 2 und Pipe) fliegen gleich hoch: gleiche Flugzeit bei
	// gleicher Zielhöhe ⇒ gleicher Scheitelpunkt ⇒ gleiches Timing für den Anlauf.
	const SET_T = 1.05;

	/**
	 * Die Fenster. cx/cz = Mittelpunkt, w = Breite (Reichweite seitlich),
	 * y0/y1 = Höhenbereich, t = Flugzeit vom Zuspiel bis Fenstermitte.
	 */
	const WINDOWS = [
		// Quick: enges Fenster, Scheitelpunkt genau in der Fenstermitte – der Ball
		// bleibt während der ganzen Durchquerung drin (Auf- und Abstieg schlagbar).
		{ id: 'quick',  name: 'Quick (Zone 3)',   cx:  1.0, cz: 0.55, w: 0.5, y0: 2.62, y1: 3.18, t: 0.35, color: 0xf59e0b },
		{ id: 'aussen', name: 'Aussen (Zone 4)',  cx: -3.2, cz: 0.70, w: 1.2, y0: Y_LOW, y1: Y_HIGH, t: SET_T, color: 0x2563eb },
		{ id: 'rechts', name: 'Rechts (Zone 2)',  cx:  3.2, cz: 0.70, w: 1.2, y0: Y_LOW, y1: Y_HIGH, t: SET_T, color: 0x7c3aed },
		{ id: 'pipe',   name: 'Pipe (Zone 6)',    cx:  0.0, cz: 2.30, w: 1.4, y0: Y_LOW, y1: Y_HIGH, t: SET_T, color: 0x0d9488 },
	];

	const CAMS = {
		angreifer: { pos: { x: -3.4, y: 2.4, z: 7.2 }, look: { x: -2.0, y: 2.4, z: 0.4 }, label: 'Angreifer' },
		zuspieler: { pos: { x: 2.6, y: 2.3, z: 3.2 }, look: { x: -1.0, y: 2.6, z: 0.3 }, label: 'Zuspieler' },
		iso:       { pos: { x: 7.5, y: 6.5, z: 10.5 }, look: { x: 0.0, y: 1.8, z: 1.5 }, label: 'Übersicht' },
		seite:     { pos: { x: 13.0, y: 3.0, z: 1.0 }, look: { x: 0.0, y: 2.6, z: 1.0 }, label: 'Seite' },
	};

	// ─── State ───────────────────────────────────────────────────────────────────
	let canvas = $state(null);
	let active = $state('aussen');       // ausgewähltes Fenster
	let camView = $state('iso');
	let showAll = $state(true);          // alle Fenster oder nur das aktive
	let playing = $state(false);
	let t = $state(0);                   // Simulationszeit in s
	let inWindow = $state(false);        // Ball gerade im Fenster?

	let THREE = null;
	let renderer, scene, camera;
	let ball, trail;
	let winMeshes = [];
	let shadowMeshes = [];
	let raf = 0;
	let lastTs = 0;
	let camTarget = CAMS.iso;

	// ─── Orbit (Maussteuerung) ───────────────────────────────────────────────────
	// Kameraposition wird als Kugelkoordinate um den Blickpunkt geführt.
	const orbit  = { theta: 0, phi: 1.0, r: 14, tx: 0, ty: 1.8, tz: 1.5 };
	const target = { theta: 0, phi: 1.0, r: 14, tx: 0, ty: 1.8, tz: 1.5 };
	let dragging = false;
	let lastPointer = { x: 0, y: 0 };

	/** Preset → Kugelkoordinaten umrechnen. */
	function applyCam(cam) {
		const dx = cam.pos.x - cam.look.x;
		const dy = cam.pos.y - cam.look.y;
		const dz = cam.pos.z - cam.look.z;
		const r = Math.hypot(dx, dy, dz);
		target.r = r;
		target.theta = Math.atan2(dx, dz);
		target.phi = Math.acos(Math.max(-1, Math.min(1, dy / r)));
		target.tx = cam.look.x;
		target.ty = cam.look.y;
		target.tz = cam.look.z;
	}

	function onPointerDown(e) {
		dragging = true;
		lastPointer = { x: e.clientX, y: e.clientY };
		canvas.setPointerCapture?.(e.pointerId);
	}
	function onPointerMove(e) {
		if (!dragging) return;
		const dx = e.clientX - lastPointer.x;
		const dy = e.clientY - lastPointer.y;
		lastPointer = { x: e.clientX, y: e.clientY };
		target.theta -= dx * 0.006;
		target.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.02, target.phi - dy * 0.005));
		// Orbit sofort mitziehen, damit das Drehen direkt wirkt
		orbit.theta = target.theta;
		orbit.phi = target.phi;
	}
	function onPointerUp(e) {
		dragging = false;
		canvas.releasePointerCapture?.(e.pointerId);
	}
	function onWheel(e) {
		e.preventDefault();
		target.r = Math.max(4, Math.min(34, target.r * (1 + Math.sign(e.deltaY) * 0.1)));
	}

	let current = $derived(WINDOWS.find((w) => w.id === active) ?? WINDOWS[1]);

	// ─── Flugbahn ────────────────────────────────────────────────────────────────
	/** Startgeschwindigkeit, damit der Ball nach w.t die Fenstermitte trifft. */
	function velocityFor(w) {
		const ty = (w.y0 + w.y1) / 2;
		return {
			x: (w.cx - SETTER.x) / w.t,
			y: (ty - SETTER.y) / w.t + 0.5 * G * w.t,
			z: (w.cz - SETTER.z) / w.t,
		};
	}

	function posAt(w, time) {
		const v = velocityFor(w);
		return {
			x: SETTER.x + v.x * time,
			y: SETTER.y + v.y * time - 0.5 * G * time * time,
			z: SETTER.z + v.z * time,
		};
	}

	/** Zeitspanne, in der der Ball im Fenster ist (grob, durch Abtastung). */
	function windowDuration(w) {
		let first = null, last = null;
		for (let s = 0; s <= 4.0; s += 0.005) {
			const p = posAt(w, s);
			if (isInside(w, p)) {
				if (first === null) first = s;
				last = s;
			}
		}
		return first === null ? 0 : last - first;
	}

	function isInside(w, p) {
		return (
			Math.abs(p.x - w.cx) <= w.w / 2 &&
			p.y >= w.y0 && p.y <= w.y1 &&
			Math.abs(p.z - w.cz) <= 0.45
		);
	}

	/** Zeit bis der Ball den Boden berührt (Ende der gezeichneten Kurve). */
	function groundTime(w) {
		const v = velocityFor(w);
		return (v.y + Math.sqrt(v.y * v.y + 2 * G * (SETTER.y - BALL_R))) / G;
	}

	let duration = $derived(windowDuration(current));
	let flightTime = $derived(current.t);
	let tEnd = $derived(groundTime(current));

	// ─── Szene ───────────────────────────────────────────────────────────────────
	function buildScene() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xe8f0fe);

		scene.add(new THREE.AmbientLight(0xffffff, 0.75));
		const dir = new THREE.DirectionalLight(0xffffff, 0.6);
		dir.position.set(6, 10, 6);
		scene.add(dir);

		// Boden / Feld
		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(FIELD_W + 6, FIELD_D * 2 + 6),
			new THREE.MeshLambertMaterial({ color: 0xcbd5e1 })
		);
		floor.rotation.x = -Math.PI / 2;
		scene.add(floor);

		const court = new THREE.Mesh(
			new THREE.PlaneGeometry(FIELD_W, FIELD_D * 2),
			new THREE.MeshLambertMaterial({ color: 0xf59e5a })
		);
		court.rotation.x = -Math.PI / 2;
		court.position.y = 0.01;
		scene.add(court);

		// Linien
		addLine([-FIELD_W / 2, 0.02, 3], [FIELD_W / 2, 0.02, 3], 0xffffff);   // Angriffslinie
		addLine([-FIELD_W / 2, 0.02, -3], [FIELD_W / 2, 0.02, -3], 0xffffff);
		addLine([-FIELD_W / 2, 0.02, FIELD_D], [FIELD_W / 2, 0.02, FIELD_D], 0xffffff);
		addLine([-FIELD_W / 2, 0.02, -FIELD_D], [FIELD_W / 2, 0.02, -FIELD_D], 0xffffff);
		addLine([-FIELD_W / 2, 0.02, -FIELD_D], [-FIELD_W / 2, 0.02, FIELD_D], 0xffffff);
		addLine([FIELD_W / 2, 0.02, -FIELD_D], [FIELD_W / 2, 0.02, FIELD_D], 0xffffff);

		// Netz
		const net = new THREE.Mesh(
			new THREE.PlaneGeometry(FIELD_W, 1.0),
			new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
		);
		net.position.set(0, NET_H - 0.5, 0);
		scene.add(net);
		addLine([-FIELD_W / 2, NET_H, 0], [FIELD_W / 2, NET_H, 0], 0xffffff);

		// Verbindung Netz → Pfosten (Spanngurte / Netzverlängerung)
		for (const sx of [-1, 1]) {
			const xi = sx * (FIELD_W / 2);
			const xo = sx * (FIELD_W / 2 + 1.0);
			const band = new THREE.Mesh(
				new THREE.PlaneGeometry(1.0, 1.0),
				new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
			);
			band.position.set((xi + xo) / 2, NET_H - 0.5, 0);
			scene.add(band);
			addLine([xi, NET_H, 0], [xo, NET_H, 0], 0xffffff);
			addLine([xi, NET_H - 1.0, 0], [xo, NET_H - 1.0, 0], 0xffffff);
			addLine([xo, NET_H - 1.0, 0], [xo, NET_H, 0], 0xffffff);
		}

		// Netzpfosten (1 m ausserhalb der Seitenlinie)
		for (const sx of [-1, 1]) {
			const post = new THREE.Mesh(
				new THREE.CylinderGeometry(0.05, 0.05, NET_H + 0.15, 12),
				new THREE.MeshLambertMaterial({ color: 0x475569 })
			);
			post.position.set(sx * (FIELD_W / 2 + 1.0), (NET_H + 0.15) / 2, 0);
			scene.add(post);
		}

		// Antennen (rot/weiss gestreift, 0.8 m über der Netzkante)
		for (const sx of [-1, 1]) {
			const ANT_H = 1.8;
			const ya = NET_H - 1.0;
			const seg = ANT_H / 9;
			for (let i = 0; i < 9; i++) {
				const piece = new THREE.Mesh(
					new THREE.CylinderGeometry(0.022, 0.022, seg, 8),
					new THREE.MeshLambertMaterial({ color: i % 2 ? 0xffffff : 0xdc2626 })
				);
				piece.position.set(sx * (FIELD_W / 2), ya + seg * (i + 0.5), 0);
				scene.add(piece);
			}
		}

		// Zuspieler als Strichmännchen, direkt unter dem Ballkontaktpunkt
		scene.add(buildSetterFigure());

		// Fenster als Quader + Bodenschatten
		for (const w of WINDOWS) {
			const geo = new THREE.BoxGeometry(w.w, w.y1 - w.y0, 0.9);
			const mat = new THREE.MeshBasicMaterial({
				color: w.color, transparent: true, opacity: 0.18, depthWrite: false,
			});
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.set(w.cx, (w.y0 + w.y1) / 2, w.cz);
			const edges = new THREE.LineSegments(
				new THREE.EdgesGeometry(geo),
				new THREE.LineBasicMaterial({ color: w.color })
			);
			mesh.add(edges);
			mesh.userData.id = w.id;
			scene.add(mesh);
			winMeshes.push(mesh);

			// Senkrechte Projektion der Fensterfläche auf den Boden
			const shGeo = new THREE.PlaneGeometry(w.w, 0.9);
			const shadow = new THREE.Mesh(
				shGeo,
				new THREE.MeshBasicMaterial({
					color: w.color, transparent: true, opacity: 0.3, depthWrite: false,
				})
			);
			shadow.rotation.x = -Math.PI / 2;
			shadow.position.set(w.cx, 0.03, w.cz);
			shadow.add(new THREE.LineSegments(
				new THREE.EdgesGeometry(shGeo),
				new THREE.LineBasicMaterial({ color: w.color })
			));
			shadow.userData.id = w.id;
			scene.add(shadow);
			shadowMeshes.push(shadow);
		}

		// Ball
		ball = new THREE.Mesh(
			new THREE.SphereGeometry(BALL_R, 20, 16),
			new THREE.MeshLambertMaterial({ color: 0xfacc15 })
		);
		scene.add(ball);

		// Flugbahn
		const trailMat = new THREE.LineDashedMaterial({ color: 0x1e293b, dashSize: 0.18, gapSize: 0.12 });
		trail = new THREE.Line(new THREE.BufferGeometry(), trailMat);
		scene.add(trail);
	}

	/** Strichmännchen: Füsse am Boden, Hände am Zuspiel-Kontaktpunkt. */
	function buildSetterFigure() {
		const g = new THREE.Group();
		const mat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

		const limb = (a, b, r = 0.035) => {
			const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
			const len = va.distanceTo(vb);
			const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
			m.position.copy(va).add(vb).multiplyScalar(0.5);
			m.quaternion.setFromUnitVectors(
				new THREE.Vector3(0, 1, 0),
				vb.clone().sub(va).normalize()
			);
			g.add(m);
		};

		// Proportionen aus dem Kontaktpunkt ableiten
		const hands = SETTER.y;          // Hände = Ballkontakt
		const head  = hands - 0.42;
		const shoul = head - 0.17;
		const hip   = shoul - 0.55;
		const knee  = hip - 0.55;

		// Beine (leicht gegrätscht, Knie gebeugt)
		limb([-0.17, 0, 0.06], [-0.13, knee, -0.02], 0.045);
		limb([-0.13, knee, -0.02], [-0.07, hip, 0], 0.045);
		limb([0.17, 0, 0.06], [0.13, knee, -0.02], 0.045);
		limb([0.13, knee, -0.02], [0.07, hip, 0], 0.045);

		// Rumpf und Schultern
		limb([0, hip, 0], [0, shoul, 0], 0.055);
		limb([-0.2, shoul, 0], [0.2, shoul, 0], 0.032);

		// Arme nach oben zum Ball
		limb([-0.2, shoul, 0], [-0.24, head, 0.05], 0.03);
		limb([-0.24, head, 0.05], [-0.1, hands, 0.04], 0.03);
		limb([0.2, shoul, 0], [0.24, head, 0.05], 0.03);
		limb([0.24, head, 0.05], [0.1, hands, 0.04], 0.03);

		// Kopf
		const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat);
		h.position.set(0, head + 0.04, 0);
		g.add(h);

		g.position.set(SETTER.x, 0, SETTER.z);
		g.rotation.y = Math.PI / 2;   // Blick entlang der Netzlinie
		return g;
	}

	function addLine(a, b, color) {
		const geo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(...a), new THREE.Vector3(...b),
		]);
		scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
	}

	function updateTrail() {
		const pts = [];
		const end = groundTime(current);
		for (let s = 0; s <= end + 1e-6; s += 0.02) {
			const p = posAt(current, Math.min(s, end));
			pts.push(new THREE.Vector3(p.x, Math.max(p.y, BALL_R), p.z));
		}
		trail.geometry.dispose();
		trail.geometry = new THREE.BufferGeometry().setFromPoints(pts);
		trail.computeLineDistances();
	}

	function updateWindows() {
		for (const m of winMeshes) {
			const isActive = m.userData.id === active;
			m.visible = showAll || isActive;
			m.material.opacity = isActive ? (inWindow ? 0.42 : 0.26) : 0.09;
		}
		for (const s of shadowMeshes) {
			const isActive = s.userData.id === active;
			s.visible = showAll || isActive;
			s.material.opacity = isActive ? 0.34 : 0.12;
		}
	}

	// ─── Loop ────────────────────────────────────────────────────────────────────
	function tick(ts) {
		raf = requestAnimationFrame(tick);
		const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
		lastTs = ts;

		if (playing) {
			t += dt * 0.5; // Zeitlupe
			if (t > tEnd) { t = 0; }
		}

		const p = posAt(current, Math.min(t, tEnd));
		ball.position.set(p.x, Math.max(p.y, BALL_R), p.z);
		const nowIn = isInside(current, p);
		if (nowIn !== inWindow) { inWindow = nowIn; updateWindows(); }

		// Kamera weich nachführen (Preset oder Maus-Orbit)
		const k = dragging ? 1 : 0.1;
		for (const key of ['theta', 'phi', 'r', 'tx', 'ty', 'tz']) {
			orbit[key] += (target[key] - orbit[key]) * k;
		}
		const sp = Math.sin(orbit.phi);
		camera.position.set(
			orbit.tx + orbit.r * sp * Math.sin(orbit.theta),
			orbit.ty + orbit.r * Math.cos(orbit.phi),
			orbit.tz + orbit.r * sp * Math.cos(orbit.theta)
		);
		camera.lookAt(orbit.tx, orbit.ty, orbit.tz);

		renderer.render(scene, camera);
	}

	function onResize() {
		if (!canvas || !renderer || !camera) return;
		const w = canvas.clientWidth, h = canvas.clientHeight;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	onMount(async () => {
		THREE = await import('three');
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
		applyCam(CAMS.iso);
		Object.assign(orbit, target);
		buildScene();
		updateTrail();
		updateWindows();
		onResize();
		window.addEventListener('resize', onResize);
		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('pointermove', onPointerMove);
		canvas.addEventListener('pointerup', onPointerUp);
		canvas.addEventListener('pointercancel', onPointerUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		raf = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (!browser) return;
		if (raf) cancelAnimationFrame(raf);
		renderer?.dispose();
		window.removeEventListener('resize', onResize);
		canvas?.removeEventListener('pointerdown', onPointerDown);
		canvas?.removeEventListener('pointermove', onPointerMove);
		canvas?.removeEventListener('pointerup', onPointerUp);
		canvas?.removeEventListener('pointercancel', onPointerUp);
		canvas?.removeEventListener('wheel', onWheel);
	});

	$effect(() => {
		camTarget = CAMS[camView];
		if (THREE) applyCam(camTarget);
	});
	$effect(() => {
		const _a = active, _s = showAll;
		if (!THREE || !scene) return;
		t = 0;
		updateTrail();
		updateWindows();
	});
</script>

<figure class="aw3d">
	<div class="canvas-wrap">
		<canvas bind:this={canvas}></canvas>
		<div class="hint">Ziehen = drehen · Scrollen = zoomen</div>

		<div class="cam-toggle">
			{#each Object.entries(CAMS) as [key, cam]}
				<button class="cam-btn" class:active={camView === key} onclick={() => (camView = key)}>
					{cam.label}
				</button>
			{/each}
		</div>

		<div class="badge" class:hit={inWindow}>
			{inWindow ? 'Ball im Angriffsfenster' : `t = ${t.toFixed(2)} s`}
		</div>
	</div>

	<div class="controls">
		<div class="row">
			<span class="k">Fenster</span>
			<div class="chips">
				{#each WINDOWS as w}
					<button
						class="chip"
						class:on={active === w.id}
						style="--c:#{w.color.toString(16).padStart(6, '0')}"
						onclick={() => (active = w.id)}
					>{w.name}</button>
				{/each}
			</div>
		</div>

		<div class="row">
			<button class="play" onclick={() => (playing = !playing)}>
				{playing ? 'Pause' : 'Ball abspielen'}
			</button>
			<button class="play ghost" onclick={() => { t = 0; }}>Zurücksetzen</button>
			<label class="toggle">
				<input type="checkbox" bind:checked={showAll} />
				alle Fenster zeigen
			</label>
		</div>

		<div class="row slider">
			<span class="k">Zeit</span>
			<input type="range" min="0" max={tEnd.toFixed(2)} step="0.01" bind:value={t} oninput={() => (playing = false)} />
			<span class="v">{t.toFixed(2)} s</span>
		</div>

		<div class="stats">
			<div><span class="k">Flugzeit bis Fenster</span><span class="v">{flightTime.toFixed(2)} s</span></div>
			<div><span class="k">Ball im Fenster</span><span class="v">{(duration * 1000).toFixed(0)} ms</span></div>
			<div><span class="k">Fensterbreite</span><span class="v">{current.w.toFixed(1)} m</span></div>
			<div><span class="k">Fensterhöhe</span><span class="v">{current.y0.toFixed(2)}–{current.y1.toFixed(2)} m</span></div>
		</div>
	</div>

	<figcaption>
		<!-- TODO: Bildlegende schreiben -->
		Die Angriffsfenster im Raum: Der Ball muss nicht irgendwohin — er muss durch
		ein bestimmtes Volumen fliegen, und zwar zum richtigen Zeitpunkt.
	</figcaption>
</figure>

<style>
	.aw3d {
		width: 100%;
		max-width: 820px;
		margin: 2rem auto;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
	}
	.canvas-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #e8f0fe; }
	canvas { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
	canvas:active { cursor: grabbing; }
	.hint {
		position: absolute;
		bottom: 10px;
		left: 10px;
		font-size: 0.7rem;
		color: #64748b;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 6px;
		padding: 2px 8px;
		pointer-events: none;
	}

	.cam-toggle { position: absolute; top: 10px; right: 10px; display: flex; gap: 0.25rem; }
	.cam-btn {
		padding: 0.28rem 0.6rem;
		font-size: 0.72rem;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.88);
		color: #64748b;
		border: 1px solid rgba(148, 163, 184, 0.6);
		border-radius: 6px;
		cursor: pointer;
	}
	.cam-btn.active { background: #2563eb; color: #fff; border-color: #1d4ed8; }

	.badge {
		position: absolute;
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #e2e8f0;
		color: #475569;
		font-size: 0.78rem;
		padding: 3px 12px;
		border-radius: 20px;
		pointer-events: none;
	}
	.badge.hit { background: #16a34a; color: #fff; border-color: #15803d; }

	.controls { padding: 0.9rem 1.1rem 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
	.row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
	.chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }
	.chip {
		padding: 0.3rem 0.65rem;
		font-size: 0.78rem;
		font-weight: 600;
		border: 1.5px solid var(--c);
		color: var(--c);
		background: #fff;
		border-radius: 999px;
		cursor: pointer;
	}
	.chip.on { background: var(--c); color: #fff; }

	.play {
		padding: 0.35rem 0.9rem;
		font-size: 0.8rem;
		font-weight: 600;
		border-radius: 6px;
		border: 1px solid #1d4ed8;
		background: #2563eb;
		color: #fff;
		cursor: pointer;
	}
	.play.ghost { background: #fff; color: #475569; border-color: #cbd5e1; }
	.toggle { font-size: 0.78rem; color: #475569; display: flex; align-items: center; gap: 0.3rem; }

	.slider input { flex: 1; min-width: 140px; }

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

	figcaption {
		padding: 0 1.1rem 1.1rem;
		font-size: 0.82rem;
		color: #64748b;
		line-height: 1.55;
	}
</style>
