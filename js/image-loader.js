// Image loading, auto-crop, white-background cutout, flips

const removeWhiteBgInput = { get checked() { return document.getElementById('removeWhiteBg').checked; } };

/* Flood-fill from the borders, clearing every connected white region to
   transparent. Unlike a global white→alpha replace, white pixels INSIDE the
   sprite (bunny body, eye highlights) are untouched — only background
   connected to the image edge is removed. */
function removeWhiteBackground(canvas) {
    const ctx2d = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx2d.getImageData(0, 0, w, h);
    const d = img.data;
    const visited = new Uint8Array(w * h);
    const queue = [];

    const isWhiteish = i => {
        const idx = i * 4;
        return d[idx + 3] < 30 || (d[idx] > 235 && d[idx + 1] > 235 && d[idx + 2] > 235);
    };

    for (let x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { queue.push(y * w); queue.push(y * w + w - 1); }

    while (queue.length) {
        const i = queue.pop();
        if (i < 0 || i >= w * h || visited[i]) continue;
        if (!isWhiteish(i)) continue;
        visited[i] = 1;
        d[i * 4 + 3] = 0;
        const x = i % w, y = (i / w) | 0;
        if (x > 0) queue.push(i - 1);
        if (x < w - 1) queue.push(i + 1);
        if (y > 0) queue.push(i - w);
        if (y < h - 1) queue.push(i + w);
    }
    ctx2d.putImageData(img, 0, 0);
}

/* ADAPTIVE BASELINE — the 100% reference resolution.
   Small/medium sources: use native resolution (clamped) so pixel art keeps
   every art-pixel. Large sources: ~1/10 scale (typical pixel-art block size),
   clamped to a workable default. The optimizer searches around this. */
function computeBaselineDims(cw, ch) {
    let w, h;
    if (Math.min(cw, ch) <= 220) { w = cw; h = ch; }
    else { w = Math.round(cw / 10); h = Math.round(ch / 10); }
    const CAP = 110;
    if (w > CAP) { h = Math.max(5, Math.round(h * CAP / w)); w = CAP; }
    if (h > CAP) { w = Math.max(5, Math.round(w * CAP / h)); h = CAP; }
    w = Math.max(5, w); h = Math.max(5, h);
    return [w, h];
}

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width; tempCanvas.height = img.height;
            tempCanvas.getContext('2d').drawImage(img, 0, 0);

            if (removeWhiteBgInput.checked) removeWhiteBackground(tempCanvas);

            if (autoCropInput.checked) {
                const imgData = tempCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);
                let minX = img.width, maxX = 0, minY = img.height, maxY = 0, hasContent = false;
                for (let y = 0; y < img.height; y++) {
                    for (let x = 0; x < img.width; x++) {
                        const idx = (y * img.width + x) * 4;
                        if (imgData.data[idx + 3] > 20) {
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                            hasContent = true;
                        }
                    }
                }
                if (hasContent) {
                    baseCropCanvas = document.createElement('canvas');
                    baseCropCanvas.width = (maxX - minX) + 1; baseCropCanvas.height = (maxY - minY) + 1;
                    baseCropCanvas.getContext('2d').drawImage(tempCanvas, minX, minY, baseCropCanvas.width, baseCropCanvas.height, 0, 0, baseCropCanvas.width, baseCropCanvas.height);
                } else { baseCropCanvas = tempCanvas; }
            } else { baseCropCanvas = tempCanvas; }

            [baseImageWidth, baseImageHeight] = computeBaselineDims(baseCropCanvas.width, baseCropCanvas.height);

            userOverrides = {};
            scalePercentInput.value = 100;
            updateGridDimensionsFromScale();
            flipThumbPreview.src = baseCropCanvas.toDataURL();
            thumbPreviewContainer.hidden = false;
            downloadBtn.disabled = false;
            optimizeBtn.disabled = false;
            document.getElementById('emptyState').classList.add('hidden-empty');
            applyFlipState();
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
});

// Drag & drop onto the drop zone
const dropZone = document.getElementById('dropZone');
['dragover', 'dragenter'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        imageUpload.files = dt.files;
        imageUpload.dispatchEvent(new Event('change'));
    }
});
