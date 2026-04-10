/**
 * Animation Engine für Stickfigure-Animationen
 * Berechnet Skelett-Positionen basierend auf Gelenkwinkeln (Forward Kinematics)
 */

// Segment-Längen (in relativen Einheiten)
const SEGMENT_LENGTHS = {
	head: 20,
	neck: 10,
	torso: 40,
	upperArm: 25,
	lowerArm: 20,
	hand: 8,
	upperLeg: 30,
	lowerLeg: 30,
	foot: 10,
};

/**
 * Konvertiert Polarkoordinaten zu Kartesischen Koordinaten
 * @param {{x: number, y: number}} origin - Ausgangspunkt
 * @param {number} angle - Winkel in Grad (0° = rechts, 90° = unten, 180° = links, 270° = oben)
 * @param {number} distance - Distanz
 * @returns {{x: number, y: number}}
 */
function polarToCart(origin, angle, distance) {
	const rad = (angle * Math.PI) / 180;
	return {
		x: origin.x + distance * Math.cos(rad),
		y: origin.y + distance * Math.sin(rad),
	};
}

/**
 * Berechnet alle Skelett-Positionen aus Gelenkwinkeln
 * @param {Object} joints - Gelenk-Winkel
 * @returns {Object} Positionen aller Körperteile
 */
export function calculatePositions(joints) {
	const positions = {};

	// Standard-Werte falls Gelenke nicht definiert
	const defaultJoints = {
		spine: 90,
		leftShoulder: 270,
		rightShoulder: 270,
		leftElbow: 270,
		rightElbow: 270,
		leftWrist: 270,
		rightWrist: 270,
		leftHip: 270,
		rightHip: 270,
		leftKnee: 270,
		rightKnee: 270,
		leftAnkle: 90,
		rightAnkle: 90,
	};

	const j = { ...defaultJoints, ...joints };

	// Start bei Hüfte (Zentrum des Körpers)
	positions.hip = { x: 0, y: 0 };

	// Torso nach oben
	positions.chest = polarToCart(positions.hip, j.spine, SEGMENT_LENGTHS.torso);

	// Hals und Kopf
	positions.neck = polarToCart(positions.chest, j.spine, SEGMENT_LENGTHS.neck);
	positions.head = polarToCart(positions.neck, j.spine, SEGMENT_LENGTHS.head);

	// Schultern (links und rechts von der Brust)
	const shoulderWidth = 15;
	const shoulderAngle = j.spine + 90; // Senkrecht zur Wirbelsäule
	positions.leftShoulder = polarToCart(positions.chest, shoulderAngle, shoulderWidth);
	positions.rightShoulder = polarToCart(positions.chest, shoulderAngle + 180, shoulderWidth);

	// Linker Arm
	positions.leftElbow = polarToCart(
		positions.leftShoulder,
		j.leftShoulder,
		SEGMENT_LENGTHS.upperArm
	);
	positions.leftWrist = polarToCart(positions.leftElbow, j.leftElbow, SEGMENT_LENGTHS.lowerArm);
	positions.leftHand = polarToCart(positions.leftWrist, j.leftWrist, SEGMENT_LENGTHS.hand);

	// Rechter Arm
	positions.rightElbow = polarToCart(
		positions.rightShoulder,
		j.rightShoulder,
		SEGMENT_LENGTHS.upperArm
	);
	positions.rightWrist = polarToCart(
		positions.rightElbow,
		j.rightElbow,
		SEGMENT_LENGTHS.lowerArm
	);
	positions.rightHand = polarToCart(positions.rightWrist, j.rightWrist, SEGMENT_LENGTHS.hand);

	// Hüft-Gelenke (links und rechts von der Hüfte)
	const hipWidth = 10;
	const hipAngle = j.spine + 90; // Senkrecht zur Wirbelsäule
	positions.leftHipJoint = polarToCart(positions.hip, hipAngle, hipWidth);
	positions.rightHipJoint = polarToCart(positions.hip, hipAngle + 180, hipWidth);

	// Linkes Bein
	positions.leftKnee = polarToCart(
		positions.leftHipJoint,
		j.leftHip,
		SEGMENT_LENGTHS.upperLeg
	);
	positions.leftAnkleJoint = polarToCart(
		positions.leftKnee,
		j.leftKnee,
		SEGMENT_LENGTHS.lowerLeg
	);
	positions.leftFoot = polarToCart(
		positions.leftAnkleJoint,
		j.leftAnkle,
		SEGMENT_LENGTHS.foot
	);

	// Rechtes Bein
	positions.rightKnee = polarToCart(
		positions.rightHipJoint,
		j.rightHip,
		SEGMENT_LENGTHS.upperLeg
	);
	positions.rightAnkleJoint = polarToCart(
		positions.rightKnee,
		j.rightKnee,
		SEGMENT_LENGTHS.lowerLeg
	);
	positions.rightFoot = polarToCart(
		positions.rightAnkleJoint,
		j.rightAnkle,
		SEGMENT_LENGTHS.foot
	);

	return positions;
}

