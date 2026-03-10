# Roadmap

## Components

### Existing
- **Timeline** — interactive time-based event/span visualization (canvas)
- **Waveform** — audio waveform with zoom/pan/selection, filled envelope rendering (canvas)
- **CurveEditor** — bezier curve editor with tangent handles (SVG)
- **GradientEditor** — color gradient stop editor with OkLab interpolation
- **Slider** — single-value and range slider
- **NumberInput** — draggable number input with optional embedded slider
- **PositionPad** — 2D XY input
- **AnglePicker** — rotary angle input with configurable snap
- **VecInput** — paired XY number inputs
- **Dropdown** — styled select replacement
- **Prop** — labeled property row with dirty tracking and reset
- **FlameChart** — stacked horizontal bars for profiling/timing data, canvas with zoom/pan, descending icicle layout, click-to-zoom, search/highlight, hover tooltips
- **Sparkline** — minimal inline chart, filled envelope or stroke, optional hover crosshair (canvas)
- **ScrollHint** — reusable slot wrapper for Ctrl+scroll overlay hint

### Shared Utilities
- **canvasInteraction.js** — scroll hint state, inertia tracking, wheel guard (used by FlameChart, Waveform, Timeline)

### Planned
- **Histogram** — distribution bars, probably canvas

### In Progress
- **Diagram** — interactive technical diagrams for blog posts (SVG). See [DIAGRAM_SPEC.md](DIAGRAM_SPEC.md).

### Ideas (not committed)
- Spectrogram / heatmap
- Scatter plot
- Radar / spider chart
- Gauge / arc meter
- Treemap
- Bar chart
- Color wheel

---

## Infrastructure

### Floating UI / Tooltip System

Current state: five different tooltip/popover patterns across the codebase — CSS `[data-tooltip]` pseudo-elements, a basic `tooltip.js` action, portaled tips in Prop.svelte, a portaled popover in P5.svelte, and canvas-drawn tooltips in FlameChart/Timeline/Sparkline. No shared positioning logic.

Canvas-drawn tooltips stay as-is (they render in the canvas context). The DOM-based patterns get unified into:

```
src/lib/floating.js          — positioning math (placement, flip, shift, arrow offset)
src/lib/actions/tooltip.js    — use:tooltip action for hover text (replaces tooltip.js, [data-tooltip], title attrs)
src/lib/components/Popover.svelte — click-triggered interactive panel (replaces P5 popover, Prop tip)
```

**`floating.js`** — pure positioning utility. Given a target rect, floating rect, and preferred placement, returns `{ x, y, placement, arrowOffset }`. Handles viewport clamping and flip/shift. No DOM, no framework — just math. Shared by both the action and the component.

**`use:tooltip`** — Svelte action for the common case (80% of tooltips). Terse: `use:tooltip={"text"}`. Creates/destroys a portaled DOM element on hover/focus. Non-interactive (pointer-events: none). Optional show delay. Replaces `tooltip.js`, `tooltip.scss`, `[data-tooltip]`, `title` attributes, and Prop's custom tip.

**`<Popover>`** — Svelte component for interactive floating content. Click-triggered, slot-based, with dismiss on click-outside or Escape. Replaces P5's corner popover. Used by the Diagram component for node detail views.

Replaces:
- `src/lib/tooltip.js` (basic action)
- `src/lib/styles/tooltip.scss` (CSS pseudo-element)
- `[data-tooltip]` attributes across templates
- `title` attributes on P5/Prop buttons
- Portaled tip in Prop.svelte
- Portaled popover in P5.svelte

### Floating Tokens

Defined in `gruvbox.scss` alongside the existing theme. Both `use:tooltip` and `<Popover>` reference these so all floating elements stay consistent. Canvas-drawn tooltips stay as-is (they read theme vars directly in JS).

```css
:root {
  /* Floating element shared tokens */
  --floating-bg: var(--bg1);
  --floating-text: var(--fg2);
  --floating-text-dim: var(--fg4);
  --floating-border: var(--bg3);
  --floating-radius: var(--radius);     /* 0.4rem */
  --floating-arrow: 5px;
  --floating-z: 10000;
}
```

**Shared (tooltip + popover):**

| Property | Value |
|----------|-------|
| Background | `var(--floating-bg)` |
| Text | `var(--floating-text)` |
| Secondary text | `var(--floating-text-dim)` |
| Border | `1px solid var(--floating-border)` |
| Border radius | `var(--floating-radius)` |
| Arrow size | `var(--floating-arrow)` |
| Arrow color | `var(--floating-bg)` |
| Z-index | `var(--floating-z)` |
| Shadow | none (border provides separation) |
| Animation | `0.12s ease-out` fade + 2px translateY |
| Font family | inherit |

**Tooltip** (`use:tooltip`):

| Property | Value |
|----------|-------|
| Font size | `0.75rem` |
| Line height | `1.4` |
| Padding | `0.3rem 0.5rem` |
| Max width | `200px` |
| Pointer events | `none` |
| White space | `normal` (wraps within max-width) |

**Popover** (`<Popover>`):

| Property | Value |
|----------|-------|
| Font size | `0.85rem` |
| Line height | `1.5` |
| Padding | `0.5rem 0.75rem` |
| Max width | `320px` |
| Pointer events | `auto` |

---

## Diagram Component

Interactive technical diagrams embedded in blog posts. Schematic-style, grid-snapped, SVG-rendered. Two modes: viewer (ships in posts) and editor (desktop-only authoring tool).

Full spec: [DIAGRAM_SPEC.md](DIAGRAM_SPEC.md)

### Build Order

**Phase 0 — Prerequisites**
- [ ] Floating UI / tooltip system (shared across all components)

**Phase 1 — Static Viewer**
- [ ] Data model + JSON schema (version: 0)
- [ ] SVG rendering: nodes, ports, labels
- [ ] Edge rendering with simple Manhattan routing (L/Z bends, no obstacle avoidance)
- [ ] Annotations (dashed-border callouts anchored to nodes)
- [ ] Node type styling (streamer, mixer, container, external)

**Phase 2 — Interactive Viewer**
- [ ] Pan/zoom (transform on wrapping `<g>`, Ctrl+scroll gating via canvasInteraction.js)
- [ ] Fit-to-content initial viewport (scale to show all nodes within container bounds)
- [ ] Tooltips on hover (uses shared tooltip system)
- [ ] Popovers on click (deeper detail, code snippets)
- [ ] Path highlighting on hover/click (BFS traversal)
- [ ] Reset-view button

**Phase 3 — Animation**
- [ ] Flow animation (marching dashes via stroke-dasharray/dashoffset)
- [ ] Switch components (open/closed toggle, CSS rotate transition)
- [ ] Animation orchestration (declarative step sequences, switch gating)

**Phase 4 — Editor (desktop only)**
- [ ] Undo/redo (command stack, from day one)
- [ ] Node palette + grid-snapped placement
- [ ] Drag to reposition nodes
- [ ] Port wiring (click-drag between ports)
- [ ] Property panel (node/edge/annotation fields)
- [ ] Edge waypoint editing (insert, drag, delete)
- [ ] Annotation authoring (place, anchor to node, drag offset)
- [ ] Multi-select + marquee selection
- [ ] Keyboard shortcuts (delete, duplicate, arrow nudge, Escape)
- [ ] Copy/paste within diagram
- [ ] JSON export/import
