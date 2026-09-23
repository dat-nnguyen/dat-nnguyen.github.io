import {
  formatDate,
  escapeHtml,
  stripHtml,
  highlightMatches,
  extractSnippet,
  md5,
  getGravatarUrl,
  getAvatarUrl,
  showToast,
} from './utils.js';

// 1. Coffee Button Modal Logic
const coffeeBtn = document.getElementById('coffee-btn');
const qrModal = document.getElementById('qr-modal');
const qrModalClose = document.getElementById('qr-modal-close');

coffeeBtn.addEventListener('click', () => {
  qrModal.classList.remove('qr-modal-hidden');
});

qrModalClose.addEventListener('click', () => {
  qrModal.classList.add('qr-modal-hidden');
});

qrModal.addEventListener('click', (e) => {
  if (e.target === qrModal) {
    qrModal.classList.add('qr-modal-hidden');
  }
});



const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

const themeBtn = document.getElementById('theme-toggle');

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
    document.body.classList.add('light-theme');
    if (themeBtn) {
      themeBtn.innerHTML = moonIcon;
      themeBtn.setAttribute('title', 'Switch to dark mode');
      themeBtn.setAttribute('aria-label', 'Switch to dark mode');
    }
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.body.classList.remove('light-theme');
    if (themeBtn) {
      themeBtn.innerHTML = sunIcon;
      themeBtn.setAttribute('title', 'Switch to light mode');
      themeBtn.setAttribute('aria-label', 'Switch to light mode');
    }
    localStorage.setItem('theme', 'dark');
  }
}

// Initialize theme state on load
const currentSavedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(currentSavedTheme);

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isCurrentlyLight = document.documentElement.classList.contains('light-theme');
    const targetTheme = isCurrentlyLight ? 'dark' : 'light';

    themeBtn.classList.add('theme-toggle-spin');
    setTimeout(() => themeBtn.classList.remove('theme-toggle-spin'), 350);

    // If browser supports View Transitions API, execute a seamless cross-fade of the whole screen
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyTheme(targetTheme);
      });
    } else {
      // Fallback: smooth transition class across all layout elements
      document.documentElement.classList.add('theme-transitioning');
      applyTheme(targetTheme);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
    }
  });
}

const navAbout = document.getElementById('nav-about');
const navHome = document.getElementById('nav-home');

const viewHome = document.getElementById('view-home');
const viewBlogs = document.getElementById('view-blogs');
const viewArticles = document.getElementById('view-articles');
const viewProjects = document.getElementById('view-projects');
const viewAbout = document.getElementById('view-about');
const viewPost = document.getElementById('view-post');
const backToHome = document.getElementById('back-to-home');
const postDetailContainer = document.getElementById('post-detail-container');

function showView(targetView) {
  const views = [viewHome, viewBlogs, viewArticles, viewProjects, viewAbout, viewPost];
  views.forEach((v) => {
    if (v) v.classList.add('hidden');
  });

  if (targetView) targetView.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function updateActiveNav(activeId) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    item.classList.remove('active');
  });
  if (activeId) {
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.classList.add('active');
  }
}

const aboutContainer = document.getElementById('about-bio-container');
let isAboutFetched = false;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const API_BASE_URL = rawApiBase.endsWith('/api') ? rawApiBase.slice(0, -4) : rawApiBase;

