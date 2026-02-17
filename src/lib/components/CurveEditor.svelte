<script>
	import { sampleCurve, autoTangent } from '$lib/curve.js';

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

	let longPressTimer = null;
	const LONG_PRESS_MS = 500;
	const LONG_PRESS_MOVE_THRESHOLD = 8;
	let longPressStart = null;
	let orbitalMenu = null;
	const ORBITAL_RADIUS = 72;
	const ORBITAL_DEAD_ZONE = 20;
	const ORBITAL_ITEMS = [
		{ label: 'Delete', action: 'delete' },
		{ label: 'Flatten', action: 'flatten' },
		{ label: 'Linear', action: 'linear' },
		{ label: 'Step', action: 'step' },
		{ label: 'Smooth', action: 'smooth' },
	];

	function sortedPoints() {
		return [...points].sort((a, b) => a.x - b.x);
	}

	function hitTestPoint(sx, sy, threshold) {
		for (let i = 0; i < points.length; i++) {
			let ps = toSvg(points[i].x, points[i].y);
			if (Math.sqrt((sx - ps.x) ** 2 + (sy - ps.y) ** 2) < threshold) return i;
		}
		return -1;
	}

	function addKeyframe(x, y) {
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

	function refreshAutoTangents() {
		let s = sortedPoints();
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

	function startLongPress(e, pointIdx) {
		clearLongPress();
		if (e.pointerType !== 'touch' || pointIdx < 0) return;
		longPressStart = { x: e.clientX, y: e.clientY };
		longPressTimer = setTimeout(() => {
			longPressTimer = null;
			longPressStart = null;
			dragging = null;
			dragIdx = -1;
			dragRef = null;
			removing = false;
			didDrag = true;
			selected = pointIdx;
			orbitalMenu = {
				cx: e.clientX,
				cy: e.clientY,
				activeItem: -1
			};
		}, LONG_PRESS_MS);
	}

	function clearLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressStart = null;
	}

	function canDeleteSelected() {
		if (selected < 0 || points.length <= 2) return false;
		let s = sortedPoints();
		let si = s.indexOf(points[selected]);
		return si > 0 && si < s.length - 1;
	}

	function updateOrbitalSelection(clientX, clientY) {
		if (!orbitalMenu) return;
		const dx = clientX - orbitalMenu.cx;
		const dy = clientY - orbitalMenu.cy;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist < ORBITAL_DEAD_ZONE) {
			if (orbitalMenu.activeItem !== -1) {
				orbitalMenu.activeItem = -1;
				orbitalMenu = orbitalMenu;
			}
			return;
		}

		const angle = Math.atan2(dy, dx);
		const count = ORBITAL_ITEMS.length;
		let best = -1;
		let bestDiff = Infinity;
		for (let i = 0; i < count; i++) {
			const itemAngle = (i / count) * 2 * Math.PI - Math.PI / 2;
			let diff = Math.abs(angle - itemAngle);
			if (diff > Math.PI) diff = 2 * Math.PI - diff;
			if (diff < bestDiff) {
				bestDiff = diff;
				best = i;
			}
		}

		if (orbitalMenu.activeItem !== best) {
			orbitalMenu.activeItem = best;
			orbitalMenu = orbitalMenu;
		}
	}

	function executeOrbitalAction() {
		const idx = orbitalMenu?.activeItem ?? -1;
		orbitalMenu = null;
		if (idx < 0 || idx >= ORBITAL_ITEMS.length) return;

		const item = ORBITAL_ITEMS[idx];
		if (item.action === 'delete' && !canDeleteSelected()) return;

		switch (item.action) {
			case 'delete': contextDelete(); break;
			case 'flatten': contextFlatten(); break;
			case 'smooth': setInterpolation('cubic', 'auto'); break;
			case 'linear': setInterpolation('linear'); break;
			case 'step': setInterpolation('constant'); break;
		}
	}

	function toNorm(sx, sy) {
		return { x: sx / W, y: 1 - sy / H };
	}

	function toSvg(nx, ny) {
		return { x: nx * W, y: (1 - ny) * H };
	}

	function sortPoints() {
		points = sortedPoints();
	}

	function tangentHandlePos(point, tangent, isIn) {
		let dx = 1;
		let dy = -tangent;
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
		startLongPress(e, i);
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
		if (longPressStart) {
			const dx = e.clientX - longPressStart.x;
			const dy = e.clientY - longPressStart.y;
			if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) {
				clearLongPress();
			}
		}
		if (orbitalMenu) {
			updateOrbitalSelection(e.clientX, e.clientY);
			return;
		}
		if (!dragging) return;
		didDrag = true;

		const { x: sx, y: sy } = svgCoords(e);

		if (dragging === 'point') {
			let { x, y } = toNorm(sx - dragOffset.x, sy - dragOffset.y);
			y = Math.max(0, Math.min(1, y));

			// First/last sorted points: lock x
			let s = sortedPoints();
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
			let canRemove = points.length > 2 && sortedIdx > 0 && sortedIdx < s.length - 1;
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
		clearLongPress();
		if (orbitalMenu) {
			executeOrbitalAction();
			dragging = null;
			dragIdx = -1;
			dragRef = null;
			removing = false;
			return;
		}
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
		let hit = hitTestPoint(sx, sy, POINT_RADIUS * 2);
		if (hit >= 0) { selected = hit; return; }

		const { x, y } = toNorm(sx, sy);
		addKeyframe(x, y);
	}

	function onContextMenu(e) {
		e.preventDefault();
		const { x: sx, y: sy } = svgCoords(e);
		let hitIdx = hitTestPoint(sx, sy, POINT_RADIUS * 3);
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
		orbitalMenu = null;
	}

	function contextAdd() {
		if (!contextMenu) return;
		const { x, y } = toNorm(contextMenu.svgX, contextMenu.svgY);
		addKeyframe(x, y);
		closeContextMenu();
	}

	function contextDelete() {
		if (!canDeleteSelected()) { closeContextMenu(); return; }
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
			case '1': setInterpolation('cubic', 'auto'); break;
			case '2': setInterpolation('cubic', 'mirrored'); break;
			case '3': setInterpolation('cubic', 'split'); break;
			case '4': setInterpolation('linear'); break;
			case '5': setInterpolation('constant'); break;
			case '6': contextFlatten(); break;
			case 'Delete':
			case 'Backspace': contextDelete(); break;
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
			let s = sortedPoints();
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

<div class="curve-editor" style="--accent: var(--{color}); --accent-dim: var(--{color}-dim)">
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
				{@const s = sortedPoints()}
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
			<button on:click={() => setInterpolation('cubic', 'auto')}>Cubic Auto <span class="ctx-key">1</span></button>
			<button on:click={() => setInterpolation('cubic', 'mirrored')}>Cubic Mirrored <span class="ctx-key">2</span></button>
			<button on:click={() => setInterpolation('cubic', 'split')}>Cubic Split <span class="ctx-key">3</span></button>
			<button on:click={() => setInterpolation('linear')}>Linear <span class="ctx-key">4</span></button>
			<button on:click={() => setInterpolation('constant')}>Constant <span class="ctx-key">5</span></button>
			<div class="ctx-divider"></div>
			<button on:click={contextFlatten}>Flatten <span class="ctx-key">6</span></button>
			<button on:click={contextDelete} disabled={points.length <= 2}>Delete</button>
		{:else}
			<button on:click={contextAdd}>Add Key</button>
		{/if}
	</div>
{/if}

{#if orbitalMenu}
	<div use:portal class="orbital-overlay" style="position:fixed;z-index:99999;top:0;left:0;width:0;height:0" on:click|stopPropagation>
		{#each ORBITAL_ITEMS as item, i}
			{@const angle = (i / ORBITAL_ITEMS.length) * 2 * Math.PI - Math.PI / 2}
			{@const ix = orbitalMenu.cx + ORBITAL_RADIUS * Math.cos(angle)}
			{@const iy = orbitalMenu.cy + ORBITAL_RADIUS * Math.sin(angle)}
			{@const isDisabled = item.action === 'delete' && !canDeleteSelected()}
			<div
				class="orbital-item"
				class:active={orbitalMenu.activeItem === i && !isDisabled}
				class:disabled={isDisabled}
				class:danger={item.action === 'delete'}
				style="position:fixed;left:{ix}px;top:{iy}px"
			>
				{item.label}
			</div>
		{/each}
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
		max-width: 32rem;
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

	.orbital-overlay {
		pointer-events: none;
	}

	.orbital-item {
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: rgba(20, 20, 20, 0.92);
		border: 1.5px solid rgba(255, 255, 255, 0.15);
		color: var(--fg3);
		font-size: 0.65em;
		white-space: nowrap;
		backdrop-filter: blur(6px);
		transition: transform 0.1s, background 0.1s, color 0.1s, border-color 0.1s;
	}

	.orbital-item.active {
		transform: translate(-50%, -50%) scale(1.18);
		background: rgba(255, 255, 255, 0.15);
		color: var(--fg1);
		border-color: var(--accent);
	}

	.orbital-item.danger.active {
		background: rgba(200, 50, 50, 0.25);
		border-color: var(--red);
		color: var(--red);
	}

	.orbital-item.disabled {
		opacity: 0.3;
	}

	.orbital-item.disabled.active {
		transform: translate(-50%, -50%);
		background: rgba(20, 20, 20, 0.92);
		border-color: rgba(255, 255, 255, 0.15);
		color: var(--fg3);
	}
</style>
