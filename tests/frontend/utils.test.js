import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  organizeCommentThreads,
  getCommenterSession,
  saveCommenterSession,
  clearCommenterSession,
} from '../../frontend/utils.js';

describe('Frontend Utilities (utils.js)', () => {
  describe('formatDate', () => {
    it('should format ISO date strings into English readable format', () => {
      expect(formatDate('2026-09-23T00:00:00.000Z')).toBe('September 23, 2026');
      expect(formatDate('2024-01-01')).toBe('January 1, 2024');
    });

    it('should handle falsy values gracefully', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should return original string when date is invalid', () => {
      expect(formatDate('invalid-date-format')).toBe('invalid-date-format');
    });
  });

  describe('escapeHtml', () => {
    it('should escape all special HTML characters', () => {
      expect(escapeHtml('<script>alert("xss & fun")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss &amp; fun&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml("it's cool")).toBe('it&#039;s cool');
    });

    it('should return empty string for null/undefined/empty', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should strip HTML tags and return clean text content', () => {
      expect(stripHtml('<p>Hello <strong>World</strong>!</p>')).toBe('Hello World!');
      expect(stripHtml('No tags here')).toBe('No tags here');
      expect(stripHtml('')).toBe('');
      expect(stripHtml(null)).toBe('');
    });
  });

  describe('highlightMatches', () => {
    it('should wrap matching search terms in mark tags', () => {
      const text = 'Full Stack Engineering with PostgreSQL and Vue';
      const highlighted = highlightMatches(text, 'Stack PostgreSQL');

      expect(highlighted).toContain('<mark class="search-highlight">Stack</mark>');
      expect(highlighted).toContain('<mark class="search-highlight">PostgreSQL</mark>');
    });

    it('should return escaped text when query is empty or whitespace', () => {
      const text = 'Plain text <b>bold</b>';
      expect(highlightMatches(text, '')).toBe('Plain text &lt;b&gt;bold&lt;/b&gt;');
      expect(highlightMatches(text, '   ')).toBe('Plain text &lt;b&gt;bold&lt;/b&gt;');
    });

    it('should handle special regex characters in query safely', () => {
      const text = 'Price is $100 (USD) [discount]';
      const highlighted = highlightMatches(text, '$100 (USD)');
      expect(highlighted).toContain('<mark class="search-highlight">$100</mark>');
    });
  });

  describe('extractSnippet', () => {
    it('should return snippet centered around matching search query', () => {
      const longText = 'Introductory sentence. The quick brown fox jumps over the lazy dog in the sunny meadow during summer.';
      const snippet = extractSnippet(longText, 'fox jumps', 50);

      expect(snippet).toContain('fox jumps');
      expect(snippet.length).toBeLessThanOrEqual(60);
    });

    it('should truncate and return beginning when no match is found', () => {
      const longText = 'A'.repeat(200);
      const snippet = extractSnippet(longText, 'nonexistent', 50);
      expect(snippet.length).toBe(53); // 50 + '...'
      expect(snippet.endsWith('...')).toBe(true);
    });

    it('should handle empty input', () => {
      expect(extractSnippet('', 'query')).toBe('');
      expect(extractSnippet(null, 'query')).toBe('');
    });
  });

  describe('md5 hash implementation', () => {
    it('should compute standard MD5 hashes correctly', () => {
      // Standard MD5 vectors
      expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
      expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
      expect(md5('user@example.com')).toBe('b58996c504c5638798eb6b511e6f49af');
    });

    it('should trim and lowercase input string automatically', () => {
      expect(md5('  Hello  ')).toBe(md5('hello'));
    });
  });

  describe('Avatar URLs', () => {
    it('getGravatarUrl should construct gravatar link with md5 hash', () => {
      const url = getGravatarUrl('test@example.com');
      expect(url).toContain('https://www.gravatar.com/avatar/');
      expect(url).toContain('d=identicon');
    });

    it('getAvatarUrl should prioritize email unavatar with ui-avatars fallback', () => {
      const withEmail = getAvatarUrl('dat@example.com', 'Dat Nguyen');
      expect(withEmail).toContain('https://unavatar.io/');
      expect(withEmail).toContain('ui-avatars.com');

      const withoutEmail = getAvatarUrl('', 'Dat Nguyen');
      expect(withoutEmail).toContain('https://ui-avatars.com/api/?name=Dat%20Nguyen');

      const defaultAnon = getAvatarUrl(null, null);
      expect(defaultAnon).toContain('Anonymous');
    });
  });

  describe('showToast', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="toast-container"></div>';
      vi.useFakeTimers();
    });

    it('should create and animate toast inside toast-container', () => {
      showToast('Comment submitted successfully!', 2000);

      const toast = document.querySelector('#toast-container .toast');
      expect(toast).not.toBeNull();
      expect(toast.innerText).toBe('Comment submitted successfully!');

      // Fast-forward initial show animation
      vi.advanceTimersByTime(20);
      expect(toast.classList.contains('show')).toBe(true);

      // Fast-forward duration
      vi.advanceTimersByTime(2000);
      expect(toast.classList.contains('show')).toBe(false);

      // Fast-forward fadeout removal
      vi.advanceTimersByTime(350);
      expect(document.querySelector('#toast-container .toast')).toBeNull();
    });

    it('should do nothing if toast-container is missing', () => {
      document.body.innerHTML = '';
      expect(() => showToast('Missing container')).not.toThrow();
    });
  });

  describe('organizeCommentThreads', () => {
    it('should return empty array for non-array or empty input', () => {
      expect(organizeCommentThreads(null)).toEqual([]);
      expect(organizeCommentThreads(undefined)).toEqual([]);
      expect(organizeCommentThreads([])).toEqual([]);
    });

    it('should organize root comments and attach replies appropriately', () => {
      const input = [
        { id: 1, author_name: 'Alice', content: 'Root 1', created_at: '2026-09-01T10:00:00Z' },
        { id: 2, author_name: 'Bob', content: 'Reply to Root 1', parent_id: 1, created_at: '2026-09-01T10:05:00Z' },
        { id: 3, author_name: 'Charlie', content: 'Reply to Bob', parent_id: 2, created_at: '2026-09-01T10:10:00Z' },
        { id: 4, author_name: 'Dave', content: 'Root 2', created_at: '2026-09-01T11:00:00Z' },
      ];

      const threads = organizeCommentThreads(input);
      expect(threads).toHaveLength(2);

      // Root 1 checks
      expect(threads[0].id).toBe(1);
      expect(threads[0].replies).toHaveLength(2);
      expect(threads[0].replies[0].id).toBe(2);
      expect(threads[0].replies[0].replyingToName).toBe('Alice');
      expect(threads[0].replies[1].id).toBe(3);
      expect(threads[0].replies[1].replyingToName).toBe('Bob');

      // Root 2 checks
      expect(threads[1].id).toBe(4);
      expect(threads[1].replies).toHaveLength(0);
    });

    it('should handle orphaned replies gracefully by putting them in roots', () => {
      const input = [
        null,
        { content: 'No id' },
        { id: 10, author_name: 'Ghost', content: 'Missing parent', parent_id: 9999 },
      ];
      const threads = organizeCommentThreads(input);
      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe(10);
    });
  });

  describe('Commenter Session Management', () => {
    it('should save, get, and clear commenter session from storage', () => {
      const store = {};
      const mockStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
      };

      // Initially empty
      expect(getCommenterSession(mockStorage)).toEqual({ name: '', email: '' });

      // Save
      saveCommenterSession('Dat Nguyen', 'dat@example.com', mockStorage);
      expect(getCommenterSession(mockStorage)).toEqual({
        name: 'Dat Nguyen',
        email: 'dat@example.com',
      });

      // Clear
      clearCommenterSession(mockStorage);
      expect(getCommenterSession(mockStorage)).toEqual({ name: '', email: '' });
    });

    it('should handle missing storage, empty strings, or exceptions gracefully', () => {
      expect(getCommenterSession(null)).toEqual({ name: '', email: '' });
      expect(() => saveCommenterSession('Test', 'test@test.com', null)).not.toThrow();
      expect(() => saveCommenterSession('', '   ', null)).not.toThrow();
      expect(() => clearCommenterSession(null)).not.toThrow();

      const throwingStorage = {
        getItem: () => { throw new Error('Security Error'); },
        setItem: () => { throw new Error('Quota Exceeded'); },
        removeItem: () => { throw new Error('Storage Fault'); },
      };

      expect(getCommenterSession(throwingStorage)).toEqual({ name: '', email: '' });
      expect(() => saveCommenterSession('Alice', 'alice@test.com', throwingStorage)).not.toThrow();
      expect(() => clearCommenterSession(throwingStorage)).not.toThrow();
    });
  });
});
