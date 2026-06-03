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
        { name: 'Mercedes', count: '1,304', img: '/images/mercedes.png' },
        { name: 'Kia', count: '882', img: '/images/kia.png' },
        { name: 'Hyundai', count: '882', img: '/images/hyundai.png' },
        { name: 'Chevrolet', count: '581', img: '/images/chevrolet.png' },
        { name: 'BMW', count: '576', img: '/images/bmw.png' },
        { name: 'Nissan', count: '544', img: '/images/nissan.png' },
        { name: 'Peugeot', count: '408', img: '/images/peugeot.png' },
        { name: 'Fiat', count: '433', img: '/images/fiat.png' },
        { name: 'Chery', count: '391', img: '/images/chery.png' },
        { name: 'Skoda', count: '367', img: '/images/skoda.png' },
        { name: 'Toyota', count: '333', img: '/images/toyota.png' },
        { name: 'Volkswagen', count: '333', img: '/images/volkswagen.png' },
        { name: 'MG', count: '323', img: '/images/mg.png' },
        { name: 'Renault', count: '588', img: '/images/renault.png' },
        { name: 'Opel', count: '433', img: '/images/opel.png' },
        { name: 'Honda', count: '298', img: '/images/honda.png' },
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
        { name: 'Under 100K',   count: '920',   label: '< 100K',   min: null,    max: 100000   },
        { name: '100K – 200K',  count: '1,540', label: '100–200K', min: 100000,  max: 200000   },
        { name: '200K – 300K',  count: '1,830', label: '200–300K', min: 200000,  max: 300000   },
        { name: '300K – 400K',  count: '1,100', label: '300–400K', min: 300000,  max: 400000   },
        { name: '400K – 500K',  count: '740',   label: '400–500K', min: 400000,  max: 500000   },
        { name: '500K – 600K',  count: '530',   label: '500–600K', min: 500000,  max: 600000   },
        { name: '600K – 800K',  count: '410',   label: '600–800K', min: 600000,  max: 800000   },
        { name: '800K – 1M',    count: '280',   label: '800K–1M',  min: 800000,  max: 1000000  },
        { name: '1M – 1.2M',    count: '220',   label: '1–1.2M',   min: 1000000, max: 1200000  },
        { name: '1.2M – 1.5M',  count: '175',   label: '1.2–1.5M', min: 1200000, max: 1500000  },
        { name: '1.5M – 2M',    count: '130',   label: '1.5–2M',   min: 1500000, max: 2000000  },
        { name: '2M – 3M',      count: '90',    label: '2–3M',     min: 2000000, max: 3000000  },
        { name: '3M – 5M',      count: '55',    label: '3–5M',     min: 3000000, max: 5000000  },
        { name: '5M – 7M',      count: '30',    label: '5–7M',     min: 5000000, max: 7000000  },
        { name: '7M – 10M',     count: '18',    label: '7–10M',    min: 7000000, max: 10000000 },
        { name: 'Above 10M',    count: '9',     label: '10M+',     min: 10000000, max: null     },
    ],
};

// ─── Price bucket boundary → range name map ──────────────────
const priceBucketMap = {
    0:         'Under 100K',
    100000:    '100K – 200K',
    200000:    '200K – 300K',
    300000:    '300K – 400K',
    400000:    '400K – 500K',
    500000:    '500K – 600K',
    600000:    '600K – 800K',
    800000:    '800K – 1M',
    1000000:   '1M – 1.2M',
    1200000:   '1.2M – 1.5M',
    1500000:   '1.5M – 2M',
    2000000:   '2M – 3M',
    3000000:   '3M – 5M',
    5000000:   '5M – 7M',
    7000000:   '7M – 10M',
    above:     'Above 10M'
};

// ─── Static lookup maps (logo/icon fallbacks) ─────────────────
const brandImgMap  = {};
const cityIconMap  = {};
tabData['Top Brands'].forEach(b => brandImgMap[b.name.toLowerCase()] = b.img);
tabData['Top Cities'].forEach(c => cityIconMap[c.name.toLowerCase()] = c.icon);

