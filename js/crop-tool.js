// Manual crop tool — drag a rectangle on the source thumbnail preview to
// select a sub-region, then click "Apply Crop" to regenerate the pattern.
//
// NOT wrapped in an IIFE: assignments to baseCropCanvas, userOverrides,
// baseImageWidth, baseImageHeight must reach the script-level `let`/implicit
// globals declared in dom.js and image-loader.js.
//
// State: window._rawCropCanvas holds the full image before any manual crop so
// the user can reset without re-uploading.

let _cropActive = false;
let _cropStart = null, _cropEnd = null;
let _cropDragging = false;

const _THUMB_ID    = 'thumbPreview';
const _BTN_TOGGLE  = 'cropToggleBtn';
const _BTN_APPLY   = 'cropApplyBtn';
const _BTN_RESET   = 'cropResetBtn';
const _OVERLAY_ID  = 'cropOverlay';
const _WRAP_ID     = 'thumbPreviewWrapper';

function _getCropThumb()   { return document.getElementById(_THUMB_ID); }
function _getCropOverlay() { return document.getElementById(_OVERLAY_ID); }
function _getCropWrapper() { return document.getElementById(_WRAP_ID); }

/* Map a pointer event on the <img> to fractions [0..1] of the image rect */
function _imgFrac(e) {
    const img = _getCropThumb();
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return {
        fx: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        fy: Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height))
    };
}

function _drawCropSelection() {
    const overlay = _getCropOverlay();
    const img = _getCropThumb();
    if (!overlay || !img) return;
    const r = img.getBoundingClientRect();
    overlay.style.left = img.offsetLeft + 'px';
    overlay.style.top  = img.offsetTop  + 'px';
    overlay.width  = r.width;
    overlay.height = r.height;
    overlay.style.width  = r.width  + 'px';
    overlay.style.height = r.height + 'px';

    const c = overlay.getContext('2d');
    c.clearRect(0, 0, overlay.width, overlay.height);
    if (!_cropStart || !_cropEnd) return;

    const x0 = Math.min(_cropStart.fx, _cropEnd.fx) * overlay.width;
    const y0 = Math.min(_cropStart.fy, _cropEnd.fy) * overlay.height;
    const x1 = Math.max(_cropStart.fx, _cropEnd.fx) * overlay.width;
    const y1 = Math.max(_cropStart.fy, _cropEnd.fy) * overlay.height;
    const w = x1 - x0, h = y1 - y0;

    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(0, 0, overlay.width, overlay.height);
    c.clearRect(x0, y0, w, h);

    c.strokeStyle = '#FFD600';
    c.lineWidth = 2;
    c.setLineDash([6, 3]);
    c.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
    c.setLineDash([]);
}

function _enterCropMode() {
    _cropActive = true;
    _cropStart = null; _cropEnd = null;
    const img = _getCropThumb();
    if (!img) return;
    img.style.cursor = 'crosshair';
    const ov = _getCropOverlay();
    if (ov) ov.style.display = '';
    const wr = _getCropWrapper();
    if (wr) wr.classList.add('crop-mode');
    document.getElementById(_BTN_TOGGLE)?.classList.add('active');
    document.getElementById(_BTN_APPLY).hidden = true;
    document.getElementById(_BTN_RESET).hidden = !window._cropApplied;
    if (typeof showToast === 'function') showToast('Drag to select a crop region, then click Apply');
}

function _exitCropMode() {
    _cropActive = false;
    _cropStart = null; _cropEnd = null;
    const img = _getCropThumb();
    if (img) img.style.cursor = '';
    const ov = _getCropOverlay();
    if (ov) {
        ov.style.display = 'none';
        ov.getContext('2d').clearRect(0, 0, ov.width, ov.height);
    }
    const wr = _getCropWrapper();
    if (wr) wr.classList.remove('crop-mode');
    document.getElementById(_BTN_TOGGLE)?.classList.remove('active');
    document.getElementById(_BTN_APPLY).hidden = true;
}

