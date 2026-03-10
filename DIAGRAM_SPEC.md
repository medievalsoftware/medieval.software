# Diagram Component — Specification

Interactive technical diagrams for embedding in blog posts. Schematic-style, grid-snapped, SVG-rendered.

## Modes

- **Viewer** — read-only interactive view embedded in blog posts. No toolbars or chrome.
- **Editor** — desktop-only authoring environment. Produces JSON consumed by the viewer.

---

## Visual Design

Dark-themed, dense, technical. Cross between an electrical schematic and a system architecture diagram.

- Nodes are labeled boxes with typed ports on their edges.
- Edges are orthogonal (Manhattan-routed) with right-angle bends.
- Everything snaps to a fixed grid.
- Annotations are dashed-border callouts anchored to nodes.

---

## Grid System

- Base grid unit (e.g., 16px or 24px) defined per diagram.
- All positions, sizes, and offsets stored as grid-unit multiples.
- Resolution-independent: rendering multiplies grid units by current unit size.

Snap to grid in graph space:

```
snappedX = Math.round(graphX / gridUnit) * gridUnit
```

---

## Rendering

SVG-based. Nodes, edges, and annotations are SVG elements.

- DOM overlays for tooltips/popovers (positioned via shared tooltip system, rendered above SVG).
- `<foreignObject>` for multi-line node labels only if wrapping or rich formatting is needed. Prefer plain SVG `<text>` for single-line labels (more predictable cross-browser).

### Z-Ordering

SVG has no z-index. Layering via document order:

1. Edges (bottom)
2. Nodes
3. Annotations
4. Selected/highlighted edges (promoted to top via element reordering or overlay `<g>`)

---

## Data Model

Schema version starts at `0` (unstable). Moves to `1` when the format stabilizes.

### Diagram (root)

```
{
  version: 0
  gridUnit: number         // pixels per grid unit
  nodes: Node[]
  edges: Edge[]
  annotations: Annotation[]
  animations?: AnimationSequence[]
}
```

### Node

```
{
  id: string
  type: string              // 'streamer' | 'mixer' | 'container' | 'external'
  label: string
  position: [x, y]         // grid units
  size: [w, h]             // grid units
  ports: Port[]
  children?: string[]      // IDs of child processor nodes (rendered inline)
  metadata: {
    description?: string
    tooltip?: string
    [key: string]: any
  }
}
```

### Port

```
{
  id: string
  side: 'top' | 'right' | 'bottom' | 'left'
  offset: number           // grid units along the side
  dataType?: string        // for display/validation
  label?: string
}
```

### Edge

```
{
  id: string
  type: 'default' | 'switch'
  sourcePort: string       // port ID
  targetPort: string       // port ID
  label?: string
  cardinality?: string     // e.g., '1', '0 or more'
  waypoints?: [x, y][]    // grid units, manual routing overrides
  switchState?: boolean    // only for type: 'switch'
}
```

### Annotation

```
{
  id: string
  content: string          // rich text / markdown
  anchorNode: string       // node ID
  offset: [dx, dy]        // grid units, relative to anchor node position
  style?: 'dashed'
}
```

### AnimationSequence

```
{
  id: string
  steps: [
    { targets: string[], class: string, delay: number }
  ]
}
```

---

## Node Types

| Type | Description | Visual | Examples |
|------|-------------|--------|----------|
| `streamer` | Processing node with internal child blocks | Larger box with inline processor sub-blocks | Song Streamer, Jingle Streamer |
| `processor` | Small inline block within a streamer | Compact, rendered inside parent | Fader, Panner, Volume |
| `mixer` | Aggregation node | Standard box | Music Mixer, Master Mixer |
| `container` | Visual grouping, no flow semantics | Dashed or subtle border | Global State, API |
| `external` | System boundary / external reference | Distinct style (rounded, different stroke) | Audio Device, URL |

### Nested Nodes (streamer → processor)

- Child processor positions are relative to the parent streamer.
- Layout: horizontal strip within the streamer body (auto-flowed, not manually positioned).
- Only the parent streamer has external ports. Child processors are internal detail.
- Dragging a streamer moves all its children.

---

## Edge Routing

Simple Manhattan routing. No obstacle avoidance.

- Edges exit ports perpendicular to the node face for one grid unit.
- Route with L-bend (one turn) or Z-bend (two turns) to reach the target.
- Manual override: users can add/drag waypoints. Once manually adjusted, waypoints are stored and auto-routing is bypassed for that edge.
- No shared corridor spacing (edges may overlap when running parallel).

---

## Switch Components

Special edge type with an inline open/closed electrical switch visual.

