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
    headers: { ...authHeaders(), ...(opts.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Global object to track the current page state for every section smoothly
const currentPages = {
  'dashboard': 1,
  'pending': 1,
  'all-cars': 1,
  'rejected': 1,
  'users': 1,
  'buy-requests': 1,
  'rent-requests': 1
};
const ITEMS_PER_PAGE = 5;

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `admin-toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Row helpers ───────────────────────────────────────────────
const loadingRow = () => `<div class="table-row"><span style="opacity:.4;grid-column:1/-1;padding:1rem 0">Loading…</span></div>`;
const emptyRow   = m  => `<div class="table-row"><span style="opacity:.4;grid-column:1/-1;padding:1rem 0">${m}</span></div>`;
const errorRow   = m  => `<div class="table-row"><span style="color:#c0392b;grid-column:1/-1;padding:1rem 0">Error: ${m}</span></div>`;

function removeRow(id) {
  document.querySelectorAll(`.table-row[data-id="${id}"]`).forEach(row => {
    row.style.transition = 'opacity .3s';
    row.style.opacity = '0';
    setTimeout(() => row.remove(), 300);
  });
}

// ── Global Pagination UI Renderer ─────────────────────────────
function renderPaginationFooter(sectionName, totalItems, currentPage, targetContainerId) {
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

  let html = `<button class="adm-pg-btn" data-section="${sectionName}" data-pg="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;
  
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="adm-pg-btn ${i === currentPage ? 'active' : ''}" data-section="${sectionName}" data-pg="${i}">${i}</button>`;
  }
  
  html += `<button class="adm-pg-btn" data-section="${sectionName}" data-pg="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;
  pagContainer.innerHTML = html;
}

// ── Auth Guard ────────────────────────────────────────────────
function guardAdmin() {
  const t = getToken();
  if (!t) { window.location.href = '/login.html'; return; }

  const raw  = localStorage.getItem('user');
  const role = raw
    ? (JSON.parse(raw).role || '').toLowerCase()
    : (localStorage.getItem('role') || '').toLowerCase();

  if (role !== 'admin') {
    alert(`Access denied. Your role is "${role || 'user'}".`);
    window.location.href = '/';
    return;
  }

  const name = raw
    ? JSON.parse(raw).name
    : localStorage.getItem('rxUser') || 'A';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarEl = document.getElementById('adminAvatar');
  if (avatarEl) avatarEl.textContent = initials;
}

// ── Section titles ────────────────────────────────────────────
const sectionTitles = {
  'dashboard':     ['Admin Dashboard',   'Monitor users, listings, and requests.'],
  'pending':       ['Pending Listings',  'Review and approve or reject new submissions.'],
  'all-cars':      ['Approved Cars',     'All active listings visible to the public.'],
  'rejected':      ['Rejected Cars',     'Cars that were declined by admin review.'],
  'users':         ['Users',             'Manage all registered accounts.'],
  'buy-requests':  ['Buy Requests',      'All purchase requests from users.'],
  'rent-requests': ['Rent Requests',     'All rental requests from users.']
};

// ── Navigation Toggle Machine ───────────────────────────
function switchSection(name, page = 1) {
  currentPages[name] = page;

  document.querySelectorAll('.admin-menu a[data-section]').forEach(l =>
    l.classList.toggle('active', l.dataset.section === name)
  );

  document.querySelectorAll('.admin-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  const statsOverviewContainer = document.getElementById('adminDashboardStats');
  if (statsOverviewContainer) {
    statsOverviewContainer.style.display = (name === 'dashboard') ? 'grid' : 'none';
  }

  const targetSection = document.getElementById('section-' + name);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  }

  const [title, sub] = sectionTitles[name] || ['Admin', ''];
  const titleEl = document.getElementById('topbarTitle');
  const subEl   = document.getElementById('topbarSub');
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  const loaders = {
    'dashboard':     loadDashboard,
    'pending':       () => loadCarsSection('pending',  'pendingFullTableBody', 'pendingCount', page),
    'all-cars':      () => loadCarsSection('active',   'allCarsTableBody',    'allCarsCount', page),
    'rejected':      () => loadCarsSection('rejected', 'rejectedTableBody',   'rejectedCount', page),
    'users':         () => loadUsers(page),
    'buy-requests':  () => loadRequests('buy',  'buyReqTableBody',  'buyReqCount', page),
    'rent-requests': () => loadRequests('rent', 'rentReqTableBody', 'rentReqCount', page)
  };
  if (loaders[name]) loaders[name]();
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
    ['token','rxToken','user','rxUser','rxEmail','role'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
  });

  document.getElementById('adminSearch')?.addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.admin-section.active .table-row:not(.table-head)').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiFetch('/stats');
    document.getElementById('stat-users').textContent    = (data.totalUsers  || 0).toLocaleString();
    document.getElementById('stat-listings').textContent = (data.totalCars   || 0).toLocaleString();
    document.getElementById('stat-pending').textContent  = (data.pendingCars || 0).toLocaleString();
    document.getElementById('stat-active').textContent   = (data.activeCars  || 0).toLocaleString();
  } catch (err) { console.error('Stats error:', err); }
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
    tbody.innerHTML = '';
    const cars = Array.isArray(data) ? data : data.cars || [];
    if (!cars.length) { tbody.innerHTML = emptyRow('No pending listings — all clear ✓'); return; }
    cars.forEach(car => tbody.appendChild(buildCarRow(car, true)));
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

