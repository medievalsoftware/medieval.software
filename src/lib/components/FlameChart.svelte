<script>
	import { onMount, onDestroy } from 'svelte';
	import { createScrollHint, shouldBlockWheel, createInertia } from '../canvasInteraction.js';
	import ScrollHint from './ScrollHint.svelte';

	/**
	 * @typedef {{ name: string, value: number, children?: FlameNode[], color?: string, detail?: string }} FlameNode
	 */

	/** @type {FlameNode} */
	export let root;
	/** @type {number} chart height in CSS px */
	export let height = 300;
	/** @type {number} height of each bar row in CSS px */
	export let rowHeight = 22;
	/** @type {string} search/highlight filter */
	export let search = '';

	const PALETTE_NAMES = ['aqua', 'green', 'blue', 'purple', 'yellow', 'orange', 'red'];
	const clipId = `fc-${Math.random().toString(36).slice(2, 8)}`;
	const minSpan = 0.0001;
	const dragThreshold = 4;
	const gap = 0.5;

	// --- State ---

	/** @type {SVGSVGElement} */
	let svgEl;
	/** @type {CanvasRenderingContext2D} */
	let measureCtx;
	let w = 0;
	let h = 0;

	/** @type {{ node: FlameNode, depth: number, startFrac: number, widthFrac: number }[]} */
	let bars = [];
	let maxDepth = 0;

	// Viewport: 0..1 range
	let viewStart = 0;
	let viewEnd = 1;
	let targetStart = 0;
	let targetEnd = 1;

	// Interaction
	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;
	let hoveredIdx = -1;
	let mouseX = 0, mouseY = 0;
	let zoomedBar = -1;
	let isHovering = false;

	// Touch
	let pinchStartDist = 0;
	let pinchStartStart = 0;
	let pinchStartEnd = 0;
	let pinchAnchorFrac = 0.5;
	/** @type {{ x: number, y: number } | null} */
	let touchStartPos = null;
	/** @type {string | null} */
	let touchLocked = null;

	// Animation
	let raf = 0;
	let animating = false;

	const inertia = createInertia();
	const hint = createScrollHint();
	const hintVisible = hint.visible;

	// Search
	let matchSet = new Set();

	// --- Helpers ---

	/** @param {FlameNode} node */
	function flatten(node) {
		bars = [];
		maxDepth = 0;
		let total = node.value;
		/** @param {FlameNode} n @param {number} depth @param {number} offset */
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

	/** @param {string} name */
	function hashName(name) {
		let h = 0;
		for (let i = 0; i < name.length; i++) {
			h = ((h << 5) - h + name.charCodeAt(i)) | 0;
		}
		return ((h % PALETTE_NAMES.length) + PALETTE_NAMES.length) % PALETTE_NAMES.length;
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

	/**
	 * @param {string} text
	 * @param {number} maxW
	 * @returns {string | null}
	 */
	function truncateText(text, maxW) {
		if (!measureCtx || maxW <= 28) return null;
		measureCtx.font = `${Math.min(13, rowHeight - 6)}px 'Fira Mono', monospace`;
		if (measureCtx.measureText(text).width <= maxW) return text;
		while (text.length > 1 && measureCtx.measureText(text + '\u2026').width > maxW) {
			text = text.slice(0, -1);
		}
		return text + '\u2026';
	}

	// --- Reactive layout ---

	$: ready = !!measureCtx;

	$: if (root) {
		flatten(root);
		h = Math.max(height, (maxDepth + 1) * rowHeight + 4);
	}

	$: span = viewEnd - viewStart;

	/** @type {VisibleBar[]} */
	$: visibleBars = ready && w > 0 ? /** @type {VisibleBar[]} */ (computeVisibleBars(bars, viewStart, viewEnd, w, hoveredIdx, matchSet)) : [];

	/**
	 * @param {typeof bars} allBars
	 * @param {number} vs
	 * @param {number} ve
	 * @param {number} width
	 * @param {number} hovered
	 * @param {Set<number>} matches
	 */
	function computeVisibleBars(allBars, vs, ve, width, hovered, matches) {
		let sp = ve - vs;
		if (sp <= 0) return [];
		let hasSearch = search.length > 0;

		return allBars.map((bar, i) => {
			let x = ((bar.startFrac - vs) / sp) * width;
			let bw = (bar.widthFrac / sp) * width;

			// Cull off-screen
			if (x + bw < 0 || x > width) return null;

			let y = bar.depth * rowHeight;
			if (y + rowHeight < 0 || y > h) return null;

			let colorIdx = bar.node.color ? -1 : hashName(bar.node.name);
			let isHovered = i === hovered;
			let isMatch = hasSearch && matches.has(i);
			let dimmed = hasSearch && !isMatch;

			// Text label — clamp to visible area so partially off-screen bars still show text
			let textLeft = Math.max(0, x) + 4;
			let barRight = x + bw - 4;
			let maxTextW = barRight - textLeft;
			let label = truncateText(bar.node.name, maxTextW);

			return {
				i, x: x + gap, y: y + gap,
				w: Math.max(1, bw - gap * 2),
				h: rowHeight - gap * 2,
				colorIdx, isHovered, isMatch, dimmed,
				label, textLeft, textY: y + rowHeight / 2,
				node: bar.node,
			};
		}).filter(Boolean);
	}

	/** @typedef {{ i: number, x: number, y: number, w: number, h: number, colorIdx: number, isHovered: boolean, isMatch: boolean, dimmed: boolean, label: string | null, textLeft: number, textY: number, node: FlameNode }} VisibleBar */

	// Grid lines
	$: gridLines = ready && w > 0 ? computeGrid(viewStart, viewEnd, w) : [];

	/**
	 * @param {number} vs
	 * @param {number} ve
	 * @param {number} width
	 */
	function computeGrid(vs, ve, width) {
		let sp = ve - vs;
		if (sp <= 0) return [];

		let rawStep = sp / 8;
		let mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
		let norm = rawStep / mag;
		let step;
		if (norm < 1.5) step = mag;
		else if (norm < 3.5) step = 2 * mag;
		else if (norm < 7.5) step = 5 * mag;
		else step = 10 * mag;

		let subStep = step / 4;
		let subStart = Math.floor(vs / subStep) * subStep;
		let lines = [];

		for (let v = subStart; v <= ve + subStep; v += subStep) {
			let x = ((v - vs) / sp) * width;
			if (x < -1 || x > width + 1) continue;
			let isMajor = Math.abs(Math.round(v / step) * step - v) < step * 0.001;
			lines.push({ x: Math.round(x) + 0.5, opacity: isMajor ? 0.16 : 0.08 });
		}
		return lines;
	}

	// Tooltip
	$: tipData = hoveredIdx >= 0 && hoveredIdx < bars.length && ready
		? computeTip(hoveredIdx, mouseX, mouseY, w, h)
		: null;

	/**
	 * @param {number} idx
	 * @param {number} mx
	 * @param {number} my
	 * @param {number} width
	 * @param {number} height
	 */
	function computeTip(idx, mx, my, width, height) {
		let bar = bars[idx];
		let rootVal = root.value;
		let pct = ((bar.node.value / rootVal) * 100).toFixed(1);
		let lines = [bar.node.name, `${bar.node.value} (${pct}%)`];
		if (bar.node.detail) lines.push(bar.node.detail);

		if (!measureCtx) return null;
		measureCtx.font = "12px 'Fira Mono', monospace";
		let lineH = 16;
		let padX = 6, padY = 4;
		let maxW = 0;
		for (let tl of lines) {
			let tw = measureCtx.measureText(tl).width;
			if (tw > maxW) maxW = tw;
		}
		let tipW = maxW + padX * 2;
		let tipH = lines.length * lineH + padY * 2;
		let tx = Math.max(2, Math.min(width - tipW - 2, mx + 12));
		let ty = my + 16;
		if (ty + tipH > height) ty = my - tipH - 8;

		return { x: tx, y: ty, w: tipW, h: tipH, padX, padY, lineH, lines };
	}

	// Cursor
	$: cursorClass = isDragging && dragMoved ? 'dragging' : hoveredIdx >= 0 ? 'hovering' : '';

	// --- Animation ---

	function startAnimation() {
		if (!animating) {
			animating = true;
			raf = requestAnimationFrame(animate);
		}
	}

	function animate() {
		let inertiaDelta = !isDragging ? inertia.applyFrame() : 0;
		if (inertiaDelta) {
			let sp = targetEnd - targetStart;
			targetStart += inertiaDelta;
			targetEnd = targetStart + sp;
			clampTarget();
		}

		let lerpAmt = 0.4;
		viewStart += (targetStart - viewStart) * lerpAmt;
		viewEnd += (targetEnd - viewEnd) * lerpAmt;

		let still = Math.abs(viewStart - targetStart) < 0.00001
			&& Math.abs(viewEnd - targetEnd) < 0.00001
			&& !inertia.isMoving;

		if (still) {
			viewStart = targetStart;
			viewEnd = targetEnd;
			animating = false;
		} else {
			raf = requestAnimationFrame(animate);
		}

		clampView();
	}

	// --- Hit testing ---

	/**
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	function hitTest(clientX, clientY) {
		if (!svgEl) return -1;
		let rect = svgEl.getBoundingClientRect();
		let lx = clientX - rect.left;
		let ly = clientY - rect.top;
		if (lx < 0 || lx > w || ly < 0 || ly > h) return -1;
		let depth = Math.floor(ly / rowHeight);
		let sp = viewEnd - viewStart;
		let frac = viewStart + (lx / w) * sp;

		for (let i = 0; i < bars.length; i++) {
			let bar = bars[i];
			if (bar.depth !== depth) continue;
			if (frac >= bar.startFrac && frac < bar.startFrac + bar.widthFrac) {
				return i;
			}
		}
		return -1;
	}

	// --- Event Handlers ---

	/** @param {WheelEvent} e */
	function onWheel(e) {
		if (shouldBlockWheel(e)) {
			hint.show();
			return;
		}

		e.preventDefault();
		let dx = e.deltaX || 0;
		let dy = e.deltaY || 0;
		let rect = svgEl.getBoundingClientRect();
		let mx = e.clientX - rect.left;
		let frac = mx / w;
		let sp = targetEnd - targetStart;

		if (Math.abs(dx) > Math.abs(dy)) {
			let shift = (dx / w) * sp;
			targetStart += shift;
			targetEnd += shift;
		} else {
			let zoomFactor = dy > 0 ? 1.08 : 1 / 1.08;
			let newSpan = Math.max(minSpan, Math.min(1, sp * zoomFactor));
			let anchor = targetStart + frac * sp;
			targetStart = anchor - frac * newSpan;
			targetEnd = targetStart + newSpan;
		}
		clampTarget();
		startAnimation();
	}

	/** @param {MouseEvent} e */
	function onMouseDown(e) {
		if (e.button !== 0) return;
		isDragging = true;
		dragStartX = e.clientX;
		dragStartView = viewStart;
		dragMoved = false;
		inertia.start(e.clientX);
	}

	/** @param {MouseEvent} e */
	function onMouseMove(e) {
		let rect = svgEl.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;

		let idx = hitTest(e.clientX, e.clientY);
		if (idx !== hoveredIdx) {
			hoveredIdx = idx;
		}

		if (!isDragging) return;
		let dx = e.clientX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			inertia.track(e.clientX, w, viewEnd - viewStart);
			let sp = viewEnd - viewStart;
			let shift = -(dx / w) * sp;
			targetStart = dragStartView + shift;
			targetEnd = targetStart + sp;
			viewStart = targetStart;
			viewEnd = targetEnd;
			clampView();
			clampTarget();
		}
	}

	/** @param {MouseEvent} e */
	function onMouseUp(e) {
		if (isDragging && !dragMoved) {
			let idx = hitTest(e.clientX, e.clientY);
			if (idx >= 0) {
				if (idx === zoomedBar) {
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
				startAnimation();
			}
		}
		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
	}

	function onMouseEnter() {
		isHovering = true;
	}

	function onMouseLeave() {
		isHovering = false;
		mouseX = -1;
		mouseY = -1;
		if (hoveredIdx >= 0) {
			hoveredIdx = -1;
		}
	}

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		if (!isHovering) return;
		if (e.key === 'Escape' && (zoomedBar >= 0 || viewStart !== 0 || viewEnd !== 1)) {
			targetStart = 0;
			targetEnd = 1;
			zoomedBar = -1;
			clampTarget();
			startAnimation();
		}
	}

	// Touch handlers
	/** @param {TouchEvent} e */
	function onTouchStart(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			pinchStartStart = targetStart;
			pinchStartEnd = targetEnd;
			let rect = svgEl.getBoundingClientRect();
			let midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
			pinchAnchorFrac = midX / w;
			isDragging = false;
			touchLocked = 'pan';
			return;
		}
		if (touches.length === 1) {
			let t = touches[0];
			let rect = svgEl.getBoundingClientRect();
			touchStartPos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
			touchLocked = null;
			isDragging = true;
			dragStartX = t.clientX;
			dragStartView = viewStart;
			dragMoved = false;
			inertia.start(t.clientX);
		}
	}

	/** @param {TouchEvent} e */
	function onTouchMove(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			let dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			let scale = pinchStartDist / dist;
			let sp = (pinchStartEnd - pinchStartStart) * scale;
			sp = Math.max(minSpan, Math.min(1, sp));
			let anchor = pinchStartStart + pinchAnchorFrac * (pinchStartEnd - pinchStartStart);
			targetStart = anchor - pinchAnchorFrac * sp;
			targetEnd = targetStart + sp;
			clampTarget();
			startAnimation();
			return;
		}
		if (touches.length === 1 && touchStartPos) {
			let t = touches[0];
			let rect = svgEl.getBoundingClientRect();
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
					let sp = viewEnd - viewStart;
					let shift = -(dx / w) * sp;
					targetStart = dragStartView + shift;
					targetEnd = targetStart + sp;
					viewStart = targetStart;
					viewEnd = targetEnd;
					clampView();
					clampTarget();
				}
			} else if (touchLocked === 'scroll') {
				// don't clear isDragging — allows tap-to-zoom when
				// a slight vertical wobble locked to scroll
			}
		}
	}

	/** @param {TouchEvent} e */
	function onTouchEnd(e) {
		if (e.touches.length === 0 && isDragging && !dragMoved && touchStartPos) {
			let idx = hitTest(
				touchStartPos.x + svgEl.getBoundingClientRect().left,
				touchStartPos.y + svgEl.getBoundingClientRect().top
			);
			if (idx >= 0) {
				// Prevent synthetic mousedown/mouseup from firing after touch,
				// which would immediately toggle the zoom back out
				e.preventDefault();
				hoveredIdx = idx;
				mouseX = touchStartPos.x;
				mouseY = touchStartPos.y;
				if (idx === zoomedBar) {
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
				startAnimation();
			}
		}
		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
		touchStartPos = null;
		touchLocked = null;
	}

	// Search reactivity
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
	}

	// --- Resize ---

	function resize() {
		if (!svgEl) return;
		w = svgEl.getBoundingClientRect().width;
	}

	// --- Lifecycle ---

	onMount(async () => {
		resize();
		await document.fonts.ready;
		let c = document.createElement('canvas');
		measureCtx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
		svgEl.addEventListener('wheel', onWheel, { passive: false });
		svgEl.addEventListener('touchstart', onTouchStart, { passive: false });
		svgEl.addEventListener('touchmove', onTouchMove, { passive: false });
		svgEl.addEventListener('touchend', onTouchEnd);
		window.addEventListener('resize', resize);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	});

	onDestroy(() => {
		hint.destroy();
		if (typeof window !== 'undefined') {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			svgEl?.removeEventListener('wheel', onWheel);
			svgEl?.removeEventListener('touchstart', onTouchStart);
			svgEl?.removeEventListener('touchmove', onTouchMove);
			svgEl?.removeEventListener('touchend', onTouchEnd);
		}
	});

	// --- Color helpers for template ---

	/** @param {{ node: FlameNode, colorIdx: number, isHovered: boolean }} vbar */
	function barFill(vbar) {
		if (vbar.node.color) return vbar.node.color;
		let name = PALETTE_NAMES[vbar.colorIdx];
		return vbar.isHovered ? `var(--${name})` : `var(--${name}-dim)`;
	}

	/** @param {{ dimmed: boolean }} vbar */
	function barOpacity(vbar) {
		return vbar.dimmed ? 0.25 : 1;
	}
