// Middle-click (button 1) drag-to-pan for all canvas-scale-wrappers.
// Mouse/keyboard only — touch is handled by the browser's native pinch/scroll.
// Space+drag is also supported as an alternative (common in design tools).

(function () {
    let panning = false;
    let panStart = null;    // { x, y, scrollLeft, scrollTop, wrapper }
    let spaceDown = false;

    function startPan(e, wrapper) {
        panning = true;
        panStart = {
            x: e.clientX,
            y: e.clientY,
            scrollLeft: wrapper.scrollLeft,
            scrollTop:  wrapper.scrollTop,
            wrapper
        };
        wrapper.style.cursor = 'grabbing';
        wrapper.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function onPointerDown(e) {
        // Middle click (button 1) OR left click while Space is held
        const isMiddle = e.button === 1 && e.pointerType === 'mouse';
        const isSpaceDrag = e.button === 0 && spaceDown && e.pointerType === 'mouse';
        if (!isMiddle && !isSpaceDrag) return;
        startPan(e, e.currentTarget);
    }

    function onPointerMove(e) {
        if (!panning || !panStart || panStart.wrapper !== e.currentTarget) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        panStart.wrapper.scrollLeft = panStart.scrollLeft - dx;
        panStart.wrapper.scrollTop  = panStart.scrollTop  - dy;
    }

    function onPointerUp(e) {
        if (!panning || panStart?.wrapper !== e.currentTarget) return;
        panning = false;
        e.currentTarget.style.cursor = spaceDown ? 'grab' : '';
        panStart = null;
    }

    // Prevent the browser's default middle-click auto-scroll cursor
    function onAuxClick(e) {
        if (e.button === 1) e.preventDefault();
    }

    function attachToWrapper(wrapper) {
        wrapper.addEventListener('pointerdown',  onPointerDown);
        wrapper.addEventListener('pointermove',  onPointerMove);
        wrapper.addEventListener('pointerup',    onPointerUp);
        wrapper.addEventListener('pointercancel',onPointerUp);
        wrapper.addEventListener('auxclick',     onAuxClick);
    }

    // Attach to all existing wrappers (canvas + compare)
    document.querySelectorAll('.canvas-scale-wrapper').forEach(attachToWrapper);
    // Also attach to the compare panel wrapper when it's created dynamically
    const compareWrapper = document.getElementById('compareWrapper');
    if (compareWrapper && !compareWrapper._panAttached) {
        attachToWrapper(compareWrapper);
        compareWrapper._panAttached = true;
    }

    // Space bar: show grab cursor on all wrappers while held
    document.addEventListener('keydown', e => {
        if (e.code !== 'Space') return;
        // Don't interfere when focus is in an input
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (spaceDown) return;
        spaceDown = true;
        document.querySelectorAll('.canvas-scale-wrapper').forEach(w => {
            if (!panning) w.style.cursor = 'grab';
        });
    });

    document.addEventListener('keyup', e => {
        if (e.code !== 'Space') return;
        spaceDown = false;
        if (!panning) {
            document.querySelectorAll('.canvas-scale-wrapper').forEach(w => {
                w.style.cursor = '';
            });
        }
    });
})();
