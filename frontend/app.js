// 1. Coffee Button Toggle Logic
const coffeeBtn = document.getElementById('coffee-btn');
const qrBox = document.getElementById('qr-box');

coffeeBtn.addEventListener('click', () => {
  if (qrBox.classList.contains('qr-hidden')) {
    qrBox.classList.remove('qr-hidden');
    qrBox.classList.add('qr-visible');
  } else {
    qrBox.classList.remove('qr-visible');
    qrBox.classList.add('qr-hidden');
  }
});



document.addEventListener('DOMContentLoaded', () => {
  const blogContainer = document.getElementById('latest-blogs-container');
  const articleContainer = document.getElementById('latest-articles-container');
  const projectContainer = document.getElementById('latest-projects-container');

  // Render Blogs as Flat Lists
  blogContainer.innerHTML = `
        <div class="list-item">
            <span class="date">July 11</span>
            <span class="title"><a href="#">Year in Review: 2025 into 2026</a></span>
        </div>
        <div class="list-item">
            <span class="date">May 04</span>
            <span class="title"><a href="#">The Lore of Don't Starve (an Ode)</a></span>
        </div>
    `;

  // Render Articles as Flat Lists
  articleContainer.innerHTML = `
        <div class="list-item">
            <span class="date">June 15</span>
            <span class="title"><a href="#">Building a Node.js API Gateway from Scratch</a></span>
        </div>
        <div class="list-item">
            <span class="date">April 20</span>
            <span class="title"><a href="#">How to Connect PostgreSQL to Microservices</a></span>
        </div>
    `;

  // Render Projects as Cards
  projectContainer.innerHTML = `
        <div class="card">
            <h3><a href="#">Vanilla SPA Eng,ine</a></h3>
            <p>A zero-framework single page application router built with pure JavaScript.</p>
        </div>
            <div class="card">
            <h3><a href="#">Interaction Service</a></h3>
            <p>A decoupled comments database engine utilizing Node, Express, and PostgreSQL.</p>
        </div>
    `;
});


const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;
const savedTheme = localStorage.getItem('theme');
const themeBtn = document.getElementById('theme-toggle');
if (savedTheme === 'light') {
  document.body.classList.add('light-theme');
  themeBtn.innerHTML = moonIcon;
} else {
  document.body.classList.remove('light-theme');
  themeBtn.innerHTML = sunIcon;
}

themeBtn.addEventListener('click', () => {
  // Toggle the class on the body
  document.body.classList.toggle('light-theme');

  if (document.body.classList.contains('light-theme')) {
    themeBtn.innerHTML = moonIcon;
    localStorage.setItem('theme', 'light');
  } else {
    themeBtn.innerHTML = sunIcon;
    localStorage.setItem('theme', 'dark');
  }
});

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

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://datnguyen.onrender.com';

async function fetchAboutContent() {
  if (isAboutFetched) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/about`);


    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();
    aboutContainer.innerHTML = `<div class="markdown-body">${data.content}</div>`;
    isAboutFetched = true;
  } catch (error) {
    console.error("Failed to fetch bio:", error);
    aboutContainer.innerHTML = `<p class="section-desc" style="color: #ff6b6b;">Error: Could not load bio. Is the backend running?</p>`;
  }
}

function formatDate(dateString) {
  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Fetch single post and display in view-post
async function openPost(slug) {
  showView(viewPost);
  postDetailContainer.innerHTML = `<p class="loading-text">Loading article...</p>`;

  try {
    const response = await fetch(`${API_BASE_URL}/api/posts/${slug}`);

    if (!response.ok) throw new Error('Post not found');

    const post = await response.json();
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
          <button id="share-btn" class="share-btn">
            🔗 Share
          </button>
        </div>
      </article>

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

  try {
    const res = await fetch(`${API_BASE_URL}/api/comments/like/${slug}`);
    if (res.ok) {
      const data = await res.json();
      likeCountEl.innerText = data.likes || 0;
    }
  } catch (err) {
    console.error('Failed to fetch likes:', err);
  }
}

async function handleLikeClick(slug) {
  const likeBtn = document.getElementById('like-btn');
  const likeCountEl = document.getElementById('like-count');

  if (likeBtn) likeBtn.disabled = true;

  const isLiked = localStorage.getItem(`liked_${slug}`) === 'true';
  const action = isLiked ? 'unlike' : 'like';

  try {
    const res = await fetch(`${API_BASE_URL}/api/comments/like/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      const data = await res.json();
      if (likeCountEl) likeCountEl.innerText = data.likes || 0;

      if (isLiked) {
        localStorage.setItem(`liked_${slug}`, 'false');
        if (likeBtn) likeBtn.classList.remove('liked');
      } else {
        localStorage.setItem(`liked_${slug}`, 'true');
        if (likeBtn) likeBtn.classList.add('liked');
      }
    }
  } catch (err) {
    console.error('Failed to update like status:', err);
  } finally {
    if (likeBtn) likeBtn.disabled = false;
  }
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
      try {
        await navigator.clipboard.writeText(code);
        btn.innerText = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerText = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    });
    block.appendChild(btn);
  });
}


