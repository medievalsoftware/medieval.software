<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {(p: import('p5')) => void} */
	export let sketch;

	let container;
	let instance;
	let overlayCorner = 0;
	let overlayOpen = true;
	let cornerPopover = false;
	const cornerPaths = [
		'M8 8L2 2M5 2L2 2L2 5',
		'M2 8L8 2M5 2L8 2L8 5',
		'M2 2L8 8M5 8L8 8L8 5',
		'M8 2L2 8M5 8L2 8L2 5',
	];

	let popoverPos = { top: 0, left: 0 };

	function togglePopover(e) {
		cornerPopover = !cornerPopover;
		if (cornerPopover) {
			const rect = e.currentTarget.getBoundingClientRect();
			popoverPos = { top: rect.bottom + 3, left: rect.left };
		}
	}

	let popoverCloseTimer;

	function schedulePopoverClose() {
		if (!cornerPopover) return;
		popoverCloseTimer = setTimeout(() => { cornerPopover = false; }, 120);
	}

	function cancelPopoverClose() {
		clearTimeout(popoverCloseTimer);
	}

	function onWindowClick() {
		cornerPopover = false;
	}

	function portal(node) {
		document.body.appendChild(node);
		return { destroy() { node.remove(); } };
	}

	onMount(async () => {
		const { default: p5 } = await import('p5');
		instance = new p5(sketch, container);
	});

	onDestroy(() => {
		instance?.remove();
	});

</script>

<svelte:window on:click={onWindowClick} />