async function fetchWithTimeout(url, options = {}, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

let staticPostsMemoryCache = null;

async function getStaticPosts() {
  if (staticPostsMemoryCache) return staticPostsMemoryCache;
  try {
    const staticRes = await fetch('./data/posts.json');
    if (staticRes.ok) {
      staticPostsMemoryCache = await staticRes.json();
      return staticPostsMemoryCache;
    }
  } catch (staticErr) {
    console.warn('Static posts fetch notice, checking API Gateway fallback:', staticErr.message);
  }
  return null;
}

async function fetchAboutContent() {
  if (isAboutFetched) return;

  try {
    let content = null;

    // 1. Primary: load static bundled about data
    try {
      const staticRes = await fetch('./data/about.json', { cache: 'no-cache' });
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        content = staticData.content;
      }
    } catch (staticErr) {
      console.warn('Static bio fetch notice, checking API Gateway fallback:', staticErr.message);
    }

    // 2. Fallback: API Gateway
    if (!content && API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/about`);
        if (response.ok) {
          const data = await response.json();
          content = data.content;
        }
      } catch (apiErr) {
        console.warn('API bio fetch error:', apiErr.message);
      }
    }

    if (!content) {
      throw new Error('Bio content unavailable');
    }

    aboutContainer.innerHTML = `<div class="markdown-body">${content}</div>`;
    isAboutFetched = true;
  } catch (error) {
    console.error("Failed to fetch bio:", error);
    aboutContainer.innerHTML = `<p class="section-desc" style="color: #ff6b6b;">Error: Could not load bio. Is the backend running?</p>`;
  }
}

// formatDate imported from ./utils.js

// Fetch single post and display in view-post
async function openPost(slug) {
  showView(viewPost);
  postDetailContainer.innerHTML = `<p class="loading-text">Loading article...</p>`;

  try {
    let post = null;

    // 1. Primary: load from static compiled bundle (fastest and cached in memory)
    try {
      const staticPosts = await getStaticPosts();
      if (staticPosts) {
        post = staticPosts.find((p) => p.slug === slug);
      }
    } catch (staticErr) {
      console.warn('Static post fetch notice, checking API Gateway fallback:', staticErr.message);
    }

    // 2. Fallback to API Gateway if not found in static bundle
    if (!post && API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${slug}`);
        if (response.ok) {
          post = await response.json();
        }
      } catch (apiErr) {
        console.warn('API post fetch notice, checking static fallback:', apiErr.message);
      }
    }

    if (!post) throw new Error('Post not found');

    postDetailContainer.innerHTML = `
      <article class="post-detail">
        <header class="post-header">
          <h1 class="post-title">${post.title}</h1>
          <div class="post-meta">
            <span class="post-date">${formatDate(post.createdAt)}</span> &bull; 
            <span class="post-category">${post.category}</span> &bull; 
            <span class="post-reading-time">⏱️ ${post.readingTime || '1 min read'}</span>
          </div>
        </header>
        <hr class="post-divider" />
        <div class="markdown-body">
          ${post.content}
        </div>

        <div class="post-actions">
          <button id="like-btn" class="like-btn">
            ❤️ Like <span id="like-count">0</span>
          </button>
          <button id="share-btn" class="share-btn" title="Copy post link">
            🔗 Copy Link
          </button>
        </div>
      </article>

      <!-- SUBSCRIBE NEWSLETTER SECTION -->
      <section class="subscribe-section" id="post-subscribe-section">
        <div class="subscribe-card">
          <div class="subscribe-header">
            <div class="subscribe-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </div>
            <div class="subscribe-text">
              <h3 class="subscribe-title">Enjoyed this post?</h3>
              <p class="subscribe-desc">Get an email notification whenever I publish a new article or technical breakdown. Just your email, no spam.</p>
            </div>
          </div>
          <form class="subscribe-form" id="post-subscribe-form">
            <div class="subscribe-input-group">
              <input type="email" class="form-input subscribe-input" placeholder="Enter your email" required autocomplete="email" />
              <button type="submit" class="subscribe-btn">
                <span>Subscribe</span>
              </button>
            </div>
            <p class="form-status subscribe-status"></p>
          </form>
        </div>
      </section>

      <!-- COMMENTS SECTION -->
      <section class="comments-section">
        <h3 class="comments-header">💬 What do you think?</h3>
        
        <form id="comment-form" class="comment-form">
          <h4 class="form-title">Leave a Comment</h4>
          <div class="form-row">
            <input type="text" id="comment-author" placeholder="Your Name" required class="form-input" />
            <input type="email" id="comment-email" placeholder="Your Email" required class="form-input" />
          </div>
          <textarea id="comment-content" placeholder="Write your thoughts..." required class="form-textarea" rows="4"></textarea>
          <button type="submit" class="comment-submit-btn">Submit Comment</button>
          <p id="comment-form-status" class="form-status"></p>
        </form>

        <div id="comments-list-container" class="comments-list">
          <p class="loading-text">Loading comments...</p>
        </div>
      </section>
    `;

    attachCopyButtons();
    fetchLikes(slug);

    const likeBtn = document.getElementById('like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', () => handleLikeClick(slug));
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => handleShareClick(slug));
    }

    const postSubscribeForm = document.getElementById('post-subscribe-form');
    if (postSubscribeForm) {
      setupSubscribeForm(postSubscribeForm);
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', (e) => handleCommentSubmit(e, slug));
    }

    loadComments(slug);
  } catch (error) {
    console.error('Failed to open post:', error);
    postDetailContainer.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Failed to load article.</p>`;
  }
}

async function fetchLikes(slug) {
  const likeBtn = document.getElementById('like-btn');
  const likeCountEl = document.getElementById('like-count');
  if (!likeCountEl) return;

  const isLiked = localStorage.getItem(`liked_${slug}`) === 'true';
  if (isLiked && likeBtn) {
    likeBtn.classList.add('liked');
  } else if (likeBtn) {
    likeBtn.classList.remove('liked');
  }

  // Display locally cached like count immediately
  const localLikes = parseInt(localStorage.getItem(`likes_count_${slug}`), 10);
  if (!isNaN(localLikes)) {
    likeCountEl.innerText = localLikes;
  }

  // 1. Try Supabase first if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('likes_count')
        .eq('article_id', slug)
        .maybeSingle();

      if (!error && data && typeof data.likes_count === 'number') {
        likeCountEl.innerText = data.likes_count;
        localStorage.setItem(`likes_count_${slug}`, data.likes_count);
        return;
      }
    } catch (err) {
      console.warn('Supabase fetchLikes notice:', err.message);
    }
  }

  // 2. Fallback to API Gateway if configured
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/comments/like/${slug}`, {}, 3000);
      if (res.ok) {
        const data = await res.json();
        const count = typeof data.likes === 'number' ? data.likes : (data.likes || 0);
        likeCountEl.innerText = count;
        localStorage.setItem(`likes_count_${slug}`, count);
      }
    } catch (err) {
      console.warn('Backend like sync notice, using local cache:', err.message);
    }
  }
}

