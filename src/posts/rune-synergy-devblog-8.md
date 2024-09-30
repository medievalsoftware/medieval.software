---
title: Rune Synergy
subtitle: Devblog 8
date: 30 September 2024
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

## Preamble

Today's devblog covers the progress of the Go rewrite of the #317 RuneScape Client, with minimal technical details. I’ll share more on the inner workings in future posts, but for now, we're catching up.

# RuneBlend

RuneBlend was an application I was writing to provide a realtime preview of
what a model would look like in Rune Synergy. I consider this first version a
prototype, maybe even a proof of concept.

<div class="row center">
	<video controls playsinline class="large-video">
		<source type="video/mp4" src="/posts/devblog-8/rune-blend.mp4"/>
	</video>
</div>

I didn’t properly source control it, and the Blender side was lost when my
Samsung Evo 970 failed. Despite that, I plan to recreate the application, as
it’s still important. My previous approach had a few issues:

1. **No standard way to detect mesh modifications in Blender**<br>
My solution was inefficient, periodically calculating a CRC of key attributes comprised of vertex and face data—a
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

The <i>engine</i> package provided a platform-independent API for initializing an application, playing
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
already part of Ebitengine. For now, everything is utilizing the GPU except the
actual scene of the game, which I plan on changing in the near future.

<Image alt="Overly dramatic depiction of me climbing my obstacles" src="/posts/devblog-8/continuation.webp"/>

# What's changed since then?

- **Interface Atlases** ([Devblog 7](/rune-synergy-devblog-7))
  - This idea has been scrapped. While it suited a purely software rasterizer, its complexity isn't necessary with hardware rasterization.

- **Prerendered Item Icons** ([Devblog 7](/rune-synergy-devblog-7) again)
  - I've reintroduced item icon generation since Ebitengine makes managing many images much easier.

- **Input Handling/Context Menus** ([Devblog 7](/rune-synergy-devblog-7) and again)
  - Button press handling is now streamlined with the context menu system, making management easier. Although this has little impact on users, you can now right-click buttons where you might not expect context menu options, which differs from #317. Oh well!
  - I've added mouse wheel scrolling for better quality of life.

<div class="row center">
	<video controls playsinline class="large-video">
		<source type="video/mp4" src="/posts/devblog-8/menu-options.mp4"/>
	</video>
</div>

- **Midi Synthesizer** ([Devblog 7](/rune-synergy-devblog-7) and again!)
  - I've reintroduced MIDI synthesizing using [github.com/sinshu/go-meltysynth](https://github.com/sinshu/go-meltysynth) to avoid serving over 2GB of audio files and to retain MIDI capabilities for future ideas.

  

