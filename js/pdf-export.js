// PDF Export — renders the blueprint as a single print page by default.
// Optional multi-page mode splits into 29×29 pegboard chunks (for very large
// patterns that won't fit legibly on one page).
//
// Uses canvas-to-PNG + a print window.  No external dependencies.

const PEGBOARD_CELLS = 52;
const PDF_AXIS       = 24;

/* ── Single-page render ───────────────────────────────────────────────────
   Fits the entire grid onto one canvas scaled so it prints cleanly at A4.
   Cell size is computed from available width/height so all cells are
   visible regardless of grid dimensions.                                  */
function buildSinglePage(grid, gridW, gridH, beadCounts) {
    // A4 at 96 dpi ≈ 794 × 1123 px.  Reserve the top ~20px for a header
    // and the bottom portion for the shopping list if it fits.
    const PAGE_W = 794, PAGE_H = 1123;
    const HEADER_H = 22, FOOTER_PAD = 16;

    // Calculate max cell size so the grid fits within the page
    const availW = PAGE_W - PDF_AXIS - FOOTER_PAD;
    const availH = PAGE_H * 0.7 - HEADER_H - PDF_AXIS; // ~70% for grid, rest for list
    const cellPx = Math.max(4, Math.min(20,
        Math.floor(Math.min(availW / gridW, availH / gridH))
    ));

    const gridPixW = gridW * cellPx + PDF_AXIS;
    const gridPixH = gridH * cellPx + PDF_AXIS;
    const listStartY = HEADER_H + gridPixH + 12;
    const totalH = Math.max(PAGE_H, listStartY + 300);

    const cv = document.createElement('canvas');
    cv.width = PAGE_W; cv.height = totalH;
    const p = cv.getContext('2d');

    p.fillStyle = '#fff';
    p.fillRect(0, 0, PAGE_W, totalH);

    // Header
    p.fillStyle = '#1B1F2A';
    p.font = 'bold 12px sans-serif';
    p.textAlign = 'left'; p.textBaseline = 'top';
    p.fillText(`Perler Pattern Blueprint  —  ${gridW}×${gridH} grid`, FOOTER_PAD, 4);

    // Axis labels
    p.fillStyle = '#555';
    const axFont = `${Math.max(6, Math.min(10, cellPx * 0.55))}px monospace`;
    p.font = axFont; p.textAlign = 'center'; p.textBaseline = 'middle';
    const OX = FOOTER_PAD, OY = HEADER_H; // origin of the grid block
    for (let x = 0; x < gridW; x++) {
        if (x % 5 !== 0 && x !== gridW - 1) continue;
        p.fillText(x + 1, OX + PDF_AXIS + x * cellPx + cellPx / 2, OY + PDF_AXIS / 2);
    }
    for (let y = 0; y < gridH; y++) {
        if (y % 5 !== 0 && y !== gridH - 1) continue;
        p.fillText(y + 1, OX + PDF_AXIS / 2, OY + PDF_AXIS + y * cellPx + cellPx / 2);
    }

    // Cells
    for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
            const c = grid[y * gridW + x];
            if (!c) continue;
            const cx2 = OX + PDF_AXIS + x * cellPx;
            const cy2 = OY + PDF_AXIS + y * cellPx;
            p.fillStyle = c.hex;
            p.fillRect(cx2, cy2, cellPx - 1, cellPx - 1);
            if (cellPx >= 10) {
                p.fillStyle = getContrastYIQ(c.rgb.r, c.rgb.g, c.rgb.b);
                p.font = `${Math.max(5, cellPx * 0.42)}px monospace`;
                p.textAlign = 'center'; p.textBaseline = 'middle';
                p.fillText(c.code, cx2 + cellPx / 2, cy2 + cellPx / 2);
            }
        }
    }

    // Grid overlay
    p.save();
    p.strokeStyle = 'rgba(15,23,42,0.15)'; p.lineWidth = 0.5;
    p.beginPath();
    for (let x = 1; x < gridW; x++) {
        const px = OX + PDF_AXIS + x * cellPx + 0.5;
        p.moveTo(px, OY + PDF_AXIS); p.lineTo(px, OY + PDF_AXIS + gridH * cellPx);
    }
    for (let y = 1; y < gridH; y++) {
        const py = OY + PDF_AXIS + y * cellPx + 0.5;
        p.moveTo(OX + PDF_AXIS, py); p.lineTo(OX + PDF_AXIS + gridW * cellPx, py);
    }
    p.stroke();
    p.strokeStyle = 'rgba(15,23,42,0.6)'; p.lineWidth = 1;
    p.beginPath();
    for (let x = 5; x < gridW; x += 5) {
        const px = OX + PDF_AXIS + x * cellPx + 0.5;
        p.moveTo(px, OY + PDF_AXIS); p.lineTo(px, OY + PDF_AXIS + gridH * cellPx);
    }
    for (let y = 5; y < gridH; y += 5) {
        const py = OY + PDF_AXIS + y * cellPx + 0.5;
        p.moveTo(OX + PDF_AXIS, py); p.lineTo(OX + PDF_AXIS + gridW * cellPx, py);
    }
    p.stroke();
    p.strokeRect(OX + PDF_AXIS + 1, OY + PDF_AXIS + 1, gridW * cellPx - 2, gridH * cellPx - 2);
    p.restore();

    // Shopping list (below grid)
    drawShoppingList(p, beadCounts, FOOTER_PAD, listStartY, PAGE_W - FOOTER_PAD * 2);

    return cv.toDataURL('image/png');
}

