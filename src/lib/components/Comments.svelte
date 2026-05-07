<script>
	import { onMount } from 'svelte';

	let container;

	onMount(() => {
		const script = document.createElement('script');
		script.src = 'https://giscus.app/client.js';
		script.async = true;
		script.crossOrigin = 'anonymous';
		script.setAttribute('data-repo', 'medievalsoftware/medieval.software');
		script.setAttribute('data-repo-id', 'R_kgDOMe7DWQ');
		script.setAttribute('data-category', 'Comments');
		script.setAttribute('data-category-id', 'DIC_kwDOMe7DWc4C8hSl');
		script.setAttribute('data-mapping', 'pathname');
		script.setAttribute('data-strict', '0');
		script.setAttribute('data-reactions-enabled', '1');
		script.setAttribute('data-emit-metadata', '0');
		script.setAttribute('data-input-position', 'bottom');
		script.setAttribute('data-theme', 'gruvbox_dark');
		script.setAttribute('data-lang', 'en');
		script.setAttribute('data-loading', 'lazy');
		container.appendChild(script);
	});
</script>

<section class="comments" bind:this={container} aria-label="Comments"></section>

<style>
	.comments {
		margin-top: 2rem;
	}
</style>
