/* ═══════════════════════════════════════════════════════════
   RevXChange — Global Validation Utility (RXValidation)
   Load order: cars.js → validation.js → page JS → navbar.js → cara.js
   ═══════════════════════════════════════════════════════════ */

window.RXValidation = (() => {

  // ── Container resolver ──────────────────────────────────────
  // For inputs inside known wrappers, target the wrapper for border/glow.
  // The input itself still gets the class for the shake animation.
  function getContainer(input) {
    const p = input.parentElement;
    if (!p) return input;
    if (
      p.classList.contains('sell-input-suffix') ||
      p.classList.contains('sell-phone-row')
    ) return p;
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

  // ── Core state applicator ───────────────────────────────────
  function applyState(input, state) {
    const container = getContainer(input);

    // Strip both from wrapper + input before re-applying
    container.classList.remove('rx-valid', 'rx-invalid');
    input.classList.remove('rx-valid', 'rx-invalid');

    // Force reflow so animations re-trigger on repeat errors
    void container.offsetWidth;

    if (state) {
      container.classList.add(state);
      // Also on the input itself so the shake animation fires
      if (container !== input) input.classList.add(state);
    }
  }

  // ── Public state functions ──────────────────────────────────
  function showError(input, message) {
    applyState(input, 'rx-invalid');

    const icon = getIcon(input);
    if (icon) {
      icon.className = 'rx-label-icon rx-icon-invalid';
      icon.textContent = '✕';
    }

    const msg = getMsg(input);
    if (msg) {
      msg.className = 'rx-msg rx-msg-error rx-msg-visible';
      msg.textContent = message;
    }
  }

  function showSuccess(input) {
    applyState(input, 'rx-valid');

    const icon = getIcon(input);
    if (icon) {
      icon.className = 'rx-label-icon rx-icon-valid';
      icon.textContent = '✓';
    }

    const msg = getMsg(input);
    if (msg) {
      msg.className = 'rx-msg';
      msg.textContent = '';
    }
  }

  function clearState(input) {
    applyState(input, null);

    const icon = getIcon(input);
    if (icon) {
      icon.className = 'rx-label-icon';
      icon.textContent = '';
    }

    const msg = getMsg(input);
    if (msg) {
      msg.className = 'rx-msg';
      msg.textContent = '';
    }
  }

  // ── Validators ──────────────────────────────────────────────
  const validators = {

    required: (val) =>
      val.trim().length > 0,

    /**
     * Egyptian mobile number (entered after the +20 prefix shown in UI).
     * 10 digits, starting with 10, 11, 12, or 15.
     * e.g. 1012345678 → Vodafone (010)
     */
    egyptianPhone: (val) =>
      /^(10|11|12|15)\d{8}$/.test(val.replace(/\D/g, '')),

    /** Brand + model minimum: at least 2 words, 5+ chars */
    carInfo: (val) =>
      val.trim().length >= 5 && /\s/.test(val.trim()),

    email: (val) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim()),
    
    positiveNumber: (val) => {
      const n = parseFloat(val);
      return !isNaN(n) && n > 0;
    },

    /** 0 is valid (new car with 0 km) */
    nonNegativeNumber: (val) => {
      const n = parseFloat(val);
      return !isNaN(n) && n >= 0;
    },

    /** Select: a real value is chosen */
    select: (val) =>
      typeof val === 'string' && val.trim() !== '',

    /** Optional but if provided must be long enough */
    optionalMinLength: (val, min = 20) => {
      const t = val.trim();
      return t.length === 0 || t.length >= min;
    },
  };

  // ── Public API ──────────────────────────────────────────────
  return { showError, showSuccess, clearState, validators };

})();