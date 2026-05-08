document.addEventListener('DOMContentLoaded', () => {

    // ── Auth guard ─────────────────────────────────────────────
    const user = localStorage.getItem('rxUser');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // ── Set username ───────────────────────────────────────────
    const nameEl = document.getElementById('dashUserName');
    if (nameEl) nameEl.textContent = `Welcome back, ${user}`;

    const settingName = document.getElementById('settingName');
    if (settingName) settingName.value = user;

    // ── Tab switching ──────────────────────────────────────────
    const tabs   = document.querySelectorAll('.dash-tab');
    const panels = document.querySelectorAll('.dash-panel');

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        panels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // ── Read tab from URL param (?tab=settings) ────────────────
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) switchTab(tabParam);

    // ── Mock data ──────────────────────────────────────────────
    const myAds = [
        {
            id: 1, brand: 'Toyota', model: 'Corolla', year: 2021,
            price: 620000, city: 'Cairo', mileage: '34,000 km',
            status: 'active', img: '../assets/images/toyota.png'
        },
        {
            id: 2, brand: 'Kia', model: 'Sportage', year: 2020,
            price: 780000, city: 'Giza', mileage: '48,000 km',
            status: 'pending', img: '../assets/images/kia.png'
        },
        {
            id: 3, brand: 'Nissan', model: 'Sunny', year: 2019,
            price: 310000, city: 'Alexandria', mileage: '61,000 km',
            status: 'sold', img: '../assets/images/nissan.png'
        },
    ];

    const savedAds = [
        {
            id: 4, brand: 'Mercedes', model: 'C200', year: 2021,
            price: 1850000, city: 'Cairo', mileage: '42,000 km',
            status: 'active', img: '../assets/images/mercedes.png'
        },
        {
            id: 5, brand: 'BMW', model: '320i', year: 2020,
            price: 1650000, city: 'Giza', mileage: '38,000 km',
            status: 'active', img: '../assets/images/BMW.png'
        },
    ];

    const myPosts = [
        {
            id: 1, community: 'Toyota Corolla',
            text: 'Anyone know a reliable mechanic in Cairo for a Corolla 2019? AC compressor is making a grinding noise.',
            time: '2h ago', likes: 24, comments: 8
        },
        {
            id: 2, community: 'Kia Sportage',
            text: 'Comparing the 2023 Sportage vs MG RX5 for a family car. Which holds better resale value in Egypt long term?',
            time: '1d ago', likes: 41, comments: 15
        },
    ];

    // ── Format price ───────────────────────────────────────────
    function formatPrice(p) {
        return p.toLocaleString('en-EG') + ' EGP';
    }

    // ── Render: My Ads ─────────────────────────────────────────
    function renderMyAds() {
        const grid = document.getElementById('myAdsGrid');
        if (!grid) return;

        if (myAds.length === 0) {
            grid.innerHTML = `<div class="dash-empty">
                <span>🚗</span>
                <p>You haven't listed any cars yet.</p>
                <a href="sell-car.html">+ List Your Car</a>
            </div>`;
            return;
        }

        grid.innerHTML = myAds.map(car => `
            <div class="dash-ad-card">
                <div class="dash-ad-img">
                    <img src="${car.img}" alt="${car.brand}">
                </div>
                <div class="dash-ad-body">
                    <div class="dash-ad-top">
                        <div class="dash-ad-title">${car.brand} ${car.model} ${car.year}</div>
                        <span class="dash-status ${car.status}">${car.status.charAt(0).toUpperCase() + car.status.slice(1)}</span>
                    </div>
                    <div class="dash-ad-price">${formatPrice(car.price)}</div>
                    <div class="dash-ad-meta">
                        <span>📍 ${car.city}</span>
                        <span>🛣️ ${car.mileage}</span>
                    </div>
                    <div class="dash-ad-actions">
                        <button class="dash-ad-btn edit">Edit</button>
                        <button class="dash-ad-btn remove">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ── Render: Saved Ads ──────────────────────────────────────
    function renderSavedAds() {
        const grid = document.getElementById('savedAdsGrid');
        if (!grid) return;

        if (savedAds.length === 0) {
            grid.innerHTML = `<div class="dash-empty">
                <span>🔖</span>
                <p>You haven't saved any cars yet.</p>
                <a href="used-cars.html">Browse Cars</a>
            </div>`;
            return;
        }

        grid.innerHTML = savedAds.map(car => `
            <div class="dash-ad-card">
                <div class="dash-ad-img">
                    <img src="${car.img}" alt="${car.brand}">
                </div>
                <div class="dash-ad-body">
                    <div class="dash-ad-top">
                        <div class="dash-ad-title">${car.brand} ${car.model} ${car.year}</div>
                        <span class="dash-status ${car.status}">${car.status.charAt(0).toUpperCase() + car.status.slice(1)}</span>
                    </div>
                    <div class="dash-ad-price">${formatPrice(car.price)}</div>
                    <div class="dash-ad-meta">
                        <span>📍 ${car.city}</span>
                        <span>🛣️ ${car.mileage}</span>
                    </div>
                    <div class="dash-ad-actions">
                        <button class="dash-ad-btn edit">View</button>
                        <button class="dash-ad-btn remove">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ── Render: My Posts ───────────────────────────────────────
    function renderMyPosts() {
        const list = document.getElementById('myPostsList');
        if (!list) return;

        if (myPosts.length === 0) {
            list.innerHTML = `<div class="dash-empty">
                <span>💬</span>
                <p>You haven't posted in any community yet.</p>
                <a href="communities.html">Explore Communities</a>
            </div>`;
            return;
        }

        list.innerHTML = myPosts.map(post => `
            <div class="dash-post-card">
                <div class="dash-post-community">${post.community}</div>
                <p class="dash-post-text">${post.text}</p>
                <div class="dash-post-footer">
                    <div class="dash-post-stats">
                        <span>▲ ${post.likes}</span>
                        <span>💬 ${post.comments}</span>
                        <span>${post.time}</span>
                    </div>
                    <button class="dash-post-delete">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // ── Save profile toast ─────────────────────────────────────
    function showToast(msg) {
        let toast = document.querySelector('.dash-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'dash-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2800);
    }

    document.getElementById('saveProfileBtn')?.addEventListener('click', () => {
        const name = document.getElementById('settingName')?.value.trim();
        if (name) {
            localStorage.setItem('rxUser', name);
            showToast('Profile saved successfully ✓');
        }
    });

    // ── Language toggle ────────────────────────────────────────
    document.querySelectorAll('.dash-lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Init ───────────────────────────────────────────────────
    renderMyAds();
    renderSavedAds();
    renderMyPosts();

});