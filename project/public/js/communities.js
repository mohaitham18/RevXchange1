/* ═══════════════════════════════════════════════════════════
   RevXChange — Car Communities
   Stage D: pagination, suggest-a-community modal
   ═══════════════════════════════════════════════════════════ */

(function () {

  // ── Auth helpers ─────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('rxToken') || null;
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // ── State ────────────────────────────────────────────────
  let allCommunities = [];
  let searchQuery    = '';
  let currentPage    = 1;
  const PAGE_SIZE    = 16;

  // ── Fetch communities from API ───────────────────────────
  async function fetchCommunities() {
    const grid  = document.getElementById('commGrid');
    const yours = document.getElementById('commYoursList');
    if (!grid) return;

    grid.innerHTML = Array(8).fill('<div class="comm-skel"></div>').join('');

    try {
      const headers = {};
      const token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res  = await fetch('/api/communities', { headers });
      const data = await res.json();
      allCommunities = data.communities || [];

      // Auto-join RevXChange Central if logged in and not already joined
      if (isLoggedIn()) {
        const central = allCommunities.find(c => c.isCentral && !c.joined);
        if (central) {
          try {
            const joinRes = await fetch(`/api/communities/${central._id}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
              }
            });
            if (joinRes.ok) {
              central.joined = true;
              central.memberCount += 1;
            }
          } catch (e) {
            console.warn('Auto-join RevXChange Central failed silently:', e);
          }
        }
      }

      renderAll();
    } catch (err) {
      console.error('Failed to load communities:', err);
      grid.innerHTML = '<div class="comm-no-results">Failed to load communities. Please refresh.</div>';
    }
  }

  // ── Leave confirmation modal ─────────────────────────────
  function showLeaveConfirm(communityId, communityName) {
    const existing = document.getElementById('commLeaveModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'commLeaveModal';
    modal.innerHTML = `
      <div class="comm-leave-overlay" id="commLeaveOverlay">
        <div class="comm-leave-modal">
          <div class="comm-leave-icon">🚗</div>
          <h3 class="comm-leave-title">Leave Community?</h3>
          <p class="comm-leave-desc">
            Are you sure you want to leave the
            <strong>${communityName}</strong> community?
            You can always rejoin later.
          </p>
          <div class="comm-leave-actions">
            <button class="comm-leave-no" id="commLeaveNo">No, Stay</button>
            <button class="comm-leave-yes" id="commLeaveYes">Yes, Leave</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.querySelector('.comm-leave-overlay').classList.add('rx-visible');
    });

    document.getElementById('commLeaveNo').addEventListener('click', closeLeaveConfirm);
    document.getElementById('commLeaveOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('commLeaveOverlay')) closeLeaveConfirm();
    });

    document.getElementById('commLeaveYes').addEventListener('click', async () => {
      closeLeaveConfirm();
      await performLeave(communityId);
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') { closeLeaveConfirm(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function closeLeaveConfirm() {
    const modal = document.getElementById('commLeaveModal');
    if (!modal) return;
    const overlay = modal.querySelector('.comm-leave-overlay');
    overlay.classList.remove('rx-visible');
    setTimeout(() => modal.remove(), 300);
  }

  async function performLeave(communityId) {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch(`/api/communities/${communityId}/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      if (res.ok) {
        const comm = allCommunities.find(c => c._id === communityId);
        if (comm) {
          comm.joined = false;
          comm.memberCount = Math.max(0, comm.memberCount - 1);
        }
        renderAll();
      }
    } catch (err) {
      console.error('Leave failed:', err);
    }
  }

  // ── Render everything ────────────────────────────────────
  function renderAll() {
    renderGrid();
    renderYours();
  }

  // ── Filtered + sorted community list (no central) ────────
  function getFilteredRegular() {
    let list = allCommunities.filter(c => !c.isCentral);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.brandId?.name || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => b.memberCount - a.memberCount);
    return list;
  }

  // ── Render main grid with pagination ─────────────────────
  function renderGrid() {
    const grid = document.getElementById('commGrid');
    if (!grid) return;

    const central    = allCommunities.find(c => c.isCentral);
    const regular    = getFilteredRegular();
    const total      = regular.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1)          currentPage = 1;

    const start     = (currentPage - 1) * PAGE_SIZE;
    const paginated = regular.slice(start, start + PAGE_SIZE);

    // Update pagination immediately so arrows respond at click time,
    // not after the 200 ms grid fade delay
    renderPagination(total, totalPages);

    let html = '';
    if (central && !searchQuery) html += renderCentralCard(central);
    if (total === 0) {
      html += '<div class="comm-no-results">No communities match your search.</div>';
    } else {
      html += paginated.map(renderRegularCard).join('');
    }

    grid.style.transition = 'opacity 0.2s ease';
    grid.style.opacity = '0';
    setTimeout(() => {
      grid.innerHTML = html;
      attachJoinListeners();
      grid.style.opacity = '1';
    }, 200);
  }

  // ── Page-range helper (Google-style) ─────────────────────
  // Returns array of page numbers and '...' strings.
  // Always includes 1 and totalPages; shows ±2 around current.
  function getPageRange(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [1];
    const lo = Math.max(2, current - 2);
    const hi = Math.min(total - 1, current + 2);
    if (lo > 2)          pages.push('...');
    for (let p = lo; p <= hi; p++) pages.push(p);
    if (hi < total - 1)  pages.push('...');
    pages.push(total);
    return pages;
  }

  function goToPage(page, totalPages) {
    const target = Math.max(1, Math.min(totalPages, page));
    if (target === currentPage) return;
    currentPage = target;
    renderGrid();
  }

  // ── Google-style pagination bar ───────────────────────────
  function renderPagination(total, totalPages) {
    const pager = document.getElementById('commPagination');
    if (!pager) return;

    // Keep the bar's reserved space but hide content when not needed
    if (totalPages <= 1) {
      pager.style.visibility = 'hidden';
      pager.innerHTML = '';
      return;
    }
    pager.style.visibility = '';

    const range   = getPageRange(currentPage, totalPages);
    const numsHtml = range.map(p => {
      if (p === '...') return '<span class="comm-pg-dots">•••</span>';
      const active = p === currentPage ? ' comm-pg-active' : '';
      return `<button class="comm-pg-num${active}" data-page="${p}">${p}</button>`;
    }).join('');

    const atFirst = currentPage === 1;
    const atLast  = currentPage === totalPages;

    pager.innerHTML = `
      <button class="comm-pg-btn comm-pg-edge" id="commPgFirst"
              title="First page" ${atFirst ? 'disabled' : ''}>«</button>
      <button class="comm-pg-btn comm-pg-arrow" id="commPgPrev"
              title="Previous page" ${atFirst ? 'disabled' : ''}>‹</button>
      <div class="comm-pg-nums">${numsHtml}</div>
      <button class="comm-pg-btn comm-pg-arrow" id="commPgNext"
              title="Next page" ${atLast ? 'disabled' : ''}>›</button>
      <button class="comm-pg-btn comm-pg-edge" id="commPgLast"
              title="Last page" ${atLast ? 'disabled' : ''}>»</button>
    `;

    pager.querySelector('#commPgFirst').addEventListener('click', () => goToPage(1, totalPages));
    pager.querySelector('#commPgPrev').addEventListener('click',  () => goToPage(currentPage - 1, totalPages));
    pager.querySelector('#commPgNext').addEventListener('click',  () => goToPage(currentPage + 1, totalPages));
    pager.querySelector('#commPgLast').addEventListener('click',  () => goToPage(totalPages, totalPages));
    pager.querySelectorAll('.comm-pg-num').forEach(btn => {
      btn.addEventListener('click', () => goToPage(parseInt(btn.dataset.page), totalPages));
    });
  }

  // ── Render "Your Communities" sidebar ────────────────────
  function renderYours() {
    const list = document.getElementById('commYoursList');
    if (!list) return;

    const joinedAll = allCommunities.filter(c => c.joined);
    const central   = joinedAll.find(c => c.isCentral);
    const others    = joinedAll.filter(c => !c.isCentral)
                               .sort((a, b) => b.memberCount - a.memberCount);
    const joined    = central ? [central, ...others] : others;

    if (joined.length === 0) {
      list.innerHTML = `
        <div class="comm-yours-empty">
          Join communities to see them here.<br>
          <span style="font-size:1.5rem;display:block;margin-top:12px;">🚗</span>
        </div>`;
      return;
    }

    list.innerHTML = joined.map(c => {
      if (c.isCentral) {
        return `
          <div class="comm-yours-card comm-yours-card-central" data-id="${c._id}">
            <img class="comm-yours-logo"
                 src="${c.brandId?.logoUrl || '/images/Logo.png'}"
                 alt="RevXChange"
                 onerror="this.style.opacity='0'">
            <div class="comm-yours-info">
              <div class="comm-yours-name" style="-webkit-text-fill-color:unset;color:#fff;">
                ✦ RevXChange Central
              </div>
              <div class="comm-yours-members" style="color:rgba(255,255,255,0.6);">
                ${formatMembers(c.memberCount)} members
              </div>
            </div>
            <div class="comm-yours-glow-dot"
                 style="background:rgba(255,255,255,0.4)"></div>
          </div>`;
      }
      return `
        <div class="comm-yours-card" data-id="${c._id}">
          <img class="comm-yours-logo"
               src="${c.brandId?.logoUrl || ''}"
               alt="${c.brandId?.name || c.name}"
               onerror="this.style.opacity='0'">
          <div class="comm-yours-info">
            <div class="comm-yours-name">${c.brandId?.name || ''} ${c.name}</div>
            <div class="comm-yours-members">${formatMembers(c.memberCount)} members</div>
          </div>
          <div class="comm-yours-actions">
            <button class="comm-yours-manage-btn" data-id="${c._id}">
              ⚙ Manage
            </button>
            <button class="comm-yours-leave-btn" data-id="${c._id}" data-name="${(c.brandId?.name || '') + ' ' + c.name}">
              Leave
            </button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.comm-yours-leave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn()) { window.location.href = '/login.html'; return; }
        showLeaveConfirm(btn.dataset.id, btn.dataset.name);
      });
    });

    list.querySelectorAll('.comm-yours-manage-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('Membership management coming soon!');
      });
    });

    list.querySelectorAll('.comm-yours-card-central').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = '/feed.html';
      });
    });

    list.querySelectorAll('.comm-yours-card:not(.comm-yours-card-central)').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.comm-yours-manage-btn, .comm-yours-leave-btn')) return;
        const comm = allCommunities.find(c => c._id === card.dataset.id);
        if (comm?.slug) window.location.href = `/feed.html?community=${comm.slug}`;
        else window.location.href = '/feed.html';
      });
    });
  }

  // ── Central card HTML ────────────────────────────────────
  function renderCentralCard(c) {
    const joinLabel = c.joined ? '✓ Joined' : '✦ Join RevXChange';
    const joinClass = c.joined ? 'comm-card-central-join joined' : 'comm-card-central-join';
    return `
      <div class="comm-card-central" data-id="${c._id}">
        <img class="comm-card-central-logo"
             src="${c.brandId?.logoUrl || '/images/Logo.png'}"
             alt="RevXChange"
             onerror="this.style.opacity='0'">
        <div class="comm-card-central-info">
          <div class="comm-card-central-label">✦ Central Community</div>
          <div class="comm-card-central-name">RevXChange Central</div>
          <div class="comm-card-central-desc">${c.description || 'General car discussions, marketplace questions, and community suggestions for Egypt.'}</div>
          <div class="comm-card-central-members">${formatMembers(c.memberCount)} members</div>
        </div>
        <button class="${joinClass}"
                data-id="${c._id}"
                data-joined="${c.joined}"
                data-central="true">
          ${joinLabel}
        </button>
      </div>`;
  }

  // ── Regular card HTML ────────────────────────────────────
  function renderRegularCard(c) {
    const glow      = c.brandId?.glowColor || '#999';
    const logo      = c.brandId?.logoUrl   || '';
    const brandName = c.brandId?.name      || '';
    const joinLabel = c.joined ? '✓ Joined' : 'Join';
    const joinClass = c.joined ? 'comm-card-join joined' : 'comm-card-join';

    return `
      <div class="comm-card" data-id="${c._id}" data-slug="${c.slug}"
           style="cursor:pointer;">
        <div class="comm-card-logo-wrap">
          <div class="comm-card-glow" style="background:${glow}"></div>
          <img class="comm-card-logo"
               src="${logo}"
               alt="${brandName}"
               onerror="this.style.opacity='0'">
        </div>
        <div class="comm-card-name">${brandName} ${c.name}</div>
        <div class="comm-card-members">${formatMembers(c.memberCount)} members</div>
        <button class="${joinClass}"
                data-id="${c._id}"
                data-joined="${c.joined}"
                ${c.joined ? 'data-show-leave="true"' : ''}>
          ${joinLabel}
        </button>
      </div>`;
  }

  // ── Join / Leave logic ───────────────────────────────────
  function attachJoinListeners() {
    document.querySelectorAll('.comm-card[data-slug]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.comm-card-join')) return;
        const slug = card.dataset.slug;
        if (slug) window.location.href = `/feed.html?community=${slug}`;
      });
    });

    document.querySelectorAll('.comm-card[data-id], .comm-card-central[data-id]').forEach(el => {
      const btn = el.querySelector('.comm-card-join, .comm-card-central-join');
      if (!btn) return;

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (!isLoggedIn()) {
          const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = '/login.html?returnTo=' + returnTo;
          return;
        }

        const id     = btn.dataset.id;
        const joined = btn.dataset.joined === 'true';
        const method = joined ? 'DELETE' : 'POST';
        const url    = `/api/communities/${id}/${joined ? 'leave' : 'join'}`;

        btn.disabled = true;
        btn.style.opacity = '0.6';

        try {
          const res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + getToken()
            }
          });

          if (res.ok) {
            const comm = allCommunities.find(c => c._id === id);
            if (comm) {
              comm.joined = !joined;
              comm.memberCount += joined ? -1 : 1;
              if (comm.memberCount < 0) comm.memberCount = 0;
            }
            renderAll();
          } else {
            const err = await res.json();
            console.error('Join/leave error:', err.message);
          }
        } catch (err) {
          console.error('Network error:', err);
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    });
  }

  // ── Format member count ──────────────────────────────────
  function formatMembers(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
  }

  // ── Search ───────────────────────────────────────────────
  document.getElementById('commSearch')?.addEventListener('input', function () {
    searchQuery = this.value.trim();
    currentPage = 1; // always reset to page 1 on search
    renderGrid();
  });

  // ════════════════════════════════════════════════════════
  // TASK 3 — Suggest a Community modal
  // ════════════════════════════════════════════════════════

  function openSuggestModal() {
    const existing = document.getElementById('commSuggestModal');
    if (existing) existing.remove();

    // Build deduplicated brand list from allCommunities, sorted A-Z
    const brandMap = new Map();
    allCommunities.forEach(c => {
      if (c.brandId && !brandMap.has(c.brandId._id)) {
        brandMap.set(c.brandId._id, c.brandId);
      }
    });
    const brands = Array.from(brandMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    const brandOptions = brands.map(b =>
      `<option value="${b._id}">${b.name}</option>`
    ).join('');

    const guestNote = !isLoggedIn()
      ? `<p class="comm-suggest-guest-note">You're suggesting as a guest. <a href="/login.html">Sign in</a> to track your request.</p>`
      : '';

    const modal = document.createElement('div');
    modal.id = 'commSuggestModal';
    modal.innerHTML = `
      <div class="comm-leave-overlay" id="commSuggestOverlay">
        <div class="comm-leave-modal comm-suggest-modal">
          <button class="comm-suggest-close" id="commSuggestClose" aria-label="Close">✕</button>
          <div class="comm-leave-icon">💡</div>
          <h3 class="comm-leave-title">Suggest a Community</h3>
          <p class="comm-leave-desc" style="margin-bottom:20px;">
            Don't see your car? Tell us what community you'd like and we'll review it.
          </p>

          <div class="comm-suggest-body" id="commSuggestBody">
            <!-- Step 1: brand -->
            <div class="comm-suggest-field">
              <label class="comm-suggest-label">Brand <span class="comm-suggest-req">*</span></label>
              <select class="comm-suggest-select" id="commSuggestBrand">
                <option value="">Select a brand...</option>
                ${brandOptions}
              </select>
            </div>

            ${guestNote}

            <!-- Step 2: revealed after brand selection -->
            <div class="comm-suggest-step2" id="commSuggestStep2">
              <div class="comm-suggest-field">
                <label class="comm-suggest-label">Car Model <span class="comm-suggest-req">*</span></label>
                <input type="text" class="comm-suggest-input" id="commSuggestModel"
                       placeholder="e.g. Corolla Sport" maxlength="100">
              </div>
              <div class="comm-suggest-row">
                <div class="comm-suggest-field">
                  <label class="comm-suggest-label">Year From</label>
                  <input type="number" class="comm-suggest-input" id="commSuggestYearStart"
                         placeholder="e.g. 2018" min="1980" max="2030">
                </div>
                <div class="comm-suggest-field">
                  <label class="comm-suggest-label">Year To</label>
                  <input type="number" class="comm-suggest-input" id="commSuggestYearEnd"
                         placeholder="e.g. 2023" min="1980" max="2030">
                </div>
              </div>
              <div class="comm-suggest-field">
                <label class="comm-suggest-label">Why this community?</label>
                <textarea class="comm-suggest-textarea" id="commSuggestDetails"
                          placeholder="Tell us why this community would be valuable..."
                          maxlength="500" rows="3"></textarea>
                <div class="comm-suggest-counter" id="commSuggestCounter">0 / 500</div>
              </div>
            </div>

            <div class="comm-suggest-error" id="commSuggestError" style="display:none;"></div>

            <button class="comm-suggest-submit" id="commSuggestSubmit" disabled>
              <span class="comm-suggest-submit-label">Submit Request</span>
              <span class="comm-suggest-spinner" style="display:none;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     style="animation:commSuggestSpin 0.8s linear infinite;">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.querySelector('.comm-leave-overlay').classList.add('rx-visible');
    });

    const overlay = document.getElementById('commSuggestOverlay');
    const brandSel  = document.getElementById('commSuggestBrand');
    const modelInput = document.getElementById('commSuggestModel');
    const step2     = document.getElementById('commSuggestStep2');
    const details   = document.getElementById('commSuggestDetails');
    const counter   = document.getElementById('commSuggestCounter');
    const submitBtn = document.getElementById('commSuggestSubmit');
    const errorEl   = document.getElementById('commSuggestError');

    function checkSubmitEnabled() {
      const ok = brandSel.value && modelInput.value.trim().length > 0;
      submitBtn.disabled = !ok;
    }

    // Reveal step 2 when brand is selected
    brandSel.addEventListener('change', () => {
      if (brandSel.value) {
        step2.classList.add('comm-suggest-step2-visible');
      } else {
        step2.classList.remove('comm-suggest-step2-visible');
      }
      checkSubmitEnabled();
    });

    modelInput.addEventListener('input', checkSubmitEnabled);

    details.addEventListener('input', () => {
      counter.textContent = `${details.value.length} / 500`;
    });

    // Submit
    submitBtn.addEventListener('click', async () => {
      const brandId   = brandSel.value;
      const model     = modelInput.value.trim();
      const yearStart = document.getElementById('commSuggestYearStart').value || null;
      const yearEnd   = document.getElementById('commSuggestYearEnd').value || null;
      const detailsVal = details.value.trim() || null;

      if (!brandId || !model) return;

      errorEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.querySelector('.comm-suggest-submit-label').style.display = 'none';
      submitBtn.querySelector('.comm-suggest-spinner').style.display = 'inline-flex';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();

        const res = await fetch('/api/communities/suggest', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            brandId,
            model,
            yearStart: yearStart ? parseInt(yearStart) : undefined,
            yearEnd:   yearEnd   ? parseInt(yearEnd)   : undefined,
            details:   detailsVal,
          })
        });

        if (res.ok) {
          // Success state
          const body = document.getElementById('commSuggestBody');
          body.innerHTML = `
            <div class="comm-suggest-success">
              <div class="comm-suggest-success-icon">✓</div>
              <p>Request submitted! We'll review it soon.</p>
            </div>`;
          setTimeout(() => closeSuggestModal(), 2500);
        } else {
          const err = await res.json().catch(() => ({}));
          errorEl.textContent = err.message || 'Something went wrong. Please try again.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.querySelector('.comm-suggest-submit-label').style.display = '';
          submitBtn.querySelector('.comm-suggest-spinner').style.display = 'none';
        }
      } catch (e) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.querySelector('.comm-suggest-submit-label').style.display = '';
        submitBtn.querySelector('.comm-suggest-spinner').style.display = 'none';
      }
    });

    // Close handlers
    document.getElementById('commSuggestClose').addEventListener('click', closeSuggestModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSuggestModal();
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') { closeSuggestModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function closeSuggestModal() {
    const modal = document.getElementById('commSuggestModal');
    if (!modal) return;
    const overlay = modal.querySelector('.comm-leave-overlay');
    overlay.classList.remove('rx-visible');
    setTimeout(() => modal.remove(), 300);
  }

  // ── Wire the "Suggest a Community" button ────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const suggestBtn = document.getElementById('commSuggestBtn');
    if (suggestBtn) {
      suggestBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSuggestModal();
      });
    }
  });

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', fetchCommunities);

}());
