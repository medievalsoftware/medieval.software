---
title: Fall Cleaning
date: 3 October 2023
publish: true
icon: /category/cleaning.png
---
<script>
import Image from '$lib/components/Image.svelte';
</script>
I got tired of WordPress and decided to rollout a self hosted site instead. I'm a fan of <a href="https://www.youtube.com/@Fireship">Fireship</a>'s work on introducing different technologies in 100 seconds. I watched his video on <a href="https://kit.svelte.dev">SvelteKit</a> and decided to give it a go.

<div class="row center">
<iframe style="width:30em;height:17em" src="https://www.youtube.com/embed/H1eEFfAkIik?si=tocY_Ct84juj3V4C" title="YouTube video player" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

Typically you would be using <a href="https://nodejs.org/en">Node</a> or something to run Svelte, but through Fireship I also learned about <a href="https://bun.sh">Bun</a>- currently the "worlds fastest JavaScript runtime."

<div class="row center">
<iframe style="width:30em;height:17em" src="https://www.youtube.com/embed/dWqNgzZwVJQ?si=6Dkqnqzgoarai0Zk" title="YouTube video player" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

I'm no graphic designer so I knew I'd need some sort of guideline to help me keep a theme. I ended up just using my favorite theme for text editors: <a href="https://github.com/morhetz/gruvbox">Gruvbox</a>. Here's what the palette looks like:

<div class="row">
<Image src="/posts/fall-cleaning/gruvbox.png"/>
</div>

I'd like to also incorporate this color scheme in my diagrams to sort of tie
it all together. If you've read my previous devblogs you'll see some pretty
terrible inconsistencies. My main issue now would be: how do I get the diagrams
to change color based on the theme? The site supports light mode too and I'd
like all the content to conform too.

Here's the css if you're interested:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg_h: #1d2021;
    --bg: #282828;
    --bg_s: #32302f;
    --bg1: #3c3836;
    --bg2: #504945;
    --bg3: #665c54;
    --bg4: #7c6f64;

    --fg: #fbf1c7;
    --fg1: #ebdbb2;
    --fg2: #d5c4a1;
    --fg3: #bdae93;
    --fg4: #a89984;

    --red: #fb4934;
    --green: #b8bb26;
    --yellow: #fabd2f;
    --blue: #83a598;
    --purple: #d3869b;
    --aqua: #8ec07c;
    --gray: #928374;
    --orange: #fe8019;

    --red-dim: #cc2412;
    --green-dim: #98971a;
    --yellow-dim: #d79921;
    --blue-dim: #458588;
    --purple-dim: #b16286;
    --aqua-dim: #689d6a;
    --gray-dim: #a89984;
    --orange-dim: #d65d0e;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --bg_h: #f9f5d7;
    --bg: #fbf1c7;
    --bg_s: #f2e5bc;
    --bg1: #ebdbb2;
    --bg2: #d5c4a1;
    --bg3: #bdae93;
    --bg4: #a89984;

    --fg: #282828;
    --fg1: #3c3836;
    --fg2: #504945;
    --fg3: #665c54;
    --fg4: #7c6f64;

    --red: #9d0006;
    --green: #79740e;
    --yellow: #b57614;
    --blue: #076678;
    --purple: #8f3f71;
    --aqua: #427b58;
    --orange: #af3a03;
    --gray: #928374;

    --red-dim: #cc2412;
    --green-dim: #98971a;
    --yellow-dim: #d79921;
    --blue-dim: #458598;
    --purple-dim: #b16286;
    --aqua-dim: #689d6a;
    --orange-dim: #d65d0e;
    --gray-dim: #7c6f64;
  }
}
```