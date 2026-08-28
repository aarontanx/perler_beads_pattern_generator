// Color region highlighting — click a bead code in the table to flash all
// cells of that color on the active canvas.  A second click on the same code
// (or clicking a different code) clears the previous highlight first.
//
// Implemented as a temporary overlay canvas that is created on demand, drawn
// over the active view's canvas, and auto-cleared on the next generatePattern()
// call or when the tab switches.

let highlightedCode = null;

// The overlay canvas is appended inside the same canvas-scale-wrapper as the
// active view's canvas so it inherits the same CSS transform/zoom.
function getOrCreateHighlightOverlay(wrapper) {
    let overlay = wrapper.querySelector('.highlight-overlay');
    if (!overlay) {
        overlay = document.createElement('canvas');
        overlay.className = 'highlight-overlay';
        overlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:4;';
        wrapper.appendChild(overlay);
    }
    return overlay;
}

function clearHighlightOverlay() {
    document.querySelectorAll('.highlight-overlay').forEach(el => {
        const ctx = el.getContext('2d');
        ctx.clearRect(0, 0, el.width, el.height);
    });
    highlightedCode = null;
    // Remove active state from all table rows
    document.querySelectorAll('.interactive-row').forEach(r => r.classList.remove('row-highlighted'));
}

function drawHighlight(code) {
    const view = document.querySelector('.canvas-container.active');
    if (!view) return;
    const wrapper = view.querySelector('.canvas-scale-wrapper');
    const mainCanvas = view.querySelector('canvas:not(.cursor-overlay):not(.highlight-overlay)');
    if (!wrapper || !mainCanvas) return;

    const gridW = parseInt(gridWidthInput.value);
    const gridH = parseInt(gridHeightInput.value);

    // The overlay must be drawn at the SAME resolution as the underlying canvas
    // (so cell coordinates match), but sized to exactly the same CSS display
    // rect so it sits flush on top without any displacement.
    const overlay = getOrCreateHighlightOverlay(wrapper);

    // Raw canvas dimensions (pixel grid)
    const cw = mainCanvas.width;
    const ch = mainCanvas.height;
    overlay.width  = cw;
    overlay.height = ch;

    // CSS display size — must match the main canvas exactly so the overlay
    // tracks the zoomed/scaled canvas without offset.
    const displayW = mainCanvas.style.width  || (mainCanvas.clientWidth  + 'px');
    const displayH = mainCanvas.style.height || (mainCanvas.clientHeight + 'px');
    overlay.style.width  = displayW;
    overlay.style.height = displayH;
    // Position flush with the main canvas inside the wrapper
    overlay.style.left = mainCanvas.offsetLeft + 'px';
    overlay.style.top  = mainCanvas.offsetTop  + 'px';

    const octx = overlay.getContext('2d');
    octx.clearRect(0, 0, cw, ch);

    // Dim the whole canvas first, then punch through the matched cells
    octx.fillStyle = 'rgba(0,0,0,0.55)';
    octx.fillRect(0, 0, cw, ch);

    // Offset: blueprint canvas has a 30px axis margin, others don't
    const isBlueprint = mainCanvas === outputCanvas;
    const offset = isBlueprint ? AXIS_OFFSET : 0;

    octx.globalCompositeOperation = 'destination-out';
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const cellKey = `${x},${y}`;
            let cellCode = null;
            if (userOverrides[cellKey]) {
                cellCode = userOverrides[cellKey];
            } else if (window._lastGrid) {
                const c = window._lastGrid[y * gridW + x];
                if (c) cellCode = c.code;
            }
            if (cellCode === code) {
                octx.fillRect(
                    offset + x * CELL_SIZE, offset + y * CELL_SIZE,
                    CELL_SIZE - 1, CELL_SIZE - 1
                );
            }
        }
    }
    octx.globalCompositeOperation = 'source-over';

    // Yellow border around each matched cell
    octx.strokeStyle = 'rgba(255,230,0,0.9)';
    octx.lineWidth = 2;
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const cellKey = `${x},${y}`;
            let cellCode = null;
            if (userOverrides[cellKey]) {
                cellCode = userOverrides[cellKey];
            } else if (window._lastGrid) {
                const c = window._lastGrid[y * gridW + x];
                if (c) cellCode = c.code;
            }
            if (cellCode === code) {
                octx.strokeRect(
                    offset + x * CELL_SIZE + 1, offset + y * CELL_SIZE + 1,
                    CELL_SIZE - 2, CELL_SIZE - 2
                );
            }
        }
    }
}

function toggleCodeHighlight(code) {
    if (highlightedCode === code) {
        clearHighlightOverlay();
        return;
    }
    clearHighlightOverlay();
    highlightedCode = code;
    drawHighlight(code);
    // Mark the active row
    document.querySelectorAll(`.interactive-row[data-code="${code}"]`).forEach(r => r.classList.add('row-highlighted'));
}

// Re-draw highlight after generatePattern() so the overlay stays in sync.
// Called from engine.js at the end of generatePattern().
function refreshHighlightIfActive() {
    if (!highlightedCode) return;
    drawHighlight(highlightedCode);
}

// Clear when the user switches views (the overlay canvas is in the old view's DOM)
document.querySelectorAll('.view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Slight delay so the active class has been set by layout.js already
        setTimeout(() => {
            if (highlightedCode) {
                clearHighlightOverlay();
                drawHighlight(highlightedCode);
                document.querySelectorAll(`.interactive-row[data-code="${highlightedCode}"]`).forEach(r => r.classList.add('row-highlighted'));
            }
        }, 30);
    });
});
