/* ═══════════════════════════════════════════════════════════
   RevXChange — Car Expand Engine
   Stage 2: full content + skeleton loaders
   ═══════════════════════════════════════════════════════════ */

(function () {
  if (window.location.pathname.toLowerCase().includes('login')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="rxCarOverlay"></div>
    <div id="rxCarShadow"></div>
    <div id="rxCarCard">
      <button id="rxCarClose" aria-label="Close">✕</button>
      <div id="rxCarContent"></div>
    </div>
  `);

  const overlay  = document.getElementById('rxCarOverlay');
  const shadow   = document.getElementById('rxCarShadow');
  const card     = document.getElementById('rxCarCard');
  const closeBtn = document.getElementById('rxCarClose');
  const content  = document.getElementById('rxCarContent');

  let isOpen = false;
  let originRect = null;
  let galleryIndex = 0;
  let loadTimer = null;

  // ── Helpers ────────────────────────────────────────────────
  function formatPrice(p) { return p.toLocaleString() + ' EGP'; }
  function formatKm(m)    { return m.toLocaleString() + ' km'; }

  function getCar(id) {
    if (typeof mostViewedCars === 'undefined') return null;
    return mostViewedCars.find(c => String(c.id) === String(id)) || null;
  }

  function getTargetRect() {
    const w = Math.min(window.innerWidth * 0.95, 1700);
    const h = window.innerHeight * 0.90;
    const left = (window.innerWidth - w) / 2;
    const top  = (window.innerHeight - h) / 2;
    return { w, h, left, top };
  }

  function originTransform(origin, target) {
    const scaleX = origin.width  / target.w;
    const scaleY = origin.height / target.h;
    const tx = origin.left - target.left;
    const ty = origin.top  - target.top;
    return `translate(${tx}px, ${ty}px) scale(${scaleX}, ${scaleY})`;
  }

  function applyTarget(target) {
    card.style.left = target.left + 'px';
    card.style.top  = target.top + 'px';
    card.style.width  = target.w + 'px';
    card.style.height = target.h + 'px';
    shadow.style.left = target.left + 'px';
    shadow.style.top  = target.top + 'px';
    shadow.style.width  = target.w + 'px';
    shadow.style.height = target.h + 'px';
  }

  // ── Skeleton markup ────────────────────────────────────────
  function skeletonHTML() {
    return `
      <div class="rx-skeleton-shell" id="rxSkeleton">
        <div class="rx-skel-left"></div>
        <div class="rx-skel-right">
          <div class="rx-skel rx-skel-title"></div>
          <div class="rx-skel rx-skel-price"></div>
          <div class="rx-skel rx-skel-pills"></div>
          <div class="rx-skel rx-skel-line"></div>
          <div class="rx-skel rx-skel-line"></div>
          <div class="rx-skel rx-skel-line short"></div>
          <div class="rx-skel rx-skel-btns"></div>
        </div>
      </div>`;
  }

  // ── Real content markup ────────────────────────────────────
  function contentHTML(car) {
    const imgs = car.images && car.images.length ? car.images : [''];
    const slides = imgs.map((src, i) => `
      <div class="rx-gallery-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
        ${src ? `<img src="${src}" alt="${car.brand} ${car.model}">`
              : `<span style="font-size:5rem">🚗</span>`}
      </div>`).join('');

    const many = imgs.length > 1;
    const arrows = many ? `
      <button class="rx-gallery-arrow prev" id="rxGalPrev">‹</button>
      <button class="rx-gallery-arrow next" id="rxGalNext">›</button>
      <div class="rx-gallery-counter" id="rxGalCounter">1 / ${imgs.length}</div>` : '';

    const fabrikaPill = car.fabrika
      ? `<span class="rx-pill fabrika">⭐ Fabrika</span>` : '';

    const desc = car.description ||
      `This ${car.year} ${car.brand} ${car.model} is in excellent condition, well maintained and ready to drive. Located in ${car.city} with ${formatKm(car.mileage)} on the odometer. ${car.transmission} transmission, ${car.fuel} engine.`;

    return `
      <div class="rx-card-body">
        <div class="rx-gallery" id="rxGallery">
          ${slides}
          ${arrows}
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
            ${fabrikaPill}
          </div>

          <div class="rx-info-section-label">Description</div>
          <div class="rx-info-desc">${desc}</div>

          <!-- Cara's Opinion slot — Stage 3 -->

          <div class="rx-info-actions">
            <a href="https://wa.me/${car.phone}" target="_blank" class="rx-action-btn rx-action-whatsapp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.84L0 24l6.335-1.48A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.371l-.36-.214-3.722.869.936-3.62-.235-.372A9.797 9.797 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/></svg>
              WhatsApp
            </a>
            <a href="tel:+${car.phone}" class="rx-action-btn rx-action-call">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1C9.61 22 2 14.39 2 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.01l-2.2 2.21z"/></svg>
              Call
            </a>
          </div>
        </div>
      </div>`;
  }

  // ── Gallery wiring ─────────────────────────────────────────
  function wireGallery(total) {
    const prev = document.getElementById('rxGalPrev');
    const next = document.getElementById('rxGalNext');
    const counter = document.getElementById('rxGalCounter');
    const gallery = document.getElementById('rxGallery');
    if (!gallery) return;

    function show(idx) {
      const slides = gallery.querySelectorAll('.rx-gallery-slide');
      slides[galleryIndex].classList.remove('active');
      galleryIndex = (idx + total) % total;
      slides[galleryIndex].classList.add('active');
      if (counter) counter.textContent = `${galleryIndex + 1} / ${total}`;
    }

    prev?.addEventListener('click', (e) => { e.stopPropagation(); show(galleryIndex - 1); });
    next?.addEventListener('click', (e) => { e.stopPropagation(); show(galleryIndex + 1); });
  }

  // ── Open ───────────────────────────────────────────────────
  function openCard(cardEl, id) {
    if (isOpen) return;
    const car = getCar(id);
    if (!car) return;
    isOpen = true;
    galleryIndex = 0;

    const origin = cardEl.getBoundingClientRect();
    originRect = origin;
    const target = getTargetRect();

    // Show skeleton immediately
    content.innerHTML = skeletonHTML();
    card.classList.remove('rx-content-ready');

    card.style.display = 'block';
    applyTarget(target);
    card.classList.remove('rx-animating', 'rx-open', 'rx-visible-fade');
    card.style.transform = originTransform(origin, target);

    overlay.classList.add('rx-visible');
    document.body.classList.add('rx-card-lock');

    void card.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add('rx-animating', 'rx-visible-fade');
        card.style.transform = 'translate(0, 0) scale(1, 1)';
        setTimeout(() => {
          shadow.classList.add('rx-visible');
          card.classList.add('rx-open');
        }, 380);
      });
    });

    // Fake load delay → swap skeleton for real content
    loadTimer = setTimeout(() => {
      content.insertAdjacentHTML('beforeend', contentHTML(car));
      const total = (car.images && car.images.length) || 1;
      wireGallery(total);

      requestAnimationFrame(() => {
        card.classList.add('rx-content-ready');
        const skel = document.getElementById('rxSkeleton');
        if (skel) {
          skel.classList.add('rx-hide');
          setTimeout(() => skel.remove(), 350);
        }
      });
    }, 700);
  }

  // ── Close ──────────────────────────────────────────────────
  function closeCard() {
    if (!isOpen || !originRect) return;
    if (loadTimer) clearTimeout(loadTimer);

    const target = getTargetRect();
    card.classList.remove('rx-open');
    shadow.classList.remove('rx-visible');

    requestAnimationFrame(() => {
      card.style.transform = originTransform(originRect, target);
    });

    overlay.classList.remove('rx-visible');

    setTimeout(() => {
      card.style.display = 'none';
      shadow.style.display = 'none';
      card.classList.remove('rx-animating', 'rx-visible-fade', 'rx-content-ready');
      content.innerHTML = '';
      document.body.classList.remove('rx-card-lock');
      isOpen = false;
      originRect = null;
    }, 600);
  }

  // ── Events ─────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (e.target.closest('.car-action-btn')) return;
    if (e.target.closest('.carousel-arrow')) return;
    const cardEl = e.target.closest('.car-card-placeholder');
    if (!cardEl) return;
    const id = cardEl.dataset.id;
    if (!id) return;
    openCard(cardEl, id);
  });

  closeBtn.addEventListener('click', closeCard);
  overlay.addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeCard(); });

  window.addEventListener('resize', () => {
    if (!isOpen) return;
    const target = getTargetRect();
    card.classList.remove('rx-animating');
    applyTarget(target);
    card.style.transform = 'translate(0,0) scale(1,1)';
  });

}());