/* ============================================================
   request.js — Buy / Rent / Appointment Request Modal
   ============================================================ */

let reqContact = 'call';

function getToken() {
  return localStorage.getItem('rxToken') || localStorage.getItem('token');
}

function getLoggedUser() {
  try {
    return (
      JSON.parse(localStorage.getItem('user') || '{}') ||
      JSON.parse(localStorage.getItem('rxUser') || '{}')
    );
  } catch {
    return {};
  }
}

function openRequestModal(carId, type, carTitle, carPrice) {
  const overlay = document.getElementById('reqOverlay');
  if (!overlay) return;

  const reqCarId = document.getElementById('reqCarId');
  const reqType = document.getElementById('reqType');
  const reqTitle = document.getElementById('reqTitle');
  const reqSubtitle = document.getElementById('reqSubtitle');
  const reqOfferGroup = document.getElementById('reqOfferGroup');
  const reqDatesGroup = document.getElementById('reqDatesGroup');

  if (reqCarId) reqCarId.value = carId;
  if (reqType) reqType.value = type;

  if (reqTitle) {
    if (type === 'rent') reqTitle.textContent = 'Request to Rent';
    else if (type === 'appointment') reqTitle.textContent = 'Book Appointment';
    else reqTitle.textContent = 'Request to Buy';
  }

  if (reqSubtitle) {
    reqSubtitle.textContent =
      carTitle + (carPrice ? ` — ${Number(carPrice).toLocaleString()} EGP` : '');
  }

  if (reqOfferGroup) {
    reqOfferGroup.style.display = type === 'buy' ? '' : 'none';
  }

  if (reqDatesGroup) {
    reqDatesGroup.style.display = type === 'rent' || type === 'appointment' ? '' : 'none';
  }

  const user = getLoggedUser();

  const reqName = document.getElementById('reqName');
  const reqPhone = document.getElementById('reqPhone');

  if (reqName && user.name) {
    reqName.value = user.name;
  }

  if (reqPhone && user.phone) {
    reqPhone.value = user.phone;
  }

  reqContact = 'call';

  document.querySelectorAll('#reqContactChips .req-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === 'call');
  });

  hideReqError();

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRequestModal() {
  const overlay = document.getElementById('reqOverlay');

  if (overlay) {
    overlay.style.display = 'none';
  }

  document.body.style.overflow = '';
}

function showReqError(message) {
  const errorBox = document.getElementById('reqError');

  if (!errorBox) {
    alert(message);
    return;
  }

  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideReqError() {
  const errorBox = document.getElementById('reqError');

  if (errorBox) {
    errorBox.textContent = '';
    errorBox.style.display = 'none';
  }
}

function getDateInputs() {
  const allDateInputs = document.querySelectorAll('#reqOverlay input[type="date"]');

  const rentFromInput =
    document.getElementById('reqRentFrom') ||
    document.getElementById('rentFrom') ||
    document.getElementById('requestStartDate') ||
    allDateInputs[0];

  const rentToInput =
    document.getElementById('reqRentTo') ||
    document.getElementById('rentTo') ||
    document.getElementById('requestEndDate') ||
    allDateInputs[1];

  return {
    rentFromInput,
    rentToInput
  };
}

async function submitRequest() {
  const btn = document.getElementById('reqSubmitBtn');

  const type = document.getElementById('reqType')?.value;
  const carId = document.getElementById('reqCarId')?.value;
  const name = document.getElementById('reqName')?.value.trim();
  const phoneRaw = document.getElementById('reqPhone')?.value.trim();
  const message = document.getElementById('reqMessage')?.value.trim();

  if (!type) return showReqError('Request type is missing.');
  if (!carId) return showReqError('Car ID is missing.');
  if (!name) return showReqError('Please enter your name.');
  if (!phoneRaw) return showReqError('Please enter your phone number.');

  const phoneDigits = phoneRaw.replace(/\D/g, '');

  if (phoneDigits.length !== 11 || !phoneDigits.startsWith('01')) {
    return showReqError('Enter a valid Egyptian phone number, like 01012345678.');
  }

  const payload = {
    type,
    carId,
    name,
    phone: phoneDigits,
    contact: reqContact,
    message
  };

  if (type === 'buy') {
    const offerInput = document.getElementById('reqOfferPrice');
    const offer = offerInput?.value;

    if (offer) {
      payload.offerPrice = Number(offer);
    }
  }

  if (type === 'rent' || type === 'appointment') {
    const { rentFromInput, rentToInput } = getDateInputs();

    const rentFrom = rentFromInput?.value;
    const rentTo = rentToInput?.value;

    if (!rentFrom || !rentTo) {
      return showReqError('Please select pickup and return dates.');
    }

    if (new Date(rentFrom) >= new Date(rentTo)) {
      return showReqError('Return date must be after pickup date.');
    }

    payload.rentFrom = rentFrom;
    payload.rentTo = rentTo;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending…';
  }

  hideReqError();

  try {
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Send Request';
      }

      return showReqError(data.message || 'Something went wrong.');
    }

    if (btn) {
      btn.textContent = '✓ Request Sent!';
      btn.style.background = 'rgba(39,174,96,.2)';
      btn.style.color = '#27ae60';
    }

    setTimeout(() => {
      closeRequestModal();

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Send Request';
        btn.style.background = '';
        btn.style.color = '';
      }

      const offerInput = document.getElementById('reqOfferPrice');
      const messageInput = document.getElementById('reqMessage');
      const { rentFromInput, rentToInput } = getDateInputs();

      if (offerInput) offerInput.value = '';
      if (messageInput) messageInput.value = '';
      if (rentFromInput) rentFromInput.value = '';
      if (rentToInput) rentToInput.value = '';
    }, 1500);
  } catch (err) {
    console.error('REQUEST SUBMIT ERROR:', err);

    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Request';
    }

    showReqError('Network error. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reqClose')?.addEventListener('click', closeRequestModal);

  document.getElementById('reqOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) {
      closeRequestModal();
    }
  });

  document.getElementById('reqContactChips')?.addEventListener('click', function (e) {
    const chip = e.target.closest('.req-chip');

    if (!chip) return;

    reqContact = chip.dataset.val;

    this.querySelectorAll('.req-chip').forEach(c => {
      c.classList.toggle('active', c === chip);
    });
  });

  document.getElementById('reqSubmitBtn')?.addEventListener('click', submitRequest);

  window.openRequestModal = openRequestModal;
});