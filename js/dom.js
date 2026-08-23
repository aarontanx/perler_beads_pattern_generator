        // DOM Handles
        const imageUpload = document.getElementById('imageUpload');
        const autoCropInput = document.getElementById('autoCrop');
        const downloadBtn = document.getElementById('downloadBtn');
        const outputCanvas = document.getElementById('outputCanvas');
        const baseCanvas = document.getElementById('baseCanvas');
        const fusedCanvas = document.getElementById('fusedCanvas');
        const scalePercentInput = document.getElementById('scalePercent');
        const gridWidthInput = document.getElementById('gridWidth');
        const gridHeightInput = document.getElementById('gridHeight');
        const processingModeSelect = document.getElementById('processingMode');
        const paletteSelectInput = document.getElementById('paletteSelect');
        const colorAlgoSelect = document.getElementById('colorAlgo');
        const outlineModeSelect = document.getElementById('outlineMode');
        const outlineThresholdInput = document.getElementById('outlineThreshold');
        const thresholdLabel = document.getElementById('thresholdLabel');
        const h7GravityInput = document.getElementById('h7Gravity');
        const gravityLabel = document.getElementById('gravityLabel');
        const smartQuantizeInput = document.getElementById('smartQuantize');
        const quantizeColorCountInput = document.getElementById('quantizeColorCount');
        const quantizeCountLabel = document.getElementById('quantizeCountLabel');
        const quantizeCountGroup = document.getElementById('quantizeCountGroup');
        const despeckleInput = document.getElementById('despeckle');
        const editorToolSelect = document.getElementById('editorToolSelect');
        const layoutResizer = document.getElementById('layoutResizer');
        const dashboardLayout = document.querySelector('.dashboard-layout');
        const canvasSizingMode = document.getElementById('canvasSizingMode');
        const canvasSizeSlider = document.getElementById('canvasSizeSlider');
        const canvasSizeValue = document.getElementById('canvasSizeValue');
        const canvasGrid = document.querySelector('.canvas-grid');

        const ctx = outputCanvas.getContext('2d');
        const baseCtx = baseCanvas.getContext('2d');
        const fusedCtx = fusedCanvas.getContext('2d');

        let croppedImageData = null;
        let baseCropCanvas = null;
        let flipHorizontal = false;
        let flipVertical = false;

        const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
        const flipVerticalBtn = document.getElementById('flipVerticalBtn');
        const thumbPreview = document.getElementById('thumbPreview');

        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const drawerCloseBtn = document.getElementById('drawerCloseBtn');
        const drawerOverlay = document.getElementById('drawerOverlay');
        const sidebarDrawer = document.getElementById('sidebarDrawer');

