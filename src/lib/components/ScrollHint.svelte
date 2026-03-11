<script>
	/** @type {boolean} */
	export let visible = false;
</script>

<div class="canvas-wrap">
	<slot />
	{#if visible}
		<div class="scroll-hint">
			<kbd>Ctrl</kbd> + scroll to zoom
		</div>
	{/if}
</div>

<style>
	.canvas-wrap {
		position: relative;
	}

	.scroll-hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(0, 0, 0, 0.75);
		color: #ebdbb2;
		font-size: 0.8rem;
		padding: 0.4rem 0.8rem;
		border-radius: 0.4rem;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
		animation: hint-fade 1.5s ease-out forwards;
		white-space: nowrap;
	}

	.scroll-hint kbd {
		background: rgba(255, 255, 255, 0.15);
		padding: 0.1rem 0.35rem;
		border-radius: 0.2rem;
		font-family: inherit;
		font-size: 0.85em;
	}

	@keyframes hint-fade {
		0%, 60% { opacity: 1; }
		100% { opacity: 0; }
	}
</style>
