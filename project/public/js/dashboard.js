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
    return car.images && car.images[0] ? car.images[0] : (typeof brandImages !== 'undefined' ? brandImages?.[car.brand] : '') || '';
  }

  // ── User Profile Authentication & Loading ───────────────────
  async function loadUserProfile() {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
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
      localStorage.setItem('rxUserId', user._id || user.id || '');

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
                ${car.images
                  .map(
                    (src, i) => `
                  <div class="carousel-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                    <img src="${src}" alt="${car.brand}">
                  </div>
                `
                  )
                  .join('')}
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
              ${
                car.status === 'rejected' && car.rejectionReason
                  ? `<span class="dash-rejection-reason" title="${car.rejectionReason}">ⓘ Reason: ${car.rejectionReason}</span>`
                  : ''
              }
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
            <button type="button" class="dash-ad-btn edit" data-id="${car._id}" data-car='${JSON.stringify(car).replace(/'/g, '&apos;')}'> Edit </button>
            <button type="button" class="dash-ad-btn remove" data-id="${car._id}"> Remove </button>
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
            <a href="/car/${car._id}" class="dash-ad-btn edit"> View </a>
            <button type="button" class="dash-ad-btn remove saved-remove-btn" data-id="${car._id}"> Remove </button>
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
        headers: { Authorization: `Bearer ${token}` }
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
            headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
            headers: { Authorization: `Bearer ${token}` }
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

    const next = btn.classList.contains('carousel-next') ? (current + 1) % total : (current - 1 + total) % total;
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
    thumbs.innerHTML = editImages
      .map(
        (img, i) => `
        <div class="sell-thumb ${i === 0 ? 'cover' : ''}">
          <img src="${img.url}" alt="Image ${i + 1}">
          ${i === 0 ? '<span class="sell-thumb-cover-badge">Cover</span>' : ''}
          <button class="sell-thumb-remove" data-index="${i}">✕</button>
        </div>
      `
      )
      .join('');
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
      editImages.push({ url: URL.createObjectURL(file), isNew: true, file });
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

    editImages = (car.images || []).map(url => ({ url, isNew: false }));
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
    if (editPreviewPrice)
      editPreviewPrice.textContent = price ? parseInt(price).toLocaleString('en-EG') + ' EGP' : 'Price not set';
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
        headers: { Authorization: `Bearer ${token}` },
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

  // ── My Posts helpers ──────────────────────────────────────
  function dpFormatTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 7) return d + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  function dpFormatNum(n) {
    if (!n && n !== 0) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
  }

  function dpIsRTL(text) {
    if (!text || !text.trim()) return false;
    const ar = /[\u0600-\u06FF]/;
    if (ar.test(text.trim()[0])) return true;
    const count = (text.match(/[\u0600-\u06FF]/g) || []).length;
    return count > text.length * 0.25;
  }

  // ── New comment tracking ──────────────────────────────────
  function dpGetSeen() {
    try {
      return JSON.parse(localStorage.getItem('rxPostCommentsSeen') || '{}');
    } catch {
      return {};
    }
  }

  function dpSetSeen(data) {
    localStorage.setItem('rxPostCommentsSeen', JSON.stringify(data));
  }

  function dpMarkSeen(postId, count) {
    const seen = dpGetSeen();
    seen[postId.toString()] = count;
    dpSetSeen(seen);
  }

  function dpGetNewCount(postId, currentCount) {
    const seen = dpGetSeen();
    const key = postId.toString();
    const last = seen[key];
    if (last === undefined && currentCount > 0) return currentCount;
    if (last === undefined) return 0;
    return Math.max(0, currentCount - last);
  }

  // ── Load My Posts ─────────────────────────────────────────
  async function loadMyPosts() {
    const list = document.getElementById('myPostsList');
    if (!list) return;
    list.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${Array(3)
          .fill(
            `<div style="height:130px;background:linear-gradient(90deg,#e8eaed 25%,#f2f3f5 50%,#e8eaed 75%);background-size:200% 100%;animation:dashSkel 1.3s infinite;border-radius:14px;"></div>`
          )
          .join('')}
      </div>`;
    try {
      const res = await fetch('/api/posts/my-posts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (!res.ok) {
        list.innerHTML = `<div class="dash-empty"><span>⚠️</span><p>${data.message || 'Failed to load posts.'}</p></div>`;
        return;
      }
      const posts = data.posts || [];
      if (posts.length === 0) {
        list.innerHTML = `
          <div class="dash-empty">
            <span>💬</span>
            <p>You haven't posted in any community yet.</p>
            <a href="/feed.html">Go to Feed</a>
          </div>`;
        return;
      }

      let totalNew = 0;
      posts.forEach(p => {
        totalNew += dpGetNewCount(p._id, p.commentCount);
      });
      const tabBadge = document.getElementById('postsBadge');
      if (tabBadge) {
        if (totalNew > 0) {
          tabBadge.textContent = totalNew > 99 ? '99+' : totalNew;
          tabBadge.style.display = 'inline-flex';
        } else {
          tabBadge.style.display = 'none';
        }
      }

      list.innerHTML = posts.map(post => dpRenderPostCard(post)).join('');

      list.querySelectorAll('.dash-post-action-btn.view').forEach(btn => {
        btn.addEventListener('click', () => {
          const slug = btn.dataset.slug;
          window.location.href = slug ? `/feed.html?community=${slug}` : '/feed.html';
        });
      });

      list.querySelectorAll('.dash-post-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const postId = btn.dataset.postid;
          const post = posts.find(p => p._id.toString() === postId);
          if (post) dpOpenEditModal(post);
        });
      });

      list.querySelectorAll('.dash-post-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
          dpConfirmDelete(btn.dataset.postid);
        });
      });

      list.querySelectorAll('.dash-post-comment-stat').forEach(btn => {
        btn.addEventListener('click', () => {
          const postId = btn.dataset.postid;
          const post = posts.find(p => p._id.toString() === postId);
          if (post) dpOpenCommentsModal(post);
        });
      });
    } catch (err) {
      console.error('Load my posts error:', err);
      list.innerHTML = `<div class="dash-empty"><span>⚠️</span><p>Server error. Please try again.</p></div>`;
    }
  }

  function dpRenderPostCard(post) {
    const community = post.community;
    const commName = community
      ? community.isCentral
        ? 'RevXChange Central'
        : ((community.brand?.name || '') + ' ' + community.name).trim()
      : 'Unknown Community';
    const commLogo = community?.brand?.logoUrl || '';
    const commSlug = community?.slug || '';
    const thumb = post.imageUrls?.[0] || null;
    const hasVideo = !!post.videoUrl;
    const titleDir = dpIsRTL(post.title) ? ' dir="rtl"' : '';
    const bodyDir = dpIsRTL(post.body) ? ' dir="rtl"' : '';
    const preview = post.body ? post.body.slice(0, 200) : '';
    const newCount = dpGetNewCount(post._id, post.commentCount);
    const newBadge = newCount > 0 ? `<span class="dash-post-new-badge">${newCount > 99 ? '99+' : newCount}</span>` : '';
    const mediaThumb = thumb
      ? `<img class="dash-post-thumb" src="${thumb}" alt="Post image" loading="lazy">`
      : hasVideo
      ? `<div class="dash-post-thumb-video">🎥</div>`
      : '';
    const shareTag = post.isShare ? `<div class="dash-post-share-tag">↗ Shared post</div>` : '';
    const editedTag = post.isEdited ? `<span class="dash-post-edited">(edited)</span>` : '';
    return `
      <div class="dash-post-card" data-postid="${post._id}">
        <div class="dash-post-top">
          ${mediaThumb}
          <div class="dash-post-main">
            ${shareTag}
            <div class="dash-post-comm-tag">
              <img class="dash-post-comm-logo" src="${commLogo}" alt="${commName}" onerror="this.style.opacity='0'" >
              ${commName}
            </div>
            ${post.title ? `<div class="dash-post-title"${titleDir}>${post.title}</div>` : ''}
            ${preview ? `<div class="dash-post-preview"${bodyDir}>${preview}</div>` : ''}
          </div>
        </div>
        <div class="dash-post-meta">
          <div class="dash-post-stats-row">
            <span>▲ ${dpFormatNum(post.upvotes)}</span>
            <span class="dash-post-comment-stat" data-postid="${post._id}"> 💬 ${dpFormatNum(post.commentCount)}${newBadge} </span>
            <span>${dpFormatTime(post.createdAt)}${editedTag}</span>
          </div>
          <div class="dash-post-actions-row">
            <button class="dash-post-action-btn view" data-slug="${commSlug}"> View Feed </button>
            ${!post.isShare ? `<button class="dash-post-action-btn edit" data-postid="${post._id}">Edit</button>` : ''}
            <button class="dash-post-action-btn delete" data-postid="${post._id}"> Delete </button>
          </div>
        </div>
      </div>`;
  }

  // ── Delete post ───────────────────────────────────────────
  function dpConfirmDelete(postId) {
    const card = document.querySelector(`[data-postid="${postId}"]`);
    if (!card) return;
    const actionsRow = card.querySelector('.dash-post-actions-row');
    if (!actionsRow) return;
    const originalHTML = actionsRow.innerHTML;
    actionsRow.innerHTML = `
      <span style="font-size:0.78rem;color:var(--text-light);font-family:'Segoe UI',sans-serif;align-self:center;"> Delete this post? </span>
      <button class="dash-post-action-btn delete" id="dpDelYes_${postId}"> Yes, Delete </button>
      <button class="dash-post-action-btn edit" id="dpDelNo_${postId}"> Cancel </button>`;
    document.getElementById(`dpDelNo_${postId}`)?.addEventListener('click', () => {
      actionsRow.innerHTML = originalHTML;
      loadMyPosts();
    });
    document.getElementById(`dpDelYes_${postId}`)?.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          card.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
          card.style.opacity = '0';
          card.style.maxHeight = '0';
          card.style.overflow = 'hidden';
          card.style.padding = '0';
          card.style.margin = '0';
          setTimeout(() => {
            card.remove();
            showToast('Post deleted ✓');
          }, 320);
        } else {
          actionsRow.innerHTML = originalHTML;
          loadMyPosts();
          showToast('Failed to delete post');
        }
      } catch (err) {
        console.error('Delete post error:', err);
        actionsRow.innerHTML = originalHTML;
        loadMyPosts();
      }
    });
  }

  // ── Edit post modal ───────────────────────────────────────
  function dpOpenEditModal(post) {
    document.getElementById('dashEditPostOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'dashEditPostOverlay';
    overlay.className = 'dash-edit-post-overlay';
    const safeTitle = (post.title || '').replace(/"/g, '&quot;');
    const safeBody = post.body || '';
    overlay.innerHTML = `
      <div class="dash-edit-post-card">
        <div class="dash-edit-header">
          <h3 class="dash-edit-modal-title">Edit Post</h3>
          <button class="dash-edit-close" id="dashEditClose">✕</button>
        </div>
        <div class="dash-edit-body">
          <div class="dash-edit-field">
            <label class="dash-edit-label"> Title <span class="dash-edit-required">*</span> </label>
            <input type="text" class="dash-edit-input" id="dashEditTitleInput" value="${safeTitle}" maxlength="300" >
          </div>
          <div class="dash-edit-field">
            <label class="dash-edit-label">Body</label>
            <textarea class="dash-edit-textarea" id="dashEditBodyInput" maxlength="10000" rows="6" >${safeBody}</textarea>
          </div>
        </div>
        <div class="dash-edit-footer">
          <button class="dash-edit-cancel" id="dashEditCancelBtn">Cancel</button>
          <button class="dash-edit-save" id="dashEditSaveBtn">
            <span id="dashEditSaveLabel">Save Changes</span>
            <span id="dashEditSaveSpinner" style="display:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:dashSpin 0.8s linear infinite;" >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </span>
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('rx-open');
      });
    });

    const titleInput = document.getElementById('dashEditTitleInput');
    const bodyInput = document.getElementById('dashEditBodyInput');
    if (titleInput) titleInput.dir = dpIsRTL(titleInput.value) ? 'rtl' : 'ltr';
    if (bodyInput) bodyInput.dir = dpIsRTL(bodyInput.value) ? 'rtl' : 'ltr';
    titleInput?.addEventListener('input', () => {
      titleInput.dir = dpIsRTL(titleInput.value) ? 'rtl' : 'ltr';
    });
    bodyInput?.addEventListener('input', () => {
      bodyInput.dir = dpIsRTL(bodyInput.value) ? 'rtl' : 'ltr';
    });

    const close = () => {
      overlay.classList.remove('rx-open');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 280);
    };
    document.getElementById('dashEditClose')?.addEventListener('click', close);
    document.getElementById('dashEditCancelBtn')?.addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    document.getElementById('dashEditSaveBtn')?.addEventListener('click', async () => {
      const title = titleInput?.value.trim();
      const body = bodyInput?.value.trim() || '';
      if (!title) {
        showToast('Title is required');
        return;
      }
      const saveBtn = document.getElementById('dashEditSaveBtn');
      const label = document.getElementById('dashEditSaveLabel');
      const spinner = document.getElementById('dashEditSaveSpinner');
      saveBtn.disabled = true;
      if (label) label.style.display = 'none';
      if (spinner) spinner.style.display = 'flex';
      try {
        const res = await fetch(`/api/posts/${post._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, body })
        });
        if (res.ok) {
          close();
          showToast('Post updated ✓');
          loadMyPosts();
        } else {
          const data = await safeJson(res);
          showToast(data.message || 'Failed to update post');
          saveBtn.disabled = false;
          if (label) label.style.display = '';
          if (spinner) spinner.style.display = 'none';
        }
      } catch (err) {
        console.error('Edit post error:', err);
        showToast('Server error. Please try again.');
        saveBtn.disabled = false;
        if (label) label.style.display = '';
        if (spinner) spinner.style.display = 'none';
      }
    });
  }

  // ── Comments modal ────────────────────────────────────────
  function dpOpenCommentsModal(post) {
    dpMarkSeen(post._id, post.commentCount);
    const card = document.querySelector(`[data-postid="${post._id}"]`);
    card?.querySelector('.dash-post-new-badge')?.remove();
    const allCards = document.querySelectorAll('[data-postid]');
    let remaining = 0;
    allCards.forEach(c => {
      const badge = c.querySelector('.dash-post-new-badge');
      if (badge) remaining += parseInt(badge.textContent) || 0;
    });
    const tabBadge = document.getElementById('postsBadge');
    if (tabBadge) {
      if (remaining > 0) {
        tabBadge.textContent = remaining > 99 ? '99+' : remaining;
        tabBadge.style.display = 'inline-flex';
      } else {
        tabBadge.style.display = 'none';
      }
    }

    document.getElementById('dashCommentsOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'dashCommentsOverlay';
    overlay.className = 'dash-comments-overlay';
    const titleDir = dpIsRTL(post.title) ? 'dir="rtl"' : '';
    const userName = localStorage.getItem('rxUser') || '';
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';
    const sendIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
    overlay.innerHTML = `
      <div class="dash-comments-card">
        <div class="dash-comments-header">
          <div class="dash-comments-post-title" ${titleDir}> ${post.title || 'Post'} </div>
          <button class="dash-comments-close" id="dashCommClose">✕</button>
        </div>
        <div class="dash-comments-body" id="dashCommList">
          <div class="dash-comments-empty">Loading comments...</div>
        </div>
        <div class="dash-comments-footer">
          <div class="dp-compose">
            <div class="dp-compose-avatar">${initial}</div>
            <div class="dp-pill-wrap">
              <input class="dp-input" type="text" id="dashCommInput" placeholder="Write a comment..." >
              <button class="dp-send-btn" id="dashCommSend" disabled> ${sendIcon} </button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('rx-open');
      });
    });

    const close = () => {
      overlay.classList.remove('rx-open');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 280);
    };
    document.getElementById('dashCommClose')?.addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function escH(e) {
      if (e.key === 'Escape' && document.getElementById('dashCommentsOverlay')) {
        close();
        document.removeEventListener('keydown', escH);
      }
    });

    const input = document.getElementById('dashCommInput');
    const sendBtn = document.getElementById('dashCommSend');
    input?.addEventListener('input', () => {
      sendBtn.disabled = input.value.trim().length === 0;
      if (input) input.dir = dpIsRTL(input.value) ? 'rtl' : 'ltr';
    });
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !sendBtn.disabled) {
        e.preventDefault();
        sendBtn.click();
      }
    });
    sendBtn?.addEventListener('click', async () => {
      const body = input.value.trim();
      if (!body) return;
      sendBtn.disabled = true;
      const origIcon = sendBtn.innerHTML;
      sendBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="animation:dashSpin 0.7s linear infinite" >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>`;
      try {
        const res = await fetch(`/api/posts/${post._id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ body })
        });
        const data = await safeJson(res);
        if (res.ok) {
          input.value = '';
          sendBtn.innerHTML = origIcon;
          sendBtn.disabled = true;
          post.commentCount++;
          dpMarkSeen(post._id, post.commentCount);
          const listEl = document.getElementById('dashCommList');
          const empty = listEl?.querySelector('.dash-comments-empty');
          if (empty) empty.remove();
          const wrapper = document.createElement('div');
          wrapper.innerHTML = dpRenderComment(data.comment);
          listEl?.insertBefore(wrapper.firstElementChild, listEl.firstChild);
          const stat = document.querySelector(`[data-postid="${post._id}"] .dash-post-comment-stat`);
          if (stat) {
            stat.innerHTML = `💬 ${dpFormatNum(post.commentCount)}`;
            stat.dataset.postid = post._id;
          }
        } else {
          showToast(data.message || 'Failed to post comment');
          sendBtn.innerHTML = origIcon;
          sendBtn.disabled = false;
        }
      } catch (err) {
        console.error('Post comment error:', err);
        sendBtn.innerHTML = origIcon;
        sendBtn.disabled = false;
      }
    });

    dpLoadComments(post._id);
  }

  async function dpLoadComments(postId) {
    const listEl = document.getElementById('dashCommList');
    if (!listEl) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments?sort=top`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (!res.ok) {
        listEl.innerHTML = '<div class="dash-comments-empty">Failed to load comments.</div>';
        return;
      }
      const comments = data.comments || [];
      if (comments.length === 0) {
        listEl.innerHTML = '<div class="dash-comments-empty">No comments yet. Be the first!</div>';
        return;
      }
      listEl.innerHTML = comments.map(c => dpRenderComment(c)).join('');
    } catch (err) {
      console.error('Load comments error:', err);
      listEl.innerHTML = '<div class="dash-comments-empty">Failed to load comments.</div>';
    }
  }

  function dpRenderComment(comment) {
    const authorName = comment.author?.name || 'Anonymous';
    const initial = authorName.charAt(0).toUpperCase();
    const timeAgo = dpFormatTime(comment.createdAt);
    const bodyDir = dpIsRTL(comment.body) ? ' dir="rtl"' : '';
    const editedTag = comment.isEdited ? '<span class="dp-comment-edited">(edited)</span>' : '';
    const repliesHtml =
      comment.replies?.length > 0
        ? `<div class="dp-comment-replies"> ${comment.replies.map(r => dpRenderComment(r)).join('')} </div>`
        : '';
    const imagesHtml =
      comment.imageUrls?.length > 0
        ? `<div class="dp-comment-images"> ${comment.imageUrls.map(url => `<img src="${url}" alt="comment image" loading="lazy">`).join('')} </div>`
        : '';
    return `
      <div class="dp-comment">
        <div class="dp-comment-avatar">${initial}</div>
        <div class="dp-comment-content">
          <div class="dp-comment-meta">
            <span class="dp-comment-author">${authorName}</span>
            <span class="dp-comment-time">${timeAgo}</span>
            ${editedTag}
          </div>
          <div class="dp-comment-body"${bodyDir}>${comment.body}</div>
          ${imagesHtml}
        </div>
      </div>
      ${repliesHtml}`;
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const res = await fetch('/api/requests/incoming', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const requests = data.requests || [];
      const pendingCount = requests.filter(r => (r.ownerStatus || r.status) === 'pending').length;
      const badge = document.getElementById('requestsBadge');
      if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
      }
      if (!requests.length) {
        list.innerHTML = `
          <div class="dash-empty">
            <span>📬</span>
            <p>No incoming requests yet.</p>
          </div>`;
        return;
      }
      list.innerHTML = requests
        .map(req => {
          const status = req.ownerStatus || req.status || 'pending';
          const badgeStyles = {
            pending: 'background:#fef3c7;color:#d97706;border:1px solid #fcd34d',
            accepted: 'background:#d1fae5;color:#065f46;border:1px solid #a7f3d0',
            rejected: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5'
          };
          const badgeLabels = { pending: 'Pending', accepted: 'Accepted ✓', rejected: 'Rejected ✕' };
          const badgeStyle = badgeStyles[status] || badgeStyles.pending;
          const badgeLabel = badgeLabels[status] || 'Pending';
          const typeLabel =
            req.type === 'rent'
              ? '🔑 Rent Request'
              : req.type === 'appointment'
              ? '📅 Appointment Request'
              : '🛒 Buy Request';
          const dateInfo = req.rentFrom
            ? `📅 ${new Date(req.rentFrom).toLocaleDateString()} → ${new Date(req.rentTo).toLocaleDateString()}`
            : req.appointmentDate
            ? `📅 Visit: ${new Date(req.appointmentDate).toLocaleDateString()}`
            : '';
          const offerInfo = req.offerPrice ? `💰 Offer: ${Number(req.offerPrice).toLocaleString()} EGP` : '';
          return `
            <div class="dash-request-card" data-id="${req._id}">
              <div class="dash-request-top">
                <div>
                  <div class="dash-request-car"> ${req.car ? `${req.car.brand} ${req.car.model} ${req.car.year}` : 'Unknown Car'} </div>
                  <div class="dash-request-type">${typeLabel}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="dash-request-status" style="padding:4px 12px;border-radius:20px;font-size:.82rem;font-weight:600;${badgeStyle}" > ${badgeLabel} </span>
                  ${
                    status !== 'pending'
                      ? `<button class="dash-req-edit" data-id="${req._id}" style="padding:4px 10px;font-size:.78rem;background:#f3f4f6;border:1px solid #d1d5db;color:#374151;border-radius:6px;cursor:pointer" > ✏️ Edit </button>`
                      : ''
                  }
                </div>
              </div>
              <div class="dash-request-info">
                <span>👤 ${req.name}</span>
                <span>📞 ${req.phone}</span>
                <span>${req.contact === 'whatsapp' ? '💬 WhatsApp' : '📞 Call'}</span>
                ${dateInfo ? `<span>${dateInfo}</span>` : ''}
                ${offerInfo ? `<span>${offerInfo}</span>` : ''}
              </div>
              ${req.message ? `<div class="dash-request-message">"${req.message}"</div>` : ''}
              <div class="dash-request-actions">
                ${
                  status === 'pending'
                    ? `<button class="dash-req-btn accept" data-id="${req._id}"> ✓ Accept </button>
                       <button class="dash-req-btn reject" data-id="${req._id}"> ✕ Reject </button>`
                    : `<span style="font-size:.85rem;color:#9ca3af;font-style:italic"> ${
                        status === 'accepted'
                          ? '✅ You accepted this request — buyer will contact you.'
                          : '❌ You rejected this request.'
                      } </span>`
                }
              </div>
            </div>`;
        })
        .join('');

      list.querySelectorAll('.dash-req-btn.accept').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '…';
          await updateRequestStatus(btn.dataset.id, 'accepted');
          showToast('Request accepted ✓');
          loadIncomingRequests();
        });
      });
      list.querySelectorAll('.dash-req-btn.reject').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '…';
          await updateRequestStatus(btn.dataset.id, 'rejected');
          showToast('Request rejected');
          loadIncomingRequests();
        });
      });
      list.querySelectorAll('.dash-req-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  loadMyPosts();
});