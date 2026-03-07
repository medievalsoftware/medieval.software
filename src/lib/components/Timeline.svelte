<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {{ date: string, label: string, color: number[], detail?: string }[]} */
	export let events = [];
	/** @type {{ start: string, end: string, label: string, color: number[], detail?: string }[]} */
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
			const boxPad = 8;
			const rowH = boxH + 12;
			const spanH = 20;
			const spanGap = 4;
			const bottomPad = 12;

			let pinnedEvent = -1;
			let pinnedSpan = -1;
			let pinnedX = 0;
			let pinnedY = 0;

			let titleH = 0;
			let timelineY;
			let eventRows = 1;
			let hoveredEvent = -1;
			let hoveredSpan = -1;
			let eventLayout = [];

			function monthToX(month) {
				return margin.left + (month / totalMonths) * (p.width - margin.left - margin.right);
			}

			function computeHeight() {
				return titleH + topPad + eventRows * rowH + 44 + 36 + spanData.length * (spanH + spanGap) + bottomPad;
			}

			function layoutEvents() {
				p.textSize(11);
				let rows = [];

				titleH = titleText ? 28 : 0;

				eventLayout = keyEvents.map((e) => {
					let x = monthToX(dateToPos(e.date));
					let tw = p.textWidth(e.label);
					let boxW = tw + boxPad * 2;
					let boxX = x - boxW / 2;
					boxX = Math.max(margin.left, Math.min(p.width - margin.right - boxW, boxX));

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

				eventRows = Math.max(1, rows.length);
				timelineY = titleH + topPad + eventRows * rowH + 44;

				for (let l of eventLayout) {
					l.boxY = timelineY - 44 - l.row * rowH;
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
				p.frameRate(30);
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

			p.mousePressed = () => {
				if (hoveredEvent >= 0) {
					if (pinnedEvent === hoveredEvent) {
						pinnedEvent = -1;
					} else {
						pinnedEvent = hoveredEvent;
						pinnedSpan = -1;
						pinnedX = p.mouseX;
						pinnedY = p.mouseY;
					}
				} else if (hoveredSpan >= 0) {
					if (pinnedSpan === hoveredSpan) {
						pinnedSpan = -1;
					} else {
						pinnedSpan = hoveredSpan;
						pinnedEvent = -1;
						pinnedX = p.mouseX;
						pinnedY = p.mouseY;
					}
				} else {
					pinnedEvent = -1;
					pinnedSpan = -1;
				}
			};

			p.draw = () => {
				if (!theme) return;
				p.clear();
				let mx = p.mouseX, my = p.mouseY;
				hoveredEvent = -1;
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

				// Timeline bar
				p.stroke(...theme.bg3);
				p.strokeWeight(2);
				p.line(margin.left, timelineY, p.width - margin.right, timelineY);

				// Month ticks and labels
				p.textSize(10);
				let monthW = (p.width - margin.left - margin.right) / totalMonths;

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

						let spanBottom = timelineY + 36 + spanData.length * (spanH + spanGap);
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
					let spanBottom = timelineY + 36 + spanData.length * (spanH + spanGap);

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
				let spanBottomY = spanStartY + spanData.length * (spanH + spanGap);

				// Hit-test spans first so guide lines can react
				for (let i = 0; i < spanData.length; i++) {
					let s = spanData[i];
					let x1 = monthToX(dateToPos(s.start));
					let x2 = monthToX(dateToPos(s.end));
					let y = spanStartY + i * (spanH + spanGap);
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
					let y = spanStartY + i * (spanH + spanGap);

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
					if (x2 - x1 > p.textWidth(s.label) + 12) {
						p.text(s.label, x1 + 6, y + spanH / 2);
					}
				}

				// Key events above timeline (right to left so earlier events draw on top)
				let boxRadius = 3;
				p.textSize(11);
				for (let i = keyEvents.length - 1; i >= 0; i--) {
					let e = keyEvents[i];
					let l = eventLayout[i];
					if (!l) continue;

					if (mx >= l.boxX && mx <= l.boxX + l.boxW && my >= l.boxY && my <= l.boxY + l.boxH) {
						hoveredEvent = i;
					}

					let hovered = hoveredEvent === i;

					// Line from box to timeline (extend into border radius for smooth join)
					p.stroke(...e.color, hovered ? 160 : 50);
					p.strokeWeight(1);
					p.line(l.x, l.boxY + l.boxH - boxRadius, l.x, timelineY - 2);

					// Dot on timeline
					p.noStroke();
					p.fill(...e.color, hovered ? 255 : 140);
					p.circle(l.x, timelineY, hovered ? 8 : 5);

					// Box
					p.fill(...(hovered ? theme.bg2 : theme.bg1));
					p.stroke(...e.color, hovered ? 160 : 70);
					p.strokeWeight(1);
					p.rect(l.boxX, l.boxY, l.boxW, l.boxH, boxRadius);

					// Label
					p.noStroke();
					p.fill(...(hovered ? theme.fg : theme.fg2));
					p.textAlign(p.CENTER, p.CENTER);
					p.text(e.label, l.boxX + l.boxW / 2, l.boxY + l.boxH / 2);
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

				// Tooltip for hovered or pinned event/span
				let tipLines = [];
				let tipAnchorX = mx;
				let tipAnchorY = my;
				let showEvent = pinnedEvent >= 0 ? pinnedEvent : hoveredEvent;
				let showSpan = showEvent < 0 ? (pinnedSpan >= 0 ? pinnedSpan : hoveredSpan) : -1;

				if (showEvent >= 0) {
					let e = keyEvents[showEvent];
					tipLines.push(formatDate(e.date));
					if (e.detail) tipLines.push(e.detail);
					if (pinnedEvent >= 0) { tipAnchorX = pinnedX; tipAnchorY = pinnedY; }
				} else if (showSpan >= 0) {
					let s = spanData[showSpan];
					tipLines.push(formatDate(s.start) + '  —  ' + formatDate(s.end));
					if (s.detail) tipLines.push(s.detail);
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

				p.cursor(hoveredEvent >= 0 || hoveredSpan >= 0 ? p.HAND : p.ARROW);
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
