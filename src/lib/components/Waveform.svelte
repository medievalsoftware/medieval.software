<script>
	import { onMount, onDestroy } from 'svelte';
	import { createScrollHint, shouldBlockWheel, createInertia } from '../canvasInteraction.js';
	import ScrollHint from './ScrollHint.svelte';

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
	/** @type {{ start: number, end: number } | null} selected sample range (inclusive) */
	export let selection = null;

	const clipId = `wf-${Math.random().toString(36).slice(2, 8)}`;
	let minSpan = 0.001;
	const dragThreshold = 4;
	const EDGE_GRAB = 6;
	const TOUCH_EDGE_GRAB = 20;
	const LONG_PRESS_MS = 350;

	// --- State ---

	/** @type {SVGSVGElement} */
	let svgEl;
	/** @type {CanvasRenderingContext2D} */
	let measureCtx;
	let w = 0;
	let h = 0;

	let marginLeft = 0;
	let plotW = 0;
	let hoveredSample = -1;

	// Viewport: 0..1 range over data
	let viewStart = 0;
	let viewEnd = 1;
	let targetStart = 0;
	let targetEnd = 1;

	// Interaction
	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;

	// Selection
	let selDragStart = -1;
	let isSelecting = false;
	/** @type {string | null} */
	let selEdgeDrag = null;
	let nearEdge = false;

	// Touch
	let pinchStartDist = 0;
	let pinchStartStart = 0;
	let pinchStartEnd = 0;
	let pinchAnchorFrac = 0.5;
	/** @type {{ x: number, y: number } | null} */
	let touchStartPos = null;
	/** @type {string | null} */
	let touchLocked = null;
	/** @type {ReturnType<typeof setTimeout> | null} */
	let longPressTimer = null;
	let touchSelecting = false;
	/** @type {string | null} */
	let touchEdgeDrag = null;

	// Animation
	let raf = 0;
	let animating = false;

	const inertia = createInertia();
	const hint = createScrollHint();
	const hintVisible = hint.visible;

	// --- Helpers ---

	$: ready = !!measureCtx;
	$: h = height;
	$: range = max - min || 1;

	$: if (data) {
		minSpan = data.length > 0 ? Math.min(0.001, 20 / data.length) : 0.001;
	}

	/**
	 * @param {number} clientX
	 * @returns {number}
	 */
	function clientXToSample(clientX) {
		let rect = svgEl.getBoundingClientRect();
		let mx = clientX - rect.left - marginLeft;
		let pw = plotW || (w - marginLeft);
		let frac = mx / pw;
		let dataFrac = viewStart + frac * (viewEnd - viewStart);
		return Math.round(dataFrac * data.length);
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
	 * @param {number} v
	 * @param {number} mTop
	 * @param {number} pH
	 * @returns {number}
	 */
	function valToY(v, mTop, pH) {
		return mTop + pH - ((v - min) / range) * pH;
	}

	/**
	 * @param {number} idx
	 * @param {number} len
	 * @returns {number}
	 */
	function idxToX(idx, len) {
		let frac = idx / len;
		let vFrac = (frac - viewStart) / (viewEnd - viewStart);
		return marginLeft + vFrac * plotW;
	}

	// --- Reactive layout ---

	$: gridLayout = ready && w > 0 ? computeGridLayout(data, viewStart, viewEnd, w, gridY, gridX, xSubdiv) : null;

	/**
	 * @param {Float32Array | number[]} d
	 * @param {number} vs
	 * @param {number} ve
	 * @param {number} width
	 * @param {typeof gridY} gy
	 * @param {typeof gridX} gx
	 * @param {number} xSub
	 */
	function computeGridLayout(d, vs, ve, width, gy, gx, xSub) {
		let len = d.length;
		if (len === 0) return null;

		// Build Y lines
		/** @type {{ value: number, label?: string }[]} */
		let yLines = [];
		if (typeof gy === 'number' && gy > 0) {
			for (let i = 0; i <= gy; i++) {
				let value = max - (i / gy) * (max - min);
				let label = value === 0 ? '0' : value.toFixed(1);
				yLines.push({ value, label });
			}
		} else if (Array.isArray(gy)) {
			yLines = gy.map(g => typeof g === 'number' ? { value: g } : g);
		}

		// Build X lines
		/** @type {{ pos: number, label?: string }[]} */
		let xLines = [];
		if (typeof gx === 'number' && gx > 0) {
			for (let i = 0; i <= gx; i++) {
				let pos = Math.floor((i / gx) * len);
				xLines.push({ pos, label: String(pos) });
			}
		} else if (Array.isArray(gx)) {
			xLines = gx.map(g => typeof g === 'number' ? { pos: g } : g);
		}

		// Adaptive X subdivisions
		/** @type {{ pos: number, label?: string }[]} */
		let xSubLines = [];
		if (xSub > 0) {
			let visibleSamples = (ve - vs) * len;
			let interval = xSub;
			let minVisible = 8;
			while (visibleSamples / interval < minVisible && interval > 1) {
				interval = Math.floor(interval / 2);
			}
			let firstTick = Math.ceil((vs * len) / interval) * interval;
			let majorSet = new Set(xLines.map(l => l.pos));
			for (let pos = firstTick; pos < ve * len; pos += interval) {
				if (majorSet.has(pos) || pos === 0) continue;
				let secs = pos / xSub;
				/** @type {string} */
				let label;
				if (secs === Math.floor(secs)) {
					label = secs + 's';
				} else {
					let decimals = Math.max(1, Math.ceil(-Math.log10(interval / xSub)));
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
		plotW = width - marginLeft;
		let pH = height - marginTop - marginBottom;

		// Compute Y grid line positions
		let yGridItems = yLines.map(line => {
			let y = valToY(line.value, marginTop, pH);
			let visible = y >= marginTop && y <= marginTop + pH;
			return { ...line, y, visible };
		}).filter(item => item.visible);

		// Compute X grid line positions
		let xGridItems = xLines.map(line => {
			let x = idxToX(line.pos, len);
			let visible = x >= marginLeft && x <= width;
			return { ...line, x, visible };
		}).filter(item => item.visible);

		// Compute X sub-grid line positions
		let xSubGridItems = xSubLines.map(line => {
			let x = idxToX(line.pos, len);
			let visible = x >= marginLeft && x <= width;
			return { ...line, x, visible };
		}).filter(item => item.visible);

		return { yGridItems, xGridItems, xSubGridItems, marginTop, marginBottom, plotH: pH };
	}

	// Waveform path
	$: waveformData = ready && w > 0 && gridLayout ? computeWaveform(data, viewStart, viewEnd, w, gridLayout.marginTop, gridLayout.plotH, hoveredSample, selection) : null;

	/**
	 * @param {Float32Array | number[]} d
	 * @param {number} vs
	 * @param {number} ve
	 * @param {number} width
	 * @param {number} mTop
	 * @param {number} pH
	 * @param {number} hovered
	 * @param {typeof selection} sel
	 */
	function computeWaveform(d, vs, ve, width, mTop, pH, hovered, sel) {
		let len = d.length;
		if (len === 0 || plotW <= 0) return null;

		let startIdx = Math.max(0, Math.floor(vs * len) - 1);
		let endIdx = Math.min(len, Math.ceil(ve * len) + 1);
		let visibleLen = endIdx - startIdx;
		let pxPerSample = plotW / visibleLen;

		// Selection
		/** @type {{ x1: number, x2: number } | null} */
		let selRect = null;
		if (sel) {
			let selX1 = idxToX(sel.start, len);
			let selX2 = idxToX(sel.end, len);
			let halfPx = pxPerSample * 0.5;
			selRect = { x1: selX1 - halfPx, x2: selX2 + halfPx };
		}

		if (visibleLen <= plotW * 2) {
			// Few enough samples: draw as connected line + optional dots
			let pathParts = [];
			for (let i = startIdx; i < endIdx; i++) {
				let x = idxToX(i, len);
				let y = valToY(d[i] || 0, mTop, pH);
				pathParts.push(i === startIdx ? `M${x},${y}` : `L${x},${y}`);
			}
			let linePath = pathParts.join('');

			// Dots when zoomed in enough
			/** @type {{ x: number, y: number, r: number, opacity: number }[]} */
			let dots = [];
			if (pxPerSample >= 8) {
				let dotAlpha = Math.min(1, (pxPerSample - 8) / 8);
				let dotR = Math.min(3.5, 1.5 + pxPerSample * 0.05);
				for (let i = startIdx; i < endIdx; i++) {
					let x = idxToX(i, len);
					let y = valToY(d[i] || 0, mTop, pH);
					let isHovered = i === hovered;
					let isSelected = sel && i >= sel.start && i <= sel.end;
					dots.push({
						x, y,
						r: isHovered ? dotR + 1.5 : (isSelected ? dotR + 0.5 : dotR),
						opacity: isHovered || isSelected ? 1 : dotAlpha * 0.7,
					});
				}
			}

			return { mode: 'line', linePath, dots, selRect };
		} else {
			// Many samples: min/max envelope as filled path
			let cols = Math.ceil(plotW);
			let pathParts = [];

			// Forward pass: max values
			/** @type {number[]} */
			let minYs = [];
			for (let px = 0; px < cols; px++) {
				let s = startIdx + Math.floor((px / cols) * visibleLen);
				let e = startIdx + Math.floor(((px + 1) / cols) * visibleLen);
				if (s >= len) break;
				e = Math.min(e, len);
				let mn = Infinity, mx = -Infinity;
				for (let i = s; i < e; i++) {
					let v = d[i] || 0;
					if (v < mn) mn = v;
					if (v > mx) mx = v;
				}
				if (mn === Infinity) continue;
				let maxY = valToY(mx, mTop, pH);
				let minY = valToY(mn, mTop, pH);
				let x = marginLeft + px;
				if (pathParts.length === 0) {
					pathParts.push(`M${x},${maxY}`);
				} else {
					pathParts.push(`L${x},${maxY}`);
				}
				minYs.push(minY);
			}

			// Reverse pass: min values
			for (let i = minYs.length - 1; i >= 0; i--) {
				pathParts.push(`L${marginLeft + i},${minYs[i]}`);
			}
			pathParts.push('Z');

			return { mode: 'envelope', fillPath: pathParts.join(''), selRect };
		}
	}

	// Cursor
	$: cursorClass = selEdgeDrag ? 'edge-drag' : isSelecting ? 'selecting' : (isDragging && dragMoved) ? 'dragging' : nearEdge ? 'edge-hover' : '';

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
			let span = targetEnd - targetStart;
			targetStart += inertiaDelta;
			targetEnd = targetStart + span;
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
	 * @param {number} [grab] grab distance in px
	 * @returns {string | null}
	 */
	function hitTestSelEdge(clientX, grab = EDGE_GRAB) {
		if (!selection || !svgEl) return null;
		let rect = svgEl.getBoundingClientRect();
		let mx = clientX - rect.left;
		let len = data.length;
		let pxPerSample = plotW / ((viewEnd - viewStart) * len);
		let halfPx = pxPerSample * 0.5;
		let leftX = idxToX(selection.start, len) - halfPx;
		let rightX = idxToX(selection.end, len) + halfPx;
		let dLeft = Math.abs(mx - leftX);
		let dRight = Math.abs(mx - rightX);
		if (dLeft <= grab && dLeft <= dRight) return 'left';
		if (dRight <= grab) return 'right';
		return null;
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
		let mx = e.clientX - rect.left - marginLeft;
		let pw = plotW || (w - marginLeft);
		let frac = Math.max(0, Math.min(1, mx / pw));
		let span = targetEnd - targetStart;

		if (Math.abs(dx) > 0) {
			let shift = dx / pw * span;
			targetStart += shift;
			targetEnd += shift;
		}

		if (Math.abs(dy) > 0) {
			let zoomFactor = 1 + dy * 0.003;
			let anchor = targetStart + frac * span;
			let newSpan = span * zoomFactor;
			newSpan = Math.max(minSpan, Math.min(1, newSpan));
			targetStart = anchor - frac * newSpan;
			targetEnd = targetStart + newSpan;
		}

		clampTarget();
		inertia.kill();
		startAnimation();
	}

	/** @param {MouseEvent} e */
	function onMouseDown(e) {
		let edge = hitTestSelEdge(e.clientX);
		if (edge) {
			selEdgeDrag = edge;
			return;
		}
		if (e.shiftKey) {
			isSelecting = true;
			selDragStart = clientXToSample(e.clientX);
			selection = { start: selDragStart, end: selDragStart };
			return;
		}
		isDragging = true;
		dragStartX = e.clientX;
		dragStartView = viewStart;
		dragMoved = false;
		selDragStart = clientXToSample(e.clientX);
		inertia.start(e.clientX);
	}

	/** @param {MouseEvent} e */
	function onMouseMove(e) {
		if (selEdgeDrag && selection) {
			let idx = clientXToSample(e.clientX);
			idx = Math.max(0, Math.min(data.length - 1, idx));
			if (selEdgeDrag === 'left') {
				selection = { start: Math.min(idx, selection.end), end: selection.end };
			} else {
				selection = { start: selection.start, end: Math.max(idx, selection.start) };
			}
			return;
		}
		if (isSelecting) {
			let idx = clientXToSample(e.clientX);
			idx = Math.max(0, Math.min(data.length - 1, idx));
			selection = {
				start: Math.min(selDragStart, idx),
				end: Math.max(selDragStart, idx)
			};
			return;
		}
		if (!isDragging) return;
		let dx = e.clientX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			let pw = plotW || (w - marginLeft);
			inertia.track(e.clientX, pw, viewEnd - viewStart);

			let span = viewEnd - viewStart;
			let shift = -(dx / pw) * span;
			targetStart = dragStartView + shift;
			targetEnd = targetStart + span;
			viewStart = targetStart;
			viewEnd = targetEnd;
			clampView();
			clampTarget();
		}
	}

	/** @param {MouseEvent} e */
	function onSvgMouseMove(e) {
		// Check if near selection edge for cursor
		if (selection && !isDragging && !isSelecting && !selEdgeDrag) {
			let wasNear = nearEdge;
			nearEdge = hitTestSelEdge(e.clientX) !== null;
			if (nearEdge !== wasNear) {
				// Cursor managed via CSS class
			}
		} else if (nearEdge && !selEdgeDrag) {
			nearEdge = false;
		}

		let visibleLen = Math.ceil((viewEnd - viewStart) * data.length);
		let pxPerSample = (plotW || (w - marginLeft)) / visibleLen;
		if (pxPerSample >= 8) {
			let idx = clientXToSample(e.clientX);
			if (idx >= 0 && idx < data.length && idx !== hoveredSample) {
				hoveredSample = idx;
			}
		} else if (hoveredSample >= 0) {
			hoveredSample = -1;
		}
	}

	function onSvgMouseLeave() {
		if (hoveredSample >= 0) {
			hoveredSample = -1;
		}
		nearEdge = false;
	}

	/** @param {MouseEvent} e */
	function onMouseUp(e) {
		if (selEdgeDrag) {
			selEdgeDrag = null;
			return;
		}
		if (isSelecting) {
			isSelecting = false;
			return;
		}
		if (isDragging && !dragMoved && selection) {
			selection = null;
		}
		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
	}

	function cancelLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	/** @param {TouchEvent} e */
	function onTouchStart(e) {
		let touches = e.touches;
		cancelLongPress();

		if (touches.length === 2) {
			e.preventDefault();
			touchSelecting = false;
			touchEdgeDrag = null;
			let t0 = touches[0], t1 = touches[1];
			let rect = svgEl.getBoundingClientRect();
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
			let rect = svgEl.getBoundingClientRect();
			touchStartPos = { x: t.clientX - rect.left, y: t.clientY - rect.top };
			touchLocked = null;
			touchSelecting = false;
			touchEdgeDrag = null;

			// Check if touching a selection edge first
			let edge = hitTestSelEdge(t.clientX, TOUCH_EDGE_GRAB);
			if (edge) {
				e.preventDefault();
				touchEdgeDrag = edge;
				return;
			}

			isDragging = true;
			dragStartX = t.clientX;
			dragStartView = viewStart;
			dragMoved = false;
			inertia.start(t.clientX);

			// Start long-press timer for selection
			let startClientX = t.clientX;
			longPressTimer = setTimeout(() => {
				longPressTimer = null;
				// Only activate if finger hasn't moved significantly
				if (!dragMoved && touchLocked === null) {
					e.preventDefault();
					isDragging = false;
					touchSelecting = true;
					selDragStart = clientXToSample(startClientX);
					selection = { start: selDragStart, end: selDragStart };
				}
			}, LONG_PRESS_MS);
		}
	}

	/** @param {TouchEvent} e */
	function onTouchMove(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			cancelLongPress();
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
			startAnimation();
			return;
		}
		if (touches.length === 1) {
			let t = touches[0];

			// Edge drag on existing selection
			if (touchEdgeDrag && selection) {
				e.preventDefault();
				let idx = clientXToSample(t.clientX);
				idx = Math.max(0, Math.min(data.length - 1, idx));
				if (touchEdgeDrag === 'left') {
					selection = { start: Math.min(idx, selection.end), end: selection.end };
				} else {
					selection = { start: selection.start, end: Math.max(idx, selection.start) };
				}
				return;
			}

			// Long-press selection drag
			if (touchSelecting) {
				e.preventDefault();
				let idx = clientXToSample(t.clientX);
				idx = Math.max(0, Math.min(data.length - 1, idx));
				selection = {
					start: Math.min(selDragStart, idx),
					end: Math.max(selDragStart, idx)
				};
				return;
			}

			if (!touchStartPos) return;
			let rect = svgEl.getBoundingClientRect();
			let tx = t.clientX - rect.left;
			let ty = t.clientY - rect.top;

			if (touchLocked === null) {
				let dx = Math.abs(tx - touchStartPos.x);
				let dy = Math.abs(ty - touchStartPos.y);
				if (dx > dragThreshold || dy > dragThreshold) {
					cancelLongPress();
					touchLocked = dx > dy ? 'pan' : 'scroll';
				}
			}

			if (touchLocked === 'pan') {
				e.preventDefault();
				let pw = plotW || (w - marginLeft);
				inertia.track(t.clientX, pw, viewEnd - viewStart);

				let dx = t.clientX - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let span = viewEnd - viewStart;
					let shift = -(dx / pw) * span;
					targetStart = dragStartView + shift;
					targetEnd = targetStart + span;
					viewStart = targetStart;
					viewEnd = targetEnd;
					clampView();
					clampTarget();
				}
			} else if (touchLocked === 'scroll') {
				isDragging = false;
			}
		}
	}

	/** @param {TouchEvent} e */
	function onTouchEnd(e) {
		cancelLongPress();

		if (touchEdgeDrag) {
			touchEdgeDrag = null;
			touchStartPos = null;
			return;
		}

		if (touchSelecting) {
			touchSelecting = false;
			touchStartPos = null;
			return;
		}

		// Tap to clear selection
		if (isDragging && !dragMoved && selection && e.touches.length === 0) {
			selection = null;
		}

		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
		touchStartPos = null;
		touchLocked = null;
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
		cancelLongPress();
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
</script>

<ScrollHint visible={$hintVisible}>
	<svg
		bind:this={svgEl}
		width="100%"
		height={h}
		class="waveform {cursorClass}"
		on:mousedown={onMouseDown}
		on:mousemove={onSvgMouseMove}
		on:mouseleave={onSvgMouseLeave}
	>
		<defs>
			<clipPath id={clipId}>
				<rect x={marginLeft} y={gridLayout ? gridLayout.marginTop : 0}
					width={Math.max(0, plotW)} height={gridLayout ? gridLayout.plotH : h} />
			</clipPath>
		</defs>

		{#if ready && gridLayout}
			<!-- Y gridlines -->
			{#each gridLayout.yGridItems as line}
				<line x1={marginLeft} y1={line.y} x2={w} y2={line.y}
					stroke="var(--bg3)" stroke-width="1"
					stroke-dasharray={line.value === 0 ? 'none' : '3,4'}
					opacity={line.value === 0 ? 0.3 : 0.15} />
				{#if line.label}
					<text x={marginLeft - 4} y={line.y}
						class="wf-label wf-label-y"
						opacity="0.6">{line.label}</text>
				{/if}
			{/each}

			<!-- X gridlines -->
			{#each gridLayout.xGridItems as line}
				<line x1={line.x} y1={gridLayout.marginTop} x2={line.x} y2={gridLayout.marginTop + gridLayout.plotH}
					stroke="var(--bg3)" stroke-width="1" stroke-dasharray="3,4" opacity="0.15" />
				{#if line.label}
					<text x={line.x} y={gridLayout.marginTop + gridLayout.plotH + 11}
						class="wf-label wf-label-x"
						opacity="0.6">{line.label}</text>
				{/if}
			{/each}

			<!-- X sub-gridlines -->
			{#each gridLayout.xSubGridItems as line}
				<line x1={line.x} y1={gridLayout.marginTop} x2={line.x} y2={gridLayout.marginTop + gridLayout.plotH}
					stroke="var(--bg3)" stroke-width="1" stroke-dasharray="2,4" opacity="0.12" />
				{#if line.label}
					<text x={line.x} y={gridLayout.marginTop + gridLayout.plotH + 11}
						class="wf-label wf-label-x"
						opacity="0.4">{line.label}</text>
				{/if}
			{/each}

			<!-- Clipped waveform content -->
			<g clip-path="url(#{clipId})">
				{#if waveformData}
					<!-- Selection highlight -->
					{#if waveformData.selRect}
						<rect x={waveformData.selRect.x1} y={gridLayout.marginTop}
							width={Math.max(0, waveformData.selRect.x2 - waveformData.selRect.x1)}
							height={gridLayout.plotH}
							fill={color} opacity="0.1" />
						<line x1={waveformData.selRect.x1} y1={gridLayout.marginTop}
							x2={waveformData.selRect.x1} y2={gridLayout.marginTop + gridLayout.plotH}
							stroke={color} stroke-width="1" opacity="0.5" />
						<line x1={waveformData.selRect.x2} y1={gridLayout.marginTop}
							x2={waveformData.selRect.x2} y2={gridLayout.marginTop + gridLayout.plotH}
							stroke={color} stroke-width="1" opacity="0.5" />
					{/if}

					<!-- Waveform -->
					{#if waveformData.mode === 'line'}
						<path d={waveformData.linePath} fill="none" stroke={color} stroke-width="1" />
						{#if waveformData.dots}
							{#each waveformData.dots as dot}
								<circle cx={dot.x} cy={dot.y} r={dot.r}
									fill={color} opacity={dot.opacity} />
							{/each}
						{/if}
					{:else if waveformData.mode === 'envelope'}
						<path d={waveformData.fillPath} fill={color} stroke={color} stroke-width="1" />
					{/if}
				{/if}
			</g>
		{/if}
	</svg>
</ScrollHint>

<style>
	.waveform {
		display: block;
		width: 100%;
		padding: 0.4rem 0;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
		box-sizing: content-box;
		user-select: none;
		-webkit-user-select: none;
	}

	.waveform.dragging { cursor: grabbing; }
	.waveform.selecting { cursor: crosshair; }
	.waveform.edge-drag, .waveform.edge-hover { cursor: ew-resize; }

	.waveform text {
		font-family: 'Fira Mono', monospace;
		pointer-events: none;
	}

	.wf-label {
		font-size: 11px;
		fill: var(--fg4);
	}

	.wf-label-y {
		text-anchor: end;
		dominant-baseline: central;
	}

	.wf-label-x {
		text-anchor: middle;
		dominant-baseline: auto;
	}
</style>