async function handleLikeClick(slug) {
  const likeBtn = document.getElementById('like-btn');
  const likeCountEl = document.getElementById('like-count');

  if (likeBtn) likeBtn.disabled = true;

  const isLiked = localStorage.getItem(`liked_${slug}`) === 'true';
  const action = isLiked ? 'unlike' : 'like';

  // Optimistic instant UI update
  let currentCount = parseInt(likeCountEl ? likeCountEl.innerText : '0', 10);
  if (isNaN(currentCount)) currentCount = 0;

  if (isLiked) {
    currentCount = Math.max(0, currentCount - 1);
    localStorage.setItem(`liked_${slug}`, 'false');
    if (likeBtn) likeBtn.classList.remove('liked');
  } else {
    currentCount = currentCount + 1;
    localStorage.setItem(`liked_${slug}`, 'true');
    if (likeBtn) likeBtn.classList.add('liked');
  }
  if (likeCountEl) likeCountEl.innerText = currentCount;
  localStorage.setItem(`likes_count_${slug}`, currentCount);

  // 1. Sync with Supabase if configured
  if (supabase) {
    try {
      // Try stored procedure first
      const { data, error } = await supabase.rpc('increment_like', {
        post_slug: slug,
        is_unlike: isLiked,
      });

      if (!error && typeof data === 'number') {
        likeCountEl.innerText = data;
        localStorage.setItem(`likes_count_${slug}`, data);
      } else {
        // Fallback to direct upsert
        const { data: upsertData, error: upsertErr } = await supabase
          .from('likes')
          .upsert({ article_id: slug, likes_count: currentCount })
          .select()
          .single();

        if (!upsertErr && upsertData && typeof upsertData.likes_count === 'number') {
          likeCountEl.innerText = upsertData.likes_count;
          localStorage.setItem(`likes_count_${slug}`, upsertData.likes_count);
        }
      }
    } catch (err) {
      console.warn('Supabase like sync error:', err.message);
    }
  } else if (API_BASE_URL) {
    // 2. Sync with API Gateway
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/comments/like/${slug}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
        3000
      );

      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === 'number') {
          if (likeCountEl) likeCountEl.innerText = data.likes;
          localStorage.setItem(`likes_count_${slug}`, data.likes);
        }
      }
    } catch (err) {
      console.warn('Backend like sync unavailable, saved state locally:', err.message);
    }
  }

  if (likeBtn) likeBtn.disabled = false;
}



function attachCopyButtons() {
  const codeBlocks = document.querySelectorAll('.markdown-body pre');
  codeBlocks.forEach((block) => {
    if (block.querySelector('.copy-code-btn')) return;

    block.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.innerText = 'Copy';
    btn.addEventListener('click', async () => {
      const code = block.querySelector('code')?.innerText || block.innerText;
      const success = await copyToClipboard(code);
      if (success) {
        btn.innerText = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerText = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      }
    });
    block.appendChild(btn);
  });
}


function renderCommentsList(comments, slug) {
  const container = document.getElementById('comments-list-container');
  if (!container) return;

  if (!comments || comments.length === 0) {
    container.innerHTML = `<p class="no-comments-text">No comments yet. Be the first to start the conversation!</p>`;
    return;
  }

  container.innerHTML = comments
    .map((c) => {
      const email = c.author_email || c.authorEmail || '';
      const name = c.author_name || c.authorName || 'Anonymous';
      const avatarUrl = getAvatarUrl(email, name);
      const commentId = c.id;

      return `
        <div class="comment-card" id="comment-${commentId}">
          <div class="comment-header">
            <div class="comment-author-box">
              <img src="${avatarUrl}" alt="${escapeHtml(name)}" class="comment-avatar" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=64b5f6&color=121212&bold=true';" />
              <span class="comment-author">${escapeHtml(name)}</span>
            </div>
            <div class="comment-header-right">
              <span class="comment-date">${formatDate(c.created_at || c.createdAt)}</span>
              <button class="comment-delete-btn" title="Delete comment" onclick="window.deleteComment('${commentId}', '${slug}')" aria-label="Delete comment">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="comment-body">${escapeHtml(c.content)}</div>
        </div>
      `;
    })
    .join('');
}

