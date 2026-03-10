<script>
	import { onMount, onDestroy } from 'svelte';
	import { loadProps, saveProps } from '$lib/persist.js';

	/** @type {{ date: string, label: string, color: number[], detail?: string | string[], link?: string }[]} */
	export let events = [];
	/** @type {{ start: string, end: string, label: string, color: number[], detail?: string | string[], group?: string }[]} */
	export let spans = [];
	/** @type {string} */
	export let title = '';

	const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

	function hexToRgb(hex) {
		hex = hex.replace('#', '');
		return [
			parseInt(hex.substring(0, 2), 16),
			parseInt(hex.substring(2, 4), 16),
			parseInt(hex.substring(4, 6), 16),
		];
	}

	function readTheme(el) {
		let s = getComputedStyle(el);
		let v = (name) => hexToRgb(s.getPropertyValue(name).trim());
		return {
			bg: v('--bg_h'), bg1: v('--bg1'), bg2: v('--bg2'), bg3: v('--bg3'),
			fg: v('--fg'), fg2: v('--fg2'), fg4: v('--fg4'),
			orange: v('--orange'),
		};
	}

	let canvas;
	let ctx;
	let w = 0, h = 0;
	let dpr = 1;
	let raf = 0;
	let dirty = true;
	let theme;

	// Mouse tracking
	let mouseX = -1, mouseY = -1;

	// Computed layout data
	let startYear, startMonth, totalMonths;
	let todayPos, showToday;
	let spanRowMap = [];
	let totalSpanRows = 1;

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
	const dotRadius = 5;
	const dotHitRadius = dotRadius * 2;
	const boxRadius = 3;

	// Viewport
	const minViewMonths = 4;
	let viewMonths, viewStart;
	let targetViewMonths, targetViewStart;
	let storageKey;

	// Interaction
	let isDragging = false;
	let dragStartX = 0;
	let dragStartView = 0;
	let dragMoved = false;
	const dragThreshold = 4;

	let pinnedEvent = -1;
	let pinnedSpan = -1;
	let pinnedX = 0;
	let pinnedY = 0;

	let titleH = 0;
	let timelineY = 0;
	let eventRows = 1;
	let hoveredEvent = -1;
	let hoveredViaBox = false;
	let hoveredSpan = -1;
	let eventLayout = [];

	// Touch
	let pinchStartDist = 0;
	let pinchStartMonths = 0;
	let pinchStartViewStart = 0;
	let pinchAnchorFrac = 0.5;
	let touchStartPos = null;
	let touchLocked = null;

	// Inertia (Apple UIScrollView.DecelerationRate.normal = 0.998/ms)
	let velocity = 0;
	let lastDragX = 0;
	let lastDragTime = 0;
	let lastFrameTime = 0;
	const decayRate = 0.998;

	// --- Helpers ---

	function rgba(c, a = 1) {
		return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
	}

	function setFont(size, bold = false) {
		ctx.font = `${bold ? 'bold ' : ''}${size}px 'Fira Mono', monospace`;
	}

	function line(x1, y1, x2, y2) {
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	function fillRRect(x, y, rw, rh, r) {
		ctx.beginPath();
		ctx.roundRect(x, y, rw, rh, r);
		ctx.fill();
	}

	function fillCircle(x, y, diameter) {
		ctx.beginPath();
		ctx.arc(x, y, diameter / 2, 0, Math.PI * 2);
		ctx.fill();
	}

	// --- Data & Layout ---

	function dateToPos(s) {
		let d = parseDate(s);
		let m = (d.getFullYear() - startYear) * 12 + d.getMonth() - startMonth;
		let daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		return m + (d.getDate() - 1) / daysInMonth;
	}

	function monthToX(month) {
		return margin.left + ((month - viewStart) / viewMonths) * (w - margin.left - margin.right);
	}

	function clampView() {
		viewMonths = Math.max(minViewMonths, Math.min(totalMonths, viewMonths));
		viewStart = Math.max(0, Math.min(totalMonths - viewMonths, viewStart));
	}

	function computeHeight() {
		return titleH + topPad + eventRows * rowH + 44 + 36 + totalSpanRows * (spanH + spanGap) + bottomPad;
	}

	function initData() {
		let allDates = [
			...events.map(e => parseDate(e.date)),
			...spans.flatMap(s => [parseDate(s.start), parseDate(s.end)]),
		];
		let minDate = new Date(Math.min(...allDates));
		let maxDate = new Date(Math.max(...allDates));

		startYear = minDate.getFullYear();
		startMonth = minDate.getMonth();
		let endYear = maxDate.getFullYear();
		let endMonth = maxDate.getMonth();
		totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

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

		// Viewport
		storageKey = title || 'timeline';
		let saved = loadProps('timeline:' + storageKey);
		let defaultViewMonths = Math.min(12, totalMonths);
		viewMonths = saved.viewMonths ?? defaultViewMonths;
		viewStart = saved.viewStart ?? 0;
		targetViewMonths = viewMonths;
		targetViewStart = viewStart;
		clampView();
	}

	function layoutEvents() {
		if (!ctx) return;
		setFont(13);
		let rows = [];

		titleH = title ? 28 : 0;
		let contentLeft = margin.left;
		let contentRight = w - margin.right;

		eventLayout = events.map((e) => {
			let x = monthToX(dateToPos(e.date));
			let tw = ctx.measureText(e.label).width;
			let hasIcon = e.link || (e.detail && (Array.isArray(e.detail) ? e.detail.length > 0 : e.detail.length > 0));
			let bw = boxPad + tw + (hasIcon ? iconGap + iconSize : 0) + boxPad;
			let bx = x - bw / 2;

			if (bx + bw < contentLeft - bw || bx > contentRight + bw) {
				return null;
			}

			bx = Math.max(contentLeft, Math.min(contentRight - bw, bx));

			let row = 0;
			while (true) {
				if (!rows[row]) rows[row] = [];
				let fits = true;
				for (let placed of rows[row]) {
					if (bx < placed.right + 6 && bx + bw > placed.left - 6) {
						fits = false;
						break;
					}
				}
				if (fits) break;
				row++;
			}

			rows[row].push({ left: bx, right: bx + bw });
			return { x, boxX: bx, boxW: bw, boxH, row };
		});

		eventRows = Math.max(eventRows, 1, rows.length);
		timelineY = titleH + topPad + eventRows * rowH + 44;

		for (let l of eventLayout) {
			if (l) l.boxY = timelineY - 44 - l.row * rowH;
		}

		let newH = computeHeight();
		if (Math.abs(newH - h) > 1) {
			h = newH;
			canvas.height = h * dpr;
			canvas.style.height = h + 'px';
		}
	}

	function hitTestAt(mx, my) {
		let hEvent = -1, hSpan = -1, hViaBox = false;

		for (let i = 0; i < spans.length; i++) {
			let s = spans[i];
			let x1 = monthToX(dateToPos(s.start));
			let x2 = monthToX(dateToPos(s.end));
			let y = (timelineY + 36) + spanRowMap[i] * (spanH + spanGap);
			if (mx >= x1 && mx <= x2 && my >= y && my <= y + spanH) {
				hSpan = i;
			}
		}

		for (let i = events.length - 1; i >= 0; i--) {
			let l = eventLayout[i];
			if (!l) continue;
			let hitBox = mx >= l.boxX && mx <= l.boxX + l.boxW && my >= l.boxY && my <= l.boxY + l.boxH;
			let dx = mx - l.x, dy = my - timelineY;
			let hitDot = dx * dx + dy * dy <= dotHitRadius * dotHitRadius;
			if (hitBox || hitDot) {
				hEvent = i;
				hViaBox = hitBox;
			}
		}

		return { hoveredEvent: hEvent, hoveredSpan: hSpan, hoveredViaBox: hViaBox };
	}

	function handleClick(x, y, hit) {
		if (hit.hoveredEvent >= 0) {
			let ev = events[hit.hoveredEvent];
			if (ev.link && hit.hoveredViaBox) {
				window.location.href = ev.link;
				return;
			}
			if (pinnedEvent === hit.hoveredEvent) {
				pinnedEvent = -1;
			} else {
				pinnedEvent = hit.hoveredEvent;
				pinnedSpan = -1;
				pinnedX = x;
				pinnedY = y;
			}
		} else if (hit.hoveredSpan >= 0) {
			if (pinnedSpan === hit.hoveredSpan) {
				pinnedSpan = -1;
			} else {
				pinnedSpan = hit.hoveredSpan;
				pinnedEvent = -1;
				pinnedX = x;
				pinnedY = y;
			}
		} else {
			pinnedEvent = -1;
			pinnedSpan = -1;
		}
		dirty = true;
	}

	// --- Resize ---

	function resize() {
		if (!canvas) return;
		let rect = canvas.parentElement.getBoundingClientRect();
		dpr = window.devicePixelRatio || 1;
		w = rect.width;
		h = computeHeight();
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		canvas.style.width = w + 'px';
		canvas.style.height = h + 'px';
		theme = readTheme(canvas);
		layoutEvents();
		dirty = true;
	}

	// --- Draw ---

	function draw() {
		raf = requestAnimationFrame(draw);
		if (!ctx || !w || !theme) return;

		// Apply inertia
		let now = performance.now();
		let frameDt = lastFrameTime ? now - lastFrameTime : 16;
		lastFrameTime = now;
		if (Math.abs(velocity) > 0.000001) {
			targetViewStart += velocity * frameDt;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
			velocity *= Math.pow(decayRate, frameDt);
			if (Math.abs(velocity) < 0.000001) velocity = 0;
		}

		// Lerp viewport
		let lerpAmt = 0.4;
		let prevMonths = viewMonths;
		let prevStart = viewStart;
		viewMonths += (targetViewMonths - viewMonths) * lerpAmt;
		viewStart += (targetViewStart - viewStart) * lerpAmt;
		let animating = Math.abs(viewMonths - targetViewMonths) > 0.01 || Math.abs(viewStart - targetViewStart) > 0.01 || Math.abs(velocity) > 0.000001;
		if (!animating) { viewMonths = targetViewMonths; viewStart = targetViewStart; }
		clampView();
		if (Math.abs(viewMonths - prevMonths) > 0.001 || Math.abs(viewStart - prevStart) > 0.001) {
			layoutEvents();
			saveProps('timeline:' + storageKey, { viewStart, viewMonths });
		}

		if (!dirty && !animating) return;
		dirty = false;

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		let mx = mouseX, my = mouseY;
		hoveredEvent = -1;
		hoveredViaBox = false;
		hoveredSpan = -1;

		// Title
		if (title) {
			setFont(14, true);
			ctx.fillStyle = rgba(theme.fg);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			ctx.fillText(title, margin.left, topPad);
		}

		// Clip to content area
		ctx.save();
		ctx.beginPath();
		ctx.rect(margin.left - 1, 0, w - margin.left - margin.right + 2, h);
		ctx.clip();

		// Timeline bar
		ctx.strokeStyle = rgba(theme.bg3);
		ctx.lineWidth = 2;
		line(margin.left, timelineY, w - margin.right, timelineY);

		// Month ticks and labels
		setFont(12);
		let monthW = (w - margin.left - margin.right) / viewMonths;

		// Week ticks
		if (monthW > 20) {
			ctx.strokeStyle = rgba(theme.bg2);
			ctx.lineWidth = 1;
			for (let i = 0; i < totalMonths; i++) {
				for (let wk = 1; wk < 4; wk++) {
					let x = monthToX(i + wk / 4);
					line(x, timelineY - 2, x, timelineY + 2);
				}
			}
		}

		let labelW = ctx.measureText('Mar').width + 6;
		let skip = Math.max(1, Math.ceil(labelW / monthW));

		for (let i = 0; i <= totalMonths; i++) {
			let x = monthToX(i);
			let mi = i < totalMonths ? (startMonth + i) % 12 : -1;
			let isYearBoundary = mi === 0 && i > 0;

			if (isYearBoundary) {
				ctx.strokeStyle = rgba(theme.bg3);
				ctx.lineWidth = 2;
				line(x, timelineY - 8, x, timelineY + 8);

				let spanBottom = timelineY + 36 + totalSpanRows * (spanH + spanGap);
				ctx.strokeStyle = rgba(theme.bg2, 80 / 255);
				ctx.lineWidth = 1;
				ctx.setLineDash([2, 4]);
				line(x, timelineY + 8, x, spanBottom);
				ctx.setLineDash([]);
			} else {
				ctx.strokeStyle = rgba(theme.bg3);
				ctx.lineWidth = 1;
				line(x, timelineY - 5, x, timelineY + 5);
			}

			if (i < totalMonths) {
				let yr = startYear + Math.floor((startMonth + i) / 12);
				let isLast = i === totalMonths - 1;
				let showLabel = isLast || (i % skip === 0);
				if (showLabel) {
					setFont(12);
					ctx.fillStyle = rgba(theme.fg4);
					ctx.textAlign = 'center';
					ctx.textBaseline = 'top';
					ctx.fillText(MONTH_NAMES[mi], monthToX(i + 0.5), timelineY + 8);
				}
				if (mi === 0 || i === 0) {
					setFont(11);
					ctx.fillStyle = rgba(theme.fg4);
					ctx.textAlign = 'center';
					ctx.textBaseline = 'top';
					ctx.fillText(String(yr), monthToX(i + 0.5), timelineY + 20);
				}
			}
		}

		// Today marker
		if (showToday) {
			let tx = monthToX(todayPos);
			let spanBottom = timelineY + 36 + totalSpanRows * (spanH + spanGap);

			ctx.strokeStyle = rgba(theme.orange, 100 / 255);
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 3]);
			line(tx, titleH + topPad, tx, spanBottom);
			ctx.setLineDash([]);

			setFont(11, true);
			ctx.fillStyle = rgba(theme.orange);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.fillText('TODAY', tx, titleH + topPad - 2);
		}

		// Spans
		let spanStartY = timelineY + 36;
		let spanBottomY = spanStartY + totalSpanRows * (spanH + spanGap);

		// Hit-test spans
		for (let i = 0; i < spans.length; i++) {
			let s = spans[i];
			let x1 = monthToX(dateToPos(s.start));
			let x2 = monthToX(dateToPos(s.end));
			let y = spanStartY + spanRowMap[i] * (spanH + spanGap);
			if (mx >= x1 && mx <= x2 && my >= y && my <= y + spanH) {
				hoveredSpan = i;
			}
		}

		// Span boundary dotted lines
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 4]);
		for (let i = 0; i < spans.length; i++) {
			let s = spans[i];
			let x1 = monthToX(dateToPos(s.start));
			let x2 = monthToX(dateToPos(s.end));
			let hovered = hoveredSpan === i;
			ctx.strokeStyle = rgba(hovered ? s.color : theme.bg2, hovered ? 180 / 255 : 100 / 255);
			line(x1, timelineY, x1, spanBottomY);
			line(x2, timelineY, x2, spanBottomY);
		}
		ctx.setLineDash([]);

		// Span bars
		setFont(12);
		for (let i = 0; i < spans.length; i++) {
			let s = spans[i];
			let x1 = monthToX(dateToPos(s.start));
			let x2 = monthToX(dateToPos(s.end));
			let y = spanStartY + spanRowMap[i] * (spanH + spanGap);
			let hovered = hoveredSpan === i;

			// Ongoing span continuation
			if (s.end === 'today') {
				ctx.fillStyle = rgba(s.color, hovered ? 60 / 255 : 30 / 255);
				fillRRect(x2, y, w - margin.right - x2, spanH, [0, 2, 2, 0]);
			}

			ctx.fillStyle = rgba(s.color, hovered ? 220 / 255 : 120 / 255);
			fillRRect(x1, y, x2 - x1, spanH, 2);

			ctx.fillStyle = rgba(theme.fg, hovered ? 1 : 200 / 255);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			let labelX = Math.max(x1 + 6, margin.left + 6);
			let availW = x2 - labelX - 6;
			if (availW > 12) {
				let label = s.label;
				if (ctx.measureText(label).width > availW) {
					let ellipsis = '...';
					let ew = ctx.measureText(ellipsis).width;
					while (label.length > 0 && ctx.measureText(label).width + ew > availW) {
						label = label.slice(0, -1);
					}
					label += ellipsis;
				}
				ctx.fillText(label, labelX, y + spanH / 2);
			}
		}

		// Key events - hit-test
		setFont(13);
		for (let i = events.length - 1; i >= 0; i--) {
			let l = eventLayout[i];
			if (!l) continue;
			let hitBox = mx >= l.boxX && mx <= l.boxX + l.boxW && my >= l.boxY && my <= l.boxY + l.boxH;
			let dx = mx - l.x, dy = my - timelineY;
			let hitDot = dx * dx + dy * dy <= dotHitRadius * dotHitRadius;
			if (hitBox || hitDot) {
				hoveredEvent = i;
				hoveredViaBox = hitBox;
			}
		}

		// Draw events row by row
		for (let row = eventRows - 1; row >= 0; row--) {
			// Lines and dots
			for (let i = 0; i < events.length; i++) {
				let l = eventLayout[i];
				if (!l || l.row !== row) continue;
				let e = events[i];
				let hovered = hoveredEvent === i;

				ctx.strokeStyle = rgba(e.color, hovered ? 180 / 255 : 80 / 255);
				ctx.lineWidth = 1;
				line(l.x, l.boxY + l.boxH - boxRadius, l.x, timelineY - 2);

				ctx.fillStyle = rgba(e.color, hovered ? 1 : 180 / 255);
				fillCircle(l.x, timelineY, hovered ? dotRadius * 2 : dotRadius);
			}
			// Boxes and labels
			for (let i = 0; i < events.length; i++) {
				let l = eventLayout[i];
				if (!l || l.row !== row) continue;
				let e = events[i];
				let hovered = hoveredEvent === i;

				// Box fill + stroke
				ctx.fillStyle = rgba(hovered ? theme.bg2 : theme.bg1);
				ctx.strokeStyle = rgba(e.color, hovered ? 200 / 255 : 100 / 255);
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.roundRect(l.boxX, l.boxY, l.boxW, l.boxH, boxRadius);
				ctx.fill();
				ctx.stroke();

				// Label
				setFont(13);
				ctx.fillStyle = rgba(hovered ? theme.fg : theme.fg2);
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';
				let hasIcon = e.link || (e.detail && (Array.isArray(e.detail) ? e.detail.length > 0 : e.detail.length > 0));
				ctx.fillText(e.label, l.boxX + boxPad, l.boxY + l.boxH / 2 + 1);

				// Icon
				if (hasIcon) {
					let tw2 = ctx.measureText(e.label).width;
					let ix = l.boxX + boxPad + tw2 + iconGap + iconHalf;
					let iy = l.boxY + l.boxH / 2;

					if (e.link) {
						let c = hovered ? theme.fg : theme.fg4;
						let s = iconHalf;
						ctx.save();
						ctx.translate(ix, iy);
						ctx.strokeStyle = rgba(c);
						ctx.lineWidth = 1;
						ctx.lineCap = 'round';
						ctx.lineJoin = 'round';
						ctx.beginPath();
						ctx.moveTo(0, -s);
						ctx.lineTo(-s, -s);
						ctx.lineTo(-s, s);
						ctx.lineTo(s, s);
						ctx.lineTo(s, 0);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(s, -s);
						ctx.lineTo(-1, 1);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(-1, -2.5);
						ctx.lineTo(-1, 1);
						ctx.lineTo(2.5, 1);
						ctx.stroke();
						ctx.restore();
					} else {
						let c = hovered ? theme.fg : theme.fg4;
						setFont(11, true);
						ctx.fillStyle = rgba(c);
						ctx.textAlign = 'center';
						ctx.textBaseline = 'middle';
						ctx.fillText('i', ix, iy + 1);
					}
					setFont(13);
				}
			}
		}

		// Today diamond
		if (showToday) {
			let tx = monthToX(todayPos);
			ctx.fillStyle = rgba(theme.orange);
			ctx.beginPath();
			ctx.moveTo(tx, timelineY - 5);
			ctx.lineTo(tx + 4, timelineY);
			ctx.lineTo(tx, timelineY + 5);
			ctx.lineTo(tx - 4, timelineY);
			ctx.closePath();
			ctx.fill();
		}

		// Restore clip
		ctx.restore();

		// Tooltip
		let tipLines = [];
		let tipAnchorX = mx;
		let tipAnchorY = my;
		let showEvent = pinnedEvent >= 0 ? pinnedEvent : hoveredEvent;
		let showSpan = showEvent < 0 ? (pinnedSpan >= 0 ? pinnedSpan : hoveredSpan) : -1;

		function detailLines(detail) {
			if (!detail) return [];
			if (Array.isArray(detail)) return detail;
			return detail.split('\n');
		}

		if (showEvent >= 0) {
			let e = events[showEvent];
			tipLines.push(formatDate(e.date));
			tipLines.push(...detailLines(e.detail));
			if (pinnedEvent >= 0) { tipAnchorX = pinnedX; tipAnchorY = pinnedY; }
		} else if (showSpan >= 0) {
			let s = spans[showSpan];
			tipLines.push(formatDate(s.start) + '  —  ' + formatDate(s.end));
			tipLines.push(...detailLines(s.detail));
			if (pinnedSpan >= 0) { tipAnchorX = pinnedX; tipAnchorY = pinnedY; }
		}

		if (tipLines.length > 0) {
			setFont(12);
			let padX = 6;
			let padY = 5;
			let lineH = 14;
			let maxW = 0;
			for (let tl of tipLines) {
				let tw = ctx.measureText(tl).width;
				if (tw > maxW) maxW = tw;
			}
			let tipW = maxW + padX * 2;
			let tipH = padY * 2 + tipLines.length * lineH;
			let tipX = Math.max(0, Math.min(w - tipW - 2, tipAnchorX + 12));
			let tipY = tipAnchorY - tipH - 8;
			if (tipY < 2) tipY = tipAnchorY + 16;

			ctx.fillStyle = rgba(theme.bg1, 230 / 255);
			fillRRect(tipX, tipY, tipW, tipH, 3);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'middle';
			for (let j = 0; j < tipLines.length; j++) {
				ctx.fillStyle = j === 0 ? rgba(theme.fg4) : rgba(theme.fg);
				ctx.fillText(tipLines[j], tipX + padX, tipY + padY + j * lineH + lineH / 2);
			}
		}

		// Cursor
		if (isDragging) {
			canvas.style.cursor = 'grabbing';
		} else if (hoveredEvent >= 0 || hoveredSpan >= 0) {
			canvas.style.cursor = 'pointer';
		} else {
			canvas.style.cursor = 'grab';
		}
	}

	// --- Event Handlers ---

	function onMouseDown(e) {
		if (e.button !== 0) return;
		let rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		if (x < 0 || x > w || y < 0 || y > h) return;
		isDragging = true;
		dragStartX = x;
		dragStartView = viewStart;
		dragMoved = false;
		velocity = 0;
		lastDragX = e.clientX;
		lastDragTime = performance.now();
	}

	function onMouseMove(e) {
		let rect = canvas.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;

		if (!isDragging) {
			dirty = true;
			return;
		}

		let dx = mouseX - dragStartX;
		if (Math.abs(dx) > dragThreshold) dragMoved = true;
		if (dragMoved) {
			let now = performance.now();
			let dt = now - lastDragTime;
			if (dt > 0) {
				let monthsPerPx = viewMonths / (w - margin.left - margin.right);
				let dxPx = e.clientX - lastDragX;
				velocity = -dxPx * monthsPerPx / dt;
			}
			lastDragX = e.clientX;
			lastDragTime = now;

			let monthsPerPx = viewMonths / (w - margin.left - margin.right);
			viewStart = dragStartView - dx * monthsPerPx;
			targetViewStart = viewStart;
			clampView();
			targetViewStart = viewStart;
			layoutEvents();
			dirty = true;
		}
	}

	function onMouseUp(e) {
		if (isDragging && !dragMoved) {
			let rect = canvas.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			handleClick(x, y, { hoveredEvent, hoveredSpan, hoveredViaBox });
		}
		if (isDragging && performance.now() - lastDragTime > 60) velocity = 0;
		isDragging = false;
	}

	function onMouseLeave() {
		mouseX = -1;
		mouseY = -1;
		dirty = true;
	}

	// --- Scroll hint ---
	let scrollHint = false;
	let scrollHintTimer;

	function showScrollHint() {
		clearTimeout(scrollHintTimer);
		scrollHint = true;
		scrollHintTimer = setTimeout(() => { scrollHint = false; }, 1500);
	}

	function onWheel(e) {
		let rect = canvas.getBoundingClientRect();
		let mx = e.clientX - rect.left;
		let my = e.clientY - rect.top;
		if (mx < margin.left || mx > w - margin.right) return;
		if (my < 0 || my > h) return;

		if (!(e.ctrlKey || e.metaKey)) {
			showScrollHint();
			return;
		}

		e.preventDefault();
		let dx = e.deltaX || 0;
		let dy = e.deltaY || 0;

		if (Math.abs(dx) > 0) {
			let monthsPerPx = targetViewMonths / (w - margin.left - margin.right);
			targetViewStart += dx * monthsPerPx;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
		}

		if (Math.abs(dy) > 0) {
			let zoomAnchorFrac = (mx - margin.left) / (w - margin.left - margin.right);
			let monthUnderCursor = targetViewStart + zoomAnchorFrac * targetViewMonths;
			let zoomFactor = 1 + dy * 0.003;
			targetViewMonths *= zoomFactor;
			targetViewMonths = Math.max(minViewMonths, Math.min(totalMonths, targetViewMonths));
			targetViewStart = monthUnderCursor - zoomAnchorFrac * targetViewMonths;
			targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
		}

		dirty = true;
	}

	function onTouchStart(e) {
		let touches = e.touches;
		if (touches.length === 2) {
			e.preventDefault();
			let rect = canvas.getBoundingClientRect();
			let t0 = touches[0], t1 = touches[1];
			pinchStartDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
			pinchStartMonths = targetViewMonths;
			pinchStartViewStart = targetViewStart;
			let midX = ((t0.clientX + t1.clientX) / 2) - rect.left;
			pinchAnchorFrac = (midX - margin.left) / (w - margin.left - margin.right);
			isDragging = false;
			touchLocked = 'pan';
			return;
		}
		if (touches.length === 1) {
			let t = touches[0];
			let rect = canvas.getBoundingClientRect();
			let tx = t.clientX - rect.left;
			let ty = t.clientY - rect.top;
			touchStartPos = { x: tx, y: ty };
			touchLocked = null;
			velocity = 0;
			lastDragX = t.clientX;
			lastDragTime = performance.now();

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
				let now = performance.now();
				let dt = now - lastDragTime;
				if (dt > 0) {
					let monthsPerPx = viewMonths / (w - margin.left - margin.right);
					let dxPx = t.clientX - lastDragX;
					velocity = -dxPx * monthsPerPx / dt;
				}
				lastDragX = t.clientX;
				lastDragTime = now;

				let dx = tx - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let monthsPerPx = viewMonths / (w - margin.left - margin.right);
					viewStart = dragStartView - dx * monthsPerPx;
					targetViewStart = viewStart;
					clampView();
					targetViewStart = viewStart;
					layoutEvents();
					dirty = true;
				}
			} else if (touchLocked === 'scroll') {
				isDragging = false;
			}
		}
	}

	function onTouchEnd(e) {
		if (e.touches.length === 0 && isDragging && !dragMoved && touchStartPos) {
			let hit = hitTestAt(touchStartPos.x, touchStartPos.y);
			handleClick(touchStartPos.x, touchStartPos.y, hit);
		}
		isDragging = false;
		if (performance.now() - lastDragTime > 60) velocity = 0;
		touchStartPos = null;
		touchLocked = null;
	}

	// --- Lifecycle ---

	let mqlCleanup;

	onMount(() => {
		ctx = canvas.getContext('2d');
		initData();
		resize();
		raf = requestAnimationFrame(draw);
		window.addEventListener('resize', resize);
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('touchstart', onTouchStart, { passive: false });
		canvas.addEventListener('touchmove', onTouchMove, { passive: false });
		canvas.addEventListener('touchend', onTouchEnd);

		let mql = window.matchMedia('(prefers-color-scheme: dark)');
		let handler = () => { theme = readTheme(canvas); dirty = true; };
		mql.addEventListener('change', handler);
		mqlCleanup = () => mql.removeEventListener('change', handler);
	});

	onDestroy(() => {
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
		mqlCleanup?.();
	});
</script>

<div class="canvas-wrap">
	<canvas
		bind:this={canvas}
		on:mousedown={onMouseDown}
		on:mouseleave={onMouseLeave}
		class="timeline"
		class:dragging={isDragging && dragMoved}
	></canvas>
	{#if scrollHint}
		<div class="scroll-hint" class:visible={scrollHint}>
			<kbd>Ctrl</kbd> + scroll to zoom
		</div>
	{/if}
</div>

<style>
	.canvas-wrap {
		position: relative;
	}

	.timeline {
		display: block;
		width: 100%;
		cursor: grab;
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
	}

	.timeline.dragging {
		cursor: grabbing;
	}

	.scroll-hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(0, 0, 0, 0.75);
		color: #ebdbb2;
		font-size: 0.8rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.4rem;
		pointer-events: none;
		animation: hint-fade 1.5s ease-out forwards;
		white-space: nowrap;
	}

	.scroll-hint kbd {
		background: rgba(255, 255, 255, 0.15);
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		font-family: inherit;
		font-size: 0.85em;
	}

	@keyframes hint-fade {
		0%, 60% { opacity: 1; }
		100% { opacity: 0; }
	}
</style>
