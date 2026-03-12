<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {Float32Array | number[]} */
	export let data = [];
	/** @type {string} CSS color or var(--name) */
	export let color = 'var(--aqua)';
	/** @type {number} height in CSS px */
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

	/** @type {SVGSVGElement} */
	let svgEl;
	let w = 0;
	let h = 0;
	let hoverIdx = -1;
	let isTouching = false;

	// --- Layout ---

	function resize() {
		if (!svgEl) return;
		w = svgEl.getBoundingClientRect().width;
		h = height;
	}

	/**
	 * @param {number} i
	 * @param {number} len
	 */
	function idxToX(i, len) {
		return (i / (len - 1 || 1)) * w;
	}

	/**
	 * @param {number} v
	 * @param {number} range
	 */
	function valToY(v, range) {
		return h - ((v - min) / range) * h;
	}

	// --- Computed SVG data ---

	/**
	 * @param {Float32Array | number[]} d
	 * @param {number} width
	 * @param {number} height
	 */
	function computePaths(d, width, height) {
		let len = d.length;
		if (len === 0 || width <= 0) return null;

		let range = max - min;
		if (range === 0) range = 1;

		let cols = Math.ceil(width);

		if (len <= cols * 2) {
			// Few samples: line per sample
			let pts = '';
			for (let i = 0; i < len; i++) {
				let x = idxToX(i, len);
				let y = valToY(d[i] || 0, range);
				pts += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
			}
			let fillPath = null;
			if (filled) {
				fillPath = pts + `L${width.toFixed(1)},${height}L0,${height}Z`;
			}
			return { linePath: pts, fillPath, mode: 'line' };
		} else {
			// Many samples: min/max envelope per pixel column
			/** @type {number[]} */
			let maxYs = [];
			/** @type {number[]} */
			let minYs = [];
			for (let px = 0; px < cols; px++) {
				let s = Math.floor((px / cols) * len);
				let e = Math.min(len, Math.floor(((px + 1) / cols) * len));
				let mn = Infinity, mx = -Infinity;
				for (let i = s; i < e; i++) {
					let v = d[i] || 0;
					if (v < mn) mn = v;
					if (v > mx) mx = v;
				}
				if (mn === Infinity) continue;
				maxYs.push(valToY(mx, range));
				minYs.push(valToY(mn, range));
			}
			if (maxYs.length === 0) return null;

			let count = maxYs.length;
			if (filled) {
				let path = 'M0,' + maxYs[0].toFixed(1);
				for (let i = 1; i < count; i++) {
					path += 'L' + i + ',' + maxYs[i].toFixed(1);
				}
				for (let i = count - 1; i >= 0; i--) {
					path += 'L' + i + ',' + minYs[i].toFixed(1);
				}
				path += 'Z';
				return { linePath: null, fillPath: path, mode: 'envelope' };
			} else {
				let topPath = 'M0,' + maxYs[0].toFixed(1);
				for (let i = 1; i < count; i++) {
					topPath += 'L' + i + ',' + maxYs[i].toFixed(1);
				}
				let bottomPath = 'M0,' + minYs[0].toFixed(1);
				for (let i = 1; i < count; i++) {
					bottomPath += 'L' + i + ',' + minYs[i].toFixed(1);
				}
				return { linePath: topPath, fillPath: bottomPath, mode: 'envelope-stroke' };
			}
		}
	}

	$: paths = computePaths(data, w, h);

	// --- Hover data ---

	$: hoverData = (() => {
		if (!hover || hoverIdx < 0 || hoverIdx >= data.length || w <= 0) return null;
		let range = max - min || 1;
		let val = data[hoverIdx] || 0;
		let x = idxToX(hoverIdx, data.length);
		let y = valToY(val, range);
		let label = format ? format(val, hoverIdx) : val.toFixed(precision);
		// Position label to right, flip to left if overflow
		let lx = x + 8;
		let labelW = label.length * 7.5 + 8;
		if (lx + labelW > w - 2) lx = x - 8 - labelW;
		let ly = Math.max(1, Math.min(h - 15, y - 7));
		return { x, y, label, lx, ly, labelW };
	})();

	// --- Mouse events ---

	/**
	 * @param {number} clientX
	 */
	function updateHoverFromClientX(clientX) {
		if (!hover || data.length === 0 || !svgEl) return;
		let rect = svgEl.getBoundingClientRect();
		let mx = clientX - rect.left;
		let frac = mx / w;
		let idx = Math.round(frac * (data.length - 1));
		idx = Math.max(0, Math.min(data.length - 1, idx));
		if (idx !== hoverIdx) hoverIdx = idx;
	}

	/** @param {MouseEvent} e */
	function onMouseMove(e) {
		if (isTouching) return;
		updateHoverFromClientX(e.clientX);
	}

	function onMouseLeave() {
		if (isTouching) return;
		if (hoverIdx >= 0) hoverIdx = -1;
	}

	// --- Touch events ---

	/** @param {TouchEvent} e */
	function onTouchStart(e) {
		if (!hover || e.touches.length !== 1) return;
		e.preventDefault();
		isTouching = true;
		updateHoverFromClientX(e.touches[0].clientX);
	}

	/** @param {TouchEvent} e */
	function onTouchMove(e) {
		if (!isTouching || e.touches.length !== 1) return;
		e.preventDefault();
		updateHoverFromClientX(e.touches[0].clientX);
	}

	/** @param {TouchEvent} e */
	function onTouchEnd(e) {
		if (!isTouching) return;
		isTouching = false;
		hoverIdx = -1;
	}

	// --- Lifecycle ---

	onMount(() => {
		resize();
		svgEl.addEventListener('touchstart', onTouchStart, { passive: false });
		svgEl.addEventListener('touchmove', onTouchMove, { passive: false });
		svgEl.addEventListener('touchend', onTouchEnd);
		window.addEventListener('resize', resize);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', resize);
			svgEl?.removeEventListener('touchstart', onTouchStart);
			svgEl?.removeEventListener('touchmove', onTouchMove);
			svgEl?.removeEventListener('touchend', onTouchEnd);
		}
	});
