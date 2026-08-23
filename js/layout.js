        function updateGridDimensionsFromScale() {
            const scale = parseFloat(scalePercentInput.value) / 100;
            gridWidthInput.value = Math.max(5, Math.min(200, Math.round(baseImageWidth * scale)));
            gridHeightInput.value = Math.max(5, Math.min(200, Math.round(baseImageHeight * scale)));
        }

        scalePercentInput.addEventListener('change', () => { updateGridDimensionsFromScale(); generatePattern(); });
        scalePercentInput.addEventListener('input', () => { updateGridDimensionsFromScale(); generatePattern(); });

        function buildFlippedCanvas(source, fh, fv) {
            if (!fh && !fv) return source;
            const c = document.createElement('canvas');
            c.width = source.width; c.height = source.height;
            const fCtx = c.getContext('2d');
            fCtx.translate(fh ? source.width : 0, fv ? source.height : 0);
            fCtx.scale(fh ? -1 : 1, fv ? -1 : 1);
            fCtx.drawImage(source, 0, 0);
            return c;
        }

        function applyFlipState() {
            if (!baseCropCanvas) return;
            croppedImageData = buildFlippedCanvas(baseCropCanvas, flipHorizontal, flipVertical);
            thumbPreview.style.transform = `scale(${flipHorizontal ? -1 : 1}, ${flipVertical ? -1 : 1})`;
            generatePattern();
        }

        flipHorizontalBtn.addEventListener('click', () => { flipHorizontal = !flipHorizontal; flipHorizontalBtn.classList.toggle('active', flipHorizontal); applyFlipState(); });
        flipVerticalBtn.addEventListener('click', () => { flipVertical = !flipVertical; flipVerticalBtn.classList.toggle('active', flipVertical); applyFlipState(); });

        initPaletteData();

        /* --- DRAGGABLE SIDEBAR LOGIC --- */
        if (layoutResizer && dashboardLayout) {
            const startDrag = (e) => {
                e.preventDefault();
                layoutResizer.classList.add('dragging');
                document.addEventListener('mousemove', moveDrag);
                document.addEventListener('mouseup', stopDrag);
            };
            const moveDrag = (e) => {
                const bounds = dashboardLayout.getBoundingClientRect();
                const targetWidth = e.clientX - bounds.left;
                if (targetWidth > 220 && targetWidth < 600) dashboardLayout.style.gridTemplateColumns = `${targetWidth}px 8px 1fr`;
            };
            const stopDrag = () => {
                layoutResizer.classList.remove('dragging');
                document.removeEventListener('mousemove', moveDrag);
                document.removeEventListener('mouseup', stopDrag);
            };
            layoutResizer.addEventListener('mousedown', startDrag);
        }

        function adjustCanvasDisplaySizing() {
            const chosenMode = canvasSizingMode.value;
            const chosenSize = canvasSizeSlider.value;
            canvasSizeValue.innerText = `${chosenSize}px`;
            canvasGrid.className = `canvas-grid mode-${chosenMode}`;
            document.documentElement.style.setProperty('--canvas-max-width', chosenMode === 'fit-width' ? '100%' : `${chosenSize}px`);
            canvasSizeSlider.disabled = (chosenMode === 'fit-width');
        }
        canvasSizingMode.addEventListener('change', adjustCanvasDisplaySizing);
        canvasSizeSlider.addEventListener('input', adjustCanvasDisplaySizing);
        adjustCanvasDisplaySizing();

        /* --- GRID GEOMETRY TOGGLE HANDLERS --- */
        document.querySelectorAll('.geo-step-btn').forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.getAttribute('data-target');
                const step = parseInt(button.getAttribute('data-step'));
                const input = document.getElementById(targetId);
                if (!input) return;
                let val = parseInt(input.value) + step;
                input.value = Math.max(parseInt(input.min) || 1, Math.min(parseInt(input.max) || 999, val));
                input.dispatchEvent(new Event('change'));
            });
        });

        function setupCanvasResizeControl(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const scaleWrapper = container.querySelector('.canvas-scale-wrapper');
            const controls = container.querySelector('.canvas-resize-controls');
            const slider = controls.querySelector('.canvas-size-slider');
            const valueLabel = controls.querySelector('.canvas-size-value');
            
            const applyWidth = (px) => {
                const clamped = Math.min(Math.max(px, parseInt(slider.min)), parseInt(slider.max));
                scaleWrapper.style.maxWidth = `${clamped}px`;
                slider.value = clamped;
                valueLabel.textContent = `${clamped}px`;
            };
            slider.addEventListener('input', () => applyWidth(parseInt(slider.value)));
            controls.querySelector('.size-step-btn[data-step="-1"]').addEventListener('click', () => applyWidth(parseInt(slider.value) - 20));
            controls.querySelector('.size-step-btn[data-step="1"]').addEventListener('click', () => applyWidth(parseInt(slider.value) + 20));
            controls.querySelector('.size-reset-btn').addEventListener('click', () => {
                scaleWrapper.style.removeProperty('max-width');
                slider.value = 600; valueLabel.textContent = "100%";
            });
        }
        setupCanvasResizeControl('baseGridContainer');
        setupCanvasResizeControl('blueprintContainer');
        setupCanvasResizeControl('fusedSimContainer');

