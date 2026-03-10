<script>
	import { onMount, onDestroy } from 'svelte';
	import { drawGrid } from '../grid.js';
	import { createScrollHint, shouldBlockWheel, createInertia } from '../canvasInteraction.js';
	import ScrollHint from './ScrollHint.svelte';

	/**
	 * @typedef {{ name: string, value: number, children?: FlameNode[], color?: string, detail?: string }} FlameNode
	 */

	/** @type {FlameNode} */
	export let root;
	/** @type {number} canvas height in CSS px */
	export let height = 300;
	/** @type {number} height of each bar row in CSS px */
	export let rowHeight = 22;
	/** @type {string} search/highlight filter */
	export let search = '';

	let canvas;
	let ctx;
	let w = 0;
	let h = 0;
	let dpr = 1;
	let raf = 0;
	let dirty = true;

	// Layout
	/** @type {{ node: FlameNode, depth: number, startFrac: number, widthFrac: number }[]} */
	let bars = [];
	let maxDepth = 0;

	// Cached colors
	const PALETTE_NAMES = ['aqua', 'green', 'blue', 'purple', 'yellow', 'orange', 'red'];
	let palette = [];
	let paletteDim = [];
	let bgColor = '#282828';
	let fgColor = '#ebdbb2';
	let fg4Color = '#a89984';
	let bg3Color = '#665c54';

	// Viewport: 0..1 range
	let viewStart = 0;
	let viewEnd = 1;
	let targetStart = 0;
	let targetEnd = 1;
	let minSpan = 0.0001;

	// Interaction
	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;
	const dragThreshold = 4;
	let hoveredIdx = -1;
	let zoomedBar = -1;

	// Touch
	let pinchStartDist = 0;
	let pinchStartStart = 0;
	let pinchStartEnd = 0;
	let pinchAnchorFrac = 0.5;
	let touchStartPos = null;
	let touchLocked = null;

	// Inertia & scroll hint
	const inertia = createInertia();
	const hint = createScrollHint();
	const hintVisible = hint.visible;

	// Search
	let matchSet = new Set();

	function flatten(node) {
		bars = [];
		maxDepth = 0;
		let total = node.value;
		function visit(n, depth, offset) {
			let frac = n.value / total;
			bars.push({ node: n, depth, startFrac: offset, widthFrac: frac });
			if (depth > maxDepth) maxDepth = depth;
			if (n.children) {
				let childOff = offset;
				for (let c of n.children) {
					visit(c, depth + 1, childOff);
					childOff += c.value / total;
				}
			}
		}
		visit(node, 0, 0);
	}

	function hashName(name) {
		let h = 0;
		for (let i = 0; i < name.length; i++) {
			h = ((h << 5) - h + name.charCodeAt(i)) | 0;
		}
		return ((h % PALETTE_NAMES.length) + PALETTE_NAMES.length) % PALETTE_NAMES.length;
	}

	function resolveColors() {
		if (!canvas) return;
		let style = getComputedStyle(canvas);
		palette = PALETTE_NAMES.map(name =>
			style.getPropertyValue('--' + name).trim() || '#83a598'
		);
		paletteDim = PALETTE_NAMES.map(name =>
			style.getPropertyValue('--' + name + '-dim').trim() || '#456070'
		);
		bgColor = style.getPropertyValue('--bg').trim() || '#282828';
		fgColor = style.getPropertyValue('--fg').trim() || '#ebdbb2';
		fg4Color = style.getPropertyValue('--fg4').trim() || '#a89984';
		bg3Color = style.getPropertyValue('--bg3').trim() || '#665c54';
	}

	function resize() {
		if (!canvas) return;
		let rect = canvas.getBoundingClientRect();
		dpr = window.devicePixelRatio || 1;
		w = rect.width;
		h = Math.max(height, (maxDepth + 1) * rowHeight + 4);
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.height = h + 'px';
		resolveColors();
		dirty = true;
	}

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

	function draw() {
		raf = requestAnimationFrame(draw);
		if (!ctx || !w) return;

		// Apply inertia
		let inertiaDelta = inertia.applyFrame();
		if (inertiaDelta) {
			let span = targetEnd - targetStart;
			targetStart += inertiaDelta;
			targetEnd = targetStart + span;
			clampTarget();
		}

		// Lerp viewport
		let lerpAmt = 0.4;
		let prevStart = viewStart;
		let prevEnd = viewEnd;
		viewStart += (targetStart - viewStart) * lerpAmt;
		viewEnd += (targetEnd - viewEnd) * lerpAmt;
		let animating = Math.abs(viewStart - targetStart) > 0.00001 || Math.abs(viewEnd - targetEnd) > 0.00001 || inertia.isMoving;
		if (!animating) { viewStart = targetStart; viewEnd = targetEnd; }
		clampView();

		if (Math.abs(viewStart - prevStart) > 0.000001 || Math.abs(viewEnd - prevEnd) > 0.000001) {
			dirty = true;
		}

		if (!dirty && !animating) return;
		dirty = false;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		ctx.save();
		ctx.beginPath();
		ctx.rect(0, 0, w, h);
		ctx.clip();

		drawGrid(ctx, w, h, viewStart, viewEnd, bg3Color);

		let span = viewEnd - viewStart;
		let hasSearch = search.length > 0;
		let gap = 0.5;

		for (let i = 0; i < bars.length; i++) {
			let bar = bars[i];
			let x = ((bar.startFrac - viewStart) / span) * w;
			let bw = (bar.widthFrac / span) * w;

			// Cull off-screen
			if (x + bw < 0 || x > w) continue;

			let y = bar.depth * rowHeight;
			if (y + rowHeight < 0 || y > h) continue;

			let colorIdx = bar.node.color ? -1 : hashName(bar.node.name);
			let isHovered = i === hoveredIdx;
			let isMatch = hasSearch && matchSet.has(i);
			let dimmed = hasSearch && !isMatch;

			// Fill color
			let fillColor;
			if (bar.node.color) {
				fillColor = bar.node.color;
			} else if (isHovered) {
				fillColor = palette[colorIdx];
			} else {
				fillColor = paletteDim[colorIdx];
			}

			ctx.globalAlpha = dimmed ? 0.25 : 1;
			ctx.fillStyle = fillColor;
			ctx.fillRect(x + gap, y + gap, Math.max(1, bw - gap * 2), rowHeight - gap * 2);

			// Hover outline
			if (isHovered) {
				ctx.strokeStyle = fgColor;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(x + gap, y + gap, Math.max(1, bw - gap * 2), rowHeight - gap * 2);
			}

			// Search match highlight outline
			if (isMatch && !isHovered) {
				ctx.strokeStyle = palette[colorIdx >= 0 ? colorIdx : 0];
				ctx.lineWidth = 1;
				ctx.strokeRect(x + gap, y + gap, Math.max(1, bw - gap * 2), rowHeight - gap * 2);
			}

			// Text label — clamp to visible area so partially off-screen bars still show text
			let textLeft = Math.max(0, x) + 4;
			let barRight = x + bw - 4;
			let maxTextW = barRight - textLeft;
			if (maxTextW > 28) {
				ctx.fillStyle = dimmed ? fg4Color : fgColor;
				ctx.font = `${Math.min(13, rowHeight - 6)}px 'Fira Mono', monospace`;
				ctx.textBaseline = 'middle';
				let text = bar.node.name;
				if (ctx.measureText(text).width > maxTextW) {
					while (text.length > 1 && ctx.measureText(text + '\u2026').width > maxTextW) {
						text = text.slice(0, -1);
					}
					text += '\u2026';
				}
				ctx.fillText(text, textLeft, y + rowHeight / 2);
			}

			ctx.globalAlpha = 1;
		}

		// Tooltip
		if (hoveredIdx >= 0 && hoveredIdx < bars.length) {
			let bar = bars[hoveredIdx];
			let rootVal = root.value;
			let pct = ((bar.node.value / rootVal) * 100).toFixed(1);
			let lines = [bar.node.name, `${bar.node.value} (${pct}%)`];
			if (bar.node.detail) lines.push(bar.node.detail);

			let fontSize = 12;
			ctx.font = `${fontSize}px 'Fira Mono', monospace`;
			let lineH = fontSize + 4;
			let padX = 6, padY = 4;
			let tipW = Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2;
			let tipH = lines.length * lineH + padY * 2;

			// Position near hovered bar
			let bx = ((bar.startFrac - viewStart) / span) * w;
			let by = bar.depth * rowHeight + rowHeight + 4;
			let tx = Math.max(2, Math.min(w - tipW - 2, bx));
			if (by + tipH > h) by = bar.depth * rowHeight - tipH - 4;

			ctx.fillStyle = bgColor;
			ctx.globalAlpha = 0.92;
			ctx.fillRect(tx, by, tipW, tipH);
			ctx.globalAlpha = 1;
			ctx.strokeStyle = bg3Color;
			ctx.lineWidth = 1;
			ctx.strokeRect(tx, by, tipW, tipH);

			ctx.fillStyle = fgColor;
			ctx.textBaseline = 'top';
			for (let li = 0; li < lines.length; li++) {
				ctx.fillStyle = li === 0 ? fgColor : fg4Color;
				ctx.fillText(lines[li], tx + padX, by + padY + li * lineH);
			}
		}

		ctx.restore();
	}

	function hitTest(clientX, clientY) {
		let rect = canvas.getBoundingClientRect();
		let lx = clientX - rect.left;
		let ly = clientY - rect.top;
		if (lx < 0 || lx > w || ly < 0 || ly > h) return -1;
		let depth = Math.floor(ly / rowHeight);
		let span = viewEnd - viewStart;
		let frac = viewStart + (lx / w) * span;

		for (let i = 0; i < bars.length; i++) {
			let bar = bars[i];
			if (bar.depth !== depth) continue;
			if (frac >= bar.startFrac && frac < bar.startFrac + bar.widthFrac) {
				return i;
			}
		}
		return -1;
	}

	// --- Input handlers ---

	function onWheel(e) {
		if (shouldBlockWheel(e)) {
			hint.show();
			return;
		}

		e.preventDefault();
		let dx = e.deltaX || 0;
		let dy = e.deltaY || 0;
		let rect = canvas.getBoundingClientRect();
		let mx = e.clientX - rect.left;
		let frac = mx / w;
		let span = targetEnd - targetStart;

		// Horizontal: pan
		if (Math.abs(dx) > Math.abs(dy)) {
			let shift = (dx / w) * span;
			targetStart += shift;
			targetEnd += shift;
		} else {
			// Vertical: zoom around cursor
			let zoomFactor = dy > 0 ? 1.08 : 1 / 1.08;
			let newSpan = Math.max(minSpan, Math.min(1, span * zoomFactor));
			let anchor = targetStart + frac * span;
			targetStart = anchor - frac * newSpan;
			targetEnd = targetStart + newSpan;
		}
		clampTarget();
		dirty = true;
	}

	function onMouseDown(e) {
		if (e.button !== 0) return;
		isDragging = true;
		dragStartX = e.clientX;
		dragStartView = viewStart;
		dragMoved = false;
		inertia.start(e.clientX);
	}

	function onMouseMove(e) {
		// Hit-test for hover
		let idx = hitTest(e.clientX, e.clientY);
		if (idx !== hoveredIdx) {
			hoveredIdx = idx;
			dirty = true;
			canvas.style.cursor = idx >= 0 ? 'pointer' : 'grab';
		}

		if (!isDragging) return;
		let dx = e.clientX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			inertia.track(e.clientX, w, viewEnd - viewStart);

			let span = viewEnd - viewStart;
			let shift = -(dx / w) * span;
			targetStart = dragStartView + shift;
			targetEnd = targetStart + span;
			viewStart = targetStart;
			viewEnd = targetEnd;
			clampView();
			clampTarget();
			dirty = true;
		}
	}

	function onMouseUp(e) {
		if (isDragging && !dragMoved) {
			// Click: zoom into subtree
			let idx = hitTest(e.clientX, e.clientY);
			if (idx >= 0) {
				if (idx === zoomedBar) {
					// Already zoomed here — zoom out to full
					targetStart = 0;
					targetEnd = 1;
					zoomedBar = -1;
				} else {
					let bar = bars[idx];
					targetStart = bar.startFrac;
					targetEnd = bar.startFrac + bar.widthFrac;
					zoomedBar = idx;
				}
				clampTarget();
				dirty = true;
			}
		}
		if (isDragging) inertia.staleCheck();
		isDragging = false;
	}

	function onMouseEnter() {
		isHovering = true;
	}

	function onMouseLeave() {
		isHovering = false;
		if (hoveredIdx >= 0) {
			hoveredIdx = -1;
			dirty = true;
		}
	}

	let isHovering = false;

	function onKeydown(e) {
		if (!isHovering) return;
		if (e.key === 'Escape' && (zoomedBar >= 0 || viewStart !== 0 || viewEnd !== 1)) {
			targetStart = 0;
			targetEnd = 1;
			zoomedBar = -1;
			clampTarget();
			dirty = true;
		}
	}

	// Touch handlers
	function onTouchStart(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			pinchStartStart = targetStart;
			pinchStartEnd = targetEnd;
			let rect = canvas.getBoundingClientRect();
			let midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
			pinchAnchorFrac = midX / w;
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
			inertia.start(t.clientX);
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
			dirty = true;
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
				inertia.track(t.clientX, w, viewEnd - viewStart);

				let dx = t.clientX - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let span = viewEnd - viewStart;
					let shift = -(dx / w) * span;
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
		inertia.staleCheck();
		isDragging = false;
		touchStartPos = null;
		touchLocked = null;
	}

	// Reactivity
	$: if (root) {
		flatten(root);
		dirty = true;
		if (canvas) resize();
	}

	$: {
		let s = search.toLowerCase();
		matchSet = new Set();
		if (s) {
			for (let i = 0; i < bars.length; i++) {
				if (bars[i].node.name.toLowerCase().includes(s)) {
					matchSet.add(i);
				}
			}
		}
		dirty = true;
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		resize();
		raf = requestAnimationFrame(draw);
		window.addEventListener('resize', resize);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('touchstart', onTouchStart, { passive: false });
		canvas.addEventListener('touchmove', onTouchMove, { passive: false });
		canvas.addEventListener('touchend', onTouchEnd);
	});

	onDestroy(() => {
		hint.destroy();
		if (typeof cancelAnimationFrame !== 'undefined') {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			canvas.removeEventListener('wheel', onWheel);
			canvas.removeEventListener('touchstart', onTouchStart);
			canvas.removeEventListener('touchmove', onTouchMove);
			canvas.removeEventListener('touchend', onTouchEnd);
		}
	});
</script>

<svelte:window on:keydown={onKeydown} />

<ScrollHint visible={$hintVisible}>
	<canvas
		bind:this={canvas}
		on:mousedown={onMouseDown}
		on:mouseenter={onMouseEnter}
		on:mouseleave={onMouseLeave}
		class="flame-chart"
		class:dragging={isDragging && dragMoved}
	></canvas>
</ScrollHint>

<style>
	.flame-chart {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
	}

	.flame-chart.dragging {
		cursor: grabbing;
	}
</style>
