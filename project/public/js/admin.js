const API = '/api/admin';

// ── Token: works with both key names ─────────────────────────
const getToken = () => localStorage.getItem('rxToken') || localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
});

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      ...authHeaders(),
      ...(opts.headers || {})
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

// ── Page State ────────────────────────────────────────────────
const currentPages = {
  dashboard: 1,
  pending: 1,
  'all-cars': 1,
  rejected: 1,
  users: 1,
  'buy-requests': 1,
  'rent-requests': 1,
  reports: 1,
  overview: 1,
  suggestions: 1,
  maintenance: 1,
  'community-reset': 1,
  'nuclear-reset': 1
};

const ITEMS_PER_PAGE = 5;

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;

  toast.textContent = msg;
  toast.className = `admin-toast show ${type}`;

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// ── Row Helpers ───────────────────────────────────────────────
const loadingRow = () => `
  <div class="table-row">
    <span style="opacity:.4;grid-column:1/-1;padding:1rem 0">Loading…</span>
  </div>
`;

const emptyRow = message => `
  <div class="table-row">
    <span style="opacity:.4;grid-column:1/-1;padding:1rem 0">${message}</span>
  </div>
`;

const errorRow = message => `
  <div class="table-row">
    <span style="color:#c0392b;grid-column:1/-1;padding:1rem 0">Error: ${message}</span>
  </div>
`;

function removeRow(id) {
  document.querySelectorAll(`.table-row[data-id="${id}"]`).forEach(row => {
    row.style.transition = 'opacity .3s';
    row.style.opacity = '0';

    setTimeout(() => {
      row.remove();
    }, 300);
  });
}

// ── Pagination ────────────────────────────────────────────────
function renderPaginationFooter(sectionName, totalItems, currentPage) {
  const targetSection = document.getElementById('section-' + sectionName);
  if (!targetSection) return;

  let pagContainer = targetSection.querySelector('.admin-pagination');

  if (!pagContainer) {
    pagContainer = document.createElement('div');
    pagContainer.className = 'admin-pagination';
    targetSection.appendChild(pagContainer);
  }

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) {
    pagContainer.innerHTML = '';
    return;
  }

  let html = `
    <button
      class="adm-pg-btn"
      data-section="${sectionName}"
      data-pg="${currentPage - 1}"
      ${currentPage === 1 ? 'disabled' : ''}
    >
      ‹ Prev
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button
        class="adm-pg-btn ${i === currentPage ? 'active' : ''}"
        data-section="${sectionName}"
        data-pg="${i}"
      >
        ${i}
      </button>
    `;
  }

  html += `
    <button
      class="adm-pg-btn"
      data-section="${sectionName}"
      data-pg="${currentPage + 1}"
      ${currentPage === totalPages ? 'disabled' : ''}
    >
      Next ›
    </button>
  `;

  pagContainer.innerHTML = html;
}

// ── Auth Guard ────────────────────────────────────────────────
function guardAdmin() {
  const token = getToken();

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const raw = localStorage.getItem('user');

  let role = '';

  try {
    role = raw
      ? (JSON.parse(raw).role || '').toLowerCase()
      : (localStorage.getItem('role') || '').toLowerCase();
  } catch {
    role = (localStorage.getItem('role') || '').toLowerCase();
  }

  if (role !== 'admin') {
    alert(`Access denied. Your role is "${role || 'user'}".`);
    window.location.href = '/';
    return;
  }

  let name = localStorage.getItem('rxUser') || 'Admin';

  try {
    if (raw) {
      name = JSON.parse(raw).name || name;
    }
  } catch {}

  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarEl = document.getElementById('adminAvatar');
  if (avatarEl) avatarEl.textContent = initials;
}

// ── Section Titles ────────────────────────────────────────────
const sectionTitles = {
  dashboard: ['Admin Dashboard', 'Monitor users, listings, and requests.'],
  pending: ['Pending Listings', 'Review and approve or reject new submissions.'],
  'all-cars': ['Approved Cars', 'All active listings visible to the public.'],
  rejected: ['Rejected Cars', 'Cars that were declined by admin review.'],
  users: ['Users', 'Manage all registered accounts.'],
  'buy-requests': ['Buy Requests', 'All purchase requests from users.'],
  'rent-requests': ['Rent Requests', 'All rental requests from users.'],
  reports: ['Community Reports', 'Review reported posts and take action.'],
  overview: ['Community Overview', 'Stats and health of all communities.'],
  suggestions: ['Community Suggestions', 'Review and approve user-submitted community requests.'],
  maintenance: ['Maintenance Mode', 'Control platform availability for community features.'],
  'community-reset': ['Community Reset', 'Permanently remove all content from a community.'],
  'nuclear-reset': ['Nuclear Reset', 'Full platform content reset — requires all 4 admin passwords.']
};

// ── Navigation ────────────────────────────────────────────────
function switchSection(name, page = 1) {
  currentPages[name] = page;

  document.querySelectorAll('.admin-menu a[data-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.section === name);
  });

  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });

  const statsOverviewContainer = document.getElementById('adminDashboardStats');

  if (statsOverviewContainer) {
    statsOverviewContainer.style.display = name === 'dashboard' ? 'grid' : 'none';
  }

  const targetSection = document.getElementById('section-' + name);

  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  }

  const [title, subtitle] = sectionTitles[name] || ['Admin', ''];

  const titleEl = document.getElementById('topbarTitle');
  const subEl = document.getElementById('topbarSub');

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;

  const loaders = {
    dashboard: loadDashboard,
    pending: () => loadCarsSection('pending', 'pendingFullTableBody', 'pendingCount', page),
    'all-cars': () => loadCarsSection('active', 'allCarsTableBody', 'allCarsCount', page),
    rejected: () => loadCarsSection('rejected', 'rejectedTableBody', 'rejectedCount', page),
    users: () => loadUsers(page),
    'buy-requests': () => loadRequests('buy', 'buyReqTableBody', 'buyReqCount', page),
    'rent-requests': () => loadRequests('rent', 'rentReqTableBody', 'rentReqCount', page),
    reports:           () => loadReports(1, true),
    overview:          () => loadCommunityOverview(),
    suggestions:       () => loadSuggestions(1, true),
    maintenance:       () => initMaintenance(),
    'community-reset': () => initCommunityReset(),
    'nuclear-reset':   () => initNuclearReset()
  };

  if (loaders[name]) {
    loaders[name]();
  }
}

