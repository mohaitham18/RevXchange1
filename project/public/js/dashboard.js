document.addEventListener('DOMContentLoaded', () => {

    // ── Auth guard ─────────────────────────────────────────────
    const token = localStorage.getItem('rxToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // ── Fetch real user from API ───────────────────────────────
    async function loadUserProfile() {
        try {
            const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                localStorage.clear();
                window.location.href = '/login.html';
                return;
            }

            const data = await res.json();
            const user = data.user;

            localStorage.setItem('rxUser', user.name);
            localStorage.setItem('rxEmail', user.email);
            localStorage.setItem('role', user.role);

            const nameEl = document.getElementById('dashUserName');
            if (nameEl) nameEl.textContent = `Welcome back, ${user.name}`;

            const settingName = document.getElementById('settingName');
            if (settingName) settingName.value = user.name;

            const settingEmail = document.getElementById('settingEmail');
            if (settingEmail) settingEmail.value = user.email;

        } catch (err) {
            console.error('Profile fetch error:', err);
        }
    }

    loadUserProfile();

    // ── Tab switching ──────────────────────────────────────────
    const tabs = document.querySelectorAll('.dash-tab');
    const panels = document.querySelectorAll('.dash-panel');

    function switchTab(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        panels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) switchTab(tabParam);

    // ── Load My Ads from API ───────────────────────────────────
    async function loadMyAds() {
        const grid = document.getElementById('myAdsGrid');
        if (!grid) return;

        try {
            const res = await fetch('/api/cars/my-cars', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const myAds = data.cars || [];

            if (myAds.length === 0) {
                grid.innerHTML = `<div class="dash-empty">
                    <span>🚗</span>
                    <p>You haven't listed any cars yet.</p>
                    <a href="/sell-car.html">+ List Your Car</a>
                </div>`;
                return;
            }

            grid.innerHTML = myAds.map(car => `
                <div class="dash-ad-card">
                    <div class="dash-ad-img">
                        <img src="${car.images && car.images[0] ? car.images[0] : '/images/car-placeholder.png'}" alt="${car.brand}">
                    </div>
                    <div class="dash-ad-body">
                        <div class="dash-ad-top">
                            <div class="dash-ad-title">${car.brand} ${car.model} ${car.year}</div>
                            <span class="dash-status ${car.status}">${car.status.charAt(0).toUpperCase() + car.status.slice(1)}</span>
                        </div>
                        <div class="dash-ad-price">${car.price.toLocaleString('en-EG')} EGP</div>
                        <div class="dash-ad-meta">
                            <span>📍 ${car.city}</span>
                            <span>🛣️ ${car.mileage.toLocaleString()} km</span>
                        </div>
                        <div class="dash-ad-actions">
                            <button class="dash-ad-btn edit">Edit</button>
                            <button class="dash-ad-btn remove" data-id="${car._id}">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('');

            grid.querySelectorAll('.dash-ad-btn.remove').forEach(btn => {
                btn.addEventListener('click', async() => {
                    const id = btn.dataset.id;
                    if (!confirm('Remove this listing?')) return;
                    const r = await fetch('/api/cars/' + id, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (r.ok) {
                        showToast('Listing removed ✓');
                        loadMyAds();
                    }
                });
            });

        } catch (err) {
            console.error('My ads error:', err);
        }
    }

    // ── Mock: Saved Ads ────────────────────────────────────────
    const savedAds = [{
            id: 4,
            brand: 'Mercedes',
            model: 'C200',
            year: 2021,
            price: 1850000,
            city: 'Cairo',
            mileage: '42,000 km',
            status: 'active',
            img: '/images/mercedes.png'
        },
        {
            id: 5,
            brand: 'BMW',
            model: '320i',
            year: 2020,
            price: 1650000,
            city: 'Giza',
            mileage: '38,000 km',
            status: 'active',
            img: '/images/BMW.png'
        },
    ];

    // ── Mock: My Posts ─────────────────────────────────────────
    const myPosts = [{
            id: 1,
            community: 'Toyota Corolla',
            text: 'Anyone know a reliable mechanic in Cairo for a Corolla 2019? AC compressor is making a grinding noise.',
            time: '2h ago',
            likes: 24,
            comments: 8
        },
        {
            id: 2,
            community: 'Kia Sportage',
            text: 'Comparing the 2023 Sportage vs MG RX5 for a family car. Which holds better resale value in Egypt long term?',
            time: '1d ago',
            likes: 41,
            comments: 15
        },
    ];

    // ── Render: Saved Ads ──────────────────────────────────────
    function renderSavedAds() {
        const grid = document.getElementById('savedAdsGrid');
        if (!grid) return;

        if (savedAds.length === 0) {
            grid.innerHTML = `<div class="dash-empty">
                <span>🔖</span>
                <p>You haven't saved any cars yet.</p>
                <a href="/used-cars.html">Browse Cars</a>
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
                    <div class="dash-ad-price">${car.price.toLocaleString('en-EG')} EGP</div>
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
                <a href="/communities.html">Explore Communities</a>
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

    // ── Toast ──────────────────────────────────────────────────
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

    // ── Save Profile ───────────────────────────────────────────
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async() => {
            const name = document.getElementById('settingName').value.trim();
            const email = document.getElementById('settingEmail').value.trim();

            if (!name) return;

            try {
                const res = await fetch('/api/auth/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, email })
                });

                const data = await res.json();

                if (!res.ok) {
                    showToast(data.message || 'Update failed');
                    return;
                }

                localStorage.setItem('rxUser', data.user.name);
                localStorage.setItem('rxEmail', data.user.email);

                const nameEl = document.getElementById('dashUserName');
                if (nameEl) nameEl.textContent = `Welcome back, ${data.user.name}`;

                showToast('Profile saved successfully ✓');

            } catch (err) {
                console.error('Update profile error:', err);
                showToast('Server error. Please try again.');
            }
        });
    }

    // ── Language toggle ────────────────────────────────────────
    document.querySelectorAll('.dash-lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // ── Init ───────────────────────────────────────────────────
    loadMyAds();
    renderSavedAds();
    renderMyPosts();

});