<div class="p5-wrapper" {...$$restProps}>
	<div class="p5-stage">
		<div class="p5-canvas" bind:this={container}></div>
		{#if $$slots.overlay}
			<div class="p5-overlay"
				class:tl={overlayCorner === 0}
				class:tr={overlayCorner === 1}
				class:br={overlayCorner === 2}
				class:bl={overlayCorner === 3}
				on:mouseleave={schedulePopoverClose}
				on:mouseenter={cancelPopoverClose}
			>
				<div class="p5-overlay-bar">
					<button class="p5-overlay-btn" on:click={() => overlayOpen = !overlayOpen} title={overlayOpen ? 'Minimize' : 'Expand'}>
						<svg viewBox="0 0 10 10" width="10" height="10">
							{#if overlayOpen}
								<path d="M2 5h6" stroke="currentColor" stroke-width="1.5" fill="none"/>
							{:else}
								<path d="M2 5h6M5 2v6" stroke="currentColor" stroke-width="1.5" fill="none"/>
							{/if}
						</svg>
					</button>
					<button class="p5-overlay-btn" on:click|stopPropagation={togglePopover} title="Position">
						<svg viewBox="0 0 10 10" width="10" height="10"><path d={cornerPaths[overlayCorner]} stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
					</button>
				</div>
				{#if overlayOpen}
					<div class="p5-overlay-content">
						<slot name="overlay" />
					</div>
				{/if}
			</div>
		{/if}
	</div>
	{#if $$slots.default}
		<div class="p5-panel">
			<span class="p5-panel-header">Properties</span>
			<div class="p5-props">
				<slot />
			</div>
		</div>
	{/if}
</div>
{#if cornerPopover}
	<div use:portal class="p5-corner-popover" style="position:fixed;z-index:99999;top:{popoverPos.top}px;left:{popoverPos.left}px" on:click|stopPropagation on:mouseenter={cancelPopoverClose} on:mouseleave={schedulePopoverClose}>
		{#each [0, 1, 3, 2] as c}
			<button class:active={overlayCorner === c} on:click={() => { overlayCorner = c; cornerPopover = false; }}>
				<svg viewBox="0 0 10 10" width="10" height="10"><path d={cornerPaths[c]} stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
			</button>
		{/each}
	</div>
{/if}

<style>
	.p5-wrapper {
		--radius: 3px;
		--radius-sm: 2px;
		display: flex;
		flex-direction: row;
		align-items: stretch;
		border: 1px solid var(--bg2);
		border-radius: 0.4rem;
		overflow: hidden;
		background: var(--bg);
		box-shadow: 2px 2px 8px rgb(0, 0, 0, 0.5);
	}

	.p5-stage {
		position: relative;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		flex: 1;
		min-width: 0;
	}

	.p5-canvas :global(canvas) {
		display: block;
		max-width: 100%;
		height: auto;
	}

	.p5-overlay {
		position: absolute;
		z-index: 10;
		display: flex;
		flex-direction: column;
		background: rgba(20, 20, 20, 0.92);
		border-radius: 4px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.75rem;
		color: var(--fg2);
		transition: top 0.15s, right 0.15s, bottom 0.15s, left 0.15s;
	}

	.p5-overlay.tl { top: 0.4rem; left: 0.4rem; }
	.p5-overlay.tr { top: 0.4rem; right: 0.4rem; }
	.p5-overlay.br { bottom: 0.4rem; right: 0.4rem; }
	.p5-overlay.bl { bottom: 0.4rem; left: 0.4rem; }

	.p5-overlay.tl { bottom: auto; right: auto; }
	.p5-overlay.tr { bottom: auto; left: auto; }
	.p5-overlay.br { top: auto; left: auto; }
	.p5-overlay.bl { top: auto; right: auto; }

	.p5-overlay-bar {
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 0.25rem;
		padding: 0.2rem 0.25rem;
	}

	.p5-corner-popover {
		position: fixed;
		z-index: 99999;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		padding: 3px;
		background: rgba(20, 20, 20, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		backdrop-filter: blur(6px);
	}

	.p5-corner-popover button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--fg4);
		font-size: 10px;
		line-height: 1;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.1s, background 0.1s;
	}

	.p5-corner-popover button:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.p5-corner-popover button.active {
		opacity: 1;
		background: rgba(255, 255, 255, 0.18);
	}

	.p5-overlay-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		padding: 0;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--fg4);
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.1s, background 0.1s;
	}

	.p5-overlay-btn:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.1);
	}

	.p5-overlay-content {
		display: flex;
		flex-direction: column;
		padding: 0 0.5rem 0.35rem;
		gap: 0.15rem;
	}

	.p5-overlay-content :global(.p5-readout) {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		white-space: nowrap;
		padding: 0;
		border: none;
		font-size: 1em;
	}

	.p5-panel {
		display: flex;
		flex-direction: column;
		width: 16rem;
		flex-shrink: 0;
		background: var(--bg_s);
		border-left: 1px solid var(--bg2);
		overflow: hidden;
	}

	.p5-panel-header {
		font-size: 0.7em;
		font-weight: bold;
		color: var(--fg4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--bg2);
	}

	.p5-props {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0;
		font-size: 0.9rem;
		color: var(--fg2);
		overflow-y: auto;
		min-height: 0;
	}

	.p5-props :global(.p5-group) {
		display: flex;
		flex-direction: column;
	}

	.p5-props :global(.p5-tabs) {
		display: flex;
		flex-direction: row;
		border-bottom: 1px solid var(--bg2);
		overflow-x: auto;
		overflow-y: hidden;
		background: var(--bg);
	}

	.p5-props :global(.p5-tabs button) {
		flex: 0 0 auto;
		width: auto;
		padding: 0.4rem 0.6rem;
		white-space: nowrap;
		background: var(--bg);
		color: var(--fg4);
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		font-size: 0.9em;
		font-family: inherit;
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s, background 0.1s;
	}

	.p5-props :global(.p5-tabs button:hover) {
		color: var(--fg2);
		background: var(--bg_s);
	}

	.p5-props :global(.p5-tabs button.active) {
		color: var(--orange);
		border-bottom-color: var(--orange);
		background: var(--bg_s);
	}

	.p5-props :global(.p5-control) {
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--bg1);
	}

	.p5-props :global(.p5-control:last-child) {
		border-bottom: none;
	}

	.p5-props :global(.p5-inline) {
		display: flex;
		flex-direction: row;
		gap: 0.25rem;
		padding: 0.3rem 0.5rem;
		border-bottom: 1px solid var(--bg1);
	}

	.p5-props :global(.p5-readout) {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid var(--bg1);
		font-size: 0.85em;
		cursor: default;
		user-select: none;
	}

	.p5-props :global(.p5-readout-label) {
		color: var(--fg4);
	}

	.p5-props :global(.p5-readout-value) {
		font-family: 'Fira Mono', monospace;
		color: var(--fg2);
	}

	.p5-props :global(fieldset) {
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: var(--radius);
		margin: 0.4rem 0.5rem;
		padding: 0;
	}

	.p5-props :global(fieldset legend) {
		float: left;
		width: 100%;
		font-size: 0.75em;
		font-weight: bold;
		color: var(--fg4);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 0.45rem 0.5rem 0.2rem;
		box-sizing: border-box;
		border-bottom: none;
	}

	.p5-props :global(label),
	.p5-props :global(.prop) {
		display: grid;
		grid-template-columns: 5rem 1fr;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.6rem;
		min-height: 1.8em;
		border-bottom: 1px solid var(--bg1);
		cursor: pointer;
		user-select: none;
		white-space: nowrap;
	}

	.p5-props :global(label:last-child),
	.p5-props :global(.prop:last-child) {
		border-bottom: none;
	}

	.p5-props :global(input[type="range"]) {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		min-width: 0;
		height: 1.4em;
		border-radius: var(--radius);
		background: var(--bg_h);
		outline: none;
		cursor: pointer;
	}

	.p5-props :global(input[type="range"]::-webkit-slider-thumb) {
		-webkit-appearance: none;
		appearance: none;
		width: 5px;
		height: 1.1em;
		border-radius: var(--radius-sm);
		background: var(--fg3);
		cursor: pointer;
		border: none;
	}

	.p5-props :global(input[type="range"]::-moz-range-thumb) {
		width: 5px;
		height: 1.1em;
		border-radius: var(--radius-sm);
		background: var(--fg3);
		cursor: pointer;
		border: none;
	}

	.p5-props :global(input[type="color"]) {
		-webkit-appearance: none;
		appearance: none;
		width: 28px;
		height: 20px;
		border: 2px solid var(--bg_h);
		border-radius: 4px;
		background: none;
		cursor: pointer;
		padding: 0;
	}

	.p5-props :global(input[type="color"]::-webkit-color-swatch-wrapper) {
		padding: 0;
	}

	.p5-props :global(input[type="color"]::-webkit-color-swatch) {
		border: none;
		border-radius: var(--radius-sm);
	}

	.p5-props :global(select) {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		padding: 0.3rem 0.5rem;
		background: var(--bg);
		color: var(--fg2);
		border: 1px solid var(--bg3);
		border-radius: var(--radius);
		font-size: 1em;
		font-family: inherit;
		cursor: pointer;
		outline: none;
	}

	.p5-props :global(select:focus) {
		border-color: var(--orange);
	}

	.p5-props :global(.p5-control button) {
		width: 100%;
		padding: 0.35rem 0.5rem;
		background: var(--bg1);
		color: var(--fg2);
		border: 1px solid var(--bg3);
		border-radius: var(--radius);
		font-size: 1em;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.p5-props :global(.p5-control button:hover) {
		background: var(--bg2);
		border-color: var(--fg4);
	}

	.p5-props :global(.p5-control button:active) {
		background: var(--bg3);
	}

	.p5-props :global(.p5-radio) {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0;
		border: 1px solid var(--bg3);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.p5-props :global(.p5-radio label) {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.5rem;
		min-height: auto;
		border-bottom: 1px solid var(--bg1);
		background: var(--bg);
		cursor: pointer;
		white-space: normal;
		transition: background 0.1s;
	}

	.p5-props :global(.p5-radio label:last-child) {
		border-bottom: none;
	}

	.p5-props :global(.p5-radio label:hover) {
		background: var(--bg1);
	}

	.p5-props :global(.p5-radio input[type="radio"]) {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border: 2px solid var(--bg4);
		border-radius: 50%;
		background: var(--bg);
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
		margin: 0;
	}

	.p5-props :global(.p5-radio input[type="radio"]:checked) {
		border-color: var(--orange);
	}

	.p5-props :global(.p5-radio input[type="radio"]:checked::after) {
		content: '';
		position: absolute;
		left: 2px;
		top: 2px;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--orange);
	}

	.p5-props :global(input[type="checkbox"]) {
		-webkit-appearance: none;
		appearance: none;
		width: 28px;
		height: 16px;
		border-radius: 8px;
		background: var(--bg3);
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
		transition: background 0.15s;
		border: none;
		outline: none;
	}

	.p5-props :global(input[type="checkbox"]::after) {
		content: '';
		position: absolute;
		left: 2px;
		top: 2px;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--fg4);
		transition: transform 0.15s, background 0.15s;
	}

	.p5-props :global(input[type="checkbox"]:checked) {
		background: var(--orange);
	}

	.p5-props :global(input[type="checkbox"]:checked::after) {
		background: var(--bg);
		transform: translateX(12px);
	}

	@media only screen and (max-width: 1024px) {
		.p5-wrapper {
			flex-direction: column;
		}

		.p5-panel {
			width: auto;
			border-left: none;
			border-top: 1px solid var(--bg2);
		}

		.p5-props {
			flex-grow: 1;
			font-size: 0.95em;
		}

		.p5-props :global(.p5-group) {
			flex: 1;
			min-width: 10rem;
		}

		.p5-props :global(.p5-group + .p5-group) {
			border-left: 1px solid var(--bg2);
		}

		.p5-props :global(label),
		.p5-props :global(.prop) {
			grid-template-columns: 5.5rem 1fr;
			padding: 0.45rem 0.75rem;
			min-height: 2.2em;
		}

		.p5-props :global(input[type="range"]) {
			height: 1.6em;
		}

		.p5-props :global(input[type="range"]::-webkit-slider-thumb) {
			width: 7px;
			height: 1.3em;
		}

		.p5-props :global(input[type="range"]::-moz-range-thumb) {
			width: 7px;
			height: 1.3em;
		}

		.p5-props :global(input[type="checkbox"]) {
			width: 34px;
			height: 20px;
			border-radius: 10px;
		}

		.p5-props :global(input[type="checkbox"]::after) {
			width: 16px;
			height: 16px;
		}

		.p5-props :global(input[type="checkbox"]:checked::after) {
			transform: translateX(14px);
		}

		.p5-props :global(.p5-control button) {
			padding: 0.5rem 0.75rem;
		}

		.p5-props :global(.p5-radio label) {
			padding: 0.45rem 0.6rem;
		}

		.p5-props :global(.p5-tabs) {
			width: 100%;
		}

		.p5-props :global(fieldset) {
			margin: 0;
			width: 100%;
			border-radius: 0;
			border-left: none;
			border-right: none;
			box-sizing: border-box;
		}

		.p5-props :global(fieldset:first-of-type) {
			border-top: none;
		}

		.p5-props :global(fieldset:last-of-type) {
			border-bottom: none;
		}
	}
</style>
