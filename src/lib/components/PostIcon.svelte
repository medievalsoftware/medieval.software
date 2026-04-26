<script>
	import { manifest } from 'virtual:post-icon-manifest';

	/** @type {string} */
	export let src;
	/** @type {string} */
	export let alt = '';
	/** @type {number} */
	export let size = 32;

	const variantSrc = (/** @type {string} */ url, /** @type {number} */ s) => {
		const dot = url.lastIndexOf('.');
		if (dot < 0) return url;
		return url.slice(0, dot) + `-${s}px` + url.slice(dot);
	};

	$: sizes = manifest[src] ?? [];
	$: srcset = sizes.map((s) => `${variantSrc(src, s)} ${s}w`).join(', ');
	$: displaySrc = sizes.length ? variantSrc(src, sizes[0]) : src;
</script>

<img
	class="post-icon"
	src={displaySrc}
	{srcset}
	sizes="{size}px"
	width={size}
	height={size}
	{alt}
	{...$$restProps}
/>

<style>
	.post-icon {
		display: block;
	}
</style>
