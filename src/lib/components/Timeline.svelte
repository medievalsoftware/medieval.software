<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadProps, saveProps } from '$lib/persist.js';
	import { createScrollHint, shouldBlockWheel, createInertia } from '../canvasInteraction.js';
	import ScrollHint from './ScrollHint.svelte';

	/** @type {{ date: string, label: string, color: number[], detail?: string | string[], link?: string }[]} */
	export let events = [];
	/** @type {{ start: string, end: string, label: string, color: number[], detail?: string | string[], group?: string }[]} */
	export let spans = [];
	/** @type {string} */
	export let title = '';

	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const clipId = `tl-${Math.random().toString(36).slice(2, 8)}`;

	const margin = { left: 40, right: 20 };
	const topPad = 16;
	const boxH = 24;
	const boxPad = 6;
	const rowH = boxH + 12;
	const spanH = 20;
	const spanGap = 4;
	const bottomPad = 12;
	const iconSize = 8;
	const iconGap = 4;
	const iconHalf = iconSize / 2;
	const dotRadius = 3;
	const dotHitRadius = 10;
	const boxRadius = 3;
	const minViewMonths = 4;

	// --- State ---

	let svgEl;
	let measureCtx;
	let w = 0;
	let h = 100;

	let startYear = 0, startMonth = 0, totalMonths = 1;
	let todayPos = 0, showToday = false;
	let spanRowMap = [];
	let totalSpanRows = 1;
	let storageKey = '';

	let viewStart = 0, viewMonths = 12;
	let targetViewStart = 0, targetViewMonths = 12;

	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;
	const dragThreshold = 4;

	let pinnedEvent = -1, pinnedSpan = -1;
	let pinnedX = 0, pinnedY = 0;

	let mouseX = -1, mouseY = -1;
	let hoveredEvent = -1, hoveredSpan = -1, hoveredViaBox = false;

	let pinchStartDist = 0, pinchStartMonths = 0, pinchStartViewStart = 0, pinchAnchorFrac = 0.5;
	let touchStartPos = null;
	let touchLocked = null;

	let raf = 0;
	let animating = false;

	const inertia = createInertia();
	const hint = createScrollHint();
	const hintVisible = hint.visible;

	// --- Helpers ---

	function parseDate(s) {
		if (s === 'today') {
			let now = new Date();
			return new Date(now.getFullYear(), now.getMonth(), now.getDate());
		}
		return new Date(s + 'T00:00:00');
	}

	function formatDate(s) {
		let d = parseDate(s);
		let formatted = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
		return s === 'today' ? formatted + ' (today)' : formatted;
	}

	function dateToPos(s) {
		let d = parseDate(s);
		let m = (d.getFullYear() - startYear) * 12 + d.getMonth() - startMonth;
		let daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		return m + (d.getDate() - 1) / daysInMonth;
	}

	function clampView() {
		viewMonths = Math.max(minViewMonths, Math.min(totalMonths, viewMonths));
		viewStart = Math.max(0, Math.min(totalMonths - viewMonths, viewStart));
	}

	function rgb(c) { return `rgb(${c[0]},${c[1]},${c[2]})`; }

	// --- Init ---

	function initData() {
		let allDates = [
			...events.map(e => parseDate(e.date)),
			...spans.flatMap(s => [parseDate(s.start), parseDate(s.end)]),
		];
		if (allDates.length === 0) return;
		let minDate = new Date(Math.min(...allDates));
		let maxDate = new Date(Math.max(...allDates));

		startYear = minDate.getFullYear();
		startMonth = minDate.getMonth();
		totalMonths = (maxDate.getFullYear() - startYear) * 12 + (maxDate.getMonth() - startMonth) + 1;

		let today = new Date();
		let todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		todayPos = dateToPos(todayStr);
		showToday = todayPos >= 0 && todayPos <= totalMonths;

		// Span row assignments
		spanRowMap = [];
		totalSpanRows = 0;
		let groupRows = {};
		let rowOccupied = [];

		for (let i = 0; i < spans.length; i++) {
			let s = spans[i];
			let sStart = dateToPos(s.start);
			let sEnd = dateToPos(s.end);

			if (s.group && s.group in groupRows) {
				spanRowMap[i] = groupRows[s.group];
				rowOccupied[spanRowMap[i]].push([sStart, sEnd]);
			} else {
				let row = 0;
				while (true) {
					if (!rowOccupied[row]) rowOccupied[row] = [];
					let fits = true;
					for (let [rs, re] of rowOccupied[row]) {
						if (sStart < re && sEnd > rs) { fits = false; break; }
					}
					if (fits) break;
					row++;
				}
				spanRowMap[i] = row;
				if (s.group) groupRows[s.group] = row;
				rowOccupied[row].push([sStart, sEnd]);
				if (row + 1 > totalSpanRows) totalSpanRows = row + 1;
			}
		}
		if (totalSpanRows === 0) totalSpanRows = 1;

		storageKey = title || 'timeline';
		let saved = loadProps('timeline:' + storageKey);
		let defaultViewMonths = Math.min(12, totalMonths);
		viewMonths = saved.viewMonths ?? defaultViewMonths;
		viewStart = saved.viewStart ?? 0;
		targetViewMonths = viewMonths;
		targetViewStart = viewStart;
		clampView();
	}

	// --- Layout computations ---

	function computeEventLayout(vs, vm, cw) {
		if (!measureCtx || cw <= 0) return { layout: events.map(() => null), rows: 1 };

		function toX(month) {
			return margin.left + ((month - vs) / vm) * cw;
		}

		measureCtx.font = "13px 'Fira Mono', monospace";
		let rows = [];
		let contentLeft = margin.left;
		let contentRight = margin.left + cw;

		let layout = events.map((e) => {
			let pos = dateToPos(e.date);
			let x = toX(pos);
			let tw = measureCtx.measureText(e.label).width;
			let hasIcon = e.link || (e.detail && (Array.isArray(e.detail) ? e.detail.length > 0 : e.detail.length > 0));
			let bw = boxPad + tw + (hasIcon ? iconGap + iconSize : 0) + boxPad;
			let bx = x - bw / 2;

			if (bx + bw < contentLeft - bw || bx > contentRight + bw) return null;
			bx = Math.max(contentLeft, Math.min(contentRight - bw, bx));

			let row = 0;
			while (true) {
				if (!rows[row]) rows[row] = [];
				let fits = true;
				for (let placed of rows[row]) {
					if (bx < placed.right + 6 && bx + bw > placed.left - 6) { fits = false; break; }
				}
				if (fits) break;
				row++;
			}
			rows[row].push({ left: bx, right: bx + bw });
			return { x, boxX: bx, boxW: bw, tw, row, hasIcon, hasLink: !!e.link };
		});

		let numRows = Math.max(1, rows.length);
		let tY = topPad + numRows * rowH + 44;
		for (let l of layout) {
			if (l) l.boxY = tY - 44 - l.row * rowH;
		}

		return { layout, rows: numRows };
	}

	function truncateLabel(text, availW) {
		if (!measureCtx || availW <= 12) return null;
		measureCtx.font = "12px 'Fira Mono', monospace";
		if (measureCtx.measureText(text).width <= availW) return text;
		let ew = measureCtx.measureText('...').width;
		while (text.length > 0 && measureCtx.measureText(text).width + ew > availW) {
			text = text.slice(0, -1);
		}
		return text + '...';
	}

	// --- Reactive layout ---

	$: contentW = w - margin.left - margin.right;
	$: ready = !!measureCtx;
	$: elResult = ready ? computeEventLayout(viewStart, viewMonths, contentW) : { layout: events.map(() => null), rows: 1 };
	$: eventLayout = elResult.layout;
	$: eventRows = elResult.rows;
	$: timelineY = topPad + eventRows * rowH + 44;
	$: spanStartY = timelineY + 36;
	$: spanBottomY = spanStartY + totalSpanRows * (spanH + spanGap);
	$: naturalH = spanBottomY + bottomPad;
	$: h = Math.max(h, naturalH);
	$: yOffset = h - naturalH;
	$: monthW = contentW > 0 && viewMonths > 0 ? contentW / viewMonths : 60;

	// Position helper (reactive — reassigned when viewport changes)
	$: mToX = contentW > 0 && viewMonths > 0
		? (month) => margin.left + ((month - viewStart) / viewMonths) * contentW
		: () => -1000;

	// Today x
	$: todayX = showToday ? mToX(todayPos) : -1000;

	// Grid ticks
	$: gridData = ready ? computeGrid(viewStart, viewMonths, contentW, totalMonths, startMonth, startYear, monthW) : { monthTicks: [], weekTicks: [] };

	function computeGrid(vs, vm, cw, tm, sm, sy, mw) {
		if (cw <= 0 || vm <= 0) return { monthTicks: [], weekTicks: [] };
		function toX(month) {
			return margin.left + ((month - vs) / vm) * cw;
		}

		let weekTicks = [];
		if (mw > 20) {
			for (let i = 0; i < tm; i++) {
				for (let wk = 1; wk < 4; wk++) {
					let x = toX(i + wk / 4);
					if (x >= margin.left - 10 && x <= margin.left + cw + 10) {
						weekTicks.push(x);
					}
				}
			}
		}

		let labelW = measureCtx ? measureCtx.measureText('Mar').width + 6 : 30;
		let skip = Math.max(1, Math.ceil(labelW / mw));

		let monthTicks = [];
		for (let i = 0; i <= tm; i++) {
			let x = toX(i);
			if (x < margin.left - 60 || x > margin.left + cw + 60) continue;

			let mi = i < tm ? (sm + i) % 12 : -1;
			let isYear = mi === 0 && i > 0;
			let yr = sy + Math.floor((sm + i) / 12);
			let isLast = i === tm - 1;
			let showLabel = i < tm && (isLast || (i % skip === 0));
			let showYearLabel = mi === 0 || i === 0;

			monthTicks.push({
				x, isYear,
				tickLen: isYear ? 8 : 5,
				labelX: toX(i + 0.5),
				label: showLabel ? MONTH_NAMES[mi] : null,
				yearLabel: showYearLabel ? String(yr) : null,
			});
		}

		return { monthTicks, weekTicks };
	}

	// Span layout
	$: spanLayout = ready ? computeSpans(spans, viewStart, viewMonths, contentW, spanRowMap, spanStartY) : [];

	function computeSpans(sp, vs, vm, cw, rowMap, startY) {
		if (cw <= 0 || vm <= 0) return [];
		function toX(month) {
			return margin.left + ((month - vs) / vm) * cw;
		}
		return sp.map((s, i) => {
			let x1 = toX(dateToPos(s.start));
			let x2 = toX(dateToPos(s.end));
			let y = startY + (rowMap[i] ?? 0) * (spanH + spanGap);
			let labelX = Math.max(x1 + 6, margin.left + 6);
			let availW = x2 - labelX - 6;
			let label = truncateLabel(s.label, availW);
			return { x1, x2, y, label, labelX, colorStr: rgb(s.color), ongoing: s.end === 'today' };
		});
	}

	// Hit testing (reactive, runs on mouse move and layout changes)
	$: {
		if (mouseX >= 0 && mouseY >= 0) {
			let hE = -1, hS = -1, hVB = false;

			// Test spans
			for (let i = 0; i < spanLayout.length; i++) {
				let s = spanLayout[i];
				if (mouseX >= s.x1 && mouseX <= s.x2 && mouseY >= s.y && mouseY <= s.y + spanH) {
					hS = i;
				}
			}

			// Test events (back to front)
			for (let i = eventLayout.length - 1; i >= 0; i--) {
				let l = eventLayout[i];
				if (!l) continue;
				let hitBox = mouseX >= l.boxX && mouseX <= l.boxX + l.boxW && mouseY >= l.boxY && mouseY <= l.boxY + boxH;
				let dx = mouseX - l.x, dy = mouseY - timelineY;
				let hitDot = dx * dx + dy * dy <= dotHitRadius * dotHitRadius;
				if (hitBox || hitDot) {
					hE = i;
					hVB = hitBox;
					break;
				}
			}

			hoveredEvent = hE;
			hoveredSpan = hS;
			hoveredViaBox = hVB;
		} else {
			hoveredEvent = -1;
			hoveredSpan = -1;
			hoveredViaBox = false;
		}
	}

	// Tooltip
	$: tipTarget = pinnedEvent >= 0 ? pinnedEvent : hoveredEvent;
	$: tipSpanTarget = tipTarget < 0 ? (pinnedSpan >= 0 ? pinnedSpan : hoveredSpan) : -1;
	$: tipAnchorX = (pinnedEvent >= 0 || pinnedSpan >= 0) ? pinnedX : mouseX;
	$: tipAnchorY = (pinnedEvent >= 0 || pinnedSpan >= 0) ? pinnedY : mouseY;

	$: tipLines = computeTipLines(tipTarget, tipSpanTarget);
	function computeTipLines(evtIdx, spnIdx) {
		function detailLines(detail) {
			if (!detail) return [];
			if (Array.isArray(detail)) return detail;
			return detail.split('\n');
		}
		if (evtIdx >= 0 && evtIdx < events.length) {
			let e = events[evtIdx];
			return [formatDate(e.date), ...detailLines(e.detail)];
		} else if (spnIdx >= 0 && spnIdx < spans.length) {
			let s = spans[spnIdx];
			return [formatDate(s.start) + '  —  ' + formatDate(s.end), ...detailLines(s.detail)];
		}
		return [];
	}

	$: tipDim = computeTipDim(tipLines, tipAnchorX, tipAnchorY, w);
	function computeTipDim(lines, ax, ay, width) {
		if (lines.length === 0 || !measureCtx) return null;
		measureCtx.font = "12px 'Fira Mono', monospace";
		let padX = 6, padY = 5, lineH = 14;
		let maxW = 0;
		for (let tl of lines) {
			let tw = measureCtx.measureText(tl).width;
			if (tw > maxW) maxW = tw;
		}
		let tipW = maxW + padX * 2;
		let tipH = padY * 2 + lines.length * lineH;
		let tipX = Math.max(0, Math.min(width - tipW - 2, ax + 12));
		let tipY = ay - tipH - 8;
		if (tipY < 2) tipY = ay + 16;
		return { x: tipX, y: tipY, w: tipW, h: tipH, padX, padY, lineH };
	}

	// Cursor
	$: cursorClass = isDragging && dragMoved ? 'dragging' : (hoveredEvent >= 0 || hoveredSpan >= 0) ? 'hovering' : '';

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
			targetViewStart += inertiaDelta;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
		}

		let lerpAmt = 0.4;
		let prevStart = viewStart;
		let prevMonths = viewMonths;
		viewStart += (targetViewStart - viewStart) * lerpAmt;
		viewMonths += (targetViewMonths - viewMonths) * lerpAmt;

		let still = Math.abs(viewStart - targetViewStart) < 0.01
			&& Math.abs(viewMonths - targetViewMonths) < 0.01
			&& !inertia.isMoving;

		if (still) {
			viewStart = targetViewStart;
			viewMonths = targetViewMonths;
			animating = false;
		} else {
			raf = requestAnimationFrame(animate);
		}

		clampView();

		if (Math.abs(viewStart - prevStart) > 0.001 || Math.abs(viewMonths - prevMonths) > 0.001) {
			saveProps('timeline:' + storageKey, { viewStart, viewMonths });
		}
	}

	// --- Resize ---

	function resize() {
		if (!svgEl) return;
		w = svgEl.getBoundingClientRect().width;
	}

	// --- Event Handlers ---

	function onMouseDown(e) {
		if (e.button !== 0) return;
		let rect = svgEl.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top - yOffset;
		if (x < 0 || x > w) return;
		isDragging = true;
		dragStartX = x;
		dragStartView = viewStart;
		dragMoved = false;
		inertia.start(e.clientX);
	}

	function onMouseMove(e) {
		let rect = svgEl.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top - yOffset;

		if (!isDragging) return;

		let dx = mouseX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			inertia.track(e.clientX, contentW, viewMonths);
			let monthsPerPx = viewMonths / contentW;
			viewStart = dragStartView - dx * monthsPerPx;
			targetViewStart = viewStart;
			clampView();
			targetViewStart = viewStart;
		}
	}

	function onMouseUp(e) {
		if (isDragging && !dragMoved) {
			let rect = svgEl.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top - yOffset;
			handleClick(x, y);
		}
		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
	}

	function onMouseLeave() {
		mouseX = -1;
		mouseY = -1;
	}

	function handleClick(x, y) {
		if (hoveredEvent >= 0) {
			let ev = events[hoveredEvent];
			if (ev.link && hoveredViaBox) {
				window.location.href = ev.link;
				return;
			}
			if (pinnedEvent === hoveredEvent) {
				pinnedEvent = -1;
			} else {
				pinnedEvent = hoveredEvent;
				pinnedSpan = -1;
				pinnedX = x;
				pinnedY = y;
			}
		} else if (hoveredSpan >= 0) {
			if (pinnedSpan === hoveredSpan) {
				pinnedSpan = -1;
			} else {
				pinnedSpan = hoveredSpan;
				pinnedEvent = -1;
				pinnedX = x;
				pinnedY = y;
			}
		} else {
			pinnedEvent = -1;
			pinnedSpan = -1;
		}
	}

	function onWheel(e) {
		let rect = svgEl.getBoundingClientRect();
		let mx = e.clientX - rect.left;
		let my = e.clientY - rect.top;
		if (mx < margin.left || mx > w - margin.right) return;
		if (my < 0 || my > h) return;

		if (shouldBlockWheel(e)) {
			hint.show();
			return;
		}

		e.preventDefault();
		let dx = e.deltaX || 0;
		let dy = e.deltaY || 0;

		if (Math.abs(dx) > 0) {
			let monthsPerPx = targetViewMonths / contentW;
			targetViewStart += dx * monthsPerPx;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
		}

		if (Math.abs(dy) > 0) {
			let zoomAnchorFrac = (mx - margin.left) / contentW;
			let monthUnderCursor = targetViewStart + zoomAnchorFrac * targetViewMonths;
			let zoomFactor = 1 + dy * 0.003;
			targetViewMonths *= zoomFactor;
			targetViewMonths = Math.max(minViewMonths, Math.min(totalMonths, targetViewMonths));
			targetViewStart = monthUnderCursor - zoomAnchorFrac * targetViewMonths;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
		}

		startAnimation();
	}

	function onTouchStart(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let rect = svgEl.getBoundingClientRect();
			let t0 = touches[0], t1 = touches[1];
			pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			pinchStartMonths = targetViewMonths;
			pinchStartViewStart = targetViewStart;
			let midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
			pinchAnchorFrac = (midX - margin.left) / contentW;
			isDragging = false;
			touchLocked = 'pan';
			return;
		}
		if (touches.length === 1) {
			let t = touches[0];
			let rect = svgEl.getBoundingClientRect();
			let tx = t.clientX - rect.left;
			let ty = t.clientY - rect.top - yOffset;
			touchStartPos = { x: tx, y: ty };
			touchLocked = null;
			inertia.start(t.clientX);

			if (tx >= 0 && tx <= w && ty >= 0 && ty <= h) {
				isDragging = true;
				dragStartX = tx;
				dragStartView = viewStart;
				dragMoved = false;
			}
		}
	}

	function onTouchMove(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let t0 = touches[0], t1 = touches[1];
			let dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			let scale = pinchStartDist / dist;
			let monthAnchor = pinchStartViewStart + pinchAnchorFrac * pinchStartMonths;
			targetViewMonths = pinchStartMonths * scale;
			targetViewMonths = Math.max(minViewMonths, Math.min(totalMonths, targetViewMonths));
			targetViewStart = monthAnchor - pinchAnchorFrac * targetViewMonths;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
			startAnimation();
			return;
		}
		if (touches.length === 1 && touchStartPos) {
			let t = touches[0];
			let rect = svgEl.getBoundingClientRect();
			let tx = t.clientX - rect.left;
			let ty = t.clientY - rect.top - yOffset;

			if (touchLocked === null) {
				let dx = Math.abs(tx - touchStartPos.x);
				let dy = Math.abs(ty - touchStartPos.y);
				if (dx > dragThreshold || dy > dragThreshold) {
					touchLocked = dx > dy ? 'pan' : 'scroll';
				}
			}

			if (touchLocked === 'pan') {
				e.preventDefault();
				inertia.track(t.clientX, contentW, viewMonths);
				let dx = tx - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let monthsPerPx = viewMonths / contentW;
					viewStart = dragStartView - dx * monthsPerPx;
					targetViewStart = viewStart;
					clampView();
					targetViewStart = viewStart;
				}
			} else if (touchLocked === 'scroll') {
				isDragging = false;
			}
		}
	}

	function onTouchEnd(e) {
		if (e.touches.length === 0 && isDragging && !dragMoved && touchStartPos) {
			// Hit test at touch position
			mouseX = touchStartPos.x;
			mouseY = touchStartPos.y;
			// Force hover recompute by reading the reactive block
			// (setting mouseX/mouseY triggers it)
			// Small delay to let reactive run, then handle click
			handleClick(touchStartPos.x, touchStartPos.y);
		}
		if (isDragging) {
			inertia.staleCheck();
			if (inertia.isMoving) startAnimation();
		}
		isDragging = false;
		touchStartPos = null;
		touchLocked = null;
	}

	// --- Lifecycle ---

	let mqlCleanup;

	onMount(async () => {
		initData();
		resize();
		await document.fonts.ready;
		// Create measurement context only after fonts are loaded
		// so text measurements use the correct font metrics
		let c = document.createElement('canvas');
		measureCtx = c.getContext('2d');
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
		mqlCleanup?.();
	});
