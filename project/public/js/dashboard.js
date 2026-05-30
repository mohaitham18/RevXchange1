document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rxToken');

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return { message: 'Server returned invalid response' };
    }
  }

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

  function carImage(car) {
    return car.images && car.images[0]
      ? car.images[0]
      : (typeof brandImages !== 'undefined' ? brandImages?.[car.brand] : '') || '';
  }

  function renderDashCarCard(car, options = {}) {
  const imgSrc = carImage(car);
  const removeClass = options.saved ? 'saved-remove-btn' : 'remove';

  const firstButton = options.saved
    ? `<a href="/car/${car._id}" class="dash-ad-btn edit">View</a>`
    : `<a href="/sell-car.html?edit=${car._id}" class="dash-ad-btn edit">Edit</a>`;

  return `
    <div class="dash-ad-card car-card-placeholder" data-id="${car._id}">
      <div class="dash-ad-img">
        ${imgSrc ? `<img src="${imgSrc}" alt="${car.brand}">` : `<span style="font-size:3rem">🚗</span>`}
      </div>

      <div class="dash-ad-body">
        <div class="dash-ad-top">
          <div class="dash-ad-title">${car.brand} ${car.model} ${car.year}</div>
          <span class="dash-status ${car.status}">
            ${String(car.status || 'active').charAt(0).toUpperCase() + String(car.status || 'active').slice(1)}
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
          ${firstButton}

          <button type="button" class="dash-ad-btn remove ${removeClass}" data-id="${car._id}">
            Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

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
        grid.innerHTML = `<div class="dash-empty">
          <span>🚗</span>
          <p>You haven't listed any cars yet.</p>
          <a href="/sell-car.html">+ List Your Car</a>
        </div>`;
        return;
      }

      grid.innerHTML = myAds.map(car => renderDashCarCard(car)).join('');

      grid.querySelectorAll('.dash-ad-btn.remove:not(.saved-remove-btn)').forEach(btn => {
        btn.addEventListener('click', async () => {
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
    } catch (err) {
      console.error('My ads error:', err);
    }
  }

  async function loadSavedAds() {
    const grid = document.getElementById('savedAdsGrid');
    if (!grid) return;

    try {
      grid.innerHTML = `<div class="dash-empty">
        <span>🔖</span>
        <p>Loading saved ads...</p>
      </div>`;

      const res = await fetch('/api/auth/saved-cars', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeJson(res);

      if (!res.ok) {
        grid.innerHTML = `<div class="dash-empty">
          <span>⚠️</span>
          <p>${data.message || 'Could not load saved ads.'}</p>
        </div>`;
        return;
      }

      const savedAds = data.cars || [];

      if (savedAds.length === 0) {
        grid.innerHTML = `<div class="dash-empty">
          <span>🔖</span>
          <p>You haven't saved any cars yet.</p>
          <a href="/used-cars.html">Browse Cars</a>
        </div>`;
        return;
      }

      grid.innerHTML = savedAds.map(car => renderDashCarCard(car, { saved: true })).join('');

      grid.querySelectorAll('.saved-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
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
      grid.innerHTML = `<div class="dash-empty">
        <span>⚠️</span>
        <p>Server error while loading saved ads.</p>
      </div>`;
    }
  }

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

  loadMyAds();
  loadSavedAds();
  renderMyPosts();
});
