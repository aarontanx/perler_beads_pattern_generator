// Undo / Redo for pixel-editor overrides.
// Only overrides (userOverrides) are tracked — not grid size or palette
// settings, which have their own controls and don't need a history stack.
//
// Each entry is a deep-copy snapshot of userOverrides taken BEFORE a
// paint/erase stroke commits. generatePattern() is called after every
// restore. Max history depth: 20 entries.

const UNDO_MAX = 20;
const undoStack = [];   // past states (index 0 = oldest)
const redoStack = [];   // future states (most recent undo)

/* Snapshot the current overrides before a stroke begins. Called by the
   editor at pointerdown — one snapshot per drag, not per cell. */
function undoSnapshot() {
    undoStack.push(JSON.stringify(userOverrides));
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0; // a new stroke invalidates the redo trail
    updateUndoButtons();
}

function undoApply() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(userOverrides));
    userOverrides = JSON.parse(undoStack.pop());
    generatePattern();
    updateUndoButtons();
}

function redoApply() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(userOverrides));
    userOverrides = JSON.parse(redoStack.pop());
    generatePattern();
    updateUndoButtons();
}

function updateUndoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

// Button click listeners
document.getElementById('undoBtn').addEventListener('click', undoApply);
document.getElementById('redoBtn').addEventListener('click', redoApply);

// Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
document.addEventListener('keydown', e => {
    // Don't intercept when user is typing in an input/select
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
            if (e.shiftKey) { e.preventDefault(); redoApply(); }
            else            { e.preventDefault(); undoApply(); }
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault(); redoApply();
        }
    }
});
