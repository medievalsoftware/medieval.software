<script>
	/** @type {(string | {label: string, value: any})[]} */
	export let options = [];
	export let value = undefined;
	/** @type {string} gruvbox color name */
	export let color = 'blue';

	$: items = options.map(o => typeof o === 'string' ? { label: o, value: o } : o);
	$: activeIdx = items.findIndex(i => i.value === value);

	let buttons = [];
	let indicatorStyle = '';

	function updateIndicator() {
		if (activeIdx >= 0 && buttons[activeIdx]) {
			let btn = buttons[activeIdx];
			indicatorStyle = `left:${btn.offsetLeft}px;width:${btn.offsetWidth}px`;
		}
	}

	$: if (activeIdx >= 0 && typeof window !== 'undefined') requestAnimationFrame(updateIndicator);
</script>

<svelte:window on:resize={updateIndicator} />

<div class="segmented" style="--accent: var(--{color}-dim)">
	<div class="inner">
		<div class="indicator" style={indicatorStyle} class:visible={activeIdx >= 0}></div>
		{#each items as item, i}
			<button
				class:active={value === item.value}
				bind:this={buttons[i]}
				on:click={() => value = item.value}
			>{item.label}</button>
		{/each}
	</div>
</div>

<style>
	.segmented {
		background: var(--bg_h);
		border-radius: var(--radius, 3px);
		padding: 3px;
	}

	.inner {
		display: flex;
		position: relative;
		gap: 2px;
	}

	.indicator {
		position: absolute;
		top: 0;
		bottom: 0;
		background: color-mix(in srgb, var(--accent) 35%, var(--bg2));
		border-radius: calc(var(--radius, 3px) - 1px);
		transition: left 0.15s ease, width 0.15s ease;
		pointer-events: none;
		opacity: 0;
	}

	.indicator.visible {
		opacity: 1;
	}

	button {
		all: unset;
		box-sizing: border-box;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2px 6px;
		font-size: 0.75em;
		color: var(--fg4);
		cursor: pointer;
		z-index: 1;
		border-radius: calc(var(--radius, 3px) - 1px);
		transition: color 0.1s;
	}

	button.active {
		color: var(--fg1);
	}
</style>
