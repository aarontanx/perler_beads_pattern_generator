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
    });
});

// Zoom: +/- buttons and reset. Applies to all wrappers.
let zoomPct = 100;
const ZOOM_STEPS = [50, 65, 80, 100, 125, 150, 175, 200, 250, 300];
function applyZoom() {
    document.getElementById('zoomValue').textContent = `${zoomPct}%`;
    document.querySelectorAll('.canvas-scale-wrapper canvas').forEach(cv => {
        const container = cv.closest('.canvas-container');
        const availW = container ? container.clientWidth - 28 : 600;
        const fitPct = availW / cv.width;
        const pct = zoomPct === 100 ? Math.min(fitPct, 3) : fitPct * (zoomPct / 100);
        cv.style.width = `${Math.max(40, Math.round(cv.width * pct))}px`;
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

