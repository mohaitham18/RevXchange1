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

function formatPrice(price) {
  return price.toLocaleString() + ' EGP';
}

function formatMileage(mileage) {
  return mileage.toLocaleString() + ' km';
}

function renderCarCard(car) {
  const imgSrc = car.images?.[0] || (brandImages?.[car.brand] || '');

  return `
    <div class="car-card-placeholder" data-id="${car._id}">
      <div class="car-card-img">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${car.brand}" class="car-card-brand-img">`
          : `<span class="car-card-fallback">🚗</span>`}
      </div>
      <div class="car-card-info">
        <h4>${car.brand} ${car.model} ${car.year}</h4>
        <div class="car-price">${formatPrice(car.price)}</div>
        <div class="car-meta">
          <span>📍 ${car.city}</span>
          <span>🛣️ ${formatMileage(car.mileage)}</span>
        </div>
        <div class="car-tags">
          <span class="car-tag">${car.transmission}</span>
          <span class="car-tag">${car.fuel}</span>
        </div>
        <div class="car-card-actions">
          <button class="car-action-btn car-action-whatsapp">WhatsApp</button>
          <button class="car-action-btn car-action-call">Call</button>
        </div>
      </div>
    </div>
  `;
}

function populateFilters() {
  const brands = [...new Set(allCars.map(car => car.brand))];
  const cities = [...new Set(allCars.map(car => car.city))];

  brandFilter.innerHTML = '<option value="">All Brands</option>';
  cityFilter.innerHTML = '<option value="">All Cities</option>';

  brands.forEach(brand => {
    brandFilter.innerHTML += `<option value="${brand}">${brand}</option>`;
  });

  cities.forEach(city => {
    cityFilter.innerHTML += `<option value="${city}">${city}</option>`;
  });
}

function getFilteredCars() {
  let cars = [...allCars];
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  if (brandFilter.value) cars = cars.filter(car => car.brand === brandFilter.value);
  if (cityFilter.value) cars = cars.filter(car => car.city === cityFilter.value);
  if (transmissionFilter.value) cars = cars.filter(car => car.transmission === transmissionFilter.value);
  if (maxPriceFilter.value) cars = cars.filter(car => car.price <= Number(maxPriceFilter.value));

  if (query) {
    cars = cars.filter(car =>
      car.brand.toLowerCase().includes(query) ||
      car.model.toLowerCase().includes(query) ||
      car.city.toLowerCase().includes(query)
    );
  }

  switch (sortSelect.value) {
    case 'price-low': cars.sort((a, b) => a.price - b.price); break;
    case 'price-high': cars.sort((a, b) => b.price - a.price); break;
    case 'year-new': cars.sort((a, b) => b.year - a.year); break;
    case 'mileage-low': cars.sort((a, b) => a.mileage - b.mileage); break;
  }

  return cars;
}

function renderUsedCars() {
  const cars = getFilteredCars();
  resultsCount.textContent = `${cars.length} Cars Found`;

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
  try {
    usedCarsGrid.innerHTML = `<div class="no-results">Loading cars...</div>`;
    const res = await fetch('/api/cars');
    const data = await res.json();
    allCars = data.cars || [];
    populateFilters();
    renderUsedCars();
  } catch (err) {
    console.error('Load cars error:', err);
    usedCarsGrid.innerHTML = `<div class="no-results">Failed to load cars. Please try again.</div>`;
  }
}

applyFiltersBtn.addEventListener('click', renderUsedCars);
sortSelect.addEventListener('change', renderUsedCars);

if (searchBtn) searchBtn.addEventListener('click', renderUsedCars);
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); renderUsedCars(); }
  });
}

resetFiltersBtn.addEventListener('click', () => {
  brandFilter.value = '';
  cityFilter.value = '';
  transmissionFilter.value = '';
  maxPriceFilter.value = '';
  if (fabrikaFilter) fabrikaFilter.checked = false;
  sortSelect.value = 'default';
  if (searchInput) searchInput.value = '';
  renderUsedCars();
});

loadCars();