### Visual
- **Closed:** continuous line with pivot and contact circles.
- **Open:** angled lever (~30° rotation) creating a visible gap.
- **Animated transition** via CSS `rotate` on the lever element.

### Behavior
- Toggle via click (viewer) or property panel (editor).
- Open state visually breaks the connection.
- Open state blocks flow animation propagation past the switch.

---

## Viewer Interaction

### Minimal UI
- No toolbars. The diagram is the UI.
- Ctrl+scroll hint on first hover (uses shared ScrollHint component).
- Reset-view button: small, corner-positioned, returns to initial fit view.

### Viewport
- Width fills parent container. Height is configurable per embed.
- Initial view: fit-to-content — scale so all nodes are visible within the container bounds, preserving aspect ratio.
- Pan: click-drag on canvas background.
- Zoom: Ctrl+scroll (mouse), pinch (touch). Plain scroll passes through to the page.
- Inertia on pan (reuse canvasInteraction.js).

### Coordinate Conversion

Pan/zoom uses a `transform` on a wrapping `<g>`:

```
graphX = (screenX - panX) / zoom
graphY = (screenY - panY) / zoom
```

### Tooltips and Popovers
- Hover on node/edge → `use:tooltip` action shows metadata in a positioned overlay.
- Click on node → `<Popover>` component shows deeper detail (descriptions, code, links).
- Both use `floating.js` for positioning above the SVG layer.

### Path Highlighting
- Hover or click a node/edge → full connected chain highlights via BFS traversal.
- Visual: CSS class toggle for glow, color shift, or stroke-width increase.

### Flow Animation
- Triggered by buttons (embedded in page or diagram).
- Marching dashes via `stroke-dasharray` + `stroke-dashoffset` CSS animation.
- Direction: negative dashoffset = forward, positive = reverse.

### Animation Orchestration
- Declarative step sequences. JS toggles classes on a schedule, CSS handles visuals.
- Switches in open state gate flow propagation (skip steps past an open switch).

---

## Editor Interaction (Desktop Only)

### Node Authoring
- Node palette (sidebar/dropdown) with domain-specific types.
- Click or drag from palette to place. Position snaps to grid.
- Drag to reposition. Snaps to grid.

### Port Wiring
- Click output port → drag to input port → create edge.
- Temporary edge follows cursor during drag.

### Property Editing
- Click node/edge/annotation → side panel with editable fields.
- Node: label, description, tooltip, port config, metadata.
- Edge: label, cardinality, type, switch state.
- Annotation: content, anchor node.

### Waypoint Editing
- Click edge to select → reveal draggable waypoint handles.
- Click on segment to insert waypoint.
- Drag waypoint or delete via keyboard.

### Selection
- Click to select single element.
- Marquee drag to select multiple.
- Shift+click to add/remove from selection.

### Keyboard Shortcuts
- `Delete`/`Backspace` — delete selected
- `Ctrl+D` — duplicate selected
- Arrow keys — nudge selection by one grid unit
- `Escape` — deselect all
- `Ctrl+Z` / `Ctrl+Shift+Z` — undo/redo
- `Ctrl+C` / `Ctrl+V` — copy/paste within diagram

### Undo/Redo
- Command stack from day one.
- Every mutation (move, create, delete, property change) is a reversible command.

### Persistence
- Full diagram state serializes to a single JSON file (the data model above).
- Editor loads/saves this JSON. The JSON blob is the contract between editor and viewer.

---

## Embedding

### Viewer Component

```svelte
<Diagram data={diagramJson} height="450px" />
```

- `data` — the diagram JSON blob.
- `height` — container height (CSS value). Width fills parent.
- Self-contained. No external toolbar or UI dependencies.
- Does not interfere with page scrolling.

---

## CSS Animation Reference

```css
/* Flow forward */
.edge.flowing-forward path {
  stroke-dasharray: 8 4;
  animation: flow-forward 0.5s linear infinite;
}
@keyframes flow-forward {
  to { stroke-dashoffset: -12; }
}

/* Flow reverse */
.edge.flowing-reverse path {
  stroke-dasharray: 8 4;
  animation: flow-reverse 0.5s linear infinite;
}
@keyframes flow-reverse {
  to { stroke-dashoffset: 12; }
}

/* Active/highlighted */
.edge path {
  stroke: var(--bg3);
  transition: stroke 0.3s, stroke-width 0.3s;
}
.edge.active path {
  stroke: var(--aqua);
  stroke-width: 3px;
}

/* Switch lever */
.switch line.lever {
  transform-origin: 0 0;
  transition: rotate 0.2s;
}
.switch.open line.lever {
  rotate: -30deg;
}
```
