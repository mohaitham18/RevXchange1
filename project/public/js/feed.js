/* ═══════════════════════════════════════════════════════════
   RevXChange — Feed Page
   Stage D: unified community feed
   ═══════════════════════════════════════════════════════════ */

(function () {

  // ── Auth helpers ─────────────────────────────────────────
  function getToken() { return localStorage.getItem('rxToken') || null; }
  function isLoggedIn() { return !!getToken(); }
  function getUserName() { return localStorage.getItem('rxUser') || null; }

  // ── State ────────────────────────────────────────────────
  let currentSort   = 'top';
  let currentPage   = 1;
  let currentCommId = null; // null = unified feed
  let communities   = [];

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    updateHero();
    await loadSidebars();
    await loadFeed();
    bindSortTabs();
  });

  // ── Hero text ─────────────────────────────────────────────
  function updateHero() {
    const title = document.getElementById('feedHeroTitle');
    const sub   = document.getElementById('feedHeroSub');
    const name  = getUserName();
    if (name && title) {
      title.textContent = name.split(' ')[0] + "'s Feed";
      if (sub) sub.textContent = 'Posts from your communities';
    }
  }

  // ── Load both sidebars ───────────────────────────────────
  async function loadSidebars() {
    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();
      const res  = await fetch('/api/communities', { headers });
      const data = await res.json();
      communities = data.communities || [];
      renderLeftSidebar();
      renderRightSidebar();
    } catch (e) {
      console.error('Sidebar load failed:', e);
    }
  }

  // ── Left sidebar: Your Communities ───────────────────────
  function renderLeftSidebar() {
    const el = document.getElementById('feedYourComms');
    if (!el) return;

    if (!isLoggedIn()) {
      el.innerHTML = `
        <div class="feed-login-prompt">
          <p>Log in to see your communities and get a personalized feed.</p>
          <a href="/login.html?returnTo=%2Ffeed.html" class="feed-login-btn">
            Log In
          </a>
        </div>`;
      return;
    }

    const joined = communities.filter(c => c.joined);

    if (joined.length === 0) {
      el.innerHTML = `
        <div class="feed-login-prompt">
          <p>You haven't joined any communities yet.</p>
        </div>`;
      return;
    }

    // Central pinned first
    const central = joined.find(c => c.isCentral);
    const others  = joined.filter(c => !c.isCentral)
                          .sort((a, b) => b.memberCount - a.memberCount);
    const sorted  = central ? [central, ...others] : others;

    // "All Feed" item at very top
    el.innerHTML = `
      <div class="feed-comm-item ${currentCommId === null ? 'active' : ''}"
           data-commid="null" style="margin-bottom:4px;">
        <span style="font-size:1.1rem;flex-shrink:0;">🏠</span>
        <span class="feed-comm-name">All Communities</span>
      </div>
      ${sorted.map(c => {
        const isCentral = c.isCentral;
        const logo = c.brandId?.logoUrl || '';
        const name = isCentral ? 'RevXChange Central' : (c.brandId?.name || '') + ' ' + c.name;
        const glow = c.brandId?.glowColor || '#ccc';
        const isActive = currentCommId === c._id.toString();
        return `
          <div class="feed-comm-item ${isCentral ? 'feed-comm-item-central' : ''} ${isActive ? 'active' : ''}"
               data-commid="${c._id}">
            <img class="feed-comm-logo"
                 src="${logo}" alt="${name}"
                 onerror="this.style.opacity='0'">
            <span class="feed-comm-name">${name}</span>
            ${!isCentral ? `<span class="feed-comm-dot" style="background:${glow}"></span>` : ''}
          </div>`;
      }).join('')}`;

    // Click handlers
    el.querySelectorAll('.feed-comm-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.commid;
        currentCommId = id === 'null' ? null : id;
        currentPage   = 1;
        renderLeftSidebar();
        loadFeed();
      });
    });
  }

  // ── Right sidebar: Suggested + Explore ──────────────────
  function renderRightSidebar() {
    const el = document.getElementById('feedSuggested');
    if (!el) return;

    const notJoined = communities
      .filter(c => !c.joined && !c.isCentral)
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 5);

    if (notJoined.length === 0) {
      el.innerHTML = '<div class="feed-sidebar-title">Explore More</div><p style="font-size:0.82rem;color:var(--text-light);font-family:Segoe UI,sans-serif;">You\'ve joined all communities!</p>';
      return;
    }

    el.innerHTML = `
      <div class="feed-sidebar-title">Explore More</div>
      ${notJoined.map(c => `
        <div class="feed-suggested-item">
          <img class="feed-suggested-logo"
               src="${c.brandId?.logoUrl || ''}"
               alt="${c.brandId?.name || c.name}"
               onerror="this.style.opacity='0'">
          <div class="feed-suggested-info">
            <div class="feed-suggested-name">${c.brandId?.name || ''} ${c.name}</div>
            <div class="feed-suggested-members">${formatMembers(c.memberCount)} members</div>
          </div>
          <button class="feed-suggested-join"
                  data-id="${c._id}"
                  onclick="handleSuggestedJoin(this, '${c._id}')">
            Join
          </button>
        </div>`).join('')}`;
  }

  // ── Load feed posts ──────────────────────────────────────
  async function loadFeed() {
    const container = document.getElementById('feedPosts');
    if (!container) return;

    // Skeleton
    container.innerHTML = Array(4).fill(
      '<div class="feed-skel" style="height:160px;"></div>'
    ).join('');

    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();

      let url;
      if (currentCommId) {
        const comm = communities.find(c => c._id === currentCommId);
        const slug = comm?.slug || currentCommId;
        url = `/api/communities/${slug}/posts?sort=${currentSort}&page=${currentPage}`;
      } else {
        url = `/api/feed?sort=${currentSort}&page=${currentPage}`;
      }

      const res  = await fetch(url, { headers });

      // Fall back to unified feed if per-community endpoint not yet available
      if (!res.ok && currentCommId) {
        const fallback = await fetch(
          `/api/feed?sort=${currentSort}&page=${currentPage}&communityId=${currentCommId}`,
          { headers }
        );
        const data = fallback.ok ? await fallback.json() : { posts: [] };
        renderPosts(data.posts || [], container);
        renderPagination(data);
        return;
      }

      const data  = await res.json();
      const posts = data.posts || [];

      renderPosts(posts, container);
      renderPagination(data);
    } catch (e) {
      console.error('Feed load failed:', e);
      container.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">⚠️</div><div class="feed-empty-title">Failed to load posts</div><div class="feed-empty-sub">Please refresh the page.</div></div>';
    }
  }

  // ── Render posts ─────────────────────────────────────────
  function renderPosts(posts, container) {
    if (posts.length === 0) {
      const isPersonal = isLoggedIn() && !currentCommId;
      container.innerHTML = `
        <div class="feed-empty">
          <div class="feed-empty-icon">${isPersonal ? '🚗' : '📭'}</div>
          <div class="feed-empty-title">
            ${isPersonal ? 'Your feed is empty' : 'No posts yet'}
          </div>
          <div class="feed-empty-sub">
            ${isPersonal
              ? 'Join some communities to see posts here.'
              : 'Be the first to post in this community.'}
          </div>
        </div>`;
      return;
    }

    container.innerHTML = posts.map(renderPostCard).join('');
  }

  // ── Single post card ─────────────────────────────────────
  function renderPostCard(post) {
    const author    = post.author;
    const community = post.community;
    const variant   = post.variant;

    const authorName    = author?.name || 'Anonymous';
    const authorInitial = authorName.charAt(0).toUpperCase();
    const commName      = community
      ? (community.isCentral ? 'RevXChange Central' : (community.brand?.name || '') + ' ' + community.name)
      : '';
    const commLogo      = community?.brand?.logoUrl || '';
    const variantTag    = variant ? `<span class="feed-post-variant">${variant.label}</span>` : '';
    const timeAgo       = formatTime(post.createdAt);
    const editedTag     = post.isEdited ? ' <span style="font-size:0.7rem;color:var(--text-light)">(edited)</span>' : '';

    const bodyPreview = post.body
      ? post.body.replace(/<[^>]*>/g, '').slice(0, 300)
      : '';

    return `
      <div class="feed-post" data-id="${post._id}">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <a class="feed-post-community" href="/communities.html">
            <img class="feed-post-comm-logo"
                 src="${commLogo}" alt="${commName}"
                 onerror="this.style.opacity='0'">
            <span class="feed-post-comm-name">${commName}</span>
          </a>
          ${variantTag}
        </div>

        <div class="feed-post-header">
          <div class="feed-post-avatar">${authorInitial}</div>
          <div>
            <div class="feed-post-author">${authorName}${editedTag}</div>
            <div class="feed-post-time">${timeAgo}</div>
          </div>
        </div>

        ${post.title ? `<div class="feed-post-title">${post.title}</div>` : ''}
        ${bodyPreview ? `<div class="feed-post-body">${bodyPreview}</div>` : ''}

        <div class="feed-post-actions">
          <div class="feed-post-vote">
            <button class="feed-vote-btn upvote-btn" data-id="${post._id}" data-value="1">
              ▲ ${formatNum(post.upvotes)}
            </button>
            <div class="feed-vote-divider"></div>
            <button class="feed-vote-btn downvote-btn" data-id="${post._id}" data-value="-1">
              ▼ ${formatNum(post.downvotes)}
            </button>
          </div>
          <button class="feed-post-action-btn">
            💬 ${formatNum(post.commentCount)}
          </button>
          <button class="feed-post-action-btn">
            ↗ Share
          </button>
        </div>

      </div>`;
  }

  // ── Pagination ───────────────────────────────────────────
  function renderPagination(data) {
    const el = document.getElementById('feedPagination');
    if (!el) return;

    if (!data.totalPages || data.totalPages <= 1) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <button class="feed-page-btn" id="feedPrevBtn"
              ${currentPage <= 1 ? 'disabled' : ''}>
        ← Previous
      </button>
      <span class="feed-page-info">Page ${currentPage} of ${data.totalPages}</span>
      <button class="feed-page-btn" id="feedNextBtn"
              ${!data.hasNextPage ? 'disabled' : ''}>
        Next →
      </button>`;

    document.getElementById('feedPrevBtn')?.addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; loadFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    document.getElementById('feedNextBtn')?.addEventListener('click', () => {
      if (data.hasNextPage) { currentPage++; loadFeed(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  }

  // ── Sort tabs ────────────────────────────────────────────
  function bindSortTabs() {
    document.querySelectorAll('.feed-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.feed-sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        currentPage = 1;
        loadFeed();
      });
    });
  }

  // ── Suggested join handler ───────────────────────────────
  window.handleSuggestedJoin = async function(btn, communityId) {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        }
      });
      if (res.ok) {
        const comm = communities.find(c => c._id === communityId);
        if (comm) { comm.joined = true; comm.memberCount++; }
        renderLeftSidebar();
        renderRightSidebar();
        btn.textContent = '✓';
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
      }
    } catch (e) { console.error(e); }
    finally { btn.disabled = false; }
  };

  // ── Helpers ──────────────────────────────────────────────
  function formatMembers(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
  }

  function formatNum(n) {
    if (!n && n !== 0) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 7)  return d + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  // ── Create Post ───────────────────────────────────────────

  // Update compose bar avatar with user initial
  function updateComposeBar() {
    const avatar = document.getElementById('feedComposeAvatar');
    const name   = getUserName();
    if (avatar && name) {
      avatar.textContent = name.charAt(0).toUpperCase();
    }
  }

  // Populate community dropdown with joined communities
  function populatePostCommunities() {
    const sel = document.getElementById('feedPostCommunity');
    if (!sel) return;

    const joined = communities.filter(c => c.joined);
    sel.innerHTML = '<option value="">Select a community...</option>' +
      joined.map(c => {
        const name = c.isCentral
          ? 'RevXChange Central'
          : (c.brandId?.name || '') + ' ' + c.name;
        const selected = currentCommId && c._id === currentCommId ? 'selected' : '';
        return `<option value="${c._id}" ${selected}>${name}</option>`;
      }).join('');

    // Trigger variant load for pre-selected community
    if (currentCommId) loadVariants(currentCommId);
  }

  // Load variants for selected community
  async function loadVariants(communityId) {
    const field  = document.getElementById('feedVariantField');
    const sel    = document.getElementById('feedPostVariant');
    if (!field || !sel) return;

    const comm = communities.find(c => c._id === communityId);
    if (!comm) { field.style.display = 'none'; return; }

    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();
      const res  = await fetch(`/api/communities/${comm.slug}/variants`, { headers });
      if (!res.ok) { field.style.display = 'none'; return; }
      const data = await res.json();
      const variants = data.variants || [];

      if (variants.length === 0) { field.style.display = 'none'; return; }

      sel.innerHTML = '<option value="">General — no specific variant</option>' +
        variants.map(v => `<option value="${v._id}">${v.label}</option>`).join('');
      field.style.display = 'flex';
    } catch (e) {
      field.style.display = 'none';
    }
  }

  // Open modal
  function openPostModal() {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }

    const joined = communities.filter(c => c.joined);
    if (joined.length === 0) {
      alert('Join a community first before posting!');
      return;
    }

    populatePostCommunities();

    const modal = document.getElementById('feedPostModal');
    if (modal) {
      modal.classList.add('rx-open');
      document.body.style.overflow = 'hidden';
      document.getElementById('feedPostTitle')?.focus();
    }
  }

  // Close modal
  function closePostModal() {
    const modal = document.getElementById('feedPostModal');
    if (modal) {
      modal.classList.remove('rx-open');
      document.body.style.overflow = '';
    }
    // Reset form
    const title = document.getElementById('feedPostTitle');
    const body  = document.getElementById('feedPostBody');
    if (title) title.value = '';
    if (body)  body.value  = '';
    updateCounters();
    document.getElementById('feedModalSubmit').disabled = true;
    document.getElementById('feedVariantField').style.display = 'none';
  }

  // Update character counters
  function updateCounters() {
    const title      = document.getElementById('feedPostTitle');
    const body       = document.getElementById('feedPostBody');
    const titleCount = document.getElementById('feedTitleCounter');
    const bodyCount  = document.getElementById('feedBodyCounter');

    if (title && titleCount) {
      const len = title.value.length;
      titleCount.textContent = `${len} / 300`;
      titleCount.className = 'feed-modal-counter' +
        (len > 270 ? ' warn' : '') +
        (len >= 300 ? ' danger' : '');
    }

    if (body && bodyCount) {
      const len = body.value.length;
      bodyCount.textContent = `${len.toLocaleString()} / 10,000`;
      bodyCount.className = 'feed-modal-counter' +
        (len > 9000 ? ' warn' : '') +
        (len >= 10000 ? ' danger' : '');
    }

    // Enable submit only if title has content
    const submitBtn = document.getElementById('feedModalSubmit');
    if (submitBtn && title) {
      submitBtn.disabled = title.value.trim().length === 0;
    }
  }

  // Submit post
  async function submitPost() {
    const communityId = document.getElementById('feedPostCommunity')?.value;
    const title       = document.getElementById('feedPostTitle')?.value.trim();
    const body        = document.getElementById('feedPostBody')?.value.trim();
    const variantId   = document.getElementById('feedPostVariant')?.value || null;

    if (!title || !communityId) return;

    const submitBtn     = document.getElementById('feedModalSubmit');
    const submitLabel   = submitBtn.querySelector('.feed-submit-label');
    const submitSpinner = submitBtn.querySelector('.feed-submit-spinner');

    // Show spinner
    submitBtn.disabled = true;
    submitLabel.style.display = 'none';
    submitSpinner.style.display = 'flex';

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({
          communityId,
          title,
          body,
          variantId: variantId || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        closePostModal();
        insertPendingPost(data.post);
      } else {
        const err = await res.json();
        console.error('Post failed:', err.message);
        submitBtn.disabled = false;
        submitLabel.style.display = '';
        submitSpinner.style.display = 'none';
      }
    } catch (e) {
      console.error('Submit error:', e);
      submitBtn.disabled = false;
      submitLabel.style.display = '';
      submitSpinner.style.display = 'none';
    }
  }

  // Insert post at top of feed with pending animation
  function insertPendingPost(post) {
    const container = document.getElementById('feedPosts');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderPostCard(post);
    const postEl = wrapper.firstElementChild;
    postEl.classList.add('feed-post-pending');

    const bar = document.createElement('div');
    bar.className = 'feed-post-pending-bar';
    postEl.appendChild(bar);

    container.insertBefore(postEl, container.firstChild);

    setTimeout(() => {
      postEl.classList.remove('feed-post-pending');
      bar.remove();
    }, 1500);
  }

  // ── Event listeners for create post ──────────────────────
  document.getElementById('feedComposeBar')
    ?.addEventListener('click', openPostModal);
  document.getElementById('feedComposeBtn')
    ?.addEventListener('click', (e) => { e.stopPropagation(); openPostModal(); });
  document.getElementById('feedModalClose')
    ?.addEventListener('click', closePostModal);
  document.getElementById('feedModalCancel')
    ?.addEventListener('click', closePostModal);
  document.getElementById('feedModalSubmit')
    ?.addEventListener('click', submitPost);

  document.getElementById('feedPostModal')
    ?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('feedPostModal')) closePostModal();
    });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' &&
        document.getElementById('feedPostModal')?.classList.contains('rx-open')) {
      closePostModal();
    }
  });

  document.getElementById('feedPostTitle')
    ?.addEventListener('input', updateCounters);
  document.getElementById('feedPostBody')
    ?.addEventListener('input', updateCounters);

  document.getElementById('feedPostCommunity')
    ?.addEventListener('change', (e) => {
      if (e.target.value) loadVariants(e.target.value);
      else document.getElementById('feedVariantField').style.display = 'none';
    });

  // Init compose bar
  updateComposeBar();

}());
