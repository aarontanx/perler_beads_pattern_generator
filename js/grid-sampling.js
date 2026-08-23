        /* --- DESPECKLE: removes isolated single-pixel color outliers ---
           A cell is only replaced if a strong majority of its valid neighbors
           agree on a different color. Cells marked "locked" (protected black
           border, forced-grey outline pixels, manual overrides) are never
           overwritten themselves, though they can still count as neighbor votes. */
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
                    if (neighborCodes.length < 3) continue; // too close to sprite edge, leave alone

                    if (neighborCodes.includes(matchedGrid[i].code)) continue; // not isolated

                    const counts = {};
                    neighborCodes.forEach(c => counts[c] = (counts[c] || 0) + 1);
                    let bestCode = null, bestCount = 0;
                    for (const code in counts) { if (counts[code] > bestCount) { bestCount = counts[code]; bestCode = code; } }

                    // Require a strong majority (>=75% of valid neighbors) before overwriting
                    if (bestCode && bestCount / neighborCodes.length >= 0.75) {
                        const replacement = paletteData.find(c => c.code === bestCode);
                        if (replacement) result[i] = replacement;
                    }
                }
            }
            return result;
        }

        /* --- ACCURATE GRID SAMPLING ---
           A single drawImage() downscale (what this used to do) either point-samples
           (imageSmoothingEnabled=false) or relies on the browser's generic resize
           (imageSmoothingEnabled=true) - both lose most of the source image on a large
           downscale ratio and can land on stray anti-aliased edge pixels, which is a
           major source of "random" wrong colors. This instead reads every source pixel
           that falls inside each grid cell's box and:
             - Pixel Art mode: takes the DOMINANT (most frequent) color in that box,
               so a handful of anti-aliased edge pixels can't outvote the real flat color.
             - Photo mode: takes the true area-weighted average color of that box.
           Returns a flat array in the same [r,g,b,a, r,g,b,a, ...] layout the rest of
           the code already expects. */
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
                            const a = srcData[si+3];
                            totalCount++; alphaSum += a;
                            if (a < 30) continue;

                            const r = srcData[si], g = srcData[si+1], b = srcData[si+2];
                            opaqueCount++;

                            if (isPixelMode) {
                                // Bucket near-identical colors (rounded to 5 bits/channel) so a
                                // few anti-aliased blend pixels don't split votes and lose to noise.
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
                    const avgAlpha = totalCount > 0 ? alphaSum / totalCount : 0;
                    out[outIdx+3] = avgAlpha;

                    if (opaqueCount === 0) continue;

                    if (isPixelMode) {
                        let best = null;
                        modeBuckets.forEach(bucket => { if (!best || bucket.count > best.count) best = bucket; });
                        out[outIdx] = best.r / best.count;
                        out[outIdx+1] = best.g / best.count;
                        out[outIdx+2] = best.b / best.count;
                    } else {
                        out[outIdx] = sumR / opaqueCount;
                        out[outIdx+1] = sumG / opaqueCount;
                        out[outIdx+2] = sumB / opaqueCount;
                    }
                }
            }
            return out;
        }

