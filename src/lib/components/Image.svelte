<script>
	/** @type string */
	export let src;
	/** @type string */
	export let url = "";
	/** @type string */
	export let alt = "";
</script>

<a class="image" href={url || src} target="_blank">
	<img {src} {alt} loading="lazy" {...$$restProps} >
</a>