// ─── Fetch real counts and rebuild tabData from DB ────────────
async function loadCarStats() {
    try {
        const res  = await fetch('/api/cars/stats');
        const data = await res.json();

        // Brands — only show brands that exist in DB
        if (data.brands?.length) {
            tabData['Top Brands'] = data.brands
                .filter(b => b._id)
                .map(b => ({
                    name:  b._id,
                    count: b.count.toLocaleString(),
                    img:   brandImgMap[b._id.toLowerCase()] || '/images/default-brand.png'
                }));
        }

        // Cities — only show cities that exist in DB
        if (data.cities?.length) {
            tabData['Top Cities'] = data.cities
                .filter(c => c._id)
                .map(c => ({
                    name:  c._id,
                    count: c.count.toLocaleString(),
                    icon:  cityIconMap[c._id.toLowerCase()] || '🏙️'
                }));
        }

        // Models — only show models that exist in DB (top 16)
        if (data.models?.length) {
            tabData['Top Models'] = data.models
                .filter(m => m._id?.model)
                .slice(0, 16)
                .map(m => ({
                    name:  m._id.model,
                    brand: m._id.brand,
                    count: m.count.toLocaleString()
                }));
        }

        // Price ranges — only show ranges with at least 1 car
        if (data.prices?.length) {
            const priceCountMap = {};
            data.prices.forEach(p => {
                const name = priceBucketMap[p._id];
                if (name) priceCountMap[name] = p.count;
            });
            tabData['Price Ranges'] = tabData['Price Ranges']
                .filter(item => priceCountMap[item.name] > 0)
                .map(item => ({ ...item, count: priceCountMap[item.name].toLocaleString() }));
        }

    } catch (err) {
        console.warn('Could not load car stats, using fallback counts.');
    }

    renderGrid('Top Brands');
}

