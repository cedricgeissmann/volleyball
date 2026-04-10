/**
 * Generiert statische SVG-Snapshots aus Animationen für Druckzwecke
 */

import { calculatePositions } from './animationEngine.js';

/**
 * Rendert eine Stickfigure-Position als SVG-String
 * @param {Object} positions - Berechnete Körper-Positionen
 * @param {Object} options - Rendering-Optionen
 * @returns {string} SVG-String
 */
function renderStickFigureToSVG(positions, options = {}) {
	const {
		color = '#333',
		strokeWidth = 3,
		viewBoxWidth = 200,
		viewBoxHeight = 250,
		centerX = 0,
		centerY = 0
	} = options;

	const lines = [];
	const circles = [];

	// Torso (Hüfte zu Brust)
	lines.push(`<line x1="${positions.hip.x}" y1="${positions.hip.y}" x2="${positions.chest.x}" y2="${positions.chest.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	// Hals
	lines.push(`<line x1="${positions.chest.x}" y1="${positions.chest.y}" x2="${positions.neck.x}" y2="${positions.neck.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	// Kopf
	circles.push(`<circle cx="${positions.head.x}" cy="${positions.head.y}" r="15" stroke="${color}" stroke-width="${strokeWidth}" fill="none"/>`);

	// Linker Arm
	lines.push(`<line x1="${positions.leftShoulder.x}" y1="${positions.leftShoulder.y}" x2="${positions.leftElbow.x}" y2="${positions.leftElbow.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.leftElbow.x}" y1="${positions.leftElbow.y}" x2="${positions.leftWrist.x}" y2="${positions.leftWrist.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.leftWrist.x}" y1="${positions.leftWrist.y}" x2="${positions.leftHand.x}" y2="${positions.leftHand.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	// Rechter Arm
	lines.push(`<line x1="${positions.rightShoulder.x}" y1="${positions.rightShoulder.y}" x2="${positions.rightElbow.x}" y2="${positions.rightElbow.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.rightElbow.x}" y1="${positions.rightElbow.y}" x2="${positions.rightWrist.x}" y2="${positions.rightWrist.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.rightWrist.x}" y1="${positions.rightWrist.y}" x2="${positions.rightHand.x}" y2="${positions.rightHand.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	// Linkes Bein
	lines.push(`<line x1="${positions.leftHipJoint.x}" y1="${positions.leftHipJoint.y}" x2="${positions.leftKnee.x}" y2="${positions.leftKnee.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.leftKnee.x}" y1="${positions.leftKnee.y}" x2="${positions.leftAnkleJoint.x}" y2="${positions.leftAnkleJoint.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.leftAnkleJoint.x}" y1="${positions.leftAnkleJoint.y}" x2="${positions.leftFoot.x}" y2="${positions.leftFoot.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	// Rechtes Bein
	lines.push(`<line x1="${positions.rightHipJoint.x}" y1="${positions.rightHipJoint.y}" x2="${positions.rightKnee.x}" y2="${positions.rightKnee.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.rightKnee.x}" y1="${positions.rightKnee.y}" x2="${positions.rightAnkleJoint.x}" y2="${positions.rightAnkleJoint.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
	lines.push(`<line x1="${positions.rightAnkleJoint.x}" y1="${positions.rightAnkleJoint.y}" x2="${positions.rightFoot.x}" y2="${positions.rightFoot.y}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);

	const viewBox = `${centerX - viewBoxWidth / 2} ${centerY - viewBoxHeight / 2} ${viewBoxWidth} ${viewBoxHeight}`;

	return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
${lines.join('\n')}
${circles.join('\n')}
</svg>`;
}

/**
 * Generiert einen SVG-Snapshot für einen bestimmten Keyframe einer Animation
 * @param {Object} animation - Animation-Daten (mit keyframes)
 * @param {number} keyframeIndex - Index des Keyframes (0 = Start, -1 = letzter Frame)
 * @param {Object} options - Rendering-Optionen
 * @returns {string} SVG-String
 */
export function generateAnimationSnapshot(animation, keyframeIndex = 0, options = {}) {
	if (!animation || !animation.keyframes || animation.keyframes.length === 0) {
		return '';
	}

	// Unterstütze negative Indizes (wie Python)
	const index = keyframeIndex < 0
		? animation.keyframes.length + keyframeIndex
		: keyframeIndex;

	const keyframe = animation.keyframes[index];
	if (!keyframe) {
		console.warn(`Keyframe ${keyframeIndex} nicht gefunden`);
		return '';
	}

	const positions = calculatePositions(keyframe.joints);
	return renderStickFigureToSVG(positions, options);
}

/**
 * Generiert SVG-Snapshots für Start und Ende einer Animation
 * Für Loop-Animationen wird der mittlere Keyframe als "Ende" verwendet
 * @param {Object} animation - Animation-Daten
 * @param {Object} options - Rendering-Optionen
 * @returns {{start: string, end: string}}
 */
export function generateStartEndSnapshots(animation, options = {}) {
	if (!animation || !animation.keyframes || animation.keyframes.length === 0) {
		return { start: '', end: '' };
	}
	
	const numKeyframes = animation.keyframes.length;
	let endIndex = -1; // Letzter Keyframe
	
	// Für Loop-Animationen: Prüfe ob erster und letzter Keyframe identisch sind
	if (animation.loop && numKeyframes >= 3) {
		const firstJoints = animation.keyframes[0].joints;
		const lastJoints = animation.keyframes[numKeyframes - 1].joints;
		
		// Prüfe ob alle Gelenkwinkel identisch sind
		const areIdentical = Object.keys(firstJoints).every(
			key => firstJoints[key] === lastJoints[key]
		);
		
		// Wenn identisch, nutze den mittleren Keyframe (maximale Auslenkung)
		if (areIdentical) {
			endIndex = Math.floor(numKeyframes / 2);
		}
	}
	
	return {
		start: generateAnimationSnapshot(animation, 0, options),
		end: generateAnimationSnapshot(animation, endIndex, options)
	};
}

/**
 * Generiert SVG-Snapshots für alle Keyframes einer Animation
 * @param {Object} animation - Animation-Daten
 * @param {Object} options - Rendering-Optionen
 * @returns {Array<string>} Array von SVG-Strings
 */
export function generateAllSnapshots(animation, options = {}) {
	if (!animation || !animation.keyframes) {
		return [];
	}

	return animation.keyframes.map((_, index) =>
		generateAnimationSnapshot(animation, index, options)
	);
}
