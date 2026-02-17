const TANGENT_FACTOR = 0.4;

/**
 * De Casteljau's algorithm bezier curve (6 lerps).
 * Matches AltCurve.Bezier1D from s&box AltCurves.
 * @param {number} t - interpolation 0-1
 * @param {number} p0 @param {number} p1 @param {number} p2 @param {number} p3
 * @returns {number}
 */
export function bezier1d(t, p0, p1, p2, p3) {
	const a = p0 + t * (p1 - p0);
	const b = p1 + t * (p2 - p1);
	const c = p2 + t * (p3 - p2);
	const d = a + t * (b - a);
	const e = b + t * (c - b);
	return d + t * (e - d);
}

/**
 * Compute auto tangent slope for a keyframe based on neighbors.
 * At endpoints (missing neighbor), slope = 0.
 * @param {import('./curve.js').Keyframe|null} prev
 * @param {import('./curve.js').Keyframe} point
 * @param {import('./curve.js').Keyframe|null} next
 * @returns {number} slope (rise/run)
 */
export function autoTangent(prev, point, next) {
	if (prev && next) return (next.y - prev.y) / (next.x - prev.x);
	return 0;
}

/**
 * Evaluate curve at parameter t (0-1).
 * Points sorted by x internally. Dispatches to cubic/linear/constant per segment.
 * @param {import('./curve.js').Keyframe[]} points
 * @param {number} t
 * @returns {number}
 */
export function sampleCurve(points, t) {
	if (!points || points.length === 0) return 0;

	const sorted = [...points].sort((a, b) => a.x - b.x);

	if (sorted.length === 1) return sorted[0].y;
	if (t <= sorted[0].x) return sorted[0].y;
	if (t >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

	// Find segment
	let i = 0;
	for (; i < sorted.length - 1; i++) {
		if (t >= sorted[i].x && t <= sorted[i + 1].x) break;
	}

	const a = sorted[i];
	const b = sorted[i + 1];
	const dx = b.x - a.x;

	if (dx === 0) return a.y;

	const interpT = (t - a.x) / dx;

	switch (a.interpolation) {
		case 'constant':
			return a.y;

		case 'linear':
			return a.y + (b.y - a.y) * interpT;

		case 'cubic':
		default:
			return bezier1d(
				interpT,
				a.y,
				a.y + a.tangentOut * dx * TANGENT_FACTOR,
				b.y - b.tangentIn * dx * TANGENT_FACTOR,
				b.y
			);
	}
}

/**
 * Generate SVG path `d` string by sampling the curve at regular intervals.
 * Y is inverted (SVG y-down → curve y-up).
 * @param {import('./curve.js').Keyframe[]} points
 * @param {number} w - SVG width
 * @param {number} h - SVG height
 * @param {number} [steps=100]
 * @returns {string}
 */
export function curvePathData(points, w, h, steps = 100) {
	if (!points || points.length === 0) return '';

	const parts = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const y = sampleCurve(points, t);
		const sx = t * w;
		const sy = (1 - y) * h;
		parts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(2)},${sy.toFixed(2)}`);
	}
	return parts.join(' ');
}

/**
 * @typedef {{
 *   x: number,
 *   y: number,
 *   interpolation: 'cubic' | 'linear' | 'constant',
 *   tangentIn: number,
 *   tangentOut: number,
 *   tangentMode: 'auto' | 'mirrored' | 'split'
 * }} Keyframe
 */
