/* ═══════════════════════════════════════════════════════════
   RevXChange — Ambient Silver Ribbon Background
   ═══════════════════════════════════════════════════════════ */

window.RXAmbient = (function () {

  const canvas = document.createElement('canvas');
  canvas.id = 'rxAmbientCanvas';
  document.body.insertBefore(canvas, document.body.firstChild);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Ribbon config — more visible, more silver ────────── */
  const BG = '#f8f9fb';

  const ribbons = [
    { yR: 0.12, amp: 72,  speed: 1.8e-4, thick: 160, alpha: 0.13, ph: 0.00 },
    { yR: 0.30, amp: 58,  speed: 1.3e-4, thick: 130, alpha: 0.10, ph: 2.09 },
    { yR: 0.50, amp: 90,  speed: 2.0e-4, thick: 175, alpha: 0.12, ph: 1.05 },
    { yR: 0.68, amp: 65,  speed: 1.6e-4, thick: 140, alpha: 0.10, ph: 3.14 },
    { yR: 0.87, amp: 55,  speed: 1.4e-4, thick: 115, alpha: 0.09, ph: 4.71 },
  ];

  function waveY(r, x, offset, t) {
    return (
      r.yR * H + offset
      + Math.sin(x * 0.0035 + t * r.speed + r.ph) * r.amp
      + Math.sin(x * 0.0072 + t * r.speed * 1.4)  * r.amp * 0.25
    );
  }

  function drawRibbon(r, t) {
    const STEPS = Math.ceil(W / 5);
    const dx    = W / STEPS;

    /* ── Filled band ──────────────────────────────────── */
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](i * dx, waveY(r, i * dx, 0, t));
    }
    for (let i = STEPS; i >= 0; i--) {
      ctx.lineTo(i * dx, waveY(r, i * dx, r.thick, t));
    }
    ctx.closePath();

    const baseY = r.yR * H;
    const grd = ctx.createLinearGradient(0, baseY - r.amp, 0, baseY + r.thick + r.amp);
    grd.addColorStop(0,    `rgba(180,180,196, 0)`);
    grd.addColorStop(0.20, `rgba(210,212,225, ${r.alpha})`);
    grd.addColorStop(0.42, `rgba(195,197,215, ${r.alpha * 1.6})`);
    grd.addColorStop(0.58, `rgba(225,226,238, ${r.alpha * 1.3})`);
    grd.addColorStop(0.80, `rgba(205,206,220, ${r.alpha})`);
    grd.addColorStop(1,    `rgba(180,180,196, 0)`);
    ctx.fillStyle = grd;
    ctx.fill();

    /* ── Bright highlight — top edge (3D raised look) ─── */
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](i * dx, waveY(r, i * dx, 0, t));
    }
    ctx.strokeStyle = `rgba(255,255,255,${r.alpha * 4.5})`;
    ctx.lineWidth   = 2;
    ctx.stroke();

    /* ── Dark shadow — bottom edge (3D depth) ─────────── */
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](i * dx, waveY(r, i * dx, r.thick, t));
    }
    ctx.strokeStyle = `rgba(100,104,130,${r.alpha * 2.8})`;
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    /* ── Inner mid-highlight (gives the 3D bulge) ─────── */
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](i * dx, waveY(r, i * dx, r.thick * 0.38, t));
    }
    ctx.strokeStyle = `rgba(240,240,252,${r.alpha * 2.2})`;
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  /* ── Loop ~30fps ──────────────────────────────────────── */
  let last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - last < 33) return;
    last = ts;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ribbons.forEach(r => drawRibbon(r, ts));
  }

  requestAnimationFrame(loop);
  return { canvas };

}());