/* ── Pegboard-split pages (original multi-page mode) ─────────────────── */
function buildPdfPage(grid, gridW, gridH, startX, startY, endX, endY, pageNum, totalPages) {
    const PDF_CELL_PX = 20;
    const chunkW = endX - startX, chunkH = endY - startY;
    const cvW = chunkW * PDF_CELL_PX + PDF_AXIS;
    const cvH = chunkH * PDF_CELL_PX + PDF_AXIS;

    const cv = document.createElement('canvas');
    cv.width = cvW; cv.height = cvH;
    const pctx = cv.getContext('2d');
    pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, cvW, cvH);

    pctx.fillStyle = '#555';
    pctx.font = `${Math.max(8, PDF_CELL_PX * 0.55)}px monospace`;
    pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
    for (let x = startX; x < endX; x++) {
        const col = x - startX;
        pctx.fillText(x + 1, PDF_AXIS + col * PDF_CELL_PX + PDF_CELL_PX / 2, PDF_AXIS / 2);
    }
    for (let y = startY; y < endY; y++) {
        const row = y - startY;
        pctx.fillText(y + 1, PDF_AXIS / 2, PDF_AXIS + row * PDF_CELL_PX + PDF_CELL_PX / 2);
    }

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const c = grid[y * gridW + x];
            if (!c) continue;
            const col = x - startX, row = y - startY;
            const ox = PDF_AXIS + col * PDF_CELL_PX, oy = PDF_AXIS + row * PDF_CELL_PX;
            pctx.fillStyle = c.hex;
            pctx.fillRect(ox, oy, PDF_CELL_PX - 1, PDF_CELL_PX - 1);
            pctx.fillStyle = getContrastYIQ(c.rgb.r, c.rgb.g, c.rgb.b);
            pctx.font = `${Math.max(6, PDF_CELL_PX * 0.42)}px monospace`;
            pctx.textAlign = 'center'; pctx.textBaseline = 'middle';
            pctx.fillText(c.code, ox + PDF_CELL_PX / 2, oy + PDF_CELL_PX / 2);
        }
    }

    const sz = PDF_CELL_PX;
    pctx.save();
    pctx.strokeStyle = 'rgba(15,23,42,0.16)'; pctx.lineWidth = 0.5;
    pctx.beginPath();
    for (let x = 1; x < chunkW; x++) { const px = PDF_AXIS + x * sz + 0.5; pctx.moveTo(px, PDF_AXIS); pctx.lineTo(px, PDF_AXIS + chunkH * sz); }
    for (let y = 1; y < chunkH; y++) { const py = PDF_AXIS + y * sz + 0.5; pctx.moveTo(PDF_AXIS, py); pctx.lineTo(PDF_AXIS + chunkW * sz, py); }
    pctx.stroke();
    pctx.strokeStyle = 'rgba(15,23,42,0.75)'; pctx.lineWidth = 1;
    pctx.beginPath();
    for (let x = 5; x < chunkW; x += 5) { const px = PDF_AXIS + x * sz + 0.5; pctx.moveTo(px, PDF_AXIS); pctx.lineTo(px, PDF_AXIS + chunkH * sz); }
    for (let y = 5; y < chunkH; y += 5) { const py = PDF_AXIS + y * sz + 0.5; pctx.moveTo(PDF_AXIS, py); pctx.lineTo(PDF_AXIS + chunkW * sz, py); }
    pctx.stroke();
    pctx.strokeRect(PDF_AXIS + 1, PDF_AXIS + 1, chunkW * sz - 2, chunkH * sz - 2);
    pctx.restore();

    pctx.fillStyle = '#333'; pctx.font = 'bold 11px sans-serif';
    pctx.textAlign = 'left'; pctx.textBaseline = 'top';
    pctx.fillText(`Perler Pattern  —  Grid ${startX + 1}-${endX} × ${startY + 1}-${endY}  (page ${pageNum} of ${totalPages})`, PDF_AXIS, 2);

    return cv.toDataURL('image/png');
}

