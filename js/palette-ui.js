let paletteData = [];
let userOverrides = {};
let activeBrushColor = 'H7';

function initPaletteData() {
    const sourcePalette = paletteSelectInput.value === 'extended' ? extendedPalette : standardPalette;
    paletteData = sourcePalette.map(color => {
        const rgb = hexToRgb(color.hex);
        const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
        return { ...color, rgb, lab, chroma: Math.sqrt(lab.a * lab.a + lab.b * lab.b) };
    });
    renderQuickPalette();
    updateBrushUI();
}

function renderQuickPalette() {
    const container = document.getElementById('quickPaletteContainer');
    container.innerHTML = '';
    paletteData.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'quick-swatch';
        swatch.style.backgroundColor = color.hex;
        swatch.title = `${color.code} ${color.hex}`;
        swatch.dataset.code = color.code;
        swatch.setAttribute('role', 'button');
        swatch.setAttribute('tabindex', '0');
        swatch.setAttribute('aria-label', `Brush ${color.code}`);
        if (color.code === activeBrushColor) swatch.classList.add('active-brush');
        const pick = () => selectBrushFromTable(color.code);
        swatch.addEventListener('click', pick);
        swatch.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        container.appendChild(swatch);
    });
}

function updateBrushUI() {
    const currentObj = paletteData.find(c => c.code === activeBrushColor) || paletteData[0];
    if (currentObj) {
        activeBrushColor = currentObj.code;
        document.getElementById('brushSwatch').style.backgroundColor = currentObj.hex;
        document.getElementById('brushCode').innerText = currentObj.code;
        document.getElementById('brushHex').innerText = currentObj.hex;
    }
    document.querySelectorAll('.quick-swatch').forEach(swatch => {
        const active = swatch.dataset.code === activeBrushColor;
        swatch.classList.toggle('active-brush', active);
        if (active) swatch.setAttribute('aria-current', 'true'); else swatch.removeAttribute('aria-current');
    });
}

function selectBrushFromTable(code) { activeBrushColor = code; updateBrushUI(); }

function setEditorTool(tool) {
    editorTool = tool;
    toolPaintBtn.classList.toggle('active', tool === 'paint');
    toolEraseBtn.classList.toggle('active', tool === 'erase');
    toolPaintBtn.setAttribute('aria-pressed', tool === 'paint');
    toolEraseBtn.setAttribute('aria-pressed', tool === 'erase');
}
toolPaintBtn.addEventListener('click', () => setEditorTool('paint'));
toolEraseBtn.addEventListener('click', () => setEditorTool('erase'));
