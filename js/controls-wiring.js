// Control wiring + theme switcher + mobile drawer
[gridWidthInput, gridHeightInput, processingModeSelect, paletteSelectInput, colorAlgoSelect].forEach(el =>
    el.addEventListener('change', generatePattern));

smartQuantizeInput.addEventListener('change', () => {
    quantizeCountGroup.style.display = smartQuantizeInput.checked ? '' : 'none';
    generatePattern();
});
quantizeColorCountInput.addEventListener('input', () => {
    quantizeCountValue.innerText = quantizeColorCountInput.value;
    generatePattern();
});
despeckleInput.addEventListener('change', generatePattern);
mergeColorsInput.addEventListener('change', generatePattern);
h7OutlineInput.addEventListener('change', generatePattern);
outlineStrengthInput.addEventListener('input', () => {
    outlineStrengthValue.innerText = outlineStrengthInput.value;
    generatePattern();
});
paletteSelectInput.addEventListener('change', () => { initPaletteData(); generatePattern(); });
quantizeCountGroup.style.display = smartQuantizeInput.checked ? '' : 'none';

// Themes (persisted)
const THEME_KEY = 'perler-theme';
function applyTheme(name) {
    document.body.setAttribute('data-theme', name);
    document.querySelectorAll('.theme-swatch').forEach(s => s.classList.toggle('active', s.getAttribute('data-theme') === name));
    try { localStorage.setItem(THEME_KEY, name); } catch (e) { /* file:// private mode */ }
}
document.querySelectorAll('.theme-swatch').forEach(sw =>
    sw.addEventListener('click', () => applyTheme(sw.getAttribute('data-theme'))));
try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
} catch (e) { /* ignore */ }

// Mobile drawer
if (hamburgerBtn && sidebarDrawer && drawerOverlay && drawerCloseBtn) {
    hamburgerBtn.addEventListener('click', () => {
        sidebarDrawer.classList.add('open');
        drawerOverlay.classList.add('visible');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
    });
    const closeDrawer = () => {
        sidebarDrawer.classList.remove('open');
        drawerOverlay.classList.remove('visible');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
    };
    drawerCloseBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
}
