/* ═══════════════════════════════════════════════════════════
   RevXChange — Car Expand Engine
   Stage 3: 2x2 layout + Cara's Take with live AI thinking
   ═══════════════════════════════════════════════════════════ */

(function () {
  if (window.location.pathname.toLowerCase().includes('login')) return;

  // ── Cara icon (matches cara.js style) ─────────────────────
  const caraSparkSVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#ddd6fe" style="flex-shrink:0;">
    <path d="M12 2 L13.2 8.8 L20 10 L13.2 11.2 L12 18 L10.8 11.2 L4 10 L10.8 8.8 Z"/>
    <path d="M19 2 L19.6 4.4 L22 5 L19.6 5.6 L19 8 L18.4 5.6 L16 5 L18.4 4.4 Z" opacity="0.75"/>
    <path d="M20 14 L20.4 15.6 L22 16 L20.4 16.4 L20 18 L19.6 16.4 L18 16 L19.6 15.6 Z" opacity="0.55"/>
  </svg>`;

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

  const overlay  = document.getElementById('rxCarOverlay');
  const shadow   = document.getElementById('rxCarShadow');
  const card     = document.getElementById('rxCarCard');
  const closeBtn = document.getElementById('rxCarClose');
  const content  = document.getElementById('rxCarContent');

  const lbOverlay  = document.getElementById('rxLightboxOverlay');
  const lbImg      = document.getElementById('rxLightboxImg');
  const lbImgInner = lbImg.querySelector('img');
  const lbClose    = document.getElementById('rxLightboxClose');

  let lightboxOpen = false;
  let lbOriginRect = null;
  let lbTargetCache = null;

  let isOpen = false;
  let state = 'closed'; // 'closed' | 'opening' | 'expanded' | 'going-fullscreen' | 'fullscreen' | 'closing'
  let originCardEl = null;
  let originRect = null;
  let galleryIndex = 0;
  let loadTimer = null;
  let caraTimers = [];
  let caraIntervals = [];
  let wheelAccum = 0;
  let wasScrolledNav = false;

  // ── Helpers ────────────────────────────────────────────────
  const formatPrice = p => p.toLocaleString() + ' EGP';
  const formatKm    = m => m.toLocaleString() + ' km';

  // Single point of car lookup — swap to fetch('/api/cars/' + id) when backend lands
  function getCar(id) {
    if (typeof mostViewedCars === 'undefined') return null;
    return mostViewedCars.find(c => String(c.id) === String(id)) || null;
  }

  // Pre-open URL (the URL we should restore to on close)
  let prePath = window.location.pathname + window.location.search;
  let suppressPopstate = false;

  // Target is ALWAYS fullscreen — expanded state is achieved via transform
  function getTargetRect() {
    return { w: window.innerWidth, h: window.innerHeight, left: 0, top: 0 };
  }

  // Transform that displays the fullscreen card as 95%x90% centered
  function getExpandedTransform() {
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;
    const w = Math.min(targetW * 0.95, 1700);
    const h = targetH * 0.90;
    const left = (targetW - w) / 2;
    const top  = (targetH - h) / 2;
    return `translate(${left}px, ${top}px) scale(${w / targetW}, ${h / targetH})`;
  }

  function triggerFullscreen() {
    if (state !== 'expanded') return;
    state = 'going-fullscreen';
    wheelAccum = 0;

    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.classList.add('rx-above-card');
      navbar.classList.add('scrolled'); // morph to pill synchronized with card
    }

    card.style.transform = 'translate(0, 0) scale(1, 1)';
    card.classList.add('rx-fullscreen');
    shadow.classList.remove('rx-visible');

    setTimeout(() => { state = 'fullscreen'; }, 620);
  }

  function originTransform(origin, target) {
    return `translate(${origin.left - target.left}px, ${origin.top - target.top}px)
            scale(${origin.width / target.w}, ${origin.height / target.h})`;
  }

  function applyTarget(t) {
    card.style.left = t.left + 'px';
    card.style.top  = t.top + 'px';
    card.style.width  = t.w + 'px';
    card.style.height = t.h + 'px';
    shadow.style.left = t.left + 'px';
    shadow.style.top  = t.top + 'px';
    shadow.style.width  = t.w + 'px';
    shadow.style.height = t.h + 'px';
  }

  function clearCaraTimers() {
    caraTimers.forEach(clearTimeout);
    caraIntervals.forEach(clearInterval);
    caraTimers = [];
    caraIntervals = [];
  }

  // ── Cara's deterministic score & verdict ──────────────────
  function caraScore(car) {
    let score = 50;
    const age = 2026 - car.year;
    if      (age <= 1)  score += 18;
    else if (age <= 3)  score += 10;
    else if (age <= 5)  score += 2;
    else if (age <= 7)  score -= 6;
    else                score -= 14;

    if      (car.mileage < 15000) score += 18;
    else if (car.mileage < 30000) score += 10;
    else if (car.mileage < 50000) score += 2;
    else if (car.mileage < 70000) score -= 6;
    else                          score -= 14;

    if (car.fabrika) score += 12;

    // Per-car seed for consistent uniqueness
    const seed = ((car.id * 13) % 11) - 5;
    score += seed;

    return Math.max(8, Math.min(96, score));
  }

  function caraVerdict(score, car) {
    if (score >= 80) return {
      label: 'STEAL',
      color: '#22c55e',
      text: `Strong buy. A ${car.year} ${car.brand} ${car.model} at ${formatKm(car.mileage)} this clean is rare. ${car.fabrika ? 'Fabrika condition seals the deal — ' : ''}don't sleep on this one.`
    };
    if (score >= 65) return {
      label: 'Good Deal',
      color: '#84cc16',
      text: `Solid pickup. Fair price for a ${car.year} ${car.model} with these specs. ${car.fabrika ? 'Fabrika spec is a real bonus — ' : ''}I'd shortlist this.`
    };
    if (score >= 45) return {
      label: 'Fair',
      color: '#facc15',
      text: `Priced about right. Nothing wrong, nothing exceptional. Worth a look if the specs match what you actually need.`
    };
    if (score >= 25) return {
      label: 'Overpriced',
      color: '#fb923c',
      text: `Asking price runs a bit hot for a ${car.year} ${car.brand} with ${formatKm(car.mileage)}. There's room to negotiate — don't pay the sticker.`
    };
    return {
      label: 'BUST',
      color: '#ef4444',
      text: `Hard pass. Better options exist at this price point. Either negotiate aggressively or keep looking.`
    };
  }

  function caraThinking(car) {
    const photoCount = (car.images && car.images.length) || 1;
    return [
      `Analyzing ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}...`,
      `Cross-checking ${car.year} ${car.brand} ${car.model} specs...`,
      `Comparing ${formatPrice(car.price)} to market average...`,
      `Forming verdict...`,
    ];
  }

  // ── Markup ─────────────────────────────────────────────────
  function skeletonHTML() {
    return `
      <div class="rx-skeleton-shell" id="rxSkeleton">
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
      </div>`;
  }

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

    const fabrikaPill = car.fabrika ? `<span class="rx-pill fabrika">⭐ Fabrika</span>` : '';

    const desc = car.description ||
      `This ${car.year} ${car.brand} ${car.model} is in excellent condition, well maintained and ready to drive. Located in ${car.city} with ${formatKm(car.mileage)} on the odometer. ${car.transmission} transmission, ${car.fuel} engine.${car.fabrika ? ' Factory-original Fabrika condition — never modified or restored.' : ''} Serious buyers only — contact for inspection or a test drive.`;

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

          <div class="rx-spec-grid">
            <div class="rx-spec-row"><span class="rx-spec-key">Body</span><span class="rx-spec-val">Sedan</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Drivetrain</span><span class="rx-spec-val">FWD</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Doors</span><span class="rx-spec-val">4</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Seats</span><span class="rx-spec-val">5</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Engine</span><span class="rx-spec-val">2.0L Turbo</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Owners</span><span class="rx-spec-val">First</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Service</span><span class="rx-spec-val">Full History</span></div>
            <div class="rx-spec-row"><span class="rx-spec-key">Color</span><span class="rx-spec-val">Midnight Gray</span></div>
          </div>

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

        <div class="rx-desc-box">
          <div class="rx-desc-label">About this car</div>
          <div class="rx-desc-text">${desc}</div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">Key Highlights</div>
            <div class="rx-desc-list">
              <div class="rx-desc-list-item">Single owner, never in an accident</div>
              <div class="rx-desc-list-item">Full dealer service history available</div>
              <div class="rx-desc-list-item">Original paint, no bodywork done</div>
              <div class="rx-desc-list-item">Recent service: brakes, oil, filters</div>
            </div>
          </div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">What's Included</div>
            <div class="rx-desc-list">
              <div class="rx-desc-list-item">2 original keys</div>
              <div class="rx-desc-list-item">Owner's manual + service booklet</div>
              <div class="rx-desc-list-item">Spare tire, jack, and tool kit</div>
            </div>
          </div>
        </div>

        <div class="rx-cara-box">
          <div class="rx-cara-head">
            <div class="rx-cara-avatar">${caraSparkSVG}</div>
            <div class="rx-cara-title-block">
              <span class="rx-cara-label">Cara's Take</span>
              <span class="rx-cara-sub">AI assistant · evaluating this listing</span>
            </div>
          </div>

          <div class="rx-cara-thinking" id="rxCaraThinking">
            <span class="rx-cara-dots"><span></span><span></span><span></span></span>
            <span class="rx-cara-think-text" id="rxCaraThinkText">Initializing...</span>
          </div>

          <div class="rx-cara-verdict" id="rxCaraVerdict">
            <p class="rx-cara-verdict-text" id="rxCaraVerdictText"></p>
          </div>

          <div class="rx-cara-rating" id="rxCaraRating">
            <div class="rx-cara-bar-labels">
              <span>BUST</span>
              <span class="rx-cara-bar-verdict" id="rxCaraBarVerdict">—</span>
              <span>STEAL</span>
            </div>
            <div class="rx-cara-bar-track">
              <div class="rx-cara-bar-needle" id="rxCaraBarNeedle"></div>
            </div>
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

    // Click image opens lightbox
    gallery.addEventListener('click', (e) => {
      if (e.target.closest('.rx-gallery-arrow')) return;
      const img = e.target.closest('.rx-gallery-slide img');
      if (!img) return;
      e.stopPropagation();
      openLightbox(img);
    });
  }

  // ── Cara analysis sequence ─────────────────────────────────
  function runCaraAnalysis(car) {
    const thinkBox    = document.getElementById('rxCaraThinking');
    const thinkText   = document.getElementById('rxCaraThinkText');
    const verdictBox  = document.getElementById('rxCaraVerdict');
    const verdictText = document.getElementById('rxCaraVerdictText');
    const ratingBox   = document.getElementById('rxCaraRating');
    const barVerdict  = document.getElementById('rxCaraBarVerdict');
    const needle      = document.getElementById('rxCaraBarNeedle');

    if (!thinkBox) return;

    const score   = caraScore(car);
    const verdict = caraVerdict(score, car);
    const lines   = caraThinking(car);

    // Sequence the thinking lines (fade between)
    const LINE_MS = 800;
    lines.forEach((line, i) => {
      caraTimers.push(setTimeout(() => {
        thinkText.style.opacity = '0';
        caraTimers.push(setTimeout(() => {
          thinkText.textContent = line;
          thinkText.style.opacity = '1';
        }, 180));
      }, i * LINE_MS));
    });

    // After last thinking line, fade thinking out & reveal verdict
    const afterThinking = lines.length * LINE_MS + 500;
    caraTimers.push(setTimeout(() => {
      thinkBox.style.opacity = '0';
      caraTimers.push(setTimeout(() => {
        thinkBox.style.display = 'none';
        verdictBox.classList.add('rx-show');
        typeText(verdictText, verdict.text, 1500);
      }, 280));
    }, afterThinking));

    // Reveal rating bar + animate needle
    caraTimers.push(setTimeout(() => {
      barVerdict.textContent = verdict.label;
      barVerdict.style.color = verdict.color;
      needle.style.borderColor = verdict.color;
      ratingBox.classList.add('rx-show');
      requestAnimationFrame(() => {
        needle.style.left = score + '%';
      });
    }, afterThinking + 600));
  }

  function typeText(el, text, duration) {
    el.classList.remove('rx-done');
    el.textContent = '';
    const speed = Math.max(15, duration / text.length);
    let i = 0;
    const id = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(id);
        el.classList.add('rx-done');
      }
    }, speed);
    caraIntervals.push(id);
  }

  // ── Open ───────────────────────────────────────────────────
  function openCard(cardEl, id, opts) {
    opts = opts || {};
    if (isOpen) return;
    const car = getCar(id);
    if (!car) return;
    isOpen = true;
    galleryIndex = 0;

    // URL routing — push /car/:id unless we're opening because of popstate/initial-load
    if (!opts.skipHistory) {
      prePath = window.location.pathname + window.location.search;
      history.pushState({ rxCarOpen: true, id: String(id) }, '', '/car/' + id);
    }

    originCardEl = cardEl;
    const origin = cardEl.getBoundingClientRect();
    originRect = origin;
    const target = getTargetRect();

    content.innerHTML = skeletonHTML();
    card.classList.remove('rx-content-ready');

    card.style.display = 'block';
    applyTarget(target);
    card.classList.remove('rx-animating', 'rx-open', 'rx-visible-fade');
    card.style.transform = originTransform(origin, target);

    overlay.classList.add('rx-visible');
    document.body.classList.add('rx-card-lock');

    // Remember navbar's scroll state so we can restore correctly on close
    const navbarEl = document.querySelector('.navbar');
    wasScrolledNav = navbarEl ? navbarEl.classList.contains('scrolled') : false;

    void card.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add('rx-animating', 'rx-visible-fade');
        card.style.transform = getExpandedTransform();
        setTimeout(() => {
          shadow.classList.add('rx-visible');
          card.classList.add('rx-open');
        }, 380);
        setTimeout(() => {
          state = 'expanded';
          wheelAccum = 0;
        }, 620);
      });
    });

    // Swap skeleton for real content
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
        // Start Cara once content is visible
        setTimeout(() => runCaraAnalysis(car), 400);
      });
    }, 700);
  }

  // ── Close ──────────────────────────────────────────────────
  function closeCard(opts) {
    opts = opts || {};
    if (!isOpen || !originRect) return;
    if (loadTimer) clearTimeout(loadTimer);
    clearCaraTimers();

    // Restore URL unless we're closing because of popstate (browser already did it)
    if (!opts.skipHistory) {
      suppressPopstate = true;
      history.back();
      // Safety net: if back() didn't change us off /car/... within 200ms, force-replace
      setTimeout(() => {
        suppressPopstate = false;
        if (window.location.pathname.startsWith('/car/')) {
          history.replaceState({}, '', prePath || '/');
        }
      }, 200);
    }

    state = 'closing';
    const target = getTargetRect();

    // Re-measure the original card's CURRENT position — it may have shifted
    // since open (resize, scroll restore, dynamic content). Land exactly on it.
    if (originCardEl && document.body.contains(originCardEl)) {
      originRect = originCardEl.getBoundingClientRect();
    }

    card.classList.add('rx-closing');
    card.classList.remove('rx-open', 'rx-fullscreen');
    shadow.classList.remove('rx-visible');

    requestAnimationFrame(() => {
      card.style.transform = originTransform(originRect, target);
    });

    overlay.classList.remove('rx-visible');

    // Restore navbar to its pre-open state
    const navbarEl = document.querySelector('.navbar');
    if (navbarEl) {
      navbarEl.classList.remove('rx-above-card');
      if (!wasScrolledNav) navbarEl.classList.remove('scrolled');
    }

    setTimeout(() => {
      card.style.display = 'none';
      shadow.style.display = 'none';
      card.classList.remove('rx-animating', 'rx-visible-fade', 'rx-content-ready', 'rx-closing');
      content.innerHTML = '';
      document.body.classList.remove('rx-card-lock');
      isOpen = false;
      originRect = null;
      originCardEl = null;
      state = 'closed';
      wheelAccum = 0;
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxOpen) closeLightbox();
      else if (isOpen) closeCard();
    }
  });

  // Wheel handler — only triggers in expanded state, accumulates 100px to fullscreen
  card.addEventListener('wheel', (e) => {
    if (state !== 'expanded') return; // fullscreen → natural scroll; transitions → ignore
    e.preventDefault();

    if (e.deltaY <= 0) {
      // upward wheel decays accumulator
      wheelAccum = Math.max(0, wheelAccum - Math.abs(e.deltaY) * 0.5);
      return;
    }

    wheelAccum += e.deltaY;
    if (wheelAccum >= 100) triggerFullscreen();
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (!isOpen) return;
    const target = getTargetRect();
    card.classList.remove('rx-animating');
    applyTarget(target);
    if (state === 'fullscreen' || state === 'going-fullscreen') {
      card.style.transform = 'translate(0, 0) scale(1, 1)';
    } else if (state === 'expanded' || state === 'opening') {
      card.style.transform = getExpandedTransform();
    }
  });

  // ── Image Lightbox ─────────────────────────────────────────
  function getLightboxTarget(aspect) {
    const pad = 100;
    const maxW = window.innerWidth - pad;
    const maxH = window.innerHeight - pad;
    let w = maxW, h = maxW / aspect;
    if (h > maxH) { h = maxH; w = maxH * aspect; }
    return { w, h, left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2 };
  }

  function openLightbox(srcImg) {
    if (lightboxOpen) return;
    lightboxOpen = true;

    const origin = srcImg.getBoundingClientRect();
    lbOriginRect = origin;
    lbImgInner.src = srcImg.src;
    lbImgInner.alt = srcImg.alt || '';

    const begin = () => {
      const nw = lbImgInner.naturalWidth  || origin.width;
      const nh = lbImgInner.naturalHeight || origin.height;
      const aspect = nw / nh;
      const target = getLightboxTarget(aspect);
      lbTargetCache = target;

      lbImg.style.display = 'block';
      lbImg.style.left = target.left + 'px';
      lbImg.style.top  = target.top + 'px';
      lbImg.style.width  = target.w + 'px';
      lbImg.style.height = target.h + 'px';

      const sx = origin.width  / target.w;
      const sy = origin.height / target.h;
      const tx = origin.left - target.left;
      const ty = origin.top  - target.top;
      lbImg.classList.remove('rx-animating');
      lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;

      lbOverlay.classList.add('rx-visible');
      void lbImg.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lbImg.classList.add('rx-animating');
          lbImg.style.transform = 'translate(0, 0) scale(1, 1)';
          setTimeout(() => lbClose.classList.add('rx-visible'), 250);
        });
      });
    };

    if (lbImgInner.complete && lbImgInner.naturalWidth) begin();
    else lbImgInner.onload = begin;
  }

  function closeLightbox() {
    if (!lightboxOpen || !lbOriginRect || !lbTargetCache) return;
    lightboxOpen = false;

    const origin = lbOriginRect;
    const target = lbTargetCache;
    const sx = origin.width  / target.w;
    const sy = origin.height / target.h;
    const tx = origin.left - target.left;
    const ty = origin.top  - target.top;

    lbClose.classList.remove('rx-visible');
    requestAnimationFrame(() => {
      lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    });
    lbOverlay.classList.remove('rx-visible');

    setTimeout(() => {
      lbImg.style.display = 'none';
      lbImg.classList.remove('rx-animating');
      lbOriginRect = null;
      lbTargetCache = null;
    }, 500);
  }

  lbOverlay.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', closeLightbox);
  lbImg.addEventListener('click', closeLightbox);

