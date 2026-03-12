<script>
	import { lerpColor } from '$lib/color.js';

	/** @type {{pos: number, color: string}[]} */
	export let stops = [
		{ pos: 0, color: '#000000' },
		{ pos: 1, color: '#ffffff' }
	];
	/** @type {string} gruvbox color name */
	export let color = 'blue';
	/** @type {'srgb'|'oklab'} */
	export let interpolation = 'srgb';

	let track;
	let dragging = -1;
	let dragRef = null;
	let selected = -1;
	let removing = false;
	let didDrag = false;
	let colorInput;
	let hoverIdx = -1;

	const REMOVE_DISTANCE = 30;
	const GRAB_THRESHOLD_PX = 8;

	function sortStops() {
		stops = [...stops].sort((a, b) => a.pos - b.pos);
	}

	function posFromEvent(e) {
		const rect = track.getBoundingClientRect();
		const border = 1;
		return Math.max(0, Math.min(1, (e.clientX - rect.left - border) / (rect.width - border * 2)));
	}

	function nearestStopIdx(pos) {
		if (!track) return -1;
		const rect = track.getBoundingClientRect();
		const thresholdNorm = GRAB_THRESHOLD_PX / rect.width;
		let bestIdx = -1;
		let bestDist = Infinity;
		for (let i = 0; i < stops.length; i++) {
			let d = Math.abs(stops[i].pos - pos);
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		}
		return bestDist <= thresholdNorm ? bestIdx : -1;
	}

	function interpolateColor(pos) {
		let sorted = [...stops].sort((a, b) => a.pos - b.pos);
		if (pos <= sorted[0].pos) return sorted[0].color;
		if (pos >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
		for (let i = 0; i < sorted.length - 1; i++) {
			if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
				let t = (pos - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos);
				return lerpColor(sorted[i].color, sorted[i + 1].color, t, interpolation);
			}
		}
		return sorted[0].color;
	}

	function onTrackPointerDown(e) {
		let pos = posFromEvent(e);
		let idx = nearestStopIdx(pos);
		if (idx >= 0) {
			dragging = idx;
			dragRef = stops[idx];
			selected = idx;
			removing = false;
			didDrag = false;
			track.setPointerCapture(e.pointerId);
		}
	}

	function onPointerMove(e) {
		let pos = posFromEvent(e);

		if (dragging < 0) {
			hoverIdx = nearestStopIdx(pos);
			return;
		}

		didDrag = true;
		stops[dragging].pos = parseFloat(pos.toFixed(3));
		stops = stops;

		const rect = track.getBoundingClientRect();
		const dy = Math.abs(e.clientY - (rect.top + rect.height / 2));
		removing = stops.length > 2 && dy > REMOVE_DISTANCE;
	}

	function onPointerUp() {
		if (dragging >= 0) {
			if (removing) {
				stops = stops.filter((_, j) => j !== dragging);
				selected = -1;
				hoverIdx = -1;
			} else {
				sortStops();
				selected = dragRef ? stops.indexOf(dragRef) : -1;
			}
		}
		dragging = -1;
		dragRef = null;
		removing = false;
	}

	function onTrackClick(e) {
		if (didDrag) { didDrag = false; return; }
		if (dragging >= 0) return;
		let pos = posFromEvent(e);
		if (nearestStopIdx(pos) >= 0) return;
		let newStop = { pos: parseFloat(pos.toFixed(3)), color: interpolateColor(pos) };
		stops = [...stops, newStop];
		sortStops();
		selected = stops.indexOf(newStop);
	}

	function onTrackLeave() {
		if (dragging < 0) {
			hoverIdx = -1;
		}
	}

	function onColorChange(e) {
		if (selected >= 0 && selected < stops.length) {
			stops[selected].color = e.target.value;
			stops = stops;
		}
	}

	$: gradientCSS = (() => {
		let colorStops = [...stops]
			.sort((a, b) => a.pos - b.pos)
			.map(s => `${s.color} ${s.pos * 100}%`)
			.join(', ');
		let space = interpolation !== 'srgb' ? `in ${interpolation}, ` : '';
		return `${space}${colorStops}`;
	})();

	$: trackCursor = hoverIdx >= 0 ? 'ew-resize' : 'crosshair';
</script>

<svelte:window on:click={() => selected = -1} />

<div class="gradient-editor" style="--accent: var(--{color}-dim)" on:click|stopPropagation>
	<div
		class="gradient-area"
		bind:this={track}
		on:pointerdown={onTrackPointerDown}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:lostpointercapture={onPointerUp}
		on:pointerleave={onTrackLeave}
		on:click={onTrackClick}
		style="cursor: {trackCursor}"
	>
		<div class="gradient-track" style="background: linear-gradient(to right, {gradientCSS})"></div>
		<div class="gradient-stops">
			{#each stops as stop, i}
				<div
					class="gradient-stop"
					class:selected={selected === i}
					class:hover-target={hoverIdx === i && dragging < 0}
					class:removing={removing && dragging === i}
					style="left: {stop.pos * 100}%; --stop-color: {stop.color}"
				>
					<svg class="stop-marker" viewBox="0 0 10 8" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 0L10 8H0Z" fill="var(--stop-color)" stroke="var(--bg_h)" stroke-width="1" stroke-linejoin="round" />
					</svg>
				</div>
			{/each}
		</div>
		{#if hoverIdx >= 0 && hoverIdx < stops.length && dragging < 0}
			<div class="hover-guide" style="left: calc(1px + {stops[hoverIdx].pos} * (100% - 2px))"></div>
		{/if}
	</div>
	{#if selected >= 0 && selected < stops.length}
		<input
			class="gradient-color-input"
			type="color"
			bind:this={colorInput}
			value={stops[selected].color}
			on:input={onColorChange}
			style="left: calc(1px + {stops[selected].pos} * (100% - 2px))"
		/>
	{/if}
</div>

<style>
	.gradient-editor {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
	}

	.gradient-area {
		position: relative;
		touch-action: none;
	}

	.gradient-track {
		width: 100%;
		height: var(--input-h, 1.6em);
		border-radius: var(--radius);
		border: 1px solid var(--bg_h);
		background-clip: padding-box;
		box-sizing: border-box;
		pointer-events: none;
	}

	.gradient-stops {
		position: relative;
		height: 0.9em;
		left: 1px;
		width: calc(100% - 2px);
		pointer-events: none;
		overflow: visible;
	}

	.gradient-stop {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		transition: opacity 0.1s;
	}

	.gradient-stop.removing {
		opacity: 0.3;
	}

	.gradient-stop.hover-target .stop-marker path {
		stroke: var(--fg4);
	}

	.stop-marker {
		width: 10px;
		height: 8px;
		display: block;
		overflow: visible;
	}

	.gradient-stop.selected .stop-marker {
		width: 12px;
		height: 10px;
	}

	.gradient-stop.selected .stop-marker path {
		stroke: var(--orange);
	}

	.hover-guide {
		position: absolute;
		top: 0;
		height: var(--input-h, 1.6em);
		width: 1px;
		background: var(--fg4);
		transform: translateX(-50%);
		pointer-events: none;
		opacity: 0.5;
	}

	.gradient-color-input {
		appearance: none;
		position: absolute;
		bottom: 0;
		transform: translateX(-50%) translateY(100%);
		width: 1.4em;
		height: 1.4em;
		padding: 0;
		border: 1px solid var(--bg3);
		border-radius: var(--radius);
		background: var(--bg_h);
		cursor: pointer;
		margin-top: 1px;
		z-index: 10;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}

	.gradient-color-input::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.gradient-color-input::-webkit-color-swatch {
		border: none;
		border-radius: var(--radius);
	}

	.gradient-color-input::-moz-color-swatch {
		border: none;
		border-radius: var(--radius);
	}
</style>
