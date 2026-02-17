---
title: p5.js Test
date: '17 February 2026'
publish: true
icon: /category/test.png
description: Testing p5.js integration with Svelte
---
<script>
import P5 from '$lib/components/P5.svelte';
import PositionPad from '$lib/components/PositionPad.svelte';
import AnglePicker from '$lib/components/AnglePicker.svelte';
import NumberInput from '$lib/components/NumberInput.svelte';
import RangeSlider from '$lib/components/RangeSlider.svelte';
import VecInput from '$lib/components/VecInput.svelte';
import GradientEditor from '$lib/components/GradientEditor.svelte';
import Prop from '$lib/components/Prop.svelte';
import { loadProps, saveProps } from '$lib/persist.js';

// -- Particle system --
let ptab = 'emitter';
let {
	emitX = 0.5,
	emitY = 0.75,
	emitAngle = 270,
	rate = 3,
	spread = 30,
	psize = 6,
	lifetime = 80,
	pcolor = '#fe8019',
	fade = true,
	gravityX = 0,
	gravityY = 0.08,
	initialSpeed = 3,
	friction = 0.99,
} = loadProps('particle-emitter');
let particleCount = 0;
$: saveProps('particle-emitter', {
	emitX, emitY, emitAngle,
	rate, spread, psize, lifetime,
	pcolor, fade,
	gravityX, gravityY, initialSpeed, friction,
});

function particleSketch(p) {
  let particles = [];

  p.setup = () => {
    p.createCanvas(600, 300);
  };

  p.draw = () => {
    p.background(30);

    for (let i = 0; i < rate; i++) {
      let angle = p.radians(emitAngle) + p.radians(p.random(-spread, spread));
      particles.push({
        x: emitX * p.width,
        y: emitY * p.height,
        vx: p.cos(angle) * initialSpeed,
        vy: p.sin(angle) * initialSpeed,
        life: 0,
      });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let pt = particles[i];
      pt.vx *= friction;
      pt.vy *= friction;
      pt.vx += gravityX;
      pt.vy += gravityY;
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life++;

      if (pt.life > lifetime) {
        particles.splice(i, 1);
        continue;
      }

      let alpha = fade ? p.map(pt.life, 0, lifetime, 255, 0) : 255;
      let r = parseInt(pcolor.slice(1, 3), 16);
      let g = parseInt(pcolor.slice(3, 5), 16);
      let b = parseInt(pcolor.slice(5, 7), 16);

      p.noStroke();
      p.fill(r, g, b, alpha);
      p.circle(pt.x, pt.y, psize);
    }

    particleCount = particles.length;
  };
}

// -- Bouncing ball --
let {
	speed = 2,
	size = 20,
	trail = true,
	color = '#fb4934',
	shape = 'circle',
	count = 1,
} = loadProps('bouncing-ball');
$: saveProps('bouncing-ball', {
	speed, size, trail,
	color, shape, count,
});

function sketch(p) {
  let balls = [];

  function makeBall() {
    return {
      x: p.random(size, p.width - size),
      y: p.random(size, p.height - size),
      dx: p.random([-1, 1]),
      dy: p.random([-0.7, 0.7]),
    };
  }

  p.setup = () => {
    p.createCanvas(600, 300);
    for (let i = 0; i < count; i++) balls.push(makeBall());
  };

  p.draw = () => {
    p.background(30, trail ? 25 : 255);

    while (balls.length < count) balls.push(makeBall());
    while (balls.length > count) balls.pop();

    p.noStroke();
    p.fill(color);

    for (const b of balls) {
      b.x += b.dx * speed;
      b.y += b.dy * speed;

      if (b.x > p.width - size / 2 || b.x < size / 2) b.dx *= -1;
      if (b.y > p.height - size / 2 || b.y < size / 2) b.dy *= -1;

      if (shape === 'circle') {
        p.circle(b.x, b.y, size);
      } else if (shape === 'square') {
        p.rectMode(p.CENTER);
        p.rect(b.x, b.y, size, size);
      } else if (shape === 'triangle') {
        let r = size / 2;
        p.triangle(
          b.x, b.y - r,
          b.x - r, b.y + r,
          b.x + r, b.y + r
        );
      }
    }
  };
}