function initNav() {
  document.querySelectorAll('.admin-menu a[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchSection(link.dataset.section, 1);
    });
  });

  document.getElementById('logoutBtn')?.addEventListener('click', e => {
    e.preventDefault();

    ['token', 'rxToken', 'user', 'rxUser', 'rxEmail', 'role'].forEach(key => {
      localStorage.removeItem(key);
    });

    window.location.href = '/login.html';
  });

  document.getElementById('adminSearch')?.addEventListener('input', function () {
    const query = this.value.toLowerCase();

    document.querySelectorAll('.admin-section.active .table-row:not(.table-head)').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
  });
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiFetch('/stats');

    const usersEl = document.getElementById('stat-users');
    const listingsEl = document.getElementById('stat-listings');
    const pendingEl = document.getElementById('stat-pending');
    const activeEl = document.getElementById('stat-active');

    if (usersEl) usersEl.textContent = (data.totalUsers || 0).toLocaleString();
    if (listingsEl) listingsEl.textContent = (data.totalCars || 0).toLocaleString();
    if (pendingEl) pendingEl.textContent = (data.pendingCars || 0).toLocaleString();
    if (activeEl) activeEl.textContent = (data.activeCars || 0).toLocaleString();
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ── Dashboard ─────────────────────────────────────────────────
async function loadDashboard() {
  await loadStats();
  await loadPendingPreview();
  await loadSidePreviews();
}

async function loadPendingPreview() {
  const tbody = document.getElementById('pendingTableBody');
  if (!tbody) return;

  tbody.innerHTML = loadingRow();

  try {
    const data = await apiFetch(`/cars?status=pending&limit=${ITEMS_PER_PAGE}`);
    const cars = Array.isArray(data) ? data : data.cars || [];

    tbody.innerHTML = '';

    if (!cars.length) {
      tbody.innerHTML = emptyRow('No pending listings — all clear ✓');
      return;
    }

    cars.forEach(car => {
      tbody.appendChild(buildCarRow(car, true));
    });
  } catch (err) {
    tbody.innerHTML = errorRow(err.message);
  }
}

async function loadSidePreviews() {
  try {
    const [usersData, rejectedData] = await Promise.all([
      apiFetch(`/users?limit=${ITEMS_PER_PAGE}`),
      apiFetch(`/cars?status=rejected&limit=${ITEMS_PER_PAGE}`)
    ]);

    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    const rejectedCars = Array.isArray(rejectedData) ? rejectedData : rejectedData.cars || [];

    const usersList = document.getElementById('recentUsersList');

    if (usersList) {
      usersList.innerHTML = users.length
        ? users
            .map(user => `
              <li>
                <strong>${user.name}</strong>
                <span style="opacity:.5;font-size:.8rem">${user.email}</span>
              </li>
            `)
            .join('')
        : '<li style="opacity:.5">No users yet.</li>';
    }

    const rejectedList = document.getElementById('rejectedPreviewList');

    if (rejectedList) {
      rejectedList.innerHTML = rejectedCars.length
        ? rejectedCars
            .map(car => `
              <li>
                ${car.brand} ${car.model} ${car.year}
                —
                <span style="opacity:.5">${car.user?.name || '—'}</span>
              </li>
            `)
            .join('')
        : '<li style="opacity:.5">No rejected cars.</li>';
    }
  } catch (err) {
    console.error('Side previews error:', err);
  }
}

