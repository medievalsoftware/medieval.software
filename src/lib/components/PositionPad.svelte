<script>
	/** @type {number} normalized 0-1 */
	export let x = 0.5;
	/** @type {number} normalized 0-1 */
	export let y = 0.5;
	/** @type {'rect' | 'circle'} */
	export let shape = 'rect';

	let pad;
	let dragging = false;

	function update(e) {
		const rect = pad.getBoundingClientRect();
		let nx = (e.clientX - rect.left) / rect.width;
		let ny = (e.clientY - rect.top) / rect.height;

		if (shape === 'circle') {
			// map to -1..1, clamp to unit circle, map back to 0..1
			let cx = nx * 2 - 1;
			let cy = ny * 2 - 1;
			let len = Math.sqrt(cx * cx + cy * cy);
			if (len > 1) {
				cx /= len;
				cy /= len;
			}
			x = (cx + 1) / 2;
			y = (cy + 1) / 2;
		} else {
			x = Math.max(0, Math.min(1, nx));
			y = Math.max(0, Math.min(1, ny));
		}
	}

	function onPointerDown(e) {
		dragging = true;
		pad.setPointerCapture(e.pointerId);
		update(e);
	}

	function onPointerMove(e) {
		if (dragging) update(e);
	}

	function onPointerUp() {
		dragging = false;
	}
</script>

<div
	class="pos-pad"
	class:circle={shape === 'circle'}
	bind:this={pad}
	on:pointerdown={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:lostpointercapture={onPointerUp}
	{...$$restProps}
>
	{#if shape === 'circle'}
		<div class="pos-ring"></div>
	{/if}
	<div class="pos-crosshair-h" style="top:{y * 100}%"></div>
	<div class="pos-crosshair-v" style="left:{x * 100}%"></div>
	<div class="pos-dot" style="left:{x * 100}%;top:{y * 100}%"></div>
</div>

<style>
	.pos-pad {
		position: relative;
		width: 100%;
		aspect-ratio: 2 / 1;
		background: var(--bg);
		border: 1px solid var(--bg3);
		border-radius: 3px;
		cursor: crosshair;
		overflow: hidden;
		touch-action: none;
		user-select: none;
	}

	.pos-pad.circle {
		aspect-ratio: 1 / 1;
		border-radius: 50%;
	}

	.pos-ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
		pointer-events: none;
	}

	.pos-crosshair-h {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: rgba(255, 255, 255, 0.15);
		pointer-events: none;
	}

	.pos-crosshair-v {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.15);
		pointer-events: none;
	}

	.pos-dot {
		position: absolute;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--orange);
		border: 2px solid var(--bg);
		transform: translate(-50%, -50%);
		pointer-events: none;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
	}
</style>
