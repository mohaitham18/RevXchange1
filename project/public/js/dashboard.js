document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rxToken');

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // ── Helper Utilities ────────────────────────────────────────
  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return { message: 'Server returned invalid response' };
    }
  }

  function showToast(msg) {
    let toast = document.querySelector('.dash-toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'dash-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function capitalize(str) {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  }

  function carImage(car) {
    return car.images && car.images[0]
      ? car.images[0]
      : (typeof brandImages !== 'undefined' ? brandImages?.[car.brand] : '') || '';
  }

  // ── User Profile Authentication & Loading ───────────────────
  async function loadUserProfile() {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
      }

      const data = await safeJson(res);
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

  // ── Tab Management ──────────────────────────────────────────
  const tabs = document.querySelectorAll('.dash-tab');
  const panels = document.querySelectorAll('.dash-panel');

  function switchTab(tabName) {
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab');
  if (tabParam) {
    switchTab(tabParam);
  }

  // ── Render Templates ────────────────────────────────────────
  function renderMyAdCard(car) {
    const imgSrc = carImage(car);

    return `
      <div class="dash-ad-card car-card-placeholder" data-id="${car._id}">
        <div class="dash-ad-img carousel-wrapper">
          ${
            car.images && car.images.length > 0
              ? `
                ${car.images.map((src, i) => `
                  <div class="carousel-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                    <img src="${src}" alt="${car.brand}">
                  </div>
                `).join('')}

                ${
                  car.images.length > 1
                    ? `
                      <button class="carousel-arrow carousel-prev" data-id="${car._id}">&#8249;</button>
                      <button class="carousel-arrow carousel-next" data-id="${car._id}">&#8250;</button>
                      <div class="carousel-counter" data-id="${car._id}">1 / ${car.images.length}</div>
                    `
                    : ''
                }
              `
              : imgSrc
                ? `<img src="${imgSrc}" alt="${car.brand}">`
                : `<div class="dash-ad-img-placeholder">🚗</div>`
          }
        </div>

        <div class="dash-ad-body">
          <div class="dash-ad-top">
            <div class="dash-ad-title">
              ${car.brand} ${car.model} ${car.year}
            </div>

            <span class="dash-status ${car.status || 'active'}">
              ${capitalize(car.status || 'active')}
              ${car.status === 'rejected' && car.rejectionReason
                ? `<span class="dash-rejection-reason" title="${car.rejectionReason}">ⓘ Reason: ${car.rejectionReason}</span>`
                : ''}
            </span>
          </div>

          <div class="dash-ad-price">
            ${Number(car.price || 0).toLocaleString('en-EG')} EGP
          </div>

          <div class="dash-ad-meta">
            <span>📍 ${car.city || '—'}</span>
            <span>🛣️ ${Number(car.mileage || 0).toLocaleString()} km</span>
          </div>

          <div class="dash-ad-tags">
            <span class="car-tag">${capitalize(car.transmission)}</span>
            <span class="car-tag">${capitalize(car.fuel)}</span>
            ${car.color ? `<span class="car-tag">🎨 ${capitalize(car.color)}</span>` : ''}
            ${car.fabrika ? `<span class="car-tag car-tag-fabrika">Fabrika</span>` : ''}
          </div>

          <div class="dash-ad-actions">
            <button
              type="button"
              class="dash-ad-btn edit"
              data-id="${car._id}"
              data-car='${JSON.stringify(car).replace(/'/g, '&apos;')}'
            >
              Edit
            </button>

            <button type="button" class="dash-ad-btn remove" data-id="${car._id}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSavedAdCard(car) {
    const imgSrc = carImage(car);

    return `
      <div class="dash-ad-card car-card-placeholder" data-id="${car._id}">
        <div class="dash-ad-img">
          ${
            imgSrc
              ? `<img src="${imgSrc}" alt="${car.brand}">`
              : `<span style="font-size:3rem">🚗</span>`
          }
        </div>

        <div class="dash-ad-body">
          <div class="dash-ad-top">
            <div class="dash-ad-title">
              ${car.brand} ${car.model} ${car.year}
            </div>

            <span class="dash-status ${car.status || 'active'}">
              ${capitalize(car.status || 'active')}
            </span>
          </div>

          <div class="dash-ad-price">
            ${Number(car.price || 0).toLocaleString('en-EG')} EGP
          </div>

          <div class="dash-ad-meta">
            <span>📍 ${car.city || '—'}</span>
            <span>🛣️ ${Number(car.mileage || 0).toLocaleString()} km</span>
          </div>

          <div class="dash-ad-actions">
            <a href="/car/${car._id}" class="dash-ad-btn edit">
              View
            </a>

            <button type="button" class="dash-ad-btn remove saved-remove-btn" data-id="${car._id}">
              Remove
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Core Resource API Data Fetching ─────────────────────────
  async function loadMyAds() {
    const grid = document.getElementById('myAdsGrid');
    if (!grid) return;

    try {
      const res = await fetch('/api/cars/my-cars', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await safeJson(res);
      const myAds = data.cars || [];

      if (myAds.length === 0) {
        grid.innerHTML = `
          <div class="dash-empty">
            <span>🚗</span>
            <p>You haven't listed any cars yet.</p>
            <a href="/sell-car.html">+ List Your Car</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = myAds.map(car => renderMyAdCard(car)).join('');

      grid.querySelectorAll('.dash-ad-btn.remove').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.preventDefault();
          e.stopPropagation();

          const id = btn.dataset.id;
          if (!confirm('Remove this listing?')) return;

          const r = await fetch('/api/cars/' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (r.ok) {
            showToast('Listing removed ✓');
            loadMyAds();
          }
        });
      });

      grid.querySelectorAll('.dash-ad-btn.edit').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();

          // Safely restore single quotes during parsing context
          const car = JSON.parse(btn.dataset.car.replace(/&apos;/g, "'"));
          openEditOverlay(car);
        });
      });

    } catch (err) {
      console.error('My ads error:', err);
    }
  }

  async function loadSavedAds() {
    const grid = document.getElementById('savedAdsGrid');
    if (!grid) return;

    try {
      grid.innerHTML = `
        <div class="dash-empty">
          <span>🔖</span>
          <p>Loading saved ads...</p>
        </div>
      `;

      const res = await fetch('/api/auth/saved-cars', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await safeJson(res);

      if (!res.ok) {
        grid.innerHTML = `
          <div class="dash-empty">
            <span>⚠️</span>
            <p>${data.message || 'Could not load saved ads.'}</p>
          </div>
        `;
        return;
      }

      const savedAds = data.cars || [];

      if (savedAds.length === 0) {
        grid.innerHTML = `
          <div class="dash-empty">
            <span>🔖</span>
            <p>You haven't saved any cars yet.</p>
            <a href="/used-cars.html">Browse Cars</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = savedAds.map(car => renderSavedAdCard(car)).join('');

      grid.querySelectorAll('.saved-remove-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.preventDefault();
          e.stopPropagation();

          const carId = btn.dataset.id;
          const removeRes = await fetch('/api/auth/save-car/' + encodeURIComponent(carId), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (removeRes.ok) {
            showToast('Removed from saved ads ✓');
            loadSavedAds();
          }
        });
      });

    } catch (err) {
      console.error('Saved ads error:', err);
      grid.innerHTML = `
        <div class="dash-empty">
          <span>⚠️</span>
          <p>Server error while loading saved ads.</p>
        </div>
      `;
    }
  }

  //user dashboard 
  

  // ── Image Carousel Switch Logic ──────────────────────────────
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.carousel-arrow');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const carId = btn.dataset.id;
    const card =
      document.querySelector(`.dash-ad-card [data-id="${carId}"].carousel-counter`)?.closest('.dash-ad-img') ||
      document.querySelector(`.dash-ad-img .carousel-arrow[data-id="${carId}"]`)?.closest('.dash-ad-img');

    if (!card) return;

    const slides = card.querySelectorAll('.carousel-slide');
    const counter = card.querySelector('.carousel-counter');
    const total = slides.length;

    if (!total) return;

    let current = 0;
    slides.forEach((slide, i) => {
      if (slide.classList.contains('active')) {
        current = i;
      }
    });

    const next = btn.classList.contains('carousel-next')
      ? (current + 1) % total
      : (current - 1 + total) % total;

    slides[current].classList.remove('active');
    slides[next].classList.add('active');

    if (counter) {
      counter.textContent = `${next + 1} / ${total}`;
    }
  });

  // ── Ad Listing Edit Overlay Management ───────────────────────
  let editTransmission = 'automatic';
  let editFuel = 'petrol';
  let editCondition = 'used';
  let editColor = 'white';
  let editFabrika = false;
  let editImages = [];

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
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        editImages.splice(parseInt(btn.dataset.index), 1);
        renderEditThumbs();
        updateEditPreview();
      });
    });
  }

  const editUploadZone = document.getElementById('editUploadZone');
  const editImgInput = document.getElementById('editImgInput');

  editUploadZone?.addEventListener('click', () => {
    editImgInput?.click();
  });

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

      editImages.push({
        url: URL.createObjectURL(file),
        isNew: true,
        file
      });
    });

    renderEditThumbs();
    updateEditPreview();
  }

  function openEditOverlay(car) {
    document.getElementById('editCarId').value = car._id;
    document.getElementById('editCarInfo').value = `${car.brand} ${car.model} ${car.year}`;
    document.getElementById('editKmsDriven').value = car.mileage || '';
    document.getElementById('editCarPrice').value = car.price || '';
    document.getElementById('editCarDesc').value = car.description || '';

    editImages = (car.images || []).map(url => ({
      url,
      isNew: false
    }));

    renderEditThumbs();

    const citySelect = document.getElementById('editCitySelect');
    if (citySelect) citySelect.value = car.city || '';

    editCondition = car.condition || 'used';
    document.querySelectorAll('#editConditionToggle button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === editCondition);
    });

    editTransmission = car.transmission || 'automatic';
    document.querySelectorAll('#editTransmissionChips .sell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.val === editTransmission);
    });

    editFuel = car.fuel || 'petrol';
    document.querySelectorAll('#editFuelChips .sell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.val === editFuel);
    });

    editColor = (car.color || 'white').toLowerCase();
    document.querySelectorAll('#editColorPicker .sell-color-item').forEach(item => {
      item.classList.toggle('active', item.dataset.color === editColor);
    });

    editFabrika = car.fabrika || false;
    document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.val === String(editFabrika));
    });

    updateEditPreview();

    const overlay = document.getElementById('editOverlay');
    if (overlay) {
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeEditOverlay() {
    const overlay = document.getElementById('editOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function updateEditPreview() {
    const info = document.getElementById('editCarInfo')?.value.trim() || 'Car Title';
    const price = document.getElementById('editCarPrice')?.value.trim();
    const km = document.getElementById('editKmsDriven')?.value.trim();
    const city = document.getElementById('editCitySelect')?.value || '—';

    const editPreviewTitle = document.getElementById('editPreviewTitle');
    const editPreviewPrice = document.getElementById('editPreviewPrice');
    const editPreviewCity = document.getElementById('editPreviewCity');
    const editPreviewKm = document.getElementById('editPreviewKm');
    const editPreviewTransmission = document.getElementById('editPreviewTransmission');
    const editPreviewFuel = document.getElementById('editPreviewFuel');

    if (editPreviewTitle) editPreviewTitle.textContent = info;
    if (editPreviewPrice) editPreviewPrice.textContent = price ? parseInt(price).toLocaleString('en-EG') + ' EGP' : 'Price not set';
    if (editPreviewCity) editPreviewCity.textContent = '📍 ' + city;
    if (editPreviewKm) editPreviewKm.textContent = km ? '🛣️ ' + parseInt(km).toLocaleString() + ' km' : '🛣️ — km';
    if (editPreviewTransmission) editPreviewTransmission.textContent = editTransmission;
    if (editPreviewFuel) editPreviewFuel.textContent = editFuel;

    const fabrikaTag = document.getElementById('editPreviewFabrika');
    if (fabrikaTag) {
      fabrikaTag.style.display = editFabrika ? 'inline-block' : 'none';
    }

    const previewImg = document.querySelector('.sell-preview-img');
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

  ['editCarInfo', 'editKmsDriven', 'editCarPrice'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateEditPreview);
  });

  document.getElementById('editCitySelect')?.addEventListener('change', updateEditPreview);

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

  document.querySelectorAll('#editConditionToggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#editConditionToggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      editCondition = btn.dataset.val;
    });
  });

  document.querySelectorAll('#editColorPicker .sell-color-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('#editColorPicker .sell-color-item').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      editColor = item.dataset.color;
    });
  });

  document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#editFabrikaChips .sell-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editFabrika = chip.dataset.val === 'true';
      updateEditPreview();
    });
  });

  document.getElementById('editOverlayClose')?.addEventListener('click', closeEditOverlay);
  document.getElementById('editOverlayCancel')?.addEventListener('click', closeEditOverlay);

  document.getElementById('editSaveBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editCarId').value;
    const infoVal = document.getElementById('editCarInfo').value.trim().split(/\s+/);
    const brand = (infoVal[0] || '').replace(/,/g, '');
    const model = (infoVal[1] || '').replace(/,/g, '');
    const year = parseInt(infoVal[infoVal.length - 1]) || new Date().getFullYear();

    const body = new FormData();
    body.append('brand', brand);
    body.append('model', model);
    body.append('year', year);
    body.append('price', Number(document.getElementById('editCarPrice').value));
    body.append('mileage', Number(document.getElementById('editKmsDriven').value));
    body.append('city', document.getElementById('editCitySelect').value);
    body.append('condition', editCondition);
    body.append('transmission', editTransmission);
    body.append('fuel', editFuel);
    body.append('color', editColor);
    body.append('fabrika', editFabrika);
    body.append('description', document.getElementById('editCarDesc').value.trim());

    const keptImages = editImages.filter(img => !img.isNew).map(img => img.url);
    body.append('keptImages', JSON.stringify(keptImages));

    editImages.filter(img => img.isNew && img.file).forEach(img => {
      body.append('images', img.file);
    });

    try {
      const res = await fetch('/api/cars/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body
      });

      const data = await safeJson(res);

      if (!res.ok) {
        showToast(data.message || 'Update failed');
        return;
      }

      closeEditOverlay();
      showToast('Listing updated ✓');
      loadMyAds();
    } catch (err) {
      console.error('Update listing error:', err);
      showToast('Something went wrong');
    }
  });

  // ── Mock Community Posts Engine ─────────────────────────────
  const myPosts = [
    {
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
    }
  ];

  function renderMyPosts() {
    const list = document.getElementById('myPostsList');
    if (!list) return;

    if (myPosts.length === 0) {
      list.innerHTML = `
        <div class="dash-empty">
          <span>💬</span>
          <p>You haven't posted in any community yet.</p>
          <a href="/communities.html">Explore Communities</a>
        </div>
      `;
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

  // ── Profile Settings Actions ────────────────────────────────
  const saveBtn = document.getElementById('saveProfileBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const name = document.getElementById('settingName').value.trim();
      const email = document.getElementById('settingEmail').value.trim();

      if (!name) return;

      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name, email })
        });

        const data = await safeJson(res);

        if (!res.ok) {
          showToast(data.message || 'Update failed');
          return;
        }

        localStorage.setItem('rxUser', data.user.name);
        localStorage.setItem('rxEmail', data.user.email);

        const nameEl = document.getElementById('dashUserName');
        if (nameEl) nameEl.textContent = `Welcome back, ${data.user.name}`;

        const navName = document.getElementById('profileName');
        if (navName) navName.textContent = data.user.name;

        const dropName = document.getElementById('dropdownName');
        if (dropName) dropName.textContent = data.user.name;

        showToast('Profile saved successfully ✓');
      } catch (err) {
        console.error('Update profile error:', err);
        showToast('Server error. Please try again.');
      }
    });
  }

  const updatePasswordBtn = document.getElementById('updatePasswordBtn');
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', async () => {
      const currentPassword = document.getElementById('currentPassword').value.trim();
      const newPassword = document.getElementById('newPassword').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match');
        return;
      }

      if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters');
        return;
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await safeJson(res);

        if (!res.ok) {
          showToast(data.message || 'Update failed');
          return;
        }

        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        showToast('Password updated successfully ✓');
      } catch (err) {
        console.error('Change password error:', err);
        showToast('Server error. Please try again.');
      }
    });
  }

  document.querySelectorAll('.dash-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ── Incoming Requests Engine ──────────────────────────────
 async function loadIncomingRequests() {
  const list = document.getElementById('incomingRequestsList');
  if (!list) return;

  try {
    const res  = await fetch('/api/requests/incoming', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const requests = data.requests || [];

    // Update badge count
    const pendingCount = requests.filter(r =>
      (r.ownerStatus || r.status) === 'pending'
    ).length;
    const badge = document.getElementById('requestsBadge');
    if (badge) {
      badge.textContent    = pendingCount;
      badge.style.display  = pendingCount > 0 ? 'inline-flex' : 'none';
    }

    if (!requests.length) {
      list.innerHTML = `
        <div class="dash-empty">
          <span>📬</span>
          <p>No incoming requests yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = requests.map(req => {
      const status = req.ownerStatus || req.status || 'pending';

      // Status badge style
      const badgeStyles = {
        pending:  'background:#fef3c7;color:#d97706;border:1px solid #fcd34d',
        accepted: 'background:#d1fae5;color:#065f46;border:1px solid #a7f3d0',
        rejected: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5'
      };
      const badgeLabels = {
        pending:  'Pending',
        accepted: 'Accepted ✓',
        rejected: 'Rejected ✕'
      };
      const badgeStyle = badgeStyles[status] || badgeStyles.pending;
      const badgeLabel = badgeLabels[status] || 'Pending';

      // Type label
      const typeLabel = req.type === 'rent'
        ? '🔑 Rent Request'
        : req.type === 'appointment'
          ? '📅 Appointment Request'
          : '🛒 Buy Request';

      // Extra info
      const dateInfo = req.rentFrom
        ? `📅 ${new Date(req.rentFrom).toLocaleDateString()} → ${new Date(req.rentTo).toLocaleDateString()}`
        : req.appointmentDate
          ? `📅 Visit: ${new Date(req.appointmentDate).toLocaleDateString()}`
          : '';

      const offerInfo = req.offerPrice
        ? `💰 Offer: ${Number(req.offerPrice).toLocaleString()} EGP`
        : '';

      return `
        <div class="dash-request-card" data-id="${req._id}">
          <div class="dash-request-top">
            <div>
              <div class="dash-request-car">
                ${req.car ? `${req.car.brand} ${req.car.model} ${req.car.year}` : 'Unknown Car'}
              </div>
              <div class="dash-request-type">${typeLabel}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="dash-request-status"
                style="padding:4px 12px;border-radius:20px;font-size:.82rem;font-weight:600;${badgeStyle}">
                ${badgeLabel}
              </span>
              ${status !== 'pending' ? `
                <button class="dash-req-edit" data-id="${req._id}"
                  style="padding:4px 10px;font-size:.78rem;background:#f3f4f6;border:1px solid #d1d5db;
                         color:#374151;border-radius:6px;cursor:pointer">
                  ✏️ Edit
                </button>` : ''}
            </div>
          </div>

          <div class="dash-request-info">
            <span>👤 ${req.name}</span>
            <span>📞 ${req.phone}</span>
            <span>${req.contact === 'whatsapp' ? '💬 WhatsApp' : '📞 Call'}</span>
            ${dateInfo  ? `<span>${dateInfo}</span>`  : ''}
            ${offerInfo ? `<span>${offerInfo}</span>` : ''}
          </div>

          ${req.message
            ? `<div class="dash-request-message">"${req.message}"</div>`
            : ''}

          <div class="dash-request-actions">
            ${status === 'pending' ? `
              <button class="dash-req-btn accept" data-id="${req._id}">✓ Accept</button>
              <button class="dash-req-btn reject" data-id="${req._id}">✕ Reject</button>
            ` : `
              <span style="font-size:.85rem;color:#9ca3af;font-style:italic">
                ${status === 'accepted'
                  ? '✅ You accepted this request — buyer will contact you.'
                  : '❌ You rejected this request.'}
              </span>
            `}
          </div>
        </div>`;
    }).join('');

    // Accept buttons
    list.querySelectorAll('.dash-req-btn.accept').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled    = true;
        btn.textContent = '…';
        await updateRequestStatus(btn.dataset.id, 'accepted');
        showToast('Request accepted ✓');
        loadIncomingRequests();
      });
    });

    // Reject buttons
    list.querySelectorAll('.dash-req-btn.reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled    = true;
        btn.textContent = '…';
        await updateRequestStatus(btn.dataset.id, 'rejected');
        showToast('Request rejected');
        loadIncomingRequests();
      });
    });

    // Edit (reset to pending) buttons
    list.querySelectorAll('.dash-req-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled    = true;
        btn.textContent = '…';
        await updateRequestStatus(btn.dataset.id, 'pending');
        showToast('Reset to pending — you can accept or reject again');
        loadIncomingRequests();
      });
    });

  } catch (err) {
    console.error('Load incoming requests error:', err);
    list.innerHTML = `
      <div class="dash-empty">
        <span>⚠️</span>
        <p>Could not load requests.</p>
      </div>`;
  }
}
async function updateRequestStatus(id, status) {
  const res = await fetch(`/api/requests/${id}/owner-status`, {
    method: 'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Update failed');
  }
  return res.json();
}
  // ── Kickoff Initializers ────────────────────────────────────
  loadUserProfile();
  loadMyAds();
  loadSavedAds();
  loadIncomingRequests();
  renderMyPosts();
});