// ── Cars Sections ─────────────────────────────────────────────
async function loadCarsSection(status, tbodyId, countId, page = 1) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = loadingRow();

  try {
    const data = await apiFetch(`/cars?status=${status}&limit=${ITEMS_PER_PAGE}&page=${page}`);

    const cars = Array.isArray(data) ? data : data.cars || [];
    const totalCount = data.total !== undefined ? data.total : cars.length;

    const countEl = document.getElementById(countId);

    if (countEl) {
      countEl.textContent = `${totalCount} car${totalCount !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = '';

    if (!cars.length) {
      tbody.innerHTML = emptyRow('No cars found.');
      return;
    }

    cars.forEach(car => {
      tbody.appendChild(buildCarRow(car, false));
    });

    const sectionKey =
      status === 'pending'
        ? 'pending'
        : status === 'active'
        ? 'all-cars'
        : 'rejected';

    renderPaginationFooter(sectionKey, totalCount, page);
  } catch (err) {
    tbody.innerHTML = errorRow(err.message);
  }
}

function buildCarRow(car, compact) {
  const cls = {
    active: 'approved',
    rejected: 'rejected',
    pending: 'pending'
  }[car.status] || 'pending';

  const row = document.createElement('div');
  row.className = 'table-row';
  row.dataset.id = car._id;

  let actions = '';

  if (car.status !== 'active') {
    actions += `
      <button class="approve-btn" data-id="${car._id}" data-action="active">
        Approve
      </button>
    `;
  }

  if (car.status !== 'rejected') {
    actions += `
      <button class="reject-btn" data-id="${car._id}" data-action="rejected">
        Reject
      </button>
    `;
  }

  if (!compact) {
    actions += `
      <button class="delete-btn" data-id="${car._id}" data-action="delete-car">
        Delete
      </button>
    `;
  }

  row.innerHTML = `
    <span>${car.brand} ${car.model} ${car.year}</span>
    <span>${car.user?.name || '—'}</span>
    <span>${Number(car.price || 0).toLocaleString()} EGP</span>
    <span>
      <span class="status ${cls}">
        ${car.status}
      </span>
    </span>
    <span class="actions">
      ${actions}
    </span>
  `;

  return row;
}

// ── Users Section ─────────────────────────────────────────────
async function loadUsers(page = 1) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = loadingRow();

  try {
    const data = await apiFetch(`/users?limit=${ITEMS_PER_PAGE}&page=${page}`);

    const users = Array.isArray(data) ? data : data.users || [];
    const totalCount = data.total !== undefined ? data.total : users.length;

    const countEl = document.getElementById('usersCount');

    if (countEl) {
      countEl.textContent = `${totalCount} user${totalCount !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = '';

    if (!users.length) {
      tbody.innerHTML = emptyRow('No users found.');
      return;
    }

    users.forEach(user => {
      tbody.appendChild(buildUserRow(user));
    });

    renderPaginationFooter('users', totalCount, page);
  } catch (err) {
    tbody.innerHTML = errorRow(err.message);
  }
}

function buildUserRow(user) {
  let me = {};

  try {
    me = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    me = {};
  }

  const isSelf = String(user._id) === String(me.id || me._id);
  const cls = user.role === 'admin' ? 'approved' : 'pending';

  const joined = new Date(user.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const actions = isSelf
    ? `<span style="opacity:.4;font-size:.8rem">You</span>`
    : `
      ${
        user.role !== 'admin'
          ? `<button class="approve-btn" data-id="${user._id}" data-action="make-admin">Make Admin</button>`
          : `<button class="reject-btn" data-id="${user._id}" data-action="revoke-admin">Revoke Admin</button>`
      }
      <button class="delete-btn" data-id="${user._id}" data-action="delete-user">Delete</button>
    `;

  const row = document.createElement('div');
  row.className = 'table-row users-row';
  row.dataset.id = user._id;

  row.innerHTML = `
    <span>${user.name}</span>
    <span style="font-size:.85rem;opacity:.8">${user.email}</span>
    <span>
      <span class="status ${cls}">
        ${user.role}
      </span>
    </span>
    <span style="font-size:.82rem;opacity:.6">${joined}</span>
    <span class="actions">
      ${actions}
    </span>
  `;

  return row;
}

// ── Requests Section ──────────────────────────────────────────
function adminRequestStatusInfo(status) {
  const map = {
    pending: {
      cls: 'pending',
      text: 'Pending'
    },
    contacted: {
      cls: 'approved',
      text: 'Accepted'
    },
    closed: {
      cls: 'rejected',
      text: 'Rejected'
    },
    accepted: {
      cls: 'approved',
      text: 'Accepted'
    },
    rejected: {
      cls: 'rejected',
      text: 'Rejected'
    }
  };

  return map[status] || map.pending;
}

async function loadRequests(type, tbodyId, countId, page = 1) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = loadingRow();

  try {
    const data = await apiFetch(`/requests?type=${type}&limit=${ITEMS_PER_PAGE}&page=${page}`);

    const requestsList = Array.isArray(data) ? data : data.requests || [];
    const totalCount = data.total !== undefined ? data.total : requestsList.length;

    const countEl = document.getElementById(countId);

    if (countEl) {
      countEl.textContent = `${totalCount} request${totalCount !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = '';

    if (!requestsList.length) {
      tbody.innerHTML = emptyRow('No requests yet.');
      return;
    }

    requestsList.forEach(req => {
      const car = req.car;
      const info = adminRequestStatusInfo(req.status);

      const dates = req.rentFrom
        ? `${new Date(req.rentFrom).toLocaleDateString()} → ${new Date(req.rentTo).toLocaleDateString()}`
        : '—';

      let actionButtons = '';

      if (req.status === 'pending') {
        actionButtons = `
          <button
            class="approve-btn"
            data-id="${req._id}"
            data-action="req-status"
            data-status="contacted"
          >
            ✓ Accept
          </button>

          <button
            class="reject-btn"
            data-id="${req._id}"
            data-action="req-status"
            data-status="closed"
          >
            ✕ Reject
          </button>

          <button
            class="delete-btn"
            data-id="${req._id}"
            data-action="req-delete"
          >
            Delete
          </button>
        `;
      } else {
        actionButtons = `
          <span class="status ${info.cls}">
            ${info.text}
          </span>

          <button
            class="delete-btn"
            data-id="${req._id}"
            data-action="req-delete"
          >
            Delete
          </button>
        `;
      }

      const row = document.createElement('div');
      row.className = 'table-row';
      row.dataset.id = req._id;

      row.innerHTML = `
        <span>${car ? `${car.brand} ${car.model} ${car.year}` : '—'}</span>

        <span>
          ${req.name}
          <br>
          <small style="opacity:.5">${req.user?.email || 'Guest'}</small>
        </span>

        <span>
          <a href="tel:${req.phone}" style="color:inherit">${req.phone}</a>
          <br>
          <small style="opacity:.5">${req.contact === 'whatsapp' ? '💬 WhatsApp' : '📞 Call'}</small>
        </span>

        <span>
          ${
            type === 'buy'
              ? req.offerPrice
                ? Number(req.offerPrice).toLocaleString() + ' EGP'
                : '—'
              : dates
          }
        </span>

        <span>
          <span class="status ${info.cls}">
            ${info.text}
          </span>
        </span>

        <span class="actions">
          ${actionButtons}
        </span>
      `;

      tbody.appendChild(row);
    });

    renderPaginationFooter(type === 'buy' ? 'buy-requests' : 'rent-requests', totalCount, page);
  } catch (err) {
    tbody.innerHTML = errorRow(err.message);
  }
}

// ── Admin Car Rejection Modal ─────────────────────────────────
let targetCarIdForRejection = null;

const adminRejectModal = document.getElementById('adminRejectModal');
const adminRejectReasonInput = document.getElementById('adminRejectReasonInput');
const adminRejectConfirmBtn = document.getElementById('adminRejectConfirmBtn');
const adminRejectCancelBtn = document.getElementById('adminRejectCancelBtn');

function openRejectModal(carId) {
  targetCarIdForRejection = carId;

  if (adminRejectReasonInput) {
    adminRejectReasonInput.value = '';
  }

  if (adminRejectConfirmBtn) {
    adminRejectConfirmBtn.disabled = true;
  }

  if (adminRejectModal) {
    adminRejectModal.style.display = 'flex';
  }
}

function closeAdminRejectModal() {
  targetCarIdForRejection = null;

  if (adminRejectReasonInput) {
    adminRejectReasonInput.value = '';
  }

  if (adminRejectConfirmBtn) {
    adminRejectConfirmBtn.disabled = true;
  }

  if (adminRejectModal) {
    adminRejectModal.style.display = 'none';
  }
}

adminRejectReasonInput?.addEventListener('input', () => {
  if (!adminRejectConfirmBtn) return;
  adminRejectConfirmBtn.disabled = adminRejectReasonInput.value.trim().length === 0;
});

adminRejectCancelBtn?.addEventListener('click', closeAdminRejectModal);

adminRejectModal?.addEventListener('click', e => {
  if (e.target === adminRejectModal) {
    closeAdminRejectModal();
  }
});

adminRejectConfirmBtn?.addEventListener('click', async () => {
  if (!targetCarIdForRejection) return;

  const reasonText = adminRejectReasonInput?.value.trim() || '';

  if (!reasonText) {
    alert('Please provide a reason for the rejection so the user knows why.');
    return;
  }

  adminRejectConfirmBtn.disabled = true;
  const oldText = adminRejectConfirmBtn.textContent;
  adminRejectConfirmBtn.textContent = 'Rejecting…';

  try {
    await apiFetch(`/cars/${targetCarIdForRejection}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'rejected',
        rejectionReason: reasonText
      })
    });

    showToast('Listing has been rejected and user notified.', 'success');
    closeAdminRejectModal();

    const currentSectionName =
      document.querySelector('.admin-menu a.active')?.dataset.section || 'pending';

    switchSection(currentSectionName, currentPages[currentSectionName]);
    loadStats();
  } catch (err) {
    console.error('Rejection system submission error:', err);
    alert(err.message || 'Failed to reject listing.');
  } finally {
    adminRejectConfirmBtn.textContent = oldText;
    adminRejectConfirmBtn.disabled = false;
  }
});