// -- Terrain generator --
const DEFAULT_GRADIENT = [
	{ pos: 0, color: '#2d4a22' },
	{ pos: 0.4, color: '#83a548' },
	{ pos: 0.7, color: '#c8b47a' },
	{ pos: 1, color: '#f0ead6' }
];
let {
	terrainStyle = 'filled',
	heightLow = 20,
	heightHigh = 80,
	noiseScale = 0.012,
	scrollSpeed = 0.8,
	terrainLayers = 3,
	terrainGradient = structuredClone(DEFAULT_GRADIENT),
	terrainAnimate = true,
} = loadProps('terrain-generator');
let terrainOffset = 0;
$: saveProps('terrain-generator', {
	terrainStyle, heightLow, heightHigh,
	noiseScale, scrollSpeed, terrainLayers,
	terrainGradient, terrainAnimate,
});

function sampleGradient(stops, t) {
	let sorted = [...stops].sort((a, b) => a.pos - b.pos);
	t = Math.max(0, Math.min(1, t));
	if (t <= sorted[0].pos) return sorted[0].color;
	if (t >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
	for (let i = 0; i < sorted.length - 1; i++) {
		if (t >= sorted[i].pos && t <= sorted[i + 1].pos) {
			let frac = (t - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos);
			let r1 = parseInt(sorted[i].color.slice(1, 3), 16);
			let g1 = parseInt(sorted[i].color.slice(3, 5), 16);
			let b1 = parseInt(sorted[i].color.slice(5, 7), 16);
			let r2 = parseInt(sorted[i + 1].color.slice(1, 3), 16);
			let g2 = parseInt(sorted[i + 1].color.slice(3, 5), 16);
			let b2 = parseInt(sorted[i + 1].color.slice(5, 7), 16);
			return [
				Math.round(r1 + (r2 - r1) * frac),
				Math.round(g1 + (g2 - g1) * frac),
				Math.round(b1 + (b2 - b1) * frac)
			];
		}
	}
	let c = sorted[0].color;
	return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function terrainSketch(p) {
  let offset = 0;
  let buf;
  let lastParams = '';

  p.setup = () => {
    p.createCanvas(600, 300);
    buf = p.createGraphics(p.width, p.height);
    buf.pixelDensity(1);
  };

  function renderTerrain() {
    let w = buf.width, h = buf.height;
    let hMin = (heightLow / 100) * h;
    let hMax = (heightHigh / 100) * h;

    if (terrainStyle === 'filled' || terrainStyle === 'bars') {
      // pre-compute gradient LUT indexed by y
      let gradLUT = new Array(h);
      for (let y = 0; y < h; y++) {
        gradLUT[y] = sampleGradient(terrainGradient, 1 - y / h);
      }

      buf.loadPixels();
      let px = buf.pixels;
      // fill background (rgb 30)
      for (let i = 0; i < px.length; i += 4) {
        px[i] = 30; px[i+1] = 30; px[i+2] = 30; px[i+3] = 255;
      }

      for (let layer = terrainLayers - 1; layer >= 0; layer--) {
        let layerT = terrainLayers > 1 ? layer / (terrainLayers - 1) : 0;
        let layerSpeed = 0.4 + layerT * 0.6;
        let layerScale = noiseScale * (0.6 + layerT * 0.4);
        let layerAlpha = p.map(layer, 0, Math.max(terrainLayers - 1, 1), 1, 0.24);
        let layerHMin = hMin * (0.3 + layerT * 0.7);
        let layerHMax = hMax * (0.3 + layerT * 0.7);
        let xStep = terrainStyle === 'bars' ? 4 : 1;
        let xWidth = terrainStyle === 'bars' ? 2 : 1;

        for (let x = 0; x < w; x += xStep) {
          let n = p.noise(x * layerScale + offset * layerSpeed * 0.01, layer * 100);
          let surfaceY = Math.floor(h - p.map(n, 0, 1, layerHMin, layerHMax));
          for (let y = Math.max(0, surfaceY); y < h; y++) {
            let [r, g, b] = gradLUT[y];
            let a = layerAlpha;
            for (let dx = 0; dx < xWidth && x + dx < w; dx++) {
              let idx = (y * w + x + dx) * 4;
              px[idx]     = px[idx]     * (1 - a) + r * a;
              px[idx + 1] = px[idx + 1] * (1 - a) + g * a;
              px[idx + 2] = px[idx + 2] * (1 - a) + b * a;
            }
          }
        }
      }
      buf.updatePixels();
    } else {
      buf.background(30);
      for (let layer = terrainLayers - 1; layer >= 0; layer--) {
        let layerT = terrainLayers > 1 ? layer / (terrainLayers - 1) : 0;
        let layerSpeed = 0.4 + layerT * 0.6;
        let layerScale = noiseScale * (0.6 + layerT * 0.4);
        let layerAlpha = p.map(layer, 0, Math.max(terrainLayers - 1, 1), 255, 60);
        let layerHMin = hMin * (0.3 + layerT * 0.7);
        let layerHMax = hMax * (0.3 + layerT * 0.7);

        if (terrainStyle === 'outline') {
          buf.noFill();
          let [r, g, b] = sampleGradient(terrainGradient, 0.5);
          buf.stroke(r, g, b, layerAlpha);
          buf.strokeWeight(1.5);
          buf.beginShape();
          for (let x = 0; x <= w; x += 2) {
            let n = p.noise(x * layerScale + offset * layerSpeed * 0.01, layer * 100);
            let y = h - p.map(n, 0, 1, layerHMin, layerHMax);
            buf.vertex(x, y);
          }
          buf.endShape();
        } else if (terrainStyle === 'dots') {
          buf.noStroke();
          for (let x = 0; x <= w; x += 6) {
            let n = p.noise(x * layerScale + offset * layerSpeed * 0.01, layer * 100);
            let y = h - p.map(n, 0, 1, layerHMin, layerHMax);
            let t = 1 - (y / h);
            let [r, g, b] = sampleGradient(terrainGradient, t);
            buf.fill(r, g, b, layerAlpha);
            let dotSize = p.map(n, 0, 1, 1.5, 4);
            buf.circle(x, y, dotSize);
          }
        }
      }
    }
  }

  p.draw = () => {
    if (terrainAnimate) offset += scrollSpeed;
    terrainOffset = offset;

    let params = `${heightLow},${heightHigh},${noiseScale},${terrainLayers},${terrainStyle},${offset.toFixed(2)},${JSON.stringify(terrainGradient)}`;
    if (params !== lastParams) {
      lastParams = params;
      renderTerrain();
    }

    p.background(30);
    p.image(buf, 0, 0);
  };
}
</script>

Test page for visualization tools and interactive components.

# Particle Emitter

<P5 sketch={particleSketch}>
  <div slot="overlay">
    <div class="p5-readout">
      <span class="p5-readout-label">Particles</span>
      <span class="p5-readout-value">{particleCount}</span>
    </div>
  </div>
  <div class="p5-tabs">
    <button class:active={ptab === 'emitter'} on:click={() => ptab = 'emitter'}>Emitter</button>
    <button class:active={ptab === 'particles'} on:click={() => ptab = 'particles'}>Particles</button>
    <button class:active={ptab === 'physics'} on:click={() => ptab = 'physics'}>Physics</button>
  </div>
  {#if ptab === 'emitter'}
    <Prop name="Position" value={[emitX, emitY]} default={[0.5, 0.75]} reset={() => { emitX = 0.5; emitY = 0.75 }}><div class="p5-inline" style="align-items:stretch;padding:0;border:none"><PositionPad bind:x={emitX} bind:y={emitY} /><div style="display:flex;flex-direction:column;gap:2px;justify-content:center"><NumberInput bind:value={emitX} label="X" color="red" min={0} max={1} precision={2} sensitivity={0.005} /><NumberInput bind:value={emitY} label="Y" color="green" min={0} max={1} precision={2} sensitivity={0.005} /></div></div></Prop>
    <Prop name="Direction" bind:value={emitAngle} default={270}><div class="p5-inline" style="align-items:center;padding:0;border:none"><AnglePicker bind:angle={emitAngle} style="width:3.5em" /><NumberInput bind:value={emitAngle} label="i" color="blue" min={0} max={360} precision={0} sensitivity={1} /></div></Prop>
    <Prop name="Rate" bind:value={rate} default={3}><NumberInput bind:value={rate} label="i" color="blue" min={1} max={15} precision={0} sensitivity={0.5} /></Prop>
    <Prop name="Spread" bind:value={spread} default={30}><NumberInput bind:value={spread} label="i" color="blue" min={1} max={90} precision={0} sensitivity={1} /></Prop>
  {/if}
  {#if ptab === 'particles'}
    <fieldset>
      <legend>Appearance</legend>
      <Prop name="Size" bind:value={psize} default={6}><NumberInput bind:value={psize} label="i" color="blue" min={2} max={20} precision={0} sensitivity={0.5} /></Prop>
      <Prop name="Color" bind:value={pcolor} default={'#fe8019'}><input type="color" bind:value={pcolor} /></Prop>
    </fieldset>
    <fieldset>
      <legend>Lifetime</legend>
      <Prop name="Duration" bind:value={lifetime} default={80}><NumberInput bind:value={lifetime} label="i" color="blue" min={10} max={200} precision={0} sensitivity={1} /></Prop>
      <Prop name="Fade" bind:value={fade} default={true}><input type="checkbox" bind:checked={fade} /></Prop>
    </fieldset>
  {/if}
  {#if ptab === 'physics'}
    <Prop name="Gravity" value={[gravityX, gravityY]} default={[0, 0.08]} reset={() => { gravityX = 0; gravityY = 0.08 }}><VecInput bind:x={gravityX} bind:y={gravityY} min={-0.5} max={0.5} sensitivity={0.005} precision={3} /></Prop>
    <fieldset>
      <legend>Motion</legend>
      <Prop name="Speed" bind:value={initialSpeed} default={3}><NumberInput bind:value={initialSpeed} label="i" color="blue" min={1} max={10} precision={0} sensitivity={0.2} /></Prop>
      <Prop name="Friction" bind:value={friction} default={0.99}><NumberInput bind:value={friction} label="f" color="orange" min={0.9} max={1} precision={3} sensitivity={0.001} /></Prop>
    </fieldset>
  {/if}
</P5>

---

# Bouncing Ball

<P5 {sketch}>
  <Prop name="Speed" bind:value={speed} default={2}><NumberInput bind:value={speed} label="i" color="blue" min={1} max={10} precision={0} sensitivity={0.2} /></Prop>
  <Prop name="Size" bind:value={size} default={20}><NumberInput bind:value={size} label="i" color="blue" min={5} max={80} precision={0} sensitivity={0.5} /></Prop>
  <Prop name="Count" bind:value={count} default={1}><NumberInput bind:value={count} label="i" color="blue" min={1} max={20} precision={0} sensitivity={0.5} /></Prop>
  <Prop name="Color" bind:value={color} default={'#fb4934'}><input type="color" bind:value={color} /></Prop>
  <Prop name="Trail" bind:value={trail} default={true}><input type="checkbox" bind:checked={trail} /></Prop>
  <Prop name="Shape" bind:value={shape} default={'circle'}>
    <div class="p5-radio">
      <label><input type="radio" bind:group={shape} value="circle" /> Circle</label>
      <label><input type="radio" bind:group={shape} value="square" /> Square</label>
      <label><input type="radio" bind:group={shape} value="triangle" /> Triangle</label>
    </div>
  </Prop>
</P5>

---

# Terrain Generator

<P5 sketch={terrainSketch}>
  <div slot="overlay">
    <div class="p5-readout">
      <span class="p5-readout-label">Offset</span>
      <span class="p5-readout-value">{Math.round(terrainOffset)}</span>
    </div>
  </div>
  <Prop name="Style" bind:value={terrainStyle} default={'filled'}>
    <select bind:value={terrainStyle}>
      <option value="filled">Filled</option>
      <option value="outline">Outline</option>
      <option value="dots">Dots</option>
      <option value="bars">Bars</option>
    </select>
  </Prop>
  <Prop name="Height" value={[heightLow, heightHigh]} default={[20, 80]} reset={() => { heightLow = 20; heightHigh = 80 }}><RangeSlider bind:low={heightLow} bind:high={heightHigh} min={0} max={100} step={1} color="aqua" /></Prop>
  <Prop name="Scale" bind:value={noiseScale} default={0.012}><NumberInput bind:value={noiseScale} label="f" color="orange" min={0.001} max={0.05} precision={3} sensitivity={0.0002} /></Prop>
  <Prop name="Speed" bind:value={scrollSpeed} default={0.8}><NumberInput bind:value={scrollSpeed} label="f" color="orange" min={0} max={5} precision={1} sensitivity={0.05} /></Prop>
  <Prop name="Layers" bind:value={terrainLayers} default={3}><NumberInput bind:value={terrainLayers} label="i" color="blue" min={1} max={6} precision={0} sensitivity={0.3} /></Prop>
  <Prop name="Gradient" value={terrainGradient} default={DEFAULT_GRADIENT} reset={() => terrainGradient = structuredClone(DEFAULT_GRADIENT)}><GradientEditor bind:stops={terrainGradient} /></Prop>
  <Prop name="Animate" bind:value={terrainAnimate} default={true}><input type="checkbox" bind:checked={terrainAnimate} /></Prop>
</P5>
