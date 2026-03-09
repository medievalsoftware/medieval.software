<script>
	import Slider from './Slider.svelte';

	/** @type {number} */
	export let value = 0;
	/** @type {string} */
	export let label = '';
	/** @type {string} gruvbox color name: red, green, blue, yellow, orange, purple, aqua */
	export let color = 'blue';
	/** @type {number} */
	export let min = -Infinity;
	/** @type {number} */
	export let max = Infinity;
	/** @type {number} decimal places */
	export let precision = 2;
	/** @type {number} how much value changes per pixel dragged */
	export let sensitivity = 0.1;
	/** @type {'linear' | 'exponential' | 'logarithmic'} */
	export let scale = 'linear';

	let dragging = false;
	let startX = 0;
	let startValue = 0;
	let editing = false;
	let inputEl;
	let numChars = 4;

	function clamp(v) {
		return Math.max(min, Math.min(max, v));
	}

	function applyScale(delta) {
		if (scale === 'linear') {
			return startValue + delta * sensitivity;
		} else if (scale === 'exponential') {
			return startValue * Math.pow(2, delta * sensitivity * 0.02);
		} else if (scale === 'logarithmic') {
			let sign = Math.sign(delta);
			let mag = Math.log1p(Math.abs(delta)) * sensitivity;
			return startValue + sign * mag;
		}
		return startValue + delta * sensitivity;
	}

	function onPointerDown(e) {
		if (editing) return;
		dragging = true;
		startX = e.clientX;
		startValue = value;
		e.target.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e) {
		if (!dragging) return;
		let delta = e.clientX - startX;
		value = clamp(parseFloat(applyScale(delta).toFixed(precision)));
	}

	function onPointerUp() {
		dragging = false;
	}

	function onInputBlur() {
		if (!editing) return;
		editing = false;
		let parsed = parseFloat(inputEl.value);
		value = clamp(parseFloat((isNaN(parsed) ? 0 : parsed).toFixed(precision)));
	}

	function onInputKeydown(e) {
		if (e.key === 'Enter') {
			inputEl.blur();
		} else if (e.key === 'Escape') {
			editing = false;
		}
		e.stopPropagation();
	}

	function startEditing() {
		editing = true;
		requestAnimationFrame(() => {
			if (inputEl) {
				inputEl.value = displayValue;
				inputEl.focus();
				inputEl.select();
			}
		});
	}

	$: displayValue = value.toFixed(precision);
	$: hasRange = min > -Infinity && max < Infinity;
	$: {
		let maxWhole = Math.max(
			Math.abs(min) < Infinity ? Math.floor(Math.abs(min)).toString().length : 1,
			Math.abs(max) < Infinity ? Math.floor(Math.abs(max)).toString().length : 1
		);
		let sign = min < 0 ? 1 : 0;
		let dot = precision > 0 ? 1 : 0;
		numChars = sign + maxWhole + dot + precision;
	}
</script>

<div class="num-input" class:dragging style="--label-color: var(--{color}); --label-color-dim: var(--{color}-dim); --num-width: {numChars}ch">
	<div
		class="num-label"
		on:pointerdown={onPointerDown}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:lostpointercapture={onPointerUp}
	>
		{label}
	</div>
	{#if hasRange}
		<div class="num-slider-wrap">
			<Slider bind:value {min} {max} step={Math.pow(10, -precision)} {color} />
		</div>
	{/if}
	<div class="num-display" class:unbound={!hasRange} class:hidden={editing} on:click={startEditing}>
		{displayValue}
	</div>
	<input
		class="num-field"
		class:unbound={!hasRange}
		class:hidden={!editing}
		type="text"
		bind:this={inputEl}
		on:blur={onInputBlur}
		on:keydown={onInputKeydown}
	/>
</div>

<style>
	.num-input {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: 0.3rem;
		background: var(--bg_h);
		border-radius: var(--radius);
		overflow: hidden;
		font-size: 0.9em;
		height: 1.6em;
		flex: 1;
		min-width: 0;
		container-type: inline-size;
	}

	.num-label {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.4em;
		flex-shrink: 0;
		margin: 1px;
		border-radius: var(--radius-sm);
		background: var(--label-color-dim);
		color: var(--fg);
		font-weight: bold;
		font-size: 0.85em;
		cursor: ew-resize;
		user-select: none;
		touch-action: none;
	}

	.num-slider-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	@container (max-width: 8rem) {
		.num-slider-wrap {
			display: none;
		}
	}

	.num-display,
	.num-field {
		width: calc(var(--num-width) + 0.3rem);
		flex-shrink: 0;
		padding: 0 0.3rem 0 0;
		margin: 0;
		border: 0;
		box-sizing: border-box;
		font-family: 'Fira Mono', monospace;
		font-size: 0.9em;
		color: var(--fg1);
		text-align: right;
	}

	.num-display {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		cursor: text;
		user-select: none;
	}

	.num-field {
		background: transparent;
		outline: none;
		min-width: 0;
	}

	.num-display.unbound,
	.num-field.unbound {
		width: auto;
		flex: 1;
	}

	.hidden {
		display: none !important;
	}

	.dragging .num-label {
		background: var(--label-color);
	}
</style>
