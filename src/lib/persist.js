import { browser } from '$app/environment';

const PREFIX = 'p5:';

/** @param {string} key */
export function loadProps(key) {
	if (!browser) return {};
	try {
		return JSON.parse(localStorage.getItem(PREFIX + key)) ?? {};
	} catch {
		return {};
	}
}

let timers = {};

/** @param {string} key @param {Record<string, any>} props */
export function saveProps(key, props) {
	if (!browser) return;
	clearTimeout(timers[key]);
	timers[key] = setTimeout(() => {
		localStorage.setItem(PREFIX + key, JSON.stringify(props));
	}, 300);
}
