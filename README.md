# Perler Beads Pattern Generator

Turn any image into a beadable pixel-grid pattern — then automatically shrink
it to the smallest bead output that still looks right. Upload an image, hit
**Auto-optimize size**, paint overrides directly on the canvas, and export a
print-ready blueprint.

Fully static — no build step, no dependencies, no server. Open `index.html`
in any browser, including from `file://`.

## Highlights

- **Auto-optimize engine** (`js/optimizer.js`) — searches grid sizes × color
  cluster counts around the 100% baseline and picks the smallest bead output
  whose fidelity (mean + 90th-percentile ΔE2000 vs a full-fidelity reference
  pattern) stays inside your quality tolerance. One slider: Smallest ↔ Best.
- **Compression passes** — k-means++ clustering in CIE Lab, plus merging of
  near-identical bead colors (ΔE < 2) to cut the shopping list invisibly.
- **White-background cutout** — border-connected flood fill, so white sprite
  bodies (bunnies…) survive while the page background disappears.
- **Feature-safe despeckle** — isolated cells are only smoothed when the swap
  is perceptually small; high-contrast details (red eyes on white) survive.
- **Adaptive baseline** — small/medium images default to native resolution,
  large ones to ~1/10 scale (typical pixel-art block size).
- **Works on everything** — Pointer Events for touch/mouse/pen (drag to paint,
  long-press or right-click to erase), keyboard editing (arrows + Enter/X),
  44px+ touch targets, mobile drawer, iOS long-press save modal.
- **Three live views** — Base Grid, Blueprint (with codes), Fused simulation —
  as tabs, with zoom controls and darker guide lines every 5 cells.
- **Manual crop tool** — drag a rectangle on the source thumbnail to isolate a
  sub-region, then apply to regenerate without re-uploading.
- **Pan & zoom** — middle-click (or Space+drag) pans any canvas; touch uses
  native pinch/scroll.
- **Compare view** — split-panel original-vs-pattern so you can judge quality
  before exporting.
- **Pixel-editor history** — full Undo/Redo of paint/erase strokes (depth 20).
- **Owned-colors filter** — check off the bead codes you own and the matcher
  restricts to that subset; unchecked = full palette.
- **Color highlighting** — click a bead code in the table to flash every cell
  of that color on the active canvas.
- **Session save/load** — auto-saves to localStorage; export/import a JSON file
  to share or back up a project (overrides + all control settings + owned set).
- **PDF export** — print-ready blueprint on a single A4 page (grid + shopping
  list), with an optional multi-page mode that splits huge patterns into
  29×29 pegboard chunks.
- **Toast notifications** — non-blocking status for session and export actions.

## Project structure

```
perler_beads_pattern_generator/
├── index.html              # Page skeleton + script load order
├── css/
│   ├── tokens.css          # Design tokens + 6 themes (classic/midnight/amber/forest/berry/ocean)
│   └── app.css             # Layout, controls, canvases, table, drawer
└── js/                     # Load order matters (see index.html)
    ├── palettes.js         # Bead color data (A-H/M series) — untouched upstream data
    ├── color-math.js       # hexToRgb / rgbToXyz / xyzToLab / deltaE2000
    ├── dom.js              # DOM handles + shared state
    ├── palette-ui.js       # Palette state, quick-swap grid, brush, tool toggle
    ├── matching.js         # Color matching (CIEDE2000 + Redmean), neutral bias, H7 outline snap
    ├── bead-table.js       # Bead quantity table (click row = pick brush, flash color)
    ├── drawer.js           # Mobile drawer open/close
    ├── image-loader.js     # Upload/drop, white-bg cutout, auto-crop, adaptive baseline, flips
    ├── crop-tool.js        # Manual drag-rectangle crop on the source thumbnail
    ├── quantizer.js        # Deterministic k-means++ in CIE Lab
    ├── grid-sampling.js    # Despeckle + merge-similar + per-cell grid sampling
    ├── engine.js           # generatePattern() pipeline + canvas rendering
    ├── optimizer.js        # Quality-guided size/color search
    ├── editor.js           # Pointer/touch/keyboard pixel editor
    ├── undo.js             # Undo/Redo snapshot stack for overrides
    ├── owned-colors.js     # Owned-code filter + modal grid
    ├── color-highlight.js  # Click-code → flash matching cells overlay
    ├── pan.js              # Middle-click / Space+drag canvas panning
    ├── compare.js          # Side-by-side original-vs-pattern split view
    ├── layout.js           # Geometry step buttons, view tabs, zoom
    ├── controls-wiring.js  # Control listeners, theme persistence
    ├── session.js          # Save/load/persist project state (localStorage + JSON file)
    ├── exporter.js         # PNG download + touch save modal
    ├── pdf-export.js       # A4 blueprint PDF (single/multi-page) + shopping list
    └── toast.js            # Lightweight transient notifications
```

## Usage

1. **Image** — tap/drop a file. Toggle auto-crop / white-background cutout.
2. **Crop (optional)** — open the crop tool, drag a box on the thumbnail,
   **Apply Crop** to regenerate from just that region (or **Reset** to undo).
3. **Size & Optimize** — set scale/width/height manually (± buttons work) or
   press **Auto-optimize size** after choosing a quality target.
4. **Colors** — palette range, matching algorithm, clustering, despeckle,
   color merging. Open **Owned Colors** to restrict matching to beads you have.
5. **Black Outline** — snap dark edges to H7 black with adjustable strength.
6. **Pixel Editor** — paint with any palette color; erase via tool, right-click
   or long-press. Keyboard: focus the canvas, arrows to move, Enter paints,
   X erases. **Undo/Redo** restores strokes (max 20). Click a bead-table row
   to pick that brush *and* flash every cell of that color.
7. **Inspect** — **Pan** large grids with middle-click/Space+drag; toggle
   **Compare** to see the original beside the pattern.
8. **Session** — work auto-saves to your browser; use **Save/Load** to export
   or import a JSON project file.
9. **Export** — PNG of the Base Grid, Blueprint, or Fused preview; or **PDF**
   for a print-ready single-page blueprint (auto-paginated for very large
   patterns) with a shopping list.

The bead palette data is intentionally unchanged from the original project.
