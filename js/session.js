// Session save / load — persists overrides + all control settings.
// Auto-saves to localStorage on every generatePattern() call.
// Manual export/import via JSON file for sharing or backup.

const SESSION_KEY = 'perler-session-v1';

function gatherSessionState() {
    return {
        gridW: gridWidthInput.value,
        gridH: gridHeightInput.value,
        scale: scalePercentInput.value,
        palette: paletteSelectInput.value,
        algo: colorAlgoSelect.value,
        smartQuantize: smartQuantizeInput.checked,
        quantizeK: quantizeColorCountInput.value,
        despeckle: despeckleInput.checked,
        mergeColors: mergeColorsInput.checked,
        h7Outline: h7OutlineInput.checked,
        outlineStrength: outlineStrengthInput.value,
        quality: qualitySlider.value,
        processingMode: processingModeSelect.value,
        flipH: flipHorizontal,
        flipV: flipVertical,
        overrides: { ...userOverrides },
        activeBrush: activeBrushColor,
        ownedColors: Array.from(ownedColorCodes),
    };
}

function applySessionState(state) {
    if (!state) return;
    if (state.gridW) gridWidthInput.value = state.gridW;
    if (state.gridH) gridHeightInput.value = state.gridH;
    if (state.scale) scalePercentInput.value = state.scale;
    if (state.palette) paletteSelectInput.value = state.palette;
    if (state.algo) colorAlgoSelect.value = state.algo;
    if (state.smartQuantize != null) {
        smartQuantizeInput.checked = state.smartQuantize;
        document.getElementById('quantizeCountGroup').style.display = state.smartQuantize ? '' : 'none';
    }
    if (state.quantizeK) { quantizeColorCountInput.value = state.quantizeK; quantizeCountValue.innerText = state.quantizeK; }
    if (state.despeckle != null) despeckleInput.checked = state.despeckle;
    if (state.mergeColors != null) mergeColorsInput.checked = state.mergeColors;
    if (state.h7Outline != null) h7OutlineInput.checked = state.h7Outline;
    if (state.outlineStrength) { outlineStrengthInput.value = state.outlineStrength; outlineStrengthValue.innerText = state.outlineStrength; }
    if (state.quality) { qualitySlider.value = state.quality; qualityValue.textContent = qualityLabel(parseInt(state.quality)); }
    if (state.processingMode) processingModeSelect.value = state.processingMode;
    if (state.overrides) userOverrides = { ...state.overrides };
    if (state.activeBrush) activeBrushColor = state.activeBrush;
    if (Array.isArray(state.ownedColors)) {
        ownedColorCodes = new Set(state.ownedColors);
        renderOwnedColorsUI();
    }
    initPaletteData();
}

// Auto-save hook — called from generatePattern() tail
function sessionAutoSave() {
    if (!croppedImageData) return; // nothing meaningful to save without an image
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(gatherSessionState())); } catch (e) { /* storage full or private mode */ }
}

// Export to .json file
function exportSession() {
    const blob = new Blob([JSON.stringify(gatherSessionState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'perler-session.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// Import from .json file
function importSession(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const state = JSON.parse(e.target.result);
            applySessionState(state);
            if (croppedImageData) generatePattern();
            showToast('Session loaded ✓');
        } catch {
            showToast('Could not parse session file', 'error');
        }
    };
    reader.readAsText(file);
}

// Wire up the export button and the hidden file input for import
document.getElementById('exportSessionBtn').addEventListener('click', exportSession);
document.getElementById('importSessionInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) { importSession(file); e.target.value = ''; }
});
document.getElementById('importSessionBtn').addEventListener('click', () => {
    document.getElementById('importSessionInput').click();
});
