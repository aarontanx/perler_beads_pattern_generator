function generateBeadTable(beadCounts) {
    const container = document.getElementById('beadTableContent');
    const parent = document.getElementById('beadTableContainer');
    if (!container || !parent) return;
    const codes = Object.keys(beadCounts);
    if (codes.length === 0) { parent.hidden = true; return; }

    parent.hidden = false;
    const total = codes.reduce((a, c) => a + beadCounts[c].count, 0);
    let html = `<table><thead><tr><th>Code</th><th>Color</th><th>Beads</th><th title="Highlight all cells of this color on the canvas">🔦</th></tr></thead><tbody>`;
    codes.sort((a, b) => beadCounts[b].count - beadCounts[a].count).forEach(code => {
        html += `<tr class="interactive-row" tabindex="0" role="button" aria-label="Select brush ${code} or click highlight button to locate on canvas" data-code="${code}">` +
            `<td><strong>${code}</strong></td>` +
            `<td><span class="color-swatch" style="background-color:${beadCounts[code].hex};width:22px;height:22px;"></span> ${beadCounts[code].hex}</td>` +
            `<td>${beadCounts[code].count}</td>` +
            `<td><button class="highlight-btn" data-code="${code}" title="Highlight ${code} on canvas" aria-label="Highlight ${code}" tabindex="-1">◎</button></td>` +
            `</tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>${total}</strong></td></tr></tfoot></table>`;
    container.innerHTML = html;

    container.querySelectorAll('.interactive-row').forEach(row => {
        // Left-click on the row body (not the highlight button) selects brush
        row.addEventListener('click', e => {
            if (e.target.classList.contains('highlight-btn')) return;
            selectBrushFromTable(row.dataset.code);
        });
        row.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBrushFromTable(row.dataset.code); }
            if (e.key === 'h' || e.key === 'H') { e.preventDefault(); if (typeof toggleCodeHighlight === 'function') toggleCodeHighlight(row.dataset.code); }
        });
    });

    // Highlight buttons
    container.querySelectorAll('.highlight-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            if (typeof toggleCodeHighlight === 'function') toggleCodeHighlight(btn.dataset.code);
        });
    });
}

/* ── Bead table collapse / restore ──────────────────────────────── */
(function () {
    function hideBeadTable() {
        const container = document.getElementById('beadTableContainer');
        const bar = document.getElementById('showBeadsBar');
        if (container) container.hidden = true;
        if (bar) bar.hidden = false;
        const btn = document.getElementById('beadTableToggleBtn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (typeof applyZoom === 'function') setTimeout(applyZoom, 30);
    }

    function showBeadTable() {
        const container = document.getElementById('beadTableContainer');
        const bar = document.getElementById('showBeadsBar');
        // Only show if there's actually content (a pattern has been generated)
        if (container && document.getElementById('beadTableContent')?.children.length) {
            container.hidden = false;
        }
        if (bar) bar.hidden = true;
        const btn = document.getElementById('beadTableToggleBtn');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (typeof applyZoom === 'function') setTimeout(applyZoom, 30);
    }

    document.getElementById('beadTableToggleBtn')?.addEventListener('click', hideBeadTable);
    document.getElementById('showBeadsBtn')?.addEventListener('click', showBeadTable);
})();
