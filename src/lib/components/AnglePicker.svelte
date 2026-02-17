<script>
	/** @type {number} angle in degrees */
	export let angle = 0;

	let pad;
	let dragging = false;

	function update(e) {
		const rect = pad.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		let deg = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
		deg = ((deg % 360) + 360) % 360;
		if (e.shiftKey) deg = Math.round(deg / 15) * 15;
		angle = deg;
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

	$: rad = angle * (Math.PI / 180);
	$: tipX = 50 + Math.cos(rad) * 44;
	$: tipY = 50 + Math.sin(rad) * 44;
</script>

<div
	class="angle-picker"
	bind:this={pad}
	on:pointerdown={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:lostpointercapture={onPointerUp}
	{...$$restProps}
>
	<svg viewBox="0 0 100 100">
		<circle cx="50" cy="50" r="44" class="ring" />
		{#each Array.from({length: 24}, (_, i) => i * 15) as tick}
			<line
				x1={50 + Math.cos(tick * Math.PI / 180) * (tick % 90 === 0 ? 40 : 42)}
				y1={50 + Math.sin(tick * Math.PI / 180) * (tick % 90 === 0 ? 40 : 42)}
				x2={50 + Math.cos(tick * Math.PI / 180) * 44}
				y2={50 + Math.sin(tick * Math.PI / 180) * 44}
				class={tick % 90 === 0 ? 'tick' : 'tick-minor'}
			/>
		{/each}
		<line x1="50" y1="50" x2={tipX} y2={tipY} class="arm" />
		<circle cx="50" cy="50" r="1.5" class="center" />
		<circle cx={tipX} cy={tipY} r="3" class="knob" />
	</svg>
</div>

<style>
	.angle-picker {
		width: 100%;
		aspect-ratio: 1 / 1;
		cursor: crosshair;
		touch-action: none;
		user-select: none;
	}

	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.ring, .arm, .tick {
		vector-effect: non-scaling-stroke;
	}

	.ring {
		fill: var(--bg);
		stroke: var(--bg3);
		stroke-width: 1px;
	}

	.center {
		fill: var(--bg4);
	}

	.arm {
		stroke: rgba(255, 255, 255, 0.15);
		stroke-width: 1px;
	}

	.knob {
		fill: var(--orange);
	}

	.tick {
		stroke: var(--bg4);
		stroke-width: 1px;
	}

	.tick-minor {
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 1px;
	}
</style>
