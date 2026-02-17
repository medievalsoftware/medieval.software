<script>
	/** @type {number} */
	export let min = 0;
	/** @type {number} */
	export let max = 100;
	/** @type {number} */
	export let low = 25;
	/** @type {number} */
	export let high = 75;
	/** @type {number} */
	export let step = 1;
	/** @type {string} gruvbox color name */
	export let color = 'blue';

	let track;
	let dragging = null;

	function valFromEvent(e) {
		const rect = track.getBoundingClientRect();
		const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		let val = min + pct * (max - min);
		if (step) val = Math.round(val / step) * step;
		return Math.max(min, Math.min(max, val));
	}

	function onPointerDown(e, handle) {
		dragging = handle;
		track.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e) {
		if (!dragging) return;
		const val = valFromEvent(e);
		if (dragging === 'low') {
			low = Math.min(val, high);
		} else {
			high = Math.max(val, low);
		}
	}

	function onPointerUp() {
		dragging = null;
	}

	$: lowPct = ((low - min) / (max - min)) * 100;
	$: highPct = ((high - min) / (max - min)) * 100;
</script>

<div class="range-slider"
	bind:this={track}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:lostpointercapture={onPointerUp}
	style="--fill-color: var(--{color}-dim)"
>
	<div class="range-fill" style="left:{lowPct}%;width:{highPct - lowPct}%"></div>
	<div class="range-grip" style="left:{lowPct}%" on:pointerdown={(e) => onPointerDown(e, 'low')}></div>
	<div class="range-grip" style="left:{highPct}%" on:pointerdown={(e) => onPointerDown(e, 'high')}></div>
</div>

<style>
	.range-slider {
		position: relative;
		width: 100%;
		height: 1.4em;
		background: var(--bg0_h, #1d2021);
		border-radius: var(--radius);
		cursor: pointer;
		touch-action: none;
		user-select: none;
	}

	.range-fill {
		position: absolute;
		top: 37.5%;
		height: 25%;
		background: color-mix(in srgb, var(--fill-color) 40%, transparent);
		border-radius: var(--radius);
		pointer-events: none;
	}

	.range-grip {
		position: absolute;
		top: 10%;
		height: 80%;
		width: 5px;
		border-radius: var(--radius-sm);
		background: var(--fg3, #bdae93);
		transform: translateX(-50%);
		cursor: ew-resize;
		touch-action: none;
	}

	.range-grip:hover,
	.range-grip:active {
		background: var(--fg2, #d5c4a1);
	}
</style>
