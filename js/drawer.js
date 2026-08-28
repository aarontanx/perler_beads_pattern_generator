// Sidebar toggle: desktop = collapse/expand; mobile = slide-in drawer.
// The hamburger button is always visible. On desktop it toggles the
// sidebar-collapsed class on .dashboard-layout. On mobile (<= 900px) it
// opens the full-screen drawer as before.

const _layout = document.querySelector('.dashboard-layout');

function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }

/* ── Desktop toggle ─────────────────────────────────────────────────────── */
function desktopToggleSidebar() {
    const collapsed = _layout.classList.toggle('sidebar-collapsed');
    hamburgerBtn.setAttribute('aria-expanded', String(!collapsed));
    // Re-fit the canvas to the new main-panel width after the CSS transition
    setTimeout(() => { if (typeof applyZoom === 'function') applyZoom(); }, 270);
}

/* ── Mobile drawer (unchanged behaviour) ───────────────────────────────── */
function openMobileDrawer() {
    sidebarDrawer.classList.add('open');
    drawerOverlay.classList.add('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
}
function closeMobileDrawer() {
    sidebarDrawer.classList.remove('open');
    drawerOverlay.classList.remove('visible');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
}

/* ── Wire everything up ─────────────────────────────────────────────────── */
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
        if (isMobile()) openMobileDrawer();
        else desktopToggleSidebar();
    });
}
if (drawerCloseBtn)  drawerCloseBtn.addEventListener('click', closeMobileDrawer);
if (drawerOverlay)   drawerOverlay.addEventListener('click', closeMobileDrawer);
