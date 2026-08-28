// Side-by-side comparison view — shows the original cropped source image
// alongside the current bead pattern in a resizable split layout.
// Toggled by the Compare button in the toolbar.

let compareActive = false;

function toggleCompare() {
    compareActive = !compareActive;
    const btn = document.getElementById('compareBtn');
    const comparePanel = document.getElementById('comparePanel');
    const canvasStage = document.getElementById('canvasStage');

    if (compareActive) {
        if (!croppedImageData) { compareActive = false; return; }
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        canvasStage.classList.add('compare-mode');
        comparePanel.hidden = false;
        renderCompareSource();
    } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
        canvasStage.classList.remove('compare-mode');
        comparePanel.hidden = true;
    }
}

function renderCompareSource() {
    const canvas = document.getElementById('compareSourceCanvas');
    if (!canvas || !croppedImageData) return;
    // Draw the (flipped) source image at the same pixel dimensions as the bead grid
    const gridW = parseInt(gridWidthInput.value);
    const gridH = parseInt(gridHeightInput.value);
    canvas.width  = gridW * CELL_SIZE;
    canvas.height = gridH * CELL_SIZE;
    const srcCtx = canvas.getContext('2d');
    // Scale the source image to fill the canvas (nearest-neighbor to keep pixel art crisp)
    srcCtx.imageSmoothingEnabled = false;
    srcCtx.drawImage(croppedImageData, 0, 0, canvas.width, canvas.height);

    // Grid overlay matches the bead grid exactly
    drawGridOverlay(srcCtx, canvas, gridW, gridH, CELL_SIZE, 0);

    // Apply same zoom as the main canvas
    canvas.style.width = baseCanvas.style.width || '';
}

// Re-render compare panel whenever the pattern regenerates
const _origGenerate = window.generatePattern;
// Hook is installed at the tail of engine.js via a post-patch in controls-wiring.

document.getElementById('compareBtn')?.addEventListener('click', toggleCompare);