// ── Unified Event Dispatcher ──────────────────────────────────
document.addEventListener('click', async function (e) {
  const pgBtn = e.target.closest('.adm-pg-btn');

  if (pgBtn) {
    const section = pgBtn.dataset.section;
    const nextPage = parseInt(pgBtn.dataset.pg, 10);

    if (!Number.isNaN(nextPage)) {
      switchSection(section, nextPage);
    }

    return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const orig = btn.textContent;

  const currentSectionName =
    document.querySelector('.admin-menu a.active')?.dataset.section || 'dashboard';

  btn.disabled = true;
  btn.textContent = '…';

  try {
    if (action === 'active') {
      await apiFetch(`/cars/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'active'
        })
      });

      showToast('Car approved ✓', 'success');
      removeRow(id);
      switchSection(currentSectionName, currentPages[currentSectionName]);
      loadStats();
    }

    else if (action === 'rejected') {
      btn.disabled = false;
      btn.textContent = orig;
      openRejectModal(id);
      return;
    }

    else if (action === 'delete-car') {
      if (!confirm('Delete this listing permanently?')) {
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      await apiFetch(`/cars/${id}`, {
        method: 'DELETE'
      });

      showToast('Listing deleted');
      switchSection(currentSectionName, currentPages[currentSectionName]);
      loadStats();
    }

    else if (action === 'make-admin') {
      if (!confirm('Promote this user to admin?')) {
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      await apiFetch(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({
          role: 'admin'
        })
      });

      showToast('User promoted ✓');
      loadUsers(currentPages.users);
    }

    else if (action === 'revoke-admin') {
      if (!confirm('Revoke admin role?')) {
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      await apiFetch(`/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({
          role: 'user'
        })
      });

      showToast('Admin role revoked');
      loadUsers(currentPages.users);
    }

    else if (action === 'delete-user') {
      if (!confirm('Delete user and ALL their listings? Cannot be undone.')) {
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      await apiFetch(`/users/${id}`, {
        method: 'DELETE'
      });

      showToast('User deleted');
      loadUsers(currentPages.users);
      loadStats();
    }

    else if (action === 'req-status') {
      const newStatus = btn.dataset.status;

      if (!['contacted', 'closed', 'pending', 'accepted', 'rejected'].includes(newStatus)) {
        throw new Error('Invalid request status');
      }

      await apiFetch(`/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus
        })
      });

      showToast(
        newStatus === 'contacted'
          ? 'Request accepted ✓'
          : newStatus === 'closed'
          ? 'Request rejected'
          : 'Request updated',
        'success'
      );

      switchSection(currentSectionName, currentPages[currentSectionName]);
    }

    else if (action === 'req-delete') {
      if (!confirm('Delete this request permanently?')) {
        btn.disabled = false;
        btn.textContent = orig;
        return;
      }

      await apiFetch(`/requests/${id}`, {
        method: 'DELETE'
      });

      showToast('Request deleted');
      switchSection(currentSectionName, currentPages[currentSectionName]);
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = orig;
    showToast('Error: ' + err.message, 'error');
  }
});

// ── Community Reports ─────────────────────────────────────────
let reportsCurrentPage   = 1;
let reportsTotalPages    = 1;
let reportsCurrentStatus = 'pending';

const REASON_LABELS = {
  spam:          'Spam',
  misinformation:'Misinformation',
  inappropriate: 'Inappropriate',
  harassment:    'Harassment',
  other:         'Other'
};

const REASON_COLORS = {
  spam:          'rpt-reason-spam',
  misinformation:'rpt-reason-misinfo',
  inappropriate: 'rpt-reason-inappropriate',
  harassment:    'rpt-reason-harassment',
  other:         'rpt-reason-other'
};

async function loadReports(page = 1, reset = false) {
  const list      = document.getElementById('reportsTableBody');
  const empty     = document.getElementById('reportsEmptyState');
  const loadMore  = document.getElementById('reportsLoadMore');
  const countEl   = document.getElementById('reportsCount');
  if (!list) return;

  if (reset) {
    list.innerHTML = '<div class="rpt-loading">Loading…</div>';
    if (empty)    empty.style.display    = 'none';
    if (loadMore) loadMore.style.display = 'none';
  }

  try {
    const data = await apiFetch(`/reports?status=${reportsCurrentStatus}&page=${page}`);
    reportsCurrentPage = data.page;
    reportsTotalPages  = data.pages;

    if (reset) list.innerHTML = '';

    if (data.total === 0 && reset) {
      if (empty) empty.style.display = 'flex';
    }

    if (countEl) {
      countEl.textContent = `${data.total} report${data.total !== 1 ? 's' : ''}`;
    }

    updateReportsBadge(reportsCurrentStatus === 'pending' ? data.total : null);

    data.reports.forEach(report => {
      list.appendChild(buildReportCard(report));
    });

    if (loadMore) {
      loadMore.style.display = reportsCurrentPage < reportsTotalPages ? 'flex' : 'none';
    }
  } catch (err) {
    list.innerHTML = `<div class="rpt-error">Error: ${err.message}</div>`;
  }
}

function updateReportsBadge(count) {
  const badge = document.getElementById('reportsNavBadge');
  if (!badge) return;
  if (count && count > 0) {
    badge.textContent    = count > 99 ? '99+' : count;
    badge.style.display  = 'inline-block';
  } else if (count === 0) {
    badge.style.display  = 'none';
  }
}

function buildReportCard(report) {
  const card = document.createElement('div');
  card.className    = 'rpt-card';
  card.dataset.id   = report._id;

  const post       = report.postId;
  const reporter   = report.reporterId;
  const postTitle  = post?.title   || '[deleted post]';
  const postBody   = post?.body    ? post.body.slice(0, 120) + (post.body.length > 120 ? '…' : '') : '';
  const authorName = post?.authorId?.name    || '—';
  const commName   = post?.communityId?.name || '—';
  const repName    = reporter?.name || 'Unknown';
  const ts         = new Date(report.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const reasonCls  = REASON_COLORS[report.reason] || 'rpt-reason-other';
  const reasonLbl  = REASON_LABELS[report.reason] || report.reason;
  const postDeleted = post?.isDeleted ? '<span class="rpt-deleted-tag">POST DELETED</span>' : '';

  const actionButtons = reportsCurrentStatus === 'pending' ? `
    <button class="rpt-btn rpt-btn-dismiss"  data-rpt-action="dismiss"      data-id="${report._id}">Dismiss</button>
    <button class="rpt-btn rpt-btn-delete"   data-rpt-action="delete-post"  data-id="${report._id}" data-post-id="${post?._id || ''}" ${post?.isDeleted ? 'disabled' : ''}>Delete Post</button>
    <button class="rpt-btn rpt-btn-suspend"  data-rpt-action="suspend-open" data-id="${report._id}" data-user-id="${post?.authorId?._id || ''}" data-user-name="${authorName}">Suspend User</button>
  ` : `<span class="rpt-resolved-tag">${report.status.toUpperCase()}</span>`;

  card.innerHTML = `
    <div class="rpt-card-body">
      <div class="rpt-card-left">
        <div class="rpt-card-reason-row">
          <span class="rpt-reason-badge ${reasonCls}">${reasonLbl}</span>
          ${postDeleted}
        </div>
        <div class="rpt-post-title">${postTitle}</div>
        ${postBody ? `<div class="rpt-post-body">${postBody}</div>` : ''}
        <div class="rpt-post-meta">
          <span>in <strong>${commName}</strong></span>
          <span class="rpt-meta-sep">·</span>
          <span>by <strong>${authorName}</strong></span>
        </div>
      </div>
      <div class="rpt-card-right">
        <div class="rpt-reporter-name">${repName}</div>
        <div class="rpt-timestamp">${ts}</div>
      </div>
    </div>
    <div class="rpt-card-actions">
      ${actionButtons}
    </div>
    <div class="rpt-suspend-panel" id="suspendPanel_${report._id}" style="display:none">
      <div class="rpt-suspend-row">
        <span class="rpt-suspend-label">Duration:</span>
        <div class="rpt-dur-group">
          ${[1,3,7,14,30].map((d, i) => `<button class="rpt-dur-btn${i === 0 ? ' active' : ''}" data-days="${d}">${d}d</button>`).join('')}
        </div>
      </div>
      <input class="rpt-suspend-reason-input" placeholder="Reason for suspension…" maxlength="300">
      <div class="rpt-suspend-footer">
        <button class="rpt-btn rpt-btn-cancel-suspend" data-rpt-action="cancel-suspend" data-report-id="${report._id}">Cancel</button>
        <button class="rpt-btn rpt-btn-confirm-suspend" data-rpt-action="confirm-suspend" data-report-id="${report._id}" data-user-id="${post?.authorId?._id || ''}">Confirm Suspension</button>
      </div>
    </div>
  `;

  return card;
}

// ── Reports event delegation ──────────────────────────────────
document.addEventListener('click', async function(e) {
  // Filter buttons
  const filterBtn = e.target.closest('.rpt-filter-btn');
  if (filterBtn) {
    document.querySelectorAll('.rpt-filter-btn').forEach(b => b.classList.remove('active'));
    filterBtn.classList.add('active');
    reportsCurrentStatus = filterBtn.dataset.status;
    loadReports(1, true);
    return;
  }

  // Load More
  if (e.target.id === 'reportsLoadMoreBtn') {
    loadReports(reportsCurrentPage + 1, false);
    return;
  }

  // Duration selector inside suspend panel
  const durBtn = e.target.closest('.rpt-dur-btn');
  if (durBtn) {
    const panel = durBtn.closest('.rpt-suspend-panel');
    if (panel) {
      panel.querySelectorAll('.rpt-dur-btn').forEach(b => b.classList.remove('active'));
      durBtn.classList.add('active');
    }
    return;
  }

  const rptBtn = e.target.closest('[data-rpt-action]');
  if (!rptBtn) return;

  const action   = rptBtn.dataset.rptAction;
  const reportId = rptBtn.dataset.id;
  const orig     = rptBtn.textContent;

  if (action === 'dismiss') {
    rptBtn.disabled    = true;
    rptBtn.textContent = '…';
    try {
      await apiFetch(`/reports/${reportId}/dismiss`, { method: 'PATCH' });
      showToast('Report dismissed', 'success');
      document.querySelector(`.rpt-card[data-id="${reportId}"]`)?.remove();
      checkReportsEmpty();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      rptBtn.disabled    = false;
      rptBtn.textContent = orig;
    }
    return;
  }

  if (action === 'delete-post') {
    if (!confirm('Soft-delete this post? It will no longer be visible to users.')) return;
    rptBtn.disabled    = true;
    rptBtn.textContent = '…';
    try {
      await apiFetch(`/reports/${reportId}/delete-post`, { method: 'DELETE' });
      showToast('Post deleted and report resolved', 'success');
      document.querySelector(`.rpt-card[data-id="${reportId}"]`)?.remove();
      checkReportsEmpty();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      rptBtn.disabled    = false;
      rptBtn.textContent = orig;
    }
    return;
  }

  if (action === 'suspend-open') {
    const panel = document.getElementById(`suspendPanel_${reportId}`);
    if (panel) {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
    return;
  }

  if (action === 'cancel-suspend') {
    const panel = document.getElementById(`suspendPanel_${rptBtn.dataset.reportId}`);
    if (panel) panel.style.display = 'none';
    return;
  }

  if (action === 'confirm-suspend') {
    const panel    = document.getElementById(`suspendPanel_${rptBtn.dataset.reportId}`);
    const userId   = rptBtn.dataset.userId;
    const durActive = panel?.querySelector('.rpt-dur-btn.active');
    const days     = durActive ? parseInt(durActive.dataset.days) : 1;
    const reason   = panel?.querySelector('.rpt-suspend-reason-input')?.value.trim();

    if (!reason) {
      showToast('Please enter a suspension reason', 'error');
      return;
    }
    if (!userId) {
      showToast('Cannot identify post author', 'error');
      return;
    }

    rptBtn.disabled    = true;
    rptBtn.textContent = '…';

    try {
      await apiFetch(`/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason, durationDays: days, reportId: rptBtn.dataset.reportId })
      });
      showToast(`User suspended for ${days} day${days > 1 ? 's' : ''} ✓`, 'success');
      document.querySelector(`.rpt-card[data-id="${rptBtn.dataset.reportId}"]`)?.remove();
      checkReportsEmpty();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      rptBtn.disabled    = false;
      rptBtn.textContent = 'Confirm Suspension';
    }
    return;
  }
});

