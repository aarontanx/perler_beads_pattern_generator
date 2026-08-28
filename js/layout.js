// Geometry (scale/width/height + step buttons), flips, view tabs, zoom
function updateGridDimensionsFromScale() {
    const scale = parseFloat(scalePercentInput.value) / 100;
    gridWidthInput.value = Math.max(5, Math.min(200, Math.round(baseImageWidth * scale)));
    gridHeightInput.value = Math.max(5, Math.min(200, Math.round(baseImageHeight * scale)));
}

scalePercentInput.addEventListener('change', () => { updateGridDimensionsFromScale(); generatePattern(); });

function buildFlippedCanvas(source, fh, fv) {
    if (!fh && !fv) return source;
    const c = document.createElement('canvas');
    c.width = source.width; c.height = source.height;
    const fCtx = c.getContext('2d');
    fCtx.translate(fh ? source.width : 0, fv ? source.height : 0);
    fCtx.scale(fh ? -1 : 1, fv ? -1 : 1);
    fCtx.drawImage(source, 0, 0);
    return c;
}

function applyFlipState() {
    if (!baseCropCanvas) return;
    croppedImageData = buildFlippedCanvas(baseCropCanvas, flipHorizontal, flipVertical);
    flipThumbPreview.style.transform = `scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`;
    generatePattern();
}

flipHorizontalBtn.addEventListener('click', () => { flipHorizontal = !flipHorizontal; flipHorizontalBtn.classList.toggle('active', flipHorizontal); flipHorizontalBtn.setAttribute('aria-pressed', flipHorizontal); applyFlipState(); });
flipVerticalBtn.addEventListener('click', () => { flipVertical = !flipVertical; flipVerticalBtn.classList.toggle('active', flipVertical); flipVerticalBtn.setAttribute('aria-pressed', flipVertical); applyFlipState(); });

// Step buttons for geometry inputs
document.querySelectorAll('.geo-step-btn').forEach(button => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('data-target'));
        if (!input) return;
        const step = parseInt(button.getAttribute('data-step'));
        const val = parseInt(input.value) + step;
        const clamped = Math.max(parseInt(input.min) || 1, Math.min(parseInt(input.max) || 999, val));
        input.value = clamped;
        if (input === scalePercentInput) updateGridDimensionsFromScale();
        generatePattern();
    });
});

// View tabs
const viewTabs = document.querySelectorAll('.view-tab');
viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        viewTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.canvas-container').forEach(c => {
            const match = c.dataset.view === tab.dataset.view;
            c.classList.toggle('active', match);
            if (match) c.hidden = false; else c.hidden = true;
        });
        drawCursorOverlay();
        // Re-apply zoom now that the newly-visible canvas has real layout dimensions
        applyZoom();
    });
});

// Zoom: +/- buttons and reset. Applies to all wrappers.
let zoomPct = 100;
const ZOOM_STEPS = [50, 65, 80, 100, 125, 150, 175, 200, 250, 300];
function applyZoom() {
    document.getElementById('zoomValue').textContent = `${zoomPct}%`;

    // Use the main panel's available width as the reference — individual
    // canvas containers may be hidden (clientWidth = 0) so we can't rely on them.
    const mainPanel = document.querySelector('.main-panel');
    const availW = mainPanel ? mainPanel.clientWidth - 40 : 600;
    const availH = Math.max(240, window.innerHeight - 240);

    // Compute one shared scale based on the ACTIVE canvas so all three views
    // display at the same visual size when tabs are switched.
    const activeCanvas = document.querySelector('.canvas-container.active canvas:not(.cursor-overlay):not(.highlight-overlay)');
    if (!activeCanvas || !activeCanvas.width || !activeCanvas.height) return;

    const contain = Math.min(availW / activeCanvas.width, availH / activeCanvas.height, 3);
    const scale = zoomPct === 100 ? contain : contain * (zoomPct / 100);

    // Apply the same pixel width to all canvases (they share the same grid
    // dimensions, so the same scale gives the same display size).
    document.querySelectorAll('.canvas-scale-wrapper canvas').forEach(cv => {
        if (!cv.width) return;
        cv.style.width = `${Math.max(40, Math.round(cv.width * scale))}px`;
    });
}
document.getElementById('zoomInBtn').addEventListener('click', () => {
    const i = ZOOM_STEPS.findIndex(s => s > zoomPct);
    zoomPct = ZOOM_STEPS[i === -1 ? ZOOM_STEPS.length - 1 : i];
    applyZoom();
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const i = ZOOM_STEPS.findIndex(s => s >= zoomPct);
    zoomPct = ZOOM_STEPS[Math.max(0, i === -1 ? ZOOM_STEPS.length - 1 : i - 1)];
    applyZoom();
});
document.getElementById('zoomResetBtn').addEventListener('click', () => { zoomPct = 100; applyZoom(); });
// Init
initPaletteData();
window.addEventListener('resize', () => applyZoom());

