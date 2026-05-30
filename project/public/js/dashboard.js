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

            // Update localStorage with fresh data
            localStorage.setItem('rxUser', user.name);
            localStorage.setItem('rxEmail', user.email);
            localStorage.setItem('role', user.role);

            // Update UI
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

    // ── Helpers ────────────────────────────────────────────────
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // ── Load real My Ads from API ──────────────────────────────
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
                    <div class="dash-ad-img carousel-wrapper">
                        ${car.images && car.images.length > 0 ? `
                            ${car.images.map((src, i) => `
                                <div class="carousel-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                                    <img src="${src}" alt="${car.brand}">
                                </div>
                            `).join('')}
                            ${car.images.length > 1 ? `
                                <button class="carousel-arrow carousel-prev" data-id="${car._id}">&#8249;</button>
                                <button class="carousel-arrow carousel-next" data-id="${car._id}">&#8250;</button>
                                <div class="carousel-counter" data-id="${car._id}">1 / ${car.images.length}</div>
                            ` : ''}
                        ` : `<div class="dash-ad-img-placeholder">🚗</div>`}
                    </div>
                    <div class="dash-ad-body">
                        <div class="dash-ad-top">
                            <div class="dash-ad-title">${car.brand.replace(/,/g,'')}, ${car.model.replace(/,/g,'')}, ${car.year}</div>
                            <span class="dash-status ${car.status}">${car.status.charAt(0).toUpperCase() + car.status.slice(1)}</span>
                        </div>
                        <div class="dash-ad-price">${car.price.toLocaleString('en-EG')} EGP</div>
                        <div class="dash-ad-meta">
                            <span>📍 ${car.city}</span>
                            <span>🛣️ ${car.mileage.toLocaleString()} km</span>
                        </div>
                        <div class="dash-ad-tags">
                            <span class="car-tag">${capitalize(car.transmission)}</span>
                            <span class="car-tag">${capitalize(car.fuel)}</span>
                            ${car.color ? `<span class="car-tag">🎨 ${capitalize(car.color)}</span>` : ''}
                            ${car.fabrika ? `<span class="car-tag car-tag-fabrika">Fabrika</span>` : ''}
                        </div>
                        <div class="dash-ad-actions">
                            <button class="dash-ad-btn edit" data-id="${car._id}" data-car='${JSON.stringify(car)}'>Edit</button>
                            <button class="dash-ad-btn remove" data-id="${car._id}">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Remove car
            grid.querySelectorAll('.dash-ad-btn.remove').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if (!confirm('Remove this listing?')) return;
                    const r = await fetch(`/api/cars/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (r.ok) {
                        showToast('Listing removed ✓');
                        loadMyAds();
                    }
                });
            });

            // Edit car — open full overlay pre-filled
            grid.querySelectorAll('.dash-ad-btn.edit').forEach(btn => {
                btn.addEventListener('click', () => {
                    openEditOverlay(JSON.parse(btn.dataset.car));
                });
            });

        } catch (err) {
            console.error('My ads error:', err);
        }
    }

    const savedAds = [
        {
            id: 4, brand: 'Mercedes', model: 'C200', year: 2021,
            price: 1850000, city: 'Cairo', mileage: '42,000 km',
            status: 'active', img: '/images/mercedes.png'
        },
        {
            id: 5, brand: 'BMW', model: '320i', year: 2020,
            price: 1650000, city: 'Giza', mileage: '38,000 km',
            status: 'active', img: '/images/BMW.png'
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
                        <div class="dash-ad-title">${car.brand.replace(/,/g,'')}, ${car.model.replace(/,/g,'')}, ${car.year}</div>
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

    // ── Dashboard carousel (event delegation) ─────────────────
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.carousel-arrow');
        if (!btn) return;
        e.stopPropagation();

        const carId   = btn.dataset.id;
        const card    = document.querySelector(`.dash-ad-card [data-id="${carId}"].carousel-counter`)?.closest('.dash-ad-img')
                     || document.querySelector(`.dash-ad-img .carousel-arrow[data-id="${carId}"]`)?.closest('.dash-ad-img');
        if (!card) return;

        const slides  = card.querySelectorAll('.carousel-slide');
        const counter = card.querySelector('.carousel-counter');
        const total   = slides.length;

        let current = 0;
        slides.forEach((s, i) => { if (s.classList.contains('active')) current = i; });

        const next = btn.classList.contains('carousel-next')
            ? (current + 1) % total
            : (current - 1 + total) % total;

        slides[current].classList.remove('active');
        slides[next].classList.add('active');
        if (counter) counter.textContent = `${next + 1} / ${total}`;
    });

    // ── Edit overlay state ─────────────────────────────────────
    let editTransmission = 'automatic';
    let editFuel         = 'petrol';
    let editCondition    = 'used';
    let editColor        = 'white';
    let editFabrika      = false;
    let editImages       = []; // { url, isNew, file? }

    // ── Image rendering ────────────────────────────────────────
    function renderEditThumbs() {
        const thumbs = document.getElementById('editImgThumbs');
        if (!thumbs) return;
        thumbs.innerHTML = editImages.map((img, i) => `
            <div class="sell-thumb ${i === 0 ? 'cover' : ''}">
                <img src="${img.url}" alt="Image ${i + 1}">
                ${i === 0 ? '<span class="sell-thumb-cover-badge">Cover</span>' : ''}
                <button class="sell-thumb-remove" data-index="${i}">✕</button>
            </div>
        `).join('');

        thumbs.querySelectorAll('.sell-thumb-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                editImages.splice(parseInt(btn.dataset.index), 1);
                renderEditThumbs();
                updateEditPreview();
            });
        });
    }

    // Upload zone
    const editUploadZone = document.getElementById('editUploadZone');
    const editImgInput   = document.getElementById('editImgInput');

    editUploadZone?.addEventListener('click', () => editImgInput?.click());

    editUploadZone?.addEventListener('dragover', e => {
        e.preventDefault();
        editUploadZone.style.borderColor = 'var(--primary)';
    });
    editUploadZone?.addEventListener('dragleave', () => {
        editUploadZone.style.borderColor = '';
    });
    editUploadZone?.addEventListener('drop', e => {
        e.preventDefault();
        editUploadZone.style.borderColor = '';
        handleEditFiles(Array.from(e.dataTransfer.files));
    });

    editImgInput?.addEventListener('change', () => {
        handleEditFiles(Array.from(editImgInput.files));
        editImgInput.value = '';
    });

    function handleEditFiles(files) {
        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;
            if (editImages.length >= 20) return;
            editImages.push({ url: URL.createObjectURL(file), isNew: true, file });
        });
        renderEditThumbs();
        updateEditPreview();
    }

    function openEditOverlay(car) {
        document.getElementById('editCarId').value      = car._id;
        document.getElementById('editCarInfo').value    = `${car.brand} ${car.model} ${car.year}`;
        document.getElementById('editKmsDriven').value  = car.mileage    || '';
        document.getElementById('editCarPrice').value   = car.price      || '';
        document.getElementById('editCarDesc').value    = car.description || '';

        // Existing images
        editImages = (car.images || []).map(url => ({ url, isNew: false }));
        renderEditThumbs();

        // City
        const citySelect = document.getElementById('editCitySelect');
        if (citySelect) citySelect.value = car.city || '';

        // Condition toggle
        editCondition = car.condition || 'used';
        document.querySelectorAll('#editConditionToggle button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === editCondition);
        });

        // Transmission chips
        editTransmission = car.transmission || 'automatic';
        document.querySelectorAll('#editTransmissionChips .sell-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.val === editTransmission);
        });

        // Fuel chips
        editFuel = car.fuel || 'petrol';
        document.querySelectorAll('#editFuelChips .sell-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.val === editFuel);
        });

        // Color picker
        editColor = (car.color || 'white').toLowerCase();
        document.querySelectorAll('#editColorPicker .sell-color-item').forEach(item => {
            item.classList.toggle('active', item.dataset.color === editColor);
        });

        // Fabrika chips
        editFabrika = car.fabrika || false;
        document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.val === String(editFabrika));
        });

        // Update preview
        updateEditPreview();

        document.getElementById('editOverlay').style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeEditOverlay() {
        document.getElementById('editOverlay').style.display = 'none';
        document.body.style.overflow = '';
    }

    // ── Edit preview ───────────────────────────────────────────
    function updateEditPreview() {
        const info  = document.getElementById('editCarInfo')?.value.trim()  || 'Car Title';
        const price = document.getElementById('editCarPrice')?.value.trim();
        const km    = document.getElementById('editKmsDriven')?.value.trim();
        const city  = document.getElementById('editCitySelect')?.value || '—';

        document.getElementById('editPreviewTitle').textContent        = info;
        document.getElementById('editPreviewPrice').textContent        = price ? parseInt(price).toLocaleString('en-EG') + ' EGP' : 'Price not set';
        document.getElementById('editPreviewCity').textContent         = '📍 ' + city;
        document.getElementById('editPreviewKm').textContent           = km ? '🛣️ ' + parseInt(km).toLocaleString() + ' km' : '🛣️ — km';
        document.getElementById('editPreviewTransmission').textContent = editTransmission;
        document.getElementById('editPreviewFuel').textContent         = editFuel;

        const fabrikaTag = document.getElementById('editPreviewFabrika');
        if (fabrikaTag) fabrikaTag.style.display = editFabrika ? 'inline-block' : 'none';

        // Show first image in preview if available
        const previewImg  = document.querySelector('.sell-preview-img');
        const placeholder = document.querySelector('.sell-preview-placeholder');
        if (previewImg && placeholder) {
            if (editImages.length > 0) {
                placeholder.style.display = 'none';
                let existing = previewImg.querySelector('.edit-preview-cover');
                if (!existing) {
                    existing = document.createElement('img');
                    existing.className = 'edit-preview-cover';
                    existing.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;';
                    previewImg.appendChild(existing);
                }
                existing.src = editImages[0].url;
            } else {
                placeholder.style.display = 'flex';
                previewImg.querySelector('.edit-preview-cover')?.remove();
            }
        }
    }

    ['editCarInfo','editKmsDriven','editCarPrice'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateEditPreview);
    });
    document.getElementById('editCitySelect')?.addEventListener('change', updateEditPreview);

    // Chips
    document.querySelectorAll('#editTransmissionChips .sell-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#editTransmissionChips .sell-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            editTransmission = chip.dataset.val;
            updateEditPreview();
        });
    });

    document.querySelectorAll('#editFuelChips .sell-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#editFuelChips .sell-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            editFuel = chip.dataset.val;
            updateEditPreview();
        });
    });

    // Condition toggle
    document.querySelectorAll('#editConditionToggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#editConditionToggle button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            editCondition = btn.dataset.val;
        });
    });

    // Color picker
    document.querySelectorAll('#editColorPicker .sell-color-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#editColorPicker .sell-color-item').forEach(c => c.classList.remove('active'));
            item.classList.add('active');
            editColor = item.dataset.color;
        });
    });

    // Fabrika chips
    document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            editFabrika = chip.dataset.val === 'true';
            updateEditPreview();
        });
    });

    // Close
    document.getElementById('editOverlayClose')?.addEventListener('click', closeEditOverlay);
    document.getElementById('editOverlayCancel')?.addEventListener('click', closeEditOverlay);

    // ── Save ───────────────────────────────────────────────────
    document.getElementById('editSaveBtn')?.addEventListener('click', async () => {
        const id       = document.getElementById('editCarId').value;
        const infoVal  = document.getElementById('editCarInfo').value.trim().split(/\s+/);
        const brand    = (infoVal[0] || '').replace(/,/g, '');
        const model    = (infoVal[1] || '').replace(/,/g, '');
        const year     = parseInt(infoVal[infoVal.length - 1]) || new Date().getFullYear();

        const body = new FormData();
        body.append('brand',        brand);
        body.append('model',        model);
        body.append('year',         year);
        body.append('price',        Number(document.getElementById('editCarPrice').value));
        body.append('mileage',      Number(document.getElementById('editKmsDriven').value));
        body.append('city',         document.getElementById('editCitySelect').value);
        body.append('condition',    editCondition);
        body.append('transmission', editTransmission);
        body.append('fuel',         editFuel);
        body.append('color',        editColor);
        body.append('fabrika',      editFabrika);
        body.append('description',  document.getElementById('editCarDesc').value.trim());

        // Pass existing image URLs to keep
        const keptImages = editImages.filter(img => !img.isNew).map(img => img.url);
        body.append('keptImages', JSON.stringify(keptImages));

        // Append new image files
        editImages.filter(img => img.isNew && img.file).forEach(img => {
            body.append('images', img.file);
        });

        try {
            const res = await fetch(`/api/cars/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body
            });

            if (res.ok) {
                closeEditOverlay();
                showToast('Listing updated ✓');
                loadMyAds();
            } else {
                const err = await res.json();
                showToast(err.message || 'Update failed');
            }
        } catch (err) {
            showToast('Something went wrong');
        }
    });

    // ── Init ───────────────────────────────────────────────────
    loadMyAds();
    renderSavedAds();
    renderMyPosts();

});