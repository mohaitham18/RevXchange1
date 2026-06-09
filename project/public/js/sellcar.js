document.addEventListener('DOMContentLoaded', () => {

  // ── State ─────────────────────────────────────────────────────
  let images = [];            // car photos uploaded by user
  let historyDocuments = [];  // service/history docs uploaded
  let carouselIndex = 0;      // which image is showing in preview

  // ── Get DOM Elements ──────────────────────────────────────────
  const contactProfileInfo   = document.getElementById('contactProfileInfo');
  const rxUser               = localStorage.getItem('rxUser');
  const rxEmail              = localStorage.getItem('rxEmail');

  const carInfo              = document.getElementById('carInfo');
  const kmsDriven            = document.getElementById('kmsDriven');
  const carPrice             = document.getElementById('carPrice');
  const priceLabel           = document.getElementById('priceLabel');
  const priceSectionTitle    = document.getElementById('priceSectionTitle');
  const rentExtraFields      = document.getElementById('rentExtraFields');
  const rentPricePerMonth    = document.getElementById('rentPricePerMonth');
  const rentDeposit          = document.getElementById('rentDeposit');
  const citySelect           = document.getElementById('citySelect');
  const carDesc              = document.getElementById('carDesc');
  const bodySelect           = document.getElementById('bodySelect');
  const drivetrainSelect     = document.getElementById('drivetrainSelect');
  const doorsSelect          = document.getElementById('doorsSelect');
  const seatsSelect          = document.getElementById('seatsSelect');
  const engineInput          = document.getElementById('engineInput');
  const ownerSelect          = document.getElementById('ownerSelect');
  const serviceSelect        = document.getElementById('serviceSelect');
  const historyDocumentsInput = document.getElementById('historyDocumentsInput');
  const historyDocsZone      = document.getElementById('historyDocsZone');
  const historyDocsList      = document.getElementById('historyDocsList');
  const imgInput             = document.getElementById('imgInput');
  const imgThumbs            = document.getElementById('imgThumbs');
  const uploadZone           = document.getElementById('uploadZone');
  const phoneInput           = document.getElementById('phoneNumber');

  // Preview elements
  const previewTitle         = document.getElementById('previewTitle');
  const previewPrice         = document.getElementById('previewPrice');
  const previewCity          = document.getElementById('previewCity');
  const previewKm            = document.getElementById('previewKm');
  const previewTransmission  = document.getElementById('previewTransmission');
  const previewFuel          = document.getElementById('previewFuel');
  const previewFabrika       = document.getElementById('previewFabrika');
  const previewPlaceholder   = document.getElementById('previewPlaceholder');
  const sellCarousel         = document.getElementById('sellCarousel');
  const carouselTrack        = document.getElementById('carouselTrack');
  const carouselCounter      = document.getElementById('carouselCounter');
  const carouselPrev         = document.getElementById('carouselPrev');
  const carouselNext         = document.getElementById('carouselNext');

  // ── Active Selections (chip/toggle state) ─────────────────────
  let activeTransmission = 'Automatic';
  let activeFuel         = 'Gas';
  let activeFabrika      = 'no';
  let activeCondition    = 'Used';
  let activeListingType  = 'sale';

  // Track which fields the user has already touched
  const dirtyFields = new Set();

  // ── Show User Profile in Contact Section ──────────────────────
  if (contactProfileInfo) {
    if (rxUser) {
      contactProfileInfo.innerHTML = `
        <div class="sell-contact-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <div class="sell-contact-details">
          <div class="sell-contact-name">${rxUser}</div>
          ${rxEmail ? `<div class="sell-contact-email">${rxEmail}</div>` : '<div class="sell-contact-email">No email saved</div>'}
        </div>
      `;
    } else {
      contactProfileInfo.innerHTML = `
        <div class="sell-contact-details">
          <span class="sell-contact-guest">
            You're not logged in. <a href="login.html">Login</a> to auto-fill your details.
          </span>
        </div>
      `;
    }
  }

  // ── Helper: Check if a number value is safe ───────────────────
  // Returns true only if the value is a whole positive number with no negative sign
  function isSafePositiveNumber(val) {
    const str = String(val).trim();
    if (!str || str.startsWith('-')) return false;
    const num = Number(str);
    return !isNaN(num) && num > 0 && Number.isInteger(num);
  }

  // Same but allows zero (for mileage of new cars)
  function isSafeNonNegativeNumber(val) {
    const str = String(val).trim();
    if (!str || str.startsWith('-')) return false;
    const num = Number(str);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
  }

  // ── Live Preview ──────────────────────────────────────────────
  function ensurePreviewThirdButton() {
    const actions = document.querySelector('.sell-preview-actions');
    if (!actions) return;
    let btn = document.getElementById('previewAppointmentBtn');
    if (!btn) {
      btn = document.createElement('span');
      btn.id = 'previewAppointmentBtn';
      btn.className = 'sell-preview-action-btn appointment';
      actions.appendChild(btn);
    }
    btn.textContent = activeListingType === 'rent' ? 'Rent Request' : 'Appointment';
  }

  function updatePreview() {
    if (previewTitle) previewTitle.textContent = carInfo?.value.trim() || 'Your Car Title';

    const dailyPrice   = carPrice?.value.trim();
    const monthlyPrice = rentPricePerMonth?.value.trim();

    if (previewPrice) {
      if (activeListingType === 'rent') {
        if (dailyPrice && monthlyPrice) {
          previewPrice.textContent = `${parseInt(dailyPrice, 10).toLocaleString('en-EG')} EGP / day · ${parseInt(monthlyPrice, 10).toLocaleString('en-EG')} EGP / month`;
        } else if (dailyPrice) {
          previewPrice.textContent = `${parseInt(dailyPrice, 10).toLocaleString('en-EG')} EGP / day`;
        } else {
          previewPrice.textContent = 'Daily and monthly rent not set';
        }
      } else if (dailyPrice) {
        previewPrice.textContent = parseInt(dailyPrice, 10).toLocaleString('en-EG') + ' EGP';
      } else {
        previewPrice.textContent = 'Price not set';
      }
    }

    if (previewCity) previewCity.textContent = '📍 ' + (citySelect?.value || '—');

    const km = kmsDriven?.value.trim();
    if (previewKm) previewKm.textContent = km ? '🛣️ ' + parseInt(km, 10).toLocaleString() + ' km' : '🛣️ — km';
    if (previewTransmission) previewTransmission.textContent = activeTransmission;
    if (previewFuel) previewFuel.textContent = activeFuel;
    if (previewFabrika) previewFabrika.style.display = activeFabrika === 'yes' ? 'inline-flex' : 'none';

    ensurePreviewThirdButton();
  }

  function updateListingTypeUI() {
    const isRent = activeListingType === 'rent';
    if (priceSectionTitle) priceSectionTitle.textContent = isRent ? 'Rent Price' : 'Sale Price';
    if (priceLabel) priceLabel.textContent = isRent ? 'Daily Rent (EGP)' : 'Price (EGP)';
    if (carPrice) carPrice.placeholder = isRent ? 'e.g., 1500' : 'e.g., 850000';
    if (rentExtraFields) rentExtraFields.style.display = isRent ? '' : 'none';
    updatePreview();
  }

  // Update preview whenever these inputs change
  [carInfo, kmsDriven, carPrice, citySelect, rentPricePerMonth, rentDeposit].forEach(el => {
    el?.addEventListener('input', updatePreview);
    el?.addEventListener('change', updatePreview);
  });

  // ── Chips & Toggles ───────────────────────────────────────────
  function initChips(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.sell-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.sell-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        onSelect(chip.dataset.val);
        updatePreview();
      });
    });
  }

  initChips('fuelChips',         val => { activeFuel = val; });
  initChips('transmissionChips', val => { activeTransmission = val; });
  initChips('fabrikaChips',      val => { activeFabrika = val; });

  document.getElementById('conditionToggle')?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('conditionToggle').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCondition = btn.dataset.val;
    });
  });

  document.getElementById('listingTypeToggle')?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('listingTypeToggle').querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeListingType = btn.dataset.val === 'rent' ? 'rent' : 'sale';
      if (activeListingType === 'sale') {
        RXValidation.clearState(rentPricePerMonth);
        RXValidation.clearState(rentDeposit);
      }
      updateListingTypeUI();
      validatePrice();
      validateRentFields();
    });
  });

  document.querySelectorAll('.sell-color-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sell-color-item').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // ── Image Upload ──────────────────────────────────────────────
  uploadZone?.addEventListener('click', () => imgInput?.click());

  uploadZone?.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--primary)';
  });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
  });

  uploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    handleFiles(Array.from(e.dataTransfer.files));
  });

  imgInput?.addEventListener('change', () => {
    handleFiles(Array.from(imgInput.files));
    imgInput.value = '';
  });

  function handleFiles(files) {
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (images.length >= 20) return;
      images.push({ url: URL.createObjectURL(file), file });
    });
    renderThumbs();
    renderCarousel();
    if (uploadZone && images.length > 0) {
      uploadZone.classList.remove('rx-zone-invalid');
      uploadZone.classList.add('rx-zone-valid');
    }
  }

  function renderThumbs() {
    if (!imgThumbs) return;
    imgThumbs.innerHTML = images.map((img, i) => `
      <div class="sell-thumb ${i === 0 ? 'cover' : ''}">
        <img src="${img.url}" alt="Car image ${i + 1}">
        ${i === 0 ? '<span class="sell-thumb-cover-badge">Cover</span>' : ''}
        <button class="sell-thumb-remove" data-index="${i}">✕</button>
      </div>
    `).join('');

    imgThumbs.querySelectorAll('.sell-thumb-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        images.splice(parseInt(btn.dataset.index, 10), 1);
        if (carouselIndex >= images.length) carouselIndex = Math.max(0, images.length - 1);
        renderThumbs();
        renderCarousel();
        if (uploadZone && images.length === 0) uploadZone.classList.remove('rx-zone-valid');
      });
    });
  }

  function renderCarousel() {
    if (!previewPlaceholder || !sellCarousel || !carouselTrack) return;
    if (images.length === 0) {
      previewPlaceholder.style.display = 'flex';
      sellCarousel.style.display = 'none';
      return;
    }
    previewPlaceholder.style.display = 'none';
    sellCarousel.style.display = 'block';
    carouselTrack.innerHTML = images.map((img, i) => `
      <div class="sell-carousel-slide ${i === carouselIndex ? 'active' : ''}">
        <img src="${img.url}" alt="Slide ${i + 1}">
      </div>
    `).join('');
    if (carouselCounter) carouselCounter.textContent = `${carouselIndex + 1} / ${images.length}`;
    if (carouselPrev) carouselPrev.style.display = images.length > 1 ? 'flex' : 'none';
    if (carouselNext) carouselNext.style.display = images.length > 1 ? 'flex' : 'none';
  }

  carouselPrev?.addEventListener('click', () => {
    if (!images.length) return;
    carouselIndex = (carouselIndex - 1 + images.length) % images.length;
    renderCarousel();
  });

  carouselNext?.addEventListener('click', () => {
    if (!images.length) return;
    carouselIndex = (carouselIndex + 1) % images.length;
    renderCarousel();
  });

  // ── History Documents Upload ───────────────────────────────────
  function isAllowedHistoryDocument(file) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    return allowed.includes(file.type);
  }

  function handleHistoryDocuments(files) {
    const accepted = [];
    files.forEach(file => {
      if (!isAllowedHistoryDocument(file)) return;
      if (file.size > 5 * 1024 * 1024) return; // max 5MB per file
      if (historyDocuments.length + accepted.length >= 5) return; // max 5 files
      accepted.push({ file, name: file.name, type: file.type, size: file.size });
    });
    historyDocuments = [...historyDocuments, ...accepted];
    renderHistoryDocuments();
    if (historyDocuments.length > 0 && historyDocumentsInput) {
      RXValidation.showSuccess(historyDocumentsInput);
    }
  }

  function renderHistoryDocuments() {
    if (!historyDocsList) return;
    if (!historyDocuments.length) { historyDocsList.innerHTML = ''; return; }
    historyDocsList.innerHTML = historyDocuments.map((doc, index) => `
      <div class="sell-doc-item">
        <span class="sell-doc-file-icon">${doc.type === 'application/pdf' ? '📕' : '🖼️'}</span>
        <div class="sell-doc-meta">
          <strong>${doc.name}</strong>
          <small>${(doc.size / 1024 / 1024).toFixed(2)} MB</small>
        </div>
        <button type="button" class="sell-doc-remove" data-index="${index}">✕</button>
      </div>
    `).join('');

    historyDocsList.querySelectorAll('.sell-doc-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        historyDocuments.splice(parseInt(btn.dataset.index, 10), 1);
        renderHistoryDocuments();
        if (historyDocumentsInput) validateHistoryDocuments();
      });
    });
  }

  historyDocsZone?.addEventListener('click', e => {
    if (e.target.closest('.sell-upload-link')) return;
    historyDocumentsInput?.click();
  });

  historyDocsZone?.addEventListener('dragover', e => {
    e.preventDefault();
    historyDocsZone.classList.add('rx-zone-valid');
  });

  historyDocsZone?.addEventListener('dragleave', () => {
    historyDocsZone.classList.remove('rx-zone-valid');
  });

  historyDocsZone?.addEventListener('drop', e => {
    e.preventDefault();
    historyDocsZone.classList.remove('rx-zone-valid');
    handleHistoryDocuments(Array.from(e.dataTransfer.files));
  });

  historyDocumentsInput?.addEventListener('change', () => {
    handleHistoryDocuments(Array.from(historyDocumentsInput.files));
    historyDocumentsInput.value = '';
  });

  // ── Validation Functions ──────────────────────────────────────

  // Car Info: must be "Brand Model Year" format e.g. "Toyota Camry 2022"
  function validateCarInfo() {
    if (!RXValidation.validators.carInfo(carInfo?.value || '')) {
      RXValidation.showError(carInfo, 'Enter brand, model & year (e.g. Toyota Camry 2022)');
      return false;
    }
    RXValidation.showSuccess(carInfo);
    return true;
  }

  // KMs Driven: must be 0 or more, no negatives, no decimals
  function validateKms() {
    const val = String(kmsDriven?.value ?? '').trim();

    // Empty check
    if (!val) {
      RXValidation.showError(kmsDriven, 'Enter the mileage (use 0 for new cars)');
      return false;
    }

    // Block negative sign
    if (val.startsWith('-')) {
      RXValidation.showError(kmsDriven, 'Mileage cannot be negative');
      return false;
    }

    const num = Number(val);

    // Block decimals and non-numbers
    if (isNaN(num) || !Number.isInteger(num)) {
      RXValidation.showError(kmsDriven, 'Mileage must be a whole number');
      return false;
    }

    // Block unrealistic values
    if (num > 1000000) {
      RXValidation.showError(kmsDriven, 'Mileage seems too high — max 1,000,000 km');
      return false;
    }

    RXValidation.showSuccess(kmsDriven);
    return true;
  }

  // Price: must be a positive whole number, no negatives
  function validatePrice() {
    const val = String(carPrice?.value ?? '').trim();

    // Empty check
    if (!val) {
      RXValidation.showError(carPrice, activeListingType === 'rent' ? 'Enter a daily rent price' : 'Enter a sale price');
      return false;
    }

    // Block negative sign
    if (val.startsWith('-')) {
      RXValidation.showError(carPrice, 'Price cannot be negative');
      return false;
    }

    const num = Number(val);

    // Block decimals and non-numbers
    if (isNaN(num) || !Number.isInteger(num)) {
      RXValidation.showError(carPrice, 'Price must be a whole number');
      return false;
    }

    // Block zero
    if (num <= 0) {
      RXValidation.showError(carPrice, 'Price must be greater than 0');
      return false;
    }

    // Minimum for rent
    if (activeListingType === 'rent' && num < 100) {
      RXValidation.showError(carPrice, 'Daily rent must be at least 100 EGP');
      return false;
    }

    // Minimum for sale
    if (activeListingType === 'sale' && num < 10000) {
      RXValidation.showError(carPrice, 'Sale price must be at least 10,000 EGP');
      return false;
    }

    // Maximum sanity check
    if (num > 100000000) {
      RXValidation.showError(carPrice, 'Price seems too high — max 100,000,000 EGP');
      return false;
    }

    RXValidation.showSuccess(carPrice);
    return true;
  }

  // Rent Fields: monthly price and deposit validation
  function validateRentFields() {
    // Only validate rent fields when listing type is rent
    if (activeListingType !== 'rent') {
      RXValidation.clearState(rentPricePerMonth);
      RXValidation.clearState(rentDeposit);
      return true;
    }

    const daily      = Number(carPrice?.value || 0);
    const monthlyVal = String(rentPricePerMonth?.value ?? '').trim();
    const depositVal = String(rentDeposit?.value ?? '').trim();

    // Monthly rent: required
    if (!monthlyVal) {
      RXValidation.showError(rentPricePerMonth, 'Enter a monthly rent price');
      return false;
    }

    if (monthlyVal.startsWith('-')) {
      RXValidation.showError(rentPricePerMonth, 'Monthly rent cannot be negative');
      return false;
    }

    const monthly = Number(monthlyVal);

    if (isNaN(monthly) || !Number.isInteger(monthly) || monthly <= 0) {
      RXValidation.showError(rentPricePerMonth, 'Monthly rent must be a positive whole number');
      return false;
    }

    if (monthly < 1000) {
      RXValidation.showError(rentPricePerMonth, 'Monthly rent must be at least 1,000 EGP');
      return false;
    }

    if (daily > 0 && monthly <= daily) {
      RXValidation.showError(rentPricePerMonth, 'Monthly rent must be higher than daily rent');
      return false;
    }

    RXValidation.showSuccess(rentPricePerMonth);

    // Deposit: optional but if entered must be 0 or more
    if (depositVal !== '') {
      if (depositVal.startsWith('-')) {
        RXValidation.showError(rentDeposit, 'Deposit cannot be negative');
        return false;
      }

      const deposit = Number(depositVal);

      if (isNaN(deposit) || !Number.isInteger(deposit) || deposit < 0) {
        RXValidation.showError(rentDeposit, 'Deposit must be 0 or more');
        return false;
      }

      RXValidation.showSuccess(rentDeposit);
    } else {
      RXValidation.clearState(rentDeposit);
    }

    return true;
  }

  // Engine: required, must contain a number or electric keyword
  function validateEngine() {
    const value = (engineInput?.value || '').trim();

    if (!value || value.startsWith('-')) {
      RXValidation.showError(engineInput, 'Engine is required, e.g. 1.6L Turbo or Electric Motor');
      return false;
    }

    if (value.length < 2 || value.length > 35) {
      RXValidation.showError(engineInput, 'Engine must be between 2 and 35 characters');
      return false;
    }

    if (!/^[A-Za-z0-9\s.+\-/]+$/.test(value)) {
      RXValidation.showError(engineInput, 'Engine can only contain letters, numbers, spaces, dot, +, /, or -');
      return false;
    }

    const hasNumber      = /\d/.test(value);
    const isElectricText = /\b(electric|ev|hybrid|motor)\b/i.test(value);

    if (!hasNumber && !isElectricText) {
      RXValidation.showError(engineInput, 'Add an engine size like 1.6L, 2.0 Turbo, V6, or Electric Motor');
      return false;
    }

    RXValidation.showSuccess(engineInput);
    return true;
  }

  // History Documents: required if service history is not "No History"
  function validateHistoryDocuments() {
    if (!historyDocumentsInput) return true;
    const needsDocs = serviceSelect && serviceSelect.value !== 'No History';
    if (needsDocs && historyDocuments.length === 0) {
      RXValidation.showError(historyDocumentsInput, 'Upload at least one service-history document, or choose No History');
      return false;
    }
    RXValidation.clearState(historyDocumentsInput);
    return true;
  }

  // City: must select a city from the dropdown
  function validateCity() {
    if (!RXValidation.validators.select(citySelect?.value || '')) {
      RXValidation.showError(citySelect, 'Please select your city');
      return false;
    }
    RXValidation.showSuccess(citySelect);
    return true;
  }

