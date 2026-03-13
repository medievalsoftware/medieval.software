<script>
	/** @type {number} */
	export let min = 0;
	/** @type {number} */
	export let max = 100;
	/** @type {number} */
	export let value = 50;
	/** @type {number | null} if set, enables range mode with value as low and high as high */
	export let high = null;
	/** @type {number} */
	export let step = 1;
	/** @type {string} gruvbox color name */
	export let color = 'blue';
	/** @type {boolean} vertical orientation */
	export let vertical = false;

	$: isRange = high !== null;

	let track;
	let dragging = null; // null | 'value' | 'low' | 'high'

	function valFromEvent(e) {
		const rect = track.getBoundingClientRect();
		const pct = vertical
			? Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
			: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		let val = min + pct * (max - min);
		if (step) val = Math.round(val / step) * step;
		return Math.max(min, Math.min(max, val));
	}

	function onGripDown(e, handle) {
		dragging = handle;
		track.setPointerCapture(e.pointerId);
	}

	function onTrackDown(e) {
		let val = valFromEvent(e);
		if (isRange) {
			let distLow = Math.abs(val - value);
			let distHigh = Math.abs(val - high);
			let handle = distLow === distHigh ? (val >= value ? 'high' : 'low')
				: distLow < distHigh ? 'low' : 'high';
			dragging = handle;
			track.setPointerCapture(e.pointerId);
			if (handle === 'low') {
				value = Math.min(val, high);
			} else {
				high = Math.max(val, value);
			}
		} else {
			dragging = 'value';
			track.setPointerCapture(e.pointerId);
			value = val;
		}
	}

	function onPointerMove(e) {
		if (!dragging) return;
		const val = valFromEvent(e);
		if (dragging === 'low') {
			value = Math.min(val, high);
		} else if (dragging === 'high') {
			high = Math.max(val, value);
		} else {
			value = val;
		}
	}

	function onPointerUp() {
		dragging = null;
	}

	$: valuePct = ((value - min) / (max - min)) * 100;
	$: highPct = isRange ? ((high - min) / (max - min)) * 100 : 0;
	$: fillLeft = isRange ? valuePct : 0;
</script>

<div class="slider"
	class:range={isRange}
	class:vertical
	bind:this={track}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:pointerdown={onTrackDown}
	on:lostpointercapture={onPointerUp}
	style="--fill-color: var(--{color}-dim)"
>
	<div class="slider-track" style="--low:{fillLeft}%;--high:{isRange ? 100 - highPct : 100 - valuePct}%"></div>
	{#if isRange}
		<div class="slider-grip" style="{vertical ? 'bottom' : 'left'}:{valuePct}%" on:pointerdown|stopPropagation={(e) => onGripDown(e, 'low')}></div>
		<div class="slider-grip" style="{vertical ? 'bottom' : 'left'}:{highPct}%" on:pointerdown|stopPropagation={(e) => onGripDown(e, 'high')}></div>
	{:else}
		<div class="slider-grip" style="{vertical ? 'bottom' : 'left'}:{valuePct}%" on:pointerdown|stopPropagation={(e) => onGripDown(e, 'value')}></div>
	{/if}
</div>

<style>
	.slider {
		position: relative;
		width: 100%;
		height: 1.4em;
		background: transparent;
		border-radius: var(--radius);
		cursor: pointer;
		touch-action: none;
	}

	.slider.vertical {
		width: 1.4em;
		height: 100%;
		min-height: 80px;
	}

	.slider-track {
		position: absolute;
		top: 37.5%;
		height: 25%;
		left: 0;
		right: 0;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--fill-color) 30%, transparent) 0%,
			color-mix(in srgb, var(--fill-color) 30%, transparent) var(--low),
			color-mix(in srgb, var(--fill-color) 60%, transparent) var(--low),
			color-mix(in srgb, var(--fill-color) 60%, transparent) calc(100% - var(--high)),
			color-mix(in srgb, var(--fill-color) 30%, transparent) calc(100% - var(--high)),
			color-mix(in srgb, var(--fill-color) 30%, transparent) 100%
		);
		border-radius: var(--radius);
		pointer-events: none;
	}

	.vertical .slider-track {
		top: 0;
		bottom: 0;
		height: auto;
		left: 37.5%;
		right: auto;
		width: 25%;
		background: linear-gradient(
			to top,
			color-mix(in srgb, var(--fill-color) 30%, transparent) 0%,
			color-mix(in srgb, var(--fill-color) 30%, transparent) var(--low),
			color-mix(in srgb, var(--fill-color) 60%, transparent) var(--low),
			color-mix(in srgb, var(--fill-color) 60%, transparent) calc(100% - var(--high)),
			color-mix(in srgb, var(--fill-color) 30%, transparent) calc(100% - var(--high)),
			color-mix(in srgb, var(--fill-color) 30%, transparent) 100%
		);
	}

	.slider-grip {
		position: absolute;
		top: 10%;
		height: 80%;
		width: 5px;
		border-radius: var(--radius-sm);
		background: var(--fg3);
		transform: translateX(-50%);
		cursor: ew-resize;
		touch-action: none;
	}

	.vertical .slider-grip {
		top: auto;
		left: 10%;
		width: 80%;
		height: 5px;
		transform: translateY(50%);
		cursor: ns-resize;
	}

	.slider-grip:hover,
	.slider-grip:active {
		background: var(--fg2);
	}
</style>
