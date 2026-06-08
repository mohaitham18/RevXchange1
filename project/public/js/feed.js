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
  let currentSort        = 'top';
  let currentPage        = 1;
  let currentCommId      = null; // null = unified feed
  let communities        = [];
  let selectedPostImages = []; // files staged for post modal
  let selectedPostVideo  = null; // single video staged for post modal

  // Existing media state when editing a post
  let _editPostImages  = []; // mutable copy of imageUrls for the post being edited
  let _editPostVideo   = null; // videoUrl for the post being edited, or null
  let _editPostId      = null; // ID of post being edited (for media delete calls)

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    updateHero();
    await loadSidebars();

    // Check for ?community=slug param from communities page redirect
    const urlParams = new URLSearchParams(window.location.search);
    const communitySlug = urlParams.get('community');
    if (communitySlug) {
      const match = communities.find(c => c.slug === communitySlug);
      if (match && match.joined) {
        // Community is joined — select it normally
        currentCommId = match._id;
        renderLeftSidebar();
      } else {
        // Not joined or not found — show showcase
        currentCommId = null;
        window._unjoined_community_slug = communitySlug;
      }
      // Clean URL without reload
      window.history.replaceState({}, '', '/feed.html');
    }

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
        // Remove unjoined prompt smoothly when switching communities
        removeUnjoinedPrompt();
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

    // Handle unjoined community showcase (from communities page redirect)
    const unjoinedSlug = window._unjoined_community_slug;
    if (unjoinedSlug) {
      delete window._unjoined_community_slug;
      await loadUnjoinedCommunityShowcase(unjoinedSlug, container);
      return;
    }

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

      if (res.status === 503) {
        const data = await res.json().catch(() => ({}));
        showMaintenanceBanner(container, data);
        return;
      }

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

  // ── Unjoined community showcase ───────────────────────────
  async function loadUnjoinedCommunityShowcase(slug, container) {
    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();

      // Find community info
      const comm = communities.find(c => c.slug === slug);
      const commName = comm
        ? ((comm.brandId?.name || '') + ' ' + comm.name).trim()
        : slug;

      // Fetch top posts from this community (limit 10)
      const res  = await fetch(
        `/api/communities/${slug}/posts?sort=top&page=1`,
        { headers }
      );
      const data = res.ok ? await res.json() : { posts: [], total: 0 };
      const allCommPosts = data.posts || [];
      const total        = data.total || allCommPosts.length;
      const posts        = allCommPosts.slice(0, 10);
      const isExhausted  = total <= 10; // all posts fit in one showcase

      // Fetch regular feed in parallel
      const feedRes   = await fetch(`/api/feed?sort=hot&page=1`, { headers });
      const feedData  = feedRes.ok ? await feedRes.json() : { posts: [] };
      const feedPosts = feedData.posts || [];

      let html = '';

      // Showcase posts
      if (posts.length > 0) {
        html += posts.map(renderPostCard).join('');
      } else {
        html += `
          <div class="feed-empty">
            <div class="feed-empty-icon">📭</div>
            <div class="feed-empty-title">No posts yet</div>
            <div class="feed-empty-sub">Be the first to post in ${commName}.</div>
          </div>`;
      }

      // Divider — wording depends on whether all posts were shown
      const dividerText = isExhausted
        ? `You've seen all posts in ${commName}`
        : `End of ${commName} showcase`;

      html += `<div class="feed-showcase-divider">${dividerText}</div>`;

      // Regular feed below divider
      if (feedPosts.length > 0) {
        html += `<div class="feed-showcase-section-label">Trending across communities</div>`;
        html += feedPosts.map(renderPostCard).join('');
      }

      container.innerHTML = html;

      // Build menus for all rendered posts
      [...posts, ...feedPosts].forEach(p => buildPostMenu(
        p._id,
        (p.author?._id || p.authorId?._id || '').toString()
      ));

      // Show sidebar prompt for unjoined community
      if (comm && !comm.joined) {
        showUnjoinedPromptInSidebar(comm);
      }

    } catch (e) {
      console.error('Showcase load failed:', e);
      container.innerHTML = `
        <div class="feed-empty">
          <div class="feed-empty-icon">⚠️</div>
          <div class="feed-empty-title">Failed to load posts</div>
          <div class="feed-empty-sub">Please refresh the page.</div>
        </div>`;
    }
  }

  // ── Show unjoined community in left sidebar with join prompt ─
  function removeUnjoinedPrompt(callback) {
    const existing = document.getElementById('feedUnjoinedPrompt');
    if (!existing) { if (callback) callback(); return; }
    existing.classList.add('removing');
    setTimeout(() => {
      existing.remove();
      if (callback) callback();
    }, 280);
  }

  function showUnjoinedPromptInSidebar(comm) {
    // Wait for renderLeftSidebar to finish painting the DOM
    setTimeout(() => {
      const el = document.getElementById('feedYourComms');
      if (!el) return;

      // Remove any existing prompt first
      removeUnjoinedPrompt(() => {
        const name = ((comm.brandId?.name || '') + ' ' + comm.name).trim();
        const logo = comm.brandId?.logoUrl || '';

        const prompt = document.createElement('div');
        prompt.id = 'feedUnjoinedPrompt';
        prompt.className = 'feed-comm-unjoined-prompt';
        prompt.innerHTML = `
          <img class="feed-comm-logo"
               src="${logo}" alt="${name}"
               onerror="this.style.opacity='0'">
          <span class="feed-comm-unjoined-name">${name}</span>
          <button class="feed-comm-unjoined-join-btn"
                  id="sidebarUnjoinedJoinBtn">Join</button>`;

        // Insert after "All Communities" item
        const allItem = el.querySelector('[data-commid="null"]');
        if (allItem) {
          allItem.after(prompt);
        } else {
          el.insertBefore(prompt, el.firstChild);
        }

        // Wire join button
        document.getElementById('sidebarUnjoinedJoinBtn')
          ?.addEventListener('click', async () => {
            if (!isLoggedIn()) {
              window.location.href = '/login.html?returnTo=%2Ffeed.html';
              return;
            }
            const btn = document.getElementById('sidebarUnjoinedJoinBtn');
            btn.disabled = true;
            btn.textContent = '...';

            try {
              const res = await fetch(`/api/communities/${comm._id}/join`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + getToken()
                }
              });
              if (res.ok || res.status === 409) {
                comm.joined = true;
                comm.memberCount++;
                // Update communities array so sidebar renders correctly
                const existing = communities.find(c => c._id === comm._id);
                if (existing) { existing.joined = true; existing.memberCount = comm.memberCount; }
                else communities.push(comm);
                removeUnjoinedPrompt();
                currentCommId = comm._id;
                renderLeftSidebar();
                loadFeed();
              } else {
                btn.disabled = false;
                btn.textContent = 'Join';
              }
            } catch (e) {
              btn.disabled = false;
              btn.textContent = 'Join';
            }
          });
      });
    }, 80);
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

  // ── Share embed renderer ──────────────────────────────────
  function renderShareEmbed(post) {
    const shared = post.sharedPost;

    if (!shared || shared.isDeleted) {
      return `<div class="feed-share-embed feed-share-embed-deleted">
        [Original post deleted]
      </div>`;
    }

    const commName = shared.community
      ? ((shared.community.brand?.name || '') + ' ' + shared.community.name).trim()
      : '';
    const commLogo    = shared.community?.brand?.logoUrl || '';
    const bodyPreview = shared.body ? shared.body.slice(0, 200) : '';
    const thumbUrl    = shared.imageUrls?.[0] || null;

    return `
      <div class="feed-share-embed"
           data-shared-id="${shared._id}"
           data-shared-title="${(shared.title || '').replace(/"/g,'&quot;')}"
           data-shared-body="${(shared.body || '').slice(0,500).replace(/"/g,'&quot;')}"
           data-shared-comm="${commName}"
           data-shared-logo="${commLogo}"
           data-shared-thumb="${thumbUrl || ''}"
           data-shared-author="${shared.author?.name || 'Anonymous'}">
        <div class="feed-share-embed-comm">
          <img class="feed-share-embed-logo"
               src="${commLogo}" alt="${commName}"
               onerror="this.style.opacity='0'">
          <span class="feed-share-embed-comm-name">${commName}</span>
        </div>
        <div class="feed-share-embed-title"${isRTL(shared.title) ? ' dir="rtl"' : ''}>${shared.title || ''}</div>
        ${bodyPreview
          ? `<div class="feed-share-embed-body"${isRTL(bodyPreview) ? ' dir="rtl"' : ''}>${bodyPreview}</div>`
          : ''}
        ${thumbUrl
          ? `<img class="feed-share-embed-thumb"
                  src="${thumbUrl}" alt="Post image" loading="lazy">`
          : ''}
        <div class="feed-share-embed-author">by ${shared.author?.name || 'Anonymous'}</div>
      </div>`;
  }

  // ── Video card renderer ───────────────────────────────────
  function renderVideoCard(videoUrl, videoExpiresAt) {
    // Cloudinary thumbnail — largest dimension capped at 800px, preserves aspect ratio
    let thumbUrl = null;
    try {
      thumbUrl = videoUrl
        .replace('/video/upload/', '/video/upload/so_0,w_800,h_800,c_limit,q_auto,f_jpg/')
        .replace(/\.[^.]+$/, '.jpg');
    } catch (e) {
      thumbUrl = null;
    }

    const expiryTag = videoExpiresAt
      ? `<div class="feed-post-video-expiry">🕐 Expires ${formatExpiry(videoExpiresAt)}</div>`
      : '';

    const playIcon = `<svg width="28" height="28" viewBox="2.5 0 24 24" fill="none">
      <path d="M7 4.5C7 3.4 8.2 2.7 9.2 3.3l13 7.5c1 .6 1 2.1 0 2.7l-13 7.5C8.2 21.6 7 20.9 7 19.8V4.5z"
            fill="#fff"
            stroke="none"
            stroke-linejoin="round"/>
    </svg>`;

    return `
      <div class="feed-post-video-outer">
        <div class="feed-post-video-wrap" data-video-url="${videoUrl}">
          <div class="feed-post-video-thumb">
            ${thumbUrl
              ? `<img src="${thumbUrl}"
                      alt="Video thumbnail"
                      loading="lazy"
                      onload="(function(img){var r=img.naturalWidth/img.naturalHeight;var wrap=img.closest('.feed-post-video-wrap');var thumb=img.closest('.feed-post-video-thumb');if(!wrap||!thumb)return;thumb.style.aspectRatio=r;wrap.style.maxWidth=Math.round(460*r)+'px';wrap.style.marginLeft='auto';wrap.style.marginRight='auto';})(this)"
                      onerror="this.style.display='none';">`
              : `<div class="feed-post-video-thumb-fallback">
                   <span style="font-size:2.5rem;">🎥</span>
                 </div>`}
            <div class="feed-post-video-play-btn">${playIcon}</div>
          </div>
        </div>
        ${expiryTag}
      </div>`;
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
      <div class="feed-post" data-id="${post._id}" data-is-share="${post.isShare ? '1' : '0'}">

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

        ${post.isShare
          ? `${post.shareCommentary
              ? `<div class="feed-post-share-commentary"${isRTL(post.shareCommentary) ? ' dir="rtl"' : ''}>${post.shareCommentary}</div>`
              : ''}
             ${renderShareEmbed(post)}
             <div class="feed-share-expanded" id="shareExpand_${post._id}"></div>`
          : `${post.title ? `<div class="feed-post-title"${isRTL(post.title) ? ' dir="rtl"' : ''}>${post.title}</div>` : ''}
             ${bodyPreview ? `<div class="feed-post-body"${isRTL(bodyPreview) ? ' dir="rtl"' : ''}>${bodyPreview}</div>` : ''}
             ${renderPostImages(post.imageUrls)}
             ${post.videoUrl ? renderVideoCard(post.videoUrl, post.videoExpiresAt) : ''}`}

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
          ${!post.isShare
            ? `<button class="feed-post-action-btn feed-share-btn"
                       data-postid="${post._id}"
                       data-communityid="${post.community?._id || ''}">
                 ↗ Share
               </button>`
            : `<button class="feed-post-action-btn"
                       disabled
                       style="opacity:0.4;cursor:not-allowed;"
                       title="Cannot re-share a shared post">
                 ↗ Share
               </button>`}
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

  // ── RTL / Arabic text detection ──────────────────────────
  function isRTL(text) {
    if (!text || !text.trim()) return false;
    const arabicPattern = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
    if (arabicPattern.test(text.trim()[0])) return true;
    const arabicCount = (text.match(/[؀-ۿ]/g) || []).length;
    return arabicCount > text.length * 0.25;
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

  function formatExpiry(dateStr) {
    if (!dateStr) return '';
    const ms = new Date(dateStr).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const m = Math.round(ms / 60000);
    if (m < 60)  return 'in ' + m + 'm';
    const h = Math.round(m / 60);
    if (h < 24)  return 'in ' + h + 'h';
    const d = Math.round(h / 24);
    return 'in ' + d + 'd';
  }

  // ── Post image grid renderer ──────────────────────────────
  function renderPostImages(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return '';
    const count    = imageUrls.length;
    const gridClass = `img-count-${Math.min(count, 5)}`;
    const show      = imageUrls.slice(0, 4);
    const extra     = count - 4;

    const items = show.map((url, i) => {
      const isLast = i === 3 && extra > 0;
      return `
        <div class="feed-post-img-item" data-src="${url}" data-index="${i}">
          <img src="${url}" alt="Post image" loading="lazy">
          ${isLast ? `<div class="feed-post-img-more-overlay">+${extra + 1}</div>` : ''}
        </div>`;
    });

    return `
      <div class="feed-post-images ${gridClass}"
           data-images='${JSON.stringify(imageUrls)}'>
        ${items.join('')}
      </div>`;
  }

  // ── Modal image preview renderer ──────────────────────────
  function renderModalPreviews() {
    const el    = document.getElementById('feedImagePreviews');
    const label = document.getElementById('feedImageCountLabel');
    if (!el) return;

    if (selectedPostImages.length === 0) {
      el.innerHTML = '';
      if (label) label.textContent = '';
      return;
    }

    if (label) {
      label.textContent = `${selectedPostImages.length} / 5 photo${selectedPostImages.length > 1 ? 's' : ''}`;
    }

    el.innerHTML = selectedPostImages.map((file, i) => {
      const url = URL.createObjectURL(file);
      return `
        <div class="feed-image-preview-item">
          <img src="${url}" alt="Preview">
          <button class="feed-image-preview-remove" data-index="${i}">✕</button>
        </div>`;
    }).join('');

    // Wire remove buttons
    el.querySelectorAll('.feed-image-preview-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        selectedPostImages.splice(idx, 1);
        renderModalPreviews();
      });
    });
  }

  // ── Video preview renderer ────────────────────────────────
  function renderVideoPreview() {
    const el    = document.getElementById('feedVideoPreview');
    const label = document.getElementById('feedImageCountLabel');
    const addPhotoBtn = document.getElementById('feedImageAddBtn');
    const addVideoBtn = document.getElementById('feedVideoAddBtn');
    if (!el) return;

    if (!selectedPostVideo) {
      el.innerHTML = '';
      // Show both buttons when nothing selected
      if (addPhotoBtn) addPhotoBtn.style.display = '';
      if (addVideoBtn) addVideoBtn.style.display = '';
      if (label) label.textContent = '';
      return;
    }

    // Video selected — hide photo button, show remove option
    if (addPhotoBtn) addPhotoBtn.style.display = 'none';
    if (addVideoBtn) addVideoBtn.style.display = 'none';
    if (label) label.textContent = '';

    const url = URL.createObjectURL(selectedPostVideo);
    el.innerHTML = `
      <div class="feed-video-preview-wrap">
        <video class="feed-video-preview" src="${url}"
               controls muted playsinline></video>
        <button class="feed-video-remove-btn" id="feedVideoRemoveBtn">
          ✕ Remove video
        </button>
        <div class="feed-video-size-label">
          ${(selectedPostVideo.size / (1024*1024)).toFixed(1)} MB · 7-day expiry
        </div>
      </div>`;

    document.getElementById('feedVideoRemoveBtn')?.addEventListener('click', () => {
      selectedPostVideo = null;
      const videoInput = document.getElementById('feedVideoInput');
      if (videoInput) videoInput.value = '';
      renderVideoPreview();
      // Re-show image previews section
      renderModalPreviews();
    });
  }

  // ── Existing media preview (edit mode) ───────────────────────

  function renderExistingMediaPreviews() {
    const el = document.getElementById('feedExistingMediaPreviews');
    if (!el) return;

    const hasImages = _editPostImages.length > 0;
    const hasVideo  = !!_editPostVideo;

    if (!hasImages && !hasVideo) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="feed-existing-media-section">
        <div class="feed-existing-media-label">Current media</div>
        <div class="feed-existing-media-grid">
          ${_editPostImages.map((url, i) => `
            <div class="feed-image-preview-item" id="feedExistImg_${i}">
              <img src="${url}" alt="Image ${i + 1}" loading="lazy">
              <button class="feed-image-preview-remove"
                      data-exist-img-idx="${i}"
                      title="Remove image">✕</button>
            </div>`).join('')}
          ${hasVideo ? `
            <div class="feed-existing-video-item" id="feedExistVideo">
              <video class="feed-existing-video-preview"
                     src="${_editPostVideo}"
                     muted preload="metadata"></video>
              <button class="feed-image-preview-remove"
                      id="feedExistVideoRemove"
                      title="Remove video">✕</button>
            </div>` : ''}
        </div>
      </div>`;

    el.querySelectorAll('[data-exist-img-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteExistingPostImage(parseInt(btn.dataset.existImgIdx, 10), btn);
      });
    });

    document.getElementById('feedExistVideoRemove')
      ?.addEventListener('click', function () {
        deleteExistingPostVideo(this);
      });
  }

  async function deleteExistingPostImage(idx, btn) {
    if (!_editPostId) return;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      const res = await fetch(`/api/posts/${_editPostId}/images/${idx}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      if (res.ok) {
        _editPostImages.splice(idx, 1);
        renderExistingMediaPreviews();
        _syncPostImagesInDom(_editPostId, _editPostImages);
      } else {
        btn.textContent = '✕';
        btn.disabled = false;
      }
    } catch (e) {
      btn.textContent = '✕';
      btn.disabled = false;
    }
  }

  async function deleteExistingPostVideo(btn) {
    if (!_editPostId) return;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      const res = await fetch(`/api/posts/${_editPostId}/video`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      if (res.ok) {
        _editPostVideo = null;
        renderExistingMediaPreviews();
        _syncPostVideoInDom(_editPostId);
      } else {
        btn.textContent = '✕';
        btn.disabled = false;
      }
    } catch (e) {
      btn.textContent = '✕';
      btn.disabled = false;
    }
  }

  function _syncPostImagesInDom(postId, imageUrls) {
    const postEl = document.querySelector(`[data-id="${postId}"]`);
    if (!postEl) return;
    const oldImgs = postEl.querySelector('.feed-post-images');
    const newHtml = renderPostImages(imageUrls);
    if (oldImgs) {
      oldImgs.outerHTML = newHtml;
    } else if (newHtml) {
      // Insert before video if present, else before menu-wrap
      const ref = postEl.querySelector('.feed-post-video-outer') ||
                  postEl.querySelector('.feed-post-menu-wrap');
      if (ref) ref.insertAdjacentHTML('beforebegin', newHtml);
    }
    // Update data-images on the new element
    const updatedEl = postEl.querySelector('.feed-post-images');
    if (updatedEl) updatedEl.dataset.images = JSON.stringify(imageUrls);
  }

  function _syncPostVideoInDom(postId) {
    const postEl = document.querySelector(`[data-id="${postId}"]`);
    if (!postEl) return;
    postEl.querySelector('.feed-post-video-outer')?.remove();
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

    // Reset media button state on every open
    renderVideoPreview();

    // Wire image input
    // Wire image/video inputs only once
    const imageInput  = document.getElementById('feedImageInput');
    const imageAddBtn = document.getElementById('feedImageAddBtn');
    const videoInput  = document.getElementById('feedVideoInput');
    const videoAddBtn = document.getElementById('feedVideoAddBtn');

    if (imageAddBtn && !imageAddBtn._wired) {
      imageAddBtn._wired = true;
      imageAddBtn.addEventListener('click', () => imageInput?.click());
      imageInput?.addEventListener('change', () => {
      // Can't add images if video selected
      if (selectedPostVideo) return;
      const files = Array.from(imageInput.files || []);
      files.forEach(file => {
        if (selectedPostImages.length >= 5) return;
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} is too large. Max 5MB per image.`);
          return;
        }
        selectedPostImages.push(file);
      });
      imageInput.value = '';
      // Hide video button when images selected
      if (selectedPostImages.length > 0) {
        const vBtn = document.getElementById('feedVideoAddBtn');
        if (vBtn) vBtn.style.display = 'none';
      }
      renderModalPreviews();
      });

      videoAddBtn?.addEventListener('click', () => videoInput?.click());

      videoInput?.addEventListener('change', () => {
        const file = videoInput.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
          alert('Video too large. Max 25MB.');
          videoInput.value = '';
          return;
        }
        // Clear images if any
        selectedPostImages = [];
        renderModalPreviews();
        selectedPostVideo = file;
        renderVideoPreview();
      });
    } // end if (!imageAddBtn._wired)
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
    if (titleInput)  titleInput.removeAttribute('data-editing-share');

    // Restore title field visibility
    const titleField = document.getElementById('feedPostTitle')
                                ?.closest('.feed-modal-field');
    if (titleField) titleField.style.display = '';

    // Restore community field visibility
    const commField = document.getElementById('feedPostCommunity')
                               ?.closest('.feed-modal-field');
    if (commField) commField.style.display = '';

    // Reset images + video
    selectedPostImages = [];
    selectedPostVideo  = null;
    renderModalPreviews();
    renderVideoPreview();

    // Reset existing-media state
    _editPostImages = [];
    _editPostVideo  = null;
    _editPostId     = null;
    const existingEl = document.getElementById('feedExistingMediaPreviews');
    if (existingEl) existingEl.innerHTML = '';

    // Restore add-media toolbar visibility
    const imgToolbar = document.querySelector('#feedImageSection .feed-image-toolbar');
    if (imgToolbar) imgToolbar.style.display = '';
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

    // Auto-direction for Arabic input in modal
    if (title) title.dir = isRTL(title.value) ? 'rtl' : 'ltr';
    if (body)  body.dir  = isRTL(body.value)  ? 'rtl' : 'ltr';
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
    const isEditingShare = titleInput?.getAttribute('data-editing-share') === '1';

    // Build request — edit stays JSON, new post uses FormData for images
    let fetchOptions;
    if (isEditing) {
      // Share post edit — only send body as shareCommentary
      const editPayload = isEditingShare
        ? { shareCommentary: body, title: body || ' ' }
        : { title, body };
      fetchOptions = {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify(editPayload)
      };
    } else {
      const fd = new FormData();
      fd.append('communityId', communityId);
      fd.append('title', title);
      fd.append('body', body);
      if (variantId) fd.append('variantId', variantId);
      selectedPostImages.forEach(file => fd.append('images', file));
      fetchOptions = {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getToken() },
        body: fd
      };
    }

    // Capture video before clearing state
    const videoToUpload = !isEditing ? selectedPostVideo : null;

    try {
      const res  = await fetch(url, fetchOptions);

      // Reset spinner regardless of outcome
      if (submitBtn)     submitBtn.disabled = false;
      if (submitLabel)   submitLabel.style.display = '';
      if (submitSpinner) submitSpinner.style.display = 'none';

      const data = res.ok ? null : await res.json(); // only parse on error

      if (res.ok) {
        const postData = await res.json();

        // Upload video separately if selected
        if (videoToUpload && postData.post?._id) {
          const vfd = new FormData();
          vfd.append('video', videoToUpload);
          try {
            const vRes = await fetch(`/api/posts/${postData.post._id}/video`, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer ' + getToken() },
              body: vfd
            });
            if (vRes.ok) {
              const vData = await vRes.json();
              postData.post.videoUrl       = vData.videoUrl;
              postData.post.videoExpiresAt = vData.videoExpiresAt;
            }
          } catch (vErr) {
            console.error('Video upload failed:', vErr);
          }
        }

        closePostModal();

        if (isEditing) {
          const postEl = document.querySelector(`[data-id="${editingId}"]`);
          if (postEl) {
            if (isEditingShare) {
              // Update commentary text in DOM
              const commEl = postEl.querySelector('.feed-post-share-commentary');
              if (commEl) {
                commEl.textContent = body;
                commEl.dir = isRTL(body) ? 'rtl' : '';
              }
            } else {
              const titleEl  = postEl.querySelector('.feed-post-title');
              const bodyEl   = postEl.querySelector('.feed-post-body');
              if (titleEl) titleEl.textContent = title;
              if (bodyEl && body) bodyEl.textContent = body;
            }

            const authorEl = postEl.querySelector('.feed-post-author');
            if (authorEl && !authorEl.querySelector('.feed-edited-tag')) {
              const tag = document.createElement('span');
              tag.className = 'feed-edited-tag';
              tag.textContent = ' (edited)';
              authorEl.appendChild(tag);
            }
          }
        } else {
          insertPendingPost(postData.post);
        }
      } else {
        if (res.status === 403 && data?.suspendedUntil) {
          const until = new Date(data.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          showReportToast(`You are suspended until ${until}`);
        } else {
          console.error('Submit failed:', data?.message);
          alert(data?.message || 'Failed to submit post. Please try again.');
        }
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
      variant: post.variantId || post.variant || null,
      sharedPost: post.sharedPostId
        ? {
            _id:       post.sharedPostId._id,
            title:     post.sharedPostId.title,
            body:      post.sharedPostId.body,
            imageUrls: post.sharedPostId.imageUrls || [],
            videoUrl:  post.sharedPostId.videoUrl  || null,
            isDeleted: post.sharedPostId.isDeleted,
            author: post.sharedPostId.authorId
              ? { name: post.sharedPostId.authorId.name }
              : null,
            community: post.sharedPostId.communityId
              ? {
                  name:  post.sharedPostId.communityId.name,
                  slug:  post.sharedPostId.communityId.slug,
                  brand: post.sharedPostId.communityId.brandId || null
                }
              : null
          }
        : (post.sharedPost || null)
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
    const postEl   = document.querySelector(`[data-id="${postId}"]`);
    if (!postEl) return;
    const isShare  = postEl.dataset.isShare === '1';
    const titleEl  = postEl.querySelector('.feed-post-title');
    const bodyEl   = postEl.querySelector('.feed-post-body');
    const commEl   = postEl.querySelector('.feed-post-share-commentary');

    // Open modal
    openPostModal();

    setTimeout(() => {
      // Always hide community + variant — can't change either when editing
      const commField = document.getElementById('feedPostCommunity')?.closest('.feed-modal-field');
      if (commField) commField.style.display = 'none';
      const variantField = document.getElementById('feedVariantField');
      if (variantField) variantField.style.display = 'none';

      const titleInput  = document.getElementById('feedPostTitle');
      const bodyInput   = document.getElementById('feedPostBody');
      const modalTitle  = document.querySelector('.feed-modal-title');
      const submitLabel = document.querySelector('.feed-submit-label');

      if (isShare) {
        // Share post — only edit the commentary
        // Hide title field entirely — title is not editable on shares
        const titleField = titleInput?.closest('.feed-modal-field');
        if (titleField) titleField.style.display = 'none';

        // Change modal title + label
        if (modalTitle)  modalTitle.textContent  = 'Edit Commentary';
        if (submitLabel) submitLabel.textContent = 'Save Changes';

        // Pre-fill body with existing commentary
        if (bodyInput) {
          const existingCommentary = commEl
            ? commEl.textContent.trim()
            : (bodyEl ? bodyEl.textContent.trim() : '');
          bodyInput.value = existingCommentary;
          // Store a special flag so submitPost sends the right payload
          titleInput?.setAttribute('data-editing-post-id', postId);
          titleInput?.setAttribute('data-editing-share', '1');
          // Set a placeholder title so submitPost validation passes
          titleInput.value = existingCommentary || ' ';
        }

        const submitBtn = document.getElementById('feedModalSubmit');
        if (submitBtn) submitBtn.disabled = false;

        // Update body counter
        updateCounters();
        if (bodyInput) bodyInput.focus();

      } else {
        // Regular post — normal edit flow
        if (titleInput && titleEl) {
          titleInput.value = titleEl.textContent.replace('(edited)', '').trim();
          titleInput.setAttribute('data-editing-post-id', postId);
          titleInput.removeAttribute('data-editing-share');
        }

        if (bodyInput && bodyEl) {
          bodyInput.value = bodyEl.textContent.trim();
        }

        updateCounters();
        const submitBtn = document.getElementById('feedModalSubmit');
        if (submitBtn) submitBtn.disabled = false;

        if (modalTitle)  modalTitle.textContent  = 'Edit Post';
        if (submitLabel) submitLabel.textContent = 'Save Changes';

        // Populate existing media previews
        const imagesEl   = postEl.querySelector('.feed-post-images');
        const videoWrap  = postEl.querySelector('.feed-post-video-wrap');
        _editPostImages  = imagesEl ? JSON.parse(imagesEl.dataset.images || '[]') : [];
        _editPostVideo   = videoWrap ? (videoWrap.dataset.videoUrl || null) : null;
        _editPostId      = postId;

        // Hide only the add-media toolbar while editing an existing post
        // (keep #feedImageSection visible so #feedExistingMediaPreviews can show)
        const imgToolbar = document.querySelector('#feedImageSection .feed-image-toolbar');
        if (imgToolbar) imgToolbar.style.display = 'none';

        renderExistingMediaPreviews();
      }
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
    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }

    document.getElementById('feedReportModal')?.remove();

    const reasons = [
      { value: 'spam',           label: 'Spam' },
      { value: 'misinformation', label: 'Misinformation' },
      { value: 'inappropriate',  label: 'Inappropriate content' },
      { value: 'harassment',     label: 'Harassment' },
      { value: 'other',          label: 'Other' }
    ];

    const modal = document.createElement('div');
    modal.id        = 'feedReportModal';
    modal.className = 'feed-modal-overlay rx-open';
    modal.innerHTML = `
      <div class="feed-modal-card feed-report-card">
        <div class="feed-modal-header">
          <h3 class="feed-modal-title">Report Post</h3>
          <button class="feed-modal-close" id="reportModalClose">✕</button>
        </div>
        <div class="feed-modal-body">
          <div class="feed-report-reason-list">
            ${reasons.map(r => `
              <label class="feed-report-reason-item">
                <input type="radio" name="reportReason" value="${r.value}">
                <span class="feed-report-reason-label">${r.label}</span>
              </label>`).join('')}
          </div>
          <div class="feed-modal-field" style="margin-top:14px;">
            <label class="feed-modal-label">
              Additional details
              <span style="font-size:0.75rem;color:var(--text-light);font-weight:400;">(optional)</span>
            </label>
            <textarea class="feed-modal-textarea"
                      id="reportDetails"
                      placeholder="Describe the issue..."
                      maxlength="300"
                      rows="3"
                      style="min-height:80px;"></textarea>
            <div class="feed-modal-counter" id="reportDetailsCounter">0 / 300</div>
          </div>
        </div>
        <div class="feed-modal-footer">
          <button class="feed-modal-cancel" id="reportModalCancel">Cancel</button>
          <button class="feed-modal-submit feed-report-submit" id="reportModalSubmit" disabled>
            <span id="reportSubmitLabel">Submit Report</span>
            <span id="reportSubmitSpinner" style="display:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5"
                   style="animation:feedSpin 0.8s linear infinite;">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    document.getElementById('reportModalClose')?.addEventListener('click', close);
    document.getElementById('reportModalCancel')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.getElementById('feedReportModal')) {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    const submitBtn = document.getElementById('reportModalSubmit');
    const textarea  = document.getElementById('reportDetails');
    const counter   = document.getElementById('reportDetailsCounter');

    modal.querySelectorAll('input[name="reportReason"]').forEach(radio => {
      radio.addEventListener('change', () => { submitBtn.disabled = false; });
    });

    textarea?.addEventListener('input', () => {
      if (counter) counter.textContent = `${textarea.value.length} / 300`;
    });

    submitBtn?.addEventListener('click', async () => {
      const selected = modal.querySelector('input[name="reportReason"]:checked');
      if (!selected) return;

      const reason  = selected.value;
      const details = textarea?.value.trim() || '';

      submitBtn.disabled = true;
      document.getElementById('reportSubmitLabel').style.display   = 'none';
      document.getElementById('reportSubmitSpinner').style.display = 'flex';

      try {
        const res = await fetch(`/api/posts/${postId}/report`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ reason, details })
        });

        const data = await res.json();

        if (res.ok) {
          close();
          showReportToast('Report submitted. Our team will review it.');
        } else if (res.status === 409) {
          close();
          showReportToast('You have already reported this post.');
        } else {
          alert(data.message || 'Failed to submit report.');
          submitBtn.disabled = false;
          document.getElementById('reportSubmitLabel').style.display   = '';
          document.getElementById('reportSubmitSpinner').style.display = 'none';
        }
      } catch (err) {
        console.error('Report error:', err);
        submitBtn.disabled = false;
        document.getElementById('reportSubmitLabel').style.display   = '';
        document.getElementById('reportSubmitSpinner').style.display = 'none';
      }
    });
  }

  function showMaintenanceBanner(container, data) {
    const endsAt = data.endsAt
      ? new Date(data.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : null;
    container.innerHTML = `
      <div class="feed-maintenance-banner">
        <div class="feed-maint-icon">⚡</div>
        <div class="feed-maint-title">Communities are temporarily unavailable</div>
        ${data.message ? `<div class="feed-maint-message">${data.message}</div>` : ''}
        ${endsAt ? `<div class="feed-maint-back">Back at ${endsAt}</div>` : ''}
      </div>`;
  }

  function showReportToast(message) {
    const existing = document.getElementById('rxReportToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id        = 'rxReportToast';
    toast.className = 'feed-report-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('rx-visible'));
    });

    setTimeout(() => {
      toast.classList.remove('rx-visible');
      setTimeout(() => toast.remove(), 350);
    }, 3000);
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

  // ── Auto-direction for Arabic text inputs ────────────────
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.matches('.feed-comment-input, .feed-reply-input')) {
      el.dir = isRTL(el.value) ? 'rtl' : 'ltr';
      // Arabic characters are taller — ensure enough line height
      if (el.dir === 'rtl') {
        el.style.lineHeight = '1.8';
      } else {
        el.style.lineHeight = '1.5';
      }
    }
  });

  // ── Image lightbox ────────────────────────────────────────
  window.__rxOpenLightbox = function(startUrl, allUrls) {
    let currentIndex = allUrls.indexOf(startUrl);
    if (currentIndex === -1) currentIndex = 0;

    const existing = document.getElementById('rxLightbox');
    if (existing) existing.remove();

    function buildLightbox() {
      const lb = document.createElement('div');
      lb.id        = 'rxLightbox';
      lb.className = 'feed-lightbox';

      const hasMultiple = allUrls.length > 1;
      lb.innerHTML = `
        <button class="feed-lightbox-close" id="lbClose">✕</button>
        <img class="feed-lightbox-img" id="lbImg"
             src="${allUrls[currentIndex]}" alt="Image">
        ${hasMultiple ? `
          <button class="feed-lightbox-nav feed-lightbox-prev" id="lbPrev">&#8249;</button>
          <button class="feed-lightbox-nav feed-lightbox-next" id="lbNext">&#8250;</button>
          <div class="feed-lightbox-counter" id="lbCounter">
            ${currentIndex + 1} / ${allUrls.length}
          </div>` : ''}`;

      document.body.appendChild(lb);

      const close = () => { lb.style.opacity = '0'; setTimeout(() => lb.remove(), 180); };

      lb.addEventListener('click', (e) => {
        if (e.target === lb) close();
      });
      document.getElementById('lbClose')?.addEventListener('click', close);

      if (hasMultiple) {
        const updateImg = () => {
          document.getElementById('lbImg').src    = allUrls[currentIndex];
          document.getElementById('lbCounter').textContent =
            `${currentIndex + 1} / ${allUrls.length}`;
        };
        document.getElementById('lbPrev')?.addEventListener('click', (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex - 1 + allUrls.length) % allUrls.length;
          updateImg();
        });
        document.getElementById('lbNext')?.addEventListener('click', (e) => {
          e.stopPropagation();
          currentIndex = (currentIndex + 1) % allUrls.length;
          updateImg();
        });
      }

      document.addEventListener('keydown', function lbKeyHandler(e) {
        if (!document.getElementById('rxLightbox')) {
          document.removeEventListener('keydown', lbKeyHandler);
          return;
        }
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft' && hasMultiple) {
          currentIndex = (currentIndex - 1 + allUrls.length) % allUrls.length;
          document.getElementById('lbImg').src = allUrls[currentIndex];
          document.getElementById('lbCounter').textContent = `${currentIndex + 1} / ${allUrls.length}`;
        }
        if (e.key === 'ArrowRight' && hasMultiple) {
          currentIndex = (currentIndex + 1) % allUrls.length;
          document.getElementById('lbImg').src = allUrls[currentIndex];
          document.getElementById('lbCounter').textContent = `${currentIndex + 1} / ${allUrls.length}`;
        }
      });
    }

    buildLightbox();
  };

  // Wire post image grid clicks
  document.addEventListener('click', (e) => {
    const imgItem = e.target.closest('.feed-post-img-item');
    if (!imgItem) return;
    const grid = imgItem.closest('.feed-post-images');
    if (!grid) return;

    try {
      const allUrls = JSON.parse(grid.dataset.images || '[]');
      const clickedUrl = imgItem.dataset.src;
      if (allUrls.length > 0) window.__rxOpenLightbox(clickedUrl, allUrls);
    } catch (err) {
      console.error('Lightbox error:', err);
    }
  });

  // ── Share system ──────────────────────────────────────────

  function openShareModal(postId, excludeCommunityId) {
    if (!isLoggedIn()) {
      window.location.href = '/login.html?returnTo=%2Ffeed.html';
      return;
    }

    // Eligible: joined communities excluding the original post's community
    const eligible = communities.filter(c =>
      c.joined && c._id !== excludeCommunityId
    );

    if (eligible.length === 0) {
      alert('Join at least one other community to share this post.');
      return;
    }

    const central = eligible.find(c => c.isCentral);
    const others  = eligible
      .filter(c => !c.isCentral)
      .sort((a, b) => b.memberCount - a.memberCount);
    const sorted  = central ? [central, ...others] : others;

    // Remove existing modal
    document.getElementById('feedShareModal')?.remove();

    const modal = document.createElement('div');
    modal.id        = 'feedShareModal';
    modal.className = 'feed-modal-overlay rx-open';
    modal.innerHTML = `
      <div class="feed-modal-card">
        <div class="feed-modal-header">
          <h3 class="feed-modal-title">Share Post</h3>
          <button class="feed-modal-close" id="shareModalClose">✕</button>
        </div>
        <div class="feed-modal-body">
          <div class="feed-modal-field">
            <label class="feed-modal-label">Share to <span class="feed-modal-required">*</span></label>
            <select class="feed-modal-select" id="shareTargetCommunity">
              <option value="">Select a community...</option>
              ${sorted.map(c => {
                const name = c.isCentral
                  ? 'RevXChange Central'
                  : (c.brandId?.name || '') + ' ' + c.name;
                return `<option value="${c._id}">${name}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="feed-modal-field">
            <label class="feed-modal-label">
              Add a comment
              <span style="font-size:0.75rem;color:var(--text-light);font-weight:400;">(optional)</span>
            </label>
            <textarea class="feed-modal-textarea"
                      id="shareCommentary"
                      placeholder="Say something about this post..."
                      maxlength="300"
                      rows="3"></textarea>
            <div class="feed-modal-counter" id="shareCommentaryCounter">0 / 300</div>
          </div>
        </div>
        <div class="feed-modal-footer">
          <button class="feed-modal-cancel" id="shareModalCancel">Cancel</button>
          <button class="feed-modal-submit" id="shareModalSubmit" disabled>
            <span id="shareSubmitLabel">↗ Share</span>
            <span id="shareSubmitSpinner" style="display:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5"
                   style="animation:feedSpin 0.8s linear infinite;">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => {
      modal.remove();
      document.body.style.overflow = '';
    };

    document.getElementById('shareModalClose')?.addEventListener('click', close);
    document.getElementById('shareModalCancel')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.getElementById('feedShareModal')) {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    });

    const select    = document.getElementById('shareTargetCommunity');
    const submitBtn = document.getElementById('shareModalSubmit');
    const textarea  = document.getElementById('shareCommentary');
    const counter   = document.getElementById('shareCommentaryCounter');

    select?.addEventListener('change', () => {
      submitBtn.disabled = !select.value;
    });

    textarea?.addEventListener('input', () => {
      if (counter) counter.textContent = `${textarea.value.length} / 300`;
    });

    submitBtn?.addEventListener('click', async () => {
      const targetCommId = select?.value;
      const commentary   = textarea?.value.trim() || '';
      if (!targetCommId) return;

      submitBtn.disabled = true;
      document.getElementById('shareSubmitLabel').style.display  = 'none';
      document.getElementById('shareSubmitSpinner').style.display = 'flex';

      try {
        const res = await fetch(`/api/posts/${postId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ communityId: targetCommId, shareCommentary: commentary })
        });

        const data = await res.json();

        if (res.ok) {
          close();
          // Show in feed only if current view includes target community
          const isVisible = !currentCommId || currentCommId === targetCommId;
          if (isVisible) insertPendingPost(data.post);
        } else {
          alert(data.message || 'Failed to share post.');
          submitBtn.disabled = false;
          document.getElementById('shareSubmitLabel').style.display  = '';
          document.getElementById('shareSubmitSpinner').style.display = 'none';
        }
      } catch (err) {
        console.error('Share error:', err);
        submitBtn.disabled = false;
        document.getElementById('shareSubmitLabel').style.display  = '';
        document.getElementById('shareSubmitSpinner').style.display = 'none';
      }
    });
  }

  // Wire Share button clicks
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.feed-share-btn');
    if (!btn) return;
    const postId      = btn.dataset.postid;
    const communityId = btn.dataset.communityid;
    if (postId) openShareModal(postId, communityId);
  });

  // ── Share embed expand ────────────────────────────────────
  document.addEventListener('click', async (e) => {
    // Collapse button
    const collapseBtn = e.target.closest('.fse-collapse-btn');
    if (collapseBtn) {
      e.stopPropagation();
      const embed = collapseBtn.closest('.feed-share-embed');
      if (!embed) return;
      const orig = embed._originalHTML;
      if (!orig) return;
      embed.classList.remove('expanded');
      embed.classList.add('collapsing');
      setTimeout(() => {
        embed.classList.remove('collapsing');
        embed.innerHTML = orig;
        embed._originalHTML = null;
      }, 280);
      return;
    }

    // Don't fire when clicking inside expanded content
    if (e.target.closest('.feed-share-embed.expanded')) return;

    const embed = e.target.closest('.feed-share-embed');
    if (!embed) return;
    if (embed.classList.contains('feed-share-embed-deleted')) return;
    if (embed.classList.contains('loading')) return;

    const sharedId = embed.dataset.sharedId;
    if (!sharedId) return;

    // Store original HTML for collapse
    embed._originalHTML = embed.innerHTML;

    // Loading state
    embed.classList.add('loading');

    try {
      const headers = {};
      if (getToken()) headers['Authorization'] = 'Bearer ' + getToken();
      const res  = await fetch(`/api/posts/${sharedId}`, { headers });
      const data = await res.json();

      embed.classList.remove('loading');

      if (!res.ok || !data.post) {
        embed._originalHTML = null;
        return;
      }

      const orig      = data.post;
      const community = orig.community;
      const commName  = community
        ? (community.isCentral
            ? 'RevXChange Central'
            : ((community.brand?.name || '') + ' ' + community.name).trim())
        : '';
      const commLogo   = community?.brand?.logoUrl || '';
      const authorName = orig.author?.name || 'Anonymous';
      const authorInit = authorName.charAt(0).toUpperCase();
      const titleDir   = isRTL(orig.title) ? ' dir="rtl"' : '';
      const bodyDir    = isRTL(orig.body)  ? ' dir="rtl"' : '';
      const timeAgo    = formatTime(orig.createdAt);
      const editedTag  = orig.isEdited
        ? '<span style="font-size:0.7rem;color:var(--text-light)">(edited)</span>' : '';

      embed.classList.add('expanded');
      embed.innerHTML = `
        <div class="fse-expanded-header">
          <div class="fse-comm-label">
            <img src="${commLogo}" alt="${commName}"
                 onerror="this.style.opacity='0'">
            ${commName}
          </div>
          <button class="fse-collapse-btn">↑ Collapse</button>
        </div>
        <div class="fse-body">
          <div class="feed-post-header" style="margin-bottom:10px;">
            <div class="feed-post-avatar">${authorInit}</div>
            <div>
              <div class="feed-post-author">${authorName} ${editedTag}</div>
              <div class="feed-post-time">${timeAgo}</div>
            </div>
          </div>
          ${orig.title
            ? `<div class="feed-post-title"${titleDir}>${orig.title}</div>`
            : ''}
          ${orig.body
            ? `<div class="feed-post-body"${bodyDir}>${orig.body.slice(0,500)}</div>`
            : ''}
          ${renderPostImages(orig.imageUrls)}
          ${orig.videoUrl
            ? `<div class="feed-post-video-wrap" style="margin-top:8px;">
                 <video class="feed-post-video" src="${orig.videoUrl}"
                        controls preload="metadata" playsinline></video>
               </div>`
            : ''}
          <div class="feed-post-actions">
            <div class="feed-post-vote">
              <button class="feed-vote-btn upvote-btn ${orig.userVote === 1 ? 'upvoted' : ''}"
                      data-id="${orig._id}" data-value="1">
                ▲ ${formatNum(orig.upvotes)}
              </button>
              <div class="feed-vote-divider"></div>
              <button class="feed-vote-btn downvote-btn ${orig.userVote === -1 ? 'downvoted' : ''}"
                      data-id="${orig._id}" data-value="-1">
                ▼ ${formatNum(orig.downvotes)}
              </button>
            </div>
            <button class="feed-post-action-btn fse-comment-btn"
                    data-postid="${orig._id}">
              💬 ${formatNum(orig.commentCount)}
            </button>
            ${!orig.isShare
              ? `<button class="feed-post-action-btn feed-share-btn"
                         data-postid="${orig._id}"
                         data-communityid="${community?._id || ''}">
                   ↗ Share
                 </button>`
              : ''}
          </div>
        </div>
        <div class="fse-comments-section" id="fseComments_${orig._id}"></div>`;

      // Smooth scroll embed into view
      setTimeout(() => {
        embed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);

      // Wire comment button
      embed.querySelector('.fse-comment-btn')
        ?.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const section = document.getElementById('fseComments_' + orig._id);
          if (!section) return;

          if (section.classList.contains('rx-open')) {
            section.classList.remove('rx-open');
            setTimeout(() => { section.innerHTML = ''; }, 380);
            return;
          }

          section.innerHTML = `
            <div class="feed-comment-skel" style="margin-bottom:8px;"></div>
            <div class="feed-comment-skel" style="width:70%;"></div>`;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => section.classList.add('rx-open'));
          });

          await loadComments(orig._id, section, 'top');

          setTimeout(() => {
            section.querySelector('.feed-comment-input')?.focus();
          }, 60);
        });

    } catch (err) {
      console.error('Share embed expand error:', err);
      embed.classList.remove('loading');
      embed._originalHTML = null;
    }
  });

  // ── Video card click → replace thumb with player ──────────
  document.addEventListener('click', (e) => {
    const wrap = e.target.closest('.feed-post-video-wrap');
    if (!wrap) return;
    if (wrap.querySelector('video')) return;

    const videoUrl   = wrap.dataset.videoUrl;
    if (!videoUrl) return;

    wrap.style.cursor = 'default';
    wrap.innerHTML = `
      <video class="feed-post-video"
             src="${videoUrl}"
             controls
             autoplay
             preload="auto"
             playsinline>
      </video>`;

    // Size from actual video dimensions (handles fallback / onerror case)
    const video = wrap.querySelector('video');
    if (video) {
      video.addEventListener('loadedmetadata', () => {
        const r = video.videoWidth / video.videoHeight;
        if (!r) return;
        wrap.style.maxWidth = Math.round(460 * r) + 'px';
        wrap.style.marginLeft = 'auto';
        wrap.style.marginRight = 'auto';
      });
    }
  });

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

    const cameraIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>`;

    const composeHtml = isLoggedIn()
      ? `<div>
           <div class="feed-comment-img-previews" id="commentImgPreviews_${postId}"></div>
           <div class="feed-comment-compose">
             <div class="feed-comment-compose-avatar">${initial}</div>
             <div class="feed-comment-pill-wrap">
               <textarea class="feed-comment-input"
                         placeholder="Write a comment..."
                         data-postid="${postId}"
                         rows="1"></textarea>
               <button class="feed-comment-camera-btn" type="button"
                       id="commentCameraBtn_${postId}"
                       title="Add photo">${cameraIcon}</button>
               <input type="file" id="commentCameraInput_${postId}"
                      accept="image/*" multiple style="display:none;">
               <button class="feed-comment-send-btn" disabled>${sendIcon}</button>
             </div>
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
    const input      = section.querySelector('.feed-comment-input');
    const sendBtn    = section.querySelector('.feed-comment-send-btn');
    const cameraBtn  = section.querySelector(`#commentCameraBtn_${postId}`);
    const cameraInp  = section.querySelector(`#commentCameraInput_${postId}`);
    const previewsEl = section.querySelector(`#commentImgPreviews_${postId}`);
    let commentImages = []; // closure — images for this compose box

    function renderCommentPreviews() {
      if (!previewsEl) return;
      if (commentImages.length === 0) { previewsEl.innerHTML = ''; return; }
      previewsEl.innerHTML = commentImages.map((file, i) => {
        const url = URL.createObjectURL(file);
        return `<div class="feed-comment-img-preview">
          <img src="${url}" alt="preview">
          <button class="feed-comment-img-remove" data-index="${i}">✕</button>
        </div>`;
      }).join('');
      previewsEl.querySelectorAll('.feed-comment-img-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          commentImages.splice(parseInt(btn.dataset.index), 1);
          renderCommentPreviews();
          updateSendBtn();
        });
      });
    }

    function updateSendBtn() {
      if (sendBtn) {
        sendBtn.disabled = input.value.trim().length === 0 && commentImages.length === 0;
      }
    }

    // Wire camera
    cameraBtn?.addEventListener('click', () => cameraInp?.click());
    cameraInp?.addEventListener('change', () => {
      Array.from(cameraInp.files || []).forEach(file => {
        if (commentImages.length >= 2) return;
        if (file.size > 5 * 1024 * 1024) { alert(`${file.name} exceeds 5MB.`); return; }
        commentImages.push(file);
      });
      cameraInp.value = '';
      renderCommentPreviews();
      updateSendBtn();
    });

    if (input && sendBtn) {
      function autoResizeComment() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      }

      input.addEventListener('input', () => {
        autoResizeComment();
        sendBtn.disabled = input.value.trim().length === 0 && commentImages.length === 0;
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
          e.preventDefault();
          sendBtn.click();
        }
      });

      sendBtn.addEventListener('click', async () => {
        const body = input.value.trim();
        if (!body && commentImages.length === 0) return;

        sendBtn.disabled = true;
        const origIcon = sendBtn.innerHTML;
        sendBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="animation:feedSpin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';

        const imagesToSend = [...commentImages];
        const newComment = await postComment(postId, body || ' ', null, imagesToSend);
        if (newComment) {
          input.value        = '';
          input.style.height = '';
          commentImages = [];
          renderCommentPreviews();

          const list = section.querySelector(`#commentList_${postId}`);
          if (list) {
            const empty = list.querySelector('div');
            if (empty && empty.textContent.includes('No comments')) empty.remove();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = renderComment(newComment, postId);
            list.insertBefore(wrapper.firstElementChild, list.firstChild);

            const postEl  = section.closest('.feed-post');
            const commBtn = postEl?.querySelector('.feed-post-action-btn');
            if (commBtn && commBtn.textContent.includes('💬')) {
              const current = parseInt(commBtn.textContent.replace(/\D/g, '')) || 0;
              commBtn.textContent = '💬 ' + formatNum(current + 1);
            }
          }
        }

        sendBtn.innerHTML = origIcon;
        updateSendBtn();
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

    const maxDepth  = (comment.depth || 0) >= 5;
    const storedId  = localStorage.getItem('rxUserId');
    const authorId  = (comment.author?._id || '').toString();
    const isOwner   = isLoggedIn() && storedId && storedId === authorId;

    return `
      <div class="feed-comment" data-comment-id="${comment._id}" data-depth="${comment.depth || 0}">
        <div class="feed-comment-avatar">${initial}</div>
        <div class="feed-comment-content">
          <div class="feed-comment-meta">
            <span class="feed-comment-author">${authorName}</span>
            <span class="feed-comment-time">${timeAgo}</span>
            ${editedTag}
          </div>
          <div class="feed-comment-body" id="commentBody_${comment._id}"${isRTL(comment.body) ? ' dir="rtl"' : ''}>${comment.body}</div>
          ${comment.imageUrls && comment.imageUrls.length > 0
            ? `<div class="feed-comment-images">
                 ${comment.imageUrls.map(url =>
                   `<img src="${url}" alt="comment image" loading="lazy"
                         onclick="window.__rxOpenLightbox('${url}', [${comment.imageUrls.map(u => `'${u}'`).join(',')}])">`
                 ).join('')}
               </div>`
            : ''}
          <div class="feed-comment-actions">
            ${!maxDepth
              ? `<button class="feed-comment-action reply-btn"
                         data-comment-id="${comment._id}"
                         data-postid="${postId}">
                   Reply
                 </button>`
              : ''}
            ${isOwner
              ? `<button class="feed-comment-action edit-comment-btn"
                         data-comment-id="${comment._id}">
                   Edit
                 </button>
                 <button class="feed-comment-action delete-comment-btn"
                         data-comment-id="${comment._id}"
                         data-postid="${postId}">
                   Delete
                 </button>`
              : ''}
          </div>
          <div class="feed-reply-area" id="replyArea_${comment._id}"></div>
        </div>
      </div>
      ${repliesHtml}`;
  }

  async function postComment(postId, body, parentId, images = []) {
    try {
      let fetchOptions;
      if (images.length > 0) {
        const fd = new FormData();
        fd.append('body', body);
        if (parentId) fd.append('parentId', parentId);
        images.forEach(file => fd.append('images', file));
        fetchOptions = {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + getToken() },
          body: fd
        };
      } else {
        fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ body, parentId: parentId || undefined })
        };
      }
      const res = await fetch(`/api/posts/${postId}/comments`, fetchOptions);

      const data = await res.json();
      if (res.ok) return data.comment;

      if (res.status === 403 && data?.suspendedUntil) {
        const until = new Date(data.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        showReportToast(`You are suspended until ${until}`);
      } else {
        console.error('Post comment failed:', data.message);
      }
      return null;
    } catch (e) {
      console.error('Post comment error:', e);
      return null;
    }
  }

  // ── Edit comment handler ──────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-comment-btn');
    if (!btn) return;

    const commentId   = btn.dataset.commentId;
    const bodyEl      = document.getElementById('commentBody_' + commentId);
    if (!bodyEl) return;

    // If already editing, do nothing
    if (bodyEl.contentEditable === 'true') return;

    const contentEl   = bodyEl.closest('.feed-comment-content');
    const original    = bodyEl.textContent.trim();

    // ── Build existing image preview ──────────────────────
    const commentImgsEl = contentEl?.querySelector('.feed-comment-images');
    let   editImgUrls   = commentImgsEl
      ? Array.from(commentImgsEl.querySelectorAll('img')).map(img => img.src)
      : [];

    // Insert edit-mode image preview section (removed on save/cancel)
    let editMediaEl = null;
    if (editImgUrls.length > 0) {
      editMediaEl = document.createElement('div');
      editMediaEl.id = 'commentEditMedia_' + commentId;
      editMediaEl.className = 'feed-existing-media-section';

      function renderCommentEditMedia() {
        if (editImgUrls.length === 0) {
          editMediaEl.innerHTML = '';
          return;
        }
        editMediaEl.innerHTML = `
          <div class="feed-existing-media-label">Current images</div>
          <div class="feed-existing-media-grid">
            ${editImgUrls.map((url, i) => `
              <div class="feed-image-preview-item">
                <img src="${url}" alt="Comment image" loading="lazy">
                <button class="feed-image-preview-remove"
                        data-cmt-img-idx="${i}"
                        data-comment-id="${commentId}"
                        title="Remove image">✕</button>
              </div>`).join('')}
          </div>`;

        editMediaEl.querySelectorAll('[data-cmt-img-idx]').forEach(xBtn => {
          xBtn.addEventListener('click', async () => {
            const idx = parseInt(xBtn.dataset.cmtImgIdx, 10);
            xBtn.disabled    = true;
            xBtn.textContent = '…';
            try {
              const res = await fetch(
                `/api/posts/comments/${commentId}/images/${idx}`,
                { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + getToken() } }
              );
              if (res.ok) {
                editImgUrls.splice(idx, 1);
                renderCommentEditMedia();
                showReportToast('Image removed');
                // Update the live images section in the comment DOM
                if (commentImgsEl) {
                  if (editImgUrls.length === 0) {
                    commentImgsEl.innerHTML = '';
                  } else {
                    commentImgsEl.innerHTML = editImgUrls.map(u =>
                      `<img src="${u}" alt="comment image" loading="lazy"
                            onclick="window.__rxOpenLightbox('${u}',[${editImgUrls.map(x=>`'${x}'`).join(',')}])">`
                    ).join('');
                  }
                }
                // Add (edited) tag if not already present
                const metaEl = contentEl?.querySelector('.feed-comment-meta');
                if (metaEl && !metaEl.querySelector('.feed-comment-edited')) {
                  const tag = document.createElement('span');
                  tag.className   = 'feed-comment-edited';
                  tag.textContent = '(edited)';
                  metaEl.appendChild(tag);
                }
              } else {
                xBtn.textContent = '✕';
                xBtn.disabled    = false;
              }
            } catch {
              xBtn.textContent = '✕';
              xBtn.disabled    = false;
            }
          });
        });
      }

      renderCommentEditMedia();
      bodyEl.after(editMediaEl);
    }

    // Make body editable inline
    bodyEl.contentEditable = 'true';
    bodyEl.style.cssText = `
      outline: none;
      border: 1.5px solid var(--primary);
      border-radius: 8px;
      padding: 6px 10px;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(90,15,28,0.07);
      min-width: 60px;
    `;
    bodyEl.focus();

    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(bodyEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Change Edit button to Save/Cancel
    btn.textContent = 'Save';
    btn.dataset.editing = 'true';

    // Insert Cancel next to Save
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'feed-comment-action';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.id = 'editCancelBtn_' + commentId;
    btn.after(cancelBtn);

    function cleanupEditMedia() {
      editMediaEl?.remove();
      editMediaEl = null;
    }

    // Cancel handler
    cancelBtn.addEventListener('click', () => {
      bodyEl.textContent      = original;
      bodyEl.contentEditable  = 'false';
      bodyEl.style.cssText    = '';
      btn.textContent         = 'Edit';
      btn.dataset.editing     = '';
      cancelBtn.remove();
      cleanupEditMedia();
    });

    // Save handler
    btn.addEventListener('click', async function saveHandler() {
      if (!btn.dataset.editing) return;

      const newBody = bodyEl.textContent.trim();
      if (!newBody) return;
      if (newBody === original) {
        bodyEl.contentEditable = 'false';
        bodyEl.style.cssText   = '';
        btn.textContent        = 'Edit';
        btn.dataset.editing    = '';
        cancelBtn.remove();
        btn.removeEventListener('click', saveHandler);
        cleanupEditMedia();
        showReportToast('Done');
        return;
      }

      btn.textContent  = '...';
      btn.disabled     = true;

      try {
        const res = await fetch(`/api/posts/comments/${commentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({ body: newBody })
        });

        const data = await res.json();

        if (res.ok) {
          bodyEl.textContent     = data.comment.body;
          bodyEl.contentEditable = 'false';
          bodyEl.style.cssText   = '';
          btn.textContent        = 'Edit';
          btn.dataset.editing    = '';
          btn.disabled           = false;
          cancelBtn.remove();
          btn.removeEventListener('click', saveHandler);
          cleanupEditMedia();

          // Add (edited) tag if not already there
          const metaEl = bodyEl.closest('.feed-comment-content')
                                ?.querySelector('.feed-comment-meta');
          if (metaEl && !metaEl.querySelector('.feed-comment-edited')) {
            const tag = document.createElement('span');
            tag.className   = 'feed-comment-edited';
            tag.textContent = '(edited)';
            metaEl.appendChild(tag);
          }
        } else {
          showReportToast(data.message || 'Failed to save comment');
          btn.textContent = 'Save';
          btn.disabled    = false;
        }
      } catch (err) {
        showReportToast('Failed to save comment');
        btn.textContent = 'Save';
        btn.disabled    = false;
      }
    });
  });

  // ── Delete comment handler ────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-comment-btn');
    if (!btn) return;

    const commentId = btn.dataset.commentId;
    const postId    = btn.dataset.postid;

    // Inline confirm — replace actions with Yes/No
    const actionsEl = btn.closest('.feed-comment-actions');
    if (!actionsEl) return;

    const originalHTML = actionsEl.innerHTML;

    actionsEl.innerHTML = `
      <span style="font-size:0.72rem;color:var(--text-light);font-family:'Segoe UI',sans-serif;">
        Delete this comment?
      </span>
      <button class="feed-comment-action" id="confirmDeleteYes_${commentId}"
              style="color:#dc2626;">Yes</button>
      <button class="feed-comment-action" id="confirmDeleteNo_${commentId}">No</button>`;

    document.getElementById('confirmDeleteNo_' + commentId)
      ?.addEventListener('click', () => {
        actionsEl.innerHTML = originalHTML;
      });

    document.getElementById('confirmDeleteYes_' + commentId)
      ?.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/posts/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + getToken() }
          });

          if (res.ok) {
            const commentEl = document.querySelector(
              `[data-comment-id="${commentId}"]`
            );
            if (commentEl) {
              commentEl.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
              commentEl.style.opacity    = '0';
              commentEl.style.maxHeight  = '0';
              commentEl.style.overflow   = 'hidden';
              setTimeout(() => commentEl.remove(), 320);
            }

            // Decrement comment count on post button
            const postEl  = document.querySelector(`.feed-post[data-id="${postId}"]`);
            const commBtn = postEl?.querySelector('.feed-post-action-btn');
            if (commBtn && commBtn.textContent.includes('💬')) {
              const current = parseInt(commBtn.textContent.replace(/\D/g, '')) || 0;
              commBtn.textContent = '💬 ' + formatNum(Math.max(0, current - 1));
            }
          } else {
            actionsEl.innerHTML = originalHTML;
          }
        } catch (err) {
          console.error('Delete comment error:', err);
          actionsEl.innerHTML = originalHTML;
        }
      });
  });

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
          <textarea class="feed-reply-input"
                    placeholder="Write a reply..."
                    rows="1"></textarea>
          <button class="feed-reply-send-btn" disabled>${sendIcon}</button>
        </div>
      </div>`;

    const input     = area.querySelector('.feed-reply-input');
    const submitBtn = area.querySelector('.feed-reply-send-btn');

    input.focus();

    function autoResizeReply() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    }

    input.addEventListener('input', () => {
      autoResizeReply();
      submitBtn.disabled = input.value.trim().length === 0;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitBtn.disabled && !e.shiftKey) {
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
        input.style.height = '';
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