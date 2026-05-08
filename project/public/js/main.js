const tabButtons = document.querySelectorAll('.tabs button');
const title = document.getElementById('sectionTitle');
const hero = document.querySelector('.hero-bg');
const grid = document.querySelector('.brands-grid');
const isLoggedIn = false;

const popularSearches = [
    'Toyota Corolla 2022', 'BMW 320i', 'Kia Sportage', 'Mercedes C200',
    'Hyundai Elantra', 'Under 200K', 'Cairo', 'Automatic', 'SUV',
    'Nissan Sunny', 'Chevrolet Cruze', 'Low Mileage', 'First Owner',
];

// mostViewedCars and brandImages are loaded from cars.js (included before this script)

// ─── Tab Data ────────────────────────────────────────────────
const tabData = {
    'Top Brands': [
        { name: 'Mercedes', count: '1,304', img: 'assets/images/mercedes.png' },
        { name: 'Kia', count: '882', img: 'assets/images/kia.png' },
        { name: 'Hyundai', count: '882', img: 'assets/images/hyundai.png' },
        { name: 'Chevrolet', count: '581', img: 'assets/images/chevrolet.png' },
        { name: 'BMW', count: '576', img: 'assets/images/bmw.png' },
        { name: 'Nissan', count: '544', img: 'assets/images/nissan.png' },
        { name: 'Peugeot', count: '408', img: 'assets/images/peugeot.png' },
        { name: 'Fiat', count: '433', img: 'assets/images/fiat.png' },
        { name: 'Chery', count: '391', img: 'assets/images/chery.png' },
        { name: 'Skoda', count: '367', img: 'assets/images/skoda.png' },
        { name: 'Toyota', count: '333', img: 'assets/images/toyota.png' },
        { name: 'Volkswagen', count: '333', img: 'assets/images/volkswagen.png' },
        { name: 'MG', count: '323', img: 'assets/images/mg.png' },
        { name: 'Renault', count: '588', img: 'assets/images/renault.png' },
        { name: 'Opel', count: '433', img: 'assets/images/opel.png' },
        { name: 'Honda', count: '298', img: 'assets/images/honda.png' },
    ],

    'Top Models': [
        { name: 'C-Class', count: '540', brand: 'Mercedes' },
        { name: 'Corolla', count: '480', brand: 'Toyota' },
        { name: 'Elantra', count: '410', brand: 'Hyundai' },
        { name: 'Sportage', count: '380', brand: 'Kia' },
        { name: 'Sunny', count: '310', brand: 'Nissan' },
        { name: 'Cruze', count: '290', brand: 'Chevrolet' },
        { name: '320i', count: '240', brand: 'BMW' },
        { name: 'Passat', count: '190', brand: 'VW' },
        { name: 'Clio', count: '370', brand: 'Renault' },
        { name: 'Tiggo 7', count: '260', brand: 'Chery' },
        { name: 'Octavia', count: '200', brand: 'Skoda' },
        { name: 'Astra', count: '175', brand: 'Opel' },
        { name: 'RX5', count: '310', brand: 'MG' },
        { name: 'Tipo', count: '220', brand: 'Fiat' },
        { name: '208', count: '195', brand: 'Peugeot' },
        { name: 'Civic', count: '165', brand: 'Honda' },
    ],

    'Top Cities': [
        { name: 'Cairo', count: '4,210', icon: '🏙️' },
        { name: 'Alexandria', count: '1,830', icon: '🌊' },
        { name: 'Giza', count: '1,540', icon: '🏛️' },
        { name: 'Mansoura', count: '620', icon: '🏘️' },
        { name: 'Tanta', count: '480', icon: '🏡' },
        { name: 'Suez', count: '340', icon: '⚓' },
        { name: 'Ismailia', count: '290', icon: '🌿' },
        { name: 'Aswan', count: '210', icon: '☀️' },
        { name: 'Luxor', count: '190', icon: '🗿' },
        { name: 'Hurghada', count: '175', icon: '🏖️' },
        { name: 'Port Said', count: '310', icon: '🚢' },
        { name: 'Zagazig', count: '260', icon: '🏗️' },
        { name: 'Fayyum', count: '150', icon: '🌾' },
        { name: 'Minya', count: '130', icon: '🏞️' },
        { name: 'Sohag', count: '110', icon: '🌄' },
        { name: 'Damanhur', count: '95', icon: '🏠' },
    ],

    'Price Ranges': [
        { name: 'Under 100K', count: '920', label: '< 100K' },
        { name: '100K – 200K', count: '1,540', label: '100–200K' },
        { name: '200K – 300K', count: '1,830', label: '200–300K' },
        { name: '300K – 400K', count: '1,100', label: '300–400K' },
        { name: '400K – 500K', count: '740', label: '400–500K' },
        { name: '500K – 600K', count: '530', label: '500–600K' },
        { name: '600K – 800K', count: '410', label: '600–800K' },
        { name: '800K – 1M', count: '280', label: '800K–1M' },
        { name: '1M – 1.2M', count: '220', label: '1–1.2M' },
        { name: '1.2M – 1.5M', count: '175', label: '1.2–1.5M' },
        { name: '1.5M – 2M', count: '130', label: '1.5–2M' },
        { name: '2M – 3M', count: '90', label: '2–3M' },
        { name: '3M – 5M', count: '55', label: '3–5M' },
        { name: '5M – 7M', count: '30', label: '5–7M' },
        { name: '7M – 10M', count: '18', label: '7–10M' },
        { name: 'Above 10M', count: '9', label: '10M+' },
    ],
};