async function loadComments(slug) {
  const container = document.getElementById('comments-list-container');
  if (!container) return;

  let localComments = [];
  try {
    localComments = JSON.parse(localStorage.getItem(`comments_${slug}`)) || [];
  } catch (e) {
    localComments = [];
  }

  // Render locally stored comments immediately
  if (localComments.length > 0) {
    renderCommentsList(localComments, slug);
  }

  // 1. Try Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('article_id', slug)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const commentMap = new Map();
        data.forEach((c) => commentMap.set(String(c.id), c));
        localComments.forEach((c) => {
          if (!commentMap.has(String(c.id))) commentMap.set(String(c.id), c);
        });
        const allComments = Array.from(commentMap.values());
        allComments.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
        localStorage.setItem(`comments_${slug}`, JSON.stringify(allComments));
        renderCommentsList(allComments, slug);
        return;
      }
    } catch (err) {
      console.warn('Supabase loadComments notice:', err.message);
    }
  }

  // 2. Fallback to API Gateway
  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/comments/${slug}`, {}, 3000);
      if (res.ok) {
        const remoteComments = await res.json();
        if (Array.isArray(remoteComments)) {
          const commentMap = new Map();
          remoteComments.forEach((c) => commentMap.set(String(c.id), c));
          localComments.forEach((c) => {
            if (!commentMap.has(String(c.id))) commentMap.set(String(c.id), c);
          });
          const allComments = Array.from(commentMap.values());
          allComments.sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
          localStorage.setItem(`comments_${slug}`, JSON.stringify(allComments));
          renderCommentsList(allComments, slug);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend comments unreachable, rendering cached/local comments:', err.message);
    }
  }

  // Fallback: render whatever local comments exist or empty state
  renderCommentsList(localComments, slug);
}

async function deleteComment(commentId, slug) {
  let adminPassword = sessionStorage.getItem('blog_admin_password');

  if (!adminPassword) {
    adminPassword = prompt('🔒 Admin Access Required\nPlease enter the Admin Password to delete this comment:');
    if (!adminPassword) return; // User cancelled prompt
  }

  if (!confirm('Are you sure you want to delete this comment?')) return;

  // 1. Delete on Supabase using secure RPC with password verification
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('delete_comment_with_password', {
        target_comment_id: commentId,
        admin_password: adminPassword,
      });

      if (error || data !== true) {
        sessionStorage.removeItem('blog_admin_password');
        alert('❌ Invalid Admin Password. Access denied.');
        return;
      }

      // Password was correct, remember for this browser session
      sessionStorage.setItem('blog_admin_password', adminPassword);
    } catch (err) {
      sessionStorage.removeItem('blog_admin_password');
      alert(`❌ Invalid Admin Password: ${err.message || 'Access denied.'}`);
      return;
    }
  } else if (API_BASE_URL) {
    // 2. Delete on API Gateway
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'x-admin-key': adminPassword,
          },
        },
        3000
      );

      if (res.ok) {
        sessionStorage.setItem('blog_admin_password', adminPassword);
      } else if (res.status === 403 || res.status === 401) {
        sessionStorage.removeItem('blog_admin_password');
        alert('❌ Invalid Admin Password. Access denied.');
        return;
      }
    } catch (err) {
      sessionStorage.removeItem('blog_admin_password');
      alert('❌ Failed to authenticate admin password.');
      return;
    }
  }

  // Remove from local storage cache only if authenticated
  let localComments = [];
  try {
    localComments = JSON.parse(localStorage.getItem(`comments_${slug}`)) || [];
    localComments = localComments.filter((c) => String(c.id) !== String(commentId));
    localStorage.setItem(`comments_${slug}`, JSON.stringify(localComments));
  } catch (e) {}

  const commentEl = document.getElementById(`comment-${commentId}`);
  if (commentEl) {
    commentEl.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    commentEl.style.opacity = '0';
    commentEl.style.transform = 'scale(0.95)';
    setTimeout(() => {
      loadComments(slug);
    }, 250);
  } else {
    loadComments(slug);
  }
}

window.deleteComment = deleteComment;



// getAvatarUrl, getGravatarUrl, md5 imported from ./utils.js


async function handleCommentSubmit(e, slug) {
  e.preventDefault();

  const authorInput = document.getElementById('comment-author');
  const emailInput = document.getElementById('comment-email');
  const contentInput = document.getElementById('comment-content');
  const statusEl = document.getElementById('comment-form-status');

  const authorName = authorInput.value.trim();
  const authorEmail = emailInput.value.trim();
  const content = contentInput.value.trim();

  if (!authorName || !authorEmail || !content) return;

  statusEl.innerText = 'Submitting comment...';
  statusEl.style.color = 'var(--text-secondary)';

  const newComment = {
    id: 'local_' + Date.now(),
    article_id: slug,
    author_name: authorName,
    author_email: authorEmail,
    content: content,
    created_at: new Date().toISOString(),
  };

  let savedComment = newComment;

  // 1. Try Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            article_id: slug,
            author_name: authorName,
            author_email: authorEmail,
            content: content,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        savedComment = data;
      }
    } catch (err) {
      console.warn('Supabase comment insert failed, using local storage:', err.message);
    }
  } else if (API_BASE_URL) {
    // 2. Try API Gateway
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/api/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: slug,
            authorName,
            authorEmail,
            content,
          }),
        },
        3000
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          savedComment = data;
        }
      } else {
        console.warn('Backend responded with error, saving comment locally.');
      }
    } catch (err) {
      console.warn('Backend unavailable, saving comment locally:', err.message);
    }
  }

  // Save to local storage
  let localComments = [];
  try {
    localComments = JSON.parse(localStorage.getItem(`comments_${slug}`)) || [];
  } catch (e) {}

  // Avoid duplicates
  if (!localComments.some((c) => String(c.id) === String(savedComment.id))) {
    localComments.push(savedComment);
  }
  localStorage.setItem(`comments_${slug}`, JSON.stringify(localComments));

  statusEl.innerText = 'Comment posted successfully!';
  statusEl.style.color = '#4cd964';

  authorInput.value = '';
  emailInput.value = '';
  contentInput.value = '';

  setTimeout(() => {
    statusEl.innerText = '';
    loadComments(slug);
  }, 600);
}

// escapeHtml imported from ./utils.js


// Fetch posts (with optional limit for homepage sections)
async function fetchAndRenderPosts(category, containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let posts = [];

  // 1. Primary source of truth: static bundled posts compiled from Markdown at build time
  try {
    const staticPosts = await getStaticPosts();
    if (staticPosts) {
      posts = [...staticPosts];
    }
  } catch (staticErr) {
    console.warn('Static posts fetch notice, checking API Gateway fallback:', staticErr.message);
  }

  // 2. Fallback to API Gateway only if static bundle is unavailable
  if (posts.length === 0 && API_BASE_URL) {
    try {
      const url = limit
        ? `${API_BASE_URL}/api/posts?category=${category}&limit=${limit}`
        : `${API_BASE_URL}/api/posts?category=${category}`;

      const response = await fetch(url);
      if (response.ok) {
        posts = await response.json();
      }
    } catch (error) {
      console.warn(`API Gateway fetch failed for ${category}:`, error.message);
    }
  }

  if (category) {
    posts = posts.filter((p) => p.category && p.category.toLowerCase() === category.toLowerCase());
  }

  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (limit && posts.length > limit) {
    posts = posts.slice(0, limit);
  }

  if (posts.length === 0) {
    container.innerHTML = `<p class="loading-text">No ${category || ''} posts yet.</p>`;
    return;
  }

  container.innerHTML = posts
    .map(
      (post) => `
          <div class="list-item">
              <span class="date">${formatDate(post.createdAt)} &bull; ${post.readingTime || ''}</span>
              <span class="title">
                  <a href="#post/${post.slug}" class="post-link" data-slug="${post.slug}">${post.title}</a>
              </span>
          </div>
      `,
    )
    .join('');

  applySearchFilter();
}

// Fetch projects dynamically from /api/projects with static fallback
async function fetchAndRenderProjects(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let projects = [];

  // 1. Primary: load static projects bundled with the site
  try {
    const staticRes = await fetch('./data/projects.json', { cache: 'no-cache' });
    if (staticRes.ok) {
      projects = await staticRes.json();
    }
  } catch (staticErr) {
    console.warn('Static projects fetch notice, checking API Gateway:', staticErr.message);
  }

  // 2. Fallback to API Gateway if static bundle is unavailable
  if (projects.length === 0 && API_BASE_URL) {
    try {
      const url = limit ? `${API_BASE_URL}/api/projects?limit=${limit}` : `${API_BASE_URL}/api/projects`;
      const response = await fetch(url);
      if (response.ok) {
        projects = await response.json();
      }
    } catch (error) {
      console.warn('API projects error:', error.message);
    }
  }

  if (limit && projects.length > limit) {
    projects = projects.slice(0, limit);
  }

  if (projects.length === 0) {
    container.innerHTML = `<p class="loading-text">No projects yet.</p>`;
    return;
  }

  container.innerHTML = projects
    .map(
      (project) => `
        <div class="card project-card">
            <h3 class="project-card-title"><a href="${project.link || '#'}" target="_blank" rel="noopener noreferrer">${project.title}</a></h3>
            <p class="project-card-desc">${project.description}</p>
            ${
              project.tags && project.tags.length > 0
                ? `<div class="project-tags">
                    ${project.tags.map((t) => `<span class="project-tag">${t}</span>`).join('')}
                   </div>`
                : ''
            }
        </div>
      `,
    )
    .join('');

  applySearchFilter();
}

// ==========================================
// FULL-TEXT SEARCH SYSTEM
// ==========================================
let searchIndex = {
  posts: null,
  projects: null,
  loadingPromise: null,
};

async function loadSearchIndex() {
  if (searchIndex.posts && searchIndex.projects) {
    return searchIndex;
  }
  if (searchIndex.loadingPromise) {
    return searchIndex.loadingPromise;
  }

  searchIndex.loadingPromise = (async () => {
    try {
      const [postsRes, projectsRes] = await Promise.allSettled([
        fetch('./data/posts.json', { cache: 'no-cache' }),
        fetch('./data/projects.json', { cache: 'no-cache' }),
      ]);

      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        searchIndex.posts = await postsRes.value.json();
      } else {
        searchIndex.posts = [];
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value.ok) {
        searchIndex.projects = await projectsRes.value.json();
      } else {
        searchIndex.projects = [];
      }
    } catch (err) {
      console.warn('Search index load notice:', err.message);
      searchIndex.posts = searchIndex.posts || [];
      searchIndex.projects = searchIndex.projects || [];
    }
    return searchIndex;
  })();

  return searchIndex.loadingPromise;
}

// stripHtml, highlightMatches, extractSnippet imported from ./utils.js

function closeSearchDropdown() {
  const dropdown = document.getElementById('search-results-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
}

function clearSearch() {
  const searchInput = document.getElementById('site-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  if (searchInput) {
    searchInput.value = '';
    searchInput.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  closeSearchDropdown();
  applySearchFilter();
}

async function executeSearch(query) {
  const dropdown = document.getElementById('search-results-dropdown');
  const clearBtn = document.getElementById('search-clear-btn');
  if (!dropdown) return;

  const trimmed = query.trim();
  if (clearBtn) {
    if (trimmed.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  // Also apply in-page filter
  applySearchFilter();

  if (!trimmed) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  const { posts, projects } = await loadSearchIndex();
  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  // Match posts
  const matchedPosts = [];
  for (const post of posts || []) {
    const titleLower = (post.title || '').toLowerCase();
    const slugLower = (post.slug || '').toLowerCase();
    const categoryLower = (post.category || '').toLowerCase();
    const plainContent = stripHtml(post.content || '');
    const contentLower = plainContent.toLowerCase();

    let score = 0;
    let hasMatch = false;

    for (const term of terms) {
      if (titleLower.includes(term)) {
        score += 10;
        hasMatch = true;
      }
      if (categoryLower.includes(term)) {
        score += 5;
        hasMatch = true;
      }
      if (slugLower.includes(term)) {
        score += 4;
        hasMatch = true;
      }
      if (contentLower.includes(term)) {
        score += 2;
        hasMatch = true;
      }
    }

    if (hasMatch) {
      matchedPosts.push({
        ...post,
        score,
        snippet: extractSnippet(plainContent, trimmed),
      });
    }
  }
  matchedPosts.sort((a, b) => b.score - a.score);

  // Match projects
  const matchedProjects = [];
  for (const project of projects || []) {
    const titleLower = (project.title || '').toLowerCase();
    const descLower = (project.description || '').toLowerCase();
    const tagsLower = (project.tags || []).join(' ').toLowerCase();

    let score = 0;
    let hasMatch = false;

    for (const term of terms) {
      if (titleLower.includes(term)) {
        score += 10;
        hasMatch = true;
      }
      if (tagsLower.includes(term)) {
        score += 6;
        hasMatch = true;
      }
      if (descLower.includes(term)) {
        score += 3;
        hasMatch = true;
      }
    }

    if (hasMatch) {
      matchedProjects.push({
        ...project,
        score,
        snippet: extractSnippet(project.description || '', trimmed),
      });
    }
  }
  matchedProjects.sort((a, b) => b.score - a.score);

  const totalResults = matchedPosts.length + matchedProjects.length;

  if (totalResults === 0) {
    dropdown.innerHTML = `
      <div class="search-empty-state">
        <p>No results found for <strong>"${escapeHtml(trimmed)}"</strong></p>
        <p class="search-empty-hint">Try searching by topic, e.g., <em>Operating System, Redis, Microservices, AI, Docker</em></p>
      </div>
    `;
    dropdown.classList.remove('hidden');
    return;
  }

  let html = '';

  if (matchedPosts.length > 0) {
    html += `
      <div class="search-group">
        <div class="search-group-title">
          <span>Articles & Blogs (${matchedPosts.length})</span>
        </div>
        ${matchedPosts
          .map(
            (p) => `
          <div class="search-result-item" role="option" data-type="post" data-slug="${p.slug}" tabindex="0">
            <div class="search-item-header">
              <span class="search-item-title">${highlightMatches(p.title, trimmed)}</span>
              <span class="search-item-badge ${p.category === 'life' ? 'badge-life' : 'badge-technical'}">${p.category || 'Article'}</span>
            </div>
            <p class="search-item-snippet">${highlightMatches(p.snippet, trimmed)}</p>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  if (matchedProjects.length > 0) {
    html += `
      <div class="search-group">
        <div class="search-group-title">
          <span>Projects (${matchedProjects.length})</span>
        </div>
        ${matchedProjects
          .map(
            (p) => `
          <div class="search-result-item" role="option" data-type="project" data-url="${p.link || '#'}" tabindex="0">
            <div class="search-item-header">
              <span class="search-item-title">${highlightMatches(p.title, trimmed)}</span>
              <span class="search-item-badge badge-project">Project</span>
            </div>
            <p class="search-item-snippet">${highlightMatches(p.snippet, trimmed)}</p>
            ${
              p.tags && p.tags.length > 0
                ? `<div class="search-item-tags">
                    ${p.tags.slice(0, 4).map((t) => `<span class="search-mini-tag">${highlightMatches(t, trimmed)}</span>`).join('')}
                   </div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  html += `
    <div class="search-dropdown-footer">
      <span>Found ${totalResults} result${totalResults === 1 ? '' : 's'}</span>
      <span class="search-shortcuts-hint">
        <kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close
      </span>
    </div>
  `;

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');

  // Attach click listeners to result items
  dropdown.querySelectorAll('.search-result-item').forEach((item) => {
    item.addEventListener('click', () => {
      const type = item.getAttribute('data-type');
      if (type === 'post') {
        const slug = item.getAttribute('data-slug');
        window.location.hash = `#post/${slug}`;
      } else if (type === 'project') {
        const url = item.getAttribute('data-url');
        if (url && url !== '#') {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
      closeSearchDropdown();
    });
  });
}

function setupSearchListener() {
  const searchInput = document.getElementById('site-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const dropdown = document.getElementById('search-results-dropdown');
  const wrapper = document.querySelector('.search-input-wrapper');

  if (!searchInput) return;

  // Preload search index in background
  loadSearchIndex();

  // Input typing with debounce
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeSearch(e.target.value);
    }, 100);
  });

  // Re-open dropdown on focus if input has text
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length > 0) {
      executeSearch(searchInput.value);
    }
  });

  // Keyboard navigation inside dropdown
  let selectedIndex = -1;
  searchInput.addEventListener('keydown', (e) => {
    if (!dropdown || dropdown.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        clearSearch();
        searchInput.blur();
      }
      return;
    }

    const items = dropdown.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelectedItem(items, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelectedItem(items, selectedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].click();
      } else if (items.length > 0) {
        items[0].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeSearchDropdown();
      searchInput.blur();
    }
  });

  function updateSelectedItem(items, idx) {
    items.forEach((it, i) => {
      if (i === idx) {
        it.classList.add('search-item-selected');
        it.scrollIntoView({ block: 'nearest' });
      } else {
        it.classList.remove('search-item-selected');
      }
    });
  }

  // Clear button click
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSearch();
    });
  }

  // Click outside to close dropdown
  document.addEventListener('click', (e) => {
    if (wrapper && !wrapper.contains(e.target)) {
      closeSearchDropdown();
    }
  });

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, or /)
  document.addEventListener('keydown', (e) => {
    const isEditing =
      ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
      document.activeElement?.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === '/' && !isEditing) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

function applySearchFilter() {
  const searchInput = document.getElementById('site-search-input');
  if (!searchInput) return;
  const query = searchInput.value.toLowerCase().trim();

  const items = document.querySelectorAll('.list-item, .card');
  items.forEach((item) => {
    const text = item.innerText.toLowerCase();
    if (!query || text.includes(query)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// Universal Clipboard Copy helper with fallback
async function copyToClipboard(text) {
  // Method 1: Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback...', err);
    }
  }

  // Method 2: Fallback textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.error('execCommand copy error:', err);
  }

  return false;
}

// SHARE ARTICLE & TOAST SYSTEM
async function handleShareClick(slug) {
  const shareBtn = document.getElementById('share-btn');
  const cleanOrigin = window.location.origin;
  const cleanPath = window.location.pathname.replace(/\/+$/, '');
  const url = `${cleanOrigin}${cleanPath}/#post/${slug}`;

  const success = await copyToClipboard(url);

  if (success) {
    showToast('Link copied to clipboard! 📋');
    if (shareBtn) {
      const originalHtml = shareBtn.innerHTML;
      shareBtn.innerHTML = '✅ Copied!';
      shareBtn.classList.add('copied');
      setTimeout(() => {
        shareBtn.innerHTML = originalHtml;
        shareBtn.classList.remove('copied');
      }, 2500);
    }
  } else {
    prompt('Copy this post link:', url);
    showToast('Link opened in prompt');
  }
}

// showToast imported from ./utils.js

// MOBILE DRAWER NAVIGATION
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  });
}

