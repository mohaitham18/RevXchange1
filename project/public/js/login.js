// ── Card flip ─────────────────────────────────────────────
function flipCard() {
  document.getElementById('card').classList.toggle('flipped');
}

// ── Password strength bar ─────────────────────────────────
function checkStrength(val) {
  const segs = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (val.length === 0) return;

  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const cls = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';
  for (let i = 0; i < score; i++) segs[i].classList.add(cls);

  // Also run live password validation if field is dirty
  const regPass = document.getElementById('regPassword');
  if (regPass && dirtyReg.has('regPassword')) validateRegPassword();
}

// ── Dirty tracking (separate sets for each card face) ─────
const dirtyLogin = new Set();
const dirtyReg   = new Set();

// ── Sign In validators ────────────────────────────────────
function validateLoginEmail() {
  const el = document.getElementById('loginEmail');
  if (!RXValidation.validators.email(el.value)) {
    RXValidation.showError(el, 'Enter a valid email address');
    return false;
  }
  RXValidation.showSuccess(el);
  return true;
}

function validateLoginPassword() {
  const el = document.getElementById('loginPassword');
  if (el.value.trim().length < 6) {
    RXValidation.showError(el, 'Password must be at least 6 characters');
    return false;
  }
  RXValidation.showSuccess(el);
  return true;
}

// ── Register validators ───────────────────────────────────
function validateRegName() {
  const el = document.getElementById('regName');
  const val = el.value.trim();
  if (val.length < 3 || !val.includes(' ')) {
    RXValidation.showError(el, 'Enter your first and last name');
    return false;
  }
  RXValidation.showSuccess(el);
  return true;
}

function validateRegEmail() {
  const el = document.getElementById('regEmail');
  if (!RXValidation.validators.email(el.value)) {
    RXValidation.showError(el, 'Enter a valid email address');
    return false;
  }
  RXValidation.showSuccess(el);
  return true;
}

function validateRegPassword() {
  const el = document.getElementById('regPassword');
  if (el.value.length < 6) {
    RXValidation.showError(el, 'Password must be at least 6 characters');
    return false;
  }
  RXValidation.showSuccess(el);
  return true;
}

// ── Real-time listeners ───────────────────────────────────
function wire(id, validateFn, dirtySet) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('blur', () => {
    dirtySet.add(id);
    validateFn();
  });
  el.addEventListener('input', () => {
    if (dirtySet.has(id)) validateFn();
  });
}

wire('loginEmail',    validateLoginEmail,    dirtyLogin);
wire('loginPassword', validateLoginPassword, dirtyLogin);
wire('regName',       validateRegName,       dirtyReg);
wire('regEmail',      validateRegEmail,      dirtyReg);
wire('regPassword',   validateRegPassword,   dirtyReg);

// ── Sign In submit ────────────────────────────────────────
function signIn() {
  const emailOk = validateLoginEmail();
  const passOk  = validateLoginPassword();
  if (!emailOk || !passOk) return;

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (email === 'user@revxchange.com' && password === '123456') {
    localStorage.setItem('role',   'user');
    localStorage.setItem('rxUser', 'Ali');
    window.location.href = '../index.html';
    return;
  }
  if (email === 'admin@revxchange.com' && password === '123456') {
    localStorage.setItem('role',   'admin');
    localStorage.setItem('rxUser', 'Admin');
    window.location.href = 'admin.html';
    return;
  }

  // Credentials wrong — show error on both fields
  RXValidation.showError(document.getElementById('loginEmail'),    'No account found with these credentials');
  RXValidation.showError(document.getElementById('loginPassword'), 'Invalid password');
}

// ── Register submit ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.card-back .btn-primary')
    ?.addEventListener('click', () => {
      const nameOk  = validateRegName();
      const emailOk = validateRegEmail();
      const passOk  = validateRegPassword();
      if (!nameOk || !emailOk || !passOk) return;

      // Mark all reg fields as dirty so live validation stays on
      ['regName','regEmail','regPassword'].forEach(id => dirtyReg.add(id));

      alert('Account created! 🎉 (Backend in Phase 2)');
    });
});