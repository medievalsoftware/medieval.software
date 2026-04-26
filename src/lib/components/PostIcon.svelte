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
	style="--post-icon-size: {size}px;"
	{alt}
	{...$$restProps}
/>

<style>
	.post-icon {
		display: block;
		width: var(--post-icon-size);
		height: var(--post-icon-size);
		min-width: var(--post-icon-size);
		min-height: var(--post-icon-size);
		max-width: var(--post-icon-size);
		max-height: var(--post-icon-size);
		aspect-ratio: 1 / 1;
		object-fit: cover;
		flex-shrink: 0;
	}
</style>
