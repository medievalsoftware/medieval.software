<script>
	import { sampleCurve, curvePathData, autoTangent } from '$lib/curve.js';

	/** @type {import('$lib/curve.js').Keyframe[]} */
	export let points = [
		{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 0.5, tangentMode: 'mirrored' },
		{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 0.5, tangentOut: 0, tangentMode: 'mirrored' }
	];
	/** @type {string} gruvbox color name */
	export let color = 'aqua';

	const W = 200;
	const H = 200;
	const TANGENT_RADIUS = 50;
	const REMOVE_DISTANCE = 30;
	const POINT_RADIUS = 5;
	const HANDLE_RADIUS = 3;

	let svg;
	let selected = -1;
	let dragging = null; // null | 'point' | 'tangentIn' | 'tangentOut'
	let dragIdx = -1;
	let dragRef = null;
	let dragOffset = { x: 0, y: 0 }; // cursor offset from point center at grab time
	let didDrag = false;
	let removing = false;
	let contextMenu = null;
	let presetOpen = false;
	let wrapper;

	$: sorted = [...points].sort((a, b) => a.x - b.x);
	$: pathD = curvePathData(points, W, H);
	$: selectedPoint = selected >= 0 && selected < points.length ? points[selected] : null;

	/** Recompute tangent values for all 'auto' mode points based on neighbors */
	function refreshAutoTangents() {
		let s = [...points].sort((a, b) => a.x - b.x);
		let changed = false;
		for (let i = 0; i < s.length; i++) {
			if (s[i].tangentMode === 'auto') {
				let prev = i > 0 ? s[i - 1] : null;
				let next = i < s.length - 1 ? s[i + 1] : null;
				let slope = autoTangent(prev, s[i], next);
				if (s[i].tangentIn !== slope || s[i].tangentOut !== slope) {
					s[i].tangentIn = slope;
					s[i].tangentOut = slope;
					changed = true;
				}
			}
		}
		if (changed) points = points;
	}

	function svgCoords(e) {
		const rect = svg.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * W,
			y: ((e.clientY - rect.top) / rect.height) * H
		};
	}

	function toNorm(sx, sy) {
		return { x: sx / W, y: 1 - sy / H };
	}

	function toSvg(nx, ny) {
		return { x: nx * W, y: (1 - ny) * H };
	}

	function sortPoints() {
		points = [...points].sort((a, b) => a.x - b.x);
	}

	function tangentHandlePos(point, tangent, isIn) {
		let aspectRatio = 1;
		let widgetSlope = tangent * aspectRatio;
		let dx = 1;
		let dy = -widgetSlope;
		let len = Math.sqrt(dx * dx + dy * dy);
		dx /= len;
		dy /= len;
		if (isIn) { dx = -dx; dy = -dy; }
		let sx = point.x * W + dx * TANGENT_RADIUS;
		let sy = (1 - point.y) * H + dy * TANGENT_RADIUS;
		return { x: sx, y: sy };
	}

	function onPointPointerDown(e, i) {
		e.stopPropagation();
		const { x: sx, y: sy } = svgCoords(e);
		const pt = points[i];
		dragOffset = { x: sx - pt.x * W, y: sy - (1 - pt.y) * H };
		dragging = 'point';
		dragIdx = i;
		dragRef = pt;
		selected = i;
		removing = false;
		didDrag = false;
		svg.setPointerCapture(e.pointerId);
	}

	function onTangentPointerDown(e, i, which) {
		e.stopPropagation();
		dragging = which;
		dragIdx = i;
		selected = i;
		didDrag = false;
		svg.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e) {
		if (!dragging) return;
		didDrag = true;

		const { x: sx, y: sy } = svgCoords(e);

		if (dragging === 'point') {
			let { x, y } = toNorm(sx - dragOffset.x, sy - dragOffset.y);
			y = Math.max(0, Math.min(1, y));

			// First/last sorted points: lock x
			let s = [...points].sort((a, b) => a.x - b.x);
			let sortedIdx = s.indexOf(points[dragIdx]);
			if (sortedIdx === 0) {
				x = 0;
			} else if (sortedIdx === s.length - 1) {
				x = 1;
			} else {
				// Constrain between neighbors
				let prevX = s[sortedIdx - 1].x;
				let nextX = s[sortedIdx + 1].x;
				x = Math.max(prevX + 0.001, Math.min(nextX - 0.001, x));
			}

			points[dragIdx].x = parseFloat(x.toFixed(4));
			points[dragIdx].y = parseFloat(y.toFixed(4));
			refreshAutoTangents();
			points = points;

			// Drag-away-to-delete
			const rect = svg.getBoundingClientRect();
			const pSvg = toSvg(points[dragIdx].x, points[dragIdx].y);
			const centerScreenY = rect.top + (pSvg.y / H) * rect.height;
			const dy = Math.abs(e.clientY - centerScreenY);
			let canRemove = points.length > 2;
			// Can't remove first/last
			let s2 = [...points].sort((a, b) => a.x - b.x);
			let si = s2.indexOf(points[dragIdx]);
			if (si === 0 || si === s2.length - 1) canRemove = false;
			removing = canRemove && dy > REMOVE_DISTANCE;
		} else {
			// Tangent handle drag
			let pt = points[dragIdx];
			let ptSvg = toSvg(pt.x, pt.y);
			let dx = sx - ptSvg.x;
			let dy = sy - ptSvg.y;

			let isIn = dragging === 'tangentIn';
			// Clamp so handle can't cross to opposite side
			if (isIn) {
				dx = Math.min(dx, -2);
			} else {
				dx = Math.max(dx, 2);
			}

			let tangent = (-dy / dx);

			if (pt.tangentMode === 'auto') {
				// Switch to mirrored on first drag
				points[dragIdx].tangentMode = 'mirrored';
			}

			if (isIn) {
				points[dragIdx].tangentIn = tangent;
			} else {
				points[dragIdx].tangentOut = tangent;
			}

			if (points[dragIdx].tangentMode === 'mirrored') {
				if (isIn) {
					points[dragIdx].tangentOut = tangent;
				} else {
					points[dragIdx].tangentIn = tangent;
				}
			}

			points = points;
		}
	}

	function onPointerUp() {
		if (dragging === 'point') {
			if (removing) {
				points = points.filter((_, j) => j !== dragIdx);
				refreshAutoTangents();
				selected = -1;
			} else {
				sortPoints();
				refreshAutoTangents();
				selected = dragRef ? points.indexOf(dragRef) : -1;
			}
		}
		dragging = null;
		dragIdx = -1;
		dragRef = null;
		removing = false;
	}

	function onSvgClick(e) {
		if (didDrag) { didDrag = false; return; }
		if (dragging) return;
		closeContextMenu();

		const { x: sx, y: sy } = svgCoords(e);
		const { x, y } = toNorm(sx, sy);

		// Check if clicked near an existing point
		for (let i = 0; i < points.length; i++) {
			let ps = toSvg(points[i].x, points[i].y);
			let dist = Math.sqrt((sx - ps.x) ** 2 + (sy - ps.y) ** 2);
			if (dist < POINT_RADIUS * 2) {
				selected = i;
				return;
			}
		}

		// Add new keyframe
		let newPoint = {
			x: parseFloat(Math.max(0, Math.min(1, x)).toFixed(4)),
			y: parseFloat(Math.max(0, Math.min(1, y)).toFixed(4)),
			interpolation: 'cubic',
			tangentIn: 0,
			tangentOut: 0,
			tangentMode: 'auto'
		};
		points = [...points, newPoint];
		sortPoints();
		refreshAutoTangents();
		selected = points.indexOf(newPoint);
	}

	function onContextMenu(e) {
		e.preventDefault();
		const rect = svg.getBoundingClientRect();
		const { x: sx, y: sy } = svgCoords(e);

		// Check if right-clicked on a point
		let hitIdx = -1;
		for (let i = 0; i < points.length; i++) {
			let ps = toSvg(points[i].x, points[i].y);
			let dist = Math.sqrt((sx - ps.x) ** 2 + (sy - ps.y) ** 2);
			if (dist < POINT_RADIUS * 3) {
				hitIdx = i;
				break;
			}
		}

		if (hitIdx >= 0) selected = hitIdx;

		contextMenu = {
			screenX: e.clientX,
			screenY: e.clientY,
			onPoint: hitIdx >= 0,
			svgX: sx,
			svgY: sy
		};
	}

	function closeContextMenu() {
		contextMenu = null;
	}

	function contextAdd() {
		if (!contextMenu) return;
		const { x, y } = toNorm(contextMenu.svgX, contextMenu.svgY);
		let newPoint = {
			x: parseFloat(Math.max(0, Math.min(1, x)).toFixed(4)),
			y: parseFloat(Math.max(0, Math.min(1, y)).toFixed(4)),
			interpolation: 'cubic',
			tangentIn: 0,
			tangentOut: 0,
			tangentMode: 'auto'
		};
		points = [...points, newPoint];
		sortPoints();
		refreshAutoTangents();
		selected = points.indexOf(newPoint);
		closeContextMenu();
	}

	function contextDelete() {
		if (selected < 0 || points.length <= 2) { closeContextMenu(); return; }
		let s = [...points].sort((a, b) => a.x - b.x);
		let si = s.indexOf(points[selected]);
		if (si === 0 || si === s.length - 1) { closeContextMenu(); return; }
		points = points.filter((_, j) => j !== selected);
		refreshAutoTangents();
		selected = -1;
		closeContextMenu();
	}

	function contextFlatten() {
		if (selected < 0) { closeContextMenu(); return; }
		points[selected].tangentIn = 0;
		points[selected].tangentOut = 0;
		points[selected].tangentMode = 'split';
		points = points;
		closeContextMenu();
	}

	function setInterpolation(interp, tangentMode) {
		if (selected < 0) { closeContextMenu(); return; }
		points[selected].interpolation = interp;
		if (tangentMode !== undefined) {
			points[selected].tangentMode = tangentMode;
		}
		if (tangentMode === 'auto') refreshAutoTangents();
		points = points;
		closeContextMenu();
	}

	function onKeyDown(e) {
		if (selected < 0) return;
		switch (e.key) {
			case '1':
				points[selected].interpolation = 'cubic';
				points[selected].tangentMode = 'auto';
				refreshAutoTangents();
				points = points;
				break;
			case '2':
				points[selected].interpolation = 'cubic';
				points[selected].tangentMode = 'mirrored';
				points = points;
				break;
			case '3':
				points[selected].interpolation = 'cubic';
				points[selected].tangentMode = 'split';
				points = points;
				break;
			case '4':
				points[selected].interpolation = 'linear';
				points = points;
				break;
			case '5':
				points[selected].interpolation = 'constant';
				points = points;
				break;
			case '6':
				points[selected].tangentIn = 0;
				points[selected].tangentOut = 0;
				points[selected].tangentMode = 'split';
				points = points;
				break;
			case 'Delete':
			case 'Backspace':
				if (points.length > 2) {
					let s = [...points].sort((a, b) => a.x - b.x);
					let si = s.indexOf(points[selected]);
					if (si > 0 && si < s.length - 1) {
						points = points.filter((_, j) => j !== selected);
						refreshAutoTangents();
						selected = -1;
					}
				}
				break;
		}
	}

	function applyPreset(preset) {
		switch (preset) {
			case 'linear':
				points = [
					{ x: 0, y: 0, interpolation: 'linear', tangentIn: 0, tangentOut: 0, tangentMode: 'auto' },
					{ x: 1, y: 1, interpolation: 'linear', tangentIn: 0, tangentOut: 0, tangentMode: 'auto' }
				];
				break;
			case 'ease-in':
				points = [
					{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'split' },
					{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 2, tangentOut: 0, tangentMode: 'split' }
				];
				break;
			case 'ease-out':
				points = [
					{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 2, tangentMode: 'split' },
					{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'split' }
				];
				break;
			case 'ease-in-out':
				points = [
					{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'split' },
					{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'split' }
				];
				break;
			case 'step':
				points = [
					{ x: 0, y: 0, interpolation: 'constant', tangentIn: 0, tangentOut: 0, tangentMode: 'auto' },
					{ x: 0.5, y: 1, interpolation: 'constant', tangentIn: 0, tangentOut: 0, tangentMode: 'auto' },
					{ x: 1, y: 1, interpolation: 'constant', tangentIn: 0, tangentOut: 0, tangentMode: 'auto' }
				];
				break;
			case 'bounce':
				points = [
					{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 2.5, tangentMode: 'split' },
					{ x: 0.4, y: 1.15, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'mirrored' },
					{ x: 0.7, y: 0.85, interpolation: 'cubic', tangentIn: 0, tangentOut: 0, tangentMode: 'mirrored' },
					{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 0.5, tangentOut: 0, tangentMode: 'split' }
				];
				break;
		}
		selected = -1;
		presetOpen = false;
	}

	function portal(node) {
		document.body.appendChild(node);
		return { destroy() { node.remove(); } };
	}

	function shouldShowTangents(point, idx) {
		if (idx !== selected) return false;
		if (point.interpolation !== 'cubic') {
			// Also check if previous segment targets this point with cubic
			let s = [...points].sort((a, b) => a.x - b.x);
			let si = s.indexOf(point);
			if (si > 0 && s[si - 1].interpolation === 'cubic') return true;
			return false;
		}
		return true;
	}

	/** Build per-segment path data for different interpolation styling */
	function segmentPaths(pts) {
		let s = [...pts].sort((a, b) => a.x - b.x);
		let segments = [];
		for (let i = 0; i < s.length - 1; i++) {
			let a = s[i];
			let b = s[i + 1];
			let interp = a.interpolation;
			let parts = [];
			let steps = interp === 'cubic' ? 60 : 2;

			if (interp === 'constant') {
				let ax = a.x * W, ay = (1 - a.y) * H;
				let bx = b.x * W, by = (1 - b.y) * H;
				parts.push(`M${ax.toFixed(2)},${ay.toFixed(2)}`);
				parts.push(`L${bx.toFixed(2)},${ay.toFixed(2)}`);
				parts.push(`L${bx.toFixed(2)},${by.toFixed(2)}`);
			} else {
				for (let j = 0; j <= steps; j++) {
					let t = a.x + (b.x - a.x) * (j / steps);
					let y = sampleCurve(pts, t);
					let sx = t * W;
					let sy = (1 - y) * H;
					parts.push(`${j === 0 ? 'M' : 'L'}${sx.toFixed(2)},${sy.toFixed(2)}`);
				}
			}
			segments.push({ d: parts.join(' '), interp });
		}
		return segments;
	}

	$: segments = segmentPaths(points);
