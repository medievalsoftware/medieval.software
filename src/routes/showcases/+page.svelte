<script>
	import { showcases } from '$lib/data/showcases';
</script>

<svelte:head>
	<title>Medieval Software - Showcases</title>
	<!-- Thin placeholder content for now; keep out of the index until a showcase goes live. -->
	<meta name="robots" content="noindex" />
	<meta property="og:title" content="Showcases - Medieval Software" />
	<meta property="og:url" content="https://medieval.software/showcases" />
</svelte:head>

<article id="showcases-index">
	<h1>Showcases</h1>
	<div class="page-cards">
		{#each showcases as showcase}
			<a class="page-card" class:coming-soon={showcase.comingSoon} href={showcase.url}>
				{#if showcase.ribbon}<div class="ribbon">{showcase.ribbon}</div>{/if}
				<div class="page-card-icon"><img src={showcase.img} alt={showcase.name} /></div>
				<div class="page-card-info">
					<span class="name">{showcase.name}</span>
					<span class="desc">{showcase.desc}</span>
				</div>
			</a>
		{/each}
	</div>
</article>

<style>
	#showcases-index h1 {
		margin: 0 0 0.6em 0;
	}
</style>
