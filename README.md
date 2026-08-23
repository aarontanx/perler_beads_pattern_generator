# Perler Bead Pattern Generator

Turn any image into a beadable pixel-grid pattern. Upload an image, tune the
geometry and color settings, paint overrides directly on the canvas, and export
a print-ready blueprint.

This is a **fully static site** — no build step, no dependencies, no server
required. Open `index.html` in a browser and everything works, including from
`file://`.

## Project structure

```
perler_beads_pattern_generator/
├── index.html            # Page skeleton: <head>, markup, script tags in load order
├── css/                  # Styles, split by UI area (concatenated = original <style> block)
│   ├── tokens.css        #   Design tokens + 6 color themes (classic/midnight/amber/forest/berry/ocean)
│   ├── header.css        #   Header, brand/logo, theme picker, mobile drawer chrome
│   ├── layout.css        #   Dashboard grid, resizable sidebar, responsive breakpoints
│   ├── controls.css      #   Control cards, inputs, thumbnails, flip buttons, download buttons
│   ├── canvas.css        #   Toolbar, canvas containers, per-canvas resize controls, sizing modes
│   └── table.css         #   Bead quantity table, brush preview, quick palette grid
├── js/                   # Logic, split by concern (concatenated = original inline script)
│   ├── palettes.js       #   Bead color data (A-H/M series, 144 swatches)
│   ├── color-math.js     #   hexToRgb / rgbToXyz / xyzToLab / rgbToLab / deltaE2000
│   ├── palette-ui.js     #   Palette state, quick-swap grid rendering, brush UI
│   ├── matching.js       #   Color-matching engine (6 algorithms), neutral bias, H7 gravity
│   ├── bead-table.js     #   Bead quantity table renderer
│   ├── dom.js            #   DOM handles + shared mutable state (overrides, flips)

├── js/  (continued)
│   ├── drawer.js         #   Mobile hamburger drawer open/close
│   ├── layout.js         #   Scale/flip, sidebar resizer, canvas sizing modes & resize sliders
│   ├── image-loader.js   #   File upload, auto-crop white space, thumbnail preview
│   ├── quantizer.js      #   Deterministic PRNG + k-means++ clustering in CIE Lab
│   ├── grid-sampling.js  #   Despeckle pass + accurate per-cell grid sampling (dominant/average)
│   ├── engine.js         #   generatePattern() pipeline + canvas paint/erase editor
│   ├── controls-wiring.js#   All control event listeners + theme switcher
│   └── exporter.js       #   PNG download handler + iOS long-press save modal
├── original/
│   └── index.html        # The pre-refactor single-file build (reference; safe to delete)
└── verify/               # Parity harness used to prove the refactor is behavior-identical
    ├── parity_runner.html # Drives original + modular side-by-side in iframes, emits JSON verdict
    ├── test_input.png     # Deterministic synthetic pattern (color bands, checkerboard, black dot)
    ├── cdp_run.py         # Minimal CDP driver: navigates headless Chromium to the runner
    └── parity_result.json # Latest verdict (canvas pixel hashes + table rows for both builds)

## Editing guide

- **Change a color theme** → `css/tokens.css` (each theme is one `[data-theme]` block).
- **Reorder/rename a sidebar card** → `index.html` (markup) + `css/controls.css` (styling).
- **Tweak color matching** → `js/matching.js` (algorithms, neutral bias, H7 gravity).
- **Add a control** → markup in `index.html`, listener in `js/controls-wiring.js`.
- **Change palette** → `js/palettes.js` only.

Important: `index.html` loads the `js/` files as classic scripts **in dependency
order** — shared globals (`paletteData`, `userOverrides`, the DOM handles,
`generatePattern`) are declared by earlier files and consumed by later ones. If
you add a file or reorder them, keep that order, or move to ES modules
(`type="module"` + explicit imports) as a follow-up.

CSS files are order-sensitive only where selectors tie (later wins); the current
order mirrors the original cascade exactly.

## Verifying changes

The modular build was verified byte- and behavior-identical to the original:

1. Static parity — concatenating `css/*` and `js/*` reproduces the original
   `<style>`/`<script>` blocks byte-for-byte; body markup is unchanged.
2. Runtime parity — both builds driven with the same image + control changes:
   all three canvas FNV-1a pixel hashes match, bead tables match, computed
   theme styles match.
3. `file://` smoke test — 14 scripts + 6 stylesheets load with zero console
   errors; theme switching works without a server.

To re-run the runtime check:

    python -m http.server 8777          # from the repo root
    chromium --headless=new --remote-debugging-port=9337 about:blank &
    python verify/cdp_run.py "http://127.0.0.1:8777/verify/parity_runner.html"

The runner prints `"match": true` when both builds produce identical output.