function checkReportsEmpty() {
  const list  = document.getElementById('reportsTableBody');
  const empty = document.getElementById('reportsEmptyState');
  if (list && empty && list.children.length === 0) {
    empty.style.display = 'flex';
    const countEl = document.getElementById('reportsCount');
    if (countEl) countEl.textContent = '0 reports';
    updateReportsBadge(0);
  }
}

async function loadReportsBadge() {
  try {
    const data = await apiFetch('/reports?status=pending&page=1');
    updateReportsBadge(data.total);
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// COMMUNITY: OVERVIEW
// ══════════════════════════════════════════════════════════════

async function loadCommunityOverview() {
  const statIds = ['ovr-totalPosts','ovr-totalComm','ovr-totalMembers','ovr-postsToday','ovr-pendingReports','ovr-pendingSugg'];
  statIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '…'; });

  const topList = document.getElementById('ovrTopCommList');
  const maintEl = document.getElementById('ovrMaintStatus');
  if (topList) topList.innerHTML = '<div class="rpt-loading">Loading…</div>';

  try {
    const data = await apiFetch('/community-stats');

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = (val ?? 0).toLocaleString();
    };

    set('ovr-totalPosts',     data.totalPosts);
    set('ovr-totalComm',      data.totalCommunities);
    set('ovr-totalMembers',   data.totalMembers);
    set('ovr-postsToday',     data.postsToday);
    set('ovr-pendingReports', data.pendingReports);
    set('ovr-pendingSugg',    data.pendingSuggestions);

    if (topList) {
      topList.innerHTML = '';
      const top = data.topCommunities || [];
      if (!top.length) {
        topList.innerHTML = '<div class="rpt-empty"><span>No communities yet</span></div>';
      } else {
        top.forEach(c => {
          const row = document.createElement('div');
          row.className = 'term-table-row';
          row.innerHTML = `
            <span>${c.name || '—'}</span>
            <span>${(c.memberCount || 0).toLocaleString()}</span>
            <span>${(c.postCount   || 0).toLocaleString()}</span>
          `;
          topList.appendChild(row);
        });
      }
    }

    if (maintEl) {
      if (data.maintenanceMode?.active) {
        const endsAt = data.maintenanceMode.endsAt
          ? new Date(data.maintenanceMode.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : 'no end time';
        maintEl.textContent = `ACTIVE — ends at ${endsAt}`;
        maintEl.style.color = '#f59e0b';
      } else {
        maintEl.textContent = 'INACTIVE — All community services operational';
        maintEl.style.color = '#22c55e';
      }
    }

    updateSuggBadge(data.pendingSuggestions);
  } catch (err) {
    statIds.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 'err'; });
    if (maintEl) { maintEl.textContent = 'Error: ' + err.message; maintEl.style.color = '#ef4444'; }
  }
}

