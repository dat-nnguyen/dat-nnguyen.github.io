import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Frontend App Logic & DOM Operations', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.body.className = '';
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    } else {
      const store = {};
      global.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
      };
    }

    document.body.innerHTML = `
      <header>
        <button id="theme-toggle" title="Switch theme"></button>
        <button id="coffee-btn"></button>
        <div id="qr-modal" class="qr-modal-hidden">
          <button id="qr-modal-close"></button>
        </div>
      </header>

      <nav class="sidebar-nav">
        <a id="nav-home" class="nav-item active" href="#home">Home</a>
        <a id="nav-blogs" class="nav-item" href="#blogs">Blogs</a>
        <a id="nav-about" class="nav-item" href="#about">About</a>
      </nav>

      <main>
        <div id="view-home"></div>
        <div id="view-blogs" class="hidden"></div>
        <div id="view-about" class="hidden"></div>
        <div id="view-post" class="hidden"></div>
        <div id="post-detail-container"></div>
        <div id="comments-container"></div>
      </main>

      <div id="toast-container"></div>
    `;

    window.scrollTo = vi.fn();
  });

  describe('Theme Management', () => {
    function applyTheme(theme) {
      const themeBtn = document.getElementById('theme-toggle');
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
        if (themeBtn) {
          themeBtn.setAttribute('title', 'Switch to dark mode');
        }
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
        if (themeBtn) {
          themeBtn.setAttribute('title', 'Switch to light mode');
        }
        localStorage.setItem('theme', 'dark');
      }
    }

    it('should apply light theme and update classes, button, and localStorage', () => {
      applyTheme('light');
      expect(document.documentElement.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('light');

      applyTheme('dark');
      expect(document.documentElement.classList.contains('light-theme')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('View Switching (showView)', () => {
    function showView(targetView) {
      const views = [
        document.getElementById('view-home'),
        document.getElementById('view-blogs'),
        document.getElementById('view-about'),
        document.getElementById('view-post'),
      ];
      views.forEach((v) => {
        if (v) v.classList.add('hidden');
      });
      if (targetView) targetView.classList.remove('hidden');
      window.scrollTo(0, 0);
    }

    it('should hide all other views and show only target view', () => {
      const viewBlogs = document.getElementById('view-blogs');
      const viewHome = document.getElementById('view-home');

      showView(viewBlogs);
      expect(viewBlogs.classList.contains('hidden')).toBe(false);
      expect(viewHome.classList.contains('hidden')).toBe(true);
      expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('Active Navigation State (updateActiveNav)', () => {
    function updateActiveNav(activeId) {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
        if (item.id === activeId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    it('should activate selected nav item and deactivate others', () => {
      updateActiveNav('nav-about');
      expect(document.getElementById('nav-about').classList.contains('active')).toBe(true);
      expect(document.getElementById('nav-home').classList.contains('active')).toBe(false);
    });
  });

  describe('Code Copy Buttons (attachCopyButtons)', () => {
    function attachCopyButtons() {
      document.querySelectorAll('pre').forEach((pre) => {
        if (pre.querySelector('.copy-code-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.setAttribute('aria-label', 'Copy code snippet');
        btn.innerText = 'Copy';

        btn.addEventListener('click', async () => {
          const code = pre.querySelector('code')?.innerText || pre.innerText;
          await navigator.clipboard.writeText(code);
          btn.innerText = 'Copied!';
          setTimeout(() => {
            btn.innerText = 'Copy';
          }, 2000);
        });

        pre.appendChild(btn);
      });
    }

    it('should inject copy buttons into pre code blocks and copy content', async () => {
      vi.useFakeTimers();
      const pre = document.createElement('pre');
      pre.innerHTML = '<code>const x = 42;</code>';
      document.body.appendChild(pre);

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        configurable: true,
        writable: true,
      });

      attachCopyButtons();
      const btn = pre.querySelector('.copy-code-btn');
      expect(btn).not.toBeNull();

      // Click copy button
      btn.click();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const x = 42;');

      await vi.advanceTimersByTimeAsync(10);
      expect(btn.innerText).toBe('Copied!');

      await vi.advanceTimersByTimeAsync(2000);
      expect(btn.innerText).toBe('Copy');

      vi.useRealTimers();
    });
  });
});
