/* ============================================================
   admin.js — RevXChange Admin Panel
   ============================================================ */

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

// ── Auth Guard ────────────────────────────────────────────────
function guardAdmin() {
  const t = getToken();
  if (!t) { window.location.href = '/login.html'; return; }

  // Try full user object first, then fall back to role key
  const raw  = localStorage.getItem('user');
  const role = raw
    ? (JSON.parse(raw).role || '').toLowerCase()
    : (localStorage.getItem('role') || '').toLowerCase();

  if (role !== 'admin') {
    alert(`Access denied. Your role is "${role || 'user'}".`);
    window.location.href = '/';
    return;
  }

  // Set avatar initials
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

// ── Navigation ────────────────────────────────────────────────
// ── Navigation Toggle Machine (Fixed UI Overlapping) ───────────
function switchSection(name) {
  // 1. Manage active state design classes on the sidebar buttons
  document.querySelectorAll('.admin-menu a[data-section]').forEach(l =>
    l.classList.toggle('active', l.dataset.section === name)
  );

  // 2. Hide ALL data collection table sections across the entire document layout first
  document.querySelectorAll('.admin-section').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none'; // Forces it completely off the page layer
  });

  // 3. TARGET THE STAT CARDS: "Total Users", "Total Listings", "Pending Approvals", "Active Listings"
  const statsOverviewContainer = document.getElementById('adminDashboardStats');
  if (statsOverviewContainer) {
    if (name === 'dashboard') {
      // If clicking the main dashboard link, make the 4 stat cards visible
      statsOverviewContainer.style.display = 'grid'; 
    } else {
      // CRITICAL: Hide the 4 stat blocks completely when viewing any specific left sidebar category!
      statsOverviewContainer.style.display = 'none'; 
    }
  }

  // 4. Reveal the isolated table list block that was chosen
  const targetSection = document.getElementById('section-' + name);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block'; // Renders only this dynamic view list
  }

  // 5. Update Topbar Header Text Context smoothly
  const [title, sub] = sectionTitles[name] || ['Admin', ''];
  const titleEl = document.getElementById('topbarTitle');
  const subEl   = document.getElementById('topbarSub');
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  // 6. Request backend data exclusively for the chosen panel screen
  const loaders = {
    'dashboard':     loadDashboard,
    'pending':       () => loadCarsSection('pending',  'pendingFullTableBody', 'pendingCount'),
    'all-cars':      () => loadCarsSection('active',   'allCarsTableBody',    'allCarsCount'),
    'rejected':      () => loadCarsSection('rejected', 'rejectedTableBody',   'rejectedCount'),
    'users':         loadUsers,
    'buy-requests':  () => loadRequests('buy',  'buyReqTableBody',  'buyReqCount'),
    'rent-requests': () => loadRequests('rent', 'rentReqTableBody', 'rentReqCount')
  };
  if (loaders[name]) loaders[name]();
}

// ── Updated Dashboard Landing
function initNav() {
  // Sidebar link clicks
  document.querySelectorAll('.admin-menu a[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchSection(link.dataset.section);
    });
  });

  // Logout — clears ALL possible key names
  document.getElementById('logoutBtn')?.addEventListener('click', e => {
    e.preventDefault();
    ['token','rxToken','user','rxUser','rxEmail','role'].forEach(k =>
      localStorage.removeItem(k)
    );
    window.location.href = '/login.html';
  });

  // Search — filters visible rows live
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
    const data = await apiFetch('/cars?status=pending&limit=5');
    tbody.innerHTML = '';
    
    // Safely parse out the car array envelope
    const cars = Array.isArray(data) ? data : data.cars || [];
    
    if (!cars.length) { tbody.innerHTML = emptyRow('No pending listings — all clear ✓'); return; }
    cars.forEach(car => tbody.appendChild(buildCarRow(car, true)));
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

