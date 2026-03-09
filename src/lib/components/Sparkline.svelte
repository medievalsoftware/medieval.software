<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {Float32Array | number[]} */
	export let data = [];
	/** @type {string} CSS color or var(--name) */
	export let color = 'var(--aqua)';
	/** @type {number} canvas height in CSS px */
	export let height = 32;
	/** @type {number} */
	export let min = 0;
	/** @type {number} */
	export let max = 1;
	/** @type {boolean} fill from baseline (min) up, or render as min/max envelope */
	export let filled = true;
	/** @type {number} stroke line width (0 = no stroke) */
	export let strokeWidth = 0;
	/** @type {boolean} show crosshair + value on hover */
	export let hover = false;
	/** @type {number} decimal places for hover label */
	export let precision = 2;
	/** @type {(value: number, index: number) => string} custom hover label formatter */
	export let format = null;

	let canvas;
	let ctx;
	let w = 0;
	let h = 0;
	let dpr = 1;
	let dirty = true;
	let resolvedColor = '#8ec07c';
	let fgColor = '#ebdbb2';
	let bgColor = '#282828';

	// Hover state
	let hoverIdx = -1;

	function resolveColors() {
		if (!canvas) return;
		let style = getComputedStyle(canvas);
		if (color.startsWith('var(')) {
			let varName = color.slice(4, -1).trim();
			resolvedColor = style.getPropertyValue(varName).trim() || '#8ec07c';
		} else {
			resolvedColor = color;
		}
		fgColor = style.getPropertyValue('--fg').trim() || '#ebdbb2';
		bgColor = style.getPropertyValue('--bg').trim() || '#282828';
	}

	function resize() {
		if (!canvas) return;
		let rect = canvas.parentElement.getBoundingClientRect();
		dpr = window.devicePixelRatio || 1;
		w = rect.width;
		h = height;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		resolveColors();
		dirty = true;
	}

	function idxToX(i, len) {
		return (i / (len - 1 || 1)) * w;
	}

	function draw() {
		if (!ctx || !w || !dirty) return;
		dirty = false;

		let len = data.length;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		if (len === 0) return;

		let range = max - min;
		if (range === 0) range = 1;

		function valToY(v) {
			return h - ((v - min) / range) * h;
		}

		let cols = Math.ceil(w);
		let resolved = resolvedColor;

		if (len <= cols * 2) {
			// Few samples: draw as line/fill per sample
			ctx.beginPath();
			for (let i = 0; i < len; i++) {
				let x = idxToX(i, len);
				let y = valToY(data[i] || 0);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}

			if (strokeWidth > 0) {
				ctx.strokeStyle = resolved;
				ctx.lineWidth = strokeWidth;
				ctx.stroke();
			}

			if (filled) {
				ctx.lineTo(w, h);
				ctx.lineTo(0, h);
				ctx.closePath();
				ctx.fillStyle = resolved;
				ctx.fill();
			}
		} else {
			// Many samples: min/max envelope per pixel column
			let maxYs = new Array(cols);
			let minYs = new Array(cols);
			let count = 0;
			for (let px = 0; px < cols; px++) {
				let s = Math.floor((px / cols) * len);
				let e = Math.min(len, Math.floor(((px + 1) / cols) * len));
				let mn = Infinity, mx = -Infinity;
				for (let i = s; i < e; i++) {
					let v = data[i] || 0;
					if (v < mn) mn = v;
					if (v > mx) mx = v;
				}
				if (mn === Infinity) continue;
				maxYs[count] = valToY(mx);
				minYs[count] = valToY(mn);
				count++;
			}
			if (count > 0) {
				ctx.beginPath();
				ctx.moveTo(0, maxYs[0]);
				for (let i = 1; i < count; i++) {
					ctx.lineTo(i, maxYs[i]);
				}
				if (filled) {
					for (let i = count - 1; i >= 0; i--) {
						ctx.lineTo(i, minYs[i]);
					}
					ctx.closePath();
					ctx.fillStyle = resolved;
					ctx.fill();
				} else {
					ctx.strokeStyle = resolved;
					ctx.lineWidth = strokeWidth || 1;
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(0, minYs[0]);
					for (let i = 1; i < count; i++) {
						ctx.lineTo(i, minYs[i]);
					}
					ctx.stroke();
				}
			}
		}

		// Hover crosshair + dot + label
		if (hover && hoverIdx >= 0 && hoverIdx < len) {
			let x = idxToX(hoverIdx, len);
			let val = data[hoverIdx] || 0;
			let y = valToY(val);

			// Vertical line
			ctx.strokeStyle = fgColor;
			ctx.globalAlpha = 0.3;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
			ctx.globalAlpha = 1;

			// Dot
			ctx.fillStyle = resolved;
			ctx.beginPath();
			ctx.arc(x, y, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = fgColor;
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Label
			let label = format ? format(val, hoverIdx) : val.toFixed(precision);
			ctx.font = "10px 'Fira Mono', monospace";
			let tw = ctx.measureText(label).width;
			let padX = 4, padY = 2;
			let lw = tw + padX * 2;
			let lh = 14;
			let lx = x + 8;
			let ly = Math.max(1, Math.min(h - lh - 1, y - lh / 2));
			// Flip to left side if it would overflow
			if (lx + lw > w - 2) lx = x - 8 - lw;

			ctx.fillStyle = bgColor;
			ctx.globalAlpha = 0.85;
			ctx.beginPath();
			ctx.roundRect(lx, ly, lw, lh, 2);
			ctx.fill();
			ctx.globalAlpha = 1;

			ctx.fillStyle = fgColor;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			ctx.fillText(label, lx + padX, ly + lh / 2);
		}
	}

	function onMouseMove(e) {
		if (!hover || data.length === 0) return;
		let rect = canvas.getBoundingClientRect();
		let mx = e.clientX - rect.left;
		let frac = mx / w;
		let idx = Math.round(frac * (data.length - 1));
		idx = Math.max(0, Math.min(data.length - 1, idx));
		if (idx !== hoverIdx) {
			hoverIdx = idx;
			dirty = true;
			draw();
		}
	}

	function onMouseLeave() {
		if (hoverIdx >= 0) {
			hoverIdx = -1;
			dirty = true;
			draw();
		}
	}

	$: if (data) dirty = true;
	$: if (color && canvas) { resolveColors(); dirty = true; }
	$: if (dirty && ctx) draw();

	onMount(() => {
		ctx = canvas.getContext('2d');
		resize();
		draw();
		window.addEventListener('resize', resize);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', resize);
		}
	});
</script>

<canvas
	bind:this={canvas}
	on:mousemove={onMouseMove}
	on:mouseleave={onMouseLeave}
	class="sparkline"
></canvas>

<style>
	.sparkline {
		display: block;
		width: 100%;
	}
</style>
