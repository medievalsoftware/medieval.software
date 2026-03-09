# Roadmap

## Components

### Existing
- **Timeline** — interactive time-based event/span visualization (p5.js)
- **Waveform** — audio waveform with zoom/pan/selection, filled envelope rendering (canvas)
- **CurveEditor** — bezier curve editor with tangent handles (SVG)
- **GradientEditor** — color gradient stop editor
- **Slider** — single-value and range slider
- **NumberInput** — draggable number input with optional embedded slider
- **PositionPad** — 2D XY input
- **AnglePicker** — rotary angle input
- **VecInput** — paired XY number inputs
- **Dropdown** — styled select replacement
- **Prop** — labeled property row with dirty tracking and reset

### Planned
- **Sparkline** — minimal inline chart (subset of Waveform: fixed viewport, no interaction, just the filled envelope)
- **Histogram** — distribution bars, probably canvas
- **FlameChart** — stacked horizontal bars for profiling/timing data, canvas with zoom/pan, descending (icicle) layout. Recycle heavily from Timeline: horizontal zoom/pan, pinch handling with touch lock detection, animated viewport with lerp, stacked bar rendering with hit-testing/hover. Key differences from Timeline: tree-based data model (parent width = sum of children), depth-based vertical stacking instead of time-based positioning, search/highlight by function name.

### Future
- **NodeGraph** — draggable nodes with connections, canvas with zoom/pan (signal flow, state machines, etc.)

### Ideas (not committed)
- Spectrogram / heatmap
- Scatter plot
- Radar / spider chart
- Gauge / arc meter
- Treemap
- Bar chart
- Color wheel