async function loadSidePreviews() {
  try {
    const [usersData, rejData] = await Promise.all([
      apiFetch('/users?limit=5'),
      apiFetch('/cars?status=rejected&limit=5')
    ]);

    // Safely extract fallback arrays from potential API wrapper formats
    const users = Array.isArray(usersData) ? usersData : usersData.users || [];
    const rejectedCars = Array.isArray(rejData) ? rejData : rejData.cars || [];

    const ul = document.getElementById('recentUsersList');
    if (ul) ul.innerHTML = users.length
      ? users.map(u =>
          `<li><strong>${u.name}</strong> <span style="opacity:.5;font-size:.8rem">${u.email}</span></li>`
        ).join('')
      : '<li style="opacity:.5">No users yet.</li>';

    const rl = document.getElementById('rejectedPreviewList');
    if (rl) rl.innerHTML = rejectedCars.length
      ? rejectedCars.map(c =>
          `<li>${c.brand} ${c.model} ${c.year} — <span style="opacity:.5">${c.user?.name || '—'}</span></li>`
        ).join('')
      : '<li style="opacity:.5">No rejected cars.</li>';
  } catch (err) { console.error('Side previews error:', err); }
}

// ── Cars Sections ─────────────────────────────────────────────
async function loadCarsSection(status, tbodyId, countId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data = await apiFetch(`/cars?status=${status}&limit=100`);
    
    // Unpack data whether returned as { cars: [], total: X } or a direct array
    const cars = Array.isArray(data) ? data : data.cars || [];
    const totalCount = data.total !== undefined ? data.total : cars.length;

    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = `${totalCount} car${totalCount !== 1 ? 's' : ''}`;
    
    tbody.innerHTML = '';
    if (!cars.length) { tbody.innerHTML = emptyRow('No cars found.'); return; }
    cars.forEach(car => tbody.appendChild(buildCarRow(car, false)));
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
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data = await apiFetch('/users?limit=100');
    
    const users = Array.isArray(data) ? data : data.users || [];
    const totalCount = data.total !== undefined ? data.total : users.length;

    const countEl = document.getElementById('usersCount');
    if (countEl) countEl.textContent = `${totalCount} user${totalCount !== 1 ? 's' : ''}`;
    
    tbody.innerHTML = '';
    if (!users.length) { tbody.innerHTML = emptyRow('No users found.'); return; }
    users.forEach(u => tbody.appendChild(buildUserRow(u)));
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
async function loadRequests(type, tbodyId, countId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = loadingRow();
  try {
    const data = await apiFetch(`/requests?type=${type}&limit=100`);
    
    // Safely read payload items whether raw list array or nested wrapper envelope
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
  } catch (err) { tbody.innerHTML = errorRow(err.message); }
}

// ── Single event dispatcher for ALL buttons ───────────────────
document.addEventListener('click', async function (e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  const orig   = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  try {
    // Car approve / reject
    if (action === 'active' || action === 'rejected') {
      await apiFetch(`/cars/${id}/status`, { method:'PUT', body: JSON.stringify({ status: action }) });
      showToast(action === 'active' ? 'Car approved ✓' : 'Car rejected', action === 'active' ? 'success' : 'error');
      removeRow(id);
      loadStats();
    }

    // Delete car
    else if (action === 'delete-car') {
      if (!confirm('Delete this listing permanently?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/cars/${id}`, { method:'DELETE' });
      showToast('Listing deleted');
      removeRow(id);
      loadStats();
    }

    // Make admin
    else if (action === 'make-admin') {
      if (!confirm('Promote this user to admin?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}/role`, { method:'PUT', body: JSON.stringify({ role:'admin' }) });
      showToast('User promoted ✓');
      loadUsers();
    }

    // Revoke admin
    else if (action === 'revoke-admin') {
      if (!confirm("Revoke admin role?")) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}/role`, { method:'PUT', body: JSON.stringify({ role:'user' }) });
      showToast('Admin role revoked');
      loadUsers();
    }

    // Delete user
    else if (action === 'delete-user') {
      if (!confirm('Delete user and ALL their listings? Cannot be undone.')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/users/${id}`, { method:'DELETE' });
      showToast('User deleted');
      removeRow(id);
      loadStats();
    }

     // Delete request
    else if (action === 'req-delete') {
      if (!confirm('Delete this request permanently?')) { btn.disabled = false; btn.textContent = orig; return; }
      await apiFetch(`/requests/${id}`, { method:'DELETE' });
      showToast('Request deleted');
      removeRow(id);
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
  switchSection('dashboard'); // Ensures initial state tracking triggers smoothly
});