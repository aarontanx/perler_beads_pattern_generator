// Unified pointer editor: touch, mouse, pen + keyboard painting.
// Paint = tap/drag (or Enter). Erase = erase tool, right-click, or long-press.
let cursorX = 0, cursorY = 0; // keyboard brush position
let longPressTimer = null;

function activeEditorCanvas() {
    return document.querySelector('.canvas-container.active canvas:not(.cursor-overlay)') || baseCanvas;
}

function cellFromEvent(e, canvasEl) {
    const rect = canvasEl.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (canvasEl.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvasEl.height / rect.height);
    // Blueprint canvas carries a 30px numbered-axis margin; base & fused don't
    const offset = canvasEl === outputCanvas ? AXIS_OFFSET : 0;
    const gridW = parseInt(gridWidthInput.value), gridH = parseInt(gridHeightInput.value);
    const gx = Math.floor((canvasX - offset) / CELL_SIZE);
    const gy = Math.floor((canvasY - offset) / CELL_SIZE);
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) return { gx, gy };
    return null;
}

function applyCell(cellKey, erase) {
    if (erase || editorTool === 'erase') delete userOverrides[cellKey];
    else userOverrides[cellKey] = activeBrushColor;
}

/* Returns true if the event should be treated as an eraser gesture */
function isEraseGesture(e) {
    if (e.buttons === 2 || e.button === 2) return true;
    if (e.ctrlKey && e.pointerType === 'mouse') return true; // ctrl+click as right-click alias
    return false;
}

function setupPointerEditing(canvasEl) {
    let painting = false;

    canvasEl.addEventListener('contextmenu', e => e.preventDefault());

    canvasEl.addEventListener('pointerdown', e => {
        if (!croppedImageData) return;
        const cell = cellFromEvent(e, canvasEl);
        if (!cell) return;
        e.preventDefault();
        canvasEl.setPointerCapture(e.pointerId);
        painting = true;

        const erase = isEraseGesture(e);
        if (e.pointerType !== 'mouse' && !erase) {
            // Long-press on touch/pen = erase
            longPressTimer = setTimeout(() => {
                painting = false;
                applyCell(`${cell.gx},${cell.gy}`, true);
                generatePattern();
                if (navigator.vibrate) navigator.vibrate(30);
            }, 550);
        }
        applyCell(`${cell.gx},${cell.gy}`, erase);
        generatePattern();
    });

    canvasEl.addEventListener('pointermove', e => {
        if (!painting) return;
        clearTimeout(longPressTimer);
        const cell = cellFromEvent(e, canvasEl);
        if (!cell) return;
        applyCell(`${cell.gx},${cell.gy}`, isEraseGesture(e));
        generatePattern();
    });

    const stop = () => { painting = false; clearTimeout(longPressTimer); };
    canvasEl.addEventListener('pointerup', stop);
    canvasEl.addEventListener('pointercancel', stop);
}
setupPointerEditing(baseCanvas);
setupPointerEditing(outputCanvas);
setupPointerEditing(fusedCanvas);

// Keyboard editing on the active canvas wrapper
document.querySelectorAll('.canvas-scale-wrapper').forEach(wrapper => {
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('role', 'application');
    wrapper.setAttribute('aria-label', 'Pattern canvas. Arrow keys move brush, Enter or Space paints, X or Delete erases.');
    wrapper.addEventListener('keydown', e => {
        if (!croppedImageData) return;
        const gridW = parseInt(gridWidthInput.value), gridH = parseInt(gridHeightInput.value);
        let handled = true;
        switch (e.key) {
            case 'ArrowLeft': cursorX = Math.max(0, cursorX - 1); break;
            case 'ArrowRight': cursorX = Math.min(gridW - 1, cursorX + 1); break;
            case 'ArrowUp': cursorY = Math.max(0, cursorY - 1); break;
            case 'ArrowDown': cursorY = Math.min(gridH - 1, cursorY + 1); break;
            case 'Enter': case ' ': userOverrides[`${cursorX},${cursorY}`] = activeBrushColor; generatePattern(); break;
            case 'x': case 'X': case 'Delete': case 'Backspace': delete userOverrides[`${cursorX},${cursorY}`]; generatePattern(); break;
            default: handled = false;
        }
        if (handled) { e.preventDefault(); drawCursorOverlay(); }
    });
});

function drawCursorOverlay() {
    const view = document.querySelector('.canvas-container.active');
    if (!view) return;
    const canvas = view.querySelector('canvas');
    const overlay = view.querySelector('.cursor-overlay');
    if (!overlay) return;
    overlay.width = canvas.width; overlay.height = canvas.height;
    overlay.style.width = canvas.clientWidth + 'px';
    overlay.style.height = canvas.clientHeight + 'px';
    overlay.style.position = 'absolute';
    const octx = overlay.getContext('2d');
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.strokeStyle = '#FF3B30';
    octx.lineWidth = 3;
    octx.strokeRect(cursorX * CELL_SIZE + 1.5, cursorY * CELL_SIZE + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
}
