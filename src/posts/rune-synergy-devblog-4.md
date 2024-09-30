---
title: Rune Synergy
subtitle: Devblog 4
date: '4 May 2023'
publish: true
icon: /images/rune-synergy.png
---
<script>
import Image from '$lib/components/Image.svelte';
</script>

Buckle in, this one’s gonna be anticlimactic. Essentially I took a 2-week mental
break since I stared at my monitor for too long. In essence: I didn’t get much
Rune Synergy work done. After my modeling spree, I hit a rut in motivation
and energy. This week I’ve dedicated myself to “getting my shit together” by
reanalyzing my priorities and tasks before diving back in.

After finally crawling out of my cave, I realized my lack of motivation was
due to poor task tracking leading to feeling like I’m going nowhere. It’s super
important for me to “gamify” the things I do, otherwise, I don’t feel like I’m
making headway. Luckily GitHub has solutions for this.

<Image src="/posts/devblog-4/intro.png"/>

# Intermission

Before we move forward, I want to describe how I plan on formatting my blog
posts in the future, so you’ll have a sort of logic to the mayhem.

I like the idea of having each blog post be almost a continuation of the
previous, where at the beginning I’ll talk about the things I left the previous
blog post on. Then talk about what I’ve worked on since, and finally what I’m
planning on doing next. I think I’ve been following this roughly, but I want to
make it more apparent this time.

With that said, let me address the last things I talked about: I mentioned
processing models and getting some proper asset names for them. I had done
plenty of it with success that can be viewed on GitHub. I also worked on
converting item definitions into the intended script format. Shortly after this,
I went on a model/animation conversion spree, which was basically a distraction
from Rune Synergy’s development. I still haven’t started on the same process for
NPCs or Objects, those are still on the back burner.

Right, let’s get back to it.

# Priorities

<Image src="/posts/devblog-4/mfw.png"/>

One of the large dampening factors of progress was a lack of a functional game
world. It feels almost like a real-world deadlock where I can’t do them both
simultaneously, it’s one or the other. I’ve gotten a pretty sweet setup for
the client but can’t get in the game yet. It’s very functional up to the
login screen. So I have to decide between two choices:

1. Get the server working for the standard Java Client
2. Get the client rewritten for an existing server

They’re both simple enough options, but I like to think ahead. I’m planning on
abandoning the standard protocol in favor of my “make a struct and send it over
wire” solution. The reason is: the server is already using it and expecting
networked messages to be formed this way. It wouldn’t make sense to make this
layer and NOT use it. (Did I just make a problem for a solution? Maybe.)

Additionally, this gives me more time to organize my thoughts and ideas for
how the server will be structured. Which I felt is even more important at the
moment.

Anyways, so I’m going with Option 2. Luckily my good friends over at Scape05
are basically using an almost unmodified 317 client and the game supports almost
every packet/engine feature. Projectiles, graphics, multiplayer, etc.

Although the client conversion won’t be very linear, I’m still going to give
myself *something* to work with. I figured a task for each Java class would be
the simplest start.

<Image src="/posts/devblog-4/tracker.png"/>

Luckily I’ve already created solutions for a bunch of things, I just didn’t have
any tasks to quantify the work already done. Some super important things also
being the spooky Synthesizer which I actually already converted to Go nearly
[three years ago](https://github.com/medievalsoftware/go-synth). It’s public so
check it out.

# Serverside

I’m just one person and multitasking isn’t my forte, so I won’t be touching any
server code until the client is complete! I’m still allowing myself to plan the
serverside though.

<Image src="/posts/devblog-4/workflow.png"/>

I found that exploring the client yet again is giving me new ideas on how I
should handle things on the server. Also talking to some cool people from the
RuneScape Private Server communities who are super knowledgeable (or curious) on
the mechanics of OSRS, which help directly!

There is still a ton of work ahead of me. As you can see, the server is 0%
towards its goal of Minimal Viable Product (MVP). I’m confident that once I
get the client written then server development will pick up substantially.
Until then I’ll be working on getting these tasks assembled and designing this
database, which I’ve done a little of:

<Image src="/posts/devblog-4/schema.png"/>

(Schema is likely to change drastically)

<div class="row gap-1">
<div class="col">
<p>
I’ll be using <a href="https://www.postgresql.org/" target="_blank">PostgreSQL</a>
for my databases and <a href="https://sqlc.dev/" target="_blank">sqlc</a> to generate functions for accessing
it. So far I’m enjoying the productivity with sqlc where I only write a query
once and it generates functions based on that query.
</p>
</div>
<div class="col">
<a href="https://sqlc.dev/" target="_blank"><img src="/posts/devblog-4/sqlc.png"/></a>
</div>
</div>

<Image src="/posts/devblog-4/sqlc-output.png"/>

# What's next?

The client of course! I started utilizing GitHub’s Projects to track progress
and assign timelines. Right now it’s super empty, but I’ll be filling it out by
the end of next week. I’m projecting to complete the client conversion by the
end of this month. We’ll see what happens.

# Those I am thankful for

<Image src="/posts/devblog-4/me.png"/>

In no particular order:

- Sir Polar of Rune-Server
- King Pazaz of [Lost City](https://2004scape.org/)
- King Kris of [Blurite](https://github.com/blurite)
- Ruler Devenir of [Scape05](https://scape05.com/)
- Buddy matt123337 of [Canada](https://www.canada.ca/en.html)
- Söör Suic of [Discord](https://discord.gg/wX97VyTfht)
- Lord LMP88959 of [King’s Crook](https://kingscrook.itch.io/kings-crook)

# Cool things I follow

<div class="col gap-1">

  <div class="row">
    <div class="col center">
      <a class="big-text" href="https://kingscrook.itch.io/kings-crook" target="_blank">
        King's Crook
      </a>
    </div>
    <div class="col"><Image src="/posts/devblog-4/kings-crook.png"/></div>
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
