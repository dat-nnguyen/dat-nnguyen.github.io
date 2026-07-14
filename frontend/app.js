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

// 2. Navigation Router Logic (Starter)
const navBlog = document.getElementById('nav-blog');
const inlineNavBlog = document.getElementById('inline-nav-blog');

function navigateToBlog(event) {
  if (event) event.preventDefault();
  document
    .getElementById('section-blogs')
    .scrollIntoView({ behavior: 'smooth' });
}

navBlog.addEventListener('click', navigateToBlog);
inlineNavBlog.addEventListener('click', navigateToBlog);

// 3. Mock Data Fetcher (Demonstrating List vs Grid layout)
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

// 2. Grab your button
const themeBtn = document.getElementById('theme-toggle');

themeBtn.innerHTML = sunIcon;

themeBtn.addEventListener('click', () => {
  // Toggle the class on the body
  document.body.classList.toggle('light-theme');

  // Check if it has the class now
  if (document.body.classList.contains('light-theme')) {
    // We are in Light Mode -> Show Moon Icon
    themeBtn.innerHTML = moonIcon;
    // Bonus: Save to local storage here!
  } else {
    themeBtn.innerHTML = sunIcon;
    // Bonus: Save to local storage here!
  }
});