/* ── Shared shopping-list renderer ──────────────────────────────────────── */
function drawShoppingList(p, beadCounts, x0, y0, availWidth) {
    const PAD = 0;
    let y = y0;

    p.fillStyle = '#1B1F2A'; p.font = 'bold 13px sans-serif';
    p.textAlign = 'left'; p.textBaseline = 'top';
    p.fillText('Beads Required', x0, y); y += 20;

    const total = Object.values(beadCounts).reduce((a, b) => a + b.count, 0);
    p.font = '11px sans-serif'; p.fillStyle = '#555';
    p.fillText(`Total: ${total.toLocaleString()}  ·  ${Object.keys(beadCounts).length} colors`, x0, y); y += 16;

    p.strokeStyle = '#ccc'; p.lineWidth = 0.5;
    p.beginPath(); p.moveTo(x0, y); p.lineTo(x0 + availWidth, y); p.stroke(); y += 8;

    const codes = Object.keys(beadCounts).sort((a, b) => beadCounts[b].count - beadCounts[a].count);
    const COLS = 3, ROW_H = 22, SWATCH = 14;
    const COL_W = availWidth / COLS;

    p.font = 'bold 9px sans-serif'; p.fillStyle = '#888';
    for (let c = 0; c < COLS; c++) {
        const cx = x0 + c * COL_W;
        p.fillText('CODE', cx, y);
        p.fillText('BEADS', cx + COL_W - 36, y);
    }
    y += 14;

    codes.forEach((code, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const rx = x0 + col * COL_W;
        const ry = y + row * ROW_H;

        const { hex, count } = beadCounts[code];
        // Row tint
        if (Math.floor(idx / COLS) % 2 === 0) {
            p.fillStyle = 'rgba(0,0,0,0.025)';
            p.fillRect(rx, ry, COL_W, ROW_H);
        }
        // Swatch
        p.fillStyle = hex;
        p.fillRect(rx + 28, ry + (ROW_H - SWATCH) / 2, SWATCH, SWATCH);
        p.strokeStyle = 'rgba(0,0,0,0.2)'; p.lineWidth = 0.5;
        p.strokeRect(rx + 28, ry + (ROW_H - SWATCH) / 2, SWATCH, SWATCH);
        // Code
        p.fillStyle = '#1B1F2A'; p.font = 'bold 10px monospace';
        p.textAlign = 'left'; p.textBaseline = 'middle';
        p.fillText(code, rx, ry + ROW_H / 2);
        // Count
        p.fillStyle = '#333'; p.font = '10px sans-serif';
        p.textAlign = 'right';
        p.fillText(count.toLocaleString(), rx + COL_W - 4, ry + ROW_H / 2);
    });
}

