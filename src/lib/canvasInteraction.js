import { writable } from 'svelte/store';

/**
 * Creates scroll hint state with auto-dismiss timer.
 * @param {number} duration ms before hint fades
 * @returns {{ visible: import('svelte/store').Writable<boolean>, show: () => void, destroy: () => void }}
 */
export function createScrollHint(duration = 1500) {
	const visible = writable(false);
	let timer;
	return {
		visible,
		show() {
			clearTimeout(timer);
			visible.set(true);
			timer = setTimeout(() => visible.set(false), duration);
		},
		destroy() {
			clearTimeout(timer);
		},
	};
}

/**
 * Returns true if the wheel event should be blocked (no Ctrl/Cmd held).
 * @param {WheelEvent} e
 */
export function shouldBlockWheel(e) {
	return !(e.ctrlKey || e.metaKey);
}

/**
 * Creates an inertia tracker for pan interactions.
 * Velocity is in viewport-units/ms (e.g. fraction/ms or months/ms).
 * @param {number} decayRate per-ms decay multiplier (default: Apple UIScrollView normal = 0.998)
 */
export function createInertia(decayRate = 0.998) {
	let velocity = 0;
	let lastX = 0;
	let lastTime = 0;
	let lastFrameTime = 0;

	return {
		get velocity() { return velocity; },
		set velocity(v) { velocity = v; },

		/** Call on pointerdown to reset velocity and record start position. */
		start(x) {
			velocity = 0;
			lastX = x;
			lastTime = performance.now();
		},

		/**
		 * Call on pointermove to track velocity.
		 * @param {number} x current clientX
		 * @param {number} viewWidth width in px of the pannable area
		 * @param {number} viewSpan current viewport span in viewport-units
		 */
		track(x, viewWidth, viewSpan) {
			let now = performance.now();
			let dt = now - lastTime;
			if (dt > 0) {
				let dxPx = x - lastX;
				let v = -(dxPx / viewWidth) * viewSpan / dt;
				// Smooth velocity to avoid spikes from infrequent mouse events
				velocity = velocity * 0.6 + v * 0.4;
			}
			lastX = x;
			lastTime = now;
		},

		/**
		 * Call once per animation frame. Returns the delta to apply to viewport position.
		 * Handles decay and threshold internally.
		 */
		applyFrame() {
			let now = performance.now();
			let dt = lastFrameTime ? now - lastFrameTime : 16;
			lastFrameTime = now;

			if (Math.abs(velocity) > 0.000001) {
				let delta = velocity * dt;
				velocity *= Math.pow(decayRate, dt);
				if (Math.abs(velocity) < 0.000001) velocity = 0;
				return delta;
			}
			return 0;
		},

		/** Kill velocity immediately. */
		kill() { velocity = 0; },

		/** Kill velocity if the last drag event was stale (>60ms ago). Call on pointerup. */
		staleCheck() {
			if (performance.now() - lastTime > 60) velocity = 0;
			// Reset frame timer so first animation frame uses default 16ms dt
			// instead of elapsed time since last animation ended
			lastFrameTime = 0;
		},

		get isMoving() { return Math.abs(velocity) > 0.000001; },
	};
}
