<script>
	/** @type {string} */
	export let name;
	/** @type {any} */
	export let value = undefined;
	/** @type {any} */
	let defaultValue = undefined;
	export { defaultValue as default };
	/** @type {(() => void) | undefined} */
	export let reset = undefined;

	$: dirty = value !== undefined && defaultValue !== undefined
		&& JSON.stringify(value) !== JSON.stringify(defaultValue);

	function doReset() {
		if (reset) {
			reset();
		} else {
			value = typeof defaultValue === 'object' ? JSON.parse(JSON.stringify(defaultValue)) : defaultValue;
		}
	}
</script>

<div class="prop" class:dirty>
	<span class="prop-name">
		{name}
		{#if dirty}
			<button class="prop-reset" on:click|preventDefault|stopPropagation={doReset} title="Reset to default">
				<svg viewBox="0 0 10 10" width="9" height="9">
					<path d="M2 3.5 A3.2 3.2 0 1 1 3 8" stroke="currentColor" stroke-width="1.4" fill="none"/>
					<path d="M0.5 2 L2 4 L3.8 2.2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
				</svg>
			</button>
		{/if}
	</span>
	<slot />
</div>

<style>
	.prop-name {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.prop-reset {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		border-radius: var(--radius);
		color: var(--fg4);
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.1s, color 0.1s, background 0.1s;
	}

	.prop-reset:hover {
		opacity: 1;
		color: var(--orange);
		background: rgba(255, 255, 255, 0.06);
	}
</style>