function _applyCrop() {
    if (!window._rawCropCanvas || !_cropStart || !_cropEnd) return;
    const src = window._rawCropCanvas;

    const fx0 = Math.min(_cropStart.fx, _cropEnd.fx);
    const fy0 = Math.min(_cropStart.fy, _cropEnd.fy);
    const fw   = Math.max(_cropStart.fx, _cropEnd.fx) - fx0;
    const fh   = Math.max(_cropStart.fy, _cropEnd.fy) - fy0;
    if (fw < 0.01 || fh < 0.01) {
        if (typeof showToast === 'function') showToast('Selection too small — drag a larger area');
        return;
    }

    const sx = Math.round(fx0 * src.width);
    const sy = Math.round(fy0 * src.height);
    const sw = Math.round(fw  * src.width);
    const sh = Math.round(fh  * src.height);

    const cropped = document.createElement('canvas');
    cropped.width = sw; cropped.height = sh;
    cropped.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);

    // Assign directly to the script-level variables used by applyFlipState()
    // and the rest of the pipeline.  These are NOT window properties (the let
    // in dom.js does not create a window.baseCropCanvas property), so we must
    // reach them by name from the same script scope — which works here because
    // this file is NOT an IIFE.
    baseCropCanvas = cropped;
    userOverrides  = {};
    const dims = computeBaselineDims(sw, sh);
    baseImageWidth  = dims[0];
    baseImageHeight = dims[1];
    window._cropApplied = true;

    // Update thumbnail preview
    const thumb = _getCropThumb();
    if (thumb) thumb.src = cropped.toDataURL();
    const flip = document.getElementById('flipThumbPreview');
    if (flip) flip.src = cropped.toDataURL();

    scalePercentInput.value = 100;
    updateGridDimensionsFromScale();
    applyFlipState(); // updates croppedImageData and calls generatePattern()

    _exitCropMode();
    if (typeof showToast === 'function') showToast('Crop applied ✓');
}

function _resetCrop() {
    if (!window._rawCropCanvas) return;
    baseCropCanvas = window._rawCropCanvas;
    userOverrides  = {};
    const dims = computeBaselineDims(window._rawCropCanvas.width, window._rawCropCanvas.height);
    baseImageWidth  = dims[0];
    baseImageHeight = dims[1];
    window._cropApplied = false;

    const thumb = _getCropThumb();
    if (thumb) thumb.src = window._rawCropCanvas.toDataURL();
    const flip = document.getElementById('flipThumbPreview');
    if (flip) flip.src = window._rawCropCanvas.toDataURL();

    scalePercentInput.value = 100;
    updateGridDimensionsFromScale();
    applyFlipState();
    document.getElementById(_BTN_RESET).hidden = true;
    if (typeof showToast === 'function') showToast('Crop reset to original image');
}

/* ── UI injection ────────────────────────────────────────────────────────── */

function _installCropUI() {
    const container = document.getElementById('thumbPreviewContainer');
    if (!container || document.getElementById(_BTN_TOGGLE)) return; // already installed

    // Ensure the thumb wrapper exists and is position:relative
    const img = document.getElementById(_THUMB_ID);
    if (img) {
        let wrapper = document.getElementById(_WRAP_ID);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = _WRAP_ID;
            wrapper.className = 'thumb-preview-wrapper';
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);
        }
        wrapper.style.position = 'relative';

        // Canvas overlay for drawing the selection rectangle
        const ov = document.createElement('canvas');
        ov.id = _OVERLAY_ID;
        ov.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;display:none;z-index:10;';
        wrapper.appendChild(ov);
    }

    // Crop button row
    const flipGroup = container.querySelector('.flip-toggle-group');
    const btnRow = document.createElement('div');
    btnRow.className = 'crop-btn-row';
    btnRow.innerHTML =
        `<button type="button" id="${_BTN_TOGGLE}" class="btn-secondary btn-sm crop-toggle-btn" title="Manually crop the source image">✂️ Crop</button>` +
        `<button type="button" id="${_BTN_APPLY}"  class="btn-accent btn-sm" hidden>✓ Apply</button>` +
        `<button type="button" id="${_BTN_RESET}"  class="btn-secondary btn-sm" hidden>↺ Reset crop</button>`;
    container.insertBefore(btnRow, flipGroup || null);

    document.getElementById(_BTN_TOGGLE).addEventListener('click', () => {
        _cropActive ? _exitCropMode() : _enterCropMode();
    });
    document.getElementById(_BTN_APPLY).addEventListener('click', _applyCrop);
    document.getElementById(_BTN_RESET).addEventListener('click', _resetCrop);

    // Pointer listeners on the thumbnail image
    if (img) {
        img.addEventListener('pointerdown', e => {
            if (!_cropActive) return;
            e.preventDefault();
            _cropDragging = true;
            _cropStart = _imgFrac(e);
            _cropEnd   = _cropStart;
            _drawCropSelection();
            const ov = _getCropOverlay();
            if (ov) ov.style.display = '';
        });
        img.addEventListener('pointermove', e => {
            if (!_cropDragging || !_cropActive) return;
            _cropEnd = _imgFrac(e);
            _drawCropSelection();
        });
        img.addEventListener('pointerup', e => {
            if (!_cropDragging || !_cropActive) return;
            _cropDragging = false;
            _cropEnd = _imgFrac(e);
            _drawCropSelection();
            const dx = Math.abs(_cropEnd.fx - _cropStart.fx);
            const dy = Math.abs(_cropEnd.fy - _cropStart.fy);
            document.getElementById(_BTN_APPLY).hidden = (dx < 0.02 || dy < 0.02);
        });
    }
}

// Watch for thumbPreviewContainer becoming visible (image loaded)
new MutationObserver(() => {
    const c = document.getElementById('thumbPreviewContainer');
    if (c && !c.hidden) _installCropUI();
}).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
