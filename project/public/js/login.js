// ── Card flip ─────────────────────────────────────────────
function flipCard() {
    document.getElementById('card').classList.toggle('flipped');
}

// ── Password strength bar ─────────────────────────────────
function checkStrength(val) {
    const segs = ['s1', 's2', 's3', 's4'].map(id => document.getElementById(id));
    segs.forEach(s => { s.className = 'strength-seg'; });
    if (val.length === 0) return;

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const cls = score <= 1 ? 'weak' : score === 2 ? 'medium' : 'strong';
    for (let i = 0; i < score; i++) segs[i].classList.add(cls);

    const regPass = document.getElementById('regPassword');
    if (regPass && dirtyReg.has('regPassword')) validateRegPassword();
}

// ── Dirty tracking ─────────────────────────────────────────
const dirtyLogin = new Set();
const dirtyReg = new Set();

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

wire('loginEmail', validateLoginEmail, dirtyLogin);
wire('loginPassword', validateLoginPassword, dirtyLogin);
wire('regName', validateRegName, dirtyReg);
wire('regEmail', validateRegEmail, dirtyReg);
wire('regPassword', validateRegPassword, dirtyReg);

// ── Show/hide password ────────────────────────────────────
function togglePassword(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    btn.addEventListener('click', function() {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.innerHTML = isPassword ?
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' :
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
}

// ── Sign In submit ────────────────────────────────────────
async function signIn() {
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            RXValidation.showError(document.getElementById('loginEmail'), 'No account found with these credentials');
            RXValidation.showError(document.getElementById('loginPassword'), data.message || 'Invalid password');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
            return;
        }

        // Save to localStorage
        localStorage.setItem('rxToken', data.token);
        localStorage.setItem('rxUser', data.user.name);
        localStorage.setItem('rxEmail', data.user.email);
        localStorage.setItem('role', data.user.role);

        // Redirect based on role
        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/';
        }

    } catch (err) {
        console.error('Login error:', err);
        RXValidation.showError(document.getElementById('loginEmail'), 'Server error. Please try again.');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    }
}

// ── Register submit ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.card-back .btn-primary') ?
        .addEventListener('click', async() => {
            const nameOk = validateRegName();
            const emailOk = validateRegEmail();
            const passOk = validateRegPassword();
            if (!nameOk || !emailOk || !passOk) return;

            ['regName', 'regEmail', 'regPassword'].forEach(id => dirtyReg.add(id));

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value.trim();

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    RXValidation.showError(document.getElementById('regEmail'), data.message || 'Registration failed');
                    return;
                }

                // Save to localStorage
                localStorage.setItem('rxToken', data.token);
                localStorage.setItem('rxUser', data.user.name);
                localStorage.setItem('rxEmail', data.user.email);
                localStorage.setItem('role', data.user.role);

                window.location.href = '/';

            } catch (err) {
                console.error('Register error:', err);
                RXValidation.showError(document.getElementById('regEmail'), 'Server error. Please try again.');
            }
        });
});