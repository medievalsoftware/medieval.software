<script>
	import 'normalize.css';
	import './styles.scss';

	import Link from '$lib/components/Link.svelte';
	import Links from '$lib/components/Links.svelte';

	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';
	import dateFormat from 'dateformat';

	$: route = $page.url.pathname;
	$: show_posts = route === '#posts';

	let show = {
		posts: false,
		content: true,
		projects: false,
		links: false
	};

	/** @type import("$lib/types").Link[] */
	let links = [
		{ text: 'GitHub', url: 'https://github.com/medievalsoftware', img: '/images/github.png' },
		{ text: 'Discord', url: 'https://discord.gg/TV8sgft47d', img: '/images/discord.png' }
	];

	/** @type import("$lib/types").Link[] */
	/** let projects = [{ text: 'Rune Synergy', url: '/rune-synergy', img: '/images/rune-synergy.png' }]; */

	let scroll_to_top = () => {
		let content = document.querySelector('main');
		if (content) {
			content.scrollTo(0, 0);
		}
	};

	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<div class="app">
	<!-- MOBILE -->
	<div id="mobile-bar">
		<img class="logo" src="/images/logo-mobile.png" alt="Medieval Software Logo" />
		<Link
			caption="Home"
			href="/"
			img="/images/home.png"
			class={route === '/' ? 'active' : ''}
			on:click={() => {
				show.content = true;
				show.posts = false;
				show.projects = false;
				show.links = false;
			}}
		/>
		<Link
			caption="Posts"
			href="#"
			img="/images/posts.png"
			class={show.posts ? 'active' : ''}
			on:click={() => {
				show.posts = !show.posts;
				show.content = !show.posts;
				if (show.posts) {
					show.projects = false;
					show.links = false;
				}
			}}
		/>
		<!-- <Link
			caption="Projects"
			href="#"
			img="/images/rune-synergy.png"
			class={show.projects ? 'active' : ''}
			on:click={() => {
				show.projects = !show.projects;
				show.content = !show.projects;
				if (show.projects) {
					show.posts = false;
					show.links = false;
				}
			}}
		/> -->
		<Link
			caption="Links"
			href="#"
			img="external.png"
			class={show.links ? 'active' : ''}
			on:click={() => {
				show.links = !show.links;
				show.content = !show.links;
				if (show.links) {
					show.posts = false;
					show.projects = false;
				}
			}}
		/>
	</div>

	{#if show.posts}
		<nav id="mobile-posts" class="groups">
			<div class="group">
				<h2>Posts</h2>
				{#each data.posts as post}
					<a
						href="/{post.slug}"
						class:active={route === `/${post.slug}`}
						on:click={() => {
							show.posts = false;
							show.content = true;
							scroll_to_top();
						}}
					>
						{#if post.icon}<img class="post-icon" src={post.icon} alt={post.title} />{/if}
						<div class="col">
							<span class="title">
								{post.title}
							</span>
							{#if post.subtitle}<span class="subtitle">{post.subtitle}</span>{/if}
							<span class="date">{dateFormat(new Date(post.date), 'dS mmmm yyyy')}</span>
						</div>
					</a>
				{/each}
			</div>
		</nav>
	{/if}

	<!-- {#if show.projects}
		<nav id="mobile-links" class="groups">
			<div class="group">
				<Links
					caption="Projects"
					links={projects}
					on:click={() => {
						show.projects = false;
						show.content = true;
					}}
				/>
			</div>
		</nav>
	{/if} -->

	{#if show.links}
		<nav id="mobile-links" class="groups">
			<Links {links} />
		</nav>
	{/if}
	<!-- !MOBILE -->

	<!-- DESKTOP -->
	<div class="sidebar">
		<nav>
			<header>Medieval Software</header>

			<div class="group">
				<a href="/" class:active={route === '/'}>
					<img src="/images/home.png" alt="Home" />
					<span>Home</span>
				</a>
				<a
					href={'#posts'}
					class:active={show.posts}
					on:click={() => {
						show.posts = !show.posts;
					}}
				>
					<img src="/images/posts.png" alt="Posts" />
					<span>Posts</span>
				</a>
			</div>

			<!-- <div class="group">
				<Links
					caption="Projects"
					links={projects}
					on:click={() => {
						scroll_to_top();
					}}
				/>
			</div> -->

			<Links {links} />

			<footer>
				<img src="/images/logo.png" alt="Medieval Software" />
			</footer>
		</nav>

		{#if show.posts}
			<nav class="groups posts" transition:slide={{ axis: 'x' }}>
				<div class="group">
					<h2>Posts</h2>
					{#each data.posts as post}
						<a
							href="/{post.slug}"
							class:active={route === `/${post.slug}`}
							on:click={() => {
								scroll_to_top();
							}}
						>
							{#if post.icon}<img class="post-icon" src={post.icon} alt={post.title} />{/if}
							<div class="col">
								<span class="title">
									{post.title}
								</span>
								{#if post.subtitle}<span class="subtitle">{post.subtitle}</span>{/if}
								<span class="date">{dateFormat(new Date(post.date), 'dS mmmm yyyy')}</span>
							</div>
						</a>
					{/each}
				</div>
			</nav>
		{/if}
	</div>
	<!-- !DESKTOP -->

	{#if show.content}
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<main
			on:click={() => {
				show.posts = false;
				show.content = true;
			}}
		>
			<slot />
		</main>
	{/if}
</div>