// ─── Render Grid ─────────────────────────────────────────────
function renderGrid(tabName) {
    const items = tabData[tabName] || [];

    grid.innerHTML = items.map(item => {
        if (item.img) {
            // Brand card
            return `
        <div class="brand-card">
          <img src="${item.img}" alt="${item.name}">
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else if (item.brand) {
            // Model card
            return `
        <div class="brand-card model-card">
          <div class="card-model-name">${item.name}</div>
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else if (item.icon) {
            // City card
            return `
        <div class="brand-card city-card">
          <div class="card-icon">${item.icon}</div>
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else {
            // Price card
            return `
        <div class="brand-card price-card">
          <div class="card-price-badge">EGP<br>${item.label}</div>
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        }
    }).join('');
}

function renderChip(label) {
    return `<button class="search-chip">${label}</button>`;
}

// ─── Animated Tab Switch ──────────────────────────────────────
function switchTab(tabName) {
    grid.classList.add('tab-exit');

    setTimeout(() => {
        renderGrid(tabName);
        grid.classList.remove('tab-exit');
        grid.classList.add('tab-enter');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                grid.classList.replace('tab-enter', 'tab-enter-active');
                setTimeout(() => grid.classList.remove('tab-enter-active'), 250);
            });
        });
    }, 150);
}


// ─── Tab Click Handler ────────────────────────────────────────
tabButtons.forEach(tab => {
    tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;
        tabButtons.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        title.textContent = tab.textContent;
        switchTab(tab.textContent.trim());
    });
});

// ─── Nav Indicator ────────────────────────────────────────────
const navIndicator = document.getElementById('navIndicator');
const navLinksList = document.querySelector('.nav-links');
const navLinkAnchors = document.querySelectorAll('.nav-links a');

function moveIndicator(anchor) {
    const listRect = navLinksList.getBoundingClientRect();
    const linkRect = anchor.getBoundingClientRect();
    navIndicator.style.left = (linkRect.left - listRect.left) + 'px';
    navIndicator.style.width = linkRect.width + 'px';
    navIndicator.style.opacity = '1';
}

navLinkAnchors.forEach(anchor => {
    anchor.addEventListener('mouseenter', () => moveIndicator(anchor));
});

navLinksList.addEventListener('mouseleave', () => {
    navIndicator.style.opacity = '0';
});

// ─── Hero Fade ────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    const opacity = Math.max(0, 1 - scroll / 400);
    hero.style.opacity = opacity;
});



/* Discover Section*/
// ─── Helper Formatters ────────────────────────────────────────
function formatPrice(price) {
    return price.toLocaleString() + ' EGP';
}

function formatMileage(mileage) {
    return mileage.toLocaleString() + ' km';
}

// ─── Render: Car Card ─────────────────────────────────────────
function renderCarCard(car) {
    const images  = car.images && car.images.length ? car.images : [''];
    const total   = images.length;
    const hasMany = total > 1;

    const fabrikaTag = car.fabrika
        ? `<span class="car-tag car-tag-fabrika">Fabrika</span>`
        : '';

    // Build the image slides
    const slides = images.map((src, i) => `
        <div class="carousel-slide${i === 0 ? ' active' : ''}" data-index="${i}">
            ${src
                ? `<img src="${src}" alt="${car.brand}" class="car-card-brand-img">`
                : `<span class="car-card-fallback">🚗</span>`}
        </div>`).join('');

    // Arrows — only rendered when more than 1 image
    const arrows = hasMany ? `
        <button class="carousel-arrow carousel-prev" data-id="${car.id}">&#8249;</button>
        <button class="carousel-arrow carousel-next" data-id="${car.id}">&#8250;</button>` : '';

    // Counter — only rendered when more than 1 image
    const counter = hasMany
        ? `<div class="carousel-counter" data-id="${car.id}">1 / ${total}</div>`
        : '';

    return `
    <div class="car-card-placeholder" data-id="${car.id}">
      <div class="car-card-img carousel-wrapper">
        ${slides}
        ${arrows}
        ${counter}
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
          ${fabrikaTag}
        </div>
        <div class="car-card-actions">
          <a href="https://wa.me/${car.phone}" target="_blank" class="car-action-btn car-action-whatsapp">
            <svg viewBox="0 0 24 24" fill="currentColor" class="car-action-icon"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.84L0 24l6.335-1.48A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.371l-.36-.214-3.722.869.936-3.62-.235-.372A9.797 9.797 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/></svg>
            WhatsApp
          </a>
          <a href="tel:+${car.phone}" class="car-action-btn car-action-call">
            <svg viewBox="0 0 24 24" fill="currentColor" class="car-action-icon"><path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1C9.61 22 2 14.39 2 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.01l-2.2 2.21z"/></svg>
            Call
          </a>
        </div>
      </div>
    </div>`;
}