// ARTICLE VIEW COUNTER
async function incrementAndFetchViews(slug) {
  const viewCountEl = document.getElementById('view-count');
  if (!viewCountEl) return;

  let localViews = parseInt(localStorage.getItem(`views_${slug}`) || '0', 10) + 1;
  localStorage.setItem(`views_${slug}`, localViews);
  viewCountEl.innerText = localViews;

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc('increment_view', { post_slug: slug });
      if (!error && typeof data === 'number') {
        viewCountEl.innerText = data;
        localStorage.setItem(`views_${slug}`, data);
        return;
      }
    } catch (err) {
      console.warn('Supabase views notice:', err.message);
    }
  }

  if (API_BASE_URL) {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/comments/views/${slug}`, { method: 'POST' }, 2500);
      if (res.ok) {
        const data = await res.json();
        if (typeof data.views === 'number') {
          viewCountEl.innerText = data.views;
          localStorage.setItem(`views_${slug}`, data.views);
        }
      }
    } catch (err) {
      // Local fallback is already shown
    }
  }
}

// ==========================================
// SPA ROUTER: Hash-based Route Management
// ==========================================
function handleRouting() {
  const hash = window.location.hash || '#home';

  if (hash.startsWith('#post/')) {
    const slug = hash.replace('#post/', '');
    openPost(slug);
    updateActiveNav(null);
  } else if (hash === '#about') {
    showView(viewAbout);
    fetchAboutContent();
    updateActiveNav('nav-about');
  } else if (hash === '#blog' || hash === '#blogs') {
    showView(viewBlogs);
    fetchAndRenderPosts('life', 'all-blogs-container');
    updateActiveNav('nav-blog');
  } else if (hash === '#articles') {
    showView(viewArticles);
    fetchAndRenderPosts('technical', 'all-articles-container');
    updateActiveNav('nav-articles');
  } else if (hash === '#projects') {
    showView(viewProjects);
    fetchAndRenderProjects('all-projects-container');
    updateActiveNav('nav-projects');
  } else {
    showView(viewHome);
    fetchAndRenderPosts('life', 'latest-blogs-container', 5);
    fetchAndRenderPosts('technical', 'latest-articles-container', 5);
    fetchAndRenderProjects('latest-projects-container', 4);
  }
}

// Smooth scrolling for in-article section anchor links (Table of Contents)
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const href = anchor.getAttribute('href');
  if (!href || href === '#') return;

  const spaRoutes = ['#home', '#about', '#blog', '#blogs', '#articles', '#projects'];
  const isSpaRoute = spaRoutes.includes(href) || href.startsWith('#post/');

  if (!isSpaRoute) {
    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

// ==========================================
// 8. EMAIL SUBSCRIPTION LOGIC
// ==========================================
function setupSubscribeForm(formElement) {
  if (!formElement || formElement.dataset.bound === 'true') return;
  formElement.dataset.bound = 'true';

  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = formElement.querySelector('.subscribe-input');
    const submitBtn = formElement.querySelector('.subscribe-btn');
    const statusEl = formElement.querySelector('.subscribe-status');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (statusEl) {
        statusEl.className = 'form-status subscribe-status error';
        statusEl.textContent = 'Please enter a valid email address.';
      }
      return;
    }

    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>Subscribe</span>';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Subscribing...</span>';
    }
    if (statusEl) {
      statusEl.className = 'form-status subscribe-status';
      statusEl.textContent = '';
    }

    try {
      let respMsg = "You're subscribed! You'll be notified of new posts.";
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // 1. Try Supabase
      if (supabase) {
        try {
          const { error } = await supabase.from('subscribers').insert([
            {
              email: email,
              unsubscribe_token: token,
            },
          ]);
          if (error && error.code === '23505') {
            respMsg = "You're already subscribed! Stay tuned for updates.";
          }
        } catch (subErr) {
          console.warn('Supabase subscription notice, using local cache:', subErr.message);
        }
      } else {
        // 2. Try API Gateway
        const endpoint = API_BASE_URL ? `${API_BASE_URL}/api/subscribers` : '/api/subscribers';
        try {
          const response = await fetchWithTimeout(
            endpoint,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            },
            3000
          );

          const data = await response.json().catch(() => ({}));
          if (response.ok && data.message) {
            respMsg = data.message;
          }
        } catch (netErr) {
          console.warn('Backend subscriber API offline, storing subscription locally:', netErr.message);
        }
      }

      // Persist locally so user is never blocked or told an error when attempting to subscribe
      const localSubs = JSON.parse(localStorage.getItem('blog_subscribers') || '[]');
      if (!localSubs.includes(email)) {
        localSubs.push(email);
        localStorage.setItem('blog_subscribers', JSON.stringify(localSubs));
      }

      if (statusEl) {
        statusEl.className = 'form-status subscribe-status success';
        statusEl.textContent = respMsg;
      }
      if (submitBtn) {
        submitBtn.innerHTML = '<span>Subscribed ✓</span>';
      }
      if (emailInput) {
        emailInput.value = '';
      }
      if (typeof showToast === 'function') {
        showToast('Subscribed successfully! 🎉');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      if (statusEl) {
        statusEl.className = 'form-status subscribe-status error';
        statusEl.textContent = err.message || 'Something went wrong. Please try again.';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
}

function initAllSubscribeForms() {
  document.querySelectorAll('.subscribe-form').forEach(setupSubscribeForm);
}

window.addEventListener('hashchange', () => {
  handleRouting();
  setTimeout(initAllSubscribeForms, 50);
});

document.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  initAllSubscribeForms();
  if (typeof setupSearchListener === 'function') {
    setupSearchListener();
  }
  if (typeof setupMobileDrawer === 'function') {
    setupMobileDrawer();
  }
});