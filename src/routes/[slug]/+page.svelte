<script>
	/** @type {import('./$types').PageData }*/
	export let data;

	import Image from '$lib/components/Image.svelte';

	export { Image };
</script>

<svelte:head>
	{#if data.meta.subtitle}
		<title>Medieval Software - {data.meta.title} - {data.meta.subtitle}</title>
		<meta property="og:title" content="{data.meta.title} - {data.meta.subtitle}"/>
	{:else}
		<title>Medieval Software - {data.meta.title}</title>
		<meta property="og:title" content="{data.meta.title}"/>
	{/if}
	{#if data.meta.description}
		<meta name="description" content="{data.meta.description}"/>
		<meta property="og:description" content="{data.meta.description}"/>
	{/if}
	{#if data.meta.image}
		<meta property="og:image" content="https://medieval.software{data.meta.image}"/>
	{/if}
</svelte:head>

<article>
	<span class="post-title">
		{data.meta.title}
		{#if data.meta.subtitle}
			<span class="post-subtitle">{data.meta.subtitle}</span>
		{/if}
	</span>
	<span class="post-date">{data.meta.date}</span>
	<hr />
	<svelte:component this={data.content} />
</article>