// ─── Carousel Logic (event delegation) ───────────────────────
// One listener on the document handles all cards — no matter how many are rendered.
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.carousel-arrow');
    if (!btn) return;

    e.stopPropagation();

    const carId   = parseInt(btn.dataset.id);
    const card    = document.querySelector(`.car-card-placeholder[data-id="${carId}"]`);
    const slides  = card.querySelectorAll('.carousel-slide');
    const counter = card.querySelector('.carousel-counter');
    const total   = slides.length;

    let current = 0;
    slides.forEach((s, i) => { if (s.classList.contains('active')) current = i; });

    const next = btn.classList.contains('carousel-next')
        ? (current + 1) % total
        : (current - 1 + total) % total;

    slides[current].classList.remove('active');
    slides[next].classList.add('active');

    if (counter) counter.textContent = `${next + 1} / ${total}`;
});



//Render: Discover Section
function renderDiscover() {
    const el = document.getElementById('discoverSection');
    if (!el) return;

    if (!isLoggedIn) {
        el.innerHTML = `
      <div class="discover-grid">

        <div class="discover-panel">
          <h3 class="discover-panel-title">Popular Searches</h3>
          <div class="search-chips">
            ${popularSearches.map(renderChip).join('')}
          </div>
        </div>

        <div class="discover-panel">
          <h3 class="discover-panel-title">Most Viewed Cars</h3>
          <div class="car-cards-grid">
            ${mostViewedCars.slice(0, 6).map(renderCarCard).join('')}
          </div>
        </div>

      </div>`;
    } else {
        el.innerHTML = `
      <div class="discover-grid">

        <div class="discover-panel">
          <h3 class="discover-panel-title">Saved Searches</h3>
          <div class="discover-empty">
            <span>🔍</span>
            No saved searches yet.
          </div>
        </div>

        <div class="discover-panel">
          <h3 class="discover-panel-title">Saved Ads</h3>
          <div class="discover-empty">
            <span>🚗</span>
            No saved ads yet.
          </div>
        </div>

      </div>`;
    }
}

/*Community Preview Data*/
const communityPreviewPosts = [
    {
        community: 'Toyota Corolla',
        img: 'assets/images/toyota.png',
        author: 'Ahmed Hassan',
        time: '2h ago',
        text: 'Anyone know a reliable mechanic in Cairo for a Corolla 2019? AC compressor is making a grinding noise and I need someone I can actually trust.',
        likes: 24, comments: 8,
    },
    {
        community: 'BMW 320i',
        img: 'assets/images/bmw.png',
        author: 'Karim Mostafa',
        time: '5h ago',
        text: 'Just hit 100,000 km on my 2018 320i. Planning a full service — timing chain, spark plugs, or cooling system first? Looking for a specialist in Maadi.',
        likes: 41, comments: 15,
    },
    {
        community: 'Kia Sportage',
        img: 'assets/images/kia.png',
        author: 'Sara Nabil',
        time: '1d ago',
        text: 'Comparing the 2023 Sportage vs MG RX5 for a family car. Which holds better resale value in the Egyptian market long term? Both are similar price right now.',
        likes: 67, comments: 29,
    },
];

/*Render: Community Preview*/
function renderCommunityPreview() {
    const el = document.getElementById('communityPreview');
    if (!el) return;

    el.innerHTML = communityPreviewPosts.map(post => `
        <a href="pages/communities.html" class="community-preview-card">
            <div class="comm-card-label">
                <img src="${post.img}" alt="${post.community}" onerror="this.style.display='none'">
                ${post.community}
            </div>
            <p class="comm-card-text">${post.text}</p>
            <div class="comm-card-footer">
                <div class="comm-card-author">
                    <div class="comm-card-avatar">👤</div>
                    <span>${post.author} · ${post.time}</span>
                </div>
                <div class="comm-card-stats">
                    <span>▲ ${post.likes}</span>
                    <span>💬 ${post.comments}</span>
                </div>
            </div>
        </a>
    `).join('');
}

// FAQ Accordion Logic
document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;
        const answer = faqItem.querySelector('.faq-answer');


        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) {
                item.classList.remove('active');
                item.querySelector('.faq-answer').style.maxHeight = null;
            }
        });


        faqItem.classList.toggle('active');

        if (faqItem.classList.contains('active')) {
            answer.style.maxHeight = answer.scrollHeight + "px";
        } else {
            answer.style.maxHeight = null;
        }
    });
});

// ─── Init ─────────────────────────────────────────────────────
renderGrid('Top Brands');
renderDiscover();
renderCommunityPreview();