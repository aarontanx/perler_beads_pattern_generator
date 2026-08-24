// DOM handles + shared mutable state
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
const smartQuantizeInput = document.getElementById('smartQuantize');
const quantizeColorCountInput = document.getElementById('quantizeColorCount');
const quantizeCountValue = document.getElementById('quantizeCountValue');
const quantizeCountGroup = document.getElementById('quantizeCountGroup');
const despeckleInput = document.getElementById('despeckle');
const mergeColorsInput = document.getElementById('mergeColors');
const h7OutlineInput = document.getElementById('h7Outline');
const outlineStrengthInput = document.getElementById('outlineStrength');
const outlineStrengthValue = document.getElementById('outlineStrengthValue');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const optimizeBtn = document.getElementById('optimizeBtn');
const optimizeStats = document.getElementById('optimizeStats');
const toolPaintBtn = document.getElementById('toolPaint');
const toolEraseBtn = document.getElementById('toolErase');
const thumbPreviewContainer = document.getElementById('thumbPreviewContainer');

const ctx = outputCanvas.getContext('2d');
const baseCtx = baseCanvas.getContext('2d');
const fusedCtx = fusedCanvas.getContext('2d');

let croppedImageData = null;
let baseCropCanvas = null;
let flipHorizontal = false;
let flipVertical = false;
let editorTool = 'paint';
let currentBeadCounts = {};

const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
const flipVerticalBtn = document.getElementById('flipVerticalBtn');
const flipThumbPreview = document.getElementById('thumbPreview');

const hamburgerBtn = document.getElementById('hamburgerBtn');
const drawerCloseBtn = document.getElementById('drawerCloseBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const sidebarDrawer = document.getElementById('sidebarDrawer');