</script>

<svelte:window on:keydown={onKeydown} />

<ScrollHint visible={$hintVisible}>
	<svg
		bind:this={svgEl}
		width="100%"
		height={h}
		class="flame-chart {cursorClass}"
		on:mousedown={onMouseDown}
		on:mouseenter={onMouseEnter}
		on:mouseleave={onMouseLeave}
	>
		<defs>
			<clipPath id={clipId}>
				<rect x="0" y="0" width={w} height={h} />
			</clipPath>
		</defs>

		<g clip-path="url(#{clipId})" opacity={ready ? 1 : 0}>
			<!-- Grid lines -->
			{#each gridLines as line}
				<line x1={line.x} y1="0" x2={line.x} y2={h}
					stroke="var(--bg3)" stroke-width="0.5" opacity={line.opacity} />
			{/each}

			<!-- Bars -->
			{#each visibleBars as vbar (vbar.i)}
				<rect x={vbar.x} y={vbar.y} width={vbar.w} height={vbar.h}
					fill={barFill(vbar)}
					opacity={barOpacity(vbar)}
					rx="1" />

				<!-- Hover outline -->
				{#if vbar.isHovered}
					<rect x={vbar.x} y={vbar.y} width={vbar.w} height={vbar.h}
						fill="none" stroke="var(--fg)" stroke-width="1.5"
						rx="1" />
				{/if}

				<!-- Search match outline -->
				{#if vbar.isMatch && !vbar.isHovered}
					{@const name = PALETTE_NAMES[vbar.colorIdx >= 0 ? vbar.colorIdx : 0]}
					<rect x={vbar.x} y={vbar.y} width={vbar.w} height={vbar.h}
						fill="none" stroke="var(--{name})" stroke-width="1"
						rx="1" />
				{/if}

				<!-- Text label -->
				{#if vbar.label}
					<text x={vbar.textLeft} y={vbar.textY}
						class="fc-label"
						fill={vbar.dimmed ? 'var(--fg4)' : 'var(--fg)'}
						opacity={barOpacity(vbar)}>{vbar.label}</text>
				{/if}
			{/each}

			<!-- Tooltip -->
			{#if tipData}
				<rect x={tipData.x} y={tipData.y} width={tipData.w} height={tipData.h}
					rx="3" fill="var(--bg)" opacity="0.92" />
				<rect x={tipData.x} y={tipData.y} width={tipData.w} height={tipData.h}
					rx="3" fill="none" stroke="var(--bg3)" stroke-width="1" />
				{#each tipData.lines as line, j}
					<text x={tipData.x + tipData.padX}
						y={tipData.y + tipData.padY + j * tipData.lineH + tipData.lineH / 2}
						class="fc-tip"
						fill={j === 0 ? 'var(--fg)' : 'var(--fg4)'}>{line}</text>
				{/each}
			{/if}
		</g>
	</svg>
</ScrollHint>

<style>
	.flame-chart {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
		user-select: none;
		-webkit-user-select: none;
	}

	.flame-chart.dragging { cursor: grabbing; }
	.flame-chart.hovering { cursor: pointer; }

	.flame-chart text {
		font-family: 'Fira Mono', monospace;
		pointer-events: none;
	}

	.fc-label {
		font-size: 13px;
		dominant-baseline: central;
	}

	.fc-tip {
		font-size: 12px;
		dominant-baseline: central;
	}
</style>
