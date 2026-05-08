// ─── Data ─────────────────────────────────────────────────────
const newCarsData = [
  {
    id: 1, brand: 'Chery', model: 'Arrizo 5', year: 2026,
    image: '../assets/images/chery.png', warranty: '100,000 Km / 5 Years',
    officialPrice: { min: 655000, max: 735000 },
    marketPrice:   { min: 655000, max: 770000 },
    classes: [
      { name: 'Arrizo 5 2026 Manual / Base Line / Leather', cc: 1500, officialPrice: 655000, marketPrice: { min: 655000, max: 655000 } },
      { name: 'Arrizo 5 2026 AT / BASELINE Leather',        cc: 1500, officialPrice: 705000, marketPrice: { min: 705000, max: 725000 } },
      { name: 'Arrizo 5 2026 AT / HIGHLINE',                cc: 1500, officialPrice: 735000, marketPrice: { min: 755000, max: 770000 } },
    ],
  },
  {
    id: 2, brand: 'Nissan', model: 'Sunny', year: 2026,
    image: '../assets/images/nissan.png', warranty: '100,000 Km / 3 Years',
    officialPrice: { min: 645000, max: 810000 },
    marketPrice:   { min: 645000, max: 825000 },
    classes: [
      { name: 'Sunny 2026 1.5L S MT',   cc: 1500, officialPrice: 645000, marketPrice: { min: 645000, max: 660000 } },
      { name: 'Sunny 2026 1.5L SV AT',  cc: 1500, officialPrice: 730000, marketPrice: { min: 730000, max: 750000 } },
      { name: 'Sunny 2026 1.5L SL AT',  cc: 1500, officialPrice: 810000, marketPrice: { min: 810000, max: 825000 } },
      { name: 'Sunny 2026 1.6L SL+ AT', cc: 1600, officialPrice: 810000, marketPrice: { min: 815000, max: 825000 } },
    ],
  },
  {
    id: 3, brand: 'Toyota', model: 'Corolla', year: 2026,
    image: '../assets/images/toyota.png', warranty: '100,000 Km / 3 Years',
    officialPrice: { min: 1280000, max: 1630000 },
    marketPrice:   { min: 1280000, max: 1650000 },
    classes: [
      { name: 'Corolla 2026 1.6L SE MT',     cc: 1600, officialPrice: 1280000, marketPrice: { min: 1280000, max: 1300000 } },
      { name: 'Corolla 2026 1.6L SE AT',     cc: 1600, officialPrice: 1360000, marketPrice: { min: 1360000, max: 1380000 } },
      { name: 'Corolla 2026 1.8L XLI AT',    cc: 1800, officialPrice: 1480000, marketPrice: { min: 1480000, max: 1500000 } },
      { name: 'Corolla 2026 2.0L Grande AT', cc: 2000, officialPrice: 1630000, marketPrice: { min: 1630000, max: 1650000 } },
      { name: 'Corolla 2026 1.8L Hybrid',    cc: 1800, officialPrice: 1580000, marketPrice: { min: 1580000, max: 1600000 } },
    ],
  },
  {
    id: 4, brand: 'Chevrolet', model: 'Optra', year: 2027,
    image: '../assets/images/chevrolet.png', warranty: '100,000 Km / 3 Years',
    officialPrice: { min: 745000, max: 770000 },
    marketPrice:   { min: 745000, max: 780000 },
    classes: [
      { name: 'Optra 2027 1.5T LS MT', cc: 1500, officialPrice: 745000, marketPrice: { min: 745000, max: 760000 } },
      { name: 'Optra 2027 1.5T LT AT', cc: 1500, officialPrice: 770000, marketPrice: { min: 770000, max: 780000 } },
    ],
  },
  {
    id: 5, brand: 'Hyundai', model: 'Elantra', year: 2026,
    image: '../assets/images/hyundai.png', warranty: '100,000 Km / 5 Years',
    officialPrice: { min: 980000, max: 1250000 },
    marketPrice:   { min: 980000, max: 1270000 },
    classes: [
      { name: 'Elantra 2026 1.6L GL MT',  cc: 1600, officialPrice: 980000,  marketPrice: { min: 980000,  max: 1000000 } },
      { name: 'Elantra 2026 1.6L GLS AT', cc: 1600, officialPrice: 1080000, marketPrice: { min: 1080000, max: 1100000 } },
      { name: 'Elantra 2026 2.0L GLS AT', cc: 2000, officialPrice: 1250000, marketPrice: { min: 1250000, max: 1270000 } },
    ],
  },
  {
    id: 6, brand: 'Kia', model: 'Sportage', year: 2026,
    image: '../assets/images/kia.png', warranty: '150,000 Km / 5 Years',
    officialPrice: { min: 1350000, max: 1750000 },
    marketPrice:   { min: 1350000, max: 1780000 },
    classes: [
      { name: 'Sportage 2026 2.0L LX MT',     cc: 2000, officialPrice: 1350000, marketPrice: { min: 1350000, max: 1370000 } },
      { name: 'Sportage 2026 2.0L EX AT',     cc: 2000, officialPrice: 1550000, marketPrice: { min: 1550000, max: 1580000 } },
      { name: 'Sportage 2026 1.6T SX AT 4WD', cc: 1600, officialPrice: 1750000, marketPrice: { min: 1750000, max: 1780000 } },
    ],
  },
  {
    id: 7, brand: 'MG', model: 'RX5', year: 2026,
    image: '../assets/images/mg.png', warranty: '100,000 Km / 5 Years',
    officialPrice: { min: 890000, max: 1050000 },
    marketPrice:   { min: 890000, max: 1070000 },
    classes: [
      { name: 'RX5 2026 1.5T STD AT', cc: 1500, officialPrice: 890000,  marketPrice: { min: 890000,  max: 910000  } },
      { name: 'RX5 2026 2.0T LUX AT', cc: 2000, officialPrice: 1050000, marketPrice: { min: 1050000, max: 1070000 } },
    ],
  },
  {
    id: 8, brand: 'Skoda', model: 'Octavia', year: 2026,
    image: '../assets/images/skoda.png', warranty: '100,000 Km / 2 Years',
    officialPrice: { min: 1100000, max: 1400000 },
    marketPrice:   { min: 1100000, max: 1430000 },
    classes: [
      { name: 'Octavia 2026 1.5 TSI Active AT',   cc: 1500, officialPrice: 1100000, marketPrice: { min: 1100000, max: 1120000 } },
      { name: 'Octavia 2026 1.5 TSI Ambition AT', cc: 1500, officialPrice: 1250000, marketPrice: { min: 1250000, max: 1270000 } },
      { name: 'Octavia 2026 2.0 TSI Style AT',    cc: 2000, officialPrice: 1400000, marketPrice: { min: 1400000, max: 1430000 } },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────
function egp(n) { return n.toLocaleString() + ' EGP'; }
function range(o) { return o.min === o.max ? egp(o.min) : `${o.min.toLocaleString()} - ${o.max.toLocaleString()} EGP`; }

// ─── Brands grid ──────────────────────────────────────────────
function renderBrands(data) {
  const unique = [...new Map(data.map(c => [c.brand, c])).values()];
  document.getElementById('bcBrandsGrid').innerHTML = unique.map(car => `
    <div class="bc-brand-card" onclick="filterByBrand('${car.brand}')">
      <img src="${car.image}" alt="${car.brand}">
      <h4>${car.brand}</h4>
      <span>(${data.filter(c => c.brand === car.brand).length} model${data.filter(c => c.brand === car.brand).length > 1 ? 's' : ''})</span>
    </div>
  `).join('');
}

// ─── Car cards ────────────────────────────────────────────────
function renderCards(data) {
  document.getElementById('bcCount').textContent = `${data.length} car${data.length !== 1 ? 's' : ''} found`;
  document.getElementById('bcGrid').innerHTML = data.length === 0
    ? `<div class="bc-no-results"><span>🔍</span>No cars match your search.</div>`
    : data.map(car => `
      <div class="bc-card" onclick="openModal(${car.id})">
        <div class="bc-card-img"><img src="${car.image}" alt="${car.brand} ${car.model}"></div>
        <div class="bc-card-body">
          <h3 class="bc-card-title">${car.brand} ${car.model} ${car.year}</h3>
          <p class="bc-card-classes">${car.classes.length} Class${car.classes.length !== 1 ? 'es' : ''}</p>
          <p class="bc-card-from">Starting From</p>
          <p class="bc-card-price">${range(car.officialPrice)}</p>
        </div>
      </div>
    `).join('');
}

function filterByBrand(brand) {
  renderCards(newCarsData.filter(c => c.brand === brand));
  document.getElementById('bcGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Search ───────────────────────────────────────────────────
document.getElementById('bcSearchBtn').addEventListener('click', search);
document.getElementById('bcSearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });

function search() {
  const q = document.getElementById('bcSearchInput').value.trim().toLowerCase();
  renderCards(!q ? newCarsData : newCarsData.filter(c =>
    c.brand.toLowerCase().includes(q) || c.model.toLowerCase().includes(q) || String(c.year).includes(q)
  ));
}

// ─── Modal ────────────────────────────────────────────────────
const overlay = document.getElementById('bcOverlay');

function openModal(id) {
  const car = newCarsData.find(c => c.id === id);
  if (!car) return;
  document.getElementById('bcModalImg').src          = car.image;
  document.getElementById('bcModalImg').alt          = `${car.brand} ${car.model}`;
  document.getElementById('bcModalTitle').textContent    = `${car.brand} ${car.model} ${car.year}`;
  document.getElementById('bcModalOfficial').textContent = range(car.officialPrice);
  document.getElementById('bcModalMarket').textContent   = range(car.marketPrice);
  document.getElementById('bcModalWarranty').textContent = car.warranty ? `Warranty  ${car.warranty}` : '';
  document.getElementById('bcTableBody').innerHTML = car.classes.map(cls => `
    <div class="bc-table-row">
      <div class="bc-class-name"><span>${cls.name}</span><small>${cls.cc} CC</small></div>
      <div class="bc-class-price">${egp(cls.officialPrice)}</div>
      <div class="bc-class-price">${range(cls.marketPrice)}</div>
    </div>
  `).join('');
  overlay.classList.remove('bc-hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.add('bc-hidden');
  document.body.style.overflow = '';
}

document.getElementById('bcModalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Init ─────────────────────────────────────────────────────
window.addEventListener('pageshow', () => {
    renderBrands(newCarsData);
    renderCards(newCarsData);
});