async function loadSidePreviews() {
  try {
    const [usersData, rejData] = await Promise.all([
      apiFetch(`/users?limit=${ITEMS_PER_PAGE}`),
      apiFetch(`/cars?status=rejected&limit=${ITEMS_PER_PAGE}`)
    ]);

    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    const rejectedCars = Array.isArray(rejData) ? rejData : rejData.cars || [];

    const ul = document.getElementById('recentUsersList');
    if (ul) ul.innerHTML = users.length
      ? users.map(u => `<li><strong>${u.name}</strong> <span style="opacity:.5;font-size:.8rem">${u.email}</span></li>`).join('')
      : '<li style="opacity:.5">No users yet.</li>';

    const rl = document.getElementById('rejectedPreviewList');
    if (rl) rl.innerHTML = rejectedCars.length
      ? rejectedCars.map(c => `<li>${c.brand} ${c.model} ${c.year} — <span style="opacity:.5">${c.user?.name || '—'}</span></li>`).join('')
      : '<li style="opacity:.5">No rejected cars.</li>';
  } catch (err) { console.error('Side previews error:', err); }
}

// ── Cars Sections ──
async function loadCarsSection(status, tbodyId, countId, page = 1) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data = await apiFetch(`/cars?status=${status}&limit=${ITEMS_PER_PAGE}&page=${page}`);
    const cars = Array.isArray(data) ? data : data.cars || [];
    const totalCount = data.total !== undefined ? data.total : cars.length;

    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = `${totalCount} car${totalCount !== 1 ? 's' : ''}`;
    
    tbody.innerHTML = '';
    if (!cars.length) { tbody.innerHTML = emptyRow('No cars found.'); return; }
    cars.forEach(car => tbody.appendChild(buildCarRow(car, false)));

    const mappedSectionKey = status === 'pending' ? 'pending' : (status === 'active' ? 'all-cars' : 'rejected');
    renderPaginationFooter(mappedSectionKey, totalCount, page, tbodyId);
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

function buildCarRow(car, compact) {
  const cls = { active:'approved', rejected:'rejected', pending:'pending' }[car.status] || 'pending';
  const row = document.createElement('div');
  row.className = 'table-row';
  row.dataset.id = car._id;

  let actions = '';
  if (car.status !== 'active')   actions += `<button class="approve-btn" data-id="${car._id}" data-action="active">Approve</button>`;
  if (car.status !== 'rejected') actions += `<button class="reject-btn"  data-id="${car._id}" data-action="rejected">Reject</button>`;
  if (!compact)                  actions += `<button class="delete-btn"  data-id="${car._id}" data-action="delete-car">Delete</button>`;

  row.innerHTML = `
    <span>${car.brand} ${car.model} ${car.year}</span>
    <span>${car.user?.name || '—'}</span>
    <span>${Number(car.price).toLocaleString()} EGP</span>
    <span><span class="status ${cls}">${car.status}</span></span>
    <span class="actions">${actions}</span>`;
  return row;
}

