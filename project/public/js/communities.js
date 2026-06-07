/* ═══════════════════════════════════════════════════════════
   RevXChange — Car Communities
   Stage C: real API, two-column layout, brand glows
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
  let allCommunities  = [];   // full list from API
  let searchQuery     = '';

  // ── Fetch communities from API ───────────────────────────
  async function fetchCommunities() {
    const grid  = document.getElementById('commGrid');
    const yours = document.getElementById('commYoursList');
    if (!grid) return;

    // Show skeletons while loading
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

  // ── Render main grid ─────────────────────────────────────
  function renderGrid() {
    const grid = document.getElementById('commGrid');
    if (!grid) return;

    const central = allCommunities.find(c => c.isCentral);
    let regular   = allCommunities.filter(c => !c.isCentral);

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      regular = regular.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.brandId?.name || '').toLowerCase().includes(q)
      );
    }

    // Sort by memberCount descending
    regular.sort((a, b) => b.memberCount - a.memberCount);

    let html = '';

    // Central card always first
    if (central && !searchQuery) {
      html += renderCentralCard(central);
    }

    // Regular cards
    if (regular.length === 0) {
      html += '<div class="comm-no-results">No communities match your search.</div>';
    } else {
      html += regular.map(renderRegularCard).join('');
    }

    grid.innerHTML = html;
    attachJoinListeners();
  }

  // ── Render "Your Communities" sidebar ────────────────────
  function renderYours() {
    const list = document.getElementById('commYoursList');
    if (!list) return;

    // Central community always pinned first, then others by memberCount
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

    // Wire leave buttons in sidebar
    list.querySelectorAll('.comm-yours-leave-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn()) { window.location.href = '/login.html'; return; }
        showLeaveConfirm(btn.dataset.id, btn.dataset.name);
      });
    });

    // Wire manage buttons (placeholder for Stage D variant picker)
    list.querySelectorAll('.comm-yours-manage-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        alert('Membership management coming soon!');
      });
    });

    // Wire central card click → feed
    list.querySelectorAll('.comm-yours-card-central').forEach(card => {
      card.addEventListener('click', () => {
        window.location.href = '/feed.html';
      });
    });

    // Wire non-central card clicks → feed filtered by community
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
    // Wire card clicks → redirect to feed with community pre-selected
    document.querySelectorAll('.comm-card[data-slug]').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't redirect if clicking the join/leave button itself
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
    renderGrid();
  });

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', fetchCommunities);

}());