</script>

<svg
	bind:this={svgEl}
	width="100%"
	height={h}
	class="sparkline"
	on:mousemove={onMouseMove}
	on:mouseleave={onMouseLeave}
>
	{#if paths}
		{#if paths.fillPath}
			<path
				d={paths.fillPath}
				fill={filled ? color : 'none'}
				stroke={filled ? color : color}
				stroke-width={filled ? '1' : (strokeWidth || 1)}
			/>
		{/if}
		{#if paths.linePath && strokeWidth > 0}
			<path d={paths.linePath} fill="none" stroke={color} stroke-width={strokeWidth} />
		{/if}
		{#if paths.mode === 'envelope-stroke' && paths.fillPath}
			<path d={paths.fillPath} fill="none" stroke={color} stroke-width={strokeWidth || 1} />
		{/if}
	{/if}

	{#if hoverData}
		<!-- Crosshair -->
		<line
			x1={hoverData.x} y1={0}
			x2={hoverData.x} y2={h}
			stroke="var(--fg)" stroke-width="1" opacity="0.3"
		/>
		<!-- Dot -->
		<circle
			cx={hoverData.x} cy={hoverData.y} r="3.5"
			fill={color} stroke="var(--fg)" stroke-width="1.5"
		/>
		<!-- Label bg -->
		<rect
			x={hoverData.lx} y={hoverData.ly}
			width={hoverData.labelW} height={14}
			rx="2" fill="var(--bg)" opacity="0.85"
		/>
		<!-- Label text -->
		<text
			x={hoverData.lx + 4} y={hoverData.ly + 7}
			fill="var(--fg)"
			font-size="12" font-family="'Fira Mono', monospace"
			dominant-baseline="central"
		>{hoverData.label}</text>
	{/if}
</svg>

<style>
	.sparkline {
		display: block;
		width: 100%;
		touch-action: none;
	}
</style>
