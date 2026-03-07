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

	let container;
	let instance;

	function buildSketch(keyEvents, spanData, titleText) {
		return (p) => {
			let theme;

			const allDates = [
				...keyEvents.map(e => parseDate(e.date)),
				...spanData.flatMap(s => [parseDate(s.start), parseDate(s.end)]),
			];
			const minDate = new Date(Math.min(...allDates));
			const maxDate = new Date(Math.max(...allDates));

			const startYear = minDate.getFullYear();
			const startMonth = minDate.getMonth();
			const endYear = maxDate.getFullYear();
			const endMonth = maxDate.getMonth();
			const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

			function dateToPos(s) {
				let d = parseDate(s);
				let m = (d.getFullYear() - startYear) * 12 + d.getMonth() - startMonth;
				let daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
				return m + (d.getDate() - 1) / daysInMonth;
			}

			// Check if today falls within the timeline range
			const today = new Date();
			const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
			const todayPos = dateToPos(todayStr);
			const showToday = todayPos >= 0 && todayPos <= totalMonths;

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

			// Compute span row assignments: grouped spans share rows, others pack greedily
			const spanRowMap = [];
			let totalSpanRows = 0;
			const groupRows = {};
			const rowOccupied = []; // each row has a list of [start, end] ranges

			for (let i = 0; i < spanData.length; i++) {
				let s = spanData[i];
				let sStart = dateToPos(s.start);
				let sEnd = dateToPos(s.end);

				if (s.group && s.group in groupRows) {
					spanRowMap[i] = groupRows[s.group];
					rowOccupied[spanRowMap[i]].push([sStart, sEnd]);
				} else {
					// Find lowest row where this span fits
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

			let pinnedEvent = -1;
			let pinnedSpan = -1;
			let pinnedX = 0;
			let pinnedY = 0;

			let titleH = 0;
			let timelineY;
			let eventRows = 1;
			let hoveredEvent = -1;
			let hoveredViaBox = false;
			let hoveredSpan = -1;
			let eventLayout = [];

			// Viewport: pan & zoom
			const storageKey = titleText || 'timeline';
			const saved = loadProps('timeline:' + storageKey);
			const defaultViewMonths = Math.min(12, totalMonths);
			const minViewMonths = 4;
			let viewMonths = saved.viewMonths ?? defaultViewMonths;
			let viewStart = saved.viewStart ?? 0;
			let targetViewMonths = viewMonths;
			let targetViewStart = viewStart;
			let zoomAnchorFrac = 0.5;
			let isDragging = false;
			let dragStartX = 0;
			let dragStartView = 0;
			let dragMoved = false;
			const dragThreshold = 4;

			function clampView() {
				viewMonths = Math.max(minViewMonths, Math.min(totalMonths, viewMonths));
				viewStart = Math.max(0, Math.min(totalMonths - viewMonths, viewStart));
			}

			function monthToX(month) {
				return margin.left + ((month - viewStart) / viewMonths) * (p.width - margin.left - margin.right);
			}

			function computeHeight() {
				return titleH + topPad + eventRows * rowH + 44 + 36 + totalSpanRows * (spanH + spanGap) + bottomPad;
			}

			function layoutEvents() {
				p.textSize(11);
				let rows = [];

				titleH = titleText ? 28 : 0;

				let contentLeft = margin.left;
				let contentRight = p.width - margin.right;

				eventLayout = keyEvents.map((e) => {
					let x = monthToX(dateToPos(e.date));
					let tw = p.textWidth(e.label);
					let hasIcon = e.link || (e.detail && (Array.isArray(e.detail) ? e.detail.length > 0 : e.detail.length > 0));
					let boxW = boxPad + tw + (hasIcon ? iconGap + iconSize : 0) + boxPad;
					let boxX = x - boxW / 2;

					// Skip events fully off-screen (beyond the next non-visible one)
					if (boxX + boxW < contentLeft - boxW || boxX > contentRight + boxW) {
						return null;
					}

					// Clamp only if the box extends past the edge
					boxX = Math.max(contentLeft, Math.min(contentRight - boxW, boxX));

					let row = 0;
					while (true) {
						if (!rows[row]) rows[row] = [];
						let fits = true;
						for (let placed of rows[row]) {
							if (boxX < placed.right + 6 && boxX + boxW > placed.left - 6) {
								fits = false;
								break;
							}
						}
						if (fits) break;
						row++;
					}

					rows[row].push({ left: boxX, right: boxX + boxW });
					return { x, boxX, boxW, boxH, row };
				});

				eventRows = Math.max(eventRows, 1, rows.length);
				timelineY = titleH + topPad + eventRows * rowH + 44;

				for (let l of eventLayout) {
					if (l) l.boxY = timelineY - 44 - l.row * rowH;
				}

				let h = computeHeight();
				if (p.height !== h) {
					p.resizeCanvas(p.width, h);
				}
			}

			p.setup = () => {
				let w = p.canvas?.parentElement?.clientWidth || 780;
				theme = readTheme(p.canvas.parentElement);
				p.createCanvas(w, 320);
				p.frameRate(10);

				clampView();
				layoutEvents();
			};

			p.windowResized = () => {
				let w = p.canvas.parentElement.clientWidth;
				theme = readTheme(p.canvas.parentElement);
				if (w !== p.width) {
					p.resizeCanvas(w, p.height);
					layoutEvents();
				}
			};

			// --- Input handling (mouse + touch) ---

			function pointerInBounds(x, y) {
				return x >= 0 && x <= p.width && y >= 0 && y <= p.height;
			}

			function handlePressAt(x, y) {
				if (!pointerInBounds(x, y)) return;
				isDragging = true;
				dragStartX = x;
				dragStartView = viewStart;
				dragMoved = false;
			}

			function handleDragAt(x) {
				if (!isDragging) return;
				let dx = x - dragStartX;
				if (Math.abs(dx) > dragThreshold) dragMoved = true;
				if (dragMoved) {
					let monthsPerPx = viewMonths / (p.width - margin.left - margin.right);
					viewStart = dragStartView - dx * monthsPerPx;
					targetViewStart = viewStart;
					clampView();
					targetViewStart = viewStart;
					layoutEvents();
				}
			}

			function handleReleaseAt(x, y) {
				if (isDragging && !dragMoved) {
					// Update mouseX/Y for hit-testing on touch
					p._setProperty('mouseX', x);
					p._setProperty('mouseY', y);

					if (hoveredEvent >= 0) {
						let e = keyEvents[hoveredEvent];
						if (e.link && hoveredViaBox) {
							window.location.href = e.link;
							isDragging = false;
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
				isDragging = false;
			}

			// Mouse events
			p.mousePressed = () => handlePressAt(p.mouseX, p.mouseY);
			p.mouseDragged = () => handleDragAt(p.mouseX);
			p.mouseReleased = () => handleReleaseAt(p.mouseX, p.mouseY);

			// Touch events
			let pinchStartDist = 0;
			let pinchStartMonths = 0;
			let pinchStartViewStart = 0;
			let pinchAnchorFrac = 0.5;
			let touchStartPos = null;
			let touchLocked = null; // null = undecided, 'pan' = horizontal, 'scroll' = vertical

			p.touchStarted = () => {
				if (p.touches.length === 2) {
					let t = p.touches;
					pinchStartDist = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
					pinchStartMonths = targetViewMonths;
					pinchStartViewStart = targetViewStart;
					let midX = (t[0].x + t[1].x) / 2;
					pinchAnchorFrac = (midX - margin.left) / (p.width - margin.left - margin.right);
					isDragging = false;
					touchLocked = 'pan';
					return false;
				}
				if (p.touches.length === 1) {
					let t = p.touches[0];
					touchStartPos = { x: t.x, y: t.y };
					touchLocked = null;
					handlePressAt(t.x, t.y);
				}
			};

			p.touchMoved = () => {
				if (p.touches.length === 2) {
					let t = p.touches;
					let dist = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
					let scale = pinchStartDist / dist;
					let monthAnchor = pinchStartViewStart + pinchAnchorFrac * pinchStartMonths;

					targetViewMonths = pinchStartMonths * scale;
					targetViewMonths = Math.max(minViewMonths, Math.min(totalMonths, targetViewMonths));
					targetViewStart = monthAnchor - pinchAnchorFrac * targetViewMonths;
					targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
					return false;
				}
				if (p.touches.length === 1 && touchStartPos) {
					let t = p.touches[0];
					// Decide direction on first significant movement
					if (touchLocked === null) {
						let dx = Math.abs(t.x - touchStartPos.x);
						let dy = Math.abs(t.y - touchStartPos.y);
						if (dx > dragThreshold || dy > dragThreshold) {
							touchLocked = dx > dy ? 'pan' : 'scroll';
						}
					}
					if (touchLocked === 'pan') {
						handleDragAt(t.x);
						return false; // prevent page scroll
					}
					// touchLocked === 'scroll': don't return false, let browser scroll
					if (touchLocked === 'scroll') {
						isDragging = false;
					}
				}
			};

			p.touchEnded = () => {
				if (p.touches.length === 0 && isDragging) {
					handleReleaseAt(p.mouseX, p.mouseY);
				}
				touchStartPos = null;
				touchLocked = null;
			};

			p.mouseWheel = (event) => {
				if (p.mouseX < margin.left || p.mouseX > p.width - margin.right) return;
				if (p.mouseY < 0 || p.mouseY > p.height) return;

				let dx = event.deltaX || 0;
				let dy = event.deltaY || 0;

				// Horizontal: pan
				if (Math.abs(dx) > 0) {
					let monthsPerPx = targetViewMonths / (p.width - margin.left - margin.right);
					targetViewStart += dx * monthsPerPx;
					targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
				}

				// Vertical: zoom
				if (Math.abs(dy) > 0) {
					zoomAnchorFrac = (p.mouseX - margin.left) / (p.width - margin.left - margin.right);
					let monthUnderCursor = targetViewStart + zoomAnchorFrac * targetViewMonths;

					let zoomFactor = 1 + dy * 0.003;
					targetViewMonths *= zoomFactor;
					targetViewMonths = Math.max(minViewMonths, Math.min(totalMonths, targetViewMonths));

					targetViewStart = monthUnderCursor - zoomAnchorFrac * targetViewMonths;
					targetViewStart = Math.max(0, Math.min(totalMonths - targetViewMonths, targetViewStart));
				}

				return false; // prevent page scroll
			};

			p.draw = () => {
				if (!theme) return;

				// Smooth zoom interpolation
				let lerpAmt = 0.4;
				let prevMonths = viewMonths;
				let prevStart = viewStart;
				viewMonths += (targetViewMonths - viewMonths) * lerpAmt;
				viewStart += (targetViewStart - viewStart) * lerpAmt;
				// Snap when close enough
				let animating = Math.abs(viewMonths - targetViewMonths) > 0.01 || Math.abs(viewStart - targetViewStart) > 0.01;
				if (!animating) { viewMonths = targetViewMonths; viewStart = targetViewStart; }
				clampView();
				if (Math.abs(viewMonths - prevMonths) > 0.001 || Math.abs(viewStart - prevStart) > 0.001) {
					layoutEvents();
					saveProps('timeline:' + storageKey, { viewStart, viewMonths });
				}

				// Boost frame rate when active, idle when not
				let active = animating || isDragging || (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height);
				p.frameRate(active ? 60 : 10);

				p.clear();
				let mx = p.mouseX, my = p.mouseY;
				hoveredEvent = -1;
				hoveredViaBox = false;
				hoveredSpan = -1;

				// Title
				if (titleText) {
					p.noStroke();
					p.fill(...theme.fg);
					p.textSize(13);
					p.textStyle(p.BOLD);
					p.textAlign(p.LEFT, p.TOP);
					p.text(titleText, margin.left, topPad);
					p.textStyle(p.NORMAL);
				}

				// Clip to content area
				p.drawingContext.save();
				p.drawingContext.beginPath();
				p.drawingContext.rect(margin.left - 1, 0, p.width - margin.left - margin.right + 2, p.height);
				p.drawingContext.clip();

				// Timeline bar
				p.stroke(...theme.bg3);
				p.strokeWeight(2);
				p.line(margin.left, timelineY, p.width - margin.right, timelineY);

				// Month ticks and labels
				p.textSize(10);
				let monthW = (p.width - margin.left - margin.right) / viewMonths;

				// Week ticks (hide when months are too narrow)
				if (monthW > 20) {
					p.stroke(...theme.bg2);
					p.strokeWeight(1);
					for (let i = 0; i < totalMonths; i++) {
						for (let w = 1; w < 4; w++) {
							let x = monthToX(i + w / 4);
							p.line(x, timelineY - 2, x, timelineY + 2);
						}
					}
				}
				let labelW = p.textWidth('Mar') + 6;
				let skip = Math.max(1, Math.ceil(labelW / monthW));

				for (let i = 0; i <= totalMonths; i++) {
					let x = monthToX(i);
					let mi = i < totalMonths ? (startMonth + i) % 12 : -1;
					let isYearBoundary = mi === 0 && i > 0;

					// Year boundary: taller tick + faint line through span area
					if (isYearBoundary) {
						p.stroke(...theme.bg3);
						p.strokeWeight(2);
						p.line(x, timelineY - 8, x, timelineY + 8);

						let spanBottom = timelineY + 36 + totalSpanRows * (spanH + spanGap);
						p.stroke(...theme.bg2, 80);
						p.strokeWeight(1);
						p.drawingContext.setLineDash([2, 4]);
						p.line(x, timelineY + 8, x, spanBottom);
						p.drawingContext.setLineDash([]);
					} else {
						p.stroke(...theme.bg3);
						p.strokeWeight(1);
						p.line(x, timelineY - 5, x, timelineY + 5);
					}

					if (i < totalMonths) {
						let yr = startYear + Math.floor((startMonth + i) / 12);
						let isLast = i === totalMonths - 1;
						let showLabel = isLast || (i % skip === 0);
						if (showLabel) {
							p.noStroke();
							p.fill(...theme.fg4);
							p.textAlign(p.CENTER, p.TOP);
							p.text(MONTH_NAMES[mi], monthToX(i + 0.5), timelineY + 8);
						}
						if (mi === 0 || i === 0) {
							p.noStroke();
							p.fill(...theme.fg4);
							p.textSize(9);
							p.text(yr, monthToX(i + 0.5), timelineY + 20);
							p.textSize(10);
						}
					}
				}

				// Today marker (line + label drawn early; diamond drawn later on top)
				if (showToday) {
					let tx = monthToX(todayPos);
					let spanBottom = timelineY + 36 + totalSpanRows * (spanH + spanGap);

					// Dashed line spanning full height
					p.stroke(...theme.orange, 100);
					p.strokeWeight(1);
					p.drawingContext.setLineDash([4, 3]);
					p.line(tx, titleH + topPad, tx, spanBottom);
					p.drawingContext.setLineDash([]);

					// Label
					p.noStroke();
					p.fill(...theme.orange);
					p.textSize(9);
					p.textStyle(p.BOLD);
					p.textAlign(p.CENTER, p.BOTTOM);
					p.text('TODAY', tx, titleH + topPad - 2);
					p.textStyle(p.NORMAL);
				}

				// Spans below timeline
				let spanStartY = timelineY + 36;
				let spanBottomY = spanStartY + totalSpanRows * (spanH + spanGap);

				// Hit-test spans first so guide lines can react
				for (let i = 0; i < spanData.length; i++) {
					let s = spanData[i];
					let x1 = monthToX(dateToPos(s.start));
					let x2 = monthToX(dateToPos(s.end));
					let y = spanStartY + spanRowMap[i] * (spanH + spanGap);
					if (mx >= x1 && mx <= x2 && my >= y && my <= y + spanH) {
						hoveredSpan = i;
					}
				}

				// Span boundary dotted lines
				p.strokeWeight(1);
				p.drawingContext.setLineDash([3, 4]);
				for (let i = 0; i < spanData.length; i++) {
					let s = spanData[i];
					let x1 = monthToX(dateToPos(s.start));
					let x2 = monthToX(dateToPos(s.end));
					let hovered = hoveredSpan === i;
					p.stroke(...(hovered ? s.color : theme.bg2), hovered ? 180 : 100);
					p.line(x1, timelineY, x1, spanBottomY);
					p.line(x2, timelineY, x2, spanBottomY);
				}
				p.drawingContext.setLineDash([]);

				// Span bars
				p.textSize(10);
				for (let i = 0; i < spanData.length; i++) {
					let s = spanData[i];
					let x1 = monthToX(dateToPos(s.start));
					let x2 = monthToX(dateToPos(s.end));
					let y = spanStartY + spanRowMap[i] * (spanH + spanGap);

					let hovered = hoveredSpan === i;

					// Ongoing span: faded continuation rect to the right edge
					if (s.end === 'today') {
						p.noStroke();
						p.fill(...s.color, hovered ? 60 : 30);
						p.rect(x2, y, p.width - margin.right - x2, spanH, 0, 2, 2, 0);
					}

					p.noStroke();
					p.fill(...s.color, hovered ? 220 : 120);
					p.rect(x1, y, x2 - x1, spanH, 2);

					p.fill(...theme.fg, hovered ? 255 : 200);
					p.textAlign(p.LEFT, p.CENTER);
					let labelX = Math.max(x1 + 6, margin.left + 6);
					let availW = x2 - labelX - 6;
					if (availW > 12) {
						let label = s.label;
						if (p.textWidth(label) > availW) {
							let ellipsis = '...';
							let ew = p.textWidth(ellipsis);
							while (label.length > 0 && p.textWidth(label) + ew > availW) {
								label = label.slice(0, -1);
							}
							label += ellipsis;
						}
						p.text(label, labelX, y + spanH / 2);
					}
				}

				// Key events above timeline
				let boxRadius = 3;
				p.textSize(11);

				// Hit-test all events (boxes and dots on timeline)
				let dotRadius = 5;
				let dotHitRadius = dotRadius * 2;
				for (let i = keyEvents.length - 1; i >= 0; i--) {
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

				// Draw row by row, top (highest row) to bottom (row 0, closest to timeline)
				// Each row: lines first, then boxes — so lower rows' boxes cover higher rows' lines
				for (let row = eventRows - 1; row >= 0; row--) {
					// Lines and dots for this row
					for (let i = 0; i < keyEvents.length; i++) {
						let l = eventLayout[i];
						if (!l || l.row !== row) continue;
						let e = keyEvents[i];
						let hovered = hoveredEvent === i;

						p.stroke(...e.color, hovered ? 180 : 80);
						p.strokeWeight(1);
						p.line(l.x, l.boxY + l.boxH - boxRadius, l.x, timelineY - 2);

						p.noStroke();
						p.fill(...e.color, hovered ? 255 : 180);
						p.circle(l.x, timelineY, hovered ? dotRadius * 2 : dotRadius);
					}
					// Boxes and labels for this row
					for (let i = 0; i < keyEvents.length; i++) {
						let l = eventLayout[i];
						if (!l || l.row !== row) continue;
						let e = keyEvents[i];
						let hovered = hoveredEvent === i;

						p.fill(...(hovered ? theme.bg2 : theme.bg1));
						p.stroke(...e.color, hovered ? 200 : 100);
						p.strokeWeight(1);
						p.rect(l.boxX, l.boxY, l.boxW, l.boxH, boxRadius);

						p.noStroke();
						p.fill(...(hovered ? theme.fg : theme.fg2));
						p.textAlign(p.LEFT, p.CENTER);
						let hasIcon = e.link || (e.detail && (Array.isArray(e.detail) ? e.detail.length > 0 : e.detail.length > 0));
						p.text(e.label, l.boxX + boxPad, l.boxY + l.boxH / 2 + 1);

						// Icon: link or info
						if (hasIcon) {
							let tw2 = p.textWidth(e.label);
							let ix = l.boxX + boxPad + tw2 + iconGap + iconHalf;
							let iy = l.boxY + l.boxH / 2;

							if (e.link) {
								// Internal link icon: box with inward arrow
								let ctx = p.drawingContext;
								let c = hovered ? theme.fg : theme.fg4;
								let s = iconHalf;
								ctx.save();
								ctx.translate(ix, iy);
								ctx.strokeStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
								ctx.lineWidth = 1;
								ctx.lineCap = 'round';
								ctx.lineJoin = 'round';
								// Box (open top-right corner)
								ctx.beginPath();
								ctx.moveTo(0, -s);
								ctx.lineTo(-s, -s);
								ctx.lineTo(-s, s);
								ctx.lineTo(s, s);
								ctx.lineTo(s, 0);
								ctx.stroke();
								// Arrow from top-right pointing to center
								ctx.beginPath();
								ctx.moveTo(s, -s);
								ctx.lineTo(-1, 1);
								ctx.stroke();
								// Arrowhead
								ctx.beginPath();
								ctx.moveTo(-1, -2.5);
								ctx.lineTo(-1, 1);
								ctx.lineTo(2.5, 1);
								ctx.stroke();
								ctx.restore();
							} else if (!e.link) {
								// Info icon: circle with 'i'
								let c = hovered ? theme.fg : theme.fg4;
								p.noFill();
								p.stroke(...c);
								p.strokeWeight(1);
								p.circle(ix, iy, iconSize);
								p.noStroke();
								p.fill(...c);
								p.textSize(7);
								p.textStyle(p.BOLD);
								p.textAlign(p.CENTER, p.CENTER);
								p.text('i', ix, iy + 1);
								p.textStyle(p.NORMAL);
							}
							p.textSize(11);
						}
					}
				}

				// Today diamond (drawn last so it's on top of guide lines)
				if (showToday) {
					let tx = monthToX(todayPos);
					p.noStroke();
					p.fill(...theme.orange);
					p.push();
					p.translate(tx, timelineY);
					p.beginShape();
					p.vertex(0, -5);
					p.vertex(4, 0);
					p.vertex(0, 5);
					p.vertex(-4, 0);
					p.endShape(p.CLOSE);
					p.pop();
				}

				// Restore from clip
				p.drawingContext.restore();

				// Tooltip for hovered or pinned event/span
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
					let e = keyEvents[showEvent];
					tipLines.push(formatDate(e.date));
					tipLines.push(...detailLines(e.detail));
					if (pinnedEvent >= 0) { tipAnchorX = pinnedX; tipAnchorY = pinnedY; }
				} else if (showSpan >= 0) {
					let s = spanData[showSpan];
					tipLines.push(formatDate(s.start) + '  —  ' + formatDate(s.end));
					tipLines.push(...detailLines(s.detail));
					if (pinnedSpan >= 0) { tipAnchorX = pinnedX; tipAnchorY = pinnedY; }
				}

				if (tipLines.length > 0) {
					p.textSize(10);
					let padX = 6;
					let padY = 5;
					let lineH = 14;
					let maxW = 0;
					for (let line of tipLines) {
						let tw = p.textWidth(line);
						if (tw > maxW) maxW = tw;
					}
					let tipW = maxW + padX * 2;
					let tipH = padY * 2 + tipLines.length * lineH;
					let tipX = p.constrain(tipAnchorX + 12, 0, p.width - tipW - 2);
					let tipY = tipAnchorY - tipH - 8;
					if (tipY < 2) tipY = tipAnchorY + 16;

					p.noStroke();
					p.fill(...theme.bg1, 230);
					p.rect(tipX, tipY, tipW, tipH, 3);
					for (let j = 0; j < tipLines.length; j++) {
						p.fill(j === 0 ? [...theme.fg4] : [...theme.fg]);
						p.textAlign(p.LEFT, p.CENTER);
						p.text(tipLines[j], tipX + padX, tipY + padY + j * lineH + lineH / 2);
					}
				}

				if (isDragging) {
					p.cursor('grabbing');
				} else if (hoveredEvent >= 0 || hoveredSpan >= 0) {
					p.cursor(p.HAND);
				} else {
					p.cursor('grab');
				}
			};
		};
	}

	onMount(async () => {
		const { default: p5 } = await import('p5');
		instance = new p5(buildSketch(events, spans, title), container);

		// Re-read theme on color scheme change
		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (instance?.windowResized) instance.windowResized();
		};
		mql.addEventListener('change', handler);
		container.__cleanupMql = () => mql.removeEventListener('change', handler);
	});

	onDestroy(() => {
		container?.__cleanupMql?.();
		instance?.remove();
	});
</script>

<div bind:this={container}></div>

<style>
	div :global(canvas) {
		touch-action: pan-y;
		border: 1px dashed var(--bg3);
		border-radius: 0.4rem;
	}
</style>
