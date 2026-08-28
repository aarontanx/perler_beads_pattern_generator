// Owned-colors filter — lets users check off the bead codes they own.
// When any owned colors are selected, findClosestColor() restricts its
// search to that subset. No owned colors checked = use full palette (safe default).
//
// State is a Set<code> (e.g. {'H7','A3'}).  Persisted via session save/load.

let ownedColorCodes = new Set(); // empty = no filter active

/* Returns the active matching palette — full paletteData unless a filter is set */
function getActivePalette() {
    if (ownedColorCodes.size === 0) return paletteData;
    const filtered = paletteData.filter(c => ownedColorCodes.has(c.code));
    return filtered.length > 0 ? filtered : paletteData; // never return empty
}

/* Render the owned-colors modal grid */
function renderOwnedColorsUI() {
    const grid = document.getElementById('ownedColorsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    paletteData.forEach(color => {
        const cell = document.createElement('label');
        cell.className = 'owned-swatch-label';
        cell.title = `${color.code} ${color.hex}`;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'owned-swatch-cb';
        cb.dataset.code = color.code;
        cb.checked = ownedColorCodes.has(color.code);
        cb.addEventListener('change', () => {
            if (cb.checked) ownedColorCodes.add(color.code);
            else ownedColorCodes.delete(color.code);
            updateOwnedFilterBadge();
            if (croppedImageData) generatePattern();
        });

        const swatch = document.createElement('span');
        swatch.className = 'owned-swatch-dot';
        swatch.style.backgroundColor = color.hex;

        const label = document.createElement('span');
        label.className = 'owned-swatch-code';
        label.textContent = color.code;

        cell.appendChild(cb);
        cell.appendChild(swatch);
        cell.appendChild(label);
        grid.appendChild(cell);
    });
    updateOwnedFilterBadge();
}

function updateOwnedFilterBadge() {
    const badge = document.getElementById('ownedFilterBadge');
    const btn = document.getElementById('ownedColorsBtn');
    if (!badge || !btn) return;
    const count = ownedColorCodes.size;
    if (count > 0) {
        badge.textContent = count;
        badge.hidden = false;
        btn.classList.add('filter-active');
        btn.title = `Owned colors filter: ${count} color${count !== 1 ? 's' : ''} selected`;
    } else {
        badge.hidden = true;
        btn.classList.remove('filter-active');
        btn.title = 'Filter by colors you own';
    }
}

/* Select/deselect all */
document.getElementById('ownedSelectAll')?.addEventListener('click', () => {
    ownedColorCodes = new Set(paletteData.map(c => c.code));
    renderOwnedColorsUI();
    if (croppedImageData) generatePattern();
});
document.getElementById('ownedClearAll')?.addEventListener('click', () => {
    ownedColorCodes.clear();
    renderOwnedColorsUI();
    if (croppedImageData) generatePattern();
});

/* Modal open / close */
const ownedModal = document.getElementById('ownedColorsModal');
document.getElementById('ownedColorsBtn')?.addEventListener('click', () => {
    renderOwnedColorsUI();
    ownedModal.hidden = false;
    ownedModal.setAttribute('aria-hidden', 'false');
});
document.getElementById('ownedColorsClose')?.addEventListener('click', () => {
    ownedModal.hidden = true;
    ownedModal.setAttribute('aria-hidden', 'true');
});
ownedModal?.addEventListener('click', e => {
    if (e.target === ownedModal) { ownedModal.hidden = true; ownedModal.setAttribute('aria-hidden', 'true'); }
});
