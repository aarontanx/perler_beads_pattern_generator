        let paletteData = [];
        let userOverrides = {};
        let activeBrushColor = 'H7';
        let isDrawing = false;
        let baseImageWidth = 30;
        let baseImageHeight = 30;

        function initPaletteData() {
            const paletteType = document.getElementById('paletteSelect').value;
            const sourcePalette = paletteType === 'extended' ? extendedPalette : standardPalette;
            paletteData = sourcePalette.map(color => {
                const rgb = hexToRgb(color.hex);
                const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
                const chroma = Math.sqrt(lab.a*lab.a + lab.b*lab.b);
                return { ...color, rgb: rgb, lab: lab, chroma: chroma };
            });
            renderQuickPalette();
            updateBrushUI();
        }

        function renderQuickPalette() {
            const container = document.getElementById('quickPaletteContainer');
            if (!container) return;
            container.innerHTML = '';
            paletteData.forEach(color => {
                const swatch = document.createElement('div');
                swatch.className = 'quick-swatch';
                swatch.style.backgroundColor = color.hex;
                swatch.title = `${color.code}`;
                swatch.dataset.code = color.code;
                if (color.code === activeBrushColor) swatch.classList.add('active-brush');
                swatch.addEventListener('click', () => selectBrushFromTable(color.code));
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
                swatch.classList.toggle('active-brush', swatch.dataset.code === activeBrushColor);
            });
        }

        function selectBrushFromTable(code) { activeBrushColor = code; updateBrushUI(); }

