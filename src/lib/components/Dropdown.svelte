<script>
	/** @type {{ value: string, label: string }[]} */
	export let options = [];
	export let value;

	let open = false;

	function select(v) {
		value = v;
		open = false;
	}
</script>

<svelte:window on:click={() => open = false} />

<div class="dropdown-wrap">
	<button class="dropdown-btn" on:click|stopPropagation={() => open = !open}>
		<span>{options.find(o => o.value === value)?.label || value}</span>
		<svg viewBox="0 0 10 10" width="8" height="8"><path d="M2 4L5 7L8 4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
	</button>
	{#if open}
		<div class="dropdown-menu" on:click|stopPropagation>
			{#each options as opt}
				<button class:active={value === opt.value} on:click={() => select(opt.value)}>
					{opt.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown-wrap {
		position: relative;
	}

	.dropdown-btn {
		all: unset;
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding: 2px 6px;
		font-size: 1em;
		color: var(--fg2);
		background: var(--bg1);
		border: 1px solid var(--bg3);
		border-radius: var(--radius, 3px);
		cursor: pointer;
		box-sizing: border-box;
		transition: color 0.1s, background 0.1s;
	}

	.dropdown-btn span {
		flex: 1;
	}

	.dropdown-btn svg {
		flex-shrink: 0;
		opacity: 0.5;
	}

	.dropdown-btn:hover {
		color: var(--fg1);
		background: var(--bg2);
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: 2px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		background: var(--bg_h);
		border: 1px solid var(--bg3);
		border-radius: 4px;
		padding: 2px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.dropdown-menu button {
		all: unset;
		padding: 4px 8px;
		font-size: 0.9em;
		color: var(--fg3);
		cursor: pointer;
		border-radius: 2px;
		transition: background 0.1s, color 0.1s;
	}

	.dropdown-menu button:hover {
		background: var(--bg2);
		color: var(--fg1);
	}

	.dropdown-menu button.active {
		color: var(--orange);
	}
</style>
