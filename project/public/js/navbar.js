document.addEventListener('DOMContentLoaded', () => {

    // ─── Navbar Scroll + Oval Transition ──────────────────────
    const navbar = document.querySelector('.navbar');
    const hero = document.querySelector('.hero-bg');

    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 80);
        });
    }

    // ─── Hero Fade ────────────────────────────────────────────
    if (hero) {
        window.addEventListener('scroll', () => {
            const opacity = Math.max(0, 1 - window.scrollY / 400);
            hero.style.opacity = opacity;
        });
    }

    // ─── Tab Click Handler ────────────────────────────────────
    const tabButtons = document.querySelectorAll('.tabs button');
    const title = document.getElementById('sectionTitle');

    if (tabButtons.length > 0) {
        tabButtons.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('active')) return;
                tabButtons.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if (title) title.textContent = tab.textContent;
                if (typeof switchTab === 'function') switchTab(tab.textContent.trim());
            });
        });
    }

    // ─── Nav Indicator ────────────────────────────────────────
    const navIndicator   = document.getElementById('navIndicator');
    const navLinksList   = document.querySelector('.nav-links');
    const navLinkAnchors = document.querySelectorAll('.nav-links a');

    if (navIndicator && navLinksList) {
        function moveIndicator(anchor) {
            const listRect = navLinksList.getBoundingClientRect();
            const linkRect = anchor.getBoundingClientRect();
            navIndicator.style.left    = (linkRect.left - listRect.left) + 'px';
            navIndicator.style.width   = linkRect.width + 'px';
            navIndicator.style.opacity = '1';
        }

        navLinkAnchors.forEach(anchor => {
            anchor.addEventListener('mouseenter', () => moveIndicator(anchor));
        });

        navLinksList.addEventListener('mouseleave', () => {
            navIndicator.style.opacity = '0';
        });
    }

    // ─── Auth UI ──────────────────────────────────────────────
    const loginBtn       = document.getElementById('loginBtn');
    const profileMenu    = document.getElementById('profileMenu');
    const profileTrigger = document.getElementById('profileTrigger');
    const profileName    = document.getElementById('profileName');
    const dropdownName   = document.getElementById('dropdownName');
    const logoutBtn      = document.getElementById('logoutBtn');

    function updateAuthUI() {
        const user = localStorage.getItem('rxUser');
        if (!loginBtn || !profileMenu) return;
        if (user) {
            loginBtn.classList.add('hidden');
            profileMenu.classList.remove('hidden');
            if (profileName) profileName.textContent = user;
            if (dropdownName) dropdownName.textContent = user;
        } else {
            loginBtn.classList.remove('hidden');
            profileMenu.classList.add('hidden');
        }
    }

    profileTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu?.classList.toggle('open');
    });

    document.addEventListener('click', () => {
        profileMenu?.classList.remove('open');
    });

    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('rxUser');
        localStorage.removeItem('role');
        updateAuthUI();
    });

    updateAuthUI();

});