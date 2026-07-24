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

async function fetchAboutContent() {
  if (isAboutFetched) return;

  try {
    const response = await fetch('/api/about');

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
    const response = await fetch(`/api/posts/${slug}`);
    if (!response.ok) throw new Error('Post not found');

    const post = await response.json();
    postDetailContainer.innerHTML = `
      <article class="post-detail">
        <header class="post-header">
          <h1 class="post-title">${post.title}</h1>
          <div class="post-meta">
            <span class="post-date">${formatDate(post.createdAt)}</span> &bull; 
            <span class="post-category">${post.category}</span>
          </div>
        </header>
        <hr class="post-divider" />
        <div class="markdown-body">
          ${post.content}
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

async function loadComments(slug) {
  const container = document.getElementById('comments-list-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/comments/${slug}`);
    if (!res.ok) throw new Error('Failed to load comments');

    const comments = await res.json();

    if (comments.length === 0) {
      container.innerHTML = `<p class="no-comments-text">No comments yet. Be the first to start the conversation!</p>`;
      return;
    }

    container.innerHTML = comments
      .map(
        (c) => `
          <div class="comment-card">
            <div class="comment-header">
              <span class="comment-author">👤 ${escapeHtml(c.author_name || c.authorName)}</span>
              <span class="comment-date">${formatDate(c.created_at || c.createdAt)}</span>
            </div>
            <div class="comment-body">${escapeHtml(c.content)}</div>
          </div>
        `,
      )
      .join('');
  } catch (err) {
    console.error('Error fetching comments:', err);
    container.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Could not load comments.</p>`;
  }
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
    const res = await fetch('/api/comments', {
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
      ? `/api/posts?category=${category}&limit=${limit}`
      : `/api/posts?category=${category}`;

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
                <span class="date">${formatDate(post.createdAt)}</span>
                <span class="title">
                    <a href="#post/${post.slug}" class="post-link" data-slug="${post.slug}">${post.title}</a>
                </span>
            </div>
        `,
      )
      .join('');
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
    const url = limit ? `/api/projects?limit=${limit}` : '/api/projects';
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
          </div>
        `,
      )
      .join('');
  } catch (error) {
    console.error('Failed to load projects:', error);
    container.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Failed to load projects.</p>`;
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
});