// ─── Render Grid ─────────────────────────────────────────────
function renderGrid(tabName) {
    const items = tabData[tabName] || [];

    grid.innerHTML = items.map(item => {
        if (item.img) {
            // Brand card
            const url = `/used-cars.html?brand=${encodeURIComponent(item.name)}`;
            return `
        <div class="brand-card" style="cursor:pointer" onclick="window.location.href='${url}'">
          <img src="${item.img}" alt="${item.name}">
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else if (item.brand) {
            // Model card
            const url = `/used-cars.html?search=${encodeURIComponent(item.name)}`;
            return `
        <div class="brand-card model-card" style="cursor:pointer" onclick="window.location.href='${url}'">
          <div class="card-model-name">${item.name}</div>
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else if (item.icon) {
            // City card
            const url = `/used-cars.html?city=${encodeURIComponent(item.name)}`;
            return `
        <div class="brand-card city-card" style="cursor:pointer" onclick="window.location.href='${url}'">
          <div class="card-icon">${item.icon}</div>
          <h4>${item.name}</h4>
          <span>(${item.count})</span>
        </div>`;
        } else {
            // Price card
            let url = '/used-cars.html?';
            if (item.min) url += `minPrice=${item.min}&`;
            if (item.max) url += `maxPrice=${item.max}`;
            url = url.replace(/[?&]$/, '');
            return `
        <div class="brand-card price-card" style="cursor:pointer" onclick="window.location.href='${url}'">
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
          <span class="car-tag">${car.transmission ? car.transmission.charAt(0).toUpperCase() + car.transmission.slice(1) : ''}</span>
          <span class="car-tag">${car.fuel ? car.fuel.charAt(0).toUpperCase() + car.fuel.slice(1) : ''}</span>
          ${car.color ? `<span class="car-tag">🎨 ${car.color.charAt(0).toUpperCase() + car.color.slice(1)}</span>` : ''}
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
async function renderDiscover() {
    const el = document.getElementById('discoverSection');
    if (!el) return;

    // Fetch popular searches and most viewed cars in parallel
    let searchChips = '';
    let carsToShow  = [];

    try {
        const [searchRes, carsRes] = await Promise.all([
            fetch('/api/search/popular?limit=10'),
            fetch('/api/cars?limit=6&sort=most-viewed')
        ]);

        const searchData = await searchRes.json();
        const carsData   = await carsRes.json();

        if (searchData.searches?.length) {
            searchChips = searchData.searches
                .map(s => renderChip(s.term.charAt(0).toUpperCase() + s.term.slice(1)))
                .join('');
        }

        if (carsData.cars?.length) {
            carsToShow = carsData.cars.map(c => ({ ...c, id: c._id }));
        }
    } catch (err) {
        console.warn('Could not fetch discover data, using fallback.');
    }

    // Fallbacks
    if (!searchChips) {
        searchChips = popularSearches.map(renderChip).join('');
    }
    if (!carsToShow.length) {
        carsToShow = (typeof mostViewedCars !== 'undefined') ? mostViewedCars.slice(0, 6) : [];
    }

    el.innerHTML = `
      <div class="discover-grid">
        <div class="discover-panel">
          <h3 class="discover-panel-title">Popular Searches</h3>
          <div class="search-chips">${searchChips}</div>
        </div>
        <div class="discover-panel">
          <h3 class="discover-panel-title">Most Viewed Cars</h3>
          <div class="car-cards-grid">
            ${carsToShow.length
              ? carsToShow.map(renderCarCard).join('')
              : `<p style="color:var(--text-light);font-size:0.9rem;">No cars listed yet. <a href="/sell-car.html" style="color:var(--primary)">Be the first!</a></p>`}
          </div>
        </div>
      </div>`;
}

// ── Communities Preview (live) ────────────────────────────────

function hcFormatTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 7)  return d + 'd ago';
    return new Date(dateStr).toLocaleDateString();
}

function hcFormatNum(n) {
    if (!n && n !== 0) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0','') + 'K';
    return n.toString();
}

function hcFormatMembers(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0','') + 'K';
    return n.toString();
}

function hcGetToken() {
    return localStorage.getItem('rxToken') || null;
}

async function renderCommunityPreview() {
    const el = document.getElementById('communityPreview');
    if (!el) return;

    // Skeleton while loading
    el.innerHTML = `
        <div class="hc-layout">
            <div class="hc-posts-col">
                <div class="hc-skel"></div>
                <div class="hc-skel"></div>
                <div class="hc-skel"></div>
            </div>
            <div class="hc-comms-col" style="min-height:200px;"></div>
        </div>`;

    try {
        const token = hcGetToken();
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

        // Fetch posts and communities in parallel
        const [postsRes, commsRes] = await Promise.all([
            fetch('/api/feed?sort=hot&page=1', { headers }),
            fetch('/api/communities', { headers })
        ]);

        const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };
        const commsData = commsRes.ok ? await commsRes.json() : { communities: [] };

        const posts       = (postsData.posts || []).slice(0, 3);
        const communities = (commsData.communities || [])
            .filter(c => !c.isCentral)
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 4);

        // ── Left: posts ──
        const postsHtml = posts.length === 0
            ? `<div style="background:#fff;border-radius:14px;padding:40px;text-align:center;color:var(--text-light);font-family:'Segoe UI',sans-serif;">No posts yet. Be the first!</div>`
            : posts.map(post => {
                const community  = post.community;
                const author     = post.author;
                const commName   = community
                    ? (community.isCentral ? 'RevXChange Central' : (community.brand?.name || '') + ' ' + community.name)
                    : '';
                const commLogo   = community?.brand?.logoUrl || '';
                const authorName = author?.name || 'Anonymous';
                const initial    = authorName.charAt(0).toUpperCase();
                return `
                    <a href="/feed.html" class="hc-post-card">
                        <div class="hc-post-comm-tag">
                            <img class="hc-post-comm-logo"
                                 src="${commLogo}" alt="${commName}"
                                 onerror="this.style.opacity='0'">
                            <span class="hc-post-comm-name">${commName}</span>
                        </div>
                        <div class="hc-post-title">${post.title || ''}</div>
                        <div class="hc-post-footer">
                            <div class="hc-post-author">
                                <div class="hc-post-avatar">${initial}</div>
                                <div>
                                    <div class="hc-post-author-name">${authorName}</div>
                                    <div class="hc-post-time">${hcFormatTime(post.createdAt)}</div>
                                </div>
                            </div>
                            <div class="hc-post-stats">
                                <span>▲ ${hcFormatNum(post.upvotes)}</span>
                                <span>💬 ${hcFormatNum(post.commentCount)}</span>
                            </div>
                        </div>
                    </a>`;
            }).join('');

        // ── Right: communities ──
        const commsHtml = communities.map(c => {
            const name     = (c.brandId?.name || '') + ' ' + c.name;
            const logo     = c.brandId?.logoUrl || '';
            const glow     = c.brandId?.glowColor || '#ccc';
            const members  = hcFormatMembers(c.memberCount);
            const isJoined = c.joined;
            return `
                <div class="hc-comm-row">
                    <div class="hc-comm-logo-wrap">
                        <img class="hc-comm-logo"
                             src="${logo}" alt="${name}"
                             onerror="this.style.opacity='0'">
                        <span class="hc-comm-glow-dot"
                              style="background:${glow};"></span>
                    </div>
                    <div class="hc-comm-info">
                        <div class="hc-comm-name">${name}</div>
                        <div class="hc-comm-members">${members} members</div>
                    </div>
                    <button class="hc-comm-join-btn ${isJoined ? 'joined' : ''}"
                            data-id="${c._id}"
                            data-joined="${isJoined ? '1' : '0'}">
                        ${isJoined ? '✓ Joined' : 'Join'}
                    </button>
                </div>`;
        }).join('');

        el.innerHTML = `
            <div class="hc-layout">
                <div class="hc-posts-col">${postsHtml}</div>
                <div class="hc-comms-col">
                    <div class="hc-comms-header">Popular Communities</div>
                    ${commsHtml}
                    <div class="hc-comms-footer">
                        <a href="/communities.html" class="hc-comms-explore-btn">
                            + Explore All Communities
                        </a>
                    </div>
                </div>
            </div>`;

        // ── Wire join buttons ──
        el.querySelectorAll('.hc-comm-join-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (btn.dataset.joined === '1') return;

                const token = hcGetToken();
                if (!token) {
                    window.location.href = '/login.html?returnTo=%2F';
                    return;
                }

                const commId = btn.dataset.id;
                btn.disabled = true;
                btn.textContent = '...';

                try {
                    const res = await fetch(`/api/communities/${commId}/join`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        }
                    });

                    if (res.ok) {
                        btn.textContent = '✓ Joined';
                        btn.classList.add('joined');
                        btn.dataset.joined = '1';

                        // Update member count display
                        const row = btn.closest('.hc-comm-row');
                        const membersEl = row?.querySelector('.hc-comm-members');
                        if (membersEl) {
                            const current = parseInt(membersEl.textContent) || 0;
                            membersEl.textContent = hcFormatMembers(current + 1) + ' members';
                        }
                    } else if (res.status === 409) {
                        // Already a member
                        btn.textContent = '✓ Joined';
                        btn.classList.add('joined');
                        btn.dataset.joined = '1';
                    } else {
                        btn.textContent = 'Join';
                        btn.disabled = false;
                    }
                } catch (e) {
                    console.error('Join error:', e);
                    btn.textContent = 'Join';
                    btn.disabled = false;
                }
            });
        });

    } catch (e) {
        console.error('Community preview failed:', e);
        el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light);font-family:\'Segoe UI\',sans-serif;">Failed to load communities.</div>';
    }
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
loadCarStats();
renderDiscover();
renderCommunityPreview();  // async — fires and forgets intentionally
