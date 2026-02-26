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
		pages: false,
		showcases: false,
		content: true,
		projects: false,
		links: false
	};

	/** @type import("$lib/types").Link[] */
	let links = [
		{ text: 'Discord', url: 'https://discord.gg/TV8sgft47d', img: '/images/discord.png' },
		{ text: 'GitHub', url: 'https://github.com/medievalsoftware', img: '/images/github.png' },
		{ text: 'Codeberg', url: 'https://codeberg.org/medievalsoftware', img: '/images/codeberg.svg' }
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
				show.pages = false;
				show.showcases = false;
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
					show.pages = false;
					show.showcases = false;
					show.projects = false;
					show.links = false;
				}
			}}
		/>
		<Link
			caption="Projects"
			href="#"
			img="/images/anvil.png"
			class={show.pages ? 'active' : ''}
			on:click={() => {
				show.pages = !show.pages;
				show.content = !show.pages;
				if (show.pages) {
					show.posts = false;
					show.showcases = false;
					show.projects = false;
					show.links = false;
				}
			}}
		/>
		<Link
			caption="Showcases"
			href="#"
			img="/images/lute.png"
			class={show.showcases ? 'active' : ''}
			on:click={() => {
				show.showcases = !show.showcases;
				show.content = !show.showcases;
				if (show.showcases) {
					show.posts = false;
					show.pages = false;
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
					show.pages = false;
					show.showcases = false;
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

	{#if show.pages}
		<nav id="mobile-pages" class="groups">
			<div class="group">
				<h2>Projects</h2>

				<h3 class="section-title">Forge</h3>
				<p class="section-desc">Crafted in-house</p>
				<div class="page-cards">
					<a class="page-card" href="#" on:click={() => { show.pages = false; show.content = true; scroll_to_top(); }}>
						<div class="page-card-icon"><img src="/images/x.png" alt="Nothing" /></div>
						<div class="page-card-info">
							<span class="name">Nothing</span>
							<span class="desc">Coming soon</span>
						</div>
					</a>
				</div>

				<hr />

				<h3 class="section-title">Guild</h3>
				<p class="section-desc">From friends and allies</p>
				<div class="page-cards">
					<a class="page-card" href="https://kingscrook.itch.io/kings-crook" on:click={() => { show.pages = false; show.content = true; scroll_to_top(); }}>
						<div class="page-card-icon"><img style="border-radius: var(--radius-xs)" src="/images/kings_crook.png" alt="King's Crook" /></div>
						<div class="page-card-info">
							<span class="name">King's Crook</span>
							<span class="desc">Open-world RPG built from scratch in pure C</span>
						</div>
					</a>
				</div>

				<hr />

				<h3 class="section-title">Frontier</h3>
				<p class="section-desc">Discoveries from afar</p>
				<div class="page-cards">
					<a class="page-card" href="https://flycast.medieval.software/" on:click={() => { show.pages = false; show.content = true; scroll_to_top(); }}>
						<div class="page-card-icon"><img src="/images/flycast.png" alt="Flycast WASM" /></div>
						<div class="page-card-info">
							<span class="name">Flycast WASM</span>
							<span class="desc">Sega Dreamcast emulation in the browser via WebAssembly</span>
						</div>
					</a>
				</div>
			</div>
		</nav>
	{/if}

	{#if show.showcases}
		<nav id="mobile-showcases" class="groups">
			<div class="group">
				<h2>Showcases</h2>
				<div class="page-cards">
					<a class="page-card" href="/voice-reels" on:click={() => { show.showcases = false; show.content = true; scroll_to_top(); }}>
						<div class="page-card-icon"><img src="/images/theatre_mask.png" alt="Voice Reels" /></div>
						<div class="page-card-info">
							<span class="name">Voice Reels</span>
							<span class="desc">Exploring voice acting with character snippets and scenes</span>
						</div>
					</a>
				</div>
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
						if (show.posts) { show.pages = false; show.showcases = false; }
					}}
				>
					<img src="/images/posts.png" alt="Posts" />
					<span>Posts</span>
				</a>
				<a
					href={'#pages'}
					class:active={show.pages}
					on:click={() => {
						show.pages = !show.pages;
						if (show.pages) { show.posts = false; show.showcases = false; }
					}}
				>
					<img src="/images/anvil.png" alt="Projects" />
					<span>Projects</span>
				</a>
				<a
					href={'#showcases'}
					class:active={show.showcases}
					on:click={() => {
						show.showcases = !show.showcases;
						if (show.showcases) { show.posts = false; show.pages = false; }
					}}
				>
					<img src="/images/lute.png" alt="Showcases" />
					<span>Showcases</span>
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

		{#if show.pages}
			<nav class="groups pages" transition:slide={{ axis: 'x' }}>
				<div class="group">
					<h2>Projects</h2>

					<h3 class="section-title">Forge</h3>
					<p class="section-desc">Crafted in-house</p>
					<div class="page-cards">
						<a class="page-card" href="#">
							<div class="page-card-icon"><img src="/images/x.png" alt="Nothing" /></div>
							<div class="page-card-info">
								<span class="name">Nothing</span>
								<span class="desc">Coming soon</span>
							</div>
						</a>
					</div>

					<hr />

					<h3 class="section-title">Guild</h3>
					<p class="section-desc">From friends and allies</p>
					<div class="page-cards">
						<a class="page-card" href="https://kingscrook.itch.io/kings-crook">
							<div class="page-card-icon"><img style="border-radius: var(--radius-xs)" src="/images/kings_crook.png" alt="King's Crook" /></div>
							<div class="page-card-info">
								<span class="name">King's Crook</span>
								<span class="desc">Open-world RPG built from scratch in pure C</span>
							</div>
						</a>
					</div>

					<hr />

					<h3 class="section-title">Frontier</h3>
					<p class="section-desc">Discoveries from afar</p>
					<div class="page-cards">
						<a class="page-card" href="https://flycast.medieval.software/">
							<div class="page-card-icon"><img src="/images/flycast.png" alt="Flycast WASM" /></div>
							<div class="page-card-info">
								<span class="name">Flycast WASM</span>
								<span class="desc">Sega Dreamcast emulation in the browser via WebAssembly</span>
							</div>
						</a>
					</div>
				</div>
			</nav>
		{/if}

		{#if show.showcases}
			<nav class="groups pages" transition:slide={{ axis: 'x' }}>
				<div class="group">
					<h2>Showcases</h2>
					<div class="page-cards">
						<a class="page-card" href="/voice-reels">
							<div class="page-card-icon"><img src="/images/theatre_mask.png" alt="Voice Reels" /></div>
							<div class="page-card-info">
								<span class="name">Voice Reels</span>
								<span class="desc">Exploring voice acting with character snippets and scenes</span>
							</div>
						</a>
					</div>
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
				show.pages = false;
				show.showcases = false;
				show.content = true;
			}}
		>
			<slot />
		</main>
	{/if}
</div>
