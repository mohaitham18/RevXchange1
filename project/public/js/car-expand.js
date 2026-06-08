/* RevXChange — Car Expand Card + Save Button + Cara's AI Take */
(function () {
  if (window.location.pathname.toLowerCase().includes('login')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="rxCarOverlay"></div>
    <div id="rxCarShadow"></div>

    <div id="rxCarCard">
      <button id="rxCarClose" aria-label="Close">✕</button>
      <div id="rxCarContent"></div>
    </div>

    <div id="rxLightboxOverlay"></div>
    <div id="rxLightboxImg"><img src="" alt=""></div>
    <button id="rxLightboxClose" aria-label="Close image">✕</button>
  `);

  const overlay = document.getElementById('rxCarOverlay');
  const shadow = document.getElementById('rxCarShadow');
  const card = document.getElementById('rxCarCard');
  const closeBtn = document.getElementById('rxCarClose');
  const content = document.getElementById('rxCarContent');

  const lbOverlay = document.getElementById('rxLightboxOverlay');
  const lbImg = document.getElementById('rxLightboxImg');
  const lbImgInner = lbImg.querySelector('img');
  const lbClose = document.getElementById('rxLightboxClose');

  let isOpen = false;
  let isFullscreen = false;
  let currentOrigin = null;
  let currentOriginEl = null;
  let galleryIndex = 0;
  let savedIds = new Set();
  let caraTakeRequestId = 0;

  const formatPrice = value => `${Number(value || 0).toLocaleString()} EGP`;
  const formatKm = value => `${Number(value || 0).toLocaleString()} km`;

  function escapeHTML(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(String(value));
    return String(value).replace(/"/g, '\\"');
  }

  function token() {
    return localStorage.getItem('rxToken');
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return { message: 'Invalid server response' };
    }
  }

  function displayPrice(car) {
    if (car.listingType === 'rent') {
      return `${Number(car.rentPricePerDay || car.price || 0).toLocaleString()} EGP / day`;
    }

    return formatPrice(car.price);
  }

  function niceText(value) {
    if (!value) return 'Not specified';

    const text = String(value);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function hasRealValue(value) {
    if (value === null || value === undefined) return false;
    const text = String(value).trim().toLowerCase();
    return text !== '' && text !== 'not specified' && text !== 'undefined' && text !== 'null' && text !== '—';
  }

  function cleanList(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map(item => String(item || '').trim())
      .filter(Boolean);
  }

  function normalizeHistoryDocuments(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((doc, index) => {
        if (typeof doc === 'string') {
          return {
            url: doc,
            originalName: `History document ${index + 1}`,
            mimeType: ''
          };
        }

        return {
          url: doc?.url || doc?.path || doc?.secure_url || '',
          originalName: doc?.originalName || doc?.filename || `History document ${index + 1}`,
          mimeType: doc?.mimeType || doc?.mimetype || ''
        };
      })
      .filter(doc => doc.url);
  }

  function rentPriceBlock(car) {
    if (car.listingType !== 'rent') return '';

    const rows = [];

    if (car.rentPricePerDay) {
      rows.push(`<span>Daily: <strong>${Number(car.rentPricePerDay).toLocaleString()} EGP/day</strong></span>`);
    }

    if (car.rentPricePerMonth) {
      rows.push(`<span>Monthly: <strong>${Number(car.rentPricePerMonth).toLocaleString()} EGP/month</strong></span>`);
    }

    if (car.rentDeposit) {
      rows.push(`<span>Deposit: <strong>${Number(car.rentDeposit).toLocaleString()} EGP</strong></span>`);
    }

    if (!rows.length) return '';

    return `<div class="rx-rent-prices">${rows.join('')}</div>`;
  }

  function buildRealHighlights(car) {
    const custom = cleanList(car.highlights);
    if (custom.length) return custom;

    const items = [];

    items.push(`${niceText(car.condition)} condition`);
    items.push(`${formatKm(car.mileage)} mileage`);

    if (car.fabrika) {
      items.push('Fabrika / factory condition selected by seller');
    }

    if (hasRealValue(car.service)) {
      items.push(`Service history: ${car.service}`);
    }

    if (hasRealValue(car.engine)) {
      items.push(`Engine: ${car.engine}`);
    }

    if (hasRealValue(car.owners)) {
      items.push(`Owner history: ${car.owners}`);
    }

    if (car.listingType === 'rent') {
      if (car.rentPricePerDay) items.push(`Daily rent: ${Number(car.rentPricePerDay).toLocaleString()} EGP/day`);
      if (car.rentPricePerMonth) items.push(`Monthly rent: ${Number(car.rentPricePerMonth).toLocaleString()} EGP/month`);
    }

    return items;
  }

  function buildRealIncluded(car) {
    const custom = cleanList(car.included);
    if (custom.length) return custom;

    const items = [];

    if (car.historyDocuments.length) {
      items.push(`${car.historyDocuments.length} service/history document${car.historyDocuments.length === 1 ? '' : 's'} uploaded`);
    } else if (String(car.service || '').toLowerCase().includes('history')) {
      items.push('Service history selected, but no document is uploaded yet');
    }

    if (car.images.length) {
      items.push(`${car.images.length} real listing photo${car.images.length === 1 ? '' : 's'} uploaded`);
    }

    if (hasRealValue(car.body) || car.doors || car.seats) {
      items.push(`${car.body || 'Body'} body · ${car.doors || '—'} doors · ${car.seats || '—'} seats`);
    }

    if (hasRealValue(car.drivetrain)) {
      items.push(`${car.drivetrain} drivetrain`);
    }

    if (car.listingType === 'rent' && car.rentDeposit) {
      items.push(`Rental deposit: ${Number(car.rentDeposit).toLocaleString()} EGP`);
    }

    if (car.phone) {
      items.push('Seller contact number available');
    }

    return items.length ? items : ['No included details were added by the seller'];
  }

  function historyDocumentsHTML(car) {
    if (!car.historyDocuments.length) return '';

    return `
      <div class="rx-desc-section">
        <div class="rx-desc-label">History Documents</div>
        <div class="rx-doc-list">
          ${car.historyDocuments.map((doc, index) => `
            <a
              class="rx-doc-link"
              href="${escapeHTML(doc.url)}"
              target="_blank"
              rel="noopener"
            >
              <span class="rx-doc-icon">📄</span>
              <span>${escapeHTML(doc.originalName || `History document ${index + 1}`)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  function normalizeCar(car) {
    const fallbackImg =
      typeof brandImages !== 'undefined' && car.brand
        ? brandImages?.[car.brand]
        : '';

    return {
      ...car,

      id: String(car._id || car.id),

      brand: car.brand || 'Unknown',
      model: car.model || 'Car',
      year: Number(car.year || new Date().getFullYear()),
      price: Number(car.price || 0),

      listingType: car.listingType || 'sale',
      rentPricePerDay: car.rentPricePerDay || null,
      rentPricePerMonth: car.rentPricePerMonth || null,
      rentDeposit: car.rentDeposit || null,

      mileage: Number(car.mileage || 0),
      city: car.city || 'Not specified',
      condition: car.condition || 'used',
      transmission: niceText(car.transmission || 'automatic'),
      fuel: niceText(car.fuel || 'petrol'),
      color: car.color || 'Not specified',
      fabrika: car.fabrika === true,

      body: car.body || 'Sedan',
      drivetrain: car.drivetrain || 'FWD',
      doors: car.doors || 4,
      seats: car.seats || 5,
      engine: car.engine || 'Not specified',
      owners: car.owners || car.owner || 'Not specified',
      service: car.service || 'Not specified',

      phone: String(car.phone || '').replace(/\D/g, ''),

      description: car.description || '',

      historyDocuments: normalizeHistoryDocuments(
        car.historyDocuments || car.serviceDocuments || car.documents || []
      ),

      highlights: cleanList(car.highlights),
      included: cleanList(car.included),

      images: Array.isArray(car.images) && car.images.length
        ? car.images
        : fallbackImg
          ? [fallbackImg]
          : []
    };
  }

  async function getCar(id) {
    if (typeof mostViewedCars !== 'undefined' && Array.isArray(mostViewedCars)) {
      const local = mostViewedCars.find(c => String(c.id) === String(id));
      if (local) return normalizeCar(local);
    }

    try {
      const res = await fetch('/api/cars/' + encodeURIComponent(id));
      const data = await safeJson(res);

      if (res.ok && data.car) {
        return normalizeCar(data.car);
      }
    } catch (err) {
      console.error('Fetch expanded car error:', err);
    }

    return null;
  }

  async function loadSavedIds() {
    const t = token();

    if (!t) {
      savedIds = new Set();
      return;
    }

    try {
      const res = await fetch('/api/auth/saved-car-ids', {
        headers: {
          Authorization: `Bearer ${t}`
        }
      });

      const data = await safeJson(res);

      savedIds = res.ok
        ? new Set((data.savedCarIds || []).map(String))
        : new Set();
    } catch {
      savedIds = new Set();
    }
  }

  function updateSaveButtons(carId, saved) {
    const id = String(carId);

    if (saved) {
      savedIds.add(id);
    } else {
      savedIds.delete(id);
    }

    document
      .querySelectorAll(`[data-id="${cssEscape(id)}"]`)
      .forEach(el => {
        if (
          el.classList.contains('save-car-btn') ||
          el.classList.contains('rx-save-btn')
        ) {
          el.classList.toggle('saved', saved);
          el.textContent = saved ? '♥ Saved' : '♡ Save';
        }
      });
  }

  async function toggleSave(carId, btn) {
    const t = token();

    if (!t) {
      window.location.href = '/login.html';
      return;
    }

    try {
      btn.disabled = true;

      const res = await fetch('/api/auth/save-car/' + encodeURIComponent(carId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`
        }
      });

      const data = await safeJson(res);

      if (!res.ok) {
        alert(data.message || 'Could not save this car');
        return;
      }

      updateSaveButtons(carId, data.saved);
    } catch (err) {
      console.error('Save from expanded card error:', err);
      alert('Server error. Please try again.');
    } finally {
      btn.disabled = false;
    }
  }

  function targetRect() {
    return {
      left: 0,
      top: 0,
      w: window.innerWidth,
      h: window.innerHeight
    };
  }

  function expandedTransform() {
    const w = Math.min(window.innerWidth * 0.95, 1700);
    const h = window.innerHeight * 0.9;
    const left = (window.innerWidth - w) / 2;
    const top = (window.innerHeight - h) / 2;

    return `translate(${left}px, ${top}px) scale(${w / window.innerWidth}, ${h / window.innerHeight})`;
  }

  function originTransform(origin, target) {
    return `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.w}, ${origin.height / target.h})`;
  }

  function applyTarget(t) {
    [card, shadow].forEach(el => {
      el.style.left = t.left + 'px';
      el.style.top = t.top + 'px';
      el.style.width = t.w + 'px';
      el.style.height = t.h + 'px';
    });
  }

  function localCaraFallback(car) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - Number(car.year || currentYear);
    const mileage = Number(car.mileage || 0);

    const notes = [];

    if (age >= 12) {
      notes.push('it is an older car, so inspection is very important');
    }

    if (mileage >= 180000) {
      notes.push('the mileage is high, so check engine, gearbox, suspension, and cooling system carefully');
    } else if (mileage <= 70000) {
      notes.push('the mileage is relatively low for its age, but still verify it with service records');
    } else {
      notes.push('the mileage is normal depending on condition and service history');
    }

    if (!car.service || String(car.service).toLowerCase().includes('no')) {
      notes.push('service history is weak or missing');
    }

    if (car.owners && String(car.owners).toLowerCase().includes('more')) {
      notes.push('multiple owners means papers and inspection matter more');
    }

    return `Cara's take: ${car.brand} ${car.model} ${car.year} at ${displayPrice(car)} can be considered, but ${notes.join(', ')}. Final advice: inspect it with a mechanic, compare it with similar listings, and negotiate if service history or condition is not strong.`;
  }

  function buildCaraTakePrompt(car) {
    return `
Give a smart buyer evaluation for this exact RevXChange listing.

Rules:
- Do not introduce yourself.
- Keep it short and practical.
- Mention price, mileage, age, owners, and service history if relevant.
- Say what the buyer should check before buying.
- End with clear final advice.
- Do not invent information not shown below.

Listing:
Brand: ${car.brand}
Model: ${car.model}
Year: ${car.year}
Price: ${displayPrice(car)}
Mileage: ${formatKm(car.mileage)}
City: ${car.city}
Condition: ${car.condition}
Transmission: ${car.transmission}
Fuel: ${car.fuel}
Body: ${car.body}
Drivetrain: ${car.drivetrain}
Doors: ${car.doors}
Seats: ${car.seats}
Engine: ${car.engine}
Owners: ${car.owners}
Service history: ${car.service}
Color: ${car.color}
Seller description: ${car.description || 'No seller description'}
`;
  }

  async function loadCaraTake(car) {
    const takeEl = document.getElementById('rxCaraTakeText');
    if (!takeEl) return;

    const requestId = ++caraTakeRequestId;
    const cacheKey = 'rxCaraTake_' + car.id;

    takeEl.classList.remove('rx-done');
    takeEl.textContent = 'Cara is checking price, mileage, age, and service history...';

    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      takeEl.innerHTML = escapeHTML(cached).replace(/\n/g, '<br>');
      takeEl.classList.add('rx-done');
      return;
    }

    try {
      const res = await fetch('/api/cara/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: buildCaraTakePrompt(car),
          history: []
        })
      });

      const data = await safeJson(res);

      if (requestId !== caraTakeRequestId) return;

      if (!res.ok || !data.reply) {
        throw new Error(data.error || data.message || 'Cara take failed');
      }

      const reply = String(data.reply).trim();

      sessionStorage.setItem(cacheKey, reply);

      takeEl.innerHTML = escapeHTML(reply).replace(/\n/g, '<br>');
      takeEl.classList.add('rx-done');
    } catch (err) {
      console.error('Cara take error:', err);

      if (requestId !== caraTakeRequestId) return;

      const fallback = localCaraFallback(car);

      takeEl.innerHTML = escapeHTML(fallback).replace(/\n/g, '<br>');
      takeEl.classList.add('rx-done');
    }
  }

  function contentHTML(car) {
    const imgs = car.images.length ? car.images : [''];
    const saved = savedIds.has(String(car.id));

    const phone = car.phone;
    const whatsappHref = phone ? `https://wa.me/${phone}` : '#';
    const callHref = phone ? `tel:+${phone}` : '#';

    const desc =
      car.description ||
      `This ${car.year} ${car.brand} ${car.model} is listed in ${car.city}. It has ${formatKm(car.mileage)}, ${car.transmission} transmission, ${car.fuel} fuel type, ${car.engine} engine, and ${car.service} service history.`;

    const realHighlights = buildRealHighlights(car);
    const realIncluded = buildRealIncluded(car);

    return `
      <div class="rx-card-body">
        <div class="rx-gallery" id="rxGallery">
          ${imgs.map((src, i) => `
            <div class="rx-gallery-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
              ${
                src
                  ? `<img src="${escapeHTML(src)}" alt="${escapeHTML(`${car.brand} ${car.model}`)}">`
                  : `<span style="font-size:5rem">🚗</span>`
              }
            </div>
          `).join('')}

          ${imgs.length > 1 ? `
            <button class="rx-gallery-arrow prev" id="rxGalPrev">‹</button>
            <button class="rx-gallery-arrow next" id="rxGalNext">›</button>
            <div class="rx-gallery-counter" id="rxGalCounter">1 / ${imgs.length}</div>
          ` : ''}
        </div>

        <div class="rx-info">
          <div class="rx-info-title">${escapeHTML(`${car.brand} ${car.model} ${car.year}`)}</div>
          <div class="rx-info-price">${escapeHTML(displayPrice(car))}</div>
          ${rentPriceBlock(car)}

          <div class="rx-info-pills">
            <span class="rx-pill">📅 ${escapeHTML(car.year)}</span>
            <span class="rx-pill">🛣️ ${escapeHTML(formatKm(car.mileage))}</span>
            <span class="rx-pill">⚙️ ${escapeHTML(car.transmission)}</span>
            <span class="rx-pill">⛽ ${escapeHTML(car.fuel)}</span>
            <span class="rx-pill">📍 ${escapeHTML(car.city)}</span>
            ${car.fabrika ? `<span class="rx-pill fabrika">⭐ Fabrika</span>` : ''}
          </div>

          <div class="rx-spec-grid">
            <div class="rx-spec-row"><span class="rx-spec-key">Body</span><span class="rx-spec-val">${escapeHTML(car.body)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Drivetrain</span><span class="rx-spec-val">${escapeHTML(car.drivetrain)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Doors</span><span class="rx-spec-val">${escapeHTML(car.doors)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Seats</span><span class="rx-spec-val">${escapeHTML(car.seats)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Engine</span><span class="rx-spec-val">${escapeHTML(car.engine)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Owners</span><span class="rx-spec-val">${escapeHTML(car.owners)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Service</span><span class="rx-spec-val">${escapeHTML(car.service)}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Color</span><span class="rx-spec-val">${escapeHTML(car.color)}</span></div>
          </div>

          <div class="rx-info-actions">
            <button
              type="button"
              class="rx-action-btn rx-save-btn ${saved ? 'saved' : ''}"
              data-id="${escapeHTML(car.id)}"
            >
              ${saved ? '♥ Saved' : '♡ Save'}
            </button>

            <a href="${escapeHTML(whatsappHref)}" target="_blank" class="rx-action-btn rx-action-whatsapp">
              WhatsApp
            </a>

            <a href="${escapeHTML(callHref)}" class="rx-action-btn rx-action-call">
              Call
            </a>
          </div>
        </div>

        <div class="rx-desc-box">
          <div class="rx-desc-label">About this car</div>
          <div class="rx-desc-text">${escapeHTML(desc)}</div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">Key Highlights</div>
            <div class="rx-desc-list">
              ${realHighlights.map(item => `<div class="rx-desc-list-item">${escapeHTML(item)}</div>`).join('')}
            </div>
          </div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">What's Included</div>
            <div class="rx-desc-list">
              ${realIncluded.map(item => `<div class="rx-desc-list-item">${escapeHTML(item)}</div>`).join('')}
            </div>
          </div>

          ${historyDocumentsHTML(car)}
        </div>

        <div class="rx-cara-box">
          <div class="rx-cara-head">
            <div class="rx-cara-avatar">✦</div>

            <div class="rx-cara-title-block">
              <span class="rx-cara-label">Cara's Take</span>
              <span class="rx-cara-sub">AI assistant · evaluating this listing</span>
            </div>
          </div>

          <div class="rx-cara-verdict rx-show">
            <p class="rx-cara-verdict-text" id="rxCaraTakeText">
              Cara is checking this listing...
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function wireGallery(total) {
    const gallery = document.getElementById('rxGallery');
    const prev = document.getElementById('rxGalPrev');
    const next = document.getElementById('rxGalNext');
    const counter = document.getElementById('rxGalCounter');

    if (!gallery) return;

    function show(i) {
      const slides = gallery.querySelectorAll('.rx-gallery-slide');
      if (!slides.length) return;

      slides[galleryIndex]?.classList.remove('active');

      galleryIndex = (i + total) % total;

      slides[galleryIndex]?.classList.add('active');

      if (counter) {
        counter.textContent = `${galleryIndex + 1} / ${total}`;
      }
    }

    prev?.addEventListener('click', e => {
      e.stopPropagation();
      show(galleryIndex - 1);
    });

    next?.addEventListener('click', e => {
      e.stopPropagation();
      show(galleryIndex + 1);
    });

    gallery.addEventListener('click', e => {
      if (e.target.closest('.rx-gallery-arrow')) return;

      const img = e.target.closest('.rx-gallery-slide img');
      if (!img) return;

      lbImgInner.src = img.src;
      lbImg.style.display = 'block';
      lbOverlay.classList.add('rx-visible');
      lbClose.classList.add('rx-visible');
    });
  }

  function setFullscreen(on) {
    if (!isOpen) return;

    isFullscreen = on;
    card.classList.toggle('rx-fullscreen', on);

    const navbar = document.querySelector('.navbar');

    if (navbar) {
      navbar.classList.toggle('rx-above-card', on);

      if (on) {
        navbar.classList.add('scrolled');
      } else if (window.scrollY <= 80) {
        navbar.classList.remove('scrolled');
      }
    }

    applyTarget(targetRect());

    if (on) {
      card.style.transform = 'translate(0px, 0px) scale(1, 1)';
    } else {
      const body = card.querySelector('.rx-card-body');
      if (body) body.scrollTop = 0;

      card.style.transform = expandedTransform();
    }
  }

  function handleCardWheel(e) {
    if (!isOpen) return;

    if (!isFullscreen && e.deltaY > 8) {
      e.preventDefault();
      setFullscreen(true);
      return;
    }

    if (isFullscreen && e.deltaY < -20) {
      const body = card.querySelector('.rx-card-body');
      const atTop = !body || body.scrollTop <= 0;

      if (atTop) {
        e.preventDefault();
        setFullscreen(false);
      }
    }
  }

  async function countView(id) {
    const viewedKey = 'rxViewed_' + id;
    const t = token();

    if (t) {
      fetch('/api/cars/' + encodeURIComponent(id) + '/view', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + t
        }
      }).catch(() => {});

      return;
    }

    if (!localStorage.getItem(viewedKey)) {
      fetch('/api/cars/' + encodeURIComponent(id) + '/view', {
        method: 'POST'
      })
        .then(() => localStorage.setItem(viewedKey, '1'))
        .catch(() => {});
    }
  }

  async function openCard(cardEl, id) {
    if (isOpen) return;

    const car = await getCar(id);

    if (!car) {
      alert('Car details could not be loaded.');
      return;
    }

    countView(id);
    await loadSavedIds();

    isOpen = true;
    isFullscreen = false;
    galleryIndex = 0;

    currentOriginEl = cardEl;
    currentOrigin = cardEl.getBoundingClientRect();

    const target = targetRect();

    applyTarget(target);

    content.innerHTML = contentHTML(car);

    card.style.display = 'block';
    shadow.style.display = 'block';

    document.querySelector('.navbar')?.classList.remove('rx-above-card');

    card.classList.remove('rx-closing', 'rx-fullscreen');
    card.style.transform = originTransform(currentOrigin, target);

    overlay.classList.add('rx-visible');
    document.body.classList.add('rx-card-lock');

    requestAnimationFrame(() => {
      card.classList.add('rx-animating', 'rx-visible-fade', 'rx-open', 'rx-content-ready');
      shadow.classList.add('rx-visible');
      card.style.transform = expandedTransform();
    });

    wireGallery(car.images.length || 1);
    loadCaraTake(car);
  }

  function closeCard() {
    if (!isOpen) return;

    caraTakeRequestId++;

    const target = targetRect();

    if (currentOriginEl && document.body.contains(currentOriginEl)) {
      currentOrigin = currentOriginEl.getBoundingClientRect();
    }

    isFullscreen = false;

    document.querySelector('.navbar')?.classList.remove('rx-above-card');

    card.classList.add('rx-closing');
    card.classList.remove('rx-open', 'rx-fullscreen');

    shadow.classList.remove('rx-visible');
    overlay.classList.remove('rx-visible');

    card.style.transform = originTransform(currentOrigin, target);

    setTimeout(() => {
      card.style.display = 'none';
      shadow.style.display = 'none';
      content.innerHTML = '';

      card.classList.remove(
        'rx-animating',
        'rx-visible-fade',
        'rx-content-ready',
        'rx-closing'
      );

      document.body.classList.remove('rx-card-lock');

      isOpen = false;
      currentOrigin = null;
      currentOriginEl = null;
    }, 550);
  }

  document.addEventListener('click', e => {
    const expandedSaveBtn = e.target.closest('.rx-save-btn');

    if (expandedSaveBtn) {
      e.preventDefault();
      e.stopPropagation();

      const carId = expandedSaveBtn.dataset.id;
      if (!carId) return;

      toggleSave(carId, expandedSaveBtn);
      return;
    }

    if (e.target.closest('.save-car-btn')) return;
    if (e.target.closest('.car-action-btn')) return;
    if (e.target.closest('.rx-action-btn')) return;
    if (e.target.closest('.carousel-arrow')) return;

    const cardEl = e.target.closest('.car-card-placeholder');
    if (!cardEl) return;

    const id = cardEl.dataset.id;
    if (!id) return;

    openCard(cardEl, id);
  });

  closeBtn.addEventListener('click', closeCard);
  overlay.addEventListener('click', closeCard);
  card.addEventListener('wheel', handleCardWheel, { passive: false });

  lbOverlay.addEventListener('click', () => {
    lbOverlay.classList.remove('rx-visible');
    lbClose.classList.remove('rx-visible');
    lbImg.style.display = 'none';
  });

  lbClose.addEventListener('click', () => {
    lbOverlay.click();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCard();
  });

  window.addEventListener('resize', () => {
    if (!isOpen) return;

    applyTarget(targetRect());

    card.style.transform = isFullscreen
      ? 'translate(0px, 0px) scale(1, 1)'
      : expandedTransform();
  });

  function tryOpenDeepLink() {
    const match = window.location.pathname.match(/^\/car\/([^/]+)/);
    if (!match) return;

    const id = match[1];
    let tries = 0;

    const timer = setInterval(() => {
      const cardEl = document.querySelector(`.car-card-placeholder[data-id="${cssEscape(id)}"]`);

      if (cardEl) {
        clearInterval(timer);
        openCard(cardEl, id);
      }

      tries += 1;

      if (tries > 25) {
        clearInterval(timer);
      }
    }, 120);
  }

  tryOpenDeepLink();
})();