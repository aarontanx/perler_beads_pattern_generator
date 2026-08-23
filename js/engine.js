        function generatePattern() {
            if (!croppedImageData) return;

            const gridW = parseInt(gridWidthInput.value);
            const gridH = parseInt(gridHeightInput.value);
            const selectedAlgo = colorAlgoSelect.value;
            const activeOutlineMode = outlineModeSelect.value;
            const currentThreshold = parseFloat(outlineThresholdInput.value);
            const h7GravityVal = parseFloat(h7GravityInput.value);
            const isPixelMode = processingModeSelect.value === 'pixel';

            const cellSize = 24, axisOffset = 30;

            outputCanvas.width = (gridW * cellSize) + axisOffset; outputCanvas.height = (gridH * cellSize) + axisOffset;
            baseCanvas.width = (gridW * cellSize) + axisOffset; baseCanvas.height = (gridH * cellSize) + axisOffset;
            fusedCanvas.width = gridW * cellSize; fusedCanvas.height = gridH * cellSize;

            const imgData = sampleGridCells(croppedImageData, gridW, gridH, isPixelMode);

            baseCtx.fillStyle = '#FFFFFF'; baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
            fusedCtx.fillStyle = '#E2E6EF'; fusedCtx.fillRect(0, 0, fusedCanvas.width, fusedCanvas.height);

            baseCtx.fillStyle = ctx.fillStyle = '#6B7280';
            baseCtx.font = ctx.font = '10px sans-serif';
            baseCtx.textAlign = ctx.textAlign = 'center';
            baseCtx.textBaseline = ctx.textBaseline = 'middle';

            for (let x = 0; x < gridW; x++) { if (x % 5 === 0 || x === gridW - 1) { ctx.fillText(x + 1, axisOffset + x * cellSize + cellSize / 2, 15); baseCtx.fillText(x + 1, axisOffset + x * cellSize + cellSize / 2, 15); } }
            for (let y = 0; y < gridH; y++) { if (y % 5 === 0 || y === gridH - 1) { ctx.fillText(y + 1, 15, axisOffset + y * cellSize + cellSize / 2); baseCtx.fillText(y + 1, 15, axisOffset + y * cellSize + cellSize / 2); } }

            const beadCounts = {};
            const smartQuantizeEnabled = smartQuantizeInput.checked;
            const despeckleEnabled = despeckleInput.checked;
            const quantizeK = parseInt(quantizeColorCountInput.value);

            /* ---- PHASE 1: classify every cell, deciding which ones are eligible
               for clustering vs. which are locked (transparent / overridden /
               protected black border / forced-grey outline pixels) ---- */
            const cellCount = gridW * gridH;
            const matchedGrid = new Array(cellCount).fill(null);
            const lockedGrid = new Array(cellCount).fill(false);
            const quantizeQueue = []; // { i, r, g, b, l, a, bb }

            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const i = y * gridW + x;
                    const idx = i * 4;
                    if (imgData[idx+3] < 30) continue; // transparent, skip entirely

                    const cellKey = `${x},${y}`;
                    if (userOverrides[cellKey]) {
                        matchedGrid[i] = paletteData.find(c => c.code === userOverrides[cellKey]) || null;
                        lockedGrid[i] = true;
                        continue;
                    }

                    const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2];

                    let restrictToGrey = false;
                    if (activeOutlineMode === 'luminance' && ((r+g+b)/3) < currentThreshold) restrictToGrey = true;
                    if (activeOutlineMode === 'sobel') {
                        const rR = imgData[(y * gridW + Math.min(gridW-1, x+1))*4];
                        if (Math.abs(r - rR) > currentThreshold) restrictToGrey = true;
                    }

                    const protectedBlack = isProtectedBlack(r, g, b);

                    if (protectedBlack || restrictToGrey) {
                        // Border/outline pixels always match directly, per-pixel, restricted
                        // to neutrals. Never clustered, never despeckled away.
                        matchedGrid[i] = findClosestColor(r, g, b, selectedAlgo, true, h7GravityVal);
                        lockedGrid[i] = true;
                    } else if (smartQuantizeEnabled) {
                        quantizeQueue.push({ i, r, g, b, lab: rgbToLab(r, g, b) });
                    } else {
                        matchedGrid[i] = findClosestColor(r, g, b, selectedAlgo, false, h7GravityVal);
                    }
                }
            }

            /* ---- PHASE 2: cluster the eligible pixels and map each cluster to
               its nearest bead color once, instead of per-pixel ---- */
            if (smartQuantizeEnabled && quantizeQueue.length > 0) {
                // If the source already has few distinct colors (e.g. clean pixel art
                // that's already flat), clustering can only hurt - it risks merging two
                // genuinely different colors into one blended average. In that case, skip
                // clustering and match each distinct color directly instead.
                const uniqueColorMap = new Map();
                quantizeQueue.forEach(p => {
                    const key = ((p.r >> 2) << 12) | ((p.g >> 2) << 6) | (p.b >> 2);
                    if (!uniqueColorMap.has(key)) uniqueColorMap.set(key, { r: p.r, g: p.g, b: p.b });
                });

                const clusterColorCache = {};
                let assignments, effectiveQuantizeK;

                if (uniqueColorMap.size <= quantizeK) {
                    // Exact path: one "cluster" per distinct color, no averaging/merging.
                    const keyToClusterIdx = {};
                    let nextIdx = 0;
                    uniqueColorMap.forEach((color, key) => { keyToClusterIdx[key] = nextIdx++; });
                    assignments = quantizeQueue.map(p => {
                        const key = ((p.r >> 2) << 12) | ((p.g >> 2) << 6) | (p.b >> 2);
                        return keyToClusterIdx[key];
                    });
                    uniqueColorMap.forEach((color, key) => {
                        clusterColorCache[keyToClusterIdx[key]] = findClosestColor(color.r, color.g, color.b, selectedAlgo, false, h7GravityVal);
                    });
                } else {
                    const result = kMeansLab(quantizeQueue.map(p => p.lab), quantizeK);
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
                        const avgR = s.r / s.count, avgG = s.g / s.count, avgB = s.b / s.count;
                        clusterColorCache[clusterIdx] = findClosestColor(avgR, avgG, avgB, selectedAlgo, false, h7GravityVal);
                    });
                }

                assignments.forEach((clusterIdx, qi) => {
                    matchedGrid[quantizeQueue[qi].i] = clusterColorCache[clusterIdx];
                });
            }

            /* ---- PHASE 3: despeckle - clean up isolated stray pixels, never
               touching locked (border/override/outline) cells ---- */
            const finalGrid = despeckleEnabled ? despeckleGrid(matchedGrid, gridW, gridH, lockedGrid) : matchedGrid;

            /* ---- PHASE 4: render ---- */
            for (let y = 0; y < gridH; y++) {
                for (let x = 0; x < gridW; x++) {
                    const i = y * gridW + x;
                    const matchedColor = finalGrid[i];
                    if (!matchedColor) continue;

                    if (!beadCounts[matchedColor.code]) beadCounts[matchedColor.code] = { count: 0, hex: matchedColor.hex };
                    beadCounts[matchedColor.code].count++;

                    const cx = axisOffset + x * cellSize, cy = axisOffset + y * cellSize;

                    baseCtx.fillStyle = matchedColor.hex; baseCtx.fillRect(cx, cy, cellSize - 1, cellSize - 1);
                    ctx.fillStyle = matchedColor.hex; ctx.fillRect(cx, cy, cellSize - 1, cellSize - 1);
                    ctx.fillStyle = getContrastYIQ(matchedColor.rgb.r, matchedColor.rgb.g, matchedColor.rgb.b);
                    ctx.font = '9px monospace'; ctx.fillText(matchedColor.code, cx + cellSize/2, cy + cellSize/2);

                    const fx = x * cellSize + cellSize/2, fy = y * cellSize + cellSize/2;
                    fusedCtx.beginPath(); fusedCtx.arc(fx, fy, cellSize/2 - 1, 0, 2 * Math.PI);
                    fusedCtx.fillStyle = matchedColor.hex; fusedCtx.fill();
                    fusedCtx.beginPath(); fusedCtx.arc(fx, fy, cellSize/6, 0, 2 * Math.PI);
                    fusedCtx.fillStyle = 'rgba(0,0,0,0.15)'; fusedCtx.fill();
                }
            }
            generateBeadTable(beadCounts);
        }

        /* --- PIXEL CANVAS OVERRIDE INTERACTION EDITOR --- */
        function handleCanvasInteraction(e, canvasEl) {
            if (!croppedImageData) return;
            const rect = canvasEl.getBoundingClientRect();
            const canvasX = (e.clientX - rect.left) * (canvasEl.width / rect.width);
            const canvasY = (e.clientY - rect.top) * (canvasEl.height / rect.height);
            const cellSize = 24, axisOffset = (canvasEl === fusedCanvas) ? 0 : 30;
            const gridX = Math.floor((canvasX - axisOffset) / cellSize);
            const gridY = Math.floor((canvasY - axisOffset) / cellSize);

            if (gridX >= 0 && gridX < parseInt(gridWidthInput.value) && gridY >= 0 && gridY < parseInt(gridHeightInput.value)) {
                const cellKey = `${gridX},${gridY}`;
                if (e.buttons === 2 || e.button === 2) { delete userOverrides[cellKey]; }
                else {
                    if (editorToolSelect.value === 'paint') userOverrides[cellKey] = activeBrushColor;
                    else delete userOverrides[cellKey];
                }
                generatePattern();
            }
        }

        [baseCanvas, outputCanvas, fusedCanvas].forEach(canvas => {
            canvas.addEventListener('mousedown', (e) => { if (e.button === 2) e.preventDefault(); isDrawing = true; handleCanvasInteraction(e, canvas); });
            canvas.addEventListener('mousemove', (e) => { if (isDrawing) handleCanvasInteraction(e, canvas); });
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        });
        window.addEventListener('mouseup', () => isDrawing = false);

