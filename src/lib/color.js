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
