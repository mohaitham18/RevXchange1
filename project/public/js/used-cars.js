const usedCarsGrid = document.getElementById('usedCarsGrid');
const resultsCount = document.getElementById('resultsCount');

const brandFilter = document.getElementById('brandFilter');
const cityFilter = document.getElementById('cityFilter');
const transmissionFilter = document.getElementById('transmissionFilter');
const maxPriceFilter = document.getElementById('maxPriceFilter');
const fabrikaFilter = document.getElementById('fabrikaFilter');
const sortSelect = document.getElementById('sortSelect');

const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

let allCars = [];
let savedCarIds = new Set();

function getToken() {
  return localStorage.getItem('rxToken');
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString() + ' EGP';
}

function formatMileage(mileage) {
  return Number(mileage || 0).toLocaleString() + ' km';
}

function niceText(value) {
  if (!value) return '';
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return { message: 'Server returned invalid response' };
  }
}

async function loadSavedCarIds() {
  const token = getToken();

  if (!token) {
    savedCarIds = new Set();
    return;
  }

  try {
    const res = await fetch('/api/auth/saved-car-ids', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await safeJson(res);

    if (!res.ok) {
      savedCarIds = new Set();
      return;
    }

    savedCarIds = new Set((data.savedCarIds || []).map(String));
  } catch (err) {
    console.error('Load saved ids error:', err);
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
      headers: { Authorization: `Bearer ${token}` }
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
  } catch (err) {
    console.error('Toggle save error:', err);
    alert('Server error. Please try again.');
  } finally {
    btn.disabled = false;
  }
}

function renderCarCard(car) {
  const imgSrc =
    car.images?.[0] ||
    (typeof brandImages !== 'undefined' ? brandImages?.[car.brand] : '');

  const carId = String(car._id || car.id);
  const isSaved = savedCarIds.has(carId);
  const phone = String(car.phone || '').replace(/\D/g, '');
  const whatsappHref = phone ? `https://wa.me/${phone}` : '#';
  const callHref = phone ? `tel:+${phone}` : '#';

  return `
    <div class="car-card-placeholder" data-id="${carId}">
      <button type="button" class="save-car-btn ${isSaved ? 'saved' : ''}" data-id="${carId}">
        ${isSaved ? '♥ Saved' : '♡ Save'}
      </button>

      <div class="car-card-img">
        ${
          imgSrc
            ? `<img src="${imgSrc}" alt="${car.brand}" class="car-card-brand-img">`
            : `<span class="car-card-fallback">🚗</span>`
        }
      </div>

      <div class="car-card-info">
        <h4>${car.brand} ${car.model} ${car.year}</h4>

        <div class="car-price">${formatPrice(car.price)}</div>

        <div class="car-meta">
          <span>📍 ${car.city}</span>
          <span>🛣️ ${formatMileage(car.mileage)}</span>
        </div>

        <div class="car-tags">
          <span class="car-tag">${niceText(car.transmission)}</span>
          <span class="car-tag">${niceText(car.fuel)}</span>
        </div>

        <div class="car-card-actions">
          <a href="${whatsappHref}" target="_blank" class="car-action-btn car-action-whatsapp">WhatsApp</a>
          <a href="${callHref}" class="car-action-btn car-action-call">Call</a>
        </div>
      </div>
    </div>
  `;
}

function populateFilters() {
  const brands = [...new Set(allCars.map(car => car.brand).filter(Boolean))];
  const cities = [...new Set(allCars.map(car => car.city).filter(Boolean))];

  if (brandFilter) {
    brandFilter.innerHTML = '<option value="">All Brands</option>';
    brands.forEach(brand => {
      brandFilter.innerHTML += `<option value="${brand}">${brand}</option>`;
    });
  }

  if (cityFilter) {
    cityFilter.innerHTML = '<option value="">All Cities</option>';
    cities.forEach(city => {
      cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
    });
  }
}

function getFilteredCars() {
  let cars = [...allCars];
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  if (brandFilter?.value) cars = cars.filter(car => car.brand === brandFilter.value);
  if (cityFilter?.value) cars = cars.filter(car => car.city === cityFilter.value);
  if (transmissionFilter?.value) cars = cars.filter(car => String(car.transmission).toLowerCase() === String(transmissionFilter.value).toLowerCase());
  if (maxPriceFilter?.value) cars = cars.filter(car => Number(car.price) <= Number(maxPriceFilter.value));
  if (fabrikaFilter?.checked) cars = cars.filter(car => car.fabrika === true);

  if (query) {
    cars = cars.filter(car =>
      String(car.brand || '').toLowerCase().includes(query) ||
      String(car.model || '').toLowerCase().includes(query) ||
      String(car.city || '').toLowerCase().includes(query)
    );
  }

  switch (sortSelect?.value) {
    case 'price-low':
      cars.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      break;
    case 'price-high':
      cars.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      break;
    case 'year-new':
      cars.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
      break;
    case 'mileage-low':
      cars.sort((a, b) => Number(a.mileage || 0) - Number(b.mileage || 0));
      break;
  }

  return cars;
}

function renderUsedCars() {
  if (!usedCarsGrid) return;

  const cars = getFilteredCars();

  if (resultsCount) resultsCount.textContent = `${cars.length} Cars Found`;

  if (!cars.length) {
    usedCarsGrid.innerHTML = `
      <div class="no-results">
        <span>🚗</span>
        No cars match your search or filters.
      </div>
    `;
    return;
  }

  usedCarsGrid.innerHTML = cars.map(renderCarCard).join('');
}

async function loadCars() {
  if (!usedCarsGrid) return;

  try {
    usedCarsGrid.innerHTML = `<div class="no-results">Loading cars...</div>`;

    await loadSavedCarIds();

    const res = await fetch('/api/cars');
    const data = await safeJson(res);

    if (!res.ok) {
      usedCarsGrid.innerHTML = `<div class="no-results">${data.message || 'Could not load cars.'}</div>`;
      return;
    }

    allCars = data.cars || [];

    populateFilters();
    renderUsedCars();
  } catch (err) {
    console.error('Load cars error:', err);
    usedCarsGrid.innerHTML = `<div class="no-results">Failed to load cars. Please try again.</div>`;
  }
}

if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', renderUsedCars);
if (sortSelect) sortSelect.addEventListener('change', renderUsedCars);
if (searchBtn) searchBtn.addEventListener('click', renderUsedCars);

if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      renderUsedCars();
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
    renderUsedCars();
  });
}

document.addEventListener('click', (e) => {
  const saveBtn = e.target.closest('.save-car-btn');
  if (!saveBtn) return;

  e.preventDefault();
  e.stopPropagation();

  const carId = saveBtn.dataset.id;
  if (!carId) return;

  toggleSaveCar(carId, saveBtn);
});

loadCars();
