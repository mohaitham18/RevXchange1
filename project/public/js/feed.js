/* ═══════════════════════════════════════════════════════════
   RevXChange — Feed Page
   Stage D: unified community feed
   ═══════════════════════════════════════════════════════════ */

(function () {

  const DELETED_POST_TOMBSTONE_MS = 5 * 60 * 1000; // 5 minutes

  // ── Auth helpers ─────────────────────────────────────────
  function getToken() { return localStorage.getItem('rxToken') || null; }
  function isLoggedIn() { return !!getToken(); }
  function getUserName() { return localStorage.getItem('rxUser') || null; }

  // Backfill rxUserId for sessions that predate the explicit save
  if (!localStorage.getItem('rxUserId')) {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const id = u._id || u.id || '';
      if (id) localStorage.setItem('rxUserId', id);
    } catch {}
  }

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
            ${!isCentral ? `<span class="feed-comm-dot" style="background:${glow}"></span>
            <button class="feed-comm-menu-btn"
                    data-commid="${c._id}"
                    data-commname="${(c.brandId?.name || '') + ' ' + c.name}"
                    aria-label="Community options">⋯</button>` : ''}
          </div>`;
      }).join('')}`;

    // Click handlers
    el.querySelectorAll('.feed-comm-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.feed-comm-menu-btn')) return;
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
    // Build menus after render
    posts.forEach(p => buildPostMenu(
      p._id,
      (p.author?._id || p.authorId?._id || '').toString()
    ));
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

        <div class="feed-post-menu-wrap">
          <button class="feed-post-menu-btn"
                  data-postid="${post._id}"
                  data-authorid="${post.author?._id || ''}"
                  aria-label="Post options">⋯</button>
          <div class="feed-post-dropdown" id="postMenu_${post._id}">
            <button class="feed-post-dropdown-item"
                    data-action="report"
                    data-postid="${post._id}">
              🚩 Report Post
            </button>
          </div>
        </div>

        <div class="feed-post-actions">
          <div class="feed-post-vote">
            <button class="feed-vote-btn upvote-btn ${post.userVote === 1 ? 'upvoted' : ''}"
                    data-id="${post._id}" data-value="1">
              ▲ ${formatNum(post.upvotes)}
            </button>
            <div class="feed-vote-divider"></div>
            <button class="feed-vote-btn downvote-btn ${post.userVote === -1 ? 'downvoted' : ''}"
                    data-id="${post._id}" data-value="-1">
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

  // Build post menu items based on ownership
  function buildPostMenu(postId, authorId) {
    const menu = document.getElementById('postMenu_' + postId);
    if (!menu) return;

    const token    = getToken();
    const storedId = localStorage.getItem('rxUserId');

    const isOwner = token && storedId && storedId === authorId;

    if (isOwner) {
      menu.innerHTML = `
        <button class="feed-post-dropdown-item"
                data-action="edit" data-postid="${postId}">
          ✏️ Edit Post
        </button>
        <button class="feed-post-dropdown-item danger"
                data-action="delete" data-postid="${postId}">
          🗑️ Delete Post
        </button>
        <div class="feed-post-dropdown-divider"></div>
        <button class="feed-post-dropdown-item"
                data-action="report" data-postid="${postId}">
          🚩 Report Post
        </button>`;
    } else {
      menu.innerHTML = `
        <button class="feed-post-dropdown-item"
                data-action="report" data-postid="${postId}">
          🚩 Report Post
        </button>`;
    }
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

    const modalTitle  = document.querySelector('.feed-modal-title');
    const submitLabel = document.querySelector('.feed-submit-label');
    const titleInput  = document.getElementById('feedPostTitle');
    if (modalTitle)  modalTitle.textContent  = 'Create Post';
    if (submitLabel) submitLabel.textContent = 'Post';
    if (titleInput)  titleInput.removeAttribute('data-editing-post-id');

    // Restore community field visibility
    const commField = document.getElementById('feedPostCommunity')
                               ?.closest('.feed-modal-field');
    if (commField) commField.style.display = '';
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
    const titleInput  = document.getElementById('feedPostTitle');
    const editingId   = titleInput?.getAttribute('data-editing-post-id') || null;
    const isEditing   = !!editingId;
    const communityId = document.getElementById('feedPostCommunity')?.value;
    const title       = titleInput?.value.trim();
    const body        = document.getElementById('feedPostBody')?.value.trim() || '';
    const variantId   = document.getElementById('feedPostVariant')?.value || null;

    if (!title) return;
    if (!isEditing && !communityId) return;

    const submitBtn     = document.getElementById('feedModalSubmit');
    const submitLabel   = submitBtn?.querySelector('.feed-submit-label');
    const submitSpinner = submitBtn?.querySelector('.feed-submit-spinner');

    // Show spinner
    if (submitBtn)     submitBtn.disabled = true;
    if (submitLabel)   submitLabel.style.display = 'none';
    if (submitSpinner) submitSpinner.style.display = 'flex';

    const url    = isEditing ? `/api/posts/${editingId}` : '/api/posts';
    const method = isEditing ? 'PATCH' : 'POST';
    const payload = isEditing
      ? { title, body }
      : { communityId, title, body, variantId: variantId || undefined };

    try {
      const res  = await fetch(url, {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      // Reset spinner regardless of outcome
      if (submitBtn)     submitBtn.disabled = false;
      if (submitLabel)   submitLabel.style.display = '';
      if (submitSpinner) submitSpinner.style.display = 'none';

      if (res.ok) {
        closePostModal();

        if (isEditing) {
          const postEl = document.querySelector(`.feed-post[data-id="${editingId}"]`);
          if (postEl) {
            const titleEl  = postEl.querySelector('.feed-post-title');
            const bodyEl   = postEl.querySelector('.feed-post-body');
            const authorEl = postEl.querySelector('.feed-post-author');

            if (titleEl) titleEl.textContent = title;
            if (bodyEl && body) bodyEl.textContent = body;

            if (authorEl && !authorEl.querySelector('.feed-edited-tag')) {
              const tag = document.createElement('span');
              tag.className = 'feed-edited-tag';
              tag.textContent = ' (edited)';
              authorEl.appendChild(tag);
            }
          }
        } else {
          insertPendingPost(data.post);
        }
      } else {
        console.error('Submit failed:', data.message);
        alert(data.message || 'Failed to submit post. Please try again.');
      }
    } catch (e) {
      console.error('Submit error:', e);
      if (submitBtn)     submitBtn.disabled = false;
      if (submitLabel)   submitLabel.style.display = '';
      if (submitSpinner) submitSpinner.style.display = 'none';
      alert('Network error. Please try again.');
    }
  }

  // Insert post at top of feed with pending animation
  function insertPendingPost(post) {
    const container = document.getElementById('feedPosts');
    if (!container) return;

    // postRoutes returns authorId/communityId fields — normalize
    // to match the shape renderPostCard expects (author/community)
    const normalized = {
      ...post,
      author: post.authorId || post.author,
      community: post.communityId
        ? {
            _id:         post.communityId._id,
            name:        post.communityId.name,
            slug:        post.communityId.slug,
            isCentral:   post.communityId.isCentral,
            memberCount: post.communityId.memberCount,
            postCount:   post.communityId.postCount,
            brand:       post.communityId.brandId || null
          }
        : (post.community || null),
      variant: post.variantId || post.variant || null
    };
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderPostCard(normalized);
    const postEl = wrapper.firstElementChild;
    postEl.classList.add('feed-post-pending');

    const bar = document.createElement('div');
    bar.className = 'feed-post-pending-bar';
    postEl.appendChild(bar);

    container.insertBefore(postEl, container.firstChild);
    buildPostMenu(
      post._id || normalized?._id,
      (post.author?._id || post.authorId?._id || '').toString()
    );

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

  // ── Post three-dot menu handler ───────────────────────────

  let activePostMenu = null;
  let postMenuJustOpened = false;

  document.addEventListener('click', (e) => {
    // Toggle post menu
    const menuBtn = e.target.closest('.feed-post-menu-btn');
    if (menuBtn) {
      e.stopPropagation();
      const postId = menuBtn.dataset.postid;
      const menu   = document.getElementById('postMenu_' + postId);
      if (!menu) return;

      const isOpen = menu.classList.contains('rx-open');

      // Close any other open menu first
      if (activePostMenu && activePostMenu !== menu) {
        activePostMenu.classList.remove('rx-open');
        activePostMenu = null;
      }

      if (isOpen) {
        menu.classList.remove('rx-open');
        activePostMenu = null;
      } else {
        menu.classList.add('rx-open');
        activePostMenu = menu;
        postMenuJustOpened = true;
        setTimeout(() => { postMenuJustOpened = false; }, 50);
      }
      return;
    }

    // Handle menu item clicks
    const item = e.target.closest('.feed-post-dropdown-item');
    if (item && item.closest('.feed-post-dropdown')) {
      e.stopPropagation();
      const action = item.dataset.action;
      const postId = item.dataset.postid;

      if (activePostMenu) {
        activePostMenu.classList.remove('rx-open');
        activePostMenu = null;
      }

      if (action === 'save')   handleSavePost(postId);
      if (action === 'edit')   handleEditPost(postId);
      if (action === 'delete') handleDeletePost(postId);
      if (action === 'report') handleReportPost(postId);
      return;
    }

    // Click outside — close menu (but not if we just opened it)
    if (activePostMenu && !postMenuJustOpened) {
      activePostMenu.classList.remove('rx-open');
      activePostMenu = null;
    }
  });

  function handleEditPost(postId) {
    const postEl = document.querySelector(`.feed-post[data-id="${postId}"]`);
    if (!postEl) return;

    const titleEl = postEl.querySelector('.feed-post-title');
    const bodyEl  = postEl.querySelector('.feed-post-body');

    // Open modal
    openPostModal();

    setTimeout(() => {
      // Hide community selector — can't change community when editing
      const commField = document.getElementById('feedPostCommunity')?.closest('.feed-modal-field');
      if (commField) commField.style.display = 'none';

      // Hide variant field too
      const variantField = document.getElementById('feedVariantField');
      if (variantField) variantField.style.display = 'none';

      // Pre-fill title
      const titleInput = document.getElementById('feedPostTitle');
      if (titleInput && titleEl) {
        titleInput.value = titleEl.textContent
          .replace('(edited)', '').trim();
        // Store the post ID being edited
        titleInput.setAttribute('data-editing-post-id', postId);
      }

      // Pre-fill body
      const bodyInput = document.getElementById('feedPostBody');
      if (bodyInput && bodyEl) {
        bodyInput.value = bodyEl.textContent.trim();
      }

      // Update counters and enable submit
      updateCounters();
      const submitBtn = document.getElementById('feedModalSubmit');
      if (submitBtn) submitBtn.disabled = false;

      // Change modal title and submit label
      const modalTitle  = document.querySelector('.feed-modal-title');
      const submitLabel = document.querySelector('.feed-submit-label');
      if (modalTitle)  modalTitle.textContent  = 'Edit Post';
      if (submitLabel) submitLabel.textContent = 'Save Changes';
    }, 80);
  }

  function handleDeletePost(postId) {
    const existing = document.getElementById('commLeaveModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'commLeaveModal';
    modal.innerHTML = `
      <div class="comm-leave-overlay" id="commLeaveOverlay">
        <div class="comm-leave-modal">
          <div class="comm-leave-icon">🗑️</div>
          <h3 class="comm-leave-title">Delete Post?</h3>
          <p class="comm-leave-desc">
            Are you sure you want to delete this post?
            This action <strong>cannot be undone</strong>.
          </p>
          <div class="comm-leave-actions">
            <button class="comm-leave-no" id="commLeaveNo">Cancel</button>
            <button class="comm-leave-yes" id="commLeaveYes">Yes, Delete</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    requestAnimationFrame(() => {
      modal.querySelector('.comm-leave-overlay').classList.add('rx-visible');
    });

    document.getElementById('commLeaveNo').addEventListener('click', () => {
      modal.querySelector('.comm-leave-overlay').classList.remove('rx-visible');
      setTimeout(() => modal.remove(), 300);
    });

    document.getElementById('commLeaveOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('commLeaveOverlay')) {
        modal.querySelector('.comm-leave-overlay').classList.remove('rx-visible');
        setTimeout(() => modal.remove(), 300);
      }
    });

    document.getElementById('commLeaveYes').addEventListener('click', async () => {
      modal.querySelector('.comm-leave-overlay').classList.remove('rx-visible');
      setTimeout(() => modal.remove(), 300);

      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (res.ok) {
          const postEl = document.querySelector(`.feed-post[data-id="${postId}"]`);
          if (postEl) {
            const authorName = postEl.querySelector('.feed-post-author')
                                     ?.textContent
                                     ?.replace('(edited)', '')
                                     .trim() || 'Deleted User';

            postEl.classList.add('feed-post-tombstone');
            postEl.innerHTML = `
              <div class="feed-tombstone-inner">
                <span class="feed-tombstone-author">${authorName}</span>
                <span class="feed-tombstone-text">[Deleted post]</span>
              </div>`;

            setTimeout(() => {
              postEl.style.transition = 'opacity 0.4s ease, max-height 0.4s ease';
              postEl.style.opacity    = '0';
              postEl.style.maxHeight  = '0';
              postEl.style.padding    = '0';
              postEl.style.margin     = '0';
              setTimeout(() => postEl.remove(), 420);
            }, DELETED_POST_TOMBSTONE_MS);
          }
        } else {
          const err = await res.json();
          console.error('Delete failed:', err.message);
          alert('Failed to delete post. Please try again.');
        }
      } catch (e) {
        console.error('Delete error:', e);
      }
    });
  }

  function handleSavePost(postId) {
    // Stage H: will connect to /api/users/saved-posts
    const saved = JSON.parse(localStorage.getItem('rxSavedPosts') || '[]');
    if (!saved.includes(postId)) {
      saved.push(postId);
      localStorage.setItem('rxSavedPosts', JSON.stringify(saved));
    }
  }

  function handleReportPost(postId) {
    alert('Thank you for your report. Our team will review this post.');
  }

  // ── Vote handler ─────────────────────────────────────────
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.feed-vote-btn');
    if (!btn) return;

    // Auth gate
    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }

    const postId = btn.dataset.id;
    const value  = parseInt(btn.dataset.value, 10); // 1 or -1
    const postEl = btn.closest('.feed-post');
    if (!postEl) return;

    const upBtn   = postEl.querySelector('.upvote-btn');
    const downBtn = postEl.querySelector('.downvote-btn');

    // Read current vote state from CSS classes
    const wasUpvoted   = upBtn.classList.contains('upvoted');
    const wasDownvoted = downBtn.classList.contains('downvoted');

    // Determine new vote value — clicking same direction toggles off
    let newValue;
    if (value === 1  && wasUpvoted)   newValue = 0;
    else if (value === -1 && wasDownvoted) newValue = 0;
    else newValue = value;

    // ── Optimistic update ──────────────────────────────────
    const parseCount = (b) => {
      const txt = b.textContent.replace(/[▲▼\s]/g, '');
      if (txt.endsWith('K')) return Math.round(parseFloat(txt) * 1000);
      return parseInt(txt, 10) || 0;
    };

    let ups   = parseCount(upBtn);
    let downs = parseCount(downBtn);

    // Undo previous vote
    if (wasUpvoted)   ups   = Math.max(0, ups - 1);
    if (wasDownvoted) downs = Math.max(0, downs - 1);

    // Apply new vote
    if (newValue === 1)  ups++;
    if (newValue === -1) downs++;

    upBtn.textContent   = '▲ ' + formatNum(ups);
    downBtn.textContent = '▼ ' + formatNum(downs);
    upBtn.classList.toggle('upvoted',     newValue === 1);
    downBtn.classList.toggle('downvoted', newValue === -1);

    // Disable during API call
    upBtn.disabled   = true;
    downBtn.disabled = true;

    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ value: newValue })
      });

      if (res.ok) {
        const data = await res.json();
        // Reconcile with server truth
        upBtn.textContent   = '▲ ' + formatNum(data.upvotes);
        downBtn.textContent = '▼ ' + formatNum(data.downvotes);
        upBtn.classList.toggle('upvoted',     data.userVote === 1);
        downBtn.classList.toggle('downvoted', data.userVote === -1);
      } else if (res.status === 403) {
        // Own post — revert silently
        upBtn.textContent   = '▲ ' + formatNum(wasUpvoted ? ups + 1 : ups);
        downBtn.textContent = '▼ ' + formatNum(wasDownvoted ? downs + 1 : downs);
        upBtn.classList.toggle('upvoted',     wasUpvoted);
        downBtn.classList.toggle('downvoted', wasDownvoted);
      } else {
        // Any other error — revert
        upBtn.textContent   = '▲ ' + formatNum(wasUpvoted ? ups + 1 : ups);
        downBtn.textContent = '▼ ' + formatNum(wasDownvoted ? downs + 1 : downs);
        upBtn.classList.toggle('upvoted',     wasUpvoted);
        downBtn.classList.toggle('downvoted', wasDownvoted);
      }
    } catch (err) {
      console.error('Vote error:', err);
      // Network error — revert
      upBtn.textContent   = '▲ ' + formatNum(wasUpvoted ? ups + 1 : ups);
      downBtn.textContent = '▼ ' + formatNum(wasDownvoted ? downs + 1 : downs);
      upBtn.classList.toggle('upvoted',     wasUpvoted);
      downBtn.classList.toggle('downvoted', wasDownvoted);
    } finally {
      upBtn.disabled   = false;
      downBtn.disabled = false;
    }
  });

  // ── Community sidebar menu (body-level dropdown) ─────────

  let activeCommMenu     = null;
  let activeCommMenuBtn  = null;
  let commMenuJustOpened = false;

  function openCommMenu(btn) {
    const commId   = btn.dataset.commid;
    const commName = btn.dataset.commname || 'this community';

    const existing = document.getElementById('feedCommMenuDropdown');
    if (existing) existing.remove();

    const dropdown = document.createElement('div');
    dropdown.id        = 'feedCommMenuDropdown';
    dropdown.className = 'feed-comm-dropdown rx-open';
    dropdown.innerHTML = `
      <button class="feed-comm-dropdown-item"
              data-action="leave"
              data-commid="${commId}"
              data-commname="${commName}">
        🚪 Leave Community
      </button>
      <div class="feed-post-dropdown-divider"></div>
      <button class="feed-comm-dropdown-item"
              data-action="manage"
              data-commid="${commId}">
        ⚙️ Manage Membership
      </button>`;

    document.body.appendChild(dropdown);

    const rect = btn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top      = (rect.bottom + 6) + 'px';
    dropdown.style.left     = Math.max(8, rect.right - 190) + 'px';
    dropdown.style.width    = '190px';
    dropdown.style.zIndex   = '9999';

    activeCommMenu     = dropdown;
    activeCommMenuBtn  = btn;
    commMenuJustOpened = true;
    setTimeout(() => { commMenuJustOpened = false; }, 50);
  }

  function closeCommMenu() {
    if (activeCommMenu) {
      activeCommMenu.remove();
      activeCommMenu    = null;
      activeCommMenuBtn = null;
    }
  }

  document.addEventListener('click', (e) => {
    const commBtn = e.target.closest('.feed-comm-menu-btn');
    if (commBtn) {
      e.stopPropagation();
      if (activeCommMenu) {
        closeCommMenu();
        if (activeCommMenuBtn === commBtn) return;
      }
      openCommMenu(commBtn);
      return;
    }

    const commItem = e.target.closest('.feed-comm-dropdown-item');
    if (commItem && commItem.closest('#feedCommMenuDropdown')) {
      e.stopPropagation();
      const action   = commItem.dataset.action;
      const commId   = commItem.dataset.commid;
      const commName = commItem.dataset.commname || 'this community';
      closeCommMenu();

      if (action === 'leave')  showFeedLeaveConfirm(commId, commName);
      if (action === 'manage') alert('Membership management coming in a future update!');
      return;
    }

    if (!commMenuJustOpened) closeCommMenu();
  });

  function showFeedLeaveConfirm(communityId, communityName) {
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
            Are you sure you want to leave
            <strong>${communityName}</strong>?
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

    const closeModal = () => {
      modal.querySelector('.comm-leave-overlay').classList.remove('rx-visible');
      setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('commLeaveNo').addEventListener('click', closeModal);
    document.getElementById('commLeaveOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('commLeaveOverlay')) closeModal();
    });

    document.getElementById('commLeaveYes').addEventListener('click', async () => {
      closeModal();
      try {
        const res = await fetch(`/api/communities/${communityId}/leave`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (res.ok) {
          const comm = communities.find(c => c._id === communityId);
          if (comm) {
            comm.joined = false;
            comm.memberCount = Math.max(0, comm.memberCount - 1);
          }
          if (currentCommId === communityId) {
            currentCommId = null;
            currentPage   = 1;
          }
          renderLeftSidebar();
          loadFeed();
        }
      } catch (err) {
        console.error('Leave failed:', err);
      }
    });
  }

  // ── Comments ──────────────────────────────────────────────

  // Toggle comments section on 💬 button click
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.feed-post-action-btn');
    if (!btn) return;
    if (!btn.textContent.includes('💬')) return;

    const postEl = btn.closest('.feed-post');
    if (!postEl) return;
    const postId = postEl.dataset.id;

    // Toggle — close if already open
    const existing = postEl.querySelector('.feed-comments-section');
    if (existing) {
      existing.classList.remove('rx-open');
      setTimeout(() => existing.remove(), 380);
      return;
    }

    // Create section, append, then animate open
    const section = document.createElement('div');
    section.className = 'feed-comments-section';
    section.innerHTML = `
      <div class="feed-comment-skel"></div>
      <div class="feed-comment-skel" style="width:70%;"></div>`;
    postEl.appendChild(section);

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        section.classList.add('rx-open');
      });
    });

    await loadComments(postId, section, 'top');
  });

  async function loadComments(postId, section, sort) {
    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();

      const res  = await fetch(`/api/posts/${postId}/comments?sort=${sort}`, { headers });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      renderCommentSection(postId, section, data.comments || [], sort);

      // Auto-focus the comment input after render
      const input = section.querySelector('.feed-comment-input');
      if (input) setTimeout(() => input.focus(), 60);

    } catch (e) {
      console.error('Comments load failed:', e);
      section.innerHTML = '<div style="font-size:0.82rem;color:var(--text-light);font-family:Segoe UI,sans-serif;padding:8px 0;">Failed to load comments.</div>';
      section.classList.add('rx-open');
    }
  }

  function renderCommentSection(postId, section, comments, sort) {
    const name    = getUserName();
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    // Send icon SVG
    const sendIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>`;

    const composeHtml = isLoggedIn()
      ? `<div class="feed-comment-compose">
           <div class="feed-comment-compose-avatar">${initial}</div>
           <div class="feed-comment-pill-wrap">
             <input class="feed-comment-input"
                    type="text"
                    placeholder="Write a comment..."
                    data-postid="${postId}">
             <button class="feed-comment-send-btn" disabled>${sendIcon}</button>
           </div>
         </div>`
      : `<div class="feed-comments-login">
           <a href="/login.html?returnTo=%2Ffeed.html">Log in</a> to leave a comment.
         </div>`;

    section.innerHTML = `
      <div class="feed-comments-sort">
        <button class="feed-comments-sort-btn ${sort === 'top' ? 'active' : ''}"
                data-sort="top" data-postid="${postId}">Top</button>
        <button class="feed-comments-sort-btn ${sort === 'new' ? 'active' : ''}"
                data-sort="new" data-postid="${postId}">New</button>
      </div>
      ${composeHtml}
      <div class="feed-comment-list" id="commentList_${postId}">
        ${comments.length === 0
          ? '<div style="font-size:0.82rem;color:var(--text-light);font-family:Segoe UI,sans-serif;padding:4px 0;">No comments yet. Be the first!</div>'
          : comments.map(c => renderComment(c, postId)).join('')}
      </div>`;

    // Wire sort buttons
    section.querySelectorAll('.feed-comments-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newSort = btn.dataset.sort;
        section.querySelectorAll('.feed-comments-sort-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadComments(btn.dataset.postid, section, newSort);
      });
    });

    // Wire pill input
    const input   = section.querySelector('.feed-comment-input');
    const sendBtn = section.querySelector('.feed-comment-send-btn');

    if (input && sendBtn) {
      input.addEventListener('input', () => {
        sendBtn.disabled = input.value.trim().length === 0;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
          e.preventDefault();
          sendBtn.click();
        }
      });

      sendBtn.addEventListener('click', async () => {
        const body = input.value.trim();
        if (!body) return;

        sendBtn.disabled = true;
        const origIcon = sendBtn.innerHTML;
        sendBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="animation:feedSpin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';

        const newComment = await postComment(postId, body, null);
        if (newComment) {
          input.value = '';

          const list = section.querySelector(`#commentList_${postId}`);
          if (list) {
            const empty = list.querySelector('div');
            if (empty && empty.textContent.includes('No comments')) empty.remove();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderComment(newComment, postId);
            list.insertBefore(wrapper.firstElementChild, list.firstChild);

            // Update comment count button
            const postEl  = section.closest('.feed-post');
            const commBtn = postEl?.querySelector('.feed-post-action-btn');
            if (commBtn && commBtn.textContent.includes('💬')) {
              const current = parseInt(commBtn.textContent.replace(/\D/g, '')) || 0;
              commBtn.textContent = '💬 ' + formatNum(current + 1);
            }
          }
        }

        sendBtn.innerHTML = origIcon;
        sendBtn.disabled = input.value.trim().length === 0;
        input.focus();
      });
    }
  }

  function renderComment(comment, postId) {
    const authorName = comment.author?.name || 'Anonymous';
    const initial    = authorName.charAt(0).toUpperCase();
    const timeAgo    = formatTime(comment.createdAt);
    const editedTag  = comment.isEdited
      ? '<span class="feed-comment-edited">(edited)</span>' : '';

    const repliesHtml = comment.replies && comment.replies.length > 0
      ? `<div class="feed-comment-replies">
           ${comment.replies.map(r => renderComment(r, postId)).join('')}
         </div>`
      : '';

    const maxDepth = (comment.depth || 0) >= 5;

    return `
      <div class="feed-comment" data-comment-id="${comment._id}" data-depth="${comment.depth || 0}">
        <div class="feed-comment-avatar">${initial}</div>
        <div class="feed-comment-content">
          <div class="feed-comment-meta">
            <span class="feed-comment-author">${authorName}</span>
            <span class="feed-comment-time">${timeAgo}</span>
            ${editedTag}
          </div>
          <div class="feed-comment-body">${comment.body}</div>
          <div class="feed-comment-actions">
            ${!maxDepth
              ? `<button class="feed-comment-action reply-btn"
                         data-comment-id="${comment._id}"
                         data-postid="${postId}">
                   Reply
                 </button>`
              : ''}
          </div>
          <div class="feed-reply-area" id="replyArea_${comment._id}"></div>
        </div>
      </div>
      ${repliesHtml}`;
  }

  async function postComment(postId, body, parentId) {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ body, parentId: parentId || undefined })
      });

      const data = await res.json();
      if (res.ok) return data.comment;

      console.error('Post comment failed:', data.message);
      return null;
    } catch (e) {
      console.error('Post comment error:', e);
      return null;
    }
  }

  // Reply button handler
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.reply-btn');
    if (!btn) return;

    const commentId = btn.dataset.commentId;
    const postId    = btn.dataset.postid;
    const area      = document.getElementById('replyArea_' + commentId);
    if (!area) return;

    // Toggle reply box
    if (area.innerHTML.trim()) { area.innerHTML = ''; return; }

    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }

    const name    = getUserName();
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    const sendIcon = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>`;

    area.innerHTML = `
      <div class="feed-reply-compose">
        <div class="feed-comment-avatar" style="width:24px;height:24px;font-size:0.65rem;flex-shrink:0;">${initial}</div>
        <div class="feed-reply-pill-wrap">
          <input class="feed-reply-input"
                 type="text"
                 placeholder="Write a reply...">
          <button class="feed-reply-send-btn" disabled>${sendIcon}</button>
        </div>
      </div>`;

    const input     = area.querySelector('.feed-reply-input');
    const submitBtn = area.querySelector('.feed-reply-send-btn');

    input.focus();

    input.addEventListener('input', () => {
      submitBtn.disabled = input.value.trim().length === 0;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled) {
        e.preventDefault();
        submitBtn.click();
      }
    });

    submitBtn.addEventListener('click', async () => {
      const body = input.value.trim();
      if (!body) return;

      submitBtn.disabled = true;
      const origIcon = submitBtn.innerHTML;
      submitBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="animation:feedSpin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';

      const newComment = await postComment(postId, body, commentId);
      if (newComment) {
        area.innerHTML = '';

        const commentEl = document.querySelector(`[data-comment-id="${commentId}"]`);
        let repliesEl   = commentEl?.nextElementSibling;

        if (!repliesEl || !repliesEl.classList.contains('feed-comment-replies')) {
          repliesEl = document.createElement('div');
          repliesEl.className = 'feed-comment-replies';
          commentEl.parentNode.insertBefore(repliesEl, commentEl.nextSibling);
        }

        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderComment(newComment, postId);
        repliesEl.appendChild(wrapper.firstElementChild);

        const postEl  = commentEl?.closest('.feed-post');
        const commBtn = postEl?.querySelector('.feed-post-action-btn');
        if (commBtn && commBtn.textContent.includes('💬')) {
          const current = parseInt(commBtn.textContent.replace(/\D/g, '')) || 0;
          commBtn.textContent = '💬 ' + formatNum(current + 1);
        }
      } else {
        submitBtn.innerHTML = origIcon;
        submitBtn.disabled = false;
      }
    });
  });

}());
