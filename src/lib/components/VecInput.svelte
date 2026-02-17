<script>
	import NumberInput from './NumberInput.svelte';

	/** @type {number} */
	export let x = 0;
	/** @type {number} */
	export let y = 0;
	/** @type {number} */
	export let z = 0;
	/** @type {2 | 3} */
	export let dimensions = 2;
	/** @type {number} */
	export let min = -Infinity;
	/** @type {number} */
	export let max = Infinity;
	/** @type {number} */
	export let precision = 2;
	/** @type {number} */
	export let sensitivity = 0.1;
	/** @type {'linear' | 'exponential' | 'logarithmic'} */
	export let scale = 'linear';
</script>

<div class="vec-input">
	<NumberInput bind:value={x} label="X" color="red" {min} {max} {precision} {sensitivity} {scale} />
	<NumberInput bind:value={y} label="Y" color="green" {min} {max} {precision} {sensitivity} {scale} />
	{#if dimensions === 3}
		<NumberInput bind:value={z} label="Z" color="blue" {min} {max} {precision} {sensitivity} {scale} />
	{/if}
</div>

<style>
	.vec-input {
		display: flex;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
</style>
