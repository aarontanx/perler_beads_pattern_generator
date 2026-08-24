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
