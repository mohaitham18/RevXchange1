/* ═══════════════════════════════════════════════════════════
   RevXChange — Car Expand Engine
   Used Cars Backend Version
   Replace the whole public/js/car-expand.js with this file
   ═══════════════════════════════════════════════════════════ */

(function () {
  if (window.location.pathname.toLowerCase().includes("login")) return;

  const caraSparkSVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ddd6fe" style="flex-shrink:0;">
      <path d="M12 2 L13.2 8.8 L20 10 L13.2 11.2 L12 18 L10.8 11.2 L4 10 L10.8 8.8 Z"/>
      <path d="M19 2 L19.6 4.4 L22 5 L19.6 5.6 L19 8 L18.4 5.6 L16 5 L18.4 4.4 Z" opacity="0.75"/>
      <path d="M20 14 L20.4 15.6 L22 16 L20.4 16.4 L20 18 L19.6 16.4 L18 16 L19.6 15.6 Z" opacity="0.55"/>
    </svg>
  `;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="rxCarOverlay"></div>
    <div id="rxCarShadow"></div>

    <div id="rxCarCard">
      <button id="rxCarClose" aria-label="Close">✕</button>
      <div id="rxCarContent"></div>
    </div>

    <div id="rxLightboxOverlay"></div>
    <div id="rxLightboxImg"><img src="" alt=""></div>
    <button id="rxLightboxClose" aria-label="Close image">✕</button>
  `
  );

  const overlay = document.getElementById("rxCarOverlay");
  const shadow = document.getElementById("rxCarShadow");
  const card = document.getElementById("rxCarCard");
  const closeBtn = document.getElementById("rxCarClose");
  const content = document.getElementById("rxCarContent");

  const lbOverlay = document.getElementById("rxLightboxOverlay");
  const lbImg = document.getElementById("rxLightboxImg");
  const lbImgInner = lbImg.querySelector("img");
  const lbClose = document.getElementById("rxLightboxClose");

  let isOpen = false;
  let state = "closed";
  let originCardEl = null;
  let originRect = null;
  let galleryIndex = 0;
  let loadTimer = null;
  let caraTimers = [];
  let caraIntervals = [];
  let wheelAccum = 0;
  let wasScrolledNav = false;

  let lightboxOpen = false;
  let lbOriginRect = null;
  let lbTargetCache = null;

  const formatPrice = (price) => Number(price || 0).toLocaleString() + " EGP";
  const formatKm = (km) => Number(km || 0).toLocaleString() + " km";

  function titleCase(value) {
    value = String(value || "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function safeText(value, fallback = "Not specified") {
    if (value === undefined || value === null || value === "") return fallback;
    return value;
  }

  function normalizePhone(phone) {
    return String(phone || "").replace(/\D/g, "");
  }

  function getBrandFallback(car) {
    if (typeof brandImages !== "undefined" && brandImages && car.brand) {
      return brandImages[car.brand] || "";
    }

    return "";
  }

  function normalizeBackendCar(car) {
    const fallbackImg = getBrandFallback(car);

    return {
      ...car,

      id: car._id || car.id,

      brand: safeText(car.brand, "Unknown"),
      model: safeText(car.model, "Car"),
      year: Number(car.year || new Date().getFullYear()),
      price: Number(car.price || 0),
      mileage: Number(car.mileage || 0),

      city: safeText(car.city, "Not specified"),
      transmission: titleCase(car.transmission || "automatic"),
      fuel: titleCase(car.fuel || "petrol"),
      color: safeText(car.color),

      condition: titleCase(car.condition || "used"),
      fabrika: car.fabrika === true,

      body: safeText(car.body, "Sedan"),
      drivetrain: safeText(car.drivetrain, "FWD"),
      doors: safeText(car.doors, 4),
      seats: safeText(car.seats, 5),
      engine: safeText(car.engine),
      owners: safeText(car.owners),
      service: safeText(car.service),

      phone: normalizePhone(car.phone),

      description: car.description || "",

      highlights:
        Array.isArray(car.highlights) && car.highlights.length
          ? car.highlights
          : [
              "Seller description available",
              "Contact seller for inspection details",
              "Check service history before purchase"
            ],

      included:
        Array.isArray(car.included) && car.included.length
          ? car.included
          : [
              "Documents available from seller",
              "Contact seller for included accessories"
            ],

      images:
        Array.isArray(car.images) && car.images.length
          ? car.images
          : fallbackImg
            ? [fallbackImg]
            : []
    };
  }

async function getCar(id) {
  const idText = String(id);

  // 1) First: if this is a home page placeholder car from cars.js
  // ids are usually simple numbers like 1, 2, 3
  if (typeof mostViewedCars !== "undefined" && Array.isArray(mostViewedCars)) {
    const localCar = mostViewedCars.find(car => String(car.id) === idText);

    if (localCar) {
      return normalizeBackendCar(localCar);
    }
  }

  // 2) Second: try backend MongoDB car
  // ids are like 6a1711bcdd793e17435a4b39
  try {
    const res = await fetch("/api/cars/" + encodeURIComponent(id));

    if (!res.ok) {
      console.error("Car fetch failed:", res.status);
      return null;
    }

    const data = await res.json();

    if (!data.car) {
      console.error("No car returned from backend");
      return null;
    }

    return normalizeBackendCar(data.car);
  } catch (err) {
    console.error("Backend car fetch failed:", err);
    return null;
  }
}



  function carSeed(car) {
    const raw = String(car.id || car._id || "1");
    let total = 0;

    for (let i = 0; i < raw.length; i++) {
      total += raw.charCodeAt(i);
    }

    return total;
  }

  function caraScore(car) {
    let score = 50;
    const currentYear = new Date().getFullYear();
    const age = currentYear - car.year;

    if (age <= 1) score += 18;
    else if (age <= 3) score += 10;
    else if (age <= 5) score += 2;
    else if (age <= 7) score -= 6;
    else score -= 14;

    if (car.mileage < 15000) score += 18;
    else if (car.mileage < 30000) score += 10;
    else if (car.mileage < 50000) score += 2;
    else if (car.mileage < 70000) score -= 6;
    else score -= 14;

    if (car.fabrika) score += 12;

    const seed = ((carSeed(car) * 13) % 11) - 5;
    score += seed;

    return Math.max(8, Math.min(96, score));
  }

  function caraVerdict(score, car) {
    if (score >= 80) {
      return {
        label: "STEAL",
        color: "#22c55e",
        text: `Strong buy. A ${car.year} ${car.brand} ${car.model} at ${formatKm(car.mileage)} is a rare find. ${
          car.fabrika ? "Fabrika condition makes it even stronger. " : ""
        }This one is worth shortlisting.`
      };
    }

    if (score >= 65) {
      return {
        label: "Good Deal",
        color: "#84cc16",
        text: `Solid pickup. Fair price for a ${car.year} ${car.brand} ${car.model} with these specs. ${
          car.fabrika ? "Fabrika spec is a real bonus. " : ""
        }Worth checking in person.`
      };
    }

    if (score >= 45) {
      return {
        label: "Fair",
        color: "#facc15",
        text: `Priced about right. Nothing looks too risky from the listing, but inspect the car carefully before making a decision.`
      };
    }

    if (score >= 25) {
      return {
        label: "Overpriced",
        color: "#fb923c",
        text: `The price looks a little high for a ${car.year} ${car.brand} with ${formatKm(car.mileage)}. Try negotiating before buying.`
      };
    }

    return {
      label: "BUST",
      color: "#ef4444",
      text: `Hard pass unless the seller negotiates heavily. You can probably find better options at this price.`
    };
  }

  function caraThinking(car) {
    const photoCount = car.images && car.images.length ? car.images.length : 1;

    return [
      `Analyzing ${photoCount} ${photoCount === 1 ? "photo" : "photos"}...`,
      `Checking ${car.year} ${car.brand} ${car.model} specs...`,
      `Comparing ${formatPrice(car.price)} to listing value...`,
      `Building Cara's verdict...`
    ];
  }

  function clearCaraTimers() {
    caraTimers.forEach(clearTimeout);
    caraIntervals.forEach(clearInterval);

    caraTimers = [];
    caraIntervals = [];
  }

  function skeletonHTML() {
    return `
      <div class="rx-skeleton-shell" id="rxSkeleton">
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
        <div class="rx-skel-quad"></div>
      </div>
    `;
  }

  function contentHTML(car) {
    const fallbackImg = getBrandFallback(car);
    const imgs =
      car.images && car.images.length
        ? car.images
        : fallbackImg
          ? [fallbackImg]
          : [""];

    const slides = imgs
      .map(
        (src, i) => `
        <div class="rx-gallery-slide ${i === 0 ? "active" : ""}" data-index="${i}">
          ${
            src
              ? `<img src="${src}" alt="${car.brand} ${car.model}">`
              : `<span style="font-size:5rem">🚗</span>`
          }
        </div>
      `
      )
      .join("");

    const hasManyImages = imgs.length > 1;

    const arrows = hasManyImages
      ? `
        <button class="rx-gallery-arrow prev" id="rxGalPrev">‹</button>
        <button class="rx-gallery-arrow next" id="rxGalNext">›</button>
        <div class="rx-gallery-counter" id="rxGalCounter">1 / ${imgs.length}</div>
      `
      : "";

    const fabrikaPill = car.fabrika
      ? `<span class="rx-pill fabrika">⭐ Fabrika</span>`
      : "";

    const phone = normalizePhone(car.phone);
    const whatsappHref = phone ? `https://wa.me/${phone}` : "#";
    const callHref = phone ? `tel:+${phone}` : "#";

    const desc =
      car.description ||
      `This ${car.year} ${car.brand} ${car.model} is listed in ${car.city}. It has ${formatKm(
        car.mileage
      )}, ${car.transmission} transmission, and ${car.fuel} fuel type. Contact the seller for inspection and full details.`;

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
            <div class="rx-spec-row">
              <span class="rx-spec-key">Body</span>
              <span class="rx-spec-val">${car.body}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Drivetrain</span>
              <span class="rx-spec-val">${car.drivetrain}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Doors</span>
              <span class="rx-spec-val">${car.doors}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Seats</span>
              <span class="rx-spec-val">${car.seats}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Engine</span>
              <span class="rx-spec-val">${car.engine}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Owners</span>
              <span class="rx-spec-val">${car.owners}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Service</span>
              <span class="rx-spec-val">${car.service}</span>
            </div>

            <div class="rx-spec-row">
              <span class="rx-spec-key">Color</span>
              <span class="rx-spec-val">${car.color}</span>
            </div>
          </div>

          <div class="rx-info-actions">
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
              ${car.highlights
                .map((item) => `<div class="rx-desc-list-item">${item}</div>`)
                .join("")}
            </div>
          </div>

          <div class="rx-desc-section">
            <div class="rx-desc-label">What's Included</div>
            <div class="rx-desc-list">
              ${car.included
                .map((item) => `<div class="rx-desc-list-item">${item}</div>`)
                .join("")}
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
            <span class="rx-cara-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>

            <span class="rx-cara-think-text" id="rxCaraThinkText">
              Initializing...
            </span>
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
      </div>
    `;
  }

  function typeText(el, text, duration) {
    el.classList.remove("rx-done");
    el.textContent = "";

    const speed = Math.max(15, duration / text.length);
    let i = 0;

    const id = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);

      if (i >= text.length) {
        clearInterval(id);
        el.classList.add("rx-done");
      }
    }, speed);

    caraIntervals.push(id);
  }

  function runCaraAnalysis(car) {
    const thinkBox = document.getElementById("rxCaraThinking");
    const thinkText = document.getElementById("rxCaraThinkText");
    const verdictBox = document.getElementById("rxCaraVerdict");
    const verdictText = document.getElementById("rxCaraVerdictText");
    const ratingBox = document.getElementById("rxCaraRating");
    const barVerdict = document.getElementById("rxCaraBarVerdict");
    const needle = document.getElementById("rxCaraBarNeedle");

    if (!thinkBox) return;

    const score = caraScore(car);
    const verdict = caraVerdict(score, car);
    const lines = caraThinking(car);

    const lineMs = 800;

    lines.forEach((line, i) => {
      caraTimers.push(
        setTimeout(() => {
          thinkText.style.opacity = "0";

          caraTimers.push(
            setTimeout(() => {
              thinkText.textContent = line;
              thinkText.style.opacity = "1";
            }, 180)
          );
        }, i * lineMs)
      );
    });

    const afterThinking = lines.length * lineMs + 500;

    caraTimers.push(
      setTimeout(() => {
        thinkBox.style.opacity = "0";

        caraTimers.push(
          setTimeout(() => {
            thinkBox.style.display = "none";
            verdictBox.classList.add("rx-show");
            typeText(verdictText, verdict.text, 1500);
          }, 280)
        );
      }, afterThinking)
    );

    caraTimers.push(
      setTimeout(() => {
        barVerdict.textContent = verdict.label;
        barVerdict.style.color = verdict.color;
        needle.style.borderColor = verdict.color;
        ratingBox.classList.add("rx-show");

        requestAnimationFrame(() => {
          needle.style.left = score + "%";
        });
      }, afterThinking + 600)
    );
  }

  function getTargetRect() {
    return {
      w: window.innerWidth,
      h: window.innerHeight,
      left: 0,
      top: 0
    };
  }

  function getExpandedTransform() {
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;
    const w = Math.min(targetW * 0.95, 1700);
    const h = targetH * 0.9;
    const left = (targetW - w) / 2;
    const top = (targetH - h) / 2;

    return `translate(${left}px, ${top}px) scale(${w / targetW}, ${h / targetH})`;
  }

  function originTransform(origin, target) {
    return `
      translate(${origin.left - target.left}px, ${origin.top - target.top}px)
      scale(${origin.width / target.w}, ${origin.height / target.h})
    `;
  }

  function applyTarget(target) {
    card.style.left = target.left + "px";
    card.style.top = target.top + "px";
    card.style.width = target.w + "px";
    card.style.height = target.h + "px";

    shadow.style.left = target.left + "px";
    shadow.style.top = target.top + "px";
    shadow.style.width = target.w + "px";
    shadow.style.height = target.h + "px";
  }

  function triggerFullscreen() {
    if (state !== "expanded") return;

    state = "going-fullscreen";
    wheelAccum = 0;

    const navbar = document.querySelector(".navbar");

    if (navbar) {
      navbar.classList.add("rx-above-card");
      navbar.classList.add("scrolled");
    }

    card.style.transform = "translate(0, 0) scale(1, 1)";
    card.classList.add("rx-fullscreen");
    shadow.classList.remove("rx-visible");

    setTimeout(() => {
      state = "fullscreen";
    }, 620);
  }

  function wireGallery(total) {
    const gallery = document.getElementById("rxGallery");
    const prev = document.getElementById("rxGalPrev");
    const next = document.getElementById("rxGalNext");
    const counter = document.getElementById("rxGalCounter");

    if (!gallery) return;

    function show(index) {
      const slides = gallery.querySelectorAll(".rx-gallery-slide");

      if (!slides.length) return;

      slides[galleryIndex].classList.remove("active");

      galleryIndex = (index + total) % total;

      slides[galleryIndex].classList.add("active");

      if (counter) {
        counter.textContent = `${galleryIndex + 1} / ${total}`;
      }
    }

    prev?.addEventListener("click", (e) => {
      e.stopPropagation();
      show(galleryIndex - 1);
    });

    next?.addEventListener("click", (e) => {
      e.stopPropagation();
      show(galleryIndex + 1);
    });

    gallery.addEventListener("click", (e) => {
      if (e.target.closest(".rx-gallery-arrow")) return;

      const img = e.target.closest(".rx-gallery-slide img");
      if (!img) return;

      e.stopPropagation();
      openLightbox(img);
    });
  }

  async function openCard(cardEl, id) {
    if (isOpen) return;

    const car = await getCar(id);

    if (!car) {
      alert("Car details could not be loaded.");
      return;
    }

    isOpen = true;
    state = "opening";
    galleryIndex = 0;

    originCardEl = cardEl;
    originRect = cardEl.getBoundingClientRect();

    const target = getTargetRect();

    content.innerHTML = skeletonHTML();

    card.classList.remove("rx-content-ready");
    card.style.display = "block";

    shadow.style.display = "block";

    applyTarget(target);

    card.classList.remove(
      "rx-animating",
      "rx-open",
      "rx-visible-fade",
      "rx-fullscreen",
      "rx-closing"
    );

    card.style.transform = originTransform(originRect, target);

    overlay.classList.add("rx-visible");
    document.body.classList.add("rx-card-lock");

    const navbarEl = document.querySelector(".navbar");
    wasScrolledNav = navbarEl ? navbarEl.classList.contains("scrolled") : false;

    void card.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add("rx-animating", "rx-visible-fade");
        card.style.transform = getExpandedTransform();

        setTimeout(() => {
          shadow.classList.add("rx-visible");
          card.classList.add("rx-open");
        }, 380);

        setTimeout(() => {
          state = "expanded";
          wheelAccum = 0;
        }, 620);
      });
    });

    loadTimer = setTimeout(() => {
      content.insertAdjacentHTML("beforeend", contentHTML(car));

      const total = car.images && car.images.length ? car.images.length : 1;

      wireGallery(total);

      requestAnimationFrame(() => {
        card.classList.add("rx-content-ready");

        const skel = document.getElementById("rxSkeleton");

        if (skel) {
          skel.classList.add("rx-hide");

          setTimeout(() => {
            skel.remove();
          }, 350);
        }

        setTimeout(() => {
          runCaraAnalysis(car);
        }, 400);
      });
    }, 700);
  }

  function closeCard() {
    if (!isOpen || !originRect) return;

    if (loadTimer) clearTimeout(loadTimer);

    clearCaraTimers();

    state = "closing";

    const target = getTargetRect();

    if (originCardEl && document.body.contains(originCardEl)) {
      originRect = originCardEl.getBoundingClientRect();
    }

    card.classList.add("rx-closing");
    card.classList.remove("rx-open", "rx-fullscreen");
    shadow.classList.remove("rx-visible");

    requestAnimationFrame(() => {
      card.style.transform = originTransform(originRect, target);
    });

    overlay.classList.remove("rx-visible");

    const navbarEl = document.querySelector(".navbar");

    if (navbarEl) {
      navbarEl.classList.remove("rx-above-card");

      if (!wasScrolledNav) {
        navbarEl.classList.remove("scrolled");
      }
    }

    setTimeout(() => {
      card.style.display = "none";
      shadow.style.display = "none";

      card.classList.remove(
        "rx-animating",
        "rx-visible-fade",
        "rx-content-ready",
        "rx-closing"
      );

      content.innerHTML = "";

      document.body.classList.remove("rx-card-lock");

      isOpen = false;
      state = "closed";
      originRect = null;
      originCardEl = null;
      wheelAccum = 0;
    }, 600);
  }

  function getLightboxTarget(aspect) {
    const pad = 100;
    const maxW = window.innerWidth - pad;
    const maxH = window.innerHeight - pad;

    let w = maxW;
    let h = maxW / aspect;

    if (h > maxH) {
      h = maxH;
      w = maxH * aspect;
    }

    return {
      w,
      h,
      left: (window.innerWidth - w) / 2,
      top: (window.innerHeight - h) / 2
    };
  }

  function openLightbox(srcImg) {
    if (lightboxOpen) return;

    lightboxOpen = true;

    const origin = srcImg.getBoundingClientRect();

    lbOriginRect = origin;
    lbImgInner.src = srcImg.src;
    lbImgInner.alt = srcImg.alt || "";

    const begin = () => {
      const nw = lbImgInner.naturalWidth || origin.width;
      const nh = lbImgInner.naturalHeight || origin.height;
      const aspect = nw / nh;

      const target = getLightboxTarget(aspect);

      lbTargetCache = target;

      lbImg.style.display = "block";
      lbImg.style.left = target.left + "px";
      lbImg.style.top = target.top + "px";
      lbImg.style.width = target.w + "px";
      lbImg.style.height = target.h + "px";

      const sx = origin.width / target.w;
      const sy = origin.height / target.h;
      const tx = origin.left - target.left;
      const ty = origin.top - target.top;

      lbImg.classList.remove("rx-animating");
      lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;

      lbOverlay.classList.add("rx-visible");

      void lbImg.offsetWidth;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lbImg.classList.add("rx-animating");
          lbImg.style.transform = "translate(0, 0) scale(1, 1)";

          setTimeout(() => {
            lbClose.classList.add("rx-visible");
          }, 250);
        });
      });
    };

    if (lbImgInner.complete && lbImgInner.naturalWidth) {
      begin();
    } else {
      lbImgInner.onload = begin;
    }
  }

  function closeLightbox() {
    if (!lightboxOpen || !lbOriginRect || !lbTargetCache) return;

    lightboxOpen = false;

    const origin = lbOriginRect;
    const target = lbTargetCache;

    const sx = origin.width / target.w;
    const sy = origin.height / target.h;
    const tx = origin.left - target.left;
    const ty = origin.top - target.top;

    lbClose.classList.remove("rx-visible");

    requestAnimationFrame(() => {
      lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    });

    lbOverlay.classList.remove("rx-visible");

    setTimeout(() => {
      lbImg.style.display = "none";
      lbImg.classList.remove("rx-animating");

      lbOriginRect = null;
      lbTargetCache = null;
    }, 500);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".car-action-btn")) return;
    if (e.target.closest(".rx-action-btn")) return;
    if (e.target.closest(".carousel-arrow")) return;

    const cardEl = e.target.closest(".car-card-placeholder");

    if (!cardEl) return;

    const id = cardEl.dataset.id;

    if (!id) {
      console.error("No data-id found on clicked car card");
      return;
    }

    openCard(cardEl, id);
  });

  closeBtn.addEventListener("click", closeCard);
  overlay.addEventListener("click", closeCard);

  lbOverlay.addEventListener("click", closeLightbox);
  lbClose.addEventListener("click", closeLightbox);
  lbImg.addEventListener("click", closeLightbox);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (lightboxOpen) {
        closeLightbox();
      } else if (isOpen) {
        closeCard();
      }
    }
  });

  card.addEventListener(
    "wheel",
    (e) => {
      if (state !== "expanded") return;

      e.preventDefault();

      if (e.deltaY <= 0) {
        wheelAccum = Math.max(0, wheelAccum - Math.abs(e.deltaY) * 0.5);
        return;
      }

      wheelAccum += e.deltaY;

      if (wheelAccum >= 100) {
        triggerFullscreen();
      }
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    if (!isOpen) return;

    const target = getTargetRect();

    card.classList.remove("rx-animating");
    applyTarget(target);

    if (state === "fullscreen" || state === "going-fullscreen") {
      card.style.transform = "translate(0, 0) scale(1, 1)";
    } else if (state === "expanded" || state === "opening") {
      card.style.transform = getExpandedTransform();
    }
  });
})();