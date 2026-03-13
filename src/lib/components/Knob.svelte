<script>
	/** @type {number} current value */
	export let value = 0;
	/** @type {number} */
	export let min = 0;
	/** @type {number} */
	export let max = 1;
	/** @type {number} step size (0 = continuous) */
	export let step = 0;
	/** @type {string} CSS color or var(--name) */
	export let color = 'var(--orange)';
	/** @type {string|null} label shown below the knob */
	export let label = null;
	/** @type {number} size in px */
	export let size = 80;
	/** @type {number} default value for double-click reset */
	export let defaultValue = value;

	let el;
	let dragging = false;
	let dragStartY = 0;
	let dragStartValue = 0;

	// Sweep arc: 270° range, starting from 135° (bottom-left) to 405° (bottom-right)
	const ARC_START = 135;
	const ARC_RANGE = 270;
	const R = 38;
	const KNOB_R = 24;
	const CX = 50;
	const CY = 50;

	function clamp(v) {
		if (step > 0) v = Math.round(v / step) * step;
		return Math.max(min, Math.min(max, v));
	}

	function onPointerDown(e) {
		dragging = true;
		dragStartY = e.clientY;
		dragStartValue = value;
		el.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e) {
		if (!dragging) return;
		let dy = dragStartY - e.clientY;
		// Full value range maps to half the viewport height
		let dragRange = window.innerHeight / 4;
		let range = max - min;
		value = clamp(dragStartValue + (dy / dragRange) * range);
	}

	function onPointerUp() {
		dragging = false;
	}

	function onDblClick() {
		value = clamp(defaultValue);
	}

	/** @param {number} deg */
	function degToXY(deg, r = R) {
		let rad = deg * (Math.PI / 180);
		return { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r };
	}

	$: frac = max !== min ? (value - min) / (max - min) : 0;
	$: valueDeg = ARC_START + frac * ARC_RANGE;

	// Notch line (from center toward current value angle)
	$: notchInner = degToXY(valueDeg, KNOB_R * 0.45);
	$: notchOuter = degToXY(valueDeg, KNOB_R * 0.85);

	// Sweep arc path
	$: arcPath = (() => {
		let start = degToXY(ARC_START);
		let end = degToXY(valueDeg);
		let sweep = frac * ARC_RANGE;
		let largeArc = sweep > 180 ? 1 : 0;
		return `M${start.x},${start.y} A${R},${R} 0 ${largeArc} 1 ${end.x},${end.y}`;
	})();

	// Track arc path (full range)
	$: trackPath = (() => {
		let start = degToXY(ARC_START);
		let end = degToXY(ARC_START + ARC_RANGE);
		return `M${start.x},${start.y} A${R},${R} 0 1 1 ${end.x},${end.y}`;
	})();

	$: displayValue = step >= 1 ? Math.round(value).toString() : value.toFixed(2);

	// Tick positions — use actual stops for integer/stepped knobs, quartiles otherwise
	$: ticks = (() => {
		if (step > 0) {
			let count = Math.round((max - min) / step);
			if (count <= 20) {
				let arr = [];
				for (let i = 0; i <= count; i++) arr.push(i / count);
				return arr;
			}
		}
		return [0, 1];
	})();
</script>

<div
	class="knob"
	class:dragging
	bind:this={el}
	on:pointerdown={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:lostpointercapture={onPointerUp}
	on:dblclick={onDblClick}
	style="width:{size}px"
	{...$$restProps}
>
	<svg viewBox="0 0 100 100">
		<!-- Track -->
		<path d={trackPath} class="track" />

		<!-- Sweep (gauge fill) -->
		{#if frac > 0.001}
			<path d={arcPath} class="sweep" stroke={color} />
		{/if}

		<!-- Tick marks -->
		{#each ticks as t}
			{@const deg = ARC_START + t * ARC_RANGE}
			{@const inner = degToXY(deg)}
			{@const outerR = R + 4}
			{@const outer = { x: CX + Math.cos(deg * Math.PI / 180) * outerR, y: CY + Math.sin(deg * Math.PI / 180) * outerR }}
			<line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} class="tick" />
		{/each}

		<!-- Knob body -->
		<circle cx={CX} cy={CY} r={KNOB_R} class="knob-body" />

		<!-- Notch indicator -->
		<line x1={notchInner.x} y1={notchInner.y} x2={notchOuter.x} y2={notchOuter.y} class="notch" stroke={color} />
	</svg>
	{#if label != null}
		<span class="knob-label">{dragging ? displayValue : label}</span>
	{/if}
</div>

<style>
	.knob {
		display: flex;
		flex-direction: column;
		align-items: center;
		cursor: ns-resize;
		touch-action: none;
	}

	.knob.dragging {
		cursor: grabbing;
	}

	svg {
		width: 100%;
		overflow: visible;
	}

	.knob-label {
		font-size: 0.65em;
		color: var(--fg4);
		text-align: center;
		margin-top: -0.3em;
	}

	.track, .sweep, .tick, .notch {
		vector-effect: non-scaling-stroke;
	}

	.track {
		fill: none;
		stroke: var(--bg3);
		stroke-width: 3px;
		stroke-linecap: round;
	}

	.sweep {
		fill: none;
		stroke-width: 3px;
		stroke-linecap: round;
	}

	.tick {
		stroke: var(--bg4);
		stroke-width: 1px;
	}

	.knob-body {
		fill: var(--bg1);
		stroke: var(--bg3);
		stroke-width: 1px;
	}

	.notch {
		stroke-width: 2px;
		stroke-linecap: round;
	}
</style>
