<script>
	/** @type {string} */
	export let href;
	/** @type {string} */
	export let img;
	/** @type {string} */
	export let caption = "";
	/** @type {string} */
	let clazz = "";
	export {clazz as class};

	$: is_external = href.charAt(0) !== '/' && href.charAt(0) !== '#';
</script>

{#if is_external}
	<a {href} target="_blank" rel="noopener noreferrer" {...$$restProps}>
		<img src={img} alt={caption || href} class={clazz}/>
		{#if caption}
			<span>{caption}</span>
		{/if}
		<img class="external" src="/external.png" alt="External link" />
	</a>
{:else}
	<a {href} on:click class={clazz} {...$$restProps}>
		<img src={img} alt={caption || href} />
		{#if caption}
			<span>{caption}</span>
		{/if}
	</a>
{/if}
