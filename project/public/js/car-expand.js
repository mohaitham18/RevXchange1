/* RevXChange — Backend car expand card + Save button */
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
  let currentOrigin = null;
  let currentOriginEl = null;
  let galleryIndex = 0;
  let savedIds = new Set();

  const formatPrice = value => Number(value || 0).toLocaleString() + ' EGP';
  const formatKm = value => Number(value || 0).toLocaleString() + ' km';

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
      .querySelectorAll(`[data-id="${CSS.escape(id)}"]`)
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

  function niceText(value) {
    if (!value) return 'Not specified';

    const text = String(value);
    return text.charAt(0).toUpperCase() + text.slice(1);
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
      mileage: Number(car.mileage || 0),
      city: car.city || 'Not specified',
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
      highlights: Array.isArray(car.highlights) && car.highlights.length
        ? car.highlights
        : [
            'Seller description available',
            'Contact seller for inspection details',
            'Check service history before purchase'
          ],
      included: Array.isArray(car.included) && car.included.length
        ? car.included
        : [
            'Documents available from seller',
            'Contact seller for included accessories'
          ],
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

  function contentHTML(car) {
    const imgs = car.images.length ? car.images : [''];
    const saved = savedIds.has(String(car.id));
    const phone = car.phone;
    const whatsappHref = phone ? `https://wa.me/${phone}` : '#';
    const callHref = phone ? `tel:+${phone}` : '#';

    const desc =
      car.description ||
      `This ${car.year} ${car.brand} ${car.model} is listed in ${car.city}. It has ${formatKm(car.mileage)}, ${car.transmission} transmission, and ${car.fuel} fuel type.`;

    return `
      <div class="rx-card-body">
        <div class="rx-gallery" id="rxGallery">
          ${imgs.map((src, i) => `
            <div class="rx-gallery-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
              ${
                src
                  ? `<img src="${src}" alt="${car.brand} ${car.model}">`
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
          <div class="rx-info-title">${car.brand} ${car.model} ${car.year}</div>
          <div class="rx-info-price">${formatPrice(car.price)}</div>

          <div class="rx-info-pills">
            <span class="rx-pill">📅 ${car.year}</span>
            <span class="rx-pill">🛣️ ${formatKm(car.mileage)}</span>
            <span class="rx-pill">⚙️ ${car.transmission}</span>
            <span class="rx-pill">⛽ ${car.fuel}</span>
            <span class="rx-pill">📍 ${car.city}</span>
            ${car.fabrika ? `<span class="rx-pill fabrika">⭐ Fabrika</span>` : ''}
          </div>

          <div class="rx-spec-grid">
            <div class="rx-spec-row"><span class="rx-spec-key">Body</span><span class="rx-spec-val">${car.body}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Drivetrain</span><span class="rx-spec-val">${car.drivetrain}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Doors</span><span class="rx-spec-val">${car.doors}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Seats</span><span class="rx-spec-val">${car.seats}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Engine</span><span class="rx-spec-val">${car.engine}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Owners</span><span class="rx-spec-val">${car.owners}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Service</span><span class="rx-spec-val">${car.service}</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Color</span><span class="rx-spec-val">${car.color}</span></div>
          </div>

          <div class="rx-info-actions">
            <button
              type="button"
              class="rx-action-btn rx-save-btn ${saved ? 'saved' : ''}"
              data-id="${car.id}"
            >
              ${saved ? '♥ Saved' : '♡ Save'}
            </button>

            <a href="${whatsappHref}" target="_blank" class="rx-action-btn rx-action-whatsapp">
              WhatsApp
            </a>

            <a href="${callHref}" class="rx-action-btn rx-action-call">
              Call
            </a>
          </div>
        </div>

        <div class="rx-desc-box">
          <div class="rx-desc-label">About this car</div>
          <div class="rx-desc-text">${desc}</div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">Key Highlights</div>
            <div class="rx-desc-list">
              ${car.highlights.map(item => `<div class="rx-desc-list-item">${item}</div>`).join('')}
            </div>
          </div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">What's Included</div>
            <div class="rx-desc-list">
              ${car.included.map(item => `<div class="rx-desc-list-item">${item}</div>`).join('')}
            </div>
          </div>
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
            <p class="rx-cara-verdict-text rx-done">
              This listing is ready to inspect. Compare price, mileage, and service history before buying.
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

  async function openCard(cardEl, id) {
    if (isOpen) return;

    const car = await getCar(id);

    if (!car) {
      alert('Car details could not be loaded.');
      return;
    }

    await loadSavedIds();

    isOpen = true;
    galleryIndex = 0;
    currentOriginEl = cardEl;
    currentOrigin = cardEl.getBoundingClientRect();

    const target = targetRect();

    applyTarget(target);

    content.innerHTML = contentHTML(car);

    card.style.display = 'block';
    shadow.style.display = 'block';
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
  }

  function closeCard() {
    if (!isOpen) return;

    const target = targetRect();

    if (currentOriginEl && document.body.contains(currentOriginEl)) {
      currentOrigin = currentOriginEl.getBoundingClientRect();
    }

    card.classList.add('rx-closing');
    card.classList.remove('rx-open', 'rx-fullscreen');
    shadow.classList.remove('rx-visible');
    overlay.classList.remove('rx-visible');
    card.style.transform = originTransform(currentOrigin, target);

    setTimeout(() => {
      card.style.display = 'none';
      shadow.style.display = 'none';
      content.innerHTML = '';
      card.classList.remove('rx-animating', 'rx-visible-fade', 'rx-content-ready', 'rx-closing');
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

    const cardEl = e.target.closest('.car-card-placeholder');

    if (!cardEl) return;

    const id = cardEl.dataset.id;

    if (!id) return;

    openCard(cardEl, id);
  });

  closeBtn.addEventListener('click', closeCard);
  overlay.addEventListener('click', closeCard);

  lbOverlay.addEventListener('click', () => {
    lbOverlay.classList.remove('rx-visible');
    lbClose.classList.remove('rx-visible');
    lbImg.style.display = 'none';
  });

  lbClose.addEventListener('click', () => lbOverlay.click());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCard();
  });

  function tryOpenDeepLink() {
    const match = window.location.pathname.match(/^\/car\/([^/]+)/);

    if (!match) return;

    const id = match[1];
    let tries = 0;

    const timer = setInterval(() => {
      const cardEl = document.querySelector(`.car-card-placeholder[data-id="${CSS.escape(id)}"]`);

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