        // Control Panel Changes
        [gridWidthInput, gridHeightInput, processingModeSelect, paletteSelectInput, colorAlgoSelect].forEach(el => el.addEventListener('change', generatePattern));
        outlineModeSelect.addEventListener('change', () => {
            outlineThresholdInput.disabled = outlineModeSelect.value === 'none';
            thresholdLabel.innerText = `Sensitivity (${outlineModeSelect.value === 'none' ? 'N/A' : outlineThresholdInput.value})`;
            generatePattern();
        });
        outlineThresholdInput.addEventListener('input', () => { thresholdLabel.innerText = `Sensitivity (${outlineThresholdInput.value})`; generatePattern(); });
        h7GravityInput.addEventListener('input', () => { gravityLabel.innerText = `H7 Edge Snap / Gravity (${h7GravityInput.value})`; generatePattern(); });
        paletteSelectInput.addEventListener('change', initPaletteData);

        smartQuantizeInput.addEventListener('change', () => {
            quantizeCountGroup.style.display = smartQuantizeInput.checked ? '' : 'none';
            generatePattern();
        });
        quantizeColorCountInput.addEventListener('input', () => {
            quantizeCountLabel.innerText = `Target Color Count (${quantizeColorCountInput.value})`;
            generatePattern();
        });
        despeckleInput.addEventListener('change', generatePattern);
        quantizeCountGroup.style.display = smartQuantizeInput.checked ? '' : 'none';

        document.querySelectorAll('.theme-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active'); document.body.setAttribute('data-theme', sw.getAttribute('data-theme'));
            });
        });

