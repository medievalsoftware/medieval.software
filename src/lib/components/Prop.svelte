<script>
	import { onDestroy } from 'svelte';
	import { portal, clampToViewport } from '$lib/actions.js';

	/** @type {string} */
	export let name;
	/** @type {any} */
	export let value = undefined;
	/** @type {any} */
	let defaultValue = undefined;
	export { defaultValue as default };
	/** @type {(() => void) | undefined} */
	export let reset = undefined;
	/** @type {string} */
	export let tip = '';

	let tipVisible = false;
	let tipTimer;
	let tipPos = { top: 0, left: 0 };

	function updateTipPos(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		tipPos = { top: rect.bottom + 4, left: rect.left };
	}

	function showTip(e) {
		clearTimeout(tipTimer);
		updateTipPos(e);
		tipTimer = setTimeout(() => { tipVisible = true; }, 400);
	}

	function hideTip() {
		clearTimeout(tipTimer);
		tipVisible = false;
	}

	function clickTip(e) {
		clearTimeout(tipTimer);
		updateTipPos(e);
		tipVisible = true;
	}

	onDestroy(() => clearTimeout(tipTimer));

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
	<span
		class="prop-name"
		class:has-tip={tip}
		on:mouseenter={tip ? showTip : undefined}
		on:mouseleave={tip ? hideTip : undefined}
		on:click={tip ? clickTip : undefined}
	>
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

{#if tipVisible && tip}
	<span use:portal use:clampToViewport class="prop-tip" style="top:{tipPos.top}px;left:{tipPos.left}px">{tip}</span>
{/if}

<style>
	.prop-name {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.prop-name.has-tip {
		cursor: help;
	}

	:global(.prop-tip) {
		position: fixed;
		background: var(--bg1);
		color: var(--fg2);
		font-size: 0.75rem;
		line-height: 1.4;
		padding: 0.3rem 0.5rem;
		border-radius: var(--radius);
		white-space: normal;
		width: max-content;
		max-width: 200px;
		z-index: 99999;
		pointer-events: none;
		animation: prop-tip-in 0.12s ease-out;
	}

	:global(.prop-tip::before) {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 10px;
		border: 4px solid transparent;
		border-bottom-color: var(--bg1);
	}

	@keyframes -global-prop-tip-in {
		from { opacity: 0; transform: translateY(-2px); }
		to { opacity: 1; transform: translateY(0); }
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
