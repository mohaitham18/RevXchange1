/* ============================================================
   auth.js — RevXChange Authentication & Validation Engine
   ============================================================ */

// ── Dirty tracking sets for inline validation ──────────────
const dirtyLogin = new Set();
const dirtyReg = new Set();

// ── Card flip interaction ─────────────────────────────────
function flipCard() {
    const card = document.getElementById('card');
    if (!card) return;
    card.classList.toggle('flipped');
}

// ── Password strength indicator bar ───────────────────────
function checkStrength(val) {
    const segs = ['s1', 's2', 's3', 's4']
        .map(id => document.getElementById(id))
        .filter(Boolean);

    segs.forEach(s => {
        s.className = 'strength-seg';
    });

    if (!val || val.length === 0) return;

    let score = 0;

    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const cls = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';

    for (let i = 0; i < score && i < segs.length; i++) {
        segs[i].classList.add(cls);
    }

    const regPass = document.getElementById('regPassword');
    if (regPass && dirtyReg.has('regPassword')) {
        validateRegPassword();
    }
}

// ── Safe JSON parser utility ──────────────────────────────
async function readJsonSafe(res) {
    try {
        return await res.json();
    } catch (err) {
        return {};
    }
}

// ── Sign In validators ────────────────────────────────────
function validateLoginEmail() {
    const el = document.getElementById('loginEmail');
    if (!el) return false;

    if (!RXValidation.validators.email(el.value.trim())) {
        RXValidation.showError(el, 'Enter a valid email address');
        return false;
    }

    RXValidation.showSuccess(el);
    return true;
}

function validateLoginPassword() {
    const el = document.getElementById('loginPassword');
    if (!el) return false;

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
    if (!el) return false;

    const val = el.value.trim();

    // Check against global helper if available, otherwise apply safe fallback validation
    if (typeof RXValidation.validators.name === 'function') {
        if (!RXValidation.validators.name(val)) {
            RXValidation.showError(el, 'Name must be letters only, first and last name');
            return false;
        }
    } else if (val.length < 3 || !val.includes(' ')) {
        RXValidation.showError(el, 'Enter your first and last name');
        return false;
    }

    RXValidation.showSuccess(el);
    return true;
}

function validateRegEmail() {
    const el = document.getElementById('regEmail');
    if (!el) return false;

    if (!RXValidation.validators.email(el.value.trim())) {
        RXValidation.showError(el, 'Enter a valid email address');
        return false;
    }

    RXValidation.showSuccess(el);
    return true;
}

function validateRegPassword() {
    const el = document.getElementById('regPassword');
    if (!el) return false;

    if (el.value.trim().length < 6) {
        RXValidation.showError(el, 'Password must be at least 6 characters');
        return false;
    }

    RXValidation.showSuccess(el);
    return true;
}

// ── Real-time input synchronization wiring ────────────────
function wire(id, validateFn, dirtySet) {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('blur', () => {
        dirtySet.add(id);
        validateFn();
    });

    el.addEventListener('input', () => {
        if (dirtySet.has(id)) {
            validateFn();
        }
    });
}

// ── Show/hide password view logic ─────────────────────────
function togglePassword(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);

    if (!input || !btn) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    btn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

// ── Sign In Submission handler ────────────────────────────
async function signIn() {
    dirtyLogin.add('loginEmail');
    dirtyLogin.add('loginPassword');

    const emailOk = validateLoginEmail();
    const passOk = validateLoginPassword();

    if (!emailOk || !passOk) return;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const btn = document.querySelector('.card-front .btn-primary');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Signing in...';
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
            RXValidation.showError(
                document.getElementById('loginEmail'),
                data.message || 'No account found with these credentials'
            );

            RXValidation.showError(
                document.getElementById('loginPassword'),
                data.message || 'Invalid email or password'
            );

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
            return;
        }

        if (!data.token || !data.user) {
            RXValidation.showError(
                document.getElementById('loginEmail'),
                'Invalid server response. Please try again.'
            );

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
            return;
        }

        localStorage.setItem('rxToken', data.token);
        localStorage.setItem('rxUser', data.user.name);
        localStorage.setItem('rxEmail', data.user.email);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('rxUserId', data.user._id || data.user.id || '');

        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/dashboard.html';
        }

    } catch (err) {
        console.error('Login error:', err);
        RXValidation.showError(
            document.getElementById('loginEmail'),
            'Server error. Please try again.'
        );

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    }
}

// ── Register Submission handler ───────────────────────────
async function registerUser() {
    dirtyReg.add('regName');
    dirtyReg.add('regEmail');
    dirtyReg.add('regPassword');

    const nameOk = validateRegName();
    const emailOk = validateRegEmail();
    const passOk = validateRegPassword();

    if (!nameOk || !emailOk || !passOk) return;

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const btn = document.querySelector('.card-back .btn-primary');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating account...';
    }

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
            RXValidation.showError(
                document.getElementById('regEmail'),
                data.message || 'Registration failed'
            );

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
            return;
        }

        if (!data.token || !data.user) {
            RXValidation.showError(
                document.getElementById('regEmail'),
                'Invalid server response. Please try again.'
            );

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
            return;
        }

        localStorage.setItem('rxToken', data.token);
        localStorage.setItem('rxUser', data.user.name);
        localStorage.setItem('rxEmail', data.user.email);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('rxUserId', data.user._id || data.user.id || '');

        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/dashboard.html';
        }

    } catch (err) {
        console.error('Register error:', err);
        RXValidation.showError(
            document.getElementById('regEmail'),
            'Server error. Please try again.'
        );

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
}

// ── Initialization Hook after DOM content builds ──────────
document.addEventListener('DOMContentLoaded', () => {
    // Input state synchronization wiring
    wire('loginEmail', validateLoginEmail, dirtyLogin);
    wire('loginPassword', validateLoginPassword, dirtyLogin);

    wire('regName', validateRegName, dirtyReg);
    wire('regEmail', validateRegEmail, dirtyReg);
    wire('regPassword', validateRegPassword, dirtyReg);

    // Eye-icon toggle binders
    document.getElementById('toggleLoginPass')?.addEventListener('click', () => {
        togglePassword('loginPassword', 'toggleLoginPass');
    });
    document.getElementById('toggleRegPass')?.addEventListener('click', () => {
        togglePassword('regPassword', 'toggleRegPass');
    });

    // Primary action button event interceptors
    const loginBtn = document.querySelector('.card-front .btn-primary');
    const registerBtn = document.querySelector('.card-back .btn-primary');

    if (loginBtn && !loginBtn.getAttribute('onclick')) {
        loginBtn.addEventListener('click', signIn);
    }

    if (registerBtn && !registerBtn.getAttribute('onclick')) {
        registerBtn.addEventListener('click', registerUser);
    }

    // Full Form submit bindings (Handles native enter key triggers)
    const loginForm = document.querySelector('.card-front form');
    const registerForm = document.querySelector('.card-back form');

    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            signIn();
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            registerUser();
        });
    }
});

// ── Global Context Exposing for Markup Bindings ───────────
window.flipCard = flipCard;
window.checkStrength = checkStrength;
window.signIn = signIn;
window.registerUser = registerUser;
window.togglePassword = togglePassword;