function buildShoppingPage(beadCounts) {
    const cv = document.createElement('canvas');
    cv.width = 794; cv.height = 1123;
    const p = cv.getContext('2d');
    p.fillStyle = '#fff'; p.fillRect(0, 0, cv.width, cv.height);
    drawShoppingList(p, beadCounts, 40, 40, cv.width - 80);
    return cv.toDataURL('image/png');
}

/* ── Main export entry point ─────────────────────────────────────────────── */
function exportPDF() {
    if (!croppedImageData || !currentBeadCounts) {
        showToast('Generate a pattern first', 'error'); return;
    }

    const gridW = parseInt(gridWidthInput.value);
    const gridH = parseInt(gridHeightInput.value);
    // Use cached grid if available, otherwise recompute
    const grid = window._lastGrid ||
        computeGrid(
            sampleGridCells(croppedImageData, gridW, gridH, processingModeSelect.value === 'pixel'),
            gridW, gridH, getPipelineOptions()
        ).grid;

    const multiPage = (gridW > PEGBOARD_CELLS || gridH > PEGBOARD_CELLS) &&
                      document.getElementById('pdfMultiPageToggle')?.checked;

    let pages;
    if (multiPage) {
        pages = [];
        const xChunks = Math.ceil(gridW / PEGBOARD_CELLS);
        const yChunks = Math.ceil(gridH / PEGBOARD_CELLS);
        const totalPages = xChunks * yChunks + 1;
        let pageNum = 0;
        for (let cy = 0; cy < yChunks; cy++) {
            for (let cx = 0; cx < xChunks; cx++) {
                const startX = cx * PEGBOARD_CELLS, startY = cy * PEGBOARD_CELLS;
                const endX = Math.min(startX + PEGBOARD_CELLS, gridW);
                const endY = Math.min(startY + PEGBOARD_CELLS, gridH);
                pageNum++;
                pages.push(buildPdfPage(grid, gridW, gridH, startX, startY, endX, endY, pageNum, totalPages));
            }
        }
        pages.push(buildShoppingPage(currentBeadCounts));
    } else {
        pages = [buildSinglePage(grid, gridW, gridH, currentBeadCounts)];
    }

    const pw = window.open('', '_blank', 'width=900,height=700');
    if (!pw) { showToast('Pop-up blocked — allow pop-ups to export PDF', 'error'); return; }

    const imgTags = pages.map(src =>
        `<div class="page"><img src="${src}"></div>`
    ).join('');

    pw.document.write(`<!DOCTYPE html><html><head>
        <title>Perler Pattern Blueprint</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #fff; }
            .page { page-break-after: always; width: 100%; }
            .page img { display: block; width: 100%; height: auto; }
            @media print { .no-print { display: none; } }
        </style>
    </head><body>
        <div class="no-print" style="padding:12px;background:#f3f5fa;border-bottom:1px solid #ddd;font:13px sans-serif;display:flex;gap:10px;align-items:center;">
            <strong>Perler Pattern Blueprint</strong> — ${pages.length} page${pages.length > 1 ? 's' : ''}
            <button onclick="window.print()" style="margin-left:auto;padding:8px 18px;background:#4F5FF0;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:600;">🖨️ Print / Save as PDF</button>
        </div>
        ${imgTags}
    </body></html>`);
    pw.document.close();
    showToast(`PDF ready — ${pages.length} page${pages.length > 1 ? 's' : ''}`);
}

document.getElementById('pdfExportBtn')?.addEventListener('click', exportPDF);