// Phone: user types 10 digits starting with 10/11/12/15 (no leading 0)
  function validatePhone() {
    const digits = (phoneInput?.value || '').replace(/\D/g, '');

    if (digits.length === 0) {
      RXValidation.showError(phoneInput, 'Please enter your phone number');
      return false;
    }

    if (digits.length !== 10) {
      RXValidation.showError(phoneInput, 'Phone number must be exactly 10 digits');
      return false;
    }

    if (!/^(10|11|12|15)/.test(digits)) {
      RXValidation.showError(phoneInput, 'Number must start with 10, 11, 12, or 15');
      return false;
    }

    RXValidation.showSuccess(phoneInput);
    return true;
  }

  // Description: optional but if entered must be at least 20 chars
  function validateDesc() {
    const val = carDesc?.value || '';
    if (!RXValidation.validators.optionalMinLength(val, 20)) {
      RXValidation.showError(carDesc, 'Too short — add at least 20 characters');
      return false;
    }
    if (val.trim().length > 0) {
      RXValidation.showSuccess(carDesc);
    } else {
      RXValidation.clearState(carDesc);
    }
    return true;
  }

  // Run all validations at once before submit
  function validateAll() {
    return [
      validateCarInfo(),
      validateKms(),
      validateCity(),
      validatePrice(),
      validateRentFields(),
      validateEngine(),
      validateHistoryDocuments(),
      validateDesc(),
      validatePhone()
    ].every(Boolean);
  }

  // ── Dirty Validation (validate on blur, re-validate on input) ─
  // Only shows errors after user has touched a field
  function enableDirtyValidation(el, validateFn) {
    if (!el) return;
    el.addEventListener('blur', () => {
      dirtyFields.add(el.id);
      validateFn();
    });
    el.addEventListener('input', () => {
      if (dirtyFields.has(el.id)) validateFn();
    });
  }

  enableDirtyValidation(carInfo,         validateCarInfo);
  enableDirtyValidation(kmsDriven,       validateKms);
  enableDirtyValidation(carPrice,        () => { validatePrice(); validateRentFields(); });
  enableDirtyValidation(rentPricePerMonth, validateRentFields);
  enableDirtyValidation(rentDeposit,     validateRentFields);
  enableDirtyValidation(engineInput,     validateEngine);
  enableDirtyValidation(carDesc,         validateDesc);

  citySelect?.addEventListener('change', validateCity);
  serviceSelect?.addEventListener('change', validateHistoryDocuments);

  // Phone: auto-format to digits only, max 11 digits
  phoneInput?.addEventListener('input', () => {
    const digits = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    phoneInput.value = digits;
    dirtyFields.add('phoneNumber');
    if (digits.length === 0) {
      RXValidation.clearState(phoneInput);
    } else if (digits.length >= 10) {
      validatePhone();
    }
  });

  phoneInput?.addEventListener('blur', () => {
    const digits = (phoneInput.value || '').replace(/\D/g, '');
    if (digits.length > 0) validatePhone();
  });

  // ── Submit ────────────────────────────────────────────────────
  document.getElementById('sellSubmitBtn')?.addEventListener('click', async () => {

    // Run all validations first
    if (!validateAll()) {
      // Scroll to the first error on the page
      document.querySelector('.rx-invalid, .rx-zone-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('rxToken');
    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    const submitBtn = document.getElementById('sellSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Posting...'; }

    // Parse brand, model, year from carInfo field
    const carInfoVal = carInfo?.value.trim().split(/\s+/);
    const brand = (carInfoVal?.[0] || '').replace(/,/g, '');
    const model = (carInfoVal?.[1] || '').replace(/,/g, '');
    const year  = parseInt(carInfoVal?.[carInfoVal.length - 1], 10) || new Date().getFullYear();

    const selectedColor = document.querySelector('.sell-color-item.active')?.dataset.color || '';

    // Build form data to send to server
    const formData = new FormData();

    formData.append('brand', brand);
    formData.append('model', model);
    formData.append('year',  year);
    formData.append('price', parseInt(carPrice?.value, 10));
    formData.append('listingType', activeListingType);

    formData.append('rentPricePerDay',
      activeListingType === 'rent' ? parseInt(carPrice?.value, 10) : ''
    );

    formData.append('rentPricePerMonth',
      activeListingType === 'rent' && rentPricePerMonth?.value ? parseInt(rentPricePerMonth.value, 10) : ''
    );

    formData.append('rentDeposit',
      activeListingType === 'rent' && rentDeposit?.value ? parseInt(rentDeposit.value, 10) : ''
    );

    formData.append('mileage',      parseInt(kmsDriven?.value, 10));
    formData.append('city',         citySelect?.value);
    formData.append('condition',    activeCondition.toLowerCase());
    formData.append('transmission', activeTransmission.toLowerCase());
    formData.append('fuel',         activeFuel.toLowerCase());
    formData.append('color',        selectedColor);
    formData.append('description',  carDesc?.value.trim());
    formData.append('phone',        phoneInput?.value.trim() || '');
    formData.append('fabrika',      activeFabrika === 'yes');
    formData.append('body',         bodySelect?.value || 'Sedan');
    formData.append('drivetrain',   drivetrainSelect?.value || 'FWD');
    formData.append('doors',        parseInt(doorsSelect?.value, 10) || 4);
    formData.append('seats',        parseInt(seatsSelect?.value, 10) || 5);
    formData.append('engine',       engineInput?.value.trim() || 'Not specified');
    formData.append('owners',       ownerSelect?.value || 'First Owner');
    formData.append('service',      serviceSelect?.value || 'Full History');

    formData.append('highlights', JSON.stringify([
      'Seller description available',
      'Contact seller for inspection details',
      'Check service history before purchase'
    ]));

    formData.append('included', JSON.stringify([
      'Documents available from seller',
      'Contact seller for included accessories'
    ]));

    // Attach history documents
    historyDocuments.forEach(doc => {
      if (doc.file) formData.append('historyDocuments', doc.file);
    });

    // Attach car images
    images.forEach(img => {
      if (img.file) formData.append('images', img.file);
    });

    try {
      const res = await fetch('/api/cars', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Something went wrong');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post My Ad'; }
        return;
      }

      alert('Your ad has been posted! 🎉');
      window.location.href = '/dashboard.html?tab=ads';

    } catch (err) {
      console.error('Submit error:', err);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Post My Ad'; }
      alert('Server error. Please try again.');
    }
  });

  // ── Init ──────────────────────────────────────────────────────
  updateListingTypeUI();
  updatePreview();

});