</script>

<ScrollHint visible={$hintVisible}>
	<svg
		bind:this={svgEl}
		width="100%"
		height={h}
		class="timeline {cursorClass}"
		on:mousedown={onMouseDown}
		on:mouseleave={onMouseLeave}
	>
		<defs>
			<clipPath id={clipId}>
				<rect x={margin.left - 1} y={0} width={Math.max(0, contentW + 2)} height={h} />
			</clipPath>
		</defs>

		<g transform="translate(0,{yOffset})">
		<g clip-path="url(#{clipId})" opacity={ready ? 1 : 0}>
			<!-- Timeline bar -->
			<line
				x1={margin.left} y1={timelineY}
				x2={w - margin.right} y2={timelineY}
				stroke="var(--bg3)" stroke-width="2"
			/>

			<!-- Week ticks -->
			{#each gridData.weekTicks as x}
				<line x1={x} y1={timelineY - 2} x2={x} y2={timelineY + 2}
					stroke="var(--bg2)" stroke-width="1" />
			{/each}

			<!-- Month ticks -->
			{#each gridData.monthTicks as tick}
				<!-- Tick mark -->
				<line x1={tick.x} y1={timelineY - tick.tickLen} x2={tick.x} y2={timelineY + tick.tickLen}
					stroke="var(--bg3)" stroke-width={tick.isYear ? 2 : 1} />

				<!-- Year boundary dashed line -->
				{#if tick.isYear}
					<line x1={tick.x} y1={timelineY + 8} x2={tick.x} y2={spanBottomY}
						stroke="var(--bg2)" stroke-width="1" stroke-dasharray="2,4" opacity="0.3" />
				{/if}

				<!-- Month label -->
				{#if tick.label}
					<text x={tick.labelX} y={timelineY + 8} class="tl-month">{tick.label}</text>
				{/if}

				<!-- Year label -->
				{#if tick.yearLabel}
					<text x={tick.labelX} y={timelineY + 20} class="tl-year">{tick.yearLabel}</text>
				{/if}
			{/each}

			<!-- Today marker -->
			{#if showToday}
				<line x1={todayX} y1={topPad} x2={todayX} y2={spanBottomY}
					stroke="var(--orange)" stroke-width="1" stroke-dasharray="4,3" opacity="0.4" />
				<text x={todayX} y={topPad - 2} class="tl-today">TODAY</text>
			{/if}

			<!-- Span boundary lines -->
			{#each spanLayout as s, i}
				{@const hovered = hoveredSpan === i}
				<line x1={s.x1} y1={timelineY} x2={s.x1} y2={spanBottomY}
					stroke={hovered ? s.colorStr : 'var(--bg2)'}
					stroke-width="1" stroke-dasharray="3,4"
					opacity={hovered ? 0.7 : 0.4} />
				<line x1={s.x2} y1={timelineY} x2={s.x2} y2={spanBottomY}
					stroke={hovered ? s.colorStr : 'var(--bg2)'}
					stroke-width="1" stroke-dasharray="3,4"
					opacity={hovered ? 0.7 : 0.4} />
			{/each}

			<!-- Span bars -->
			{#each spanLayout as s, i}
				{@const hovered = hoveredSpan === i}
				{#if s.ongoing}
					<rect x={s.x2} y={s.y} width={Math.max(0, w - margin.right - s.x2)} height={spanH}
						fill={s.colorStr} opacity={hovered ? 0.24 : 0.12} rx="0" />
				{/if}
				<rect x={s.x1} y={s.y} width={Math.max(1, s.x2 - s.x1)} height={spanH}
					fill={s.colorStr} opacity={hovered ? 0.86 : 0.47} rx="2" />
				{#if s.label}
					<text x={s.labelX} y={s.y + spanH / 2} class="tl-span-label"
						opacity={hovered ? 1 : 0.78}>{s.label}</text>
				{/if}
			{/each}

			<!-- Event connector lines -->
			{#each eventLayout as l, i}
				{#if l}
					{@const hovered = hoveredEvent === i}
					<line x1={l.x} y1={l.boxY + boxH - boxRadius} x2={l.x} y2={timelineY - 2}
						stroke={rgb(events[i].color)}
						opacity={hovered ? 0.7 : 0.3} stroke-width="1" />
				{/if}
			{/each}

			<!-- Event dots -->
			{#each eventLayout as l, i}
				{#if l}
					{@const hovered = hoveredEvent === i}
					<circle cx={l.x} cy={timelineY}
						r={hovered ? dotRadius * 2 : dotRadius}
						fill={rgb(events[i].color)}
						opacity={hovered ? 1 : 0.7} />
				{/if}
			{/each}

			<!-- Event boxes -->
			{#each eventLayout as l, i}
				{#if l}
					{@const hovered = hoveredEvent === i}
					{@const e = events[i]}
					<!-- Box background + border -->
					<rect x={l.boxX} y={l.boxY} width={l.boxW} height={boxH}
						rx={boxRadius}
						fill={hovered ? 'var(--bg2)' : 'var(--bg1)'}
						stroke={rgb(e.color)}
						stroke-opacity={hovered ? 0.78 : 0.39}
						stroke-width="1" />
					<!-- Label -->
					<text x={l.boxX + boxPad} y={l.boxY + boxH / 2}
						class="tl-event-label"
						fill={hovered ? 'var(--fg)' : 'var(--fg2)'}>{e.label}</text>
					<!-- Icon -->
					{#if l.hasLink}
						{@const ix = l.boxX + boxPad + l.tw + iconGap + iconHalf}
						{@const iy = l.boxY + boxH / 2}
						<g transform="translate({ix},{iy})">
							<path d="M0,-4 L-4,-4 L-4,4 L4,4 L4,0 M4,-4 L-1,1 M-1,-2.5 L-1,1 L2.5,1"
								fill="none" stroke={hovered ? 'var(--fg)' : 'var(--fg4)'}
								stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
						</g>
					{:else if l.hasIcon && !l.hasLink}
						{@const ix = l.boxX + boxPad + l.tw + iconGap + iconHalf}
						{@const iy = l.boxY + boxH / 2}
						<text x={ix} y={iy + 1} class="tl-info-icon"
							fill={hovered ? 'var(--fg)' : 'var(--fg4)'}>i</text>
					{/if}
				{/if}
			{/each}

			<!-- Today diamond -->
			{#if showToday}
				{@const tx = todayX}
				<polygon points="{tx},{timelineY - 5} {tx + 4},{timelineY} {tx},{timelineY + 5} {tx - 4},{timelineY}"
					fill="var(--orange)" />
			{/if}
		</g>

		<!-- Tooltip -->
		{#if tipDim}
			<rect x={tipDim.x} y={tipDim.y} width={tipDim.w} height={tipDim.h}
				rx="3" fill="var(--bg1)" opacity="0.9" />
			{#each tipLines as line, j}
				<text x={tipDim.x + tipDim.padX}
					y={tipDim.y + tipDim.padY + j * tipDim.lineH + tipDim.lineH / 2}
					class="tl-tip" fill={j === 0 ? 'var(--fg4)' : 'var(--fg)'}>{line}</text>
			{/each}
		{/if}
		</g>
	</svg>
</ScrollHint>

<style>
	.timeline {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
		user-select: none;
		-webkit-user-select: none;
	}

	.timeline.dragging { cursor: grabbing; }
	.timeline.hovering { cursor: pointer; }

	.timeline text {
		font-family: 'Fira Mono', monospace;
		pointer-events: none;
	}

	.tl-title {
		font-size: 14px;
		font-weight: bold;
		fill: var(--fg);
		dominant-baseline: hanging;
	}

	.tl-month {
		font-size: 12px;
		fill: var(--fg4);
		text-anchor: middle;
		dominant-baseline: hanging;
	}

	.tl-year {
		font-size: 11px;
		fill: var(--fg4);
		text-anchor: middle;
		dominant-baseline: hanging;
	}

	.tl-today {
		font-size: 11px;
		font-weight: bold;
		fill: var(--orange);
		text-anchor: middle;
		dominant-baseline: text-after-edge;
	}

	.tl-span-label {
		font-size: 12px;
		fill: var(--fg);
		dominant-baseline: central;
	}

	.tl-event-label {
		font-size: 13px;
		dominant-baseline: central;
	}

	.tl-info-icon {
		font-size: 11px;
		font-weight: bold;
		text-anchor: middle;
		dominant-baseline: central;
	}

	.tl-tip {
		font-size: 12px;
		dominant-baseline: central;
	}

</style>
