const usedCarsGrid   = document.getElementById('usedCarsGrid');
const resultsCount   = document.getElementById('resultsCount');
const brandFilter    = document.getElementById('brandFilter');
const cityFilter     = document.getElementById('cityFilter');
const transmissionFilter = document.getElementById('transmissionFilter');
const maxPriceFilter = document.getElementById('maxPriceFilter');
const fabrikaFilter  = document.getElementById('fabrikaFilter');
const sortSelect     = document.getElementById('sortSelect');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const searchInput    = document.getElementById('searchInput');
const searchBtn      = document.getElementById('searchBtn');

let currentPage = 1;
let totalPages = 1;
let savedCarIds = new Set();

function getToken() {
  return localStorage.getItem('rxToken');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString() + ' EGP';
}

function formatMileage(value) {
  return Number(value || 0).toLocaleString() + ' km';
}

function niceText(value) {
  if (!value) return '';
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {
      message: 'Server returned invalid response'
    };
  }
}

function getPhone(car) {
  return String(car.phone || '').replace(/\D/g, '');
}

function buildWhatsAppHref(car) {
  const phone = getPhone(car);

  if (!phone) return '#';

  const title = `${car.brand} ${car.model} ${car.year}`;
  const msg = `Hello, I saw your ${title} for rent on RevXchange. Is it available?`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function buildRentRequestHref(car) {
  const phone = getPhone(car);

  if (!phone) return '#';

  const title = `${car.brand} ${car.model} ${car.year}`;
  const msg = `Hello, I saw your ${title} for rent on RevXchange. I want to request rental details and availability.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

// ── Saved cars ────────────────────────────────────────────────
async function loadSavedCarIds() {
  const token = getToken();

  if (!token) {
    savedCarIds = new Set();
    return;
  }

  try {
    const res = await fetch('/api/auth/saved-car-ids', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await safeJson(res);

    savedCarIds = new Set((data.savedCarIds || []).map(String));
  } catch {
    savedCarIds = new Set();
  }
}

function updateAllSaveButtons(carId, saved) {
  document.querySelectorAll(`[data-id="${CSS.escape(String(carId))}"]`).forEach(el => {
    if (el.classList.contains('save-car-btn') || el.classList.contains('rx-save-btn')) {
      el.classList.toggle('saved', saved);
      el.textContent = saved ? '♥ Saved' : '♡ Save';
    }
  });
}

async function toggleSaveCar(carId, btn) {
  const token = getToken();

  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  try {
    btn.disabled = true;

    const res = await fetch('/api/auth/save-car/' + encodeURIComponent(carId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await safeJson(res);

    if (!res.ok) {
      alert(data.message || 'Could not save this car');
      return;
    }

    if (data.saved) {
      savedCarIds.add(String(carId));
      updateAllSaveButtons(carId, true);
    } else {
      savedCarIds.delete(String(carId));
      updateAllSaveButtons(carId, false);
    }
  } catch {
    alert('Server error. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

// ── Query params ──────────────────────────────────────────────
function buildParams(page = 1) {
  const params = new URLSearchParams();

  const search = searchInput?.value.trim();

  if (search) {
    params.set('search', search);
  }

  if (brandFilter?.value) {
    params.set('brand', brandFilter.value);
  }

  if (cityFilter?.value) {
    params.set('city', cityFilter.value);
  }

  if (transmissionFilter?.value) {
    params.set('transmission', transmissionFilter.value);
  }

  if (maxPriceFilter?.value) {
    params.set('maxPrice', maxPriceFilter.value);
  }

  if (fabrikaFilter?.checked) {
    params.set('fabrika', 'true');
  }

  if (sortSelect?.value && sortSelect.value !== 'default') {
    params.set('sort', sortSelect.value);
  }

  // Important: Rent Cars page should show rent cars only
  params.set('listingType', 'rent');

  params.set('page', page);
  params.set('limit', 12);

  return params.toString();
}

// ── Render rent card ──────────────────────────────────────────
function renderRentCarCard(car) {
  const imgSrc = car.images?.[0] || (typeof brandImages !== 'undefined' ? brandImages?.[car.brand] : '');
  const carId = String(car._id || car.id);
  const isSaved = savedCarIds.has(carId);

  const phone = getPhone(car);
  const callHref = phone ? `tel:+${phone}` : '#';

  const dailyRent = car.rentPricePerDay || car.price || 0;
  const monthlyRent = car.rentPricePerMonth || null;
  const deposit = car.rentDeposit || null;

  const carTitle = `${car.brand || ''} ${car.model || ''} ${car.year || ''}`.trim();
  const safeTitle = carTitle.replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `
    <div class="car-card-placeholder rent-car-card" data-id="${carId}">
      <button type="button" class="save-car-btn ${isSaved ? 'saved' : ''}" data-id="${carId}">
        ${isSaved ? '♥ Saved' : '♡ Save'}
      </button>

      <div class="car-card-img carousel-wrapper">
        ${
          imgSrc
            ? `<div class="carousel-slide active"><img src="${imgSrc}" alt="${car.brand}" class="car-card-brand-img"></div>`
            : `<span class="car-card-fallback">🚗</span>`
        }

        <span class="rent-card-badge">For Rent</span>
      </div>

      <div class="car-card-info">
        <h4>${car.brand} ${car.model} ${car.year}</h4>

        <div class="car-price rent-price">
          ${formatMoney(dailyRent)} <span>/ day</span>
        </div>

        ${
          monthlyRent
            ? `<div class="rent-sub-price">Monthly: ${formatMoney(monthlyRent)}</div>`
            : ''
        }

        ${
          deposit
            ? `<div class="rent-sub-price">Deposit: ${formatMoney(deposit)}</div>`
            : ''
        }

        <div class="car-meta">
          <span>📍 ${car.city || '—'}</span>
          <span>🛣️ ${formatMileage(car.mileage)}</span>
        </div>

        <div class="car-tags">
          <span class="car-tag">${niceText(car.transmission)}</span>
          <span class="car-tag">${niceText(car.fuel)}</span>
          ${car.color ? `<span class="car-tag">🎨 ${niceText(car.color)}</span>` : ''}
          ${car.fabrika ? `<span class="car-tag car-tag-fabrika">Fabrika</span>` : ''}
        </div>

        <div class="car-card-actions">
          <a href="${buildWhatsAppHref(car)}" target="_blank" class="car-action-btn car-action-whatsapp" onclick="event.stopPropagation()">
            WhatsApp
          </a>

          <a href="${callHref}" class="car-action-btn car-action-call" onclick="event.stopPropagation()">
            Call
          </a>

          <button
            type="button"
            class="car-action-btn car-action-rent-request"
            onclick="event.stopPropagation(); openRequestModal('${carId}', 'rent', '${safeTitle}', '${dailyRent || 0}')">
            Rent
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Pagination ────────────────────────────────────────────────
function renderPagination() {
  let pag = document.getElementById('paginationBar');

  if (!pag) {
    pag = document.createElement('div');
    pag.id = 'paginationBar';
    pag.className = 'rx-pagination';
    usedCarsGrid?.parentNode?.insertBefore(pag, usedCarsGrid.nextSibling);
  }

  if (totalPages <= 1) {
    pag.innerHTML = '';
    return;
  }

  let html = '';

  html += `<button class="rx-page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      html += `<button class="rx-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="rx-page-ellipsis">…</span>`;
    }
  }

  html += `<button class="rx-page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;

  pag.innerHTML = html;

  pag.querySelectorAll('.rx-page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      loadRentCars(parseInt(btn.dataset.page, 10));

      usedCarsGrid?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });
}

// ── Load filters ──────────────────────────────────────────────
async function loadBrands() {
  try {
    const res = await fetch('/api/cars/filters');
    const data = await safeJson(res);

    if (brandFilter && data.brands?.length) {
      brandFilter.innerHTML = '<option value="">All Brands</option>';

      data.brands.forEach(brand => {
        brandFilter.innerHTML += `<option value="${brand}">${brand}</option>`;
      });
    }

    if (cityFilter && data.cities?.length) {
      cityFilter.innerHTML = '<option value="">All Cities</option>';

      data.cities.forEach(city => {
        cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
      });
    }
  } catch {
    // keep defaults
  }
}

// ── Search clear button ───────────────────────────────────────
function updateSearchClearBtn(show) {
  let btn = document.getElementById('ucClearSearchBtn');

  if (show) {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'ucClearSearchBtn';
      btn.className = 'uc-clear-btn';
      btn.textContent = '✕ Clear';

      btn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
        }

        btn.remove();
        loadRentCars(1);
      });

      searchBtn?.insertAdjacentElement('afterend', btn);
    }
  } else {
    btn?.remove();
  }
}

// ── Load rent cars ────────────────────────────────────────────
async function loadRentCars(page = 1) {
  if (!usedCarsGrid) return;

  currentPage = page;

  const searchTerm = searchInput?.value.trim();

  if (searchTerm) {
    updateSearchClearBtn(true);
  } else {
    updateSearchClearBtn(false);
  }

  try {
    usedCarsGrid.innerHTML = `<div class="no-results">Loading rent cars...</div>`;

    await loadSavedCarIds();

    const res = await fetch('/api/cars?' + buildParams(page));
    const data = await safeJson(res);

    if (!res.ok) {
      usedCarsGrid.innerHTML = `<div class="no-results">${data.message || 'Could not load rent cars.'}</div>`;
      return;
    }

    const cars = data.cars || [];
    totalPages = data.pages || 1;

    if (resultsCount) {
      resultsCount.textContent = `${data.total || 0} Rent Cars Found`;
    }

    if (!cars.length) {
      usedCarsGrid.innerHTML = `
        <div class="no-results">
          <span>🚘</span>
          No rent cars found yet.
        </div>
      `;

      renderPagination();
      return;
    }

    usedCarsGrid.innerHTML = cars.map(renderRentCarCard).join('');
    renderPagination();
  } catch (err) {
    console.error('Load rent cars error:', err);
    usedCarsGrid.innerHTML = `<div class="no-results">Failed to load rent cars. Please try again.</div>`;
  }
}

// ── Events ────────────────────────────────────────────────────
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener('click', () => loadRentCars(1));
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => loadRentCars(1));
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => loadRentCars(1));
}

if (searchInput) {
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadRentCars(1);
    }
  });
}

if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener('click', () => {
    if (brandFilter) brandFilter.value = '';
    if (cityFilter) cityFilter.value = '';
    if (transmissionFilter) transmissionFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    if (fabrikaFilter) fabrikaFilter.checked = false;
    if (sortSelect) sortSelect.value = 'default';
    if (searchInput) searchInput.value = '';

    loadRentCars(1);
  });
}

document.addEventListener('click', e => {
  const saveBtn = e.target.closest('.save-car-btn');

  if (!saveBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const carId = saveBtn.dataset.id;

  if (carId) {
    toggleSaveCar(carId, saveBtn);
  }
});

// ── Init ──────────────────────────────────────────────────────
loadBrands().then(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('brand') && brandFilter) {
    brandFilter.value = params.get('brand');
  }

  if (params.get('city') && cityFilter) {
    cityFilter.value = params.get('city');
  }

  if (params.get('search') && searchInput) {
    searchInput.value = params.get('search');
  }

  if (params.get('maxPrice') && maxPriceFilter) {
    maxPriceFilter.value = params.get('maxPrice');
  }

  loadRentCars(1);
});