async function loadComments(slug) {
  const container = document.getElementById('comments-list-container');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/comments/${slug}`);
    if (!res.ok) throw new Error('Failed to load comments');

    const comments = await res.json();

    if (comments.length === 0) {
      container.innerHTML = `<p class="no-comments-text">No comments yet. Be the first to start the conversation!</p>`;
      return;
    }

    container.innerHTML = comments
      .map((c) => {
        const email = c.author_email || c.authorEmail || '';
        const name = c.author_name || c.authorName || 'Anonymous';
        const avatarUrl = getAvatarUrl(email, name);

        return `
          <div class="comment-card">
            <div class="comment-header">
              <div class="comment-author-box">
                <img src="${avatarUrl}" alt="${escapeHtml(name)}" class="comment-avatar" onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=64b5f6&color=121212&bold=true';" />
                <span class="comment-author">${escapeHtml(name)}</span>
              </div>
              <span class="comment-date">${formatDate(c.created_at || c.createdAt)}</span>
            </div>
            <div class="comment-body">${escapeHtml(c.content)}</div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching comments:', err);
    container.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Could not load comments.</p>`;
  }
}

function getAvatarUrl(email, name) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || 'Anonymous').trim();

  if (cleanEmail) {
    const encodedEmail = encodeURIComponent(cleanEmail);
    const encodedName = encodeURIComponent(cleanName);
    return `https://unavatar.io/${encodedEmail}?fallback=https://ui-avatars.com/api/?name=${encodedName}&background=64b5f6&color=121212&bold=true`;
  }

  const encodedName = encodeURIComponent(cleanName);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=64b5f6&color=121212&bold=true`;
}


function getGravatarUrl(email) {
  const hash = md5(email);
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=80`;
}

function md5(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = lX & 0x80000000;
    lY8 = lY & 0x80000000;
    lX4 = lX & 0x40000000;
    lY4 = lY & 0x40000000;
    lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0;
    var lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue) {
    var WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  var x = Array();
  var k, AA, BB, CC, DD, a, b, c, d;
  var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  var S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  string = (string || '').toLowerCase().trim();
  x = convertToWordArray(string);
  a = 0x67452301; b = 0xefcdab89; c = 0x98badcfe; d = 0x10325476;

  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

    a = addUnsigned(a, AA); b = addUnsigned(b, BB); c = addUnsigned(c, CC); d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}


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

  try {
    const res = await fetch(`${API_BASE_URL}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: slug,
        authorName,
        authorEmail,
        content,
      }),
    });

    if (!res.ok) throw new Error('Submission failed');

    statusEl.innerText = 'Comment posted successfully!';
    statusEl.style.color = '#4cd964';

    authorInput.value = '';
    emailInput.value = '';
    contentInput.value = '';

    setTimeout(() => {
      statusEl.innerText = '';
      loadComments(slug);
    }, 1000);
  } catch (err) {
    console.error('Failed to submit comment:', err);
    statusEl.innerText = 'Failed to post comment. Please try again.';
    statusEl.style.color = '#ff6b6b';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// Fetch posts (with optional limit for homepage sections)
async function fetchAndRenderPosts(category, containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const url = limit
      ? `${API_BASE_URL}/api/posts?category=${category}&limit=${limit}`
      : `${API_BASE_URL}/api/posts?category=${category}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Gateway error');

    const posts = await response.json();

    if (posts.length === 0) {
      container.innerHTML = `<p class="loading-text">No ${category} posts yet.</p>`;
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
  } catch (error) {
    console.error(`Failed to load ${category}:`, error);
    container.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Failed to load posts.</p>`;
  }
}

// Fetch projects dynamically from /api/projects
async function fetchAndRenderProjects(containerId, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const url = limit ? `${API_BASE_URL}/api/projects?limit=${limit}` : `${API_BASE_URL}/api/projects`;
    const response = await fetch(url);

    if (!response.ok) throw new Error('Gateway error');

    const projects = await response.json();

    if (projects.length === 0) {
      container.innerHTML = `<p class="loading-text">No projects yet.</p>`;
      return;
    }

    container.innerHTML = projects
      .map(
        (project) => `
          <div class="card">
              <h3><a href="${project.link || '#'}" target="_blank" rel="noopener noreferrer">${project.title}</a></h3>
              <p>${project.description}</p>
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
  } catch (error) {
    console.error('Failed to load projects:', error);
    container.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Failed to load projects.</p>`;
  }
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

// SHARE ARTICLE & TOAST SYSTEM
async function handleShareClick(slug) {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard! 📋');
  } catch (err) {
    console.error('Failed to copy link:', err);
    showToast('Failed to copy link.');
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

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

  try {
    const res = await fetch(`${API_BASE_URL}/api/comments/views/${slug}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      viewCountEl.innerText = data.views || 1;
    }
  } catch (err) {
    console.error('Failed to update views:', err);
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
    updateActiveNav(null);
  }
}

window.addEventListener('hashchange', handleRouting);


document.addEventListener('DOMContentLoaded', () => {
  handleRouting();
  setupSearchListener();
  setupMobileDrawer();
});