<ul>
<li><p><b>Ingame Console</b></p></li>
<ul>
<li>
I've added a console opened with "~" to perform tests and check data. There will probably be a console variable system in the future for messing with game parameters, similar to Source Engine's [ConVar](https://developer.valvesoftware.com/wiki/ConVar).
</li>
</ul>
</ul>


<div class="row center">
<Image src="/posts/devblog-8/console.png" class="xlarge-img"/> 
</div>

## Getting back to business

In the previous devblog I left you with this unfinished list:

- [ ] Inputs (UI, moving, etc)
- [ ] Other Players (Multiplayer)
- [ ] NPCs
- [ ] Ground Items
- [ ] Projectiles
- [ ] Visual Effects (aka SpotAnim)
- [ ] Temporary Objects

So let's see where we're at... 

<p class="red">!! WARNING: WALL OF TEXT !!</p>

- **Movement and Navigation**
  - [x] Clicking tiles
  - [x] Clicking minimap
- **Entities**
  - [x] Other Players
  - [x] NPCs
  - [x] Ground Items
  - [x] Projectiles
  - [x] Visual Effects on tiles, npcs and players.
  - [x] Temporary Objects
- **Basic Interactions**
  - [x] Interact with objects, ground items, held items, container items, npcs and other players.
  - [x] Use item on objects, ground items, held items, npcs and other players.
  - [x] Cast spell on objects, ground items, held items, npcs and other players.
- **Inventory Management**
  - [x] **Dragging**
    - Swapping items (Inventory)
    - Inserting items (Bank)
    - Scrolling inventory (Bank)
- **User Interface Elements**
  - [x] **Standard Buttons**
    - Quests, Skills, Emotes, Music, Logout
  - [x] **Toggle Buttons**
    - Prayers
  - [x] **Select Buttons**
    - Attack styles, Game options, Player controls, Bank options, etc.
  - [x] **Tooltips**
    - Stats, Prayers, Magic, etc.
  - [x] **Mouse wheel scrolling**
    - Quest Journal, Music Player, Friends/Ignores, Magic, etc.
  - [x] **Interaction Prompts**
    - Click to continue (Chat dialogues)
    - Enter an amount, name, etc.
  - [x] **Chatbox**
    - Chat filtering (Public, private, trade/compete)
    - Right-click add friend/ignore
  - [x] **Report Abuse**
    - [x] Toggle mute (as moderator)
  - [x] **Friends and Ignore List**
    - [x] Add/remove buttons with prompt
- **Multiplayer (Update Segments)**
  - [x] Animate
  - [x] Appearance
  - [x] Chat
  - [x] Face Coordinate
  - [x] Face Entity
  - [x] Force Chat
  - [x] Force Movement
  - [x] Hit1 & Hit2
  - [x] Visual Effect
- **NPCs (Update Segments)**
  - [x] Animate
  - [x] Appearance
  - [x] Chat
  - [x] Face Coordinate
  - [x] Face Entity
  - [x] Hit1 & Hit2
  - [x] Visual Effect
- **Audio**
  - [ ] Local Sound Effects (Synthesized sound effects)
      - Local SFX have no panning or attenuation and play at your selected volume.
  - [x] MIDI (Synthesized)
    - [x] Songs
    - [x] Jingles

We're almost done! I've simplified the music player's logic for the #317 client, making it more robust when handling multiple track requests.

<div class="row center">
	<video controls playsinline class="large-video">
		<source type="video/mp4" src="/posts/devblog-8/music.mp4"/>
	</video>
</div>

# Resource Management

RuneScape has many configurations and assets, so I focused on managing them efficiently and making it easier to create configurations, link assets, and push them intro production. While Rune Synergy is a remake, the client/engine is designed for extension. When I first opened the discussion on Discord (in January!), I outlined these configuration goals:

1. The ability to create new configuration types and attributes for those types during runtime, without needing to reload the engine.
2. Git safe workflow so that new configurations don't conflict with other new configurations at merge.
3. Contributors should be able to manage multiple of their own branches/workspaces.
4. Contributors should be able to collaborate live within a workspace.
5. Branches only store what's new or modified to avoid duplicating files and wasting drive space.

My initial approach was to design a schema in TOML and use code generation to create the types along with all their methods. Here's a diagram of the first prototype:

<div class="row center">
<Image src="/posts/devblog-8/resource-management.png" class="medium-img"/> 
</div>

I found it over-engineered for my needs, so I scrapped it and switched to fully
runtime-based enums, essentially strings in the format “type:name” under a
custom enum.Value type. This wraps [unique.Handle[string]](https://go.dev/blog/unique)
for pointer comparisons. The enum.Type is essentially just a glorified
collection of enum.Values and will be used for synchronizing in collaborations
as well as the development server.

(Apologies for the images—my site's syntax highlighter isn't working well right
now.)

<div class="row center code">
<Image src="/posts/devblog-8/resource-management-enum-type.png"/> 
</div>

The types are still generated from a TOML schema, but everything using enums
is still extendable.


<div class="row gap-1 center code">
<Image src="/posts/devblog-8/resource-management-1-1.png" class="medium-img"/> 
<Image src="/posts/devblog-8/resource-management-1-2.png" class="medium-img"/> 
</div>

<div class="row gap-1 center code">
<Image src="/posts/devblog-8/resource-management-2-1.png" class="large-img"/> 
<Image src="/posts/devblog-8/resource-management-2-2.png" class="large-img"/> 
</div>

This solution covers about 4/5 of the features. While we can't create new configuration types at runtime, I don't see that as a major issue for now. We still achieve git-safe workflows by storing configurations as JSON with minimal complexity, making it easy to share configurations in collaborative environments.

<div class="row center code">
<Image src="/posts/devblog-8/resource-management-items.png" class="large-img"/> 
</div>

I think I'm satisfied with the result. Moving on.

# Scripting Anecdotes

I initially considered a node-based visual scripting approach, similar to Unreal's Blueprints, for better accessibility and tighter integration with the game. However, that will have to wait in favor of plain coding for now—though I’d like to revisit it later. The reason being that it might be easier to design a clean API for scripting in Go first, and then adapt visual scripting to it later with code generation. I really don't want to invent the next [RuneScript](https://oldschool.runescape.wiki/w/RuneScript).

<div class="row center">
<Image src="/posts/devblog-8/scripting-nodes.png" class="large-img"/> 
</div>

In [Devblog 3](/rune-synergy-devblog-3), I showcased writing configurations in Go, but that’s been scrapped. Prototyping revealed issues with maintaining config instances after updates. While possible, it seems cleaner to keep data as JSON and code as Go.

# So what's next?

Of course, there's the client work, and the best part: we're nearly there. Here's a list of the remaining features:

- [ ] **Audio**
  - [ ] Spatial Sound Effects
- [ ] **Packets**
  - [ ] IfSetAngle
  - [ ] PlayerLocMerge
  - [ ] Camera (LookAt, MoveTo, Shake, Reset)
  - [ ] BuildSceneInstanced
    - This one could wait until later when the server needs it.
- [ ] **Engine**
  - [ ] Move the scene over to GPU rasterization

Once this is done, I'll begin designing the serverside systems more thoroughly, and hopefully, we'll start seeing actual collaboration! I've been working on this for so long, and I'm still eager to get others involved.

That's it! Here's a fancy video of me blowing up the screen with visual effects:

<div class="row center">
	<video controls playsinline class="large-video">
		<source type="video/mp4" src="/posts/devblog-8/benchmark.mp4"/>
	</video>
</div>

<span style="font-size:0.5em;color:var(--bg2)">
If you noticed the projectiles vanishing, you're not going crazy. Tiles are limited up to 5 entities to render on them.
This might also be observed in an area with a large amount of players walking around the same tiles.
</span>

# How are you?

I'm glad you asked! The past 9-10 months have been a rollercoaster for me.
I'm expecting relatively smoother sailing from now until March next year, when
my girlfriend and I will be packing up and moving again. This time, though, it
isn't for a new job, but to get back to 'normality.' We've been somewhat stuck
here by circumstance, and while it's not entirely bad, it's definitely not the
ideal situation. Until then, I'll be here working on Rune Synergy. Eventually,
I'd like to dedicate some blog posts to the more technical aspects of the game
client. I had a blast writing [Devblog 5](/rune-synergy-devblog-5) and [7](/rune-synergy-devblog-7), where I really got to break down
the technical aspects with images and videos.

# Interesting projects I follow 

<div class="col gap-1">
  <div class="row">
    <div class="col center">
      <a class="big-text" href="https://kingscrook.itch.io/kings-crook" target="_blank">
        King's Crook
      </a>
    </div>
    <div class="col"><Image src="/posts/devblog-8/kings-crook.png"/></div>
  </div>

  <div class="row">
    <div class="col center">
      <a class="big-text" href="https://2004scape.org/" target="_blank">
        Lost City
      </a>
      <span>(2004 RuneScape Emulation)</span>
    </div>
    <div class="col"><Image src="/posts/devblog-4/lost-city.png"/></div>
  </div>

  <div class="row">
    <div class="col center">
      <a class="big-text" href="https://scape05.com/" target="_blank">
        Scape05
      </a>
      <span>(2005 RuneScape Emulation)</span>
    </div>
    <div class="col"><Image src="/posts/devblog-4/scape05.png"/></div>
  </div>
</div>
