function generateBeadTable(beadCounts) {
    const container = document.getElementById('beadTableContent');
    const parent = document.getElementById('beadTableContainer');
    if (!container || !parent) return;
    const codes = Object.keys(beadCounts);
    if (codes.length === 0) { parent.hidden = true; return; }

    parent.hidden = false;
    const total = codes.reduce((a, c) => a + beadCounts[c].count, 0);
    let html = `<table><thead><tr><th>Code</th><th>Color</th><th>Beads</th></tr></thead><tbody>`;
    codes.sort((a, b) => beadCounts[b].count - beadCounts[a].count).forEach(code => {
        html += `<tr class="interactive-row" tabindex="0" role="button" aria-label="Select brush ${code}" data-code="${code}"><td><strong>${code}</strong></td><td><span class="color-swatch" style="background-color:${beadCounts[code].hex};width:22px;height:22px;"></span> ${beadCounts[code].hex}</td><td>${beadCounts[code].count}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="2"><strong>Total</strong></td><td><strong>${total}</strong></td></tr></tfoot></table>`;
    container.innerHTML = html;

    container.querySelectorAll('.interactive-row').forEach(row => {
        const pick = () => selectBrushFromTable(row.dataset.code);
        row.addEventListener('click', pick);
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
}
