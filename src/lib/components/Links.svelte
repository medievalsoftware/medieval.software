<script>
import Link from "$lib/components/Link.svelte"

/** @type import("$lib/types").Link[] */
export let links;

/** @type string */
export let caption = "Links";
</script>

<div class="group">
<h2>{caption}</h2>
{#each links as link}
<Link caption={link.text} href={link.url} img={link.img} on:click/>	
{/each}
</div>
