---
title: 'Blender & RuneScape'
subtitle: 'Part 2: Animations'
date: '14 April 2023'
publish: true
icon: /category/blender-rs.png
---
<script>
import Gallery from '$lib/components/Gallery.svelte';
import Image from '$lib/components/Image.svelte';

let trials = [
  {src:"/posts/blender-2/rig-2.png"},
  {src:"/posts/blender-2/rig-3.png"},
  {src:"/posts/blender-2/rig-4.png"},
];

let images = [
  {src:"/posts/blender-2/human-1.png", alt:"A fully rigged human."},
  {src:"/posts/blender-2/human-2.png", alt:"A posed human with attachments."},
  {src:"/posts/blender-2/kalphite.png", alt:"Kalphite"},
  {src:"/posts/blender-2/spider.png", alt:"Spider"},
  {src:"/posts/blender-2/cricket.png", alt:"Bug"},
  {src:"/posts/blender-2/pig.png", alt:"Piggy"},
  {src:"/posts/blender-2/abyssal-leech.png", alt:"Abyssal Leech"},
  {src:"/posts/blender-2/abyssal-demon.png", alt:"Abyssal Demon"},
];
</script>

Sometimes programming can be like a drug; I accomplish something and get that
endorphin rush. It’s hard to share the excitement of progress when it’s not
exactly tangible. For instance: writing some backend code that allows different
systems of a game to play nicely. From the player’s point of view, that’s “how
it should be.” Really shits on the guy that spent weeks of his life on it, but
hopefully, he was getting paid to do it at least.

Anyways I digress. Since my last post on this subject, I’ve brought more
compatibility with RS2 models into Blender.

<Image src="/posts/blender-2/colors.png"/>

They have colors now and are incredibly easy to recolor. I just brought the game
palette in as a texture and made sure every face’s UV values were collapsed onto
each other.

<Image src="/posts/blender-2/garbage.png"/>

Initially, I was exploring a mess of models I had just imported in large
batches. These were a bunch of “roof” objects. But then I realized I wanted to
bring in the rigs as well.

<Image src="/posts/blender-2/rig-1.png"/>

I had a bunch of errors...

<Gallery images={trials}/>

Then success.

<Gallery images={images}/>

<video controls muted src="/posts/blender-2/spider.mp4"></video>

I could export them as well- and I started working on some simple animations: (Rotation only)

<video controls muted src="/posts/blender-2/monkey.mp4"></video>
<video controls muted src="/posts/blender-2/monkey-ingame.mp4"></video>

Added support for transparency import/exporting. The sphere is being drawn ingame with no lighting applied.

<Gallery images={[
  {src:"/posts/blender-2/sphere-1.png"},
  {src:"/posts/blender-2/sphere-2.png"},
]}/>

<video controls muted src="/posts/blender-2/alpha-golem.mp4"></video>

Started handling more complex animations: (Rotation + Translation)

<video controls muted src="/posts/blender-2/stretch-1.mp4"></video>
<video controls muted src="/posts/blender-2/stretch-2.mp4"></video>

Started running more tests and experiments. This little box is helping me keep
track of the in-game coordinate system while I rotate him using quaternions!

<video controls muted src="/posts/blender-2/box-1.mp4"></video>

Once I felt more confident in the coordinate systems and local/pose spaces being
transformed, added scaling and then made my box a purple friend to follow a path
around it while it jumps around.

<video controls muted src="/posts/blender-2/box-2.mp4"></video>

So there you have it. Two weeks of my life were spent bringing the capabilities
of Blender into a game from 2005. But I think that the fun has only just begun!
The possibilities are endless.

Here’s the workflow used to recolor the model and export it. You can also see
the path I used to animate the purple orb.


<video controls muted src="/posts/blender-2/box-3.mp4"></video>
<video controls muted src="/posts/blender-2/slime.mp4"></video>

Full animation support (Translation, Rotation, Scaling, and Transparency):

<video controls muted src="/posts/blender-2/portal-1.mp4"></video>
<video controls muted src="/posts/blender-2/portal-2.mp4"></video>

So that about wraps it up for now. I’m still trying to think of how this can be
used for Rune Synergy, I’m thinking QoL/small details added to the game.

# Scape05

You might’ve noticed the private server I was logged into. That’s a live game
right now recreating the RuneScape experience from 2005. It’s run by my friend
Devenir at https://scape05.com/. Definitely check it out if you like the
old-school grind.

[![Scape05](/posts/blender-2/scape05.png)](https://scape05.com/)

# Rune Synergy

This project and its features were inspired by my current project Rune Synergy.
Come and [join us](https://discord.gg/b4HkMwHQKc)!

<img src="/posts/looking-forward/runesynergy.png" class="h-10"/>