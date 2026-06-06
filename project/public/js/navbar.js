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
    const navIndicator = document.getElementById('navIndicator');
    const navLinksList = document.querySelector('.nav-links');
    const navLinkAnchors = document.querySelectorAll('.nav-links a');

    if (navIndicator && navLinksList) {
        function moveIndicator(anchor) {
            const listRect = navLinksList.getBoundingClientRect();
            const linkRect = anchor.getBoundingClientRect();
            navIndicator.style.left = (linkRect.left - listRect.left) + 'px';
            navIndicator.style.width = linkRect.width + 'px';
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
    const loginBtn = document.getElementById('loginBtn');
    const profileMenu = document.getElementById('profileMenu');
    const profileTrigger = document.getElementById('profileTrigger');
    const profileName = document.getElementById('profileName');
    const dropdownName = document.getElementById('dropdownName');
    const logoutBtn = document.getElementById('logoutBtn');

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

    if (profileTrigger) {
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (profileMenu) profileMenu.classList.toggle('open');
        });
    }

    document.addEventListener('click', function() {
        if (profileMenu) profileMenu.classList.remove('open');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
        localStorage.removeItem('rxUser');
        localStorage.removeItem('rxEmail');
        localStorage.removeItem('role');
        localStorage.removeItem('rxToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
            updateAuthUI();
            window.location.href = '/';
        });
    }

    updateAuthUI();

});

/* ── Car Communities mega-menu ──────────────────────────────── */
(function initCommMega() {

  const allNavLinks = document.querySelectorAll('.nav-links a');
  let commNavLink = null;
  allNavLinks.forEach(a => {
    const href = a.getAttribute('href') || '';
    if (a.textContent.trim() === 'Car Communities' ||
        href.includes('communities') || href.includes('feed')) {
      commNavLink = a;
    }
  });

  if (!commNavLink) return;

  const wrap = document.createElement('span');
  wrap.className = 'comm-nav-wrap';
  commNavLink.parentNode.insertBefore(wrap, commNavLink);
  wrap.appendChild(commNavLink);

  commNavLink.setAttribute('href', '/feed.html');

  const userName = localStorage.getItem('rxUser');
  const feedLabel = userName
    ? `${userName.split(' ')[0]}'s Feed`
    : 'Your Feed';
  const feedIcon = userName ? '👤' : '🏠';

  const mega = document.createElement('div');
  mega.className = 'comm-mega';
  mega.innerHTML = `
    <a class="comm-mega-item" href="/feed.html">
      <div class="comm-mega-icon">${feedIcon}</div>
      <div class="comm-mega-item-text">
        <div class="comm-mega-item-title">${feedLabel}</div>
        <div class="comm-mega-item-sub">Posts from your communities</div>
      </div>
    </a>
    <div class="comm-mega-divider"></div>
    <a class="comm-mega-item" href="/communities.html">
      <div class="comm-mega-icon">🔍</div>
      <div class="comm-mega-item-text">
        <div class="comm-mega-item-title">Explore Communities</div>
        <div class="comm-mega-item-sub">Browse and join car communities</div>
      </div>
    </a>
  `;
  wrap.appendChild(mega);

  let closeTimer = null;

  let openTimer = null;

  function openMega() {
    clearTimeout(closeTimer);
    clearTimeout(openTimer);
    openTimer = setTimeout(() => {
      mega.classList.add('rx-open');
    }, 900);
  }

  function cancelOpen() {
    clearTimeout(openTimer);
  }

  function schedulClose() {
    closeTimer = setTimeout(() => {
      mega.classList.remove('rx-open');
    }, 120);
  }

  wrap.addEventListener('mouseenter', openMega);
  wrap.addEventListener('mouseleave', () => { cancelOpen(); schedulClose(); });
  mega.addEventListener('mouseenter', () => { clearTimeout(closeTimer); });
  mega.addEventListener('mouseleave', schedulClose);

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      mega.classList.remove('rx-open');
    }
  });

  document.addEventListener('caraOpen', () => mega.classList.remove('rx-open'));

}());