---
title: p5.js Test
date: '17 February 2026'
publish: true
icon: /category/test.png
description: Interactive p5.js sketches running in the browser, integrated with Svelte components.
---
<script>
import P5 from '$lib/components/P5.svelte';
import Timeline from '$lib/components/Timeline.svelte';
import PositionPad from '$lib/components/PositionPad.svelte';
import AnglePicker from '$lib/components/AnglePicker.svelte';
import NumberInput from '$lib/components/NumberInput.svelte';
import RangeSlider from '$lib/components/RangeSlider.svelte';
import VecInput from '$lib/components/VecInput.svelte';
import GradientEditor from '$lib/components/GradientEditor.svelte';
import CurveEditor from '$lib/components/CurveEditor.svelte';
import Dropdown from '$lib/components/Dropdown.svelte';
import Prop from '$lib/components/Prop.svelte';
import { loadProps, saveProps } from '$lib/persist.js';
import { hexToRgb } from '$lib/color.js';
import { sampleCurve } from '$lib/curve.js';

// -- Helpers --
function canvasBg(canvas) {
	let s = getComputedStyle(canvas.parentElement);
	let hex = s.getPropertyValue('--bg').trim();
	return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function canvasWidth(p) {
	return p.canvas?.parentElement?.clientWidth || 600;
}

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
		p.createCanvas(canvasWidth(p), 300);
	};

	p.windowResized = () => {
		p.resizeCanvas(canvasWidth(p), 300);
	};

	p.draw = () => {
		p.clear();

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

		let [pr, pg, pb] = hexToRgb(pcolor);

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
			p.noStroke();
			p.fill(pr, pg, pb, alpha);
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

	let bg;

	p.setup = () => {
		p.createCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
		for (let i = 0; i < count; i++) balls.push(makeBall());
	};

	p.windowResized = () => {
		p.resizeCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
	};

	p.draw = () => {
		if (trail) { p.background(...bg, 25); } else { p.clear(); }

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
$: saveProps('terrain-generator', {
	terrainStyle, heightLow, heightHigh,
	noiseScale, scrollSpeed, terrainLayers,
	terrainGradient, terrainAnimate,
});

function sampleGradient(stops, t) {
	let sorted = [...stops].sort((a, b) => a.pos - b.pos);
	t = Math.max(0, Math.min(1, t));
	if (t <= sorted[0].pos) return hexToRgb(sorted[0].color);
	if (t >= sorted[sorted.length - 1].pos) return hexToRgb(sorted[sorted.length - 1].color);
	for (let i = 0; i < sorted.length - 1; i++) {
		if (t >= sorted[i].pos && t <= sorted[i + 1].pos) {
			let frac = (t - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos);
			let [r1, g1, b1] = hexToRgb(sorted[i].color);
			let [r2, g2, b2] = hexToRgb(sorted[i + 1].color);
			return [
				Math.round(r1 + (r2 - r1) * frac),
				Math.round(g1 + (g2 - g1) * frac),
				Math.round(b1 + (b2 - b1) * frac)
			];
		}
	}
	return hexToRgb(sorted[0].color);
}

// -- Easing visualizer --
const DEFAULT_EASING = [
	{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 0.5, tangentMode: 'mirrored' },
	{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 0.5, tangentOut: 0, tangentMode: 'mirrored' }
];
let {
	easingPoints = structuredClone(DEFAULT_EASING),
	easingDuration = 120,
	easingCount = 5,
	easingTrail = true,
} = loadProps('easing-visualizer');
$: saveProps('easing-visualizer', { easingPoints, easingDuration, easingCount, easingTrail });

function easingSketch(p) {
	let frame = 0;
	let buf;
	let bg;

	function initBuf() {
		if (buf) buf.remove();
		buf = p.createGraphics(p.width, p.height);
		buf.pixelDensity(1);
		buf.background(...bg);
	}

	p.setup = () => {
		p.createCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
		initBuf();
	};

	p.windowResized = () => {
		p.resizeCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
		initBuf();
	};

	p.draw = () => {
		frame++;
		let w = p.width;
		let h = p.height;
		let margin = 30;
		let usableW = w - margin * 2;
		let usableH = h - margin * 2;

		// Fade trail buffer toward bg with guaranteed convergence
		if (easingTrail) {
			buf.loadPixels();
			let px = buf.pixels;
			for (let i = 0; i < px.length; i += 4) {
				let d;
				d = bg[0] - px[i];   if (d) { let s = d >> 3; px[i]   += s || (d > 0 ? 1 : -1); }
				d = bg[1] - px[i+1]; if (d) { let s = d >> 3; px[i+1] += s || (d > 0 ? 1 : -1); }
				d = bg[2] - px[i+2]; if (d) { let s = d >> 3; px[i+2] += s || (d > 0 ? 1 : -1); }
			}
			buf.updatePixels();
		} else {
			buf.background(...bg);
		}

		// Draw objects onto trail buffer
		buf.noStroke();
		for (let i = 0; i < easingCount; i++) {
			let phase = easingCount > 1 ? i / (easingCount - 1) : 0;
			let rawT = ((frame + phase * easingDuration) % (easingDuration * 2)) / easingDuration;
			let t = rawT <= 1 ? rawT : 2 - rawT;
			let eased = sampleCurve(easingPoints, t);
			let x = margin + eased * usableW;
			let y = margin + (i / Math.max(easingCount - 1, 1)) * usableH;
			if (easingCount === 1) y = h / 2;
			let alpha = p.map(i, 0, Math.max(easingCount - 1, 1), 255, 120);
			buf.fill(142, 192, 124, alpha);
			buf.circle(x, y, 10);
		}

		// Composite: buffer + curve reference on top
		p.clear();
		p.image(buf, 0, 0);

		p.stroke(142, 192, 124, 30);
		p.strokeWeight(1);
		p.noFill();
		p.beginShape();
		for (let i = 0; i <= 50; i++) {
			let t = i / 50;
			let val = sampleCurve(easingPoints, t);
			p.vertex(margin + t * usableW, h - margin - val * usableH);
		}
		p.endShape();
	};
}

function terrainSketch(p) {
	let offset = 0;
	let buf;
	let lastParams = '';

	function initBuf() {
		if (buf) buf.remove();
		buf = p.createGraphics(p.width, p.height);
		buf.pixelDensity(1);
		lastParams = '';
	}

	p.setup = () => {
		p.createCanvas(canvasWidth(p), 300);
		initBuf();
	};

	p.windowResized = () => {
		p.resizeCanvas(canvasWidth(p), 300);
		initBuf();
	};

	function renderTerrain() {
		let w = buf.width, h = buf.height;
		let hMin = (heightLow / 100) * h;
		let hMax = (heightHigh / 100) * h;

		if (terrainStyle === 'filled' || terrainStyle === 'bars') {
			let gradLUT = new Array(h);
			for (let y = 0; y < h; y++) {
				gradLUT[y] = sampleGradient(terrainGradient, 1 - y / h);
			}

			buf.loadPixels();
			let px = buf.pixels;
			for (let i = 0; i < px.length; i += 4) {
				px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0;
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
							px[idx + 3] = 255;
						}
					}
				}
			}
			buf.updatePixels();
		} else {
			buf.clear();
			for (let layer = terrainLayers - 1; layer >= 0; layer--) {
				let layerT = terrainLayers > 1 ? layer / (terrainLayers - 1) : 0;
				let layerSpeed = 0.4 + layerT * 0.6;
				let layerScale = noiseScale * (0.6 + layerT * 0.4);
				let layerAlpha = p.map(layer, 0, Math.max(terrainLayers - 1, 1), 255, 60);
				let layerHMin = hMin * (0.3 + layerT * 0.7);
				let layerHMax = hMax * (0.3 + layerT * 0.7);

				if (terrainStyle === 'outline') {
					buf.noFill();
					buf.strokeWeight(1.5);
					let prevX, prevY;
					for (let x = 0; x <= w; x += 2) {
						let n = p.noise(x * layerScale + offset * layerSpeed * 0.01, layer * 100);
						let y = h - p.map(n, 0, 1, layerHMin, layerHMax);
						if (prevX !== undefined) {
							let t = 1 - (((prevY + y) / 2) / h);
							let [r, g, b] = sampleGradient(terrainGradient, t);
							buf.stroke(r, g, b, layerAlpha);
							buf.line(prevX, prevY, x, y);
						}
						prevX = x;
						prevY = y;
					}
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
		let params = `${heightLow},${heightHigh},${noiseScale},${terrainLayers},${terrainStyle},${offset.toFixed(2)},${JSON.stringify(terrainGradient)}`;
		if (params !== lastParams) {
			lastParams = params;
			renderTerrain();
		}

		p.clear();
		p.image(buf, 0, 0);
	};
}

// -- Boids flocking --
const DEFAULT_BOIDS_GRADIENT = [
	{ pos: 0, color: '#458588' },
	{ pos: 0.5, color: '#b8bb26' },
	{ pos: 1, color: '#fb4934' }
];
const DEFAULT_SPEED_CURVE = [
	{ x: 0, y: 0, interpolation: 'cubic', tangentIn: 0, tangentOut: 1, tangentMode: 'mirrored' },
	{ x: 1, y: 1, interpolation: 'cubic', tangentIn: 1, tangentOut: 0, tangentMode: 'mirrored' }
];

let btab = 'rules';
let {
	boidsCount = 120,
	boidSep = 1.5, boidAli = 1.0, boidCoh = 1.0,
	percNear = 25, percFar = 75,
	boidMaxSpeed = 3,
	windAngle = 0, windStrength = 0,
	goalX = 0.5, goalY = 0.5,
	goalMode = 'off',
	goalStrength = 0.5,
	boidSize = 5, boidTrail = true,
	boidGradient = structuredClone(DEFAULT_BOIDS_GRADIENT),
	boidSpeedCurve = structuredClone(DEFAULT_SPEED_CURVE),
} = loadProps('boids');
let boidReadout = 0;
$: saveProps('boids', {
	boidsCount, boidSep, boidAli, boidCoh,
	percNear, percFar, boidMaxSpeed,
	windAngle, windStrength,
	goalX, goalY, goalMode, goalStrength,
	boidSize, boidTrail,
	boidGradient, boidSpeedCurve,
});


function boidsSketch(p) {
	let flock = [];

	function makeBoid() {
		return {
			x: p.random(p.width),
			y: p.random(p.height),
			vx: p.random(-1, 1),
			vy: p.random(-1, 1),
		};
	}

	let bg;

	p.setup = () => {
		p.createCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
		for (let i = 0; i < boidsCount; i++) flock.push(makeBoid());
	};

	p.windowResized = () => {
		p.resizeCanvas(canvasWidth(p), 300);
		bg = canvasBg(p.canvas);
	};

	p.draw = () => {
		if (boidTrail) { p.background(...bg, 25); } else { p.clear(); }

		while (flock.length < boidsCount) flock.push(makeBoid());
		while (flock.length > boidsCount) flock.pop();

		let w = p.width, h = p.height;

		for (let boid of flock) {
			let sepX = 0, sepY = 0;
			let aliX = 0, aliY = 0;
			let cohX = 0, cohY = 0;
			let sepCount = 0, aliCount = 0;

			for (let other of flock) {
				if (other === boid) continue;
				let dx = other.x - boid.x;
				let dy = other.y - boid.y;
				if (dx > w / 2) dx -= w;
				if (dx < -w / 2) dx += w;
				if (dy > h / 2) dy -= h;
				if (dy < -h / 2) dy += h;
				let dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < percNear && dist > 0) {
					sepX -= dx / dist;
					sepY -= dy / dist;
					sepCount++;
				}
				if (dist < percFar) {
					aliX += other.vx;
					aliY += other.vy;
					cohX += dx;
					cohY += dy;
					aliCount++;
				}
			}

			let ax = 0, ay = 0;

			if (sepCount > 0) {
				ax += (sepX / sepCount) * boidSep;
				ay += (sepY / sepCount) * boidSep;
			}
			if (aliCount > 0) {
				ax += (aliX / aliCount - boid.vx) * boidAli;
				ay += (aliY / aliCount - boid.vy) * boidAli;
				ax += (cohX / aliCount) * boidCoh * 0.01;
				ay += (cohY / aliCount) * boidCoh * 0.01;
			}

			ax += Math.cos(windAngle * Math.PI / 180) * windStrength;
			ay += Math.sin(windAngle * Math.PI / 180) * windStrength;

			if (goalMode !== 'off') {
				let gx = goalX * w - boid.x;
				let gy = goalY * h - boid.y;
				if (gx > w / 2) gx -= w;
				if (gx < -w / 2) gx += w;
				if (gy > h / 2) gy -= h;
				if (gy < -h / 2) gy += h;
				let gd = Math.sqrt(gx * gx + gy * gy) || 1;
				let sign = goalMode === 'attract' ? 1 : -1;
				ax += (gx / gd) * goalStrength * sign;
				ay += (gy / gd) * goalStrength * sign;
			}

			boid.vx += ax;
			boid.vy += ay;

			let spd = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
			if (spd > boidMaxSpeed) {
				boid.vx = (boid.vx / spd) * boidMaxSpeed;
				boid.vy = (boid.vy / spd) * boidMaxSpeed;
				spd = boidMaxSpeed;
			}

			boid.x += boid.vx;
			boid.y += boid.vy;

			boid.x = ((boid.x % w) + w) % w;
			boid.y = ((boid.y % h) + h) % h;

			let t = spd / boidMaxSpeed;
			let ct = sampleCurve(boidSpeedCurve, t);
			let [r, g, b] = sampleGradient(boidGradient, ct);
			p.fill(r, g, b);
			p.noStroke();

			let angle = Math.atan2(boid.vy, boid.vx);
			let s = boidSize;
			p.push();
			p.translate(boid.x, boid.y);
			p.rotate(angle);
			p.triangle(s, 0, -s * 0.6, -s * 0.4, -s * 0.6, s * 0.4);
			p.pop();
		}

		boidReadout = flock.length;
	};
}

</script>

Test page for visualization tools and interactive components.

# Timeline

<Timeline
  title="Medieval Software — Full Timeline"
  events={[
    { date: '2023-01-03', label: 'Looking Forward', color: [142, 192, 124], link: '/looking-forward' },
    { date: '2023-01-14', label: 'Devblog 1', color: [131, 165, 152], link: '/rune-synergy-devblog-1' },
    { date: '2023-02-12', label: 'Devblog 2', color: [131, 165, 152], link: '/rune-synergy-devblog-2' },
    { date: '2023-03-18', label: 'Devblog 3', color: [131, 165, 152], link: '/rune-synergy-devblog-3' },
    { date: '2023-04-14', label: 'Blender RS', color: [211, 134, 155], link: '/blender-runescape-part-1' },
    { date: '2023-05-04', label: 'Devblog 4', color: [131, 165, 152], link: '/rune-synergy-devblog-4' },
    { date: '2023-06-01', label: 'Devblog 5', color: [131, 165, 152], link: '/rune-synergy-devblog-5' },
    { date: '2023-07-17', label: 'Devblog 6', color: [131, 165, 152], link: '/rune-synergy-devblog-6' },
    { date: '2023-10-03', label: 'Fall Cleaning', color: [250, 189, 47], link: '/fall-cleaning' },
    { date: '2023-12-01', label: 'Devblog 7', color: [131, 165, 152], link: '/rune-synergy-devblog-7' },
    { date: '2024-03-01', label: 'Moved', color: [250, 189, 47], detail: 'Relocated for contract' },
    { date: '2024-03-29', label: 'Quit contract', color: [251, 73, 52], detail: 'Stuck renting for a year' },
    { date: '2024-06-25', label: 'SSD failure', color: [251, 73, 52], detail: 'Data loss, RuneBlend lost traction' },
    { date: '2024-07-31', label: 'Ebitengine', color: [184, 187, 38], detail: 'Completed engine migration' },
    { date: '2024-09-30', label: 'Devblog 8', color: [131, 165, 152], link: '/rune-synergy-devblog-8' },
    { date: '2024-12-13', label: 'Discontinued', color: [251, 73, 52], link: '/rune-synergy-discontinued' },
    { date: '2025-01-24', label: 'Disney World', color: [142, 192, 124], detail: 'Orlando, FL' },
    { date: '2025-02-28', label: 'Moved', color: [250, 189, 47] },
    { date: '2026-02-11', label: 'Moved again', color: [250, 189, 47] },
    { date: '2025-03-14', label: 'Started classes', color: [250, 189, 47] },
    { date: '2025-07-28', label: 'Dropped out', color: [254, 128, 25], detail: 'Online classes weren\'t for me' },
  ]}
  spans={[
    { start: '2023-01-03', end: '2023-07-17', label: 'Active devblog era', color: [131, 165, 152], detail: 'Regular devblogs every 4-6 weeks', group: 'dev' },
    { start: '2023-03-18', end: '2023-04-28', label: 'Blender & RuneScape', color: [211, 134, 155], detail: 'Models & animations tooling' },
    { start: '2023-07-17', end: '2023-12-01', label: 'Silent period', color: [146, 131, 116], detail: 'UE5 experiment, continued dev without blogging', group: 'dev' },
    { start: '2023-12-01', end: '2024-03-01', label: 'Heads-down dev', color: [142, 192, 124], detail: 'Active development, no public updates', group: 'dev' },
    { start: '2024-03-01', end: '2024-03-29', label: 'Contract', color: [184, 187, 38], detail: 'Full-time, quit after 4 weeks', group: 'contracts' },
    { start: '2024-06-01', end: '2024-06-25', label: 'RuneBlend', color: [211, 134, 155], detail: 'Blender plugin with IPC for realtime RS model preview' },
    { start: '2024-07-01', end: '2024-12-13', label: 'Rune Synergy full-time', color: [142, 192, 124], detail: 'Back to full-time dev after Ebitengine migration', group: 'dev' },
    { start: '2025-01-24', end: '2025-01-31', label: 'Disney World', color: [142, 192, 124], detail: 'Orlando, FL' },
    { start: '2025-02-01', end: '2025-02-28', label: 'Preparing to move', color: [146, 131, 116] },
    { start: '2025-03-14', end: '2025-05-09', label: 'Spring semester', color: [250, 189, 47], detail: '8-week accelerated course', group: 'school' },
    { start: '2025-05-19', end: '2025-07-28', label: 'Summer semester', color: [250, 189, 47], detail: 'Second and final semester', group: 'school' },
    { start: '2025-08-27', end: '2025-10-30', label: 'Contract #1', color: [184, 187, 38], detail: 'Full-time contract', group: 'contracts' },
    { start: '2025-10-22', end: '2025-11-20', label: 'Contract #2', color: [184, 187, 38], detail: 'Full-time contract', group: 'contracts' },
    { start: '2025-10-05', end: 'today', label: 'Caretaking', color: [211, 134, 155], detail: 'Partner\'s medical episodes' },
    { start: '2026-02-01', end: 'today', label: 'Unpacking', color: [146, 131, 116], detail: 'Still going...' },
  ]}
/>


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
    <Prop name="Position" tip="Emitter location on the canvas" value={[emitX, emitY]} default={[0.5, 0.75]} reset={() => { emitX = 0.5; emitY = 0.75 }}><div class="p5-inline" style="align-items:stretch;padding:0;border:none"><PositionPad bind:x={emitX} bind:y={emitY} /><div style="display:flex;flex-direction:column;gap:2px;justify-content:center"><NumberInput bind:value={emitX} label="X" color="red" min={0} max={1} precision={2} sensitivity={0.005} /><NumberInput bind:value={emitY} label="Y" color="green" min={0} max={1} precision={2} sensitivity={0.005} /></div></div></Prop>
    <Prop name="Direction" tip="Angle particles are emitted toward" bind:value={emitAngle} default={270}><div class="p5-inline" style="align-items:center;padding:0;border:none"><AnglePicker bind:angle={emitAngle} style="width:3.5em" /><NumberInput bind:value={emitAngle} label="i" color="blue" min={0} max={360} precision={0} sensitivity={1} /></div></Prop>
    <Prop name="Rate" tip="Particles spawned per frame" bind:value={rate} default={3}><NumberInput bind:value={rate} label="i" color="blue" min={1} max={15} precision={0} sensitivity={0.5} /></Prop>
    <Prop name="Spread" tip="Random cone angle around the direction" bind:value={spread} default={30}><NumberInput bind:value={spread} label="i" color="blue" min={1} max={90} precision={0} sensitivity={1} /></Prop>
  {/if}
  {#if ptab === 'particles'}
    <fieldset>
      <legend>Appearance</legend>
      <Prop name="Size" tip="Diameter of each particle" bind:value={psize} default={6}><NumberInput bind:value={psize} label="i" color="blue" min={2} max={20} precision={0} sensitivity={0.5} /></Prop>
      <Prop name="Color" tip="Particle fill color" bind:value={pcolor} default={'#fe8019'}><input type="color" bind:value={pcolor} /></Prop>
    </fieldset>
    <fieldset>
      <legend>Lifetime</legend>
      <Prop name="Duration" tip="Frames before a particle dies" bind:value={lifetime} default={80}><NumberInput bind:value={lifetime} label="i" color="blue" min={10} max={200} precision={0} sensitivity={1} /></Prop>
      <Prop name="Fade" tip="Fade opacity over lifetime" bind:value={fade} default={true}><input type="checkbox" bind:checked={fade} /></Prop>
    </fieldset>
  {/if}
  {#if ptab === 'physics'}
    <Prop name="Gravity" tip="Constant force applied each frame" value={[gravityX, gravityY]} default={[0, 0.08]} reset={() => { gravityX = 0; gravityY = 0.08 }}><VecInput bind:x={gravityX} bind:y={gravityY} min={-0.5} max={0.5} sensitivity={0.005} precision={3} /></Prop>
    <fieldset>
      <legend>Motion</legend>
      <Prop name="Speed" tip="Initial velocity when emitted" bind:value={initialSpeed} default={3}><NumberInput bind:value={initialSpeed} label="i" color="blue" min={1} max={10} precision={0} sensitivity={0.2} /></Prop>
      <Prop name="Friction" tip="Velocity multiplier per frame (1 = none)" bind:value={friction} default={0.99}><NumberInput bind:value={friction} label="f" color="orange" min={0.9} max={1} precision={3} sensitivity={0.001} /></Prop>
    </fieldset>
  {/if}
</P5>


# Bouncing Ball

<P5 {sketch}>
  <Prop name="Speed" tip="Movement speed multiplier" bind:value={speed} default={2}><NumberInput bind:value={speed} label="i" color="blue" min={1} max={10} precision={0} sensitivity={0.2} /></Prop>
  <Prop name="Size" tip="Ball diameter in pixels" bind:value={size} default={20}><NumberInput bind:value={size} label="i" color="blue" min={5} max={80} precision={0} sensitivity={0.5} /></Prop>
  <Prop name="Count" tip="Number of bouncing balls" bind:value={count} default={1}><NumberInput bind:value={count} label="i" color="blue" min={1} max={20} precision={0} sensitivity={0.5} /></Prop>
  <Prop name="Color" tip="Ball fill color" bind:value={color} default={'#fb4934'}><input type="color" bind:value={color} /></Prop>
  <Prop name="Trail" tip="Leave fading motion trail" bind:value={trail} default={true}><input type="checkbox" bind:checked={trail} /></Prop>
  <Prop name="Shape" tip="Geometry used for each ball" bind:value={shape} default={'circle'}>
    <div class="p5-radio">
      <label><input type="radio" bind:group={shape} value="circle" /> Circle</label>
      <label><input type="radio" bind:group={shape} value="square" /> Square</label>
      <label><input type="radio" bind:group={shape} value="triangle" /> Triangle</label>
    </div>
  </Prop>
</P5>


# Terrain Generator

<P5 sketch={terrainSketch}>
  <Prop name="Style" tip="Rendering mode for the terrain" bind:value={terrainStyle} default={'filled'}>
    <Dropdown bind:value={terrainStyle} options={[
      { value: 'filled', label: 'Filled' },
      { value: 'outline', label: 'Outline' },
      { value: 'dots', label: 'Dots' },
      { value: 'bars', label: 'Bars' },
    ]} />
  </Prop>
  <Prop name="Height" tip="Min and max terrain height range" value={[heightLow, heightHigh]} default={[20, 80]} reset={() => { heightLow = 20; heightHigh = 80 }}><RangeSlider bind:low={heightLow} bind:high={heightHigh} min={0} max={100} step={1} color="aqua" /></Prop>
  <Prop name="Scale" tip="Perlin noise frequency — higher is bumpier" bind:value={noiseScale} default={0.012}><NumberInput bind:value={noiseScale} label="f" color="orange" min={0.001} max={0.05} precision={3} sensitivity={0.0002} /></Prop>
  <Prop name="Speed" tip="Horizontal scroll rate" bind:value={scrollSpeed} default={0.8}><NumberInput bind:value={scrollSpeed} label="f" color="orange" min={0} max={5} precision={1} sensitivity={0.05} /></Prop>
  <Prop name="Layers" tip="Parallax depth layers" bind:value={terrainLayers} default={3}><NumberInput bind:value={terrainLayers} label="i" color="blue" min={1} max={6} precision={0} sensitivity={0.3} /></Prop>
  <Prop name="Gradient" tip="Color ramp mapped to elevation" value={terrainGradient} default={DEFAULT_GRADIENT} reset={() => terrainGradient = structuredClone(DEFAULT_GRADIENT)}><GradientEditor bind:stops={terrainGradient} /></Prop>
  <Prop name="Animate" tip="Auto-scroll the terrain" bind:value={terrainAnimate} default={true}><input type="checkbox" bind:checked={terrainAnimate} /></Prop>
</P5>


# Easing Visualizer

<P5 sketch={easingSketch}>
  <Prop name="Curve" tip="Easing function shape" value={easingPoints} default={DEFAULT_EASING} reset={() => easingPoints = structuredClone(DEFAULT_EASING)}>
    <CurveEditor bind:points={easingPoints} color="aqua" />
  </Prop>
  <Prop name="Duration" tip="Frames per animation cycle" bind:value={easingDuration} default={120}>
    <NumberInput bind:value={easingDuration} label="i" color="blue" min={30} max={600} precision={0} sensitivity={2} />
  </Prop>
  <Prop name="Objects" tip="Number of animated dots" bind:value={easingCount} default={5}>
    <NumberInput bind:value={easingCount} label="i" color="blue" min={1} max={20} precision={0} sensitivity={0.5} />
  </Prop>
  <Prop name="Trail" tip="Leave fading motion trail" bind:value={easingTrail} default={true}>
    <input type="checkbox" bind:checked={easingTrail} />
  </Prop>
</P5>


# Boids Flocking

<P5 sketch={boidsSketch}>
  <div slot="overlay">
    <div class="p5-readout">
      <span class="p5-readout-label">Boids</span>
      <span class="p5-readout-value">{boidReadout}</span>
    </div>
  </div>
  <div class="p5-tabs">
    <button class:active={btab === 'rules'} on:click={() => btab = 'rules'}>Rules</button>
    <button class:active={btab === 'forces'} on:click={() => btab = 'forces'}>Forces</button>
    <button class:active={btab === 'style'} on:click={() => btab = 'style'}>Style</button>
  </div>
  {#if btab === 'rules'}
    <Prop name="Separation" tip="Steer away from nearby boids" bind:value={boidSep} default={1.5}><NumberInput bind:value={boidSep} label="f" color="orange" min={0} max={5} precision={2} sensitivity={0.05} /></Prop>
    <Prop name="Alignment" tip="Match heading of neighbors" bind:value={boidAli} default={1.0}><NumberInput bind:value={boidAli} label="f" color="orange" min={0} max={5} precision={2} sensitivity={0.05} /></Prop>
    <Prop name="Cohesion" tip="Steer toward flock center" bind:value={boidCoh} default={1.0}><NumberInput bind:value={boidCoh} label="f" color="orange" min={0} max={5} precision={2} sensitivity={0.05} /></Prop>
    <Prop name="Perception" tip="Near radius for separation, far for alignment and cohesion" value={[percNear, percFar]} default={[25, 75]} reset={() => { percNear = 25; percFar = 75 }}><RangeSlider bind:low={percNear} bind:high={percFar} min={5} max={100} step={1} color="aqua" /></Prop>
  {/if}
  {#if btab === 'forces'}
    <Prop name="Wind" tip="Global directional force on all boids" value={[windAngle, windStrength]} default={[0, 0]} reset={() => { windAngle = 0; windStrength = 0 }}><div class="p5-inline" style="align-items:center;padding:0;border:none"><AnglePicker bind:angle={windAngle} style="width:3.5em" /><NumberInput bind:value={windStrength} label="f" color="orange" min={0} max={0.5} precision={3} sensitivity={0.005} /></div></Prop>
    <Prop name="Goal" tip="Attract or repel boids toward a point" value={[goalX, goalY, goalMode, goalStrength]} default={[0.5, 0.5, 'off', 0.5]} reset={() => { goalX = 0.5; goalY = 0.5; goalMode = 'off'; goalStrength = 0.5 }}>
      <div class="p5-inline" style="align-items:stretch;padding:0;border:none">
        <PositionPad bind:x={goalX} bind:y={goalY} />
        <div style="display:flex;flex-direction:column;gap:4px;justify-content:center">
          <div class="p5-radio">
            <label><input type="radio" bind:group={goalMode} value="off" /> Off</label>
            <label><input type="radio" bind:group={goalMode} value="attract" /> Attract</label>
            <label><input type="radio" bind:group={goalMode} value="repel" /> Repel</label>
          </div>
          <NumberInput bind:value={goalStrength} label="f" color="orange" min={0} max={1} precision={2} sensitivity={0.02} />
        </div>
      </div>
    </Prop>
  {/if}
  {#if btab === 'style'}
    <Prop name="Count" tip="Total boids in the flock" bind:value={boidsCount} default={120}><NumberInput bind:value={boidsCount} label="i" color="blue" min={1} max={200} precision={0} sensitivity={1} /></Prop>
    <Prop name="Size" tip="Triangle size for each boid" bind:value={boidSize} default={5}><NumberInput bind:value={boidSize} label="i" color="blue" min={2} max={12} precision={0} sensitivity={0.3} /></Prop>
    <Prop name="Max Speed" tip="Velocity cap for each boid" bind:value={boidMaxSpeed} default={3}><NumberInput bind:value={boidMaxSpeed} label="f" color="orange" min={1} max={10} precision={1} sensitivity={0.1} /></Prop>
    <Prop name="Trail" tip="Leave fading motion trail" bind:value={boidTrail} default={true}><input type="checkbox" bind:checked={boidTrail} /></Prop>
    <Prop name="Colors" tip="Color ramp mapped to speed" value={boidGradient} default={DEFAULT_BOIDS_GRADIENT} reset={() => boidGradient = structuredClone(DEFAULT_BOIDS_GRADIENT)}><GradientEditor bind:stops={boidGradient} /></Prop>
    <Prop name="Speed Curve" tip="Remaps speed to gradient position" value={boidSpeedCurve} default={DEFAULT_SPEED_CURVE} reset={() => boidSpeedCurve = structuredClone(DEFAULT_SPEED_CURVE)}><CurveEditor bind:points={boidSpeedCurve} color="aqua" /></Prop>
  {/if}
</P5>

