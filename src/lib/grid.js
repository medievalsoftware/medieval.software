/**
 * Draw an adaptive vertical grid that responds to viewport zoom/pan.
 * Lines subdivide as you zoom in, giving spatial feedback during navigation.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w        - canvas width in CSS px
 * @param {number} h        - canvas height in CSS px
 * @param {number} viewStart - left edge of viewport (0..1)
 * @param {number} viewEnd   - right edge of viewport (0..1)
 * @param {string} color     - line color (CSS color string)
 * @param {number} [baseAlpha=0.08] - opacity for major grid lines
 */
export function drawGrid(ctx, w, h, viewStart, viewEnd, color, baseAlpha = 0.08) {
	let span = viewEnd - viewStart;
	if (span <= 0) return;

	// Choose grid spacing: find a "nice" interval that gives ~6-12 lines on screen
	let rawStep = span / 8;
	let mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
	let norm = rawStep / mag;
	let step;
	if (norm < 1.5) step = mag;
	else if (norm < 3.5) step = 2 * mag;
	else if (norm < 7.5) step = 5 * mag;
	else step = 10 * mag;

	let subStep = step / 4;

	// Draw sub-grid lines (finer)
	let subStart = Math.floor(viewStart / subStep) * subStep;
	ctx.strokeStyle = color;
	ctx.lineWidth = 0.5;
	for (let v = subStart; v <= viewEnd + subStep; v += subStep) {
		let x = ((v - viewStart) / span) * w;
		if (x < -1 || x > w + 1) continue;
		let isMajor = Math.abs(Math.round(v / step) * step - v) < step * 0.001;
		ctx.globalAlpha = isMajor ? baseAlpha * 2 : baseAlpha;
		ctx.beginPath();
		ctx.moveTo(Math.round(x) + 0.5, 0);
		ctx.lineTo(Math.round(x) + 0.5, h);
		ctx.stroke();
	}

	ctx.globalAlpha = 1;
}
