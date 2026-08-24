/* DESPECKLE — replaces isolated single-pixel outliers when a strong majority
   (>=75%) of valid neighbors agree. Locked cells are never overwritten. */
function despeckleGrid(matchedGrid, gridW, gridH, lockedGrid) {
    const result = matchedGrid.slice();
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const i = y * gridW + x;
            if (!matchedGrid[i] || lockedGrid[i]) continue;

            const neighborCodes = [];
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= gridW || ny >= gridH) continue;
                const ni = ny * gridW + nx;
                if (matchedGrid[ni]) neighborCodes.push(matchedGrid[ni].code);
            }
            if (neighborCodes.length < 3) continue;
            if (neighborCodes.includes(matchedGrid[i].code)) continue;

            const counts = {};
            neighborCodes.forEach(c => counts[c] = (counts[c] || 0) + 1);
            let bestCode = null, bestCount = 0;
            for (const code in counts) { if (counts[code] > bestCount) { bestCount = counts[code]; bestCode = code; } }

            if (bestCode && bestCount / neighborCodes.length >= 0.75) {
                const replacement = paletteData.find(c => c.code === bestCode);
                if (replacement) result[i] = replacement;
            }
        }
    }
    return result;
}

/* MERGE NEAR-IDENTICAL BEAD COLORS — compression pass.
   Among colors actually used in the pattern, if two used swatches sit within
   `threshold` ΔE2000 of each other, the rarer one's cells re-point to the more
   common one. Cuts distinct bead purchases with no visible quality loss. */
function mergeSimilarColors(matchedGrid, threshold = 2.0) {
    const usage = new Map(); // code -> count
    matchedGrid.forEach(c => { if (c) usage.set(c.code, (usage.get(c.code) || 0) + 1); });
    const used = paletteData.filter(c => usage.has(c.code));
    // sort rare → common so merges always point toward the dominant color
    used.sort((a, b) => usage.get(a.code) - usage.get(b.code));

    const remap = new Map();
    const survivors = [];
    for (const color of used) {
        let target = null;
        for (const s of survivors) {
            if (Math.abs(s.lab.l - color.lab.l) > 12) continue; // cheap prefilter
            if (deltaE2000(color.lab, s.lab) <= threshold) { target = s; break; }
        }
        remap.set(color.code, target ? target.code : color.code);
        if (!target) survivors.push(color);
    }
    return matchedGrid.map(c => c ? (paletteData.find(p => p.code === remap.get(c.code)) || c) : null);
}

/* ACCURATE GRID SAMPLING — reads every source pixel per cell.
   Pixel mode: dominant color. Photo mode: area-weighted average. */
function sampleGridCells(sourceCanvas, gridW, gridH, isPixelMode) {
    const srcW = sourceCanvas.width, srcH = sourceCanvas.height;
    const srcData = sourceCanvas.getContext('2d').getImageData(0, 0, srcW, srcH).data;
    const out = new Float64Array(gridW * gridH * 4);

    for (let gy = 0; gy < gridH; gy++) {
        const sy0 = Math.floor(gy * srcH / gridH);
        const sy1 = Math.max(sy0 + 1, Math.floor((gy + 1) * srcH / gridH));
        for (let gx = 0; gx < gridW; gx++) {
            const sx0 = Math.floor(gx * srcW / gridW);
            const sx1 = Math.max(sx0 + 1, Math.floor((gx + 1) * srcW / gridW));

            let alphaSum = 0, totalCount = 0;
            let sumR = 0, sumG = 0, sumB = 0, opaqueCount = 0;
            const modeBuckets = isPixelMode ? new Map() : null;

            for (let sy = sy0; sy < sy1; sy++) {
                for (let sx = sx0; sx < sx1; sx++) {
                    const si = (sy * srcW + sx) * 4;
                    const a = srcData[si + 3];
                    totalCount++; alphaSum += a;
                    if (a < 30) continue;
                    const r = srcData[si], g = srcData[si + 1], b = srcData[si + 2];
                    opaqueCount++;
                    if (isPixelMode) {
                        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
                        let bucket = modeBuckets.get(key);
                        if (!bucket) { bucket = { count: 0, r: 0, g: 0, b: 0 }; modeBuckets.set(key, bucket); }
                        bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
                    } else {
                        sumR += r; sumG += g; sumB += b;
                    }
                }
            }

            const outIdx = (gy * gridW + gx) * 4;
            out[outIdx + 3] = totalCount > 0 ? alphaSum / totalCount : 0;
            if (opaqueCount === 0) continue;

            if (isPixelMode) {
                let best = null;
                modeBuckets.forEach(bucket => { if (!best || bucket.count > best.count) best = bucket; });
                out[outIdx] = best.r / best.count;
                out[outIdx + 1] = best.g / best.count;
                out[outIdx + 2] = best.b / best.count;
            } else {
                out[outIdx] = sumR / opaqueCount;
                out[outIdx + 1] = sumG / opaqueCount;
                out[outIdx + 2] = sumB / opaqueCount;
            }
        }
    }
    return out;
}
