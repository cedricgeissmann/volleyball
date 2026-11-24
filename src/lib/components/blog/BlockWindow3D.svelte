<script>
	// @ts-nocheck
	/**
	 * Blockfenster & Blockschatten 3D — wo muss der Block stehen?
	 *
	 * Koordinatensystem (Three.js):
	 *   X = Feldbreite (−4.5 … +4.5), Y = Höhe, Z = Tiefe
	 *   Netz liegt bei Z = 0, Angriffsseite bei Z > 0, Blockseite bei Z < 0.
	 *
	 * Idee: Wir simulieren ein Zuspiel auf Position 4. Das Zuspiel streut leicht
	 * um sein Ziel, und die Anlauf-/Absprungposition des Angreifers variiert —
	 * dadurch entsteht jedes Mal ein anderer Anlaufwinkel. Alle möglichen
	 * Kontaktpunkte ergeben das Schlagfenster (blau); durch das Netz verlängert
	 * entsteht daraus das Blockfenster (rot).
	 *
	 * Der Anlaufweg (gelb) gibt die härteste Schlagrichtung vor. Genau diese
	 * Richtung nimmt der äussere Blockspieler weg, der innere hilft nur noch mit
	 * dem Winkel mit. Die Fläche hinter dem Block, die der Angreifer nicht
	 * erreichen kann, ist der Blockschatten (dunkel) — dort braucht es keine
	 * Verteidiger.
	 *
	 * Verwendung im Blog:
	 *   <BlockWindow3D />
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// ─── Konstanten ──────────────────────────────────────────────────────────────
	const G       = 9.81;
	const FIELD_W = 9.0;
	const FIELD_D = 9.0;
	const BALL_R  = 0.105;
	const NET_H   = 2.43;

	const SETTER = { x: 1.4, y: 2.3, z: 0.55 };     // Kontaktpunkt des Zuspiels
	const TARGET = { x: -3.2, y: 3.0, z: 0.75 };    // Ziel des Zuspiels (Zone 4)
	const SET_T  = 1.05;                            // Flugzeit Zuspiel → Kontakt
	const ATT_T  = 0.42;                            // Flugzeit Angriff → Boden

	const SPREAD       = 0.45;   // Streuung des Zuspiels (m)
	const APPROACH_VAR = 0.8;    // Variation der Absprungposition (m)

	const HAND_REACH = 0.22;     // seitliche Reichweite der Schlaghand um den Ball
	const BLOCK_ARM  = 0.62;     // Abstand der beiden Blockspieler (geschlossener Block)
	const HAND_W     = 0.46;     // Breite der zwei Hände eines Blockspielers
	const BLOCK_Z    = 0.06;     // Blockhände greifen leicht über das Netz
	const BLOCK_DEPTH = 0.30;    // Tiefe der Handfläche
	const BLOCK_TOP  = NET_H + 0.45;   // Oberkante der Blockhände
	const BLOCK_BOT  = NET_H - 0.10;

	const CAMS = {
		block:     { pos: { x: -2.4, y: 2.6, z: -5.2 }, look: { x: -2.6, y: 2.7, z: 0.4 }, label: 'Block' },
		angreifer: { pos: { x: -3.6, y: 2.6, z: 6.4 },  look: { x: -2.8, y: 2.8, z: 0.2 }, label: 'Angreifer' },
		iso:       { pos: { x: 7.5, y: 6.5, z: 10.5 },  look: { x: -1.0, y: 2.0, z: 0.5 }, label: 'Übersicht' },
		oben:      { pos: { x: -1.0, y: 15.0, z: 0.6 }, look: { x: -1.0, y: 0.0, z: 0.5 }, label: 'Draufsicht' },
	};

	// ─── State ───────────────────────────────────────────────────────────────────
	let canvas = $state(null);
	let camView = $state('iso');
	let playing = $state(true);
	let t = $state(0);
	let showCloud = $state(false);     // alle simulierten Kontaktpunkte
	let showBlockWin = $state(true);   // Schlag-/Blockfenster
	let showShadow = $state(true);     // Blockschatten
	let showApproach = $state(true);   // Anlaufweg + härteste Schlagrichtung
	let samples = $state([]);
	let currentIdx = $state(0);
	let seed = $state(7);

	let THREE = null;
	let renderer, scene, camera;
	let ball, setTrail, attTrail, defTrail;
	let cloudGroup, hitBox, blockBox, attackerFig, blockerFig, shadowGroup, approachGroup, landMark;
	let raf = 0;
	let lastTs = 0;

	// ─── Orbit ───────────────────────────────────────────────────────────────────
	const orbit  = { theta: 0, phi: 1.0, r: 14, tx: -1, ty: 2, tz: 0.5 };
	const target = { theta: 0, phi: 1.0, r: 14, tx: -1, ty: 2, tz: 0.5 };
	let dragging = false;
	let lastPointer = { x: 0, y: 0 };

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

	// ─── Simulation ──────────────────────────────────────────────────────────────
	/** Kleiner deterministischer Zufallsgenerator (mulberry32). */
	function rngFrom(s) {
		let a = s >>> 0;
		return () => {
			a += 0x6d2b79f5;
			let x = Math.imul(a ^ (a >>> 15), 1 | a);
			x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}

	/** Annähernd normalverteilt, auf ±1 begrenzt. */
	function jitter(rnd) {
		return Math.max(-1, Math.min(1, (rnd() + rnd() + rnd() - 1.5) / 0.75));
	}

	/** Landepunkt in Richtung `dir` vom Kontaktpunkt aus, im Feld gehalten. */
	function landingFor(contact, dir) {
		let k = 12;
		for (const [lim, d, c] of [
			[4.3, dir.x, contact.x], [-4.3, dir.x, contact.x],
			[-8.8, dir.z, contact.z],
		]) {
			if (Math.abs(d) < 1e-4) continue;
			const kk = (lim - c) / d;
			if (kk > 0.5) k = Math.min(k, kk);
		}
		return { x: contact.x + dir.x * k, z: contact.z + dir.z * k };
	}

	function buildSamples() {
		const rnd = rngFrom(seed);
		const out = [];
		for (let i = 0; i < 14; i++) {
			// Zuspiel streut um sein Ziel
			const contact = {
				x: TARGET.x + jitter(rnd) * SPREAD,
				y: TARGET.y + jitter(rnd) * SPREAD * 0.55,
				z: TARGET.z + jitter(rnd) * SPREAD * 0.6,
			};
			// Absprungposition variiert → anderer Anlaufwinkel
			const takeoff = {
				x: contact.x - 0.3 - rnd() * APPROACH_VAR,
				z: contact.z + 0.9 + rnd() * APPROACH_VAR,
			};
			// Anlaufrichtung (horizontal, normiert) = härteste Schlagrichtung
			const dx = contact.x - takeoff.x;
			const dz = contact.z - takeoff.z;
			const len = Math.hypot(dx, dz) || 1;
			const hard = { x: dx / len, z: dz / len };
			const hardLand = landingFor(contact, hard);

			// Startpunkt des Anlaufs: 3.2 m zurück auf derselben Linie
			const start = { x: takeoff.x - hard.x * 3.2, z: takeoff.z - hard.z * 3.2 };

			// Tatsächlicher Schlag: härteste Richtung, leicht abgedreht
			const dev = (rnd() * 2 - 1) * 0.30;   // rad
			const cs = Math.cos(dev), sn = Math.sin(dev);
			const dir = { x: hard.x * cs - hard.z * sn, z: hard.x * sn + hard.z * cs };
			const land = landingFor(contact, dir);

			out.push({ contact, takeoff, start, hard, hardLand, land, dev });
		}
		return out;
	}

	let cur = $derived(samples[currentIdx] ?? null);

	/** Begrenzungsbox aller möglichen Kontaktpunkte = Schlagfenster. */
	let hitWindow = $derived.by(() => {
		if (!samples.length) return null;
		let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
		for (const s of samples) {
			x0 = Math.min(x0, s.contact.x); x1 = Math.max(x1, s.contact.x);
			y0 = Math.min(y0, s.contact.y); y1 = Math.max(y1, s.contact.y);
			z0 = Math.min(z0, s.contact.z); z1 = Math.max(z1, s.contact.z);
		}
		return {
			x0: x0 - HAND_REACH, x1: x1 + HAND_REACH,
			y0: Math.max(NET_H, y0 - 0.2), y1: y1 + 0.25,
			z0: Math.max(0.15, z0 - 0.2), z1: z1 + 0.25,
		};
	});

	/**
	 * Blockmauer für einen Ball: Der äussere Blockspieler stellt sich in die
	 * härteste Schlagrichtung (Verlängerung des Anlaufs), der innere schliesst
	 * zur Feldmitte hin an. Die Hände greifen leicht über das Netz.
	 */
	function wallFor(s) {
		if (!s) return null;
		const k = (BLOCK_Z - s.contact.z) / s.hard.z;
		let xCross = s.contact.x + s.hard.x * k;
		xCross = Math.max(-4.1, Math.min(4.1, xCross));
		const outer = xCross;                 // äusserer Blockspieler: auf die Linie
		const inner = xCross + BLOCK_ARM;     // innerer hilft mit dem Winkel
		return {
			outer, inner,
			x0: outer - HAND_W / 2,
			x1: inner + HAND_W / 2,
			y0: BLOCK_BOT, y1: BLOCK_TOP,
			z: BLOCK_Z,
		};
	}

	let blockWall = $derived(wallFor(cur));

	/** Das Blockfenster: genau die Fläche, welche die beiden Hände zuhalten. */
	let blockWindow = $derived.by(() => {
		if (!blockWall) return null;
		return {
			x0: blockWall.x0, x1: blockWall.x1,
			y0: blockWall.y0, y1: blockWall.y1,
			z0: BLOCK_Z - BLOCK_DEPTH, z1: BLOCK_Z,
		};
	});

	// ─── Blockschatten ───────────────────────────────────────────────────────────
	/** Projektion eines Punktes der Blockmauer vom Kontaktpunkt aus auf den Boden. */
	function projectToFloor(c, p) {
		const dy = c.y - p.y;
		if (dy < 0.10) {
			// Strahl fast waagrecht: Schatten reicht praktisch unbegrenzt weit
			const dx = p.x - c.x, dz = p.z - c.z;
			const len = Math.hypot(dx, dz) || 1;
			return { x: p.x + (dx / len) * 30, z: p.z + (dz / len) * 30 };
		}
		const s = c.y / dy;
		return { x: c.x + (p.x - c.x) * s, z: c.z + (p.z - c.z) * s };
	}

	/** Sutherland–Hodgman: Polygon an einer Halbebene schneiden. */
	function clipHalf(poly, inside, intersect) {
		const out = [];
		for (let i = 0; i < poly.length; i++) {
			const a = poly[i], b = poly[(i + 1) % poly.length];
			const ia = inside(a), ib = inside(b);
			if (ia) out.push(a);
			if (ia !== ib) out.push(intersect(a, b));
		}
		return out;
	}

	function clipToCourt(poly) {
		const lerpX = (a, b, x) => ({ x, z: a.z + ((x - a.x) / (b.x - a.x)) * (b.z - a.z) });
		const lerpZ = (a, b, z) => ({ x: a.x + ((z - a.z) / (b.z - a.z)) * (b.x - a.x), z });
		let p = poly;
		p = clipHalf(p, (q) => q.z <= -0.05, (a, b) => lerpZ(a, b, -0.05));
		p = clipHalf(p, (q) => q.z >= -9.6, (a, b) => lerpZ(a, b, -9.6));
		p = clipHalf(p, (q) => q.x >= -5.4, (a, b) => lerpX(a, b, -5.4));
		p = clipHalf(p, (q) => q.x <= 5.4, (a, b) => lerpX(a, b, 5.4));
		return p;
	}

	/**
	 * Der Blockschatten: Bodenfläche hinter dem Block, die der Angreifer nicht
	 * treffen kann. Vorne beginnt er direkt an der Blockmauer, seitlich wird er
	 * durch die Strahlen vom Ball an den Aussenhänden vorbei begrenzt, hinten
	 * durch den Strahl über die Hände hinweg.
	 */
	let shadowPoly = $derived.by(() => {
		if (!cur || !blockWall) return [];
		const c = cur.contact;
		const w = blockWall;
		const far = [
			projectToFloor(c, { x: w.x1, y: w.y1, z: w.z }),
			projectToFloor(c, { x: w.x0, y: w.y1, z: w.z }),
		];
		return [
			{ x: w.x0, z: w.z },   // vorne an der Blockmauer
			{ x: w.x1, z: w.z },
			far[0],                // hinten: Strahl über die Hände
			far[1],
		];
	});

	let shadowClipped = $derived(shadowPoly.length ? clipToCourt(shadowPoly) : []);

	// ─── Blockberührung ──────────────────────────────────────────────────────────
	/** Trifft der Angriff die Blockmauer? Wenn ja: Punkt und Zeitpunkt. */
	function impactFor(s) {
		const w = wallFor(s);
		if (!s || !w) return null;
		const v = attVelocity(s);
		if (Math.abs(v.z) < 1e-4) return null;
		const tb = (BLOCK_Z - s.contact.z) / v.z;
		if (tb < 0.01 || tb > ATT_T) return null;
		const x = s.contact.x + v.x * tb;
		const y = s.contact.y + v.y * tb - 0.5 * G * tb * tb;
		if (x < w.x0 || x > w.x1 || y < w.y0 || y > w.y1) return null;
		// Abpraller: zurück auf die Angriffsseite, stark gebremst
		const dv = { x: v.x * 0.25, y: Math.min(v.y * 0.3, -0.6), z: Math.abs(v.z) * 0.32 };
		const p = { x, y, z: BLOCK_Z };
		const tf = (dv.y + Math.sqrt(dv.y * dv.y + 2 * G * (p.y - BALL_R))) / G;
		return { t: tb, p, dv, tf };
	}

	/** Position des abgeprallten Balls, `dt` Sekunden nach der Blockberührung. */
	function deflectPos(im, dt) {
		const d = Math.min(dt, im.tf);
		return {
			x: im.p.x + im.dv.x * d,
			y: im.p.y + im.dv.y * d - 0.5 * G * d * d,
			z: im.p.z + im.dv.z * d,
		};
	}

	function pointInPoly(poly, p) {
		let inside = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a = poly[i], b = poly[j];
			if ((a.z > p.z) !== (b.z > p.z) &&
				p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
		}
		return inside;
	}

	/** Fläche des Schattens (Gauss'sche Trapezformel) innerhalb des Feldes. */
	let shadowArea = $derived.by(() => {
		const p = shadowClipped;
		if (p.length < 3) return 0;
		let a = 0;
		for (let i = 0; i < p.length; i++) {
			const q = p[(i + 1) % p.length];
			a += p[i].x * q.z - q.x * p[i].z;
		}
		return Math.abs(a) / 2;
	});

	/** Teil des Schattens, der im Feld liegt (ohne Freizone) — grob über Rasterung. */
	let shadowInCourt = $derived.by(() => {
		const p = shadowClipped;
		if (p.length < 3) return 0;
		let hits = 0, total = 0;
		for (let x = -4.4; x <= 4.4; x += 0.2) {
			for (let z = -0.2; z >= -8.9; z -= 0.2) {
				total++;
				if (pointInPoly(p, { x, z })) hits++;
			}
		}
		return total ? (hits / total) * 100 : 0;
	});

	let impact = $derived(cur ? impactFor(cur) : null);
	let blockedNow = $derived(!!impact);

	let landInShadow = $derived(
		cur && !impact && shadowPoly.length ? pointInPoly(shadowPoly, cur.land) : false
	);

	/** Wie viele Bälle der Serie berührt der Block? */
	let blockedCount = $derived(samples.filter((s) => !!impactFor(s)).length);

	let hitW   = $derived(hitWindow ? hitWindow.x1 - hitWindow.x0 : 0);
	let blockW = $derived(blockWall ? blockWall.x1 - blockWall.x0 : 0);

	// ─── Flugbahnen ──────────────────────────────────────────────────────────────
	function setVelocity(s) {
		return {
			x: (s.contact.x - SETTER.x) / SET_T,
			y: (s.contact.y - SETTER.y) / SET_T + 0.5 * G * SET_T,
			z: (s.contact.z - SETTER.z) / SET_T,
		};
	}
	function setPos(s, time) {
		const v = setVelocity(s);
		return {
			x: SETTER.x + v.x * time,
			y: SETTER.y + v.y * time - 0.5 * G * time * time,
			z: SETTER.z + v.z * time,
		};
	}
	function attVelocity(s) {
		return {
			x: (s.land.x - s.contact.x) / ATT_T,
			y: (BALL_R - s.contact.y) / ATT_T + 0.5 * G * ATT_T,
			z: (s.land.z - s.contact.z) / ATT_T,
		};
	}
	function attPos(s, time) {
		const v = attVelocity(s);
		return {
			x: s.contact.x + v.x * time,
			y: s.contact.y + v.y * time - 0.5 * G * time * time,
			z: s.contact.z + v.z * time,
		};
	}
	const T_END = SET_T + ATT_T + 0.5;

	function posAt(s, time, im) {
		if (time <= SET_T) return setPos(s, time);
		const ta = time - SET_T;
		if (im && ta > im.t) return deflectPos(im, ta - im.t);
		return attPos(s, Math.min(ta, ATT_T));
	}

	// ─── Szene ───────────────────────────────────────────────────────────────────
	function buildScene() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0xe8f0fe);

		scene.add(new THREE.AmbientLight(0xffffff, 0.75));
		const dir = new THREE.DirectionalLight(0xffffff, 0.6);
		dir.position.set(6, 10, 6);
		scene.add(dir);

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
		addLine([-FIELD_W / 2, 0.02, 3], [FIELD_W / 2, 0.02, 3], 0xffffff);
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

			const post = new THREE.Mesh(
				new THREE.CylinderGeometry(0.05, 0.05, NET_H + 0.15, 12),
				new THREE.MeshLambertMaterial({ color: 0x475569 })
			);
			post.position.set(xo, (NET_H + 0.15) / 2, 0);
			scene.add(post);

			const ANT_H = 1.8, ya = NET_H - 1.0, seg = ANT_H / 9;
			for (let i = 0; i < 9; i++) {
				const piece = new THREE.Mesh(
					new THREE.CylinderGeometry(0.022, 0.022, seg, 8),
					new THREE.MeshLambertMaterial({ color: i % 2 ? 0xffffff : 0xdc2626 })
				);
				piece.position.set(xi, ya + seg * (i + 0.5), 0);
				scene.add(piece);
			}
		}

		// Zuspieler
		scene.add(buildFigure(SETTER.x, SETTER.z, SETTER.y, Math.PI / 2, 0x1e293b));

		shadowGroup = new THREE.Group();
		approachGroup = new THREE.Group();
		cloudGroup = new THREE.Group();
		attackerFig = new THREE.Group();
		blockerFig = new THREE.Group();
		scene.add(shadowGroup, approachGroup, cloudGroup, attackerFig, blockerFig);

		hitBox = makeBox(0x2563eb, 0.14);
		blockBox = makeBox(0xdc2626, 0.16);
		scene.add(hitBox, blockBox);

		// Landepunkt
		landMark = new THREE.Mesh(
			new THREE.RingGeometry(0.22, 0.32, 24),
			new THREE.MeshBasicMaterial({ color: 0xb91c1c, side: THREE.DoubleSide })
		);
		landMark.rotation.x = -Math.PI / 2;
		landMark.position.y = 0.05;
		scene.add(landMark);

		ball = new THREE.Mesh(
			new THREE.SphereGeometry(BALL_R, 20, 16),
			new THREE.MeshLambertMaterial({ color: 0xfacc15 })
		);
		scene.add(ball);

		setTrail = new THREE.Line(
			new THREE.BufferGeometry(),
			new THREE.LineDashedMaterial({ color: 0x1e293b, dashSize: 0.18, gapSize: 0.12 })
		);
		attTrail = new THREE.Line(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: 0xb91c1c })
		);
		defTrail = new THREE.Line(
			new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({ color: 0x16a34a })
		);
		scene.add(setTrail, attTrail, defTrail);
	}

	function makeBox(color, opacity) {
		const geo = new THREE.BoxGeometry(1, 1, 1);
		const mesh = new THREE.Mesh(
			geo,
			new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
		);
		mesh.add(new THREE.LineSegments(
			new THREE.EdgesGeometry(geo),
			new THREE.LineBasicMaterial({ color })
		));
		return mesh;
	}

	function fitBox(mesh, w) {
		if (!w) { mesh.visible = false; return; }
		mesh.visible = true;
		mesh.scale.set(
			Math.max(0.05, w.x1 - w.x0),
			Math.max(0.05, w.y1 - w.y0),
			Math.max(0.05, w.z1 - w.z0)
		);
		mesh.position.set((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, (w.z0 + w.z1) / 2);
	}

	/** Flache Fläche auf dem Boden aus einem Polygon in (x, z). */
	function floorPolygon(poly, color, opacity, y = 0.04) {
		const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.z)));
		const mesh = new THREE.Mesh(
			new THREE.ShapeGeometry(shape),
			new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
		);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = y;
		return mesh;
	}

	/** Pfeil flach auf dem Boden von a nach b. */
	function floorArrow(a, b, width, color, y = 0.05, opacity = 1) {
		const g = new THREE.Group();
		const dx = b.x - a.x, dz = b.z - a.z;
		const len = Math.hypot(dx, dz);
		if (len < 0.1) return g;
		const ux = dx / len, uz = dz / len;
		const nx = -uz, nz = ux;              // Normale in der Bodenebene
		const shaft = Math.max(0.1, len - 0.55);
		const hw = width / 2, hh = width * 1.6;

		const pt = (s, o) => ({ x: a.x + ux * s + nx * o, z: a.z + uz * s + nz * o });
		const poly = [
			pt(0, hw), pt(shaft, hw), pt(shaft, hh), pt(len, 0), pt(shaft, -hh), pt(shaft, -hw), pt(0, -hw),
		];
		g.add(floorPolygon(poly, color, opacity, y));
		return g;
	}

	/** Strichmännchen mit Händen auf Höhe `hands`. */
	function buildFigure(x, z, hands, rotY, color) {
		const g = new THREE.Group();
		const mat = new THREE.MeshLambertMaterial({ color });

		const limb = (a, b, r = 0.035) => {
			const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
			const len = va.distanceTo(vb);
			const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
			m.position.copy(va).add(vb).multiplyScalar(0.5);
			m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
			g.add(m);
		};

		const head  = hands - 0.55;
		const shoul = head - 0.17;
		const hip   = shoul - 0.55;
		const knee  = hip - 0.55;
		const foot  = Math.max(0, knee - 0.55);

		limb([-0.17, foot, 0.06], [-0.13, knee, -0.02], 0.045);
		limb([-0.13, knee, -0.02], [-0.07, hip, 0], 0.045);
		limb([0.17, foot, 0.06], [0.13, knee, -0.02], 0.045);
		limb([0.13, knee, -0.02], [0.07, hip, 0], 0.045);
		limb([0, hip, 0], [0, shoul, 0], 0.055);
		limb([-0.2, shoul, 0], [0.2, shoul, 0], 0.032);
		limb([-0.2, shoul, 0], [-0.22, head, 0.04], 0.03);
		limb([-0.22, head, 0.04], [-0.12, hands, 0.03], 0.03);
		limb([0.2, shoul, 0], [0.22, head, 0.04], 0.03);
		limb([0.22, head, 0.04], [0.12, hands, 0.03], 0.03);

		const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat);
		h.position.set(0, head + 0.04, 0);
		g.add(h);

		g.position.set(x, 0, z);
		g.rotation.y = rotY;
		return g;
	}

	function addLine(a, b, color) {
		const geo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(...a), new THREE.Vector3(...b),
		]);
		scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
	}

	function clearGroup(g) {
		while (g.children.length) {
			const c = g.children.pop();
			c.traverse?.((o) => o.geometry?.dispose?.());
			c.geometry?.dispose?.();
			g.remove(c);
		}
	}

	function vec(p) {
		return new THREE.Vector3(p.x, Math.max(p.y, BALL_R), p.z);
	}

	function rebuildVisuals() {
		if (!THREE || !scene || !cur) return;

		// Kontaktpunkt-Wolke
		clearGroup(cloudGroup);
		cloudGroup.visible = showCloud;
		if (showCloud) {
			const dotGeo = new THREE.SphereGeometry(BALL_R * 0.6, 10, 8);
			const dotMat = new THREE.MeshBasicMaterial({ color: 0x1d4ed8, transparent: true, opacity: 0.55 });
			for (const s of samples) {
				const d = new THREE.Mesh(dotGeo, dotMat);
				d.position.set(s.contact.x, s.contact.y, s.contact.z);
				cloudGroup.add(d);
			}
		}

		fitBox(hitBox, hitWindow);
		fitBox(blockBox, blockWindow);
		hitBox.visible = showBlockWin && !!hitWindow;
		blockBox.visible = showBlockWin && !!blockWindow;

		// Blockschatten
		clearGroup(shadowGroup);
		shadowGroup.visible = showShadow;
		if (showShadow && shadowClipped.length >= 3) {
			shadowGroup.add(floorPolygon(shadowClipped, 0x1e293b, 0.45, 0.035));
			// Umriss
			const pts = shadowClipped.map((p) => new THREE.Vector3(p.x, 0.06, p.z));
			pts.push(pts[0].clone());
			shadowGroup.add(new THREE.Line(
				new THREE.BufferGeometry().setFromPoints(pts),
				new THREE.LineBasicMaterial({ color: 0x0f172a })
			));
		}

		// Anlaufweg + härteste Schlagrichtung
		clearGroup(approachGroup);
		approachGroup.visible = showApproach;
		if (showApproach) {
			// Anlaufweg auf dem Boden (gelb)
			approachGroup.add(floorArrow(cur.start, cur.takeoff, 0.18, 0xeab308, 0.05, 0.95));
			// Schrittmarken
			for (let i = 1; i <= 3; i++) {
				const f = i / 4;
				const m = new THREE.Mesh(
					new THREE.CircleGeometry(0.09, 14),
					new THREE.MeshBasicMaterial({ color: 0xca8a04 })
				);
				m.rotation.x = -Math.PI / 2;
				m.position.set(
					cur.start.x + (cur.takeoff.x - cur.start.x) * f,
					0.06,
					cur.start.z + (cur.takeoff.z - cur.start.z) * f
				);
				approachGroup.add(m);
			}
			// Verlängerung = härteste Schlagrichtung (orange, gestrichelt in der Luft)
			approachGroup.add(floorArrow(
				{ x: cur.takeoff.x, z: cur.takeoff.z }, cur.hardLand, 0.14, 0xf97316, 0.045, 0.75
			));
			const hardLine = new THREE.Line(
				new THREE.BufferGeometry().setFromPoints([
					new THREE.Vector3(cur.contact.x, cur.contact.y, cur.contact.z),
					new THREE.Vector3(cur.hardLand.x, BALL_R, cur.hardLand.z),
				]),
				new THREE.LineDashedMaterial({ color: 0xf97316, dashSize: 0.25, gapSize: 0.15 })
			);
			hardLine.computeLineDistances();
			approachGroup.add(hardLine);
		}

		// Figuren: Angreifer am Absprungpunkt, Block an der Netzebene
		clearGroup(attackerFig);
		clearGroup(blockerFig);
		const faceNet = Math.atan2(cur.hard.x, cur.hard.z);
		attackerFig.add(buildFigure(cur.takeoff.x, cur.takeoff.z, cur.contact.y - 0.12, faceNet, 0x1d4ed8));
		if (blockWall) {
			// aussen = kräftig (nimmt die härteste Richtung), innen = heller (Winkelhilfe)
			blockerFig.add(buildFigure(blockWall.outer, BLOCK_Z - 0.45, BLOCK_TOP, 0, 0xb91c1c));
			blockerFig.add(buildFigure(blockWall.inner, BLOCK_Z - 0.45, BLOCK_TOP, 0, 0xf87171));
		}

		// Flugbahnen
		const setPts = [];
		for (let s = 0; s <= SET_T + 1e-6; s += 0.02) setPts.push(vec(setPos(cur, s)));
		setTrail.geometry.dispose();
		setTrail.geometry = new THREE.BufferGeometry().setFromPoints(setPts);
		setTrail.computeLineDistances();

		const attEnd = impact ? impact.t : ATT_T;
		const attPts = [];
		for (let s = 0; s <= attEnd + 1e-6; s += 0.01) attPts.push(vec(attPos(cur, s)));
		attTrail.geometry.dispose();
		attTrail.geometry = new THREE.BufferGeometry().setFromPoints(attPts);

		defTrail.visible = !!impact;
		if (impact) {
			const defPts = [];
			for (let s = 0; s <= impact.tf + 1e-6; s += 0.01) defPts.push(vec(deflectPos(impact, s)));
			defTrail.geometry.dispose();
			defTrail.geometry = new THREE.BufferGeometry().setFromPoints(defPts);
		}

		const end = impact ? deflectPos(impact, impact.tf) : { x: cur.land.x, z: cur.land.z };
		landMark.position.set(end.x, 0.05, end.z);
		landMark.material.color.set(impact || landInShadow ? 0x16a34a : 0xb91c1c);
	}

	// ─── Loop ────────────────────────────────────────────────────────────────────
	function tick(ts) {
		raf = requestAnimationFrame(tick);
		const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
		lastTs = ts;

		if (playing && cur) {
			t += dt * 0.6;
			if (t > T_END) {
				t = 0;
				currentIdx = (currentIdx + 1) % samples.length;
			}
		}

		if (cur) {
			const tMax = impact ? SET_T + impact.t + impact.tf : SET_T + ATT_T;
			const p = posAt(cur, Math.min(t, tMax), impact);
			ball.position.set(p.x, Math.max(p.y, BALL_R), p.z);
		}

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

	function newBall() {
		seed = Math.floor(Math.random() * 1e6);
		t = 0;
		currentIdx = 0;
	}

	onMount(async () => {
		THREE = await import('three');
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
		applyCam(CAMS.iso);
		Object.assign(orbit, target);
		buildScene();
		rebuildVisuals();
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
		const _seed = seed;
		samples = buildSamples();
		currentIdx = 0;
		t = 0;
	});

	$effect(() => {
		const _s = samples, _c = currentIdx, _im = impact, _cl = showCloud, _b = showBlockWin,
			_sh = showShadow, _ap = showApproach;
		rebuildVisuals();
	});

	$effect(() => {
		const cam = CAMS[camView];
		if (THREE) applyCam(cam);
	});
</script>

<figure class="bw3d">
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

		<div class="legend">
			<span><i style="background:#1e293b"></i>Blockschatten</span>
			<span><i style="background:#eab308"></i>Anlaufweg</span>
			<span><i style="background:#f97316"></i>härteste Schlagrichtung</span>
			<span><i style="background:#2563eb"></i>Schlagfenster</span>
			<span><i style="background:#dc2626"></i>Blockfenster (Hände)</span>
		</div>

		<div class="badge" class:good={blockedNow || landInShadow}>
			{#if blockedNow}
				Block! Der Ball bleibt auf der Angriffsseite
			{:else if landInShadow}
				Ball landet im Blockschatten
			{:else}
				Angriff am Block vorbei — Verteidigung übernimmt
			{/if}
		</div>
	</div>

	<div class="controls">
		<div class="row">
			<button class="play" onclick={() => (playing = !playing)}>{playing ? 'Pause' : 'Abspielen'}</button>
			<button class="play ghost" onclick={newBall}>Neue Serie</button>
			<label class="toggle"><input type="checkbox" bind:checked={showShadow} /> Blockschatten</label>
			<label class="toggle"><input type="checkbox" bind:checked={showApproach} /> Anlaufweg</label>
			<label class="toggle"><input type="checkbox" bind:checked={showBlockWin} /> Fenster</label>
			<label class="toggle"><input type="checkbox" bind:checked={showCloud} /> Kontaktpunkte</label>
		</div>

		<div class="stats">
			<div><span class="k">Schlagfenster breit</span><span class="v">{hitW.toFixed(2)} m</span></div>
			<div><span class="k">Blockfenster breit</span><span class="v">{blockW.toFixed(2)} m</span></div>
			<div><span class="k">Feld im Schatten</span><span class="v">{shadowInCourt.toFixed(0)} %</span></div>
			<div><span class="k">Block berührt</span><span class="v">{blockedCount} / {samples.length}</span></div>
		</div>

		<p class="note">
			Der äussere Blockspieler stellt sich in die Verlängerung des Anlaufs — das
			ist die Richtung, in die der Angreifer am härtesten schlagen kann. Der
			innere Blockspieler schliesst zur Feldmitte an und nimmt den Winkel weg.
			Zusammen bilden ihre Hände das Blockfenster (rot) — und genau dieses Fenster
			wirft den Blockschatten: Dort muss niemand verteidigen. Jeder Ball, der das
			Fenster trifft, bleibt auf der Angriffsseite.
		</p>
	</div>

	<figcaption>
		Das Zuspiel auf Position 4 streut, und der Angreifer läuft jedes Mal etwas
		anders an. Alle möglichen Kontaktpunkte ergeben das Schlagfenster (blau). Der
		Anlaufweg (gelb) zeigt, wohin der härteste Schlag geht — und damit, wo der
		Block stehen muss. Die Hände der beiden Blockspieler greifen über das Netz und
		bilden das Blockfenster (rot); die dunkle Fläche dahinter ist der Blockschatten.
	</figcaption>
</figure>

<style>
	.bw3d {
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
		position: absolute; bottom: 10px; left: 10px;
		font-size: 0.7rem; color: #64748b;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 6px; padding: 2px 8px; pointer-events: none;
	}
	.cam-toggle { position: absolute; top: 10px; right: 10px; display: flex; gap: 0.25rem; }
	.cam-btn {
		padding: 0.28rem 0.6rem; font-size: 0.72rem; font-weight: 600;
		background: rgba(255, 255, 255, 0.88); color: #64748b;
		border: 1px solid rgba(148, 163, 184, 0.6); border-radius: 6px; cursor: pointer;
	}
	.cam-btn.active { background: #2563eb; color: #fff; border-color: #1d4ed8; }

	.legend {
		position: absolute; top: 10px; left: 10px;
		display: flex; flex-direction: column; gap: 0.2rem;
		background: rgba(255, 255, 255, 0.85);
		border-radius: 6px; padding: 4px 8px;
		font-size: 0.72rem; color: #475569; pointer-events: none;
	}
	.legend span { display: flex; align-items: center; gap: 0.35rem; }
	.legend i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

	.badge {
		position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.85); border: 1px solid #e2e8f0;
		color: #475569; font-size: 0.78rem; padding: 3px 12px;
		border-radius: 20px; pointer-events: none; white-space: nowrap;
	}
	.badge.good { background: #16a34a; color: #fff; border-color: #15803d; }

	.controls { padding: 0.9rem 1.1rem 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
	.row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
	.play {
		padding: 0.35rem 0.9rem; font-size: 0.8rem; font-weight: 600;
		border-radius: 6px; border: 1px solid #1d4ed8;
		background: #2563eb; color: #fff; cursor: pointer;
	}
	.play.ghost { background: #fff; color: #475569; border-color: #cbd5e1; }
	.toggle { font-size: 0.78rem; color: #475569; display: flex; align-items: center; gap: 0.3rem; }

	.stats {
		display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.5rem; border-top: 1px solid #e2e8f0; padding-top: 0.7rem;
	}
	.stats div { display: flex; flex-direction: column; }
	.k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
	.v { font-size: 0.92rem; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

	.note { margin: 0; font-size: 0.8rem; color: #475569; line-height: 1.5; }

	figcaption { padding: 0 1.1rem 1.1rem; font-size: 0.82rem; color: #64748b; line-height: 1.55; }
</style>
