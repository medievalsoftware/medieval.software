---
title: Rune Synergy
subtitle: Devblog 2
date: '12 February 2023'
publish: true
icon: /images/rune-synergy.png
---
<script>
import Image from '$lib/components/Image.svelte';
</script>

Another truly groundbreaking dev blog (not really). I know the last post I
left off on talking about Scripting and what solutions might be available for
that, but guess what? I procrastinated. I procrastinated and decided to work on
writing game client and network code. At least I was being constructively lazy.

# Overview

I’m not super big into ‘microservices’ but it made sense to split a lot of this
up into separate servers. I won’t be breaking this diagram down much more here
since it’s pretty cut and dry.

<Image src="/posts/devblog-2/overview.png"/>

Multiple game worlds were omitted from this diagram, but theoretically, there
would be around 2-3 of those depending on how I decide to set up the dev worlds.

# Game Client

Before I even started writing code I wanted to know exactly what libraries I
would use, how I would use them, and what the rough packaging structure would
look like. I decided to begin with my target platforms. WebAssembly and Native.
I know Native sounds super broad, it implies macOS, Windows, and Linux. Luckily
I had experimented with WebGL2 a couple of months ago, so I was able to hop
right into that for a backend. I decided to use OpenGL 3.3 with the native
backend since it’s supported almost universally with the exception of macOS,
which only supports up to 4.1. I stuck with 3.3 since it’s most compatible with
OpenGL ES 3.0 though, which is what WebGL2 is based on.

<Image src="/posts/devblog-2/client-stack.png"/>

## Graphics

I know I wrote a relationship between GLES 3.0 and OpenGL 3.3 stating “3.3
Compatible” which isn’t the full truth. There are some QoL functions brought
into GLES that come from OpenGL 4.0 such as glTexStorage and other things I
can’t remember. I just know this is *good enough*.

You’re probably wondering what I did to get both WebGL2 and OpenGL 3.3 functions
into my pipeline… Well, it took a pretty large chunk of time debugging and
getting that out of the way. Here’s some code.

In order from left to right: Graphics Library, WASM wrapper, OpenGL wrapper.

<Image src="/posts/devblog-2/gl-wrapper.png" class="code"/>

I hadn’t gotten to use generics in Go for much but I found a use. There are some
functions that can accept a wide variety of inputs, so I can just use a generic
to provide some type safety (heh).

I also burned a lot more time than I probably should have just organizing. This
is super handy when I’m trying to find an argument to pass a function.

<Image src="/posts/devblog-2/gl-constants.png" class="code"/>

## Audio

<div class="row gap-1">
<div class="col-1-3"><Image src="/posts/devblog-2/layout.png" class="code"/></div>
<div class="col-2-3" style="flex-basis:2">
<p>
Audio is another super important topic. So I found <a href="https://github.com/ebitengine/oto">ebitengine/oto</a> 
which fortunately for me fits my target platform criteria. Which I’m sure begs
the question: Why not do the same thing for graphics?
</p>
<p>
Well, you’re not wrong. But I also love to learn through experimentation which
is what this has done. I think I’m a lot better with OpenGL now than ever! …Also
I’m a picky bastard who wants everything his way.
</p>
<p>
I also found an awesome library called <a href="https://github.com/sinshu/go-meltysynth">Meltysynth</a> which fortunately the
creator rewrote into Go. It’s a MIDI Synthesizer that sounds awesome and takes
SoundFonts. I’ve already successfully tested it both natively and in the browser
and it works perfectly with minimal CPU usage.
</p>
</div>
</div>

## Network

<div class="row gap-1">
<div class="col-1-3">
<Image src="/posts/devblog-2/network.png" alt="Network Structures" class="code"/>
</div>
<div class="col-2-3">
<p>
Yeah, I wrote a nifty type I call Codec which allows you to Encode and Decode
structs of any shape into a Buffer. It takes into account variable-sized
fields and adds a size field to the packet header. So networking is essentially
just boiled down to ensuring that both the Client and Server share the same
struct being tossed onto the wire and they should understand each other. The
identifying opcode for each struct is simply the MurmurHash3 of its name. I
don’t think that should be a problem with 32-bit opcodes.
</p>
<p>
This should also be useful later for binary file formats, maybe. As long as
fields don’t change size or get rearranged… 😬
</p>
<p>
I could’ve used protobuf but where’s the fun in that?... <sub><i>Foreshadowing...</i></sub>
</p>
</div>
</div>

# What's next?

Alright, well I’m going to continue pushing the scripting portion into the
future while I tackle more interactive problems. You might’ve noticed the ui
package in the screenshot above hiding just below pkg/graphics, and I’m taking
some inspiration from Dear IMGUI and attempting to write my own immediate
graphical user interface. I’m definitely going to be scrubbing through IMGUI and
stealing everything though.

<Image src="/posts/devblog-2/next.png"/>

It’s a pretty major part of the game engine. Since all the tooling will be
embedded in the game itself, I’ll need it to be as easy as hitting F1 to
enter “Development Mode” and have all the game assets, configurations, states,
etc readily available. This isn’t just for me, this is for the Rune Synergy
contributors. I could easily say here are some json files, have fun. But
that’s not very fun. It would be way cooler to get an integrated development
environment designed specifically for RuneScape.

P.S. If you know any better diagramming tools than draw.io please let me know at
dane@medieval.software