<script>
	import { projectSections } from '$lib/data/projects';
</script>

<svelte:head>
	<title>Medieval Software - Projects</title>
	<meta property="og:title" content="Projects - Medieval Software" />
	<meta
		name="description"
		content="Projects from Medieval Software and friends — software crafted in-house, from allies, and discoveries from afar."
	/>
	<meta
		property="og:description"
		content="Projects from Medieval Software and friends — software crafted in-house, from allies, and discoveries from afar."
	/>
	<meta property="og:url" content="https://medieval.software/projects" />
</svelte:head>

<article id="projects-index">
	<h1>Projects</h1>
	{#each projectSections as section}
		<h3 class="section-title">{section.title}</h3>
		<p class="section-desc">{section.desc}</p>
		<div class="page-cards">
			{#each section.cards as card}
				<a class="page-card" href={card.url} target="_blank" rel="noopener noreferrer">
					<div class="page-card-icon"><img style={card.iconStyle ?? ''} src={card.img} alt={card.name} /></div>
					<div class="page-card-info">
						<span class="name">{card.name}</span>
						<span class="desc">{card.desc}</span>
					</div>
				</a>
			{/each}
		</div>
	{/each}
</article>

<style>
	#projects-index h1 {
		margin: 0 0 0.3em 0;
	}

	#projects-index .page-cards {
		margin-bottom: 1.2rem;
	}
</style>