// ══════════════════════════════════════════════════════════════
// COMMUNITY: SUGGESTIONS
// ══════════════════════════════════════════════════════════════

let suggCurrentPage   = 1;
let suggTotalPages    = 1;
let suggCurrentStatus = 'pending';

function updateSuggBadge(count) {
  const badge = document.getElementById('suggNavBadge');
  if (!badge) return;
  if (count && count > 0) {
    badge.textContent   = count > 99 ? '99+' : count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function loadSuggestions(page = 1, reset = false) {
  const list     = document.getElementById('suggTableBody');
  const empty    = document.getElementById('suggEmpty');
  const loadMore = document.getElementById('suggLoadMore');
  const countEl  = document.getElementById('suggCount');
  if (!list) return;

  if (reset) {
    list.innerHTML = '<div class="rpt-loading">Loading…</div>';
    if (empty)    empty.style.display    = 'none';
    if (loadMore) loadMore.style.display = 'none';
  }

  try {
    const data = await apiFetch(`/community-suggestions?status=${suggCurrentStatus}&page=${page}`);
    suggCurrentPage = data.page;
    suggTotalPages  = data.pages;

    if (reset) list.innerHTML = '';

    if (countEl) countEl.textContent = `${data.total} suggestion${data.total !== 1 ? 's' : ''}`;

    if (data.total === 0 && reset) {
      if (empty) { empty.style.display = 'flex'; empty.querySelector('span:last-child').textContent = `No ${suggCurrentStatus} suggestions`; }
    }

    (data.suggestions || []).forEach(sugg => list.appendChild(buildSuggestionCard(sugg)));

    if (loadMore) loadMore.style.display = suggCurrentPage < suggTotalPages ? 'flex' : 'none';

    if (suggCurrentStatus === 'pending') updateSuggBadge(data.total);
  } catch (err) {
    list.innerHTML = `<div class="rpt-error">Error: ${err.message}</div>`;
  }
}

function buildSuggestionCard(sugg) {
  const card      = document.createElement('div');
  card.className  = 'rpt-card';
  card.dataset.id = sugg._id;

  const brand     = sugg.brandId?.name || '—';
  const model     = sugg.model         || '—';
  const yearStart = sugg.yearStart      || '';
  const yearEnd   = sugg.yearEnd        || '';
  const yearRange = yearStart ? (yearEnd ? `${yearStart}–${yearEnd}` : `${yearStart}+`) : '';
  const details   = sugg.details        || '';
  const requester = sugg.userId?.name   || 'Anonymous';
  const ts        = new Date(sugg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const statusBadge = {
    pending:  '<span class="status pending">pending</span>',
    approved: '<span class="status approved">approved</span>',
    rejected: '<span class="status rejected">rejected</span>'
  }[sugg.status] || '';

  const actionButtons = sugg.status === 'pending'
    ? `
        <button class="rpt-btn rpt-btn-dismiss" data-sugg-action="approve"      data-id="${sugg._id}">Approve</button>
        <button class="rpt-btn rpt-btn-delete"  data-sugg-action="reject-open"  data-id="${sugg._id}">Reject</button>
      `
    : `${statusBadge}${sugg.adminNote ? `<span class="maint-detail" style="margin-left:8px">${sugg.adminNote}</span>` : ''}`;

  card.innerHTML = `
    <div class="rpt-card-body">
      <div class="rpt-card-left">
        <div class="sugg-brand">${brand}</div>
        <div class="sugg-model">${model} <span class="sugg-year">${yearRange}</span></div>
        ${details ? `<div class="sugg-details">${details}</div>` : ''}
        <div class="sugg-requester">Requested by: ${requester}</div>
      </div>
      <div class="rpt-card-right">
        <div class="rpt-timestamp">${ts}</div>
      </div>
    </div>
    <div class="rpt-card-actions">${actionButtons}</div>
    <div id="suggRejectPanel_${sugg._id}" style="display:none; margin-top:10px; background:#0a0a0a; border:1px solid #1e2130; border-radius:9px; padding:12px 14px; display:none; flex-direction:column; gap:8px;">
      <input class="term-input" style="font-size:.8rem" placeholder="Reason for rejection (optional)" maxlength="300">
      <div style="display:flex; justify-content:flex-end; gap:7px; margin-top:4px">
        <button class="rpt-btn rpt-btn-cancel-suspend" data-sugg-cancel="${sugg._id}">Cancel</button>
        <button class="rpt-btn rpt-btn-delete" data-sugg-action="reject-confirm" data-id="${sugg._id}">Confirm Reject</button>
      </div>
    </div>
  `;

  return card;
}

// Suggestions event delegation
document.addEventListener('click', async function(e) {
  // Filter buttons
  const suggFilterBtn = e.target.closest('[data-sugg-status]');
  if (suggFilterBtn) {
    document.querySelectorAll('[data-sugg-status]').forEach(b => b.classList.remove('active'));
    suggFilterBtn.classList.add('active');
    suggCurrentStatus = suggFilterBtn.dataset.suggStatus;
    loadSuggestions(1, true);
    return;
  }

  // Load more
  if (e.target.id === 'suggLoadMoreBtn') {
    loadSuggestions(suggCurrentPage + 1, false);
    return;
  }

  // Cancel reject panel
  const suggCancel = e.target.closest('[data-sugg-cancel]');
  if (suggCancel) {
    const panel = document.getElementById(`suggRejectPanel_${suggCancel.dataset.suggCancel}`);
    if (panel) panel.style.display = 'none';
    return;
  }

  const suggBtn = e.target.closest('[data-sugg-action]');
  if (!suggBtn) return;

  const action = suggBtn.dataset.suggAction;
  const id     = suggBtn.dataset.id;
  const orig   = suggBtn.textContent;

  if (action === 'approve') {
    if (!confirm('Approve this community suggestion? A new community will be created.')) return;
    suggBtn.disabled    = true;
    suggBtn.textContent = '…';
    try {
      await apiFetch(`/community-suggestions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      });
      showToast('Community suggestion approved ✓', 'success');
      document.querySelector(`.rpt-card[data-id="${id}"]`)?.remove();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      suggBtn.disabled    = false;
      suggBtn.textContent = orig;
    }
    return;
  }

  if (action === 'reject-open') {
    const panel = document.getElementById(`suggRejectPanel_${id}`);
    if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    return;
  }

  if (action === 'reject-confirm') {
    const panel  = document.getElementById(`suggRejectPanel_${id}`);
    const note   = panel?.querySelector('input')?.value.trim() || '';
    suggBtn.disabled    = true;
    suggBtn.textContent = '…';
    try {
      await apiFetch(`/community-suggestions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', adminNote: note })
      });
      showToast('Suggestion rejected', 'success');
      document.querySelector(`.rpt-card[data-id="${id}"]`)?.remove();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      suggBtn.disabled    = false;
      suggBtn.textContent = orig;
    }
    return;
  }
});

async function loadSuggBadge() {
  try {
    const data = await apiFetch('/community-suggestions?status=pending&page=1');
    updateSuggBadge(data.total);
  } catch {}
}

// ══════════════════════════════════════════════════════════════
// COMMUNITY: MAINTENANCE
// ══════════════════════════════════════════════════════════════

let maintCurrentActive = false;

async function initMaintenance() {
  try {
    const data = await apiFetch('/community-stats');
    maintCurrentActive = data.maintenanceMode?.active || false;
    renderMaintStatus(data.maintenanceMode);
  } catch (err) {
    const statusText = document.getElementById('maintStatusText');
    if (statusText) statusText.textContent = 'Error loading status';
  }

  const toggleBtn = document.getElementById('maintToggleBtn');
  if (toggleBtn && !toggleBtn._initDone) {
    toggleBtn._initDone = true;
    toggleBtn.addEventListener('click', handleMaintToggle);
  }

  // Duration button selection
  const durGroup = document.querySelector('#section-maintenance .maint-dur-group');
  if (durGroup && !durGroup._initDone) {
    durGroup._initDone = true;
    durGroup.addEventListener('click', e => {
      const btn = e.target.closest('.rpt-dur-btn');
      if (!btn) return;
      durGroup.querySelectorAll('.rpt-dur-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }
}

function renderMaintStatus(maint) {
  const dot        = document.getElementById('maintDot');
  const statusText = document.getElementById('maintStatusText');
  const detail     = document.getElementById('maintDetail');
  const toggleBtn  = document.getElementById('maintToggleBtn');
  const durField   = document.getElementById('maintDurationField');
  const msgField   = document.getElementById('maintMessageField');
  if (!dot) return;

  if (maint?.active) {
    dot.classList.add('active');
    if (statusText) { statusText.textContent = 'MAINTENANCE ACTIVE'; statusText.classList.add('active'); }
    const endsAt = maint.endsAt
      ? new Date(maint.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : null;
    if (detail) detail.textContent = endsAt ? `Ends at ${endsAt}${maint.message ? ' · ' + maint.message : ''}` : (maint.message || 'Active');
    if (toggleBtn) { toggleBtn.textContent = 'Deactivate Maintenance'; toggleBtn.className = 'term-btn term-btn-danger'; }
    if (durField) durField.style.display = 'none';
    if (msgField) msgField.style.display = 'none';
  } else {
    dot.classList.remove('active');
    if (statusText) { statusText.textContent = 'OPERATIONAL'; statusText.classList.remove('active'); }
    if (detail) detail.textContent = 'All community services running normally';
    if (toggleBtn) { toggleBtn.textContent = 'Activate Maintenance'; toggleBtn.className = 'term-btn term-btn-amber'; }
    if (durField) durField.style.display = '';
    if (msgField) msgField.style.display = '';
  }
}

async function handleMaintToggle() {
  const password = document.getElementById('maintPassword')?.value.trim();
  if (!password) { showToast('Enter an admin password', 'error'); return; }

  const toggleBtn = document.getElementById('maintToggleBtn');
  const origText  = toggleBtn.textContent;
  toggleBtn.disabled    = true;
  toggleBtn.textContent = '…';

  try {
    let body;
    if (maintCurrentActive) {
      body = { password };
    } else {
      const activeDurBtn  = document.querySelector('#section-maintenance .maint-dur-group .rpt-dur-btn.active');
      const durationMins  = activeDurBtn ? parseInt(activeDurBtn.dataset.mins) : 60;
      const message       = document.getElementById('maintMessage')?.value.trim() || '';
      body = { password, durationMinutes: durationMins, message };
    }

    const data = await apiFetch('/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    maintCurrentActive = data.active;
    renderMaintStatus(data.maintenanceMode || { active: data.active, endsAt: data.endsAt, message: data.message });
    showToast(data.active ? 'Maintenance activated' : 'Maintenance deactivated', 'success');
    document.getElementById('maintPassword').value = '';
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    toggleBtn.disabled    = false;
    toggleBtn.textContent = origText;
  }
}

// ══════════════════════════════════════════════════════════════
// COMMUNITY: RESET
// ══════════════════════════════════════════════════════════════

let resetTargetId   = null;
let resetTargetName = '';

async function initCommunityReset() {
  await loadCommunitiesForReset();

  const confirmPanel = document.getElementById('resetConfirmPanel');
  const resultEl     = document.getElementById('resetResult');
  if (confirmPanel) confirmPanel.style.display = 'none';
  if (resultEl) resultEl.style.display = 'none';

  const pass1 = document.getElementById('resetPass1');
  const pass2 = document.getElementById('resetPass2');
  if (pass1) pass1.value = '';
  if (pass2) pass2.value = '';

  const select = document.getElementById('resetCommSelect');
  if (select && !select._resetInit) {
    select._resetInit = true;
    select.addEventListener('change', () => {
      const opt  = select.options[select.selectedIndex];
      const info = document.getElementById('resetInfo');
      if (!info) return;
      if (!opt.value) { info.style.display = 'none'; resetTargetId = null; resetTargetName = ''; return; }
      resetTargetId   = opt.value;
      resetTargetName = opt.textContent;
      document.getElementById('resetPostCount').textContent   = opt.dataset.posts   || '0';
      document.getElementById('resetMemberCount').textContent = opt.dataset.members || '0';
      info.style.display = 'flex';
    });
  }

  const resetBtn = document.getElementById('resetCommBtn');
  if (resetBtn && !resetBtn._resetInit) {
    resetBtn._resetInit = true;
    resetBtn.addEventListener('click', () => {
      if (!resetTargetId) { showToast('Select a community first', 'error'); return; }
      const p1 = document.getElementById('resetPass1')?.value.trim();
      const p2 = document.getElementById('resetPass2')?.value.trim();
      if (!p1 || !p2) { showToast('Enter two admin passwords', 'error'); return; }

      const body = document.getElementById('resetConfirmBody');
      if (body) body.textContent = `This will permanently soft-delete all posts and comments in "${resetTargetName}".`;
      const confirmPanel = document.getElementById('resetConfirmPanel');
      const resultEl     = document.getElementById('resetResult');
      if (confirmPanel) confirmPanel.style.display = 'block';
      if (resultEl)     resultEl.style.display     = 'none';
    });
  }

  const cancelBtn = document.getElementById('resetConfirmCancelBtn');
  if (cancelBtn && !cancelBtn._resetInit) {
    cancelBtn._resetInit = true;
    cancelBtn.addEventListener('click', () => {
      document.getElementById('resetConfirmPanel').style.display = 'none';
    });
  }

  const execBtn = document.getElementById('resetConfirmExecuteBtn');
  if (execBtn && !execBtn._resetInit) {
    execBtn._resetInit = true;
    execBtn.addEventListener('click', handleCommunityReset);
  }
}

async function loadCommunitiesForReset() {
  const select = document.getElementById('resetCommSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Loading...</option>';
  try {
    const res  = await fetch('/api/communities', { headers: authHeaders() });
    const data = await res.json();
    const communities = data.communities || [];
    select.innerHTML = '<option value="">— Select a community —</option>';
    communities.forEach(c => {
      const opt          = document.createElement('option');
      opt.value          = c._id;
      opt.textContent    = c.name;
      opt.dataset.posts  = c.postCount   || 0;
      opt.dataset.members = c.memberCount || 0;
      select.appendChild(opt);
    });
  } catch {
    select.innerHTML = '<option value="">Error loading communities</option>';
  }
}

async function handleCommunityReset() {
  const execBtn = document.getElementById('resetConfirmExecuteBtn');
  const resultEl = document.getElementById('resetResult');
  const p1 = document.getElementById('resetPass1')?.value.trim();
  const p2 = document.getElementById('resetPass2')?.value.trim();

  if (!resetTargetId || !p1 || !p2) { showToast('Missing data — try again', 'error'); return; }

  execBtn.disabled    = true;
  execBtn.textContent = 'Resetting…';

  try {
    const data = await apiFetch(`/community/${resetTargetId}/reset`, {
      method: 'POST',
      body: JSON.stringify({ passwords: [p1, p2] })
    });

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.textContent   = `✓ Reset complete\n${data.deletedPosts || 0} posts deleted, ${data.deletedComments || 0} comments deleted`;
    }

    showToast(`Community "${resetTargetName}" has been reset ✓`, 'success');

    document.getElementById('resetPass1').value = '';
    document.getElementById('resetPass2').value = '';
    document.getElementById('resetConfirmPanel').style.display = 'none';
    await loadCommunitiesForReset();
    resetTargetId = null; resetTargetName = '';
    document.getElementById('resetInfo').style.display = 'none';
    document.getElementById('resetCommSelect').value = '';
    if (resultEl) setTimeout(() => { resultEl.style.display = 'none'; }, 8000);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    if (resultEl) { resultEl.style.display = 'block'; resultEl.textContent = '✕ ' + err.message; resultEl.style.color = '#ef4444'; }
  } finally {
    execBtn.disabled    = false;
    execBtn.textContent = 'CONFIRM RESET';
  }
}

// ══════════════════════════════════════════════════════════════
// COMMUNITY: NUCLEAR RESET
// ══════════════════════════════════════════════════════════════

function initNuclearReset() {
  const resultEl = document.getElementById('nuclearResult');
  if (resultEl) resultEl.style.display = 'none';

  const checkReady = () => {
    const p1  = document.getElementById('nuclearPass1')?.value.trim();
    const p2  = document.getElementById('nuclearPass2')?.value.trim();
    const p3  = document.getElementById('nuclearPass3')?.value.trim();
    const p4  = document.getElementById('nuclearPass4')?.value.trim();
    const txt = document.getElementById('nuclearConfirmText')?.value.trim();
    const btn = document.getElementById('nuclearExecuteBtn');
    if (btn) btn.disabled = !(p1 && p2 && p3 && p4 && txt === 'CONFIRM NUCLEAR RESET');
  };

  ['nuclearPass1','nuclearPass2','nuclearPass3','nuclearPass4','nuclearConfirmText'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._nuclearInit) {
      el._nuclearInit = true;
      el.addEventListener('input', checkReady);
    }
  });

  const execBtn = document.getElementById('nuclearExecuteBtn');
  if (execBtn && !execBtn._nuclearInit) {
    execBtn._nuclearInit = true;
    execBtn.addEventListener('click', handleNuclearReset);
  }

  checkReady();
}

async function handleNuclearReset() {
  const execBtn  = document.getElementById('nuclearExecuteBtn');
  const resultEl = document.getElementById('nuclearResult');

  const passwords = [
    document.getElementById('nuclearPass1')?.value.trim(),
    document.getElementById('nuclearPass2')?.value.trim(),
    document.getElementById('nuclearPass3')?.value.trim(),
    document.getElementById('nuclearPass4')?.value.trim()
  ];

  if (!confirm('FINAL WARNING — This will wipe ALL community posts and comments across the entire platform. This cannot be undone. Continue?')) return;

  execBtn.disabled    = true;
  execBtn.textContent = 'EXECUTING…';
  if (resultEl) { resultEl.style.display = 'none'; }

  try {
    const data = await apiFetch('/nuclear-reset', {
      method: 'POST',
      body: JSON.stringify({ passwords })
    });

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.style.color   = '#4ade80';
      resultEl.textContent   = `✓ NUCLEAR RESET COMPLETE\n${data.deletedPosts || 0} posts deleted\n${data.deletedComments || 0} comments deleted\n${data.communitiesReset || 0} communities reset`;
    }

    showToast('Nuclear reset executed successfully', 'success');

    ['nuclearPass1','nuclearPass2','nuclearPass3','nuclearPass4','nuclearConfirmText'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    execBtn.disabled = true;
  } catch (err) {
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.style.color   = '#ef4444';
      resultEl.textContent   = '✕ FAILED: ' + err.message;
    }
    showToast('Nuclear reset failed: ' + err.message, 'error');
    execBtn.disabled    = false;
    execBtn.textContent = 'EXECUTE NUCLEAR RESET';
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  guardAdmin();
  initNav();
  switchSection('dashboard', 1);
  loadReportsBadge();
  loadSuggBadge();
});