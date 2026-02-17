<script>
	import { hexToRgb, rgbToHex } from '$lib/color.js';

	/** @type {{pos: number, color: string}[]} */
	export let stops = [
		{ pos: 0, color: '#000000' },
		{ pos: 1, color: '#ffffff' }
	];
	/** @type {string} gruvbox color name */
	export let color = 'blue';

	let track;
	let dragging = -1;
	let dragRef = null;
	let selected = -1;
	let removing = false;
	let didDrag = false;
	let colorInput;

	const REMOVE_DISTANCE = 30;

	function sortStops() {
		stops = [...stops].sort((a, b) => a.pos - b.pos);
	}

	function posFromEvent(e) {
		const rect = track.getBoundingClientRect();
		return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
	}

	function interpolateColor(pos) {
		let sorted = [...stops].sort((a, b) => a.pos - b.pos);
		if (pos <= sorted[0].pos) return sorted[0].color;
		if (pos >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
		for (let i = 0; i < sorted.length - 1; i++) {
			if (pos >= sorted[i].pos && pos <= sorted[i + 1].pos) {
				let t = (pos - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos);
				let [r1, g1, b1] = hexToRgb(sorted[i].color);
				let [r2, g2, b2] = hexToRgb(sorted[i + 1].color);
				return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
			}
		}
		return sorted[0].color;
	}

	function onStopPointerDown(e, i) {
		dragging = i;
		dragRef = stops[i];
		selected = i;
		removing = false;
		didDrag = false;
		track.setPointerCapture(e.pointerId);
		e.stopPropagation();
	}

	function onPointerMove(e) {
		if (dragging < 0) return;
		didDrag = true;
		stops[dragging].pos = parseFloat(posFromEvent(e).toFixed(3));
		stops = stops;

		// drag-away-to-delete: check vertical distance from track
		const rect = track.getBoundingClientRect();
		const dy = Math.abs(e.clientY - (rect.top + rect.height / 2));
		removing = stops.length > 2 && dy > REMOVE_DISTANCE;
	}

	function onPointerUp() {
		if (dragging >= 0) {
			if (removing) {
				stops = stops.filter((_, j) => j !== dragging);
				selected = -1;
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
		// suppress click after any drag (especially drag-to-remove)
		if (didDrag) { didDrag = false; return; }
		if (dragging >= 0) return;
		let pos = posFromEvent(e);
		let newStop = { pos: parseFloat(pos.toFixed(3)), color: interpolateColor(pos) };
		stops = [...stops, newStop];
		sortStops();
		selected = stops.indexOf(newStop);
	}

	function onColorChange(e) {
		if (selected >= 0 && selected < stops.length) {
			stops[selected].color = e.target.value;
			stops = stops;
		}
	}

	$: gradientCSS = [...stops]
		.sort((a, b) => a.pos - b.pos)
		.map(s => `${s.color} ${s.pos * 100}%`)
		.join(', ');
</script>

<div class="gradient-editor" style="--accent: var(--{color}-dim)">
	<div
		class="gradient-track"
		bind:this={track}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:lostpointercapture={onPointerUp}
		on:click={onTrackClick}
		style="background: linear-gradient(to right, {gradientCSS})"
	></div>
	<div class="gradient-stops">
		{#each stops as stop, i}
			<div
				class="gradient-stop"
				class:selected={selected === i}
				class:removing={removing && dragging === i}
				style="left: {stop.pos * 100}%; --stop-color: {stop.color}"
				on:pointerdown={(e) => onStopPointerDown(e, i)}
			>
				<svg class="stop-marker" viewBox="0 0 10 8" xmlns="http://www.w3.org/2000/svg">
					<path d="M5 0L10 8H0Z" fill="var(--stop-color)" stroke="black" stroke-width="1" stroke-linejoin="round" />
				</svg>
			</div>
		{/each}
	</div>
	{#if selected >= 0 && selected < stops.length}
		<input
			class="gradient-color-input"
			type="color"
			bind:this={colorInput}
			value={stops[selected].color}
			on:input={onColorChange}
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
	}

	.gradient-track {
		width: 100%;
		height: 1.4em;
		border-radius: var(--radius) var(--radius) 0 0;
		cursor: crosshair;
		touch-action: none;
		user-select: none;
		border: 1px solid var(--bg3);
	}

	.gradient-stops {
		position: relative;
		height: 0.9em;
		left: 2px;
		width: calc(100% - 2px);
	}

	.gradient-stop {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		cursor: ew-resize;
		touch-action: none;
		user-select: none;
		transition: opacity 0.1s;
	}

	.gradient-stop.removing {
		opacity: 0.3;
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

	.gradient-color-input {
		width: 1.6em;
		height: 1.2em;
		padding: 0;
		border: 1px solid var(--bg3);
		border-radius: var(--radius);
		background: transparent;
		cursor: pointer;
		margin-top: 2px;
	}
</style>