</script>

<svelte:window on:click={closeContextMenu} on:keydown={onKeyDown} />

<div class="curve-editor" style="--accent: var(--{color}); --accent-dim: var(--{color}-dim)" bind:this={wrapper}>
	<div class="curve-toolbar">
		<div class="curve-preset-wrap">
			<button class="curve-preset-btn" on:click|stopPropagation={() => presetOpen = !presetOpen}>
				Presets
				<svg viewBox="0 0 10 10" width="8" height="8"><path d="M2 4L5 7L8 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
			</button>
			{#if presetOpen}
				<div class="curve-preset-menu" on:click|stopPropagation>
					<button on:click={() => applyPreset('linear')}>Linear</button>
					<button on:click={() => applyPreset('ease-in')}>Ease In</button>
					<button on:click={() => applyPreset('ease-out')}>Ease Out</button>
					<button on:click={() => applyPreset('ease-in-out')}>Ease In-Out</button>
					<button on:click={() => applyPreset('step')}>Step</button>
					<button on:click={() => applyPreset('bounce')}>Bounce</button>
				</div>
			{/if}
		</div>
	</div>
	<svg
		class="curve-svg"
		viewBox="0 0 {W} {H}"
		bind:this={svg}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:lostpointercapture={onPointerUp}
		on:click={onSvgClick}
		on:contextmenu={onContextMenu}
		tabindex="0"
	>
		<!-- Grid lines -->
		{#each [0.25, 0.5, 0.75] as f}
			<line x1={f * W} y1="0" x2={f * W} y2={H} class="grid-line" />
			<line x1="0" y1={f * H} x2={W} y2={f * H} class="grid-line" />
		{/each}

		<!-- Linear reference diagonal -->
		<line x1="0" y1={H} x2={W} y2="0" class="ref-line" />

		<!-- Curve segments -->
		{#each segments as seg}
			<path d={seg.d} class="curve-path" class:dashed={seg.interp === 'constant'} />
		{/each}

		<!-- Tangent handles (selected point only) -->
		{#each points as point, i}
			{#if shouldShowTangents(point, i)}
				{@const ptSvg = toSvg(point.x, point.y)}
				{@const hIn = tangentHandlePos(point, point.tangentIn, true)}
				{@const hOut = tangentHandlePos(point, point.tangentOut, false)}
				{@const s = [...points].sort((a, b) => a.x - b.x)}
				{@const si = s.indexOf(point)}
				{#if si > 0 && s[si - 1].interpolation === 'cubic'}
					<g class="tangent-group" on:pointerdown={(e) => onTangentPointerDown(e, i, 'tangentIn')}>
						<line x1={ptSvg.x} y1={ptSvg.y} x2={hIn.x} y2={hIn.y} class="tangent-line" />
						<circle cx={hIn.x} cy={hIn.y} r={4} class="tangent-handle handle-in" />
						<circle cx={hIn.x} cy={hIn.y} r={14} class="tangent-hit" />
					</g>
				{/if}
				{#if point.interpolation === 'cubic'}
					<g class="tangent-group" on:pointerdown={(e) => onTangentPointerDown(e, i, 'tangentOut')}>
						<line x1={ptSvg.x} y1={ptSvg.y} x2={hOut.x} y2={hOut.y} class="tangent-line" />
						<circle cx={hOut.x} cy={hOut.y} r={4} class="tangent-handle handle-out" />
						<circle cx={hOut.x} cy={hOut.y} r={14} class="tangent-hit" />
					</g>
				{/if}
			{/if}
		{/each}

		<!-- Keyframe points (diamonds) -->
		{#each points as point, i}
			{@const ps = toSvg(point.x, point.y)}
			{@const d = POINT_RADIUS}
			<rect
				x={ps.x - d} y={ps.y - d} width={d * 2} height={d * 2}
				transform="rotate(45 {ps.x} {ps.y})"
				class="keyframe-point"
				class:selected={selected === i}
				class:removing={removing && dragIdx === i}
				on:pointerdown={(e) => onPointPointerDown(e, i)}
			/>
		{/each}
	</svg>
</div>

{#if contextMenu}
	<div
		use:portal
		class="curve-context-menu"
		style="position:fixed;z-index:99999;top:{contextMenu.screenY}px;left:{contextMenu.screenX}px"
		on:click|stopPropagation
	>
		{#if contextMenu.onPoint && selected >= 0}
			<button on:click={contextDelete} disabled={points.length <= 2}>Delete</button>
			<button on:click={contextFlatten}>Flatten</button>
			<div class="ctx-divider"></div>
			<button on:click={() => setInterpolation('cubic', 'auto')}>Cubic Auto <span class="ctx-key">1</span></button>
			<button on:click={() => setInterpolation('cubic', 'mirrored')}>Cubic Mirrored <span class="ctx-key">2</span></button>
			<button on:click={() => setInterpolation('cubic', 'split')}>Cubic Split <span class="ctx-key">3</span></button>
			<button on:click={() => setInterpolation('linear')}>Linear <span class="ctx-key">4</span></button>
			<button on:click={() => setInterpolation('constant')}>Constant <span class="ctx-key">5</span></button>
		{:else}
			<button on:click={contextAdd}>Add Key</button>
		{/if}
	</div>
{/if}

<style>
	.curve-editor {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.curve-toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.curve-preset-wrap {
		position: relative;
	}

	.curve-preset-btn {
		all: unset;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		font-size: 0.7em;
		color: var(--fg4);
		background: var(--bg1);
		border: 1px solid var(--bg3);
		border-radius: var(--radius, 3px);
		cursor: pointer;
		transition: color 0.1s, background 0.1s;
	}

	.curve-preset-btn:hover {
		color: var(--fg2);
		background: var(--bg2);
	}

	.curve-preset-menu {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 2px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		min-width: 8rem;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		backdrop-filter: blur(6px);
		padding: 2px;
	}

	.curve-preset-menu button {
		all: unset;
		padding: 4px 8px;
		font-size: 0.75em;
		color: var(--fg3);
		cursor: pointer;
		border-radius: 2px;
		transition: background 0.1s, color 0.1s;
	}

	.curve-preset-menu button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--fg1);
	}

	.curve-svg {
		width: 100%;
		aspect-ratio: 1;
		background: var(--bg);
		border: 1px solid var(--bg_h);
		border-radius: var(--radius, 3px);
		cursor: crosshair;
		touch-action: none;
		user-select: none;
		overflow: visible;
		outline: none;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.08);
		stroke-width: 1px;
		stroke-dasharray: 3 3;
		vector-effect: non-scaling-stroke;
	}

	.ref-line {
		stroke: rgba(255, 255, 255, 0.05);
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
	}

	.curve-path {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2px;
		vector-effect: non-scaling-stroke;
	}

	.curve-path.dashed {
		stroke-dasharray: 4 3;
	}

	.tangent-line {
		stroke: var(--fg4);
		stroke-width: 1px;
		stroke-dasharray: 3 2;
		vector-effect: non-scaling-stroke;
		opacity: 0.5;
		pointer-events: none;
	}

	.tangent-group {
		cursor: grab;
	}

	.tangent-handle {
		stroke: rgba(0, 0, 0, 0.5);
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		pointer-events: none;
	}

	.tangent-handle.handle-in {
		fill: var(--blue);
	}

	.tangent-handle.handle-out {
		fill: var(--red);
	}

	.tangent-group:hover .tangent-handle.handle-in {
		fill: var(--blue-dim);
	}

	.tangent-group:hover .tangent-handle.handle-out {
		fill: var(--red-dim);
	}

	.tangent-hit {
		fill: transparent;
		stroke: none;
	}

	.keyframe-point {
		fill: var(--accent);
		stroke: rgba(0, 0, 0, 0.6);
		stroke-width: 1.5px;
		vector-effect: non-scaling-stroke;
		cursor: grab;
		transition: opacity 0.1s;
	}

	.keyframe-point.selected {
		stroke-width: 2px;
	}

	.keyframe-point.removing {
		opacity: 0.3;
	}

	.curve-context-menu {
		display: flex;
		flex-direction: column;
		min-width: 10rem;
		padding: 3px;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		backdrop-filter: blur(6px);
		font-size: 0.75em;
	}

	.curve-context-menu button {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px;
		color: var(--fg3);
		cursor: pointer;
		border-radius: 2px;
		transition: background 0.1s, color 0.1s;
	}

	.curve-context-menu button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--fg1);
	}

	.curve-context-menu button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.ctx-divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
		margin: 2px 4px;
	}

	.ctx-key {
		color: var(--fg4);
		font-size: 0.85em;
		opacity: 0.6;
	}
</style>
