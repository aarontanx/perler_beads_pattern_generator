// AUTO-OPTIMIZE — searches grid sizes & color counts for the smallest bead
// output (total beads × distinct colors) whose reconstruction error (mean
// ΔE2000 vs source) stays within the user's quality tolerance.

const QUALITY_LABELS = [[0, 'Smallest'], [25, 'Very compact'], [45, 'Compact'], [60, 'Balanced'], [80, 'High fidelity'], [100, 'Best']];

function qualityLabel(v) {
    let name = QUALITY_LABELS[0][1];
    for (const [min, label] of QUALITY_LABELS) if (v >= min) name = label;
    return name;
}

/* Mean ΔE2000 between each cell's source color and its assigned bead. */
function scoreGrid(imgData, grid, n) {
    let sum = 0, count = 0;
    for (let i = 0; i < n; i++) {
        const c = grid[i];
        if (!c) continue;
        const idx = i * 4;
        if (imgData[idx + 3] < 30) continue;
        sum += deltaE2000(rgbToLab(imgData[idx], imgData[idx + 1], imgData[idx + 2]), c.lab);
        count++;
    }
    return count ? sum / count : 0;
}

function runOptimizer() {
    if (!croppedImageData || !generatePattern.lastOpts) return;

    const opts = { ...getPipelineOptions() };
    const aspect = croppedImageData.height / croppedImageData.width;
    // Candidate widths around the current one; optimizer may move both axes.
    const currentW = parseInt(gridWidthInput.value);
    const candidates = new Set([currentW]);
    for (let f = 0.6; f <= 1.45; f += 0.15) {
        candidates.add(Math.max(5, Math.min(200, Math.round(currentW * f))));
        candidates.add(Math.max(5, Math.min(200, Math.round((currentW * f) / 5) * 5)));
    }

    // Quality slider → allowed mean ΔE2000. 100 ≈ lossless-ish (dE ≤ ~2),
    // 0 accepts coarse output (dE ≤ ~14).
    const q = parseInt(qualitySlider.value);
    const maxDE = 14 - (q / 100) * 12;

    optimizeBtn.disabled = true;
    optimizeBtn.textContent = '⏳ Optimizing…';

    setTimeout(() => {
        try {
            let best = null;
            const kCandidates = opts.smartQuantize ? [opts.quantizeK, Math.round(opts.quantizeK * 0.75), Math.round(opts.quantizeK * 0.5), 12, 8].filter(k => k >= 4) : [null];

            for (const w of [...candidates].sort((a, b) => a - b)) {
                const h = Math.max(5, Math.min(200, Math.round(w * aspect)));
                const imgData = sampleGridCells(croppedImageData, w, h, opts.isPixelMode);

                for (const k of kCandidates) {
                    const trialOpts = { ...opts };
                    if (k !== null) trialOpts.quantizeK = k;
                    const { grid, beadCounts } = computeGrid(imgData, w, h, trialOpts);

                    const de = scoreGrid(imgData, grid, w * h);
                    if (de > maxDE) continue; // too lossy for the tolerance

                    const totalBeads = Object.values(beadCounts).reduce((a, b) => a + b.count, 0);
                    const distinctColors = Object.keys(beadCounts).length;
                    // Objective: minimize beads, then colors, then dimensions
                    const cost = totalBeads * (1 + distinctColors / 40) + w * h * 0.05;
                    if (!best || cost < best.cost) best = { w, h, de, totalBeads, distinctColors, cost, k: trialOpts.quantizeK };
                }
            }

            if (best) {
                const oldBeads = currentBeadCounts ? Object.values(currentBeadCounts).reduce((a, b) => a + b.count, 0) : null;
                const oldColors = currentBeadCounts ? Object.keys(currentBeadCounts).length : null;
                scalePercentInput.value = Math.round((best.w / baseImageWidth) * 100);
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
                    `<div>Avg color deviation: <strong>ΔE ${best.de.toFixed(1)}</strong> (tolerance ≤ ${maxDE.toFixed(1)})</div>`;
            } else {
                optimizeStats.hidden = false;
                optimizeStats.innerHTML = '<div>No smaller config met the quality target — try lowering the quality slider.</div>';
            }
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.textContent = '⚡ Auto-optimize size';
        }
    }, 30);
}

qualitySlider.addEventListener('input', () => { qualityValue.textContent = qualityLabel(parseInt(qualitySlider.value)); });
optimizeBtn.addEventListener('click', runOptimizer);
