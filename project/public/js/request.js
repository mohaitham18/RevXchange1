let reqContact = 'call';

function getToken() {
  return localStorage.getItem('rxToken') || localStorage.getItem('token');
}

function getLoggedUser() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user;
  } catch {
    return {};
  }
}

function openRequestModal(carId, type, carTitle, carPrice) {
  const overlay = document.getElementById('reqOverlay');
  if (!overlay) return;

  document.getElementById('reqCarId').value = carId;
  document.getElementById('reqType').value = type;

  const reqTitle = document.getElementById('reqTitle');
  if (reqTitle) {
    if (type === 'rent') reqTitle.textContent = 'Request to Rent';
    else if (type === 'appointment') reqTitle.textContent = 'Book Appointment';
    else reqTitle.textContent = 'Request to Buy';
  }

  const reqSubtitle = document.getElementById('reqSubtitle');
  if (reqSubtitle) {
    reqSubtitle.textContent = carTitle + (carPrice ? ` — ${Number(carPrice).toLocaleString()} EGP` : '');
  }

  // Show/hide sections
  const reqOfferGroup = document.getElementById('reqOfferGroup');
  const reqDatesGroup = document.getElementById('reqDatesGroup');
  const reqAppointmentGroup = document.getElementById('reqAppointmentGroup');

  if (reqOfferGroup) reqOfferGroup.style.display = type === 'buy' ? 'block' : 'none';
  if (reqDatesGroup) reqDatesGroup.style.display = type === 'rent' ? 'block' : 'none';
  if (reqAppointmentGroup) reqAppointmentGroup.style.display = type === 'appointment' ? 'block' : 'none';

  // Auto-fill user info
  const user = getLoggedUser();
  const rxUser = localStorage.getItem('rxUser');

  const reqName = document.getElementById('reqName');
  const reqPhone = document.getElementById('reqPhone');

  if (reqName && !reqName.value) reqName.value = user.name || rxUser || '';
  if (reqPhone && !reqPhone.value) reqPhone.value = user.phone || '';

  // Reset contact chips
  reqContact = 'call';
  document.querySelectorAll('#reqContactChips .req-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === 'call');
  });

  // Reset all date fields
  const reqRentFrom = document.getElementById('reqRentFrom');
  const reqRentTo = document.getElementById('reqRentTo');
  const reqAppointmentDate = document.getElementById('reqAppointmentDate');
  if (reqRentFrom) reqRentFrom.value = '';
  if (reqRentTo) reqRentTo.value = '';
  if (reqAppointmentDate) reqAppointmentDate.value = '';

  hideReqError();
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRequestModal() {
  const overlay = document.getElementById('reqOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function showReqError(message) {
  const errorBox = document.getElementById('reqError');
  if (!errorBox) { alert(message); return; }
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideReqError() {
  const errorBox = document.getElementById('reqError');
  if (errorBox) { errorBox.textContent = ''; errorBox.style.display = 'none'; }
}

async function submitRequest() {
  const btn = document.getElementById('reqSubmitBtn');
  const type = document.getElementById('reqType').value;
  const carId = document.getElementById('reqCarId').value;
  const name = document.getElementById('reqName').value.trim();
  const phoneRaw = document.getElementById('reqPhone').value.trim();
  const message = document.getElementById('reqMessage').value.trim();

  if (!type) return showReqError('Request type is missing.');
  if (!carId) return showReqError('Car ID is missing.');
  if (!name) return showReqError('Please enter your name.');
  if (!phoneRaw) return showReqError('Please enter your phone number.');

  const phoneDigits = phoneRaw.replace(/\D/g, '');
  if (phoneDigits.length !== 11 || !phoneDigits.startsWith('01')) {
    return showReqError('Enter a valid Egyptian phone number, like 01012345678.');
  }

  const payload = { type, carId, name, phone: phoneDigits, contact: reqContact, message };

  if (type === 'buy') {
    const offer = document.getElementById('reqOfferPrice').value;
    if (offer) payload.offerPrice = Number(offer);
  }

  if (type === 'rent') {
    const rentFrom = document.getElementById('reqRentFrom').value;
    const rentTo = document.getElementById('reqRentTo').value;
    if (!rentFrom || !rentTo) return showReqError('Please select pickup and return dates.');
    if (new Date(rentFrom) >= new Date(rentTo)) return showReqError('Return date must be after pickup date.');
    payload.rentFrom = rentFrom;
    payload.rentTo = rentTo;
  }

  if (type === 'appointment') {
    const appointmentDate = document.getElementById('reqAppointmentDate').value;
    if (!appointmentDate) return showReqError('Please select a preferred visit date.');
    payload.appointmentDate = appointmentDate;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  hideReqError();

  try {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Request'; }
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
      const fields = ['reqOfferPrice', 'reqMessage', 'reqRentFrom', 'reqRentTo', 'reqAppointmentDate'];
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    }, 1500);

  } catch (err) {
    console.error('REQUEST SUBMIT ERROR:', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Send Request'; }
    showReqError('Network error. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const reqClose = document.getElementById('reqClose');
  if (reqClose) reqClose.addEventListener('click', closeRequestModal);

  const reqOverlay = document.getElementById('reqOverlay');
  if (reqOverlay) {
    reqOverlay.addEventListener('click', function(e) {
      if (e.target === this) closeRequestModal();
    });
  }

  const reqContactChips = document.getElementById('reqContactChips');
  if (reqContactChips) {
    reqContactChips.addEventListener('click', function(e) {
      const chip = e.target.closest('.req-chip');
      if (!chip) return;
      reqContact = chip.dataset.val;
      this.querySelectorAll('.req-chip').forEach(c => {
        c.classList.toggle('active', c === chip);
      });
    });
  }

  const reqSubmitBtn = document.getElementById('reqSubmitBtn');
  if (reqSubmitBtn) reqSubmitBtn.addEventListener('click', submitRequest);

  window.openRequestModal = openRequestModal;
});