// ── Browser back/forward handling ──────────────────────────
  window.addEventListener('popstate', (e) => {
    if (suppressPopstate) { suppressPopstate = false; return; }

    const pathMatch = window.location.pathname.match(/^\/car\/(\w+)/);

    if (pathMatch) {
      // Forward to a car URL → open it (or switch if a different one is open)
      const id = pathMatch[1];
      if (isOpen) {
        // Already open — if same car, ignore; else close-then-reopen
        const open = card.querySelector('.rx-info-title');
        // simpler: just close and reopen via deep-link flow
        closeCard({ skipHistory: true });
        setTimeout(() => deepLinkOpen(id), 50);
      } else {
        deepLinkOpen(id);
      }
    } else {
      // Back away from a car URL → close if open
      if (isOpen) closeCard({ skipHistory: true });
    }
  });

  // ── Deep-link: find the card on the page and open it ───────
  function deepLinkOpen(id) {
    const tryOpen = (attempt) => {
      const cardEl = document.querySelector(`.car-card-placeholder[data-id="${id}"]`);
      if (cardEl) {
        openCard(cardEl, id, { skipHistory: true });
        return;
      }
      if (attempt < 20) setTimeout(() => tryOpen(attempt + 1), 100);
    };
    tryOpen(0);
  }

  // ── On initial page load, check if URL points to a car ─────
  (function checkInitialURL() {
    const m = window.location.pathname.match(/^\/car\/(\w+)/);
    if (!m) return;
    const id = m[1];

    // Wait for DOM ready + the cars grid to render before opening
    const start = () => {
      // prePath should NOT be /car/... — set it to the canonical fallback
      prePath = '/used-cars.html';
      deepLinkOpen(id);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }());

}());