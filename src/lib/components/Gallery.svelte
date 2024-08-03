<script>
	import Image from './Image.svelte';

	/**
	 * @type {any}
	 */
	export let images;
</script>

<div class="gallery">
	{#if images}
		{#each images as image}
			<Image loading="lazy" src={image.src} alt={image.alt} class={image.class || ''} />
		{/each}
	{/if}
</div>

<style>
	div {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1em;
	}
</style>
