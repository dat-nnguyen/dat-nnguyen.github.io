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
const viewAbout = document.getElementById('view-about');
const viewPost = document.getElementById('view-post');
const backToHome = document.getElementById('back-to-home');
const postDetailContainer = document.getElementById('post-detail-container');

function showView(targetView) {
  viewHome.classList.add('hidden');
  viewAbout.classList.add('hidden');
  viewPost.classList.add('hidden');

  targetView.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// Navigate to Home
navHome.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewHome);
});

if (backToHome) {
  backToHome.addEventListener('click', (e) => {
    e.preventDefault();
    showView(viewHome);
  });
}

const birthday = new Date('2006-11-19').getTime();
const ageElement = document.getElementById('age-counter');

if (ageElement) {
  setInterval(() => {
    const now = Date.now();
    const ageInMs = now - birthday;
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);
    ageElement.innerText = ageInYears.toFixed(9);
  }, 50);
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

navAbout.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewAbout);
  fetchAboutContent();
});

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
    `;
  } catch (error) {
    console.error('Failed to open post:', error);
    postDetailContainer.innerHTML = `<p class="loading-text" style="color: #ff6b6b;">Failed to load article.</p>`;
  }
}

// Attach event listener for clicking post links dynamically
document.addEventListener('click', (e) => {
  const link = e.target.closest('.post-link');
  if (link) {
    e.preventDefault();
    const slug = link.getAttribute('data-slug');
    if (slug) {
      openPost(slug);
    }
  }
});

// The generic fetcher
async function fetchAndRenderPosts(category, containerId) {
  const container = document.getElementById(containerId);

  try {
    const response = await fetch(`/api/posts?category=${category}`);
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
                    <a href="#" class="post-link" data-slug="${post.slug}">${post.title}</a>
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

// Call this as soon as the app loads!
fetchAndRenderPosts('life', 'latest-blogs-container');
fetchAndRenderPosts('technical', 'latest-articles-container');