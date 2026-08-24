// Core pattern pipeline: sample → classify → cluster → merge → despeckle → render.
// computeGrid() is separated from painting so the optimizer can score candidate
// configs cheaply without touching canvases.

const CELL_SIZE = 24, AXIS_OFFSET = 30;

function getPipelineOptions() {
    return {
        algorithm: colorAlgoSelect.value,
        smartQuantize: smartQuantizeInput.checked,
        quantizeK: parseInt(quantizeColorCountInput.value),
        despeckle: despeckleInput.checked,
        mergeColors: mergeColorsInput.checked,
        h7Outline: h7OutlineInput.checked,
        outlineStrength: parseFloat(outlineStrengthInput.value),
        isPixelMode: processingModeSelect.value === 'pixel'
    };
}

/* Returns { grid, beadCounts } — grid = array of palette colors (or null). */
function computeGrid(imgData, gridW, gridH, opts) {
    const cellCount = gridW * gridH;
    const matchedGrid = new Array(cellCount).fill(null);
    const lockedGrid = new Array(cellCount).fill(false);
    const quantizeQueue = [];

    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const i = y * gridW + x;
            const idx = i * 4;
            if (imgData[idx + 3] < 30) continue;

            const cellKey = `${x},${y}`;
            if (userOverrides[cellKey]) {
                matchedGrid[i] = paletteData.find(c => c.code === userOverrides[cellKey]) || null;
                lockedGrid[i] = true;
                continue;
            }

            const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];
            // Dark pixels are outline candidates under H7 snap mode
            const restrictToGrey = opts.h7Outline && isProtectedBlack(r, g, b);

            if (restrictToGrey || isProtectedBlack(r, g, b)) {
                matchedGrid[i] = findClosestColor(r, g, b, opts, true);
                lockedGrid[i] = true;
            } else if (opts.smartQuantize) {
                quantizeQueue.push({ i, r, g, b, lab: rgbToLab(r, g, b) });
            } else {
                matchedGrid[i] = findClosestColor(r, g, b, opts, false);
            }
        }
    }

    if (opts.smartQuantize && quantizeQueue.length > 0) {
        const uniqueColorMap = new Map();
        quantizeQueue.forEach(p => {
            const key = ((p.r >> 2) << 12) | ((p.g >> 2) << 6) | (p.b >> 2);
            if (!uniqueColorMap.has(key)) uniqueColorMap.set(key, { r: p.r, g: p.g, b: p.b });
        });

        const clusterColorCache = {};
        let assignments;

        if (uniqueColorMap.size <= opts.quantizeK) {
            const keyToClusterIdx = {};
            let nextIdx = 0;
            uniqueColorMap.forEach((color, key) => { keyToClusterIdx[key] = nextIdx++; });
            assignments = quantizeQueue.map(p => keyToClusterIdx[((p.r >> 2) << 12) | ((p.g >> 2) << 6) | (p.b >> 2)]);
            uniqueColorMap.forEach((color, key) => {
                clusterColorCache[keyToClusterIdx[key]] = findClosestColor(color.r, color.g, color.b, opts, false);
            });
        } else {
            const result = kMeansLab(quantizeQueue.map(p => p.lab), opts.quantizeK);
            assignments = result.assignments;
            const clusterSums = {};
            assignments.forEach((clusterIdx, qi) => {
                const p = quantizeQueue[qi];
                if (!clusterSums[clusterIdx]) clusterSums[clusterIdx] = { r: 0, g: 0, b: 0, count: 0 };
                const s = clusterSums[clusterIdx];
                s.r += p.r; s.g += p.g; s.b += p.b; s.count++;
            });
            Object.keys(clusterSums).forEach(clusterIdx => {
                const s = clusterSums[clusterIdx];
                clusterColorCache[clusterIdx] = findClosestColor(s.r / s.count, s.g / s.count, s.b / s.count, opts, false);
            });
        }

        assignments.forEach((clusterIdx, qi) => {
            matchedGrid[quantizeQueue[qi].i] = clusterColorCache[clusterIdx];
        });
    }

    let finalGrid = matchedGrid;
    if (opts.mergeColors) finalGrid = mergeSimilarColors(finalGrid, 2.0);
    if (opts.despeckle) finalGrid = despeckleGrid(finalGrid, gridW, gridH, lockedGrid);

    const beadCounts = {};
    finalGrid.forEach(c => {
        if (!c) return;
        if (!beadCounts[c.code]) beadCounts[c.code] = { count: 0, hex: c.hex };
        beadCounts[c.code].count++;
    });
    return { grid: finalGrid, beadCounts };
}

function drawGridOverlay(gctx, cv, gridW, gridH, cellSize, offset) {
    const gw = gridW * cellSize, gh = gridH * cellSize;
    gctx.save();
    gctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
    gctx.lineWidth = 1;
    gctx.beginPath();
    for (let x = 1; x < gridW; x++) { const px = offset + x * cellSize + 0.5; gctx.moveTo(px, offset); gctx.lineTo(px, offset + gh); }
    for (let y = 1; y < gridH; y++) { const py = offset + y * cellSize + 0.5; gctx.moveTo(offset, py); gctx.lineTo(offset + gw, py); }
    gctx.stroke();
    // Darker lines every 5 cells + outer border
    gctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    gctx.lineWidth = 2;
    gctx.beginPath();
    for (let x = 5; x < gridW; x += 5) { const px = offset + x * cellSize + 0.5; gctx.moveTo(px, offset); gctx.lineTo(px, offset + gh); }
    for (let y = 5; y < gridH; y += 5) { const py = offset + y * cellSize + 0.5; gctx.moveTo(offset, py); gctx.lineTo(offset + gw, py); }
    gctx.stroke();
    gctx.strokeRect(offset + 1, offset + 1, gw - 2, gh - 2);
    gctx.restore();
}

function generatePattern() {
    if (!croppedImageData) return;
    generatePattern.lastOpts = null; // invalidate optimizer cache

    const gridW = parseInt(gridWidthInput.value), gridH = parseInt(gridHeightInput.value);

    outputCanvas.width = outputCanvas.height = 0;
    baseCanvas.width = baseCanvas.height = 0;
    fusedCanvas.width = fusedCanvas.height = 0;
    baseCanvas.width = fusedCanvas.width = gridW * CELL_SIZE;
    baseCanvas.height = fusedCanvas.height = gridH * CELL_SIZE;
    outputCanvas.width = gridW * CELL_SIZE + AXIS_OFFSET;
    outputCanvas.height = gridH * CELL_SIZE + AXIS_OFFSET;

    const imgData = sampleGridCells(croppedImageData, gridW, gridH, processingModeSelect.value === 'pixel');

    fusedCtx.fillStyle = '#E2E6EF'; fusedCtx.fillRect(0, 0, fusedCanvas.width, fusedCanvas.height);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    ctx.fillStyle = '#6B7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = 0; x < gridW; x++) { if (x % 5 === 0 || x === gridW - 1) ctx.fillText(x + 1, AXIS_OFFSET + x * CELL_SIZE + CELL_SIZE / 2, 15); }
    for (let y = 0; y < gridH; y++) { if (y % 5 === 0 || y === gridH - 1) ctx.fillText(y + 1, 15, AXIS_OFFSET + y * CELL_SIZE + CELL_SIZE / 2); }

    const opts = getPipelineOptions();
    generatePattern.lastOpts = opts;
    const { grid, beadCounts } = computeGrid(imgData, gridW, gridH, opts);
    currentBeadCounts = beadCounts;

    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const c = grid[y * gridW + x];
            if (!c) continue;
            const cx = x * CELL_SIZE, cy = y * CELL_SIZE;
            baseCtx.fillStyle = c.hex;
            baseCtx.fillRect(cx, cy, CELL_SIZE - 1, CELL_SIZE - 1);

            const ox = AXIS_OFFSET + cx;
            ctx.fillStyle = c.hex;
            ctx.fillRect(ox, cy, CELL_SIZE - 1, CELL_SIZE - 1);
            ctx.fillStyle = getContrastYIQ(c.rgb.r, c.rgb.g, c.rgb.b);
            ctx.font = '9px monospace';
            ctx.fillText(c.code, ox + CELL_SIZE / 2, cy + CELL_SIZE / 2);

            const fx = cx + CELL_SIZE / 2, fy = cy + CELL_SIZE / 2;
            fusedCtx.beginPath(); fusedCtx.arc(fx, fy, CELL_SIZE / 2 - 1, 0, 2 * Math.PI);
            fusedCtx.fillStyle = c.hex; fusedCtx.fill();
            fusedCtx.beginPath(); fusedCtx.arc(fx, fy, CELL_SIZE / 6, 0, 2 * Math.PI);
            fusedCtx.fillStyle = 'rgba(0,0,0,0.15)'; fusedCtx.fill();
        }
    }

    drawGridOverlay(baseCtx, baseCanvas, gridW, gridH, CELL_SIZE, 0);
    drawGridOverlay(ctx, outputCanvas, gridW, gridH, CELL_SIZE, AXIS_OFFSET);
    drawGridOverlay(fusedCtx, fusedCanvas, gridW, gridH, CELL_SIZE, 0);

    generateBeadTable(beadCounts);
}
