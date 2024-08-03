---
title: 'Blender & RuneScape'
subtitle: 'Part 1: Models'
date: '18 March 2023'
publish: true
icon: /category/blender-rs.png
---
<script>
import Image from '$lib/components/Image.svelte';
</script>

I’ve been working on bringing RuneScape 2 models into Blender. There are some
apparent challenges since the game engine does some untraditional things to get
the game to look the way it does. One of the most major behaviors let’s call
“prioritizing.” Before we go over the technicals, let me introduce Blender,
what problem prioritizing is trying to solve, and some relevant solutions to
that problem.

[![Blender Logo](/posts/blender-1/logo.png)](https://www.blender.org/)

# What is Blender?

Blender is a free and open-source 3D modeling software used for creating a
wide range of digital content, such as animations, visual effects, and video
game assets. It offers various tools for sculpting, texturing, rigging, and
rendering, making it a versatile solution for artists and designers who work
with 3D graphics.

# The Problem

**[Hidden Surface Removal](https://en.wikipedia.org/wiki/Hidden-surface_determination)**

Hidden surface removal is a technique used in 3D graphics to ensure that only
the visible parts of objects are shown in a scene. Imagine you’re looking at a
group of objects, some of which may be overlapping or blocking others from your
view. The goal of hidden surface removal is to figure out which parts of the
objects should be visible and which should be hidden, so that the final image
looks realistic and accurate, without any confusing overlaps or hidden objects
showing through. This process is essential for creating convincing 3D visuals in
animations, video games, and other digital media.

# Relevant Solutions

## [Painter's algorithm](https://en.wikipedia.org/wiki/Painter%27s_algorithm)

![Painter's Algorithm](/posts/blender-1/painter.png)

This technique sorts objects or their parts based on their distance from the
viewer and then renders them in a back-to-front order. By drawing distant
objects first and closer ones on top, the algorithm mimics the way a painter
would create a scene on a canvas. However, this method may not always produce
accurate results, especially when objects intersect or have cyclic overlaps.

## [Z-Buffering](https://en.wikipedia.org/wiki/Z-buffering)

![Z-Buffering](/posts/blender-1/zbuffer.png)

Also known as *depth buffering*. In this approach, a buffer with the same
dimensions as the final image is created, and depth values are assigned to each
pixel. As objects are rendered, their depth values are compared to the values in
the buffer. If an object’s depth value is closer to the viewer than the stored
value, the buffer is updated, and the pixel is colored accordingly. This method
ensures that only the visible surfaces are displayed in the final image.

# RuneScape

Older versions of RuneScape, and particularly the one Rune Synergy is based on,
use Painter’s Algorithm in conjunction with a Priority system that allows the
3D modeler to decide the render order of triangles. It sounds simple enough, but
there is a caveat we have to observe.

<div class="row gap-1 center">
<div class="col">
<p>
Many models have faces created perfectly atop one another. Take for example this
wardrobe. Many of these details are simply faces overlaid with other faces.
</p>
<p>
In a way, this simplifies the mesh since subdivisions weren’t needed to add the
extra detail. Instead, two triangles were used for each wood face and then the
glass was made on top.
</p>
<p>
The longer you analyze the objects and models in the game, the more apparent it
becomes that this system was designed with small details in mind.
</p>
</div>
<Image src="/posts/blender-1/wardrobe.png"/>
</div>


<div class="row gap-1 center">
<Image src="/posts/blender-1/priorities.png"/>
<div class="col">
<p>
This model has its priorities colored from lowest (black) to highest (white). As
you can see, the cape has a much greater priority than almost everything else,
yet it still renders behind the player (most of the time.) Wait a minute, that
doesn’t make sense.
</p>
<p>
Shouldn’t higher-priority faces always show up above lower ones? How does this
system work exactly?
</p>
<p>
I call it a priority system but it seems that the priority really only matters
sometimes. To further understand what’s going on here we have to look at the
code.
</p>
</div>
</div>

![Carpet](/posts/blender-1/carpet.png)

# Seek and ye shall find

There are some answers, [hidden deep within the rendering code](https://github.com/thedaneeffect/RuneScape-317/blob/01295ef7f90011f8c9faa696308b0e014b50b8e2/src/main/java/Model.java#L2090-L2212). But even my
renamed and slightly documented code is a harsh read. Essentially it boils down
to this:

1. Calculate average depths for three sets of priority levels: (1-2), (3-4), and
(6-8). This is done by summing the depth values of faces within each priority
set and dividing by the total count of faces in those priorities.

2. Initialize variables for rendering faces with priorities 10, or 11 if there
isn’t any priority 10. These priorities will be treated differently during the
rendering process.

3. Iterate through the 10 priority levels (0-9). For priority levels 0, 3, and
5, check if the depth of the current face is farther than the respective average
depth value calculated earlier. If the condition is met, draw the face and check
if we are done with this priority and need to switch to priority 10 or 11.

4. For other priorities excluding 10 and 11, draw all faces.

5. After iterating through all priority levels (0-9), draw any remaining faces
with priorities 10 and 11.

Yikes, what a pain in the ass. I’m still not even entirely sure I got that
right. So it boils down to seemingly that priorities only sort of ‘nudge’ the
renderer to draw higher priority triangles on top.

# A solution in Blender (partial)

Here’s an example of what one of these flat models with overlapping faces looks like in Blender.

<Image src="/posts/blender-1/zfight.png"/>

Not so good. Ideally, we want the priorities to show up as intended. Here’s the
result we want (I just moved them out to give the desired effect):

<Image src="/posts/blender-1/zfight-fix.png"/>

So how can we get here? I took to some experimenting and learned that the latest
version of Blender has Viewport compositing.

This sounded like the perfect opportunity. I split the model into 3 layers with
their own respective collections. Then I slapped together some Alpha Over nodes
to composite each layer over each other as desired.

<Image src="/posts/blender-1/shader.png"/>

Wait, I don’t understand… The preview image shows up perfectly, but the viewport
is still Z-fighting! What’s the deal? Unfortunately, this is called multi-passing
which currently isn’t supported by the Viewport compositor. ([Issue
Tracker](https://projects.blender.org/blender/blender/issues/99210))

But the result is perfect when doing a normal render!

<Image src="/posts/blender-1/render.png"/>

Perhaps when multipass is supported I can take another crack at it, and then
somehow implement some tolerances between layers to achieve the same effect as
the RuneScape 2 client… Only time will tell.

For now, I’m going back to typical development. Feel free to join the discord to get some latest behind the scenes.

https://discord.gg/yQKWq2sfb7