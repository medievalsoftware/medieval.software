---
title: Rune Synergy
subtitle: Devblog 8
date: 13 September 2024
publish: true
icon: /images/rune-synergy.png
---

<script>
import Image from '$lib/components/Image.svelte';
</script>


<div class="row">
<div class="col">
<Image src="/posts/devblog-8/timeline.svg"/>
</div>
</div>

# Now you're all caught up!

Just kidding, that timeline only touches some of the big events and leaves some
questions to be answered. I'll touch on them in chronological order.

# RuneBlend

RuneBlend was an application I was writing to provide a realtime preview of
what a model would look like in Rune Synergy. I consider this first version a
prototype, maybe even a proof of concept.

<div class="row center">
	<video controls playsinline class="large-video">
		<source type="video/mp4" src="/posts/devblog-8/runeblend.mp4"/>
	</video>
</div>

I didn’t properly source control it, and the Blender side was lost when my
Samsung Evo 970 failed. Despite that, I plan to recreate the application, as
it’s still important. My previous approach had a few issues:

1. **No standard way to detect mesh modifications in Blender**<br>
My solution was inefficient, periodically calculating a CRC of key attributes—a
costly process.

2. **Geometry couldn’t be transmitted unless Blender was in Object mode**<br>
This was frustrating. Access to geometry data required switching between Object
and Edit mode to transmit changes to the previewer.

We shall revisit this later!

# Deprecating my own engine

In early July, I realized I was unhappy with my engine package’s developer
experience. Looking back at <a href="/rune-synergy-devblog-2">Devblog 2</a>, I
see the design, though simple, created unnecessary work for myself.

<details>
<summary><b>Context</b>: <i>engine</i> package.</summary>

It provided a platform-independent API for initializing an application, playing
audio, and using hardware accelerated graphics APIs.

<Image src="/posts/devblog-2/client-stack.png"/>

</details>

The low-level APIs it provided worked but were too low-level—I didn’t want to
manage every detail like optimizing draw calls or handling image assets. Plus,
I wanted to use platform-specific graphics APIs like DirectX and Metal. I wasn't
ready to go down that rabbit hole.

So instead of suffering from <a href="https://en.wikipedia.org/wiki/Not_invented_here">Not Invented Here</a>, I found a solution:

## Ebitengine - our new engine!

<Image src="/posts/devblog-8/ebitengine.webp"/>

Ebitengine checks all the boxes and more for what I was originally looking
for. In hindsight I should have considered game engines first before libraries.
That's just life I guess!

<ul>
  <li><b><a href="https://ebitengine.org/en/documents/features.html">Cross-Platform Support</a></b><br>Windows, macOS, Linux, FreeBSD, Android, iOS and browsers (via WebAssembly)</li>
  <br>
  <li><b><a href="https://pkg.go.dev/github.com/hajimehoshi/ebiten/v2">Simplicity and Ease of Use</a></b><br>Abstracts complex graphical API details, allowing me to focus on game development and simplify feature implementation.</li>
  <br>
  <li><b><a href="https://ebitengine.org/en/documents/shader.html">Kage Shader Language</a></b><br>Ebitengine's built-in shader language, Kage, offers a familiar, Go-like syntax for writing shaders.</li>
  <br>
  <li><b><a href="https://github.com/hajimehoshi/ebiten">Active Community and Open Source</a></b><br>Ebitengine’s active community and open-source nature allows Rune Synergy to benefit from ongoing engine improvements!</li>
</ul>

Ebitengine is a 2D game engine, which may seem counterintuitive for our project,
but it fits well with our software pipeline. Ebitengine's vertices are in the
same screen space as the triangle primitives from our pipeline, allowing us
to append triangles directly to a list and rasterize them on the viewport. The
diagram below illustrates this process:

<div class="row center">
<Image src="/posts/devblog-8/pipeline.svg" class="xlarge-img"/>
</div>

The game looks the same after the migration, which is great! Plus, the audio
library we're using, <a href="https://github.com/ebitengine/oto">oto</a>, is
already part of Ebitengine.

# A continuation

<Image src="/posts/devblog-8/continuation.webp"/>

In the previous devblog I left you with this unfinished list:

- [ ] Inputs (UI, moving, etc)
- [ ] Other Players (Multiplayer)
- [ ] NPCs
- [ ] Ground Items
- [ ] Projectiles
- [ ] SpotAnims (Visual Effects)
- [ ] Temporary Objects

So let's see where we're at.

## Inputs (UI, moving, etc)

- [x] Interacting with interfaces...
  - [x] Inventories...
    - [x] Dragging to swap... (Inventory)
    - [x] Dragging to scroll... (Bank)
    - [x] Item Options
    - [x] Inventory Options
  - [ ] Spells...
    - [x] Cast on Item
    - [ ] Cast on Ground Item
    - [ ] Cast on Object
    - [ ] Cast on NPC
    - [ ] Cast on Player
  - [x] Behavior
    - [x] Standard buttons (Quests, skills, emotes, music, logout)
    - [x] Toggle button (Prayers)
    - [x] Select button (Attack styles, game options, player controls, bank options etc)
    - [x] Mouse wheel scrolling
    - [x] Click to continue (Chat dialogues)
    - [x] Prompts: Enter an amount, name, etc.
  - [x] Specialized Behavior
    - [x] Add/Remove Friend
    - [x] Add/Remove Ignore
    - [x] Tooltips (Stats, prayers, magic)
  
- [x] Movement
  - [x] Clicking tiles...
  - [x] Object Options
  - [ ] Ground Item Options
  - [ ] Player Options
  - [ ] NPC Options

## Multiplayer

## NPCs

## Ground Items

## Projectiles

## Visual Effects

