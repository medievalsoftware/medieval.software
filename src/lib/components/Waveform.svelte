<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {Float32Array | number[]} */
	export let data = [];
	/** @type {string} */
	export let color = 'var(--aqua)';
	/** @type {number} */
	export let height = 120;
	/** @type {number} */
	export let min = -1;
	/** @type {number} */
	export let max = 1;
	/** @type {number | { value: number, label?: string }[]} */
	export let gridY = 0;
	/** @type {number | { pos: number, label?: string }[]} */
	export let gridX = 0;
	/** @type {number} base interval in samples for adaptive X subdivisions (0 = off) */
	export let xSubdiv = 0;

	let canvas;
	let ctx;
	let w = 0;
	let h = 0;
	let dpr = 1;
	let raf = 0;
	let dirty = true;
	let marginLeft = 0;
	let plotW = 0;

	// Viewport: 0..1 range over data
	let viewStart = 0;
	let viewEnd = 1;
	let targetStart = 0;
	let targetEnd = 1;
	const minSpan = 0.001; // minimum visible fraction

	// Interaction
	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;
	const dragThreshold = 4;

	// Touch
	let pinchStartDist = 0;
	let pinchStartStart = 0;
	let pinchStartEnd = 0;
	let pinchAnchorFrac = 0.5;
	let touchStartPos = null;
	let touchLocked = null;

	function clampView() {
		let span = viewEnd - viewStart;
		span = Math.max(minSpan, Math.min(1, span));
		viewStart = Math.max(0, Math.min(1 - span, viewStart));
		viewEnd = viewStart + span;
	}

	function clampTarget() {
		let span = targetEnd - targetStart;
		span = Math.max(minSpan, Math.min(1, span));
		targetStart = Math.max(0, Math.min(1 - span, targetStart));
		targetEnd = targetStart + span;
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
		dirty = true;
	}

	function draw() {
		if (!ctx || !w) return;

		// Lerp viewport
		let lerpAmt = 0.4;
		let prevStart = viewStart;
		let prevEnd = viewEnd;
		viewStart += (targetStart - viewStart) * lerpAmt;
		viewEnd += (targetEnd - viewEnd) * lerpAmt;
		let animating = Math.abs(viewStart - targetStart) > 0.00001 || Math.abs(viewEnd - targetEnd) > 0.00001;
		if (!animating) { viewStart = targetStart; viewEnd = targetEnd; }
		clampView();

		if (Math.abs(viewStart - prevStart) > 0.000001 || Math.abs(viewEnd - prevEnd) > 0.000001) {
			dirty = true;
		}

		if (!dirty && !animating) {
			raf = requestAnimationFrame(draw);
			return;
		}
		dirty = false;

		let len = data.length;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		if (len === 0) {
			raf = requestAnimationFrame(draw);
			return;
		}

		// Resolve CSS colors
		let resolved = color;
		if (color.startsWith('var(')) {
			let varName = color.slice(4, -1).trim();
			resolved = getComputedStyle(canvas).getPropertyValue(varName).trim() || '#8ec07c';
		}
		let style = getComputedStyle(canvas);
		let gridColor = style.getPropertyValue('--bg3').trim() || '#665c54';
		let labelColor = style.getPropertyValue('--fg4').trim() || '#a89984';

		// Build gridline arrays
		let yLines = [];
		if (typeof gridY === 'number' && gridY > 0) {
			for (let i = 0; i <= gridY; i++) {
				let value = max - (i / gridY) * (max - min);
				let label = value === 0 ? '0' : value.toFixed(1);
				yLines.push({ value, label });
			}
		} else if (Array.isArray(gridY)) {
			yLines = gridY.map(g => typeof g === 'number' ? { value: g } : g);
		}

		let xLines = [];
		if (typeof gridX === 'number' && gridX > 0) {
			for (let i = 0; i <= gridX; i++) {
				let pos = Math.floor((i / gridX) * len);
				xLines.push({ pos, label: String(pos) });
			}
		} else if (Array.isArray(gridX)) {
			xLines = gridX.map(g => typeof g === 'number' ? { pos: g } : g);
		}

		// Adaptive X subdivisions
		let xSubLines = [];
		if (xSubdiv > 0) {
			let visibleSamples = (viewEnd - viewStart) * len;
			let interval = xSubdiv;
			let minVisible = 8;
			// Halve interval until we have enough visible gridlines
			while (visibleSamples / interval < minVisible && interval > 1) {
				interval = Math.floor(interval / 2);
			}
			// Generate sub-gridlines across the visible range
			let firstTick = Math.ceil((viewStart * len) / interval) * interval;
			// Collect major positions for duplicate check
			let majorSet = new Set(xLines.map(l => l.pos));
			for (let pos = firstTick; pos < viewEnd * len; pos += interval) {
				if (majorSet.has(pos) || pos === 0) continue;
				let secs = pos / xSubdiv;
				let label;
				if (secs === Math.floor(secs)) {
					label = secs + 's';
				} else {
					// Show as decimal seconds, trim trailing zeros
					let decimals = Math.max(1, Math.ceil(-Math.log10(interval / xSubdiv)));
					label = secs.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '') + 's';
				}
				xSubLines.push({ pos, label });
			}
		}

		// Compute margins
		let hasYLabels = yLines.some(l => l.label);
		marginLeft = hasYLabels ? 36 : 0;
		let marginTop = 8;
		let marginBottom = (xLines.some(l => l.label) || xSubLines.length > 0) ? 16 : 0;
		plotW = w - marginLeft;
		let plotH = h - marginTop - marginBottom;
		let range = max - min;

		function valToY(v) {
			return marginTop + plotH - ((v - min) / range) * plotH;
		}

		function idxToX(idx) {
			let frac = idx / len;
			let vFrac = (frac - viewStart) / (viewEnd - viewStart);
			return marginLeft + vFrac * plotW;
		}

		// Draw Y gridlines
		ctx.font = '9px sans-serif';
		ctx.textBaseline = 'middle';
		for (let line of yLines) {
			let y = valToY(line.value);
			if (y < marginTop || y > marginTop + plotH) continue;
			ctx.strokeStyle = gridColor;
			ctx.lineWidth = 1;
			ctx.globalAlpha = line.value === 0 ? 0.3 : 0.15;
			ctx.setLineDash(line.value === 0 ? [] : [3, 4]);
			ctx.beginPath();
			ctx.moveTo(marginLeft, y);
			ctx.lineTo(w, y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;

			if (line.label) {
				ctx.fillStyle = labelColor;
				ctx.globalAlpha = 0.6;
				ctx.textAlign = 'right';
				ctx.fillText(line.label, marginLeft - 4, y);
				ctx.globalAlpha = 1;
			}
		}

		// Draw X gridlines
		let startIdx = Math.floor(viewStart * len);
		let endIdx = Math.ceil(viewEnd * len);
		let visibleLen = endIdx - startIdx;

		for (let line of xLines) {
			let x = idxToX(line.pos);
			if (x < marginLeft || x > w) continue;
			ctx.strokeStyle = gridColor;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.15;
			ctx.setLineDash([3, 4]);
			ctx.beginPath();
			ctx.moveTo(x, marginTop);
			ctx.lineTo(x, marginTop + plotH);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;

			if (line.label) {
				ctx.fillStyle = labelColor;
				ctx.globalAlpha = 0.6;
				ctx.textAlign = 'center';
				ctx.fillText(line.label, x, marginTop + plotH + 11);
				ctx.globalAlpha = 1;
			}
		}

		// Draw X sub-gridlines
		for (let line of xSubLines) {
			let x = idxToX(line.pos);
			if (x < marginLeft || x > w) continue;
			ctx.strokeStyle = gridColor;
			ctx.lineWidth = 1;
			ctx.globalAlpha = 0.12;
			ctx.setLineDash([2, 4]);
			ctx.beginPath();
			ctx.moveTo(x, marginTop);
			ctx.lineTo(x, marginTop + plotH);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;

			if (line.label) {
				ctx.fillStyle = labelColor;
				ctx.globalAlpha = 0.4;
				ctx.textAlign = 'center';
				ctx.fillText(line.label, x, marginTop + plotH + 11);
				ctx.globalAlpha = 1;
			}
		}

		// Clip to plot area
		ctx.save();
		ctx.beginPath();
		ctx.rect(marginLeft, marginTop, plotW, plotH);
		ctx.clip();

		// Draw waveform
		ctx.strokeStyle = resolved;
		ctx.lineWidth = 1;

		if (visibleLen <= plotW * 2) {
			// Few enough samples: draw as connected line
			ctx.beginPath();
			for (let i = startIdx; i < endIdx; i++) {
				let x = marginLeft + ((i - startIdx) / visibleLen) * plotW;
				let y = valToY(data[i] || 0);
				if (i === startIdx) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		} else {
			// Many samples: filled min/max envelope for natural AA on edges
			let cols = Math.ceil(plotW);
			let maxYs = new Array(cols);
			let minYs = new Array(cols);
			let count = 0;
			for (let px = 0; px < cols; px++) {
				let s = startIdx + Math.floor((px / cols) * visibleLen);
				let e = startIdx + Math.floor(((px + 1) / cols) * visibleLen);
				if (s >= len) break;
				e = Math.min(e, len);
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
				ctx.moveTo(marginLeft, maxYs[0]);
				for (let i = 1; i < count; i++) {
					ctx.lineTo(marginLeft + i, maxYs[i]);
				}
				for (let i = count - 1; i >= 0; i--) {
					ctx.lineTo(marginLeft + i, minYs[i]);
				}
				ctx.closePath();
				ctx.fillStyle = resolved;
				ctx.fill();
			}
		}

		ctx.restore();

		raf = requestAnimationFrame(draw);
	}

	// Mark dirty when data changes
	$: if (data) dirty = true;

	function onWheel(e) {
		e.preventDefault();
		let rect = canvas.getBoundingClientRect();
		let mx = e.clientX - rect.left - marginLeft;
		let pw = plotW || (w - marginLeft);
		let frac = Math.max(0, Math.min(1, mx / pw));

		let dx = e.deltaX || 0;
		let dy = e.deltaY || 0;
		let span = targetEnd - targetStart;

		// Horizontal: pan
		if (Math.abs(dx) > 0) {
			let shift = dx / pw * span;
			targetStart += shift;
			targetEnd += shift;
		}

		// Vertical: zoom
		if (Math.abs(dy) > 0) {
			let zoomFactor = 1 + dy * 0.003;
			let anchor = targetStart + frac * span;
			let newSpan = span * zoomFactor;
			newSpan = Math.max(minSpan, Math.min(1, newSpan));
			targetStart = anchor - frac * newSpan;
			targetEnd = targetStart + newSpan;
		}

		clampTarget();
	}

	function onMouseDown(e) {
		isDragging = true;
		dragStartX = e.clientX;
		dragStartView = viewStart;
		dragMoved = false;
	}

	function onMouseMove(e) {
		if (!isDragging) return;
		let dx = e.clientX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			let pw = plotW || (w - marginLeft);
			let span = viewEnd - viewStart;
			let shift = -(dx / pw) * span;
			targetStart = dragStartView + shift;
			targetEnd = targetStart + span;
			viewStart = targetStart;
			viewEnd = targetEnd;
			clampView();
			clampTarget();
			dirty = true;
		}
	}

	function onMouseUp() {
		isDragging = false;
	}

	function onTouchStart(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			let rect = canvas.getBoundingClientRect();
			pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			pinchStartStart = targetStart;
			pinchStartEnd = targetEnd;
			let midX = ((t0.clientX + t1.clientX) / 2) - rect.left - marginLeft;
			pinchAnchorFrac = midX / (plotW || (w - marginLeft));
			isDragging = false;
			touchLocked = 'pan';
			return;
		}
		if (touches.length === 1) {
			let t = touches[0];
			let rect = canvas.getBoundingClientRect();
			touchStartPos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
			touchLocked = null;
			isDragging = true;
			dragStartX = t.clientX;
			dragStartView = viewStart;
			dragMoved = false;
		}
	}

	function onTouchMove(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			let dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			let scale = pinchStartDist / dist;
			let span = (pinchStartEnd - pinchStartStart) * scale;
			span = Math.max(minSpan, Math.min(1, span));
			let anchor = pinchStartStart + pinchAnchorFrac * (pinchStartEnd - pinchStartStart);
			targetStart = anchor - pinchAnchorFrac * span;
			targetEnd = targetStart + span;
			clampTarget();
			return;
		}
		if (touches.length === 1 && touchStartPos) {
			let t = touches[0];
			let rect = canvas.getBoundingClientRect();
			let tx = t.clientX - rect.left;
			let ty = t.clientY - rect.top;

			if (touchLocked === null) {
				let dx = Math.abs(tx - touchStartPos.x);
				let dy = Math.abs(ty - touchStartPos.y);
				if (dx > dragThreshold || dy > dragThreshold) {
					touchLocked = dx > dy ? 'pan' : 'scroll';
				}
			}

			if (touchLocked === 'pan') {
				e.preventDefault();
				let dx = t.clientX - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let pw = plotW || (w - marginLeft);
					let span = viewEnd - viewStart;
					let shift = -(dx / pw) * span;
					targetStart = dragStartView + shift;
					targetEnd = targetStart + span;
					viewStart = targetStart;
					viewEnd = targetEnd;
					clampView();
					clampTarget();
					dirty = true;
				}
			} else if (touchLocked === 'scroll') {
				isDragging = false;
			}
		}
	}

	function onTouchEnd() {
		isDragging = false;
		touchStartPos = null;
		touchLocked = null;
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		resize();
		raf = requestAnimationFrame(draw);
		window.addEventListener('resize', resize);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	});

	onDestroy(() => {
		if (typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}
	});
</script>

<canvas
	bind:this={canvas}
	on:wheel={onWheel}
	on:mousedown={onMouseDown}
	on:touchstart={onTouchStart}
	on:touchmove={onTouchMove}
	on:touchend={onTouchEnd}
	class="waveform"
	class:dragging={isDragging && dragMoved}
></canvas>

<style>
	.waveform {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
	}

	.waveform.dragging {
		cursor: grabbing;
	}
</style>
