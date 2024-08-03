---
title: Rune Synergy
subtitle: Devblog 6
date: '17 July 2023'
icon: /images/rune-synergy.png
publish: true
---
<script>
import Image from '$lib/components/Image.svelte';
</script>

This past month and a half has been pretty sleepy. Previously we left off with
incomplete NPC tests and hinting toward scene rendering and interfaces. Long
story short: NPCs are done and this post will primarily be about rendering and
interfaces.

# OpenGL or Software?

If you’ve been reading in order you’d know that the client is written to
utilize OpenGL/WebGL2. Initially, I considered having this simply as a means for
rendering a software-rasterized image to the screen. Instead, I’ve taken up the
challenge of using hardware acceleration for most rendering and software for the
“on-demand” type renderings, a hybrid of sorts. More on that later…

With that said: I want to avoid having to constantly play with the OpenGL state
directly in the game code. As you can see in the screenshot below, there are a
lot of global states with OpenGL.

<div class="row">
<Image src="/posts/devblog-6/webgl2-state.png" class="code"/>
</div>

# Statefulnesslessness

I stole the concept of DrawCmd/DrawLists from [ImGui](https://github.com/ocornut/imgui) to decouple state changes
between draw calls. DrawCmd can be thought of as an OpenGL state we swap in
before drawing. A DrawList maintains the list of draw commands along with their
respective vertices grouped into a single buffer.

Open the screenshot below to see the outlined mesh for the highlighted DrawCmd.

<div class="row">
<Image src="/posts/devblog-6/imgui-debugger.png"/>
</div>

An added benefit of these structures is changing the draw order of certain elements. We can build the DrawLists for two separate scenes/windows and determine which should go atop another later. In ImGui this behavior is used for allowing multiple windows to be built in the same frame, but sorted before their draw calls are made.

# Alas, ’tis the atlas.

With the addition of this system needs ways to draw many different types
of elements within a single draw call. Luckily for us this is as trivial as
setting up an atlas containing all of our images. The version of the game we’re
recreating doesn’t have very many sprites, so everything including the title
screen and gameframe all fit within a single 2048×2048 image. I even went ahead
and stuffed all four fonts into it as well.


<div class="row">
<Image src="/posts/devblog-6/atlas.png" class="code"/>
</div>


<div class="row gap-1">
<div class="col-2-3 center">
<p>
Each atlas has a .json that describes each subtexture.
</p>
</div>
<div class="col-1-3">

```json
{
  "staticons,agility": {
    "x": 1020,
    "y": 730,
    "w": 18,
    "h": 23
  },
  "staticons,attack": {
    "x": 1045,
    "y": 646,
    "w": 25,
    "h": 25
  }
}
```

</div>
</div>

<div class="row gap-1">

<Image src="/posts/devblog-6/button-logic.png" class="code"/>

I also ended up taking an ImGui approach for button inputs.

</div>

<video autoplay playsinline loop muted src="/posts/devblog-6/title.mp4"></video>

Check the demo out at https://medievalsoftware.github.io/.

# I see no scene

So far I’ve only stubbed out the structures for the scene graph. Going back to
my Hardware vs. Software idea in the beginning, I need to pick a solution and
stick to it. I came to the conclusion that it would be easier to rasterize the
3D portions of interfaces in software since it can be on demand and cached, then
the scene itself can be done almost entirely in OpenGL. Once again I’m putting
the scene off to instead implement interfaces.

# Where are the interfaces, captain?

<div class="row center">
<Image src="/posts/devblog-6/interface-1.png" class="sharp"/>
</div>

Before we get into the nitty gritty, allow me to define each type of interface
along with their components (if necessary).

- Layer
- Inventory
- Rectangle
- Text
- Text Inventory
- Image
- Model

All of the types above use hardware acceleration to rasterize the final product,
but some of them use software for prerendering/generating icons.

## Inventories

<div class="row center">
<Image src="/posts/devblog-6/inventory.png" class="sharp"/>
</div>

The inventories for example still have their icons software rasterized, since
it’s such a simple process and makes it easy to retain the original appearance.
I’ll be taking an atlas approach to this as well, prerendering icons to one
1024×1024 texture allowing up to 1024 (32×32) icons to be displayed at once. I’m
not sure the limit needs to be that high but it will be adjustable.

## Rectangles

<div class="row center">
<Image src="/posts/devblog-6/rects.png" class="sharp medium-img"/>
</div>

If you’ve used OpenGL or a mixture of hardware accelerated APIs, you’d know that
getting that “pixel perfect” line is sometimes a pain in the ass. Also, using
GL_LINES wasn’t very friendly with my DrawList setup, since it would have to
separate into its own draw call to do lines specifically. I opted for a more
brute force solution of implementing [NinePatch](https://developer.android.com/reference/android/graphics/NinePatch) and ignoring the center piece for
rectangles. Worked like a charm.

## Text

<div class="row center">
<Image src="/posts/devblog-6/text.png" class="sharp"/>
</div>

Fonts were one of the first implementations for the renderer and are your
standard bitmap font style. The addition of the “tag” system for different
colors is also supported. @gre@Text for example.

## Images

The simplest of them all, made of a single quad. Nothing special here.

<div class="row center">
<Image src="/posts/devblog-6/images.png" class="sharp"/>
</div>

## Models

Call it premature optimization if you will, but I decided that atlases solve all
problems-existent or not. Which is why I’m using an atlas for interface models.
Tada!

<div class="row center">
<Image src="/posts/devblog-6/models-1.png" class="sharp"/>
</div>

Oops, wait… I know their rough render boundaries but they’re currently not being
offset by anything in the pre-render. I was doing a little debug prep work and
this is what the texture looks like so far.


<div class="row center">
<Image src="/posts/devblog-6/renderdoc.png" class="code"/>
</div>

<div class="row center">

<div class="col">
No worries, we just gotta get them properly arranged like this:
</div>

<div class="col center">
<Image src="/posts/devblog-6/models-2.png" class="sharp"/>
</div>

</div>

<div class="row center">
<Image src="/posts/devblog-6/models-3.png" class="sharp"/>
</div>

Right, so it looks decent. But it’s actually very slightly off from how it’s
supposed to look. I narrowed it down to the perspective projection in the vertex
shader pipeline. This is the point I decided not to use OpenGL for pre-rendering
since the results weren’t always accurate to my liking. Here is that same
interface but software rasterized:

<div class="row center">
<Image src="/posts/devblog-6/models-4.png" class="sharp"/>
</div>

Ignore the fact that the OpenGL version was brighter, I just hadn’t adjusted the
palette texture gamma whereas the software version is set to 0.8.

Right, so we have a working solution for static models. After getting the atlas
working properly I figured it was time to do some proper packing and tracking.

Underneath is an [LRU Cache](https://www.interviewcake.com/concept/java/lru-cache) which tracks pre-rendered regions and evicts them
when either of the conditions are met: The cache is full, or the cache has
no room for the next result. The regions are determined using a binary tree
which is entirely rebuilt each time a render is added. Instead of re-rendering
previous regions, we can simply move them to their new location. The downside
of this approach is we need two buffers for our atlas, in the case that a moved
region overwrites another region which moves after. Memory is cheap though and
it’s 2023 so the pros of not having to keep models in memory and re-rendering
are worth it.


<div class="row center">
<Image src="/posts/devblog-6/models-5.png" class="sharp"/>
</div>

Cool. Here’s what the atlas after cycling through 6~ model filled interfaces
looks like:

<div class="row center">
<Image src="/posts/devblog-6/models-atlas.png" class="sharp"/>
</div>

There are some clear duplicates going on, and that’s due to the regions being
cached by interface ID. Luckily this is remedied by keying our caches with more
specific data for each region to include model id, rotations, etc.

## Animated Models

I can do the same approach with animated models, but I will have to decide
whether to cache each frame or overwrite for each consecutive frame. My main
concern is running out of atlas space with larger animated models if I do the
prior.

# Drudging in my muck

<div class="row center">
<Image src="/posts/devblog-6/muck.png"/>
</div>

You might’ve noticed that this blog post is coming more than two weeks later
than scheduled. It’s no surprise when you work on the same thing for over 6
months straight that things begin to slow down. I’m looking for something to
remedy this, like potentially starting a second project to keep the “mojo”
going. I’m still determined on getting Rune Synergy out there, it’s just turning
a bit stale to look at each and every day.

I’m a game developer at heart, or something. I want to create many things
but I’ve forced myself to focus solely on Rune Synergy in fear that I’ll get
distracted. But maybe that’s not the right way of going about it.

So perhaps the next blog post may be something else, or not. We’ll see!
