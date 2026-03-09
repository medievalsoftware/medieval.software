/** @param {string} hex - e.g. '#ff8800' */
export function hexToRgb(hex) {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16),
	];
}

/** @param {number} r @param {number} g @param {number} b */
export function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

/** @param {number} c - linear sRGB channel (0-1) */
function srgbToLinear(c) {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** @param {number} c - linear channel (0-1) */
function linearToSrgb(c) {
	return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** @param {number} r @param {number} g @param {number} b - sRGB 0-255 */
export function rgbToOklab(r, g, b) {
	let lr = srgbToLinear(r / 255);
	let lg = srgbToLinear(g / 255);
	let lb = srgbToLinear(b / 255);

	let l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	let m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	let s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

	return [
		0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
	];
}

/** @param {number} L @param {number} a @param {number} b - OkLab */
export function oklabToRgb(L, a, b) {
	let l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	let m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	let s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;

	let lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	let lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

	return [
		Math.round(Math.max(0, Math.min(1, linearToSrgb(lr))) * 255),
		Math.round(Math.max(0, Math.min(1, linearToSrgb(lg))) * 255),
		Math.round(Math.max(0, Math.min(1, linearToSrgb(lb))) * 255),
	];
}

/**
 * Interpolate two hex colors.
 * @param {string} hex1 @param {string} hex2 @param {number} t
 * @param {'srgb'|'oklab'} space
 */
export function lerpColor(hex1, hex2, t, space = 'srgb') {
	let [r1, g1, b1] = hexToRgb(hex1);
	let [r2, g2, b2] = hexToRgb(hex2);

	if (space === 'oklab') {
		let [L1, a1, b1o] = rgbToOklab(r1, g1, b1);
		let [L2, a2, b2o] = rgbToOklab(r2, g2, b2);
		let [r, g, b] = oklabToRgb(
			L1 + (L2 - L1) * t,
			a1 + (a2 - a1) * t,
			b1o + (b2o - b1o) * t,
		);
		return rgbToHex(r, g, b);
	}

	return rgbToHex(
		r1 + (r2 - r1) * t,
		g1 + (g2 - g1) * t,
		b1 + (b2 - b1) * t,
	);
}