// ── Users Section ─────────────────────────────────────────────
async function loadUsers(page = 1) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data       = await apiFetch(`/users?limit=${ITEMS_PER_PAGE}&page=${page}`);
    const users      = Array.isArray(data) ? data : data.users || [];
    const totalCount = data.total !== undefined ? data.total : users.length;

    const countEl = document.getElementById('usersCount');
    if (countEl) countEl.textContent = `${totalCount} user${totalCount !== 1 ? 's' : ''}`;

    tbody.innerHTML = '';
    if (!users.length) { tbody.innerHTML = emptyRow('No users found.'); return; }
    users.forEach(u => tbody.appendChild(buildUserRow(u)));

    renderPaginationFooter('users', totalCount, page, 'usersTableBody');
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

function buildUserRow(user) {
  const me     = JSON.parse(localStorage.getItem('user') || '{}');
  const isSelf = String(user._id) === String(me.id || me._id);
  const cls    = user.role === 'admin' ? 'approved' : 'pending';
  const joined = new Date(user.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const actions = isSelf
    ? `<span style="opacity:.4;font-size:.8rem">You</span>`
    : `${user.role !== 'admin'
        ? `<button class="approve-btn" data-id="${user._id}" data-action="make-admin">Make Admin</button>`
        : `<button class="reject-btn"  data-id="${user._id}" data-action="revoke-admin">Revoke Admin</button>`
      }
      <button class="delete-btn" data-id="${user._id}" data-action="delete-user">Delete</button>`;

  const row = document.createElement('div');
  row.className = 'table-row users-row';
  row.dataset.id = user._id;
  row.innerHTML = `
    <span>${user.name}</span>
    <span style="font-size:.85rem;opacity:.8">${user.email}</span>
    <span><span class="status ${cls}">${user.role}</span></span>
    <span style="font-size:.82rem;opacity:.6">${joined}</span>
    <span class="actions">${actions}</span>`;
  return row;
}

// ── Requests Section ──────────────────────────────────────────
async function loadRequests(type, tbodyId, countId, page = 1) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data = await apiFetch(`/requests?type=${type}&limit=${ITEMS_PER_PAGE}&page=${page}`);
    const requestsList = Array.isArray(data) ? data : data.requests || [];
    const totalCount = data.total !== undefined ? data.total : requestsList.length;

    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = `${totalCount} request${totalCount !== 1 ? 's' : ''}`;
    
    tbody.innerHTML = '';
    if (!requestsList.length) { tbody.innerHTML = emptyRow('No requests yet.'); return; }

    requestsList.forEach(req => {
      const cls  = { pending:'pending', contacted:'approved', closed:'rejected' }[req.status] || 'pending';
      const car  = req.car;
      const dates = req.rentFrom
        ? `${new Date(req.rentFrom).toLocaleDateString()} → ${new Date(req.rentTo).toLocaleDateString()}`
        : '—';

      const row = document.createElement('div');
      row.className = 'table-row';
      row.dataset.id = req._id;
      row.innerHTML = `
        <span>${car ? `${car.brand} ${car.model} ${car.year}` : '—'}</span>
        <span>${req.name}<br><small style="opacity:.5">${req.user?.email || 'Guest'}</small></span>
        <span>
          <a href="tel:${req.phone}" style="color:inherit">${req.phone}</a><br>
          <small style="opacity:.5">${req.contact === 'whatsapp' ? '💬 WhatsApp' : '📞 Call'}</small>
        </span>
        <span>${type === 'buy'
          ? (req.offerPrice ? Number(req.offerPrice).toLocaleString() + ' EGP' : '—')
          : dates}</span>
        <span><span class="status ${cls}">${req.status}</span></span>
       <span class="actions">
          <button class="delete-btn" data-id="${req._id}" data-action="req-delete">Delete</button>
        </span>`;
      tbody.appendChild(row);
    });

    renderPaginationFooter(type === 'buy' ? 'buy-requests' : 'rent-requests', totalCount, page, tbodyId);
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

// ── Admin Rejection Modal Management ──────────────────────────
// ── Admin Rejection Modal Management ──────────────────────────
let targetCarIdForRejection = null;

const adminRejectModal = document.getElementById('adminRejectModal');
const adminRejectReasonInput = document.getElementById('adminRejectReasonInput');
const adminRejectConfirmBtn = document.getElementById('adminRejectConfirmBtn');
const adminRejectCancelBtn = document.getElementById('adminRejectCancelBtn');

function openRejectModal(carId) {
  targetCarIdForRejection = carId;
  if (adminRejectReasonInput) adminRejectReasonInput.value = '';
  if (adminRejectModal) adminRejectModal.style.display = 'flex';
}

function closeAdminRejectModal() {
  targetCarIdForRejection = null;
  if (adminRejectModal) adminRejectModal.style.display = 'none';
}

adminRejectCancelBtn?.addEventListener('click', closeAdminRejectModal);

adminRejectConfirmBtn?.addEventListener('click', async () => {
  if (!targetCarIdForRejection) return;

  const reasonText = adminRejectReasonInput.value.trim();
  if (!reasonText) {
    alert('Please provide a reason for the rejection so the user knows why.');
    return;
  }

  try {
    // 🔥 FIXED: Standardized to use the exact same /status route layout
    await apiFetch(`/cars/${targetCarIdForRejection}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'rejected',
        rejectionReason: reasonText
      })
    });

    showToast('Listing has been rejected and user notified.', 'success');
    closeAdminRejectModal();
    
    // Smoothly reload the current section view state instead of full window reloads
    const currentSectionName = document.querySelector('.admin-menu a.active')?.dataset.section || 'pending';
    switchSection(currentSectionName, currentPages[currentSectionName]);
    loadStats();
  } catch (err) {
    console.error('Rejection system submission execution error:', err);
    alert(err.message || 'Failed to complete listing decline sequence.');
  }
});

// ── Unified Event Dispatcher for Data Actions & Pagination Clicks ──
document.addEventListener('click', async function (e) {
  const pgBtn = e.target.closest('.adm-pg-btn');
  if (pgBtn) {
    const section = pgBtn.dataset.section;
    const nextPage = parseInt(pgBtn.dataset.pg);
    switchSection(section, nextPage);
    return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  const orig   = btn.textContent;
  const currentSectionName = document.querySelector('.admin-menu a.active')?.dataset.section || 'dashboard';
  
  btn.disabled = true;
  btn.textContent = '…';

  try {
    // Car status operations
    if (action === 'active') {
      // 🔥 FIXED: Aligned Approve to route to /status as well, keeping your backend route completely happy
      await apiFetch(`/cars/${id}/status`, { 
        method: 'PUT', 
        body: JSON.stringify({ status: 'active' }) 
      });
      showToast('Car approved ✓', 'success');
      removeRow(id);
      loadStats();
    } 
    else if (action === 'rejected') {
      btn.disabled = false;
      btn.textContent = orig;
      openRejectModal(id); 
      return; 
    }
    else if (action === 'delete-car') {
      if (!confirm('Delete this listing permanently?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/cars/${id}`, { method:'DELETE' });
      showToast('Listing deleted');
      switchSection(currentSectionName, currentPages[currentSectionName]);
      loadStats();
    }
    else if (action === 'make-admin') {
      if (!confirm('Promote this user to admin?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}/role`, { method:'PUT', body: JSON.stringify({ role:'admin' }) });
      showToast('User promoted ✓');
      loadUsers(currentPages['users']);
    }
    else if (action === 'revoke-admin') {
      if (!confirm("Revoke admin role?")) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}/role`, { method:'PUT', body: JSON.stringify({ role:'user' }) });
      showToast('Admin role revoked');
      loadUsers(currentPages['users']);
    }
    else if (action === 'delete-user') {
      if (!confirm('Delete user and ALL their listings? Cannot be undone.')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}`, { method:'DELETE' });
      showToast('User deleted');
      loadUsers(currentPages['users']);
      loadStats();
    }
    else if (action === 'req-delete') {
      if (!confirm('Delete this request permanently?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/requests/${id}`, { method:'DELETE' });
      showToast('Request deleted');
      switchSection(currentSectionName, currentPages[currentSectionName]);
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = orig;
    showToast('Error: ' + err.message, 'error');
  }
});

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  guardAdmin();
  initNav();
  switchSection('dashboard', 1);
});