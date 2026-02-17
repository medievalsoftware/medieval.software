<script>
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
		editing = false;
		value = clamp(parseFloat(parseFloat(inputEl.value).toFixed(precision)) || 0);
	}

	function onInputKeydown(e) {
		if (e.key === 'Enter') {
			inputEl.blur();
		} else if (e.key === 'Escape') {
			editing = false;
		}
	}

	function startEditing() {
		editing = true;
		// tick so the input renders before focusing
		setTimeout(() => inputEl?.select(), 0);
	}

	$: displayValue = value.toFixed(precision);
</script>

<div class="num-input" class:dragging style="--label-color: var(--{color}); --label-color-dim: var(--{color}-dim)">
	<div
		class="num-label"
		on:pointerdown={onPointerDown}
		on:pointermove={onPointerMove}
		on:pointerup={onPointerUp}
		on:lostpointercapture={onPointerUp}
	>
		{label}
	</div>
	{#if editing}
		<input
			class="num-field"
			type="text"
			bind:this={inputEl}
			value={displayValue}
			on:blur={onInputBlur}
			on:keydown={onInputKeydown}
		/>
	{:else}
		<div class="num-display" on:click={startEditing}>
			{displayValue}
		</div>
	{/if}
</div>

<style>
	.num-input {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		background: var(--bg0_h);
		border-radius: var(--radius);
		overflow: hidden;
		font-size: 0.9em;
		height: 1.6em;
		flex: 1;
		min-width: 0;
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
		color: rgba(255, 255, 255, 0.9);
		font-weight: bold;
		font-size: 0.85em;
		cursor: ew-resize;
		user-select: none;
		touch-action: none;
	}

	.num-display {
		flex: 1;
		display: flex;
		align-items: center;
		padding: 0 0.4rem;
		font-family: 'Fira Mono', monospace;
		font-size: 0.9em;
		color: var(--fg1);
		cursor: text;
		user-select: none;
	}

	.num-field {
		flex: 1;
		padding: 0 0.4rem;
		background: transparent;
		color: var(--fg1);
		border: none;
		outline: none;
		font-family: 'Fira Mono', monospace;
		font-size: 0.9em;
		width: 100%;
		min-width: 0;
	}

	.dragging .num-label {
		background: var(--label-color);
	}
</style>