/**
 * Interpoliert linear zwischen zwei Werten
 * @param {number} start
 * @param {number} end
 * @param {number} t - Progress (0-1)
 * @returns {number}
 */
function lerp(start, end, t) {
	return start + (end - start) * t;
}

/**
 * Interpoliert zwischen zwei Keyframes
 * @param {Object} keyframe1
 * @param {Object} keyframe2
 * @param {number} t - Progress (0-1)
 * @returns {Object} Interpolierte Gelenk-Winkel
 */
export function interpolateKeyframes(keyframe1, keyframe2, t) {
	const joints = {};

	// Alle Gelenke aus beiden Keyframes sammeln
	const allJoints = new Set([
		...Object.keys(keyframe1.joints || {}),
		...Object.keys(keyframe2.joints || {}),
	]);

	for (const joint of allJoints) {
		const start = keyframe1.joints?.[joint] || 0;
		const end = keyframe2.joints?.[joint] || 0;
		joints[joint] = lerp(start, end, t);
	}

	return joints;
}

/**
 * Findet Keyframes für einen bestimmten Zeitpunkt und berechnet Interpolation
 * @param {Array} keyframes - Alle Keyframes
 * @param {number} time - Aktueller Zeitpunkt in ms
 * @param {number} duration - Gesamtdauer
 * @param {boolean} loop - Ob die Animation wiederholt werden soll
 * @returns {Object} Aktuelle Gelenk-Winkel
 */
export function getJointsAtTime(keyframes, time, duration, loop = false) {
	if (!keyframes || keyframes.length === 0) return {};

	// Bei Loop: Zeit modulo Duration
	let t = loop ? time % duration : Math.min(time, duration);

	// Sortiere Keyframes nach Zeit
	const sorted = [...keyframes].sort((a, b) => a.time - b.time);

	// Finde umschließende Keyframes
	let before = sorted[0];
	let after = sorted[sorted.length - 1];

	for (let i = 0; i < sorted.length - 1; i++) {
		if (sorted[i].time <= t && sorted[i + 1].time >= t) {
			before = sorted[i];
			after = sorted[i + 1];
			break;
		}
	}

	// Wenn exakt auf einem Keyframe
	if (before.time === after.time) {
		return before.joints;
	}

	// Interpoliere
	const progress = (t - before.time) / (after.time - before.time);
	return interpolateKeyframes(before, after, progress);
}

/**
 * Erstellt Keyframes für Web Animations API
 * @param {Object} animData - Animation-Daten
 * @returns {Array} Web Animation Keyframes
 */
export function createWebAnimationKeyframes(animData) {
	if (!animData || !animData.keyframes) return [];

	return animData.keyframes.map((kf) => ({
		...kf.joints,
		offset: kf.time / animData.duration,
	}));
}

/**
 * Berechnet Bounding Box für die Animation
 * @param {Array} keyframes - Alle Keyframes
 * @returns {{minX: number, maxX: number, minY: number, maxY: number}}
 */
export function calculateBoundingBox(keyframes) {
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const keyframe of keyframes) {
		const positions = calculatePositions(keyframe.joints);

		for (const pos of Object.values(positions)) {
			minX = Math.min(minX, pos.x);
			maxX = Math.max(maxX, pos.x);
			minY = Math.min(minY, pos.y);
			maxY = Math.max(maxY, pos.y);
		}
	}

	return { minX, maxX, minY, maxY };
}
