<script>
	import PostIcon from '$lib/components/PostIcon.svelte';
	import dateFormat from 'dateformat';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<svelte:head>
	<title>Medieval Software - Posts</title>
	<meta property="og:title" content="Posts - Medieval Software" />
	<meta
		name="description"
		content="Posts from Medieval Software covering software, reverse engineering, voice acting, music, and creative projects."
	/>
	<meta
		property="og:description"
		content="Posts from Medieval Software covering software, reverse engineering, voice acting, music, and creative projects."
	/>
	<meta property="og:url" content="https://medieval.software/posts" />
</svelte:head>

<article id="posts-index">
	<h1>Posts</h1>
	<div class="post-list">
		{#each data.posts as post}
			<a class="post-item" href="/{post.slug}">
				{#if post.icon}<PostIcon src={post.icon} alt={post.title} size={48} />{/if}
				<div class="col">
					<span class="title">{post.title}</span>
					{#if post.subtitle}<span class="subtitle">{post.subtitle}</span>{/if}
					<span class="date">{dateFormat(new Date(post.date), 'dS mmmm yyyy')}</span>
				</div>
			</a>
		{/each}
	</div>
</article>

<style>
	#posts-index h1 {
		margin: 0 0 0.5em 0;
	}

	.post-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.post-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem;
		border-radius: var(--radius);
		background: var(--bg1);
		color: var(--fg);
		text-decoration: none;
	}

	.post-item:hover {
		background: var(--bg2);
		text-decoration: none;
	}

	.post-item .col {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.post-item .title {
		font-weight: bold;
		font-size: 0.9em;
		color: var(--fg);
	}

	.post-item .subtitle {
		font-weight: 500;
		font-size: 0.8em;
		color: var(--fg2);
	}

	.post-item .date {
		font-size: 0.75em;
		color: var(--fg4);
	}
</style>
