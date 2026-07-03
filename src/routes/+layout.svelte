<script>

  import 'normalize.css';
  import './styles.scss';
  
  import Link from '$lib/components/Link.svelte';
  import Links from '$lib/components/Links.svelte';
  import PostIcon from '$lib/components/PostIcon.svelte';

  import { projectSections } from '$lib/data/projects';
  import { showcases } from '$lib/data/showcases';

  import { page } from '$app/stores';
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

  let openPanel = (/** @type {string} */ panel) => {
    show.posts = panel === 'posts';
    show.pages = panel === 'pages';
    show.showcases = panel === 'showcases';
  };

  let togglePanel = (/** @type {string} */ panel) => {
    let wasOpen = show[panel];
    closeAllPanels();
    if (!wasOpen) openPanel(panel);
  };

  let closeAllPanels = () => {
    show.posts = false;
    show.pages = false;
    show.showcases = false;
  };

  $: panelOpen = show.posts || show.pages || show.showcases || show.links;

  /** @type {import('./$types').LayoutData} */
  export let data;
</script>

<div class="app">
  <!-- MOBILE -->
  <div id="mobile-bar" class:sticky={panelOpen}>
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
      href="/posts"
      img="/images/posts.png"
      class={show.posts ? 'active' : ''}
      on:click={(e) => {
        e.preventDefault();
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
      href="/projects"
      img="/images/anvil.png"
      class={show.pages ? 'active' : ''}
      on:click={(e) => {
        e.preventDefault();
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
      href="/showcases"
      img="/images/lute.png"
      class={show.showcases ? 'active' : ''}
      on:click={(e) => {
        e.preventDefault();
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
            {#if post.icon}<PostIcon src={post.icon} alt={post.title} size={48} />{/if}
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
        {#each projectSections as section}
          <h3 class="section-title">{section.title}</h3>
          <p class="section-desc">{section.desc}</p>
          <div class="page-cards">
            {#each section.cards as card}
              <a class="page-card" href={card.url} target="_blank" on:click={() => { show.pages = false; show.content = true; scroll_to_top(); }}>
                <div class="page-card-icon"><img style={card.iconStyle ?? ''} src={card.img} alt={card.name} /></div>
                <div class="page-card-info">
                  <span class="name">{card.name}</span>
                  <span class="desc">{card.desc}</span>
                </div>
              </a>
            {/each}
          </div>
        {/each}
      </div>
    </nav>
  {/if}

  {#if show.showcases}
    <nav id="mobile-showcases" class="groups">
      <div class="group">
        <h2>Showcases</h2>
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
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="sidebar" on:mouseleave={closeAllPanels}>
    <nav>
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <header on:mouseenter={closeAllPanels}>Medieval Software</header>

      <div class="group">
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <a href="/" class:active={route === '/'} on:mouseenter={closeAllPanels}>
          <img src="/images/home.png" alt="Home" />
          <span>Home</span>
        </a>
        <a
          href="/posts"
          class:active={show.posts}
          on:mouseenter={() => openPanel('posts')}
          on:click|preventDefault={() => togglePanel('posts')}
        >
          <img src="/images/posts.png" alt="Posts" />
          <span>Posts</span>
          <span class="panel-arrow">›</span>
        </a>
        <a
          href="/projects"
          class:active={show.pages}
          on:mouseenter={() => openPanel('pages')}
          on:click|preventDefault={() => togglePanel('pages')}
        >
          <img src="/images/anvil.png" alt="Projects" />
          <span>Projects</span>
          <span class="panel-arrow">›</span>
        </a>
        <a
          href="/showcases"
          class:active={show.showcases}
          on:mouseenter={() => openPanel('showcases')}
          on:click|preventDefault={() => togglePanel('showcases')}
        >
          <img src="/images/lute.png" alt="Showcases" />
          <span>Showcases</span>
          <span class="panel-arrow">›</span>
        </a>
      </div>

      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="nav-links" on:mouseenter={closeAllPanels}>
        <Links {links} />
      </div>

      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <footer on:mouseenter={closeAllPanels}>
        <img src="/images/logo.png" alt="Medieval Software" />
      </footer>
    </nav>

    {#if show.posts}
      <nav class="groups posts" >
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
              {#if post.icon}<PostIcon src={post.icon} alt={post.title} size={32} />{/if}
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
      <nav class="groups pages" >
        <div class="group">
          <h2>Projects</h2>
          {#each projectSections as section}
            <h3 class="section-title">{section.title}</h3>
            <p class="section-desc">{section.desc}</p>
            <div class="page-cards">
              {#each section.cards as card}
                <a class="page-card" href={card.url} target="_blank">
                  <div class="page-card-icon"><img style={card.iconStyle ?? ''} src={card.img} alt={card.name} /></div>
                  <div class="page-card-info">
                    <span class="name">{card.name}</span>
                    <span class="desc">{card.desc}</span>
                  </div>
                </a>
              {/each}
            </div>
          {/each}
        </div>
      </nav>
    {/if}

    {#if show.showcases}
      <nav class="groups pages" >
        <div class="group">
          <h2>Showcases</h2>
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
