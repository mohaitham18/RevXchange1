/* ============================================================
   request.js  —  Buy / Rent Request Modal
   ============================================================ */

let reqContact = 'call';

function openRequestModal(carId, type, carTitle, carPrice) {
  const overlay = document.getElementById('reqOverlay');
  if (!overlay) return;

  // Set hidden values
  document.getElementById('reqCarId').value = carId;
  document.getElementById('reqType').value  = type;

  // Title & subtitle
  document.getElementById('reqTitle').textContent =
    type === 'buy' ? 'Request to Buy' : 'Request to Rent';
  document.getElementById('reqSubtitle').textContent =
    carTitle + (carPrice ? `  —  ${Number(carPrice).toLocaleString()} EGP` : '');

  // Show/hide buy vs rent fields
  document.getElementById('reqOfferGroup').style.display  = type === 'buy'  ? '' : 'none';
  document.getElementById('reqDatesGroup').style.display  = type === 'rent' ? '' : 'none';

  // Pre-fill name & phone from logged-in user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name)  document.getElementById('reqName').value  = user.name;
  if (user.phone) document.getElementById('reqPhone').value = user.phone;

  // Reset chips
  reqContact = 'call';
  document.querySelectorAll('#reqContactChips .req-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.val === 'call');
  });

  // Reset error
  hideReqError();

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRequestModal() {
  const overlay = document.getElementById('reqOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function showReqError(msg) {
  const el = document.getElementById('reqError');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideReqError() {
  const el = document.getElementById('reqError');
  if (el) el.style.display = 'none';
}

async function submitRequest() {
  const btn = document.getElementById('reqSubmitBtn');
  const type = document.getElementById('reqType').value;

  const payload = {
    type,
    carId:   document.getElementById('reqCarId').value,
    name:    document.getElementById('reqName').value.trim(),
    phone:   document.getElementById('reqPhone').value.trim(),
    contact: reqContact,
    message: document.getElementById('reqMessage').value.trim()
  };

  // Validation
   if (!payload.name)  return showReqError('Please enter your name.');
   if (!payload.phone) return showReqError('Please enter your phone number.');

// Egyptian phone: must be 11 digits starting with 01
    const phoneDigits = payload.phone.replace(/\D/g, '');
   if (phoneDigits.length !== 11 || !phoneDigits.startsWith('01')) {
   return showReqError('Enter a valid Egyptian phone number (e.g. 01012345678).');
   }
    payload.phone = phoneDigits; // store clean digits only
    if (type === 'buy') {
    const offer = document.getElementById('reqOfferPrice').value;
    if (offer) payload.offerPrice = Number(offer);
  }

  if (type === 'rent') {
    payload.rentFrom = document.getElementById('reqRentFrom').value;
    payload.rentTo   = document.getElementById('reqRentTo').value;
    if (!payload.rentFrom || !payload.rentTo) {
      return showReqError('Please select pickup and return dates.');
    }
    if (new Date(payload.rentFrom) >= new Date(payload.rentTo)) {
      return showReqError('Return date must be after pickup date.');
    }
  }

  btn.disabled    = true;
  btn.textContent = 'Sending…';
  hideReqError();

  try {
    const res = await fetch('/api/requests', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('rxToken') || localStorage.getItem('token')
          ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
          : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      btn.disabled    = false;
      btn.textContent = 'Send Request';
      return showReqError(data.message || 'Something went wrong.');
    }

    // Success
    btn.textContent = '✓ Request Sent!';
    btn.style.background = 'rgba(39,174,96,.2)';
    btn.style.color      = '#27ae60';

    setTimeout(() => {
      closeRequestModal();
      btn.disabled         = false;
      btn.textContent      = 'Send Request';
      btn.style.background = '';
      btn.style.color      = '';
    }, 1800);

  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Send Request';
    showReqError('Network error. Please try again.');
  }
}

// ── Event Listeners ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Close button
  document.getElementById('reqClose')?.addEventListener('click', closeRequestModal);

  // Click outside modal to close
  document.getElementById('reqOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) closeRequestModal();
  });

  // Contact chips
  document.getElementById('reqContactChips')?.addEventListener('click', function (e) {
    const chip = e.target.closest('.req-chip');
    if (!chip) return;
    reqContact = chip.dataset.val;
    this.querySelectorAll('.req-chip').forEach(c =>
      c.classList.toggle('active', c === chip)
    );
  });

  // Submit
  document.getElementById('reqSubmitBtn')?.addEventListener('click', submitRequest);

  // Expose globally so car cards can call it
  window.openRequestModal = openRequestModal;
});