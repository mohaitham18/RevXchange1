window.RXValidation = (() => {

  function getContainer(input) {
    const p = input.parentElement;
    if (!p) return input;
    if (p.classList.contains('sell-input-suffix') || p.classList.contains('sell-phone-row')) return p;
    return input;
  }

  function getGroup(input) {
    return input.closest('.sell-form-group') || input.closest('.form-group');
  }

  function getIcon(input) {
    const group = getGroup(input);
    if (!group) return null;
    const label = group.querySelector('label');
    if (!label) return null;
    let icon = label.querySelector('.rx-label-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'rx-label-icon';
      label.appendChild(icon);
    }
    return icon;
  }

  function getMsg(input) {
    const group = getGroup(input);
    if (!group) return null;
    let msg = group.querySelector('.rx-msg');
    if (!msg) {
      msg = document.createElement('div');
      msg.className = 'rx-msg';
      group.appendChild(msg);
    }
    return msg;
  }

  function applyState(input, state) {
    const container = getContainer(input);
    container.classList.remove('rx-valid', 'rx-invalid');
    input.classList.remove('rx-valid', 'rx-invalid');
    void container.offsetWidth;
    if (state) {
      container.classList.add(state);
      if (container !== input) input.classList.add(state);
    }
  }

  function showError(input, message) {
    applyState(input, 'rx-invalid');
    const icon = getIcon(input);
    if (icon) { icon.className = 'rx-label-icon rx-icon-invalid'; icon.textContent = '✕'; }
    const msg = getMsg(input);
    if (msg) { msg.className = 'rx-msg rx-msg-error rx-msg-visible'; msg.textContent = message; }
  }

  function showSuccess(input) {
    applyState(input, 'rx-valid');
    const icon = getIcon(input);
    if (icon) { icon.className = 'rx-label-icon rx-icon-valid'; icon.textContent = '✓'; }
    const msg = getMsg(input);
    if (msg) { msg.className = 'rx-msg'; msg.textContent = ''; }
  }

  function clearState(input) {
    applyState(input, null);
    const icon = getIcon(input);
    if (icon) { icon.className = 'rx-label-icon'; icon.textContent = ''; }
    const msg = getMsg(input);
    if (msg) { msg.className = 'rx-msg'; msg.textContent = ''; }
  }

  const validators = {

    required: (val) => val.trim().length > 0,

    // Letters only (English + Arabic), first + last name, min 3 chars
    name: (val) => {
      const t = val.trim();
      return t.length >= 3
        && /^[a-zA-Z\u0600-\u06FF\s]+$/.test(t)
        && t.includes(' ');
    },

    // Email: letters, numbers, dots, underscores, hyphens only
    // Blocks: + # $ % ^ & * ( ) and other special chars
    email: (val) => {
      const t = val.trim();
      return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t);
    },

    // Egyptian mobile: exactly 11 digits, starts with 010/011/012/015
    egyptianPhone: (val) => {
      const digits = String(val).replace(/\D/g, '');
      return /^(010|011|012|015)\d{8}$/.test(digits);
    },

    // Car info: brand + model minimum
    carInfo: (val) => val.trim().length >= 5 && /\s/.test(val.trim()),

    positiveNumber: (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0; },

    nonNegativeNumber: (val) => { const n = parseFloat(val); return !isNaN(n) && n >= 0; },

    select: (val) => typeof val === 'string' && val.trim() !== '',

    optionalMinLength: (val, min = 20) => {
      const t = val.trim();
      return t.length === 0 || t.length >= min;
    },
  };

  return { showError, showSuccess, clearState, validators };

})();
EOF

