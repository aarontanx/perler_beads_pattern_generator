// AUTO-OPTIMIZE — searches grid sizes & color counts for the smallest bead
// output whose fidelity stays within the user's quality tolerance.
//
// Reference point = the 100% baseline pattern (baseImageWidth wide, aspect-
// corrected). Candidates are always searched around that baseline — never
// around the current grid — so re-running at higher quality can grow the
// grid back up and at lower quality can shrink it, from any state.
//
// Fidelity metric: a candidate grid is nearest-neighbor-upscaled onto the
// baseline dimensions and compared bead-for-bead (mean ΔE2000). Unlike raw
// source-vs-bead error, this catches structural loss: a 10×10 collapse of a
// 30×30 sprite scores badly even though every remaining cell is a "correct"
// color match.

const QUALITY_LABELS = [[0, 'Smallest'], [25, 'Very compact'], [45, 'Compact'], [60, 'Balanced'], [80, 'High fidelity'], [100, 'Best']];

function qualityLabel(v) {
    let name = QUALITY_LABELS[0][1];
    for (const [min, label] of QUALITY_LABELS) if (v >= min) name = label;
    return name;
}

/* ΔE2000 stats between the candidate grid (upscaled to ref dims) and the
   baseline reference grid: mean + 90th percentile. The p90 catches localized
   collapses (e.g. blue jeans merging into grey) that a mean hides. */
function scoreVsRef(grid, w, h, refGrid, refW, refH) {
    const des = [];
    for (let ry = 0; ry < refH; ry++) {
        const cy = Math.min(h - 1, Math.floor(ry * h / refH));
        for (let rx = 0; rx < refW; rx++) {
            const cx = Math.min(w - 1, Math.floor(rx * w / refW));
            const c = grid[cy * w + cx];
            const r = refGrid[ry * refW + rx];
            if (!c || !r) continue;
            des.push(deltaE2000(c.lab, r.lab));
        }
    }
    if (!des.length) return { mean: 0, p90: 0 };
    des.sort((a, b) => a - b);
    const mean = des.reduce((a, b) => a + b, 0) / des.length;
    const p90 = des[Math.min(des.length - 1, Math.floor(des.length * 0.9))];
    return { mean, p90 };
}

function runOptimizer() {
    if (!croppedImageData || !generatePattern.lastOpts) return;

    const opts = { ...getPipelineOptions() };
    const aspect = croppedImageData.height / croppedImageData.width;
    const baseW = Math.max(5, Math.min(200, Math.round(baseImageWidth)));
    const refH = Math.max(5, Math.min(200, Math.round(baseW * aspect)));

    // Candidates always span the 100% baseline, not the current grid.
    const candidates = new Set([baseW]);
    for (let f = 0.3; f <= 1.51; f += 0.1) {
        candidates.add(Math.max(5, Math.min(200, Math.round(baseW * f))));
        candidates.add(Math.max(5, Math.min(200, Math.round((baseW * f) / 5) * 5)));
    }

    // Quality slider → allowed mean ΔE2000 vs the 100% reference.
    // 100 ≈ near-identical structure (dE ≤ 2), 0 accepts coarse output (≤ 14).
    const q = parseInt(qualitySlider.value);
    const maxDE = 14 - (q / 100) * 12;

    optimizeBtn.disabled = true;
    optimizeBtn.textContent = '⏳ Optimizing…';

    setTimeout(() => {
        try {
            // Baseline reference pattern — built ONCE with merging OFF and a high
            // color budget, so it represents true full-fidelity output. Candidates
            // are judged against it; the reference itself never collapses.
            const refSample = sampleGridCells(croppedImageData, baseW, refH, opts.isPixelMode);
            const ref = computeGrid(refSample, baseW, refH, { ...opts, mergeColors: false, quantizeK: 32 });

            let best = null;
            const kCandidates = opts.smartQuantize ? [opts.quantizeK, Math.round(opts.quantizeK * 0.75), Math.round(opts.quantizeK * 0.5), 12, 8].filter(k => k >= 4) : [null];

            for (const w of [...candidates].sort((a, b) => a - b)) {
                const h = Math.max(5, Math.min(200, Math.round(w * aspect)));
                const imgData = sampleGridCells(croppedImageData, w, h, opts.isPixelMode);

                for (const k of kCandidates) {
                    const trialOpts = { ...opts };
                    if (k !== null) trialOpts.quantizeK = k;
                    const { grid, beadCounts } = computeGrid(imgData, w, h, trialOpts);

                    const { mean, p90 } = scoreVsRef(grid, w, h, ref.grid, baseW, refH);
                    if (mean > maxDE || p90 > maxDE * 2) continue; // mean + localized-loss gate

                    const totalBeads = Object.values(beadCounts).reduce((a, b) => a + b.count, 0);
                    const distinctColors = Object.keys(beadCounts).length;
                    // Objective: minimize beads, then colors, then dimensions
                    const cost = totalBeads * (1 + distinctColors / 40) + w * h * 0.05;
                    if (!best || cost < best.cost) best = { w, h, mean, p90, totalBeads, distinctColors, cost, k: trialOpts.quantizeK };
                }
            }

            if (best) {
                const oldBeads = currentBeadCounts ? Object.values(currentBeadCounts).reduce((a, b) => a + b.count, 0) : null;
                const oldColors = currentBeadCounts ? Object.keys(currentBeadCounts).length : null;
                scalePercentInput.value = Math.max(10, Math.min(500, Math.round((best.w / baseImageWidth) * 100)));
                updateGridDimensionsFromScale();
                gridWidthInput.value = best.w;
                gridHeightInput.value = best.h;
                if (best.k && best.k !== opts.quantizeK) quantizeColorCountInput.value = best.k;
                quantizeCountValue.innerText = quantizeColorCountInput.value;
                generatePattern();

                optimizeStats.hidden = false;
                const fmt = n => n.toLocaleString();
                optimizeStats.innerHTML =
                    `<div>Grid: <strong>${best.w}×${best.h}</strong>${oldBeads ? ` <span class="stats-old">${oldBeads.toLocaleString()} beads</span>` : ''} → <strong>${fmt(best.totalBeads)} beads</strong></div>` +
                    `<div>Colors: ${oldColors ? `<span class="stats-old">${oldColors}</span> → ` : ''}<strong>${best.distinctColors}</strong></div>` +
                    `<div>Deviation from 100% reference: <strong>ΔE ${best.mean.toFixed(1)}</strong> mean / ${best.p90.toFixed(1)} worst-10% (tolerance ≤ ${maxDE.toFixed(1)})</div>`;
            } else {
                optimizeStats.hidden = false;
                optimizeStats.innerHTML = '<div>No config met the quality target — try lowering the quality slider.</div>';
            }
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.textContent = '⚡ Auto-optimize size';
        }
    }, 30);
}

qualitySlider.addEventListener('input', () => { qualityValue.textContent = qualityLabel(parseInt(qualitySlider.value)); });
optimizeBtn.addEventListener('click', runOptimizer);
