<script>
	import { onDestroy } from 'svelte';
	import { computePosition } from '../floating.js';
	import { portal } from '$lib/actions.js';

	/** @type {'top'|'bottom'|'left'|'right'} */
	export let placement = 'bottom';
	/** @type {boolean} */
	export let open = false;

	let triggerEl;
	let floatingEl;
	let actualPlacement = placement;
	let posX = 0;
	let posY = 0;
	let arrowX = 0;
	let arrowY = 0;

	function position() {
		if (!triggerEl || !floatingEl) return;
		let ref = triggerEl.getBoundingClientRect();
		let floating = floatingEl.getBoundingClientRect();
		let pos = computePosition(ref, floating, { placement });
		posX = pos.x;
		posY = pos.y;
		actualPlacement = pos.placement;
		arrowX = pos.arrowX;
		arrowY = pos.arrowY;
	}

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function onClickOutside(e) {
		if (!open) return;
		if (triggerEl?.contains(e.target)) return;
		if (floatingEl?.contains(e.target)) return;
		close();
	}

	function onKeydown(e) {
		if (open && e.key === 'Escape') {
			e.stopPropagation();
			close();
		}
	}

	$: if (open && floatingEl) {
		requestAnimationFrame(position);
	}

	onDestroy(() => {
		open = false;
	});
</script>

<svelte:window on:mousedown={onClickOutside} on:keydown={onKeydown} />

<span class="popover-trigger" bind:this={triggerEl} on:click={toggle}>
	<slot name="trigger" />
</span>

{#if open}
	<div
		class="popover"
		bind:this={floatingEl}
		use:portal
		style="left:{posX}px;top:{posY}px"
	>
		<div
			class="floating-arrow"
			data-side={actualPlacement}
			style={actualPlacement === 'top' || actualPlacement === 'bottom'
				? `left:${arrowX - 5}px`
				: `top:${arrowY - 5}px`}
		></div>
		<slot />
	</div>
{/if}

<style>
	.popover-trigger {
		display: inline-flex;
	}

	.popover {
		position: fixed;
		z-index: var(--floating-z);
		background: var(--floating-bg);
		color: var(--floating-text);
		border: 1px solid var(--floating-border);
		border-radius: var(--floating-radius);
		font-size: 0.85rem;
		line-height: 1.5;
		padding: 0.5rem 0.75rem;
		max-width: 320px;
		width: max-content;
		animation: floating-in 0.12s ease-out;
	}
</style>
