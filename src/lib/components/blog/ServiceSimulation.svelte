<script>
	// @ts-nocheck
	/**
	 * Service-Simulation — Interaktive 3D Volleyball-Aufschlag-Komponente
	 *
	 * Koordinatensystem (Three.js):
	 *   X = Feldbreite, Y = Höhe, Z = Tiefe (Aufschlag +Z, Netz Z=0, Gegner -Z)
	 */

	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// ─── Feldkonstanten ───────────────────────────────────────────────────────────
	const G            = 9.81;
	const FIELD_W      = 9.0;
	const FIELD_HALF_D = 9.0;
	const BALL_R       = 0.105;

	// ─── Simulation-Parameter ─────────────────────────────────────────────────────
	const SPEED_MIN  = 8;
	const SPEED_MAX  = 22;
	const HEIGHT_MIN = 1.8;
	const HEIGHT_MAX = 3.2;

	// Impuls p = m·v, Ballmasse 0,27 kg (FIVB-Standard)
	const BALL_MASS    = 0.27;  // kg
	const IMPULSE_MIN  = +(BALL_MASS * SPEED_MIN).toFixed(2);  // 2.16 N·s
	const IMPULSE_MAX  = +(BALL_MASS * SPEED_MAX).toFixed(2);  // 5.94 N·s

	// ─── LocalStorage ────────────────────────────────────────────────────────────
	const LS_KEY = 'vb_service_sim_v1';

	function lsLoad() {
		if (!browser) return {};
		try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
	}

	function lsSave(patch) {
		if (!browser) return;
		try {
			const prev = lsLoad();
			localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...patch }));
		} catch {}
	}

	// ─── Svelte State (mit LocalStorage-Initialwerten) ────────────────────────────
	const _ls = lsLoad();
	let canvas       = $state(null);
	let ballCanvas   = $state(null);
	let strength     = $state(_ls.strength    ?? 65);
	let serveHeight  = $state(_ls.serveHeight ?? 50);
	let phase        = $state('idle'); // idle | flying | landed | net | out
	let resultLabel  = $state('');
	let genderMode   = $state(_ls.genderMode  ?? 'men');

	// Service-Position auf dem Feld (normiert 0..1 = links..rechts, hinter Grundlinie)
	let servePos     = $state(_ls.servePos    ?? { x: 0.5, z: 0.5 });

	// Treffpunkt
	let contactPoint = $state(_ls.contactPoint ?? { u: 0.0, v: 0.0 });
	let hasContact   = $state(_ls.hasContact   ?? false);
	let hoverPoint   = $state(null);

	// Derived: Netzhöhe
	let netHeight = $derived(genderMode === 'men' ? 2.43 : 2.24);

	// Kamera-Perspektive
	let camView = $state(_ls.camView ?? 'player'); // 'player' | 'iso'

	// Derived: Aufschlag-Weltkoordinaten
	let serveWorldX = $derived((servePos.x - 0.5) * FIELD_W);
	let serveWorldZ = $derived(FIELD_HALF_D + 0.5 + servePos.z * 2.5); // 0..1 → hinter Grundlinie (0.5m…3m)

	// Three.js — Hauptfeld
	let THREE = null;
	/** @type {any} */ let renderer, scene, camera;
	/** @type {any} */ let ballMesh, shadowCircle, impactRing, contactMarker;
	/** @type {any} */ let netBand, netMesh, netLowBand;
	/** @type {any} */ let posMarker;
	/** @type {any[]} */ let fieldBorderLines = [];  // die 4 Außenlinien des Gegenfeld-Rands
	/** @type {any} */ let forceArrow, forceArrowHead;
	/** @type {any} */ let trajectoryMesh;
	/** @type {any} */ let landingMarker;         // dauerhafter Landepunkt nach Aufprall
	/** @type {any} */ let landingPreviewMarker;  // Vorschau-Landepunkt auf der Flugbahn
	/** @type {number} */ let animFrameId;
	let ballState = { pos: null, vel: null, active: false };
	let lastTime  = 0;

	// ─── Dirty-Flags für den tick()-Loop ─────────────────────────────────────────
	// $effect schreibt hier hinein; tick() liest und aktualisiert die Szene.
	let dirty = {
		ball:       false,   // Ball-Position / Kontaktmarker neu setzen
		preview:    false,   // Kraftvektor + Flugbahn neu berechnen
		previewVis: _ls.hasContact ?? false,
		previewCp:  _ls.contactPoint ? { ..._ls.contactPoint } : { u: 0, v: 0 },
		previewOp:  1.0,
	};

	// Netz-Animation
	let netCurrentY  = 2.43;   // aktuell angezeigte Höhe (wird animiert)
	let netTargetY   = 2.43;   // Ziel-Höhe
	const NET_ANIM_SPEED = 1.0 / 0.4; // pro Sekunde (0.4s vollständige Transition)

	// Kamera-Lerp
	// Ziel-Position und Ziel-LookAt werden im $effect gesetzt, tick() interpoliert dazu.
	const CAM_LERP_SPEED = 1.0 / 0.6; // 0.6 s vollständige Transition
	// Aktuelle (geglättete) Kamera-Werte — plain JS, kein Svelte-State
	let camCurPos    = { x: 0, y: 0, z: 0 };
	let camCurLookAt = { x: 0, y: 0, z: 0 };
	let camTargetPos    = { x: 0, y: netHeight + 1.2, z: FIELD_HALF_D + 8.0 };
	let camTargetLookAt = { x: 0, y: netHeight * 0.6, z: -FIELD_HALF_D * 0.2 };
	let camDirty = false; // true = Perspektive hat sich geändert, Lerp starten

	// Three.js — Ball-Widget
	/** @type {any} */ let wRenderer, wScene, wCamera;
	/** @type {any} */ let wBall, wGrid, wContactDot, wArrow, wArrowHead, wHoverDot, wCenterDot;
	const W_R = 1.0;

	// ─── Helpers ──────────────────────────────────────────────────────────────────
	function lerp(a, b, t) { return a + (b - a) * t; }
	function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
	function mapRange(v, a, b, c, d) { return lerp(c, d, (v - a) / (b - a)); }
	/** Slider 0..100 → Impuls in N·s */
	function getImpulse() { return mapRange(strength, 0, 100, IMPULSE_MIN, IMPULSE_MAX); }
	/** Impuls N·s → Abfluggeschwindigkeit m/s */
	function impulseToSpeed(imp) { return imp / BALL_MASS; }
	/** Slider 0..100 → Abfluggeschwindigkeit m/s */
	function getSpeed()  { return impulseToSpeed(getImpulse()); }
	/** Geschwindigkeit m/s → Slider-Wert 0..100 (geclampt) */
	function speedToStrength(spd) {
		return clamp(mapRange(spd * BALL_MASS, IMPULSE_MIN, IMPULSE_MAX, 0, 100), 0, 100);
	}
	function getHeight() { return mapRange(serveHeight, 0, 100, HEIGHT_MIN, HEIGHT_MAX); }

	/**
	 * Berechnet den normierten Abflugvektor aus dem Treffpunkt (u,v).
	 * Das Widget zeigt den Ball von +Z (Aufriss). Der Treffpunkt-Normalvektor
	 * am Kugelrand ist (u, v, depth) mit depth = sqrt(1-u²-v²).
	 * Der Schläger drückt den Ball in Richtung des negativen Normalvektors (-u, -v, -depth).
	 * Zusätzlich überlagern wir den Basis-Schwungwinkel (BASE_PITCH) des Schlägers:
	 * Der Pitch-Winkel in der Vertikalen ergibt sich geometrisch als
	 *   pitch = BASE_PITCH + atan2(-v, depth)
	 * Die horizontale Abweichung (X) kommt aus dem u-Anteil, skaliert auf den Seitenversatz.
	 *
	 * @param {object} cp - Treffpunkt {u, v}
	 * @returns {{ pitchRad: number, sideRatio: number }}
	 */
	/**
	 * Berechnet den Abflugwinkel und den Seiten-Anteil aus dem Treffpunkt (u,v).
	 *
	 * Das Widget zeigt den Ball von +Z (Aufriss). Treffpunkt-Normalvektor: (u, v, depth).
	 * Der Schläger drückt den Ball in Richtung (-u, -v, -depth).
	 *
	 * Abflugwinkel = BASE_PITCH + atan2(-v, depth)
	 *   – bei v=0 (Äquator): +15° → normaler Aufschlag
	 *   – bei v>0 (obere Halbkugel): weniger / negativer Winkel → Topspin
	 *   – bei v<0 (untere Halbkugel): steilerer Winkel → Lob
	 * Geclampt auf [-20°, +50°] für realistische Volleyball-Physik.
	 *
	 * sideRatio = -u: Bei u>0 (rechter Treffer) fliegt der Ball nach links, u.s.w.
	 */
	function getContactInfo(cp = contactPoint) {
		const u = cp.u, v = cp.v;
		const depth    = Math.sqrt(Math.max(0, 1 - u * u - v * v));
		const BASE     = Math.PI / 12;          // 15°
		const MIN_P    = -20 * Math.PI / 180;   // -20°
		const MAX_P    =  50 * Math.PI / 180;   //  50°
		const rawPitch = BASE + Math.atan2(-v, depth);
		const pitchRad = Math.max(MIN_P, Math.min(MAX_P, rawPitch));
		const sideRatio = -u;   // ∈ [-1, 1]
		return { pitchRad, sideRatio };
	}

	// ─── Hauptfeld-Scene ──────────────────────────────────────────────────────────

	function buildScene() {
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0d1117);
		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const sun = new THREE.DirectionalLight(0xfff8e8, 0.8);
		sun.position.set(0, 20, 5);
		scene.add(sun);

		buildFloor();
		buildFieldLines();
		buildNet();
		buildBall();

		// Boden-Schatten
		shadowCircle = new THREE.Mesh(
			new THREE.CircleGeometry(0.22, 24),
			new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
		);
		shadowCircle.rotation.x = -Math.PI / 2;
		shadowCircle.position.y = 0.012;
		scene.add(shadowCircle);

		// Aufprall-Ring
		impactRing = new THREE.Mesh(
			new THREE.RingGeometry(0.18, 0.30, 32),
			new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
		);
		impactRing.rotation.x = -Math.PI / 2;
		impactRing.position.y = 0.02;
		scene.add(impactRing);

		// Treffpunkt-Marker am Ball
		contactMarker = new THREE.Mesh(
			new THREE.SphereGeometry(0.022, 12, 8),
			new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0, depthTest: false })
		);
		scene.add(contactMarker);

		// Positions-Marker auf dem Boden (leuchtendes Kreuz)
		posMarker = new THREE.Mesh(
			new THREE.CircleGeometry(0.28, 32),
			new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.55, depthWrite: false })
		);
		posMarker.rotation.x = -Math.PI / 2;
		posMarker.position.y = 0.013;
		scene.add(posMarker);

		// Vorschau-Landepunkt (Ende der Flugbahn, hellblau)
		const landingPreviewGeo = new THREE.Group();
		landingPreviewMarker = new THREE.Group();
		// Äußerer Ring
		landingPreviewMarker.add(new THREE.Mesh(
			new THREE.RingGeometry(0.20, 0.30, 32),
			new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
		));
		// Innerer Kreis
		landingPreviewMarker.add(new THREE.Mesh(
			new THREE.CircleGeometry(0.10, 32),
			new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
		));
		landingPreviewMarker.rotation.x = -Math.PI / 2;
		landingPreviewMarker.position.y = 0.018;
		scene.add(landingPreviewMarker);

		// Dauerhafter Landepunkt nach Aufprall (weiß + leuchtend)
		landingMarker = new THREE.Group();
		landingMarker.add(new THREE.Mesh(
			new THREE.RingGeometry(0.22, 0.34, 32),
			new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
		));
		landingMarker.add(new THREE.Mesh(
			new THREE.CircleGeometry(0.10, 32),
			new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
		));
		landingMarker.rotation.x = -Math.PI / 2;
		landingMarker.position.y = 0.019;
		scene.add(landingMarker);

		// Kraftvektor-Pfeil
		const _dc1 = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
		forceArrow = new THREE.Mesh(
			new THREE.TubeGeometry(_dc1, 8, 0.06, 8, false),
			new THREE.ShaderMaterial({
				transparent: true, depthTest: false, depthWrite: false,
				uniforms: { uOpacity: { value: 0.0 } },
				vertexShader: `varying float vT; void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: `uniform float uOpacity; varying float vT; void main() { float a = uOpacity*(1.0-vT*0.55); gl_FragColor = vec4(1.0,0.85,0.1,a); }`
			})
		);
		scene.add(forceArrow);

		forceArrowHead = new THREE.Mesh(
			new THREE.ConeGeometry(0.12, 0.32, 10),
			new THREE.ShaderMaterial({
				transparent: true, depthTest: false, depthWrite: false,
				uniforms: { uOpacity: { value: 0.0 } },
				vertexShader: `varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: `uniform float uOpacity; varying float vY; void main() { float a = uOpacity*(1.0-vY*0.65); gl_FragColor = vec4(1.0,0.85,0.1,a); }`
			})
		);
		scene.add(forceArrowHead);

		// Flugbahn-Vorschau
		const _dc2 = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
		trajectoryMesh = new THREE.Mesh(
			new THREE.TubeGeometry(_dc2, 20, 0.035, 6, false),
			new THREE.ShaderMaterial({
				transparent: true, depthTest: false, depthWrite: false,
				uniforms: { uOpacity: { value: 0.0 } },
				vertexShader: `varying float vT; void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: `uniform float uOpacity; varying float vT; void main() { float a = uOpacity*(1.0-vT*0.45); gl_FragColor = vec4(0.35,0.85,1.0,a); }`
			})
		);
		scene.add(trajectoryMesh);

		resetBall();
		// Initiale Vorschau anfordern (dirty.previewVis/Cp wurden oben mit LS-Werten befüllt)
		dirty.preview = true;
	}

	function buildFloor() {
		const outer = new THREE.Mesh(
			new THREE.PlaneGeometry(40, 40),
			new THREE.MeshLambertMaterial({ color: 0x182820 })
		);
		outer.rotation.x = -Math.PI / 2;
		scene.add(outer);

		const field = new THREE.Mesh(
			new THREE.PlaneGeometry(FIELD_W, FIELD_HALF_D * 2),
			new THREE.MeshLambertMaterial({ color: 0x2a6034 })
		);
		field.rotation.x = -Math.PI / 2;
		field.position.y = 0.005;
		scene.add(field);

		// Servicezone
		const sz = new THREE.Mesh(
			new THREE.PlaneGeometry(FIELD_W, 3.5),
			new THREE.MeshLambertMaterial({ color: 0x224a28 })
		);
		sz.rotation.x = -Math.PI / 2;
		sz.position.set(0, 0.004, FIELD_HALF_D + 1.75);
		scene.add(sz);
	}

	function buildFieldLines() {
		const y = 0.022;
		const hw = FIELD_W / 2, hd = FIELD_HALF_D;

		function makeLine(x1, z1, x2, z2, mat) {
			const geo = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2)
			]);
			const l = new THREE.Line(geo, mat);
			scene.add(l);
			return l;
		}

		// Innere Linien (Angriffslinie, Mittellinie, eigene Grundlinie) — nie rot
		const white = new THREE.LineBasicMaterial({ color: 0xffffff });
		makeLine(-hw,  hd,  hw,  hd);   // eigene Grundlinie
		makeLine(-hw, 0, hw, 0);         // Mittellinie
		makeLine(-hw,  3,  hw,  3);      // eigene Angriffslinie
		makeLine(-hw, -3,  hw, -3);      // gegnerische Angriffslinie

		// Außenlinien der Gegner-Feldhälfte — werden bei "Aus" rot
		const borderMat = () => new THREE.LineBasicMaterial({ color: 0xffffff });
		fieldBorderLines = [
			makeLine(-hw, -hd,  hw, -hd, borderMat()),  // gegnerische Grundlinie
			makeLine(-hw,  -hd, -hw, 0,  borderMat()),  // linke Seitenlinie (Gegnerfeld)
			makeLine( hw,  -hd,  hw, 0,  borderMat()),  // rechte Seitenlinie (Gegnerfeld)
		];
	}

	function buildNet() {
		const hw = FIELD_W / 2 + 0.5;
		const h  = netHeight;   // wird beim ersten Aufruf noch nicht reaktiv, aber updateNet() macht's
		const NET_VIS = 1.0;

		netMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(hw * 2, NET_VIS, 18, 5),
			new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true, transparent: true, opacity: 0.45 })
		);
		scene.add(netMesh);

		netBand = new THREE.Mesh(
			new THREE.BoxGeometry(hw * 2, 0.07, 0.06),
			new THREE.MeshLambertMaterial({ color: 0xffffff })
		);
		scene.add(netBand);

		netLowBand = new THREE.Mesh(
			new THREE.BoxGeometry(hw * 2, 0.025, 0.025),
			new THREE.MeshLambertMaterial({ color: 0x999999 })
		);
		scene.add(netLowBand);

		// Pfosten
		const postMat = new THREE.MeshLambertMaterial({ color: 0xbbbbbb });
		for (const x of [-hw, hw]) {
			const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.55, 8), postMat);
			post.position.set(x, 2.55 / 2, 0);
			scene.add(post);
		}
		// Antennen
		for (const x of [-FIELD_W / 2, FIELD_W / 2]) {
			for (let i = 0; i < 8; i++) {
				const seg = new THREE.Mesh(
					new THREE.CylinderGeometry(0.013, 0.013, 0.1, 6),
					new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xff2200 : 0xffffff })
				);
				seg.position.set(x, 2.43 + (i + 0.5) * 0.1, 0);
				scene.add(seg);
			}
		}

		applyNetHeight(netCurrentY);
	}

	// Netz auf aktuell animierte Höhe setzen (wird pro Frame aufgerufen)
	function applyNetHeight(h) {
		if (!netBand) return;
		const NET_VIS = 1.0;
		const netBot  = h - NET_VIS;
		netMesh.position.set(0, netBot + NET_VIS / 2, 0);
		netBand.position.set(0, h, 0);
		netLowBand.position.set(0, netBot, 0);
	}

	// Netz-Farbe: rot bei Kollision mit Flugkurve, normal sonst
	let netIsHit = false;
	function setNetHitColor(hit) {
		if (!netBand || hit === netIsHit) return;
		netIsHit = hit;
		if (hit) {
			netMesh.material.color.setHex(0xff3300);
			netMesh.material.opacity = 0.7;
			netBand.material.color.setHex(0xff4400);
			netLowBand.material.color.setHex(0xcc2200);
		} else {
			netMesh.material.color.setHex(0xcccccc);
			netMesh.material.opacity = 0.45;
			netBand.material.color.setHex(0xffffff);
			netLowBand.material.color.setHex(0x999999);
		}
	}

	// Feldrand-Farbe: rot wenn Ball ins Aus geht, normal sonst
	let fieldIsOut = false;
	function setFieldOutColor(out) {
		if (fieldBorderLines.length === 0 || out === fieldIsOut) return;
		fieldIsOut = out;
		const hex = out ? 0xff3300 : 0xffffff;
		for (const l of fieldBorderLines) l.material.color.setHex(hex);
	}

	function buildBall() {
		const tc = document.createElement('canvas');
		tc.width = 512; tc.height = 512;
		const ctx = tc.getContext('2d');
		ctx.fillStyle = '#f5f0e8';
		ctx.fillRect(0, 0, 512, 512);
		const g = ctx.createRadialGradient(190, 150, 10, 256, 256, 270);
		g.addColorStop(0, 'rgba(255,255,255,0.45)');
		g.addColorStop(1, 'rgba(160,140,100,0.3)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 512, 512);
		ctx.strokeStyle = '#1a3a5c';
		ctx.lineWidth = 10;
		ctx.lineCap = 'round';
		for (const cy of [110, 400]) {
			ctx.beginPath(); ctx.ellipse(256, cy, 200, 75, 0, 0, Math.PI * 2); ctx.stroke();
		}
		ctx.beginPath(); ctx.ellipse(256, 256, 240, 55, 0, 0, Math.PI * 2); ctx.stroke();
		for (const cx of [130, 382]) {
			ctx.beginPath(); ctx.ellipse(cx, 256, 65, 220, 0, 0, Math.PI * 2); ctx.stroke();
		}
		ballMesh = new THREE.Mesh(
			new THREE.SphereGeometry(BALL_R, 48, 32),
			new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(tc) })
		);
		scene.add(ballMesh);
	}

	function getCamPreset(view) {
		if (view === 'iso') {
			return {
				pos:    { x: 14.0, y: 17.0, z: 12.0 },
				lookAt: { x: 0,    y: 1.2,   z: -1.5 },
			};
		}
		// 'player'
		return {
			pos:    { x: 0, y: netCurrentY + 1.2, z: FIELD_HALF_D + 8.0 },
			lookAt: { x: 0, y: netCurrentY * 0.6,  z: -FIELD_HALF_D * 0.2 },
		};
	}

	function buildCamera() {
		const aspect = canvas.clientWidth / canvas.clientHeight;
		camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 200);
		// Kamera zentriert hinter dem Feld
		const preset = getCamPreset('player');
		camera.position.set(preset.pos.x, preset.pos.y, preset.pos.z);
		camera.lookAt(preset.lookAt.x, preset.lookAt.y, preset.lookAt.z);
		// Lerp-Startwerte gleich setzen
		camCurPos    = { ...preset.pos };
		camCurLookAt = { ...preset.lookAt };
		camTargetPos    = { ...preset.pos };
		camTargetLookAt = { ...preset.lookAt };
	}

	function buildRenderer() {
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
	}

	// ─── Positions-Interaktion auf dem Canvas ─────────────────────────────────────

	function onFieldClick(event) {
		if (phase === 'flying') return;
		const rect = canvas.getBoundingClientRect();
		const mx = (event.clientX - rect.left) / rect.width;
		const my = (event.clientY - rect.top)  / rect.height;

		// Raycasting via THREE.Raycaster auf eine unsichtbare Boden-Ebene hinter dem Netz
		const raycaster = new THREE.Raycaster();
		const ndc = new THREE.Vector2(mx * 2 - 1, -(my * 2 - 1));
		raycaster.setFromCamera(ndc, camera);

		// Servicezone-Ebene: Y=0, Z > FIELD_HALF_D
		const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
		const hit   = new THREE.Vector3();
		if (!raycaster.ray.intersectPlane(plane, hit)) return;

		// Nur in der Servicezone akzeptieren
		const hw = FIELD_W / 2;
		if (Math.abs(hit.x) > hw) return;
		if (hit.z < FIELD_HALF_D || hit.z > FIELD_HALF_D + 3.5) return;

		// Normieren
		const nx = (hit.x / hw) * 0.5 + 0.5;          // 0..1
		const nz = (hit.z - FIELD_HALF_D) / 3.5;       // 0..1

		// Treffpunkt-U und Impuls anpassen, damit der Landepunkt gleich bleibt
		if (hasContact) {
			const oldWorldX = (servePos.x - 0.5) * FIELD_W;
			const newWorldX = (nx - 0.5) * FIELD_W;
			const oldWorldZ = FIELD_HALF_D + 0.5 + servePos.z * 2.5;
			const newWorldZ = FIELD_HALF_D + 0.5 + nz * 2.5;

			// ── U (Seitwärts-Treffpunkt) ──────────────────────────────────────
			// Altes Ziel-X: sideRatio_alt * FIELD_W/2
			// Neues u so wählen dass sideRatio_neu * FIELD_W/2 = altes Ziel-X
			// sideRatio = -u  →  u = -sideRatio
			const { sideRatio: oldSideRatio } = getContactInfo(contactPoint);
			const oldTargetX = oldSideRatio * (FIELD_W / 2);
			// Neues Ziel-X bleibt gleich: newSideRatio = oldTargetX / (FIELD_W/2)
			const newSideRatio = clamp(oldTargetX / (FIELD_W / 2), -1, 1);
			const newU = clamp(-newSideRatio, -1, 1);
			const newCp = { u: newU, v: contactPoint.v };

			// ── Impuls (Geschwindigkeit) ───────────────────────────────────────
			// Horizontale Distanz ändert sich durch neue Service-Position
			const newDx = oldTargetX - newWorldX;
			const newDz = -(newWorldZ + FIELD_HALF_D * 0.6);
			const newDist = Math.sqrt(newDx * newDx + newDz * newDz);

			const oldDx = oldTargetX - oldWorldX;
			const oldDz = -(oldWorldZ + FIELD_HALF_D * 0.6);
			const oldDist = Math.sqrt(oldDx * oldDx + oldDz * oldDz);

			if (oldDist > 0.01) {
				const newSpeed = getSpeed() * (newDist / oldDist);
				strength = clamp(speedToStrength(newSpeed), 0, 100);
			}

			contactPoint = newCp;
			updateWidgetMarkers(null, contactPoint, true);
		}

		servePos = { x: nx, z: nz };
	}

	// ─── Vorschau-Update ──────────────────────────────────────────────────────────

	function computeInitialVelocity(cp = contactPoint) {
		const { pitchRad, sideRatio } = getContactInfo(cp);
		const speed = getSpeed();

		// Horizontale Abfluggeschwindigkeit und vertikale Komponente
		const hSpeed = speed * Math.cos(pitchRad);
		const vSpeed = speed * Math.sin(pitchRad);

		// Ziel-Richtung: Der sideRatio verschiebt den Zielpunkt seitlich.
		// Basis-Ziel ist Feldmitte Gegenseite. sideRatio * FIELD_W/2 ergibt
		// den maximalen Seitenversatz (bei u=±1 landet der Ball am Rand).
		const sideTargetX = sideRatio * (FIELD_W / 2);
		const dx = sideTargetX - serveWorldX;
		const dz = -(serveWorldZ + FIELD_HALF_D * 0.6);
		const dist = Math.sqrt(dx * dx + dz * dz);
		const hDir = new THREE.Vector3(dx / dist, 0, dz / dist).normalize();

		return new THREE.Vector3(hDir.x * hSpeed, vSpeed, hDir.z * hSpeed);
	}

	function updateFieldPreview(visible, cp = contactPoint, opacity = 1.0) {
		if (!forceArrow || !trajectoryMesh || !ballMesh) return;

		if (!visible) {
			forceArrow.material.uniforms.uOpacity.value    = 0;
			forceArrowHead.material.uniforms.uOpacity.value = 0;
			trajectoryMesh.material.uniforms.uOpacity.value = 0;
			setNetHitColor(false);
			setFieldOutColor(false);
			return;
		}

		const vel  = computeInitialVelocity(cp);
		const spd  = vel.length();
		const dir  = vel.clone().normalize();
		const bpos = ballMesh.position;

		// ── Kraftvektor ───────────────────────────────────────────────────────
		const arrowLen    = mapRange(spd, SPEED_MIN, SPEED_MAX, 0.6, 1.6);
		const startOffset = BALL_R * 1.4;
		const sx = bpos.x + dir.x * startOffset;
		const sy = bpos.y + dir.y * startOffset;
		const sz = bpos.z + dir.z * startOffset;
		const ex = sx + dir.x * arrowLen;
		const ey = sy + dir.y * arrowLen;
		const ez = sz + dir.z * arrowLen;

		forceArrow.geometry.dispose();
		forceArrow.geometry = new THREE.TubeGeometry(
			new THREE.LineCurve3(new THREE.Vector3(sx, sy, sz), new THREE.Vector3(ex, ey, ez)),
			8, 0.06, 8, false
		);
		forceArrow.material.uniforms.uOpacity.value = opacity;

		forceArrowHead.position.set(ex, ey, ez);
		const q = new THREE.Quaternion();
		q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
		forceArrowHead.setRotationFromQuaternion(q);
		forceArrowHead.material.uniforms.uOpacity.value = opacity;

		// ── Flugbahn ──────────────────────────────────────────────────────────
		const pts = [];
		const p   = bpos.clone();
		const v   = vel.clone();
		const DT  = 0.033;
		let hitsNet = false;

		for (let i = 0; i < 500; i++) {
			pts.push(p.clone());
			v.y -= G * DT;
			p.addScaledVector(v, DT);
			// Netz
			if (p.z <= 0.1 && p.z >= -0.3 && p.y < netHeight + BALL_R) {
				hitsNet = true;
				pts.push(p.clone());
				break;
			}
			// Boden
			if (p.y <= BALL_R) { p.y = BALL_R; pts.push(p.clone()); break; }
			if (p.y > 30 || Math.abs(p.z) > 30) break;
		}

		if (pts.length >= 2) {
			const curve = new THREE.CatmullRomCurve3(pts);
			trajectoryMesh.geometry.dispose();
			trajectoryMesh.geometry = new THREE.TubeGeometry(curve, Math.min(pts.length * 3, 200), 0.035, 6, false);
		}
		trajectoryMesh.material.uniforms.uOpacity.value = opacity * 0.9;

		// Netz-Farbe: rot wenn Vorschau-Flugbahn das Netz trifft
		setNetHitColor(hitsNet);

		// ── Vorschau-Landepunkt + Aus-Anzeige ────────────────────────────────
		if (landingPreviewMarker) {
			const last = pts[pts.length - 1];
			const landsOnGround = last && last.y <= BALL_R + 0.01;
			const inOpponentField = landsOnGround && last.z <= 0 && last.z >= -FIELD_HALF_D
				&& Math.abs(last.x) <= FIELD_W / 2;
			const isOut = landsOnGround && !hitsNet && !inOpponentField && last.z <= 0;

			if (inOpponentField) {
				landingPreviewMarker.position.set(last.x, 0.018, last.z);
				landingPreviewMarker.children.forEach(c => { c.material.opacity = opacity * 0.7; });
			} else {
				landingPreviewMarker.children.forEach(c => { c.material.opacity = 0; });
			}

			// Feldrand rot wenn Vorschau ein Aus ergibt
			setFieldOutColor(isOut);
		}
	}

	function setLandingMarkerOpacity(op) {
		if (!landingMarker) return;
		landingMarker.children.forEach(c => { c.material.opacity = op; });
	}

	// ─── Ball-Widget Scene ────────────────────────────────────────────────────────

	function buildWidgetScene() {
		wScene = new THREE.Scene();
		wScene.background = new THREE.Color(0x1a1c2e);
		wScene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const wSun = new THREE.DirectionalLight(0xfff8e8, 0.9);
		wSun.position.set(2, 3, 4);
		wScene.add(wSun);

		wBall = new THREE.Mesh(
			new THREE.SphereGeometry(W_R, 48, 32),
			new THREE.MeshLambertMaterial({ color: 0xe8e0d0 })
		);
		wScene.add(wBall);

		wGrid = new THREE.LineSegments(
			new THREE.WireframeGeometry(new THREE.SphereGeometry(W_R * 1.003, 14, 9)),
			new THREE.LineBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.30 })
		);
		wScene.add(wGrid);

		// Äquator (XZ-Ebene, Y=0)
		const eqPts = [];
		for (let i = 0; i <= 96; i++) {
			const a = (i / 96) * Math.PI * 2;
			eqPts.push(new THREE.Vector3(Math.cos(a) * W_R * 1.004, 0, Math.sin(a) * W_R * 1.004));
		}
		wScene.add(new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(eqPts),
			new THREE.LineBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.75, depthTest: false })
		));

		// Mittelpunkt Halo + Kern
		const wCenterHalo = new THREE.Mesh(
			new THREE.SphereGeometry(0.13, 16, 12),
			new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthTest: false })
		);
		wScene.add(wCenterHalo);

		wCenterDot = new THREE.Mesh(
			new THREE.SphereGeometry(0.06, 16, 12),
			new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })
		);
		wScene.add(wCenterDot);

		// Hover-Dot
		wHoverDot = new THREE.Mesh(
			new THREE.SphereGeometry(0.065, 12, 8),
			new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0, depthTest: false })
		);
		wScene.add(wHoverDot);

		// Contact-Dot
		wContactDot = new THREE.Mesh(
			new THREE.SphereGeometry(0.07, 12, 8),
			new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0, depthTest: false })
		);
		wScene.add(wContactDot);

		// Pfeil (Tube + Kegel) mit ShaderMaterial
		const _dc = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,1));
		wArrow = new THREE.Mesh(
			new THREE.TubeGeometry(_dc, 12, 0.028, 6, false),
			new THREE.ShaderMaterial({
				transparent: true, depthTest: false,
				uniforms: { uOpacity: { value: 0.0 } },
				vertexShader: `varying float vT; void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: `uniform float uOpacity; varying float vT; void main() { float a = uOpacity*(1.0-vT*vT); gl_FragColor = vec4(1.0,0.8,0.0,a); }`
			})
		);
		wScene.add(wArrow);

		wArrowHead = new THREE.Mesh(
			new THREE.ConeGeometry(0.07, 0.22, 10),
			new THREE.ShaderMaterial({
				transparent: true, depthTest: false,
				uniforms: { uOpacity: { value: 0.0 } },
				vertexShader: `varying float vY; void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
				fragmentShader: `uniform float uOpacity; varying float vY; void main() { float a = uOpacity*(1.0-vY); gl_FragColor = vec4(1.0,0.8,0.0,a); }`
			})
		);
		wScene.add(wArrowHead);

		const s = 1.4;
		wCamera = new THREE.OrthographicCamera(-s, s, s, -s, 0.1, 20);
		wCamera.position.set(0, 0, 5);
		wCamera.lookAt(0, 0, 0);

		wRenderer = new THREE.WebGLRenderer({ canvas: ballCanvas, antialias: true, alpha: true });
		wRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		wRenderer.setSize(ballCanvas.clientWidth, ballCanvas.clientHeight, false);

		updateWidgetMarkers(null, hasContact ? contactPoint : null, hasContact);
	}

	function placeWidgetArrow(u, v, opacity) {
		const depth = Math.sqrt(Math.max(0, 1 - u * u - v * v));
		const nx = -u, ny = -v, nz = -depth;
		const OFF = 0.12, LEN = 1.55;
		const sx = u * W_R + nx * OFF,  sy = v * W_R + ny * OFF,  sz = depth * W_R + nz * OFF;
		const ex = sx + nx * LEN,        ey = sy + ny * LEN,        ez = sz + nz * LEN;
		wArrow.geometry.dispose();
		wArrow.geometry = new THREE.TubeGeometry(
			new THREE.LineCurve3(new THREE.Vector3(sx, sy, sz), new THREE.Vector3(ex, ey, ez)),
			12, 0.028, 6, false
		);
		wArrow.material.uniforms.uOpacity.value = opacity;
		wArrowHead.position.set(ex, ey, ez);
		const q = new THREE.Quaternion();
		q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(nx, ny, nz).normalize());
		wArrowHead.setRotationFromQuaternion(q);
		wArrowHead.material.uniforms.uOpacity.value = opacity;
	}

	function updateWidgetMarkers(hover = null, contact = null, active = false) {
		if (!wContactDot) return;
		const src     = (active && contact) ? contact : hover;
		const arrowOp = (active && contact) ? 0.92 : (hover ? 0.55 : 0.0);

		if (hover) {
			const d = Math.sqrt(Math.max(0, 1 - hover.u**2 - hover.v**2));
			wHoverDot.position.set(hover.u * W_R, hover.v * W_R, d * W_R);
			wHoverDot.material.opacity = (active && contact) ? 0.5 : 0.85;
		} else {
			wHoverDot.material.opacity = 0;
		}

		if (active && contact) {
			const d = Math.sqrt(Math.max(0, 1 - contact.u**2 - contact.v**2));
			wContactDot.position.set(contact.u * W_R, contact.v * W_R, d * W_R);
			wContactDot.material.opacity = 1.0;
		} else {
			wContactDot.material.opacity = 0;
		}

		if (src) {
			placeWidgetArrow(src.u, src.v, arrowOp);
		} else {
			wArrow.material.uniforms.uOpacity.value     = 0;
			wArrowHead.material.uniforms.uOpacity.value = 0;
		}

		if (wRenderer && wScene && wCamera) wRenderer.render(wScene, wCamera);
	}

	// ─── Ball-Widget Interaktion ──────────────────────────────────────────────────

	function widgetInteract(event, isClick) {
		if (phase === 'flying') return;
		const rect = event.currentTarget.getBoundingClientRect();
		const dx =  (event.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2);
		const dy = -(event.clientY - rect.top   - rect.height / 2) / (rect.height / 2);
		if (Math.sqrt(dx * dx + dy * dy) > 1.0) {
			hoverPoint = null;
			updateWidgetMarkers(null, contactPoint, hasContact);
			return;
		}
		hoverPoint = { u: dx, v: dy };
		if (isClick) {
			contactPoint = { u: dx, v: dy };
			hasContact   = true;
			updateWidgetMarkers(null, contactPoint, true);
		} else {
			updateWidgetMarkers(hoverPoint, contactPoint, hasContact);
		}
	}

	function onWidgetMouseMove(e)  { widgetInteract(e, false); }
	function onWidgetMouseLeave()  {
		hoverPoint = null;
		updateWidgetMarkers(null, contactPoint, hasContact);
		if (wRenderer) wRenderer.render(wScene, wCamera);
	}
	function onWidgetClick(e)      { widgetInteract(e, true); }

	// ─── Treffpunkt-Marker am Hauptball ──────────────────────────────────────────

	function updateContactMarker() {
		if (!contactMarker || !ballMesh) return;
		if (!hasContact) { contactMarker.material.opacity = 0; return; }
		const u = contactPoint.u, v = contactPoint.v;
		const d = Math.sqrt(Math.max(0, 1 - u * u - v * v));
		contactMarker.position.set(
			ballMesh.position.x + u * BALL_R,
			ballMesh.position.y + v * BALL_R,
			ballMesh.position.z + d * BALL_R
		);
		contactMarker.material.opacity = 1.0;
	}

	// ─── Ball Reset ───────────────────────────────────────────────────────────────

	function resetBall() {
		if (!ballMesh) return;
		const h = getHeight();
		ballMesh.position.set(serveWorldX, h, serveWorldZ);
		shadowCircle.position.set(serveWorldX, 0.012, serveWorldZ);
		if (posMarker) posMarker.position.set(serveWorldX, 0.013, serveWorldZ);
		impactRing.material.opacity = 0;
		impactRing.scale.set(1, 1, 1);
		ballMesh.rotation.set(0, 0, 0);
		updateContactMarker();
	}

	// ─── Aufschlag ────────────────────────────────────────────────────────────────

	function startServe() {
		if (phase === 'flying' || !hasContact) return;
		const h = getHeight();
		ballMesh.position.set(serveWorldX, h, serveWorldZ);

		// Abflugvektor direkt aus computeInitialVelocity (einheitliche Physik)
		const vel = computeInitialVelocity();

		ballState.pos.copy(ballMesh.position);
		ballState.vel.copy(vel);
		ballState.active = true;

		phase       = 'flying';
		resultLabel = '';
		impactRing.material.opacity = 0;
		dirty.previewVis = false;
		dirty.preview    = true;
	}

	// ─── Animations-Loop ──────────────────────────────────────────────────────────

	function tick(now) {
		animFrameId = requestAnimationFrame(tick);
		const dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;

		// ── Netz-Animation ────────────────────────────────────────────────────
		if (netBand && Math.abs(netCurrentY - netTargetY) > 0.0005) {
			const step = NET_ANIM_SPEED * dt;
			const diff = netTargetY - netCurrentY;
			netCurrentY += Math.sign(diff) * Math.min(Math.abs(diff), step);
			applyNetHeight(netCurrentY);
			// Vorschau nach Netz-Bewegung ebenfalls neu zeichnen
			if (!ballState.active) dirty.preview = true;
		}

		// ── Kamera-Lerp ───────────────────────────────────────────────────────
		if (camDirty && camera) {
			const t = Math.min(1, CAM_LERP_SPEED * dt);
			camCurPos.x    = lerp(camCurPos.x,    camTargetPos.x,    t);
			camCurPos.y    = lerp(camCurPos.y,    camTargetPos.y,    t);
			camCurPos.z    = lerp(camCurPos.z,    camTargetPos.z,    t);
			camCurLookAt.x = lerp(camCurLookAt.x, camTargetLookAt.x, t);
			camCurLookAt.y = lerp(camCurLookAt.y, camTargetLookAt.y, t);
			camCurLookAt.z = lerp(camCurLookAt.z, camTargetLookAt.z, t);
			camera.position.set(camCurPos.x, camCurPos.y, camCurPos.z);
			camera.lookAt(camCurLookAt.x, camCurLookAt.y, camCurLookAt.z);
			// Prüfen ob Ziel nah genug erreicht
			const dp = Math.abs(camCurPos.x - camTargetPos.x) + Math.abs(camCurPos.y - camTargetPos.y) + Math.abs(camCurPos.z - camTargetPos.z);
			const dl = Math.abs(camCurLookAt.x - camTargetLookAt.x) + Math.abs(camCurLookAt.y - camTargetLookAt.y) + Math.abs(camCurLookAt.z - camTargetLookAt.z);
			if (dp < 0.002 && dl < 0.002) camDirty = false;
		}

		// ── Dirty: Ball-Position ──────────────────────────────────────────────
		if (dirty.ball && ballMesh && !ballState.active) {
			dirty.ball = false;
			resetBall();
		}

		// ── Dirty: Vorschau ───────────────────────────────────────────────────
		if (dirty.preview && forceArrow && !ballState.active) {
			dirty.preview = false;
			updateFieldPreview(dirty.previewVis, dirty.previewCp, dirty.previewOp);
		}

		if (ballState.active) {
			ballState.vel.y -= G * dt;
			ballState.pos.addScaledVector(ballState.vel, dt);
			ballMesh.rotation.x -= ballState.vel.z * dt * 1.8;
			ballMesh.rotation.z += ballState.vel.x * dt * 1.8;
			ballMesh.position.copy(ballState.pos);
			if (contactMarker) contactMarker.material.opacity = 0;

			shadowCircle.position.set(ballState.pos.x, 0.012, ballState.pos.z);
			const ss = Math.max(0.08, 1 - ballState.pos.y * 0.06);
			shadowCircle.scale.set(ss, ss, ss);

			// Netz-Kollision
			if (ballState.pos.z <= BALL_R && ballState.pos.z >= -BALL_R - 0.15) {
				if (ballState.pos.y < netHeight + BALL_R && Math.abs(ballState.pos.x) <= FIELD_W / 2 + 0.3) {
					ballState.active = false;
					phase = 'net';
					resultLabel = 'Netz! Aufschlag ungültig.';
				}
			}
			// Boden-Kollision
			if (ballState.pos.y <= BALL_R) {
				ballState.pos.y = BALL_R;
				ballState.active = false;
				ballMesh.position.copy(ballState.pos);
				const ix = ballState.pos.x, iz = ballState.pos.z;
				const inField = Math.abs(ix) <= FIELD_W / 2 && iz <= 0 && iz >= -FIELD_HALF_D;
				if (inField) {
					phase = 'landed';
					resultLabel = 'Punkt! Aufschlag landet im Feld.';
					impactRing.position.set(ix, 0.02, iz);
					impactRing.material.opacity = 0.9;
					impactRing.scale.set(1, 1, 1);
					// Dauerhafter Landemarker
					landingMarker.position.set(ix, 0.019, iz);
					setLandingMarkerOpacity(1.0);
				} else if (iz > 0) {
					phase = 'out'; resultLabel = 'Zu kurz! Ball landet im eigenen Feld.';
				} else {
					phase = 'out'; resultLabel = 'Aus! Ball landet außerhalb des Feldes.';
					setFieldOutColor(true);
				}
			}
			if (Math.abs(ballState.pos.z) > 28 || Math.abs(ballState.pos.x) > 20 || ballState.pos.y > 25) {
				ballState.active = false; phase = 'out'; resultLabel = 'Aus!';
				if (ballState.pos.z < 0) setFieldOutColor(true);
			}
		}

		if ((phase === 'landed' || phase === 'net' || phase === 'out') && impactRing.material.opacity > 0) {
			impactRing.material.opacity -= 0.007;
			impactRing.scale.x += 0.022;
			impactRing.scale.y += 0.022;
		}

		renderer.render(scene, camera);
	}

	// ─── Reset ────────────────────────────────────────────────────────────────────

	function resetSimulation() {
		ballState.active = false;
		phase = 'idle';
		resultLabel = '';
		impactRing.material.opacity = 0;
		shadowCircle.scale.set(1, 1, 1);
		setLandingMarkerOpacity(0);
		setNetHitColor(false);
		setFieldOutColor(false);
		dirty.ball       = true;
		dirty.preview    = true;
		dirty.previewVis = hasContact;
		dirty.previewCp  = { ...contactPoint };
		dirty.previewOp  = 1.0;
	}

	// ─── Resize ───────────────────────────────────────────────────────────────────

	function onResize() {
		if (!canvas || !renderer || !camera) return;
		const w = canvas.clientWidth, h = canvas.clientHeight;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────────

	onMount(async () => {
		THREE = await import('three');
		ballState.pos = new THREE.Vector3();
		ballState.vel = new THREE.Vector3();
		buildRenderer();
		buildCamera();
		buildScene();
		buildWidgetScene();
		window.addEventListener('resize', onResize);
		requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (!browser) return;
		if (animFrameId) cancelAnimationFrame(animFrameId);
		if (renderer)  renderer.dispose();
		if (wRenderer) wRenderer.dispose();
		window.removeEventListener('resize', onResize);
	});

	// Ball-Position + Höhe → dirty.ball setzen
	$effect(() => {
		const _sp = servePos;
		const _sh = serveHeight;
		const _ph = phase;
		if (_ph !== 'flying') dirty.ball = true;
	});

	// Treffpunkt-Marker → dirty.ball (resetBall ruft updateContactMarker auf)
	$effect(() => {
		const _cp = contactPoint;
		const _hc = hasContact;
		const _ph = phase;
		if (_ph !== 'flying') dirty.ball = true;
	});

	// Netzhöhe: Zielwert setzen, Animation läuft im tick()
	$effect(() => {
		netTargetY = netHeight;
	});

	// Kamera-Perspektive: Zielwerte setzen, Lerp läuft im tick()
	$effect(() => {
		const view = camView;
		if (!camera) return; // noch nicht initialisiert
		const preset = getCamPreset(view);
		camTargetPos    = { ...preset.pos };
		camTargetLookAt = { ...preset.lookAt };
		camDirty = true;
	});

	// ─── LocalStorage-Persistenz ─────────────────────────────────────────────────
	$effect(() => { lsSave({ strength }); });
	$effect(() => { lsSave({ serveHeight }); });
	$effect(() => { lsSave({ genderMode }); });
	$effect(() => { lsSave({ camView }); });
	$effect(() => { lsSave({ servePos }); });
	$effect(() => { lsSave({ contactPoint, hasContact }); });

	// Kraftvektor + Flugbahn → dirty.preview setzen
	$effect(() => {
		const _s  = strength;
		const _sh = serveHeight;
		const _sp = servePos;
		const _g  = genderMode;
		const hp  = hoverPoint;
		const cp  = contactPoint;
		const hc  = hasContact;
		const ph  = phase;

		if (ph === 'flying') {
			dirty.previewVis = false;
			dirty.preview    = true;
			return;
		}
		if (hp) {
			dirty.previewVis = true;
			dirty.previewCp  = hp;
			dirty.previewOp  = 0.45;
		} else if (hc) {
			dirty.previewVis = true;
			dirty.previewCp  = { ...cp };
			dirty.previewOp  = 1.0;
		} else {
			dirty.previewVis = false;
		}
		dirty.preview = true;
	});

	// ─── Derived Labels ───────────────────────────────────────────────────────────
	let strengthCategory = $derived(strength < 33 ? 'Leicht' : strength < 66 ? 'Mittel' : 'Hart');
	let strengthImpulse  = $derived(getImpulse().toFixed(2));
	let heightLabel   = $derived(
		serveHeight < 40 ? `Stand (${getHeight().toFixed(1)} m)`
		: serveHeight > 70 ? `Jump (${getHeight().toFixed(1)} m)`
		: `Mittel (${getHeight().toFixed(1)} m)`
	);

	function pointDescription(pt) {
		if (!pt) return null;
		const vDesc = pt.v >  0.25 ? 'oben'  : pt.v < -0.25 ? 'unten'  : '';
		const uDesc = pt.u >  0.25 ? 'rechts' : pt.u < -0.25 ? 'links' : '';
		if (vDesc && uDesc) return `${vDesc}-${uDesc}`;
		return vDesc || uDesc || 'Mitte';
	}
	let displayDesc = $derived(
		hoverPoint  ? pointDescription(hoverPoint)
		: hasContact ? pointDescription(contactPoint)
		: null
	);
</script>

<div class="service-sim">

	<!-- ── 3D Feld ──────────────────────────────────────────────────────────────── -->
	<div class="canvas-wrapper">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<canvas bind:this={canvas} onclick={onFieldClick} style="cursor: crosshair;"></canvas>

		<!-- Perspektive-Toggle oben rechts -->
		<div class="cam-toggle">
			<button
				class="cam-btn"
				class:active={camView === 'player'}
				onclick={() => camView = 'player'}
				title="Spieler-Perspektive"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<rect x="1" y="9" width="14" height="5" rx="1" stroke="currentColor" stroke-width="1.4"/>
					<path d="M1 9 L8 3 L15 9" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
					<circle cx="8" cy="5.5" r="1.2" fill="currentColor"/>
				</svg>
				Spieler
			</button>
			<button
				class="cam-btn"
				class:active={camView === 'iso'}
				onclick={() => camView = 'iso'}
				title="Isometrische Übersicht"
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M8 2 L14 5.5 L14 10.5 L8 14 L2 10.5 L2 5.5 Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
					<path d="M8 2 L8 14 M2 5.5 L14 5.5" stroke="currentColor" stroke-width="1" stroke-dasharray="2 1.5" opacity="0.6"/>
				</svg>
				&Uuml;bersicht
			</button>
		</div>

		{#if phase === 'flying'}
			<div class="canvas-badge">Ball fliegt…</div>
		{/if}
		{#if phase === 'idle' || phase === 'landed' || phase === 'net' || phase === 'out'}
			<div class="canvas-hint">Klick ins Feld = Service-Position wählen</div>
		{/if}
	</div>

	<!-- ── Controls ─────────────────────────────────────────────────────────────── -->
	<div class="controls">
		<div class="controls-main">

			<!-- Ball-Widget -->
			<div class="ball-picker">
				<div class="ball-picker-label">Treffpunkt</div>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="ball-canvas-wrap"
					onmousemove={onWidgetMouseMove}
					onmouseleave={onWidgetMouseLeave}
					onclick={onWidgetClick}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && onWidgetClick(e)}
					aria-label="Treffpunkt auf dem Ball auswählen"
				>
					<canvas bind:this={ballCanvas}></canvas>
				</div>
				<div class="ball-info">
					{#if displayDesc}
						<span class="ball-info-label" class:is-hover={!!hoverPoint}>{displayDesc}</span>
					{:else}
						<span class="ball-info-placeholder">Klicken zum Wählen</span>
					{/if}
				</div>
			</div>

			<!-- Params -->
			<div class="params">

				<!-- Netz-Toggle -->
				<div class="toggle-row">
					<span class="toggle-label">Netzh&ouml;he</span>
					<div class="toggle-group">
						<button
							class="toggle-btn"
							class:active={genderMode === 'men'}
							onclick={() => genderMode = 'men'}
							disabled={phase === 'flying'}
						>Herren (2,43 m)</button>
						<button
							class="toggle-btn"
							class:active={genderMode === 'women'}
							onclick={() => genderMode = 'women'}
							disabled={phase === 'flying'}
						>Damen (2,24 m)</button>
					</div>
				</div>

				<div class="control-group">
					<label for="strength-slider">
						Impuls
						<span class="lv">{strengthCategory} · {strengthImpulse} kg·m/s</span>
					</label>
					<input id="strength-slider" type="range" min="0" max="100"
						bind:value={strength} disabled={phase === 'flying'} class="slider" />
					<div class="slider-ticks">
						<span>{IMPULSE_MIN.toFixed(1)} N·s</span>
						<span>{((IMPULSE_MIN + IMPULSE_MAX) / 2).toFixed(1)} N·s</span>
						<span>{IMPULSE_MAX.toFixed(1)} N·s</span>
					</div>
				</div>

				<div class="control-group">
					<label for="height-slider">
						Schlaghohe <span class="lv">{heightLabel}</span>
					</label>
					<input id="height-slider" type="range" min="0" max="100"
						bind:value={serveHeight} disabled={phase === 'flying'} class="slider" />
					<div class="slider-ticks"><span>Stand</span><span>Mittel</span><span>Jump</span></div>
				</div>

				<div class="contact-box">
					{#if !hasContact}
						<span class="contact-hint-txt">Treffpunkt auf dem Ball w&auml;hlen</span>
					{:else}
						<div class="contact-chosen">
							<span class="dot"></span>
							<span>Treffpunkt: <strong>{pointDescription(contactPoint)}</strong></span>
						</div>
					{/if}
				</div>

				<div class="button-row">
					<button class="serve-btn" onclick={startServe}
						disabled={phase === 'flying' || !hasContact}>
						{phase === 'flying' ? 'Ball fliegt…' : 'Aufschlagen'}
					</button>
					{#if phase !== 'idle' && phase !== 'flying'}
						<button class="reset-btn" onclick={resetSimulation}>Zur&uuml;cksetzen</button>
					{/if}
				</div>

				{#if resultLabel}
					<div class="result" class:success={phase === 'landed'} class:failure={phase === 'net' || phase === 'out'}>
						{resultLabel}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.service-sim {
		width: 100%;
		max-width: 820px;
		margin: 2rem auto;
		background: #12121e;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 32px rgba(0,0,0,0.55);
		font-family: inherit;
	}

	/* ── 3D Canvas ── */
	.canvas-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 7;
		background: #0d1117;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	/* ── Kamera-Toggle ── */
	.cam-toggle {
		position: absolute;
		top: 10px;
		right: 10px;
		display: flex;
		gap: 0.25rem;
		z-index: 10;
	}

	.cam-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.28rem 0.6rem;
		font-size: 0.72rem;
		font-weight: 600;
		background: rgba(18, 18, 30, 0.82);
		color: #556;
		border: 1px solid rgba(60, 70, 110, 0.5);
		border-radius: 6px;
		cursor: pointer;
		backdrop-filter: blur(4px);
		transition: background 0.12s, color 0.12s, border-color 0.12s;
		white-space: nowrap;
		letter-spacing: 0.02em;
	}

	.cam-btn:hover { color: #99aacc; background: rgba(30, 35, 60, 0.92); }
	.cam-btn.active {
		background: rgba(45, 74, 170, 0.88);
		color: #ddeeff;
		border-color: rgba(80, 120, 220, 0.7);
	}

	.canvas-badge {
		position: absolute;
		bottom: 10px; left: 50%;
		transform: translateX(-50%);
		background: rgba(0,0,0,0.6);
		color: #bbb;
		font-size: 0.78rem;
		padding: 3px 12px;
		border-radius: 20px;
		pointer-events: none;
	}

	.canvas-hint {
		position: absolute;
		bottom: 10px; left: 50%;
		transform: translateX(-50%);
		color: #445;
		font-size: 0.72rem;
		pointer-events: none;
		white-space: nowrap;
	}

	/* ── Controls ── */
	.controls {
		padding: 1.1rem 1.3rem 1.3rem;
	}

	.controls-main {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 1.2rem;
		align-items: start;
	}

	@media (max-width: 520px) {
		.controls-main { grid-template-columns: 1fr; }
	}

	/* ── Ball Picker ── */
	.ball-picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.ball-picker-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #667;
	}

	.ball-canvas-wrap {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		overflow: hidden;
		cursor: crosshair;
		transition: box-shadow 0.15s;
		user-select: none;
		flex-shrink: 0;
	}

	.ball-canvas-wrap:hover {
		box-shadow: 0 0 0 3px rgba(255, 200, 50, 0.4);
	}

	.ball-canvas-wrap canvas {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.ball-info {
		min-height: 1.3rem;
		font-size: 0.72rem;
		text-align: center;
	}

	.ball-info-label {
		color: #ff8888;
		font-weight: 700;
	}

	.ball-info-label.is-hover { color: #ffcc44; }
	.ball-info-placeholder { color: #445; font-style: italic; }

	/* ── Params ── */
	.params {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* ── Netz-Toggle ── */
	.toggle-row {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}

	.toggle-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #8899bb;
		white-space: nowrap;
	}

	.toggle-group {
		display: flex;
		gap: 0.3rem;
	}

	.toggle-btn {
		padding: 0.3rem 0.65rem;
		font-size: 0.76rem;
		font-weight: 600;
		background: #1a1c30;
		color: #556;
		border: 1px solid #2a2d4a;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.12s, color 0.12s, border-color 0.12s;
	}

	.toggle-btn:hover:not(:disabled) { color: #99aacc; background: #22253a; }
	.toggle-btn.active {
		background: #2d4aaa;
		color: #fff;
		border-color: #4466cc;
	}
	.toggle-btn:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── Control Groups ── */
	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.control-group label {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		font-weight: 600;
		color: #8899bb;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.lv {
		font-weight: 700;
		color: #ccd;
		text-transform: none;
		letter-spacing: 0;
	}

	.slider {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 5px;
		border-radius: 3px;
		background: #2a2d4a;
		outline: none;
		cursor: pointer;
	}
	.slider:disabled { opacity: 0.4; cursor: not-allowed; }
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px; height: 16px;
		border-radius: 50%;
		background: #5577cc;
		border: 2px solid #99bbff;
		cursor: pointer;
		transition: transform 0.1s;
	}
	.slider:not(:disabled)::-webkit-slider-thumb:hover { transform: scale(1.25); }
	.slider::-moz-range-thumb {
		width: 16px; height: 16px;
		border-radius: 50%;
		background: #5577cc;
		border: 2px solid #99bbff;
		cursor: pointer;
	}

	.slider-ticks {
		display: flex;
		justify-content: space-between;
		font-size: 0.63rem;
		color: #445;
	}

	.contact-box {
		background: #1a1c30;
		border-radius: 7px;
		padding: 0.6rem 0.9rem;
		font-size: 0.82rem;
		min-height: 2.4rem;
		display: flex;
		align-items: center;
	}

	.contact-hint-txt { color: #445; font-style: italic; }

	.contact-chosen {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		color: #ccd;
	}

	.dot {
		width: 9px; height: 9px;
		border-radius: 50%;
		background: #ff4444;
		flex-shrink: 0;
		box-shadow: 0 0 6px #ff4444;
	}

	.button-row {
		display: flex;
		gap: 0.65rem;
	}

	.serve-btn {
		flex: 1;
		padding: 0.7rem 1rem;
		font-size: 0.95rem;
		font-weight: 700;
		background: #2d4aaa;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}
	.serve-btn:hover:not(:disabled) { background: #3d5acc; transform: translateY(-1px); }
	.serve-btn:active:not(:disabled) { transform: none; }
	.serve-btn:disabled { opacity: 0.45; cursor: not-allowed; }

	.reset-btn {
		padding: 0.7rem 1rem;
		font-size: 0.88rem;
		font-weight: 600;
		background: transparent;
		color: #556;
		border: 1px solid #2a2d4a;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}
	.reset-btn:hover { background: #1a1c30; color: #99aacc; }

	.result {
		text-align: center;
		padding: 0.6rem;
		border-radius: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		animation: fadeIn 0.3s ease;
	}
	.result.success { background: #162a16; color: #55cc55; border: 1px solid #224422; }
	.result.failure { background: #2a1616; color: #cc5555; border: 1px solid #442222; }

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(4px); }
		to   { opacity: 1; transform: translateY(0); }
	}
</style>
