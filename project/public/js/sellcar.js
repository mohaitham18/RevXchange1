document.addEventListener('DOMContentLoaded', () => {

    // ── State ──────────────────────────────────────────────────
    let images = [];
    let carouselIndex = 0;

    // ── Contact profile info ───────────────────────────────────
    const contactProfileInfo = document.getElementById('contactProfileInfo');
    const rxUser  = localStorage.getItem('rxUser');
    const rxEmail = localStorage.getItem('rxEmail');

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

    // ── DOM refs ───────────────────────────────────────────────
    const carInfo      = document.getElementById('carInfo');
    const kmsDriven    = document.getElementById('kmsDriven');
    const carPrice     = document.getElementById('carPrice');
    const citySelect   = document.getElementById('citySelect');
    const carDesc      = document.getElementById('carDesc');
    const imgInput     = document.getElementById('imgInput');
    const imgThumbs    = document.getElementById('imgThumbs');
    const uploadZone   = document.getElementById('uploadZone');

    // Preview refs
    const previewTitle        = document.getElementById('previewTitle');
    const previewPrice        = document.getElementById('previewPrice');
    const previewCity         = document.getElementById('previewCity');
    const previewKm           = document.getElementById('previewKm');
    const previewTransmission = document.getElementById('previewTransmission');
    const previewFuel         = document.getElementById('previewFuel');
    const previewFabrika      = document.getElementById('previewFabrika');
    const previewPlaceholder  = document.getElementById('previewPlaceholder');
    const sellCarousel        = document.getElementById('sellCarousel');
    const carouselTrack       = document.getElementById('carouselTrack');
    const carouselCounter     = document.getElementById('carouselCounter');
    const carouselPrev        = document.getElementById('carouselPrev');
    const carouselNext        = document.getElementById('carouselNext');

    // Active values
    let activeTransmission = 'Automatic';
    let activeFuel         = 'Gas';
    let activeFabrika      = 'no';
    let activeCondition    = 'Used';

    // ── Live preview updater ───────────────────────────────────
    function updatePreview() {
        const title = carInfo?.value.trim() || 'Your Car Title';
        previewTitle.textContent = title;

        const price = carPrice?.value.trim();
        previewPrice.textContent = price
            ? parseInt(price).toLocaleString('en-EG') + ' EGP'
            : 'Price not set';

        const city = citySelect?.value || '—';
        previewCity.textContent = '📍 ' + city;

        const km = kmsDriven?.value.trim();
        previewKm.textContent = km
            ? '🛣️ ' + parseInt(km).toLocaleString() + ' km'
            : '🛣️ — km';

        previewTransmission.textContent = activeTransmission;
        previewFuel.textContent = activeFuel;
        previewFabrika.style.display = activeFabrika === 'yes' ? 'inline-flex' : 'none';
    }

    // ── Input listeners ────────────────────────────────────────
    [carInfo, kmsDriven, carPrice, citySelect].forEach(el => {
        el?.addEventListener('input', updatePreview);
        el?.addEventListener('change', updatePreview);
    });

    // ── Chip groups ────────────────────────────────────────────
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

    initChips('fuelChips', val => activeFuel = val);
    initChips('transmissionChips', val => activeTransmission = val);
    initChips('fabrikaChips', val => activeFabrika = val);

    // ── Toggle (Condition) ─────────────────────────────────────
    const conditionToggle = document.getElementById('conditionToggle');
    conditionToggle?.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            conditionToggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCondition = btn.dataset.val;
        });
    });

    // ── Color picker ───────────────────────────────────────────
    document.querySelectorAll('.sell-color-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.sell-color-item').forEach(c => c.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // ── Image upload ───────────────────────────────────────────
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
            const url = URL.createObjectURL(file);
            images.push({ url, file });
        });
        renderThumbs();
        renderCarousel();
        // Sync upload zone validation state
        const zone = document.getElementById('uploadZone');
        if (zone && images.length > 0) {
            zone.classList.remove('rx-zone-invalid');
            zone.classList.add('rx-zone-valid');
        }
    }

    function renderThumbs() {
        imgThumbs.innerHTML = images.map((img, i) => `
            <div class="sell-thumb ${i === 0 ? 'cover' : ''}">
                <img src="${img.url}" alt="Car image ${i+1}">
                ${i === 0 ? '<span class="sell-thumb-cover-badge">Cover</span>' : ''}
                <button class="sell-thumb-remove" data-index="${i}">✕</button>
            </div>
        `).join('');

        imgThumbs.querySelectorAll('.sell-thumb-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                images.splice(parseInt(btn.dataset.index), 1);
                if (carouselIndex >= images.length) carouselIndex = Math.max(0, images.length - 1);
                renderThumbs();
                renderCarousel();
            });
        });
    }

    function renderCarousel() {
        if (images.length === 0) {
            previewPlaceholder.style.display = 'flex';
            sellCarousel.style.display = 'none';
            return;
        }

        previewPlaceholder.style.display = 'none';
        sellCarousel.style.display = 'block';

        carouselTrack.innerHTML = images.map((img, i) => `
            <div class="sell-carousel-slide ${i === carouselIndex ? 'active' : ''}">
                <img src="${img.url}" alt="Slide ${i+1}">
            </div>
        `).join('');

        carouselCounter.textContent = `${carouselIndex + 1} / ${images.length}`;
        carouselPrev.style.display = images.length > 1 ? 'flex' : 'none';
        carouselNext.style.display = images.length > 1 ? 'flex' : 'none';
    }

    carouselPrev?.addEventListener('click', () => {
        carouselIndex = (carouselIndex - 1 + images.length) % images.length;
        renderCarousel();
    });

    carouselNext?.addEventListener('click', () => {
        carouselIndex = (carouselIndex + 1) % images.length;
        renderCarousel();
    });

    // ── Phone ref ──────────────────────────────────────────────
    const phoneInput = document.getElementById('phoneNumber');

    // ── Dirty tracking — only validate after user first touches a field
    const dirtyFields = new Set();

    // ── Per-field validators ────────────────────────────────────
    function validateCarInfo() {
        if (!RXValidation.validators.carInfo(carInfo?.value || '')) {
            RXValidation.showError(carInfo, 'Enter brand, model & year (e.g. Toyota Camry 2022)');
            return false;
        }
        RXValidation.showSuccess(carInfo);
        return true;
    }

    function validateKms() {
        const val = kmsDriven?.value ?? '';
        if (val === '' || !RXValidation.validators.nonNegativeNumber(val)) {
            RXValidation.showError(kmsDriven, 'Enter a valid mileage (0 or more)');
            return false;
        }
        RXValidation.showSuccess(kmsDriven);
        return true;
    }

    function validatePrice() {
        if (!RXValidation.validators.positiveNumber(carPrice?.value || '')) {
            RXValidation.showError(carPrice, 'Enter a valid price in EGP');
            return false;
        }
        RXValidation.showSuccess(carPrice);
        return true;
    }

    function validateCity() {
        if (!RXValidation.validators.select(citySelect?.value || '')) {
            RXValidation.showError(citySelect, 'Please select your city');
            return false;
        }
        RXValidation.showSuccess(citySelect);
        return true;
    }

    function validatePhone() {
        const digits = (phoneInput?.value || '').replace(/\D/g, '');
        if (!RXValidation.validators.egyptianPhone(digits)) {
            RXValidation.showError(phoneInput, 'Enter a valid Egyptian number (010 / 011 / 012 / 015)');
            return false;
        }
        RXValidation.showSuccess(phoneInput);
        return true;
    }

    function validateDesc() {
        const val = carDesc?.value || '';
        if (!RXValidation.validators.optionalMinLength(val, 20)) {
            RXValidation.showError(carDesc, 'Too short — add at least 20 characters');
            return false;
        }
        if (val.trim().length > 0) RXValidation.showSuccess(carDesc);
        else RXValidation.clearState(carDesc);
        return true;
    }

    function validateImages() {
        const zone = document.getElementById('uploadZone');
        if (!zone) return true;
        if (images.length === 0) {
            zone.classList.remove('rx-zone-valid', 'rx-zone-invalid');
            void zone.offsetWidth;
            zone.classList.add('rx-zone-invalid');
            setTimeout(() => zone.classList.remove('rx-zone-invalid'), 600);
            return false;
        }
        zone.classList.remove('rx-zone-invalid');
        zone.classList.add('rx-zone-valid');
        return true;
    }

    function validateAll() {
        return [
            validateImages(),
            validateCarInfo(),
            validateKms(),
            validateCity(),
            validatePrice(),
            validateDesc(),
            validatePhone(),
        ].every(Boolean);
    }

    // ── Real-time validation (only after first blur on each field)
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

    enableDirtyValidation(carInfo,   validateCarInfo);
    enableDirtyValidation(kmsDriven, validateKms);
    enableDirtyValidation(carPrice,  validatePrice);
    enableDirtyValidation(carDesc,   validateDesc);

    citySelect?.addEventListener('change', validateCity);

    // ── Phone: strip non-digits, cap at 10, live feedback ──────
    phoneInput?.addEventListener('input', () => {
        let digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        phoneInput.value = digits;
        dirtyFields.add('phoneNumber');

        if (digits.length === 0) {
            RXValidation.clearState(phoneInput);
        } else if (digits.length === 10) {
            validatePhone(); // complete number: immediate pass/fail
        }
        // Partial entry (< 10 digits): stay quiet until blur
    });

    phoneInput?.addEventListener('blur', () => {
        const digits = (phoneInput.value || '').replace(/\D/g, '');
        if (digits.length > 0) validatePhone();
    });

    // ── Submit ─────────────────────────────────────────────────
    document.getElementById('sellSubmitBtn')?.addEventListener('click', async () => {
        if (!validateAll()) {
            document
                .querySelector('.rx-invalid, .rx-zone-invalid')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        const token = localStorage.getItem('rxToken');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Disable button to prevent double submission
        const submitBtn = document.getElementById('sellSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        // Parse brand, model, year from carInfo field
        const carInfoVal = carInfo?.value.trim().split(/\s+/);
        const brand = (carInfoVal?.[0] || '').replace(/,/g, '');
        const model = (carInfoVal?.[1] || '').replace(/,/g, '');
        const year  = parseInt(carInfoVal?.[carInfoVal.length - 1]) || new Date().getFullYear();

        // Get selected color
        const selectedColor = document.querySelector('.sell-color-item.active')?.dataset.color || '';

        // Build FormData to support image uploads
        const formData = new FormData();
        formData.append('brand',        brand);
        formData.append('model',        model);
        formData.append('year',         year);
        formData.append('price',        parseInt(carPrice?.value));
        formData.append('mileage',      parseInt(kmsDriven?.value));
        formData.append('city',         citySelect?.value);
        formData.append('condition',    activeCondition.toLowerCase());
        formData.append('transmission', activeTransmission.toLowerCase());
        formData.append('fuel',         activeFuel.toLowerCase());
        formData.append('color',        selectedColor);
        formData.append('description',  carDesc?.value.trim());

        // Append image files
        images.forEach(img => {
            if (img.file) formData.append('images', img.file);
        });

        try {
            const res = await fetch('/api/cars', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || 'Something went wrong');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post My Ad';
                return;
            }

            alert('Your ad has been posted! 🎉');
            window.location.href = '/dashboard.html?tab=ads';

        } catch (err) {
            console.error('Submit error:', err);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post My Ad';
            alert('Server error. Please try again.');
        }
    });

    // ── Init preview ───────────────────────────────────────────
    updatePreview();

});