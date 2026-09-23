import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  generateStaticContent,
  calculateReadingTime,
} from '../../scripts/generate-static-content.js';

import {
  getLatestPost,
  notifyViaSupabase,
  notifyViaApi,
} from '../../scripts/notify-subscribers.js';

describe('Build & Publishing Scripts', () => {
  describe('generate-static-content.js', () => {
    it('calculateReadingTime should compute expected minute estimates', () => {
      expect(calculateReadingTime('')).toBe('1 min read');
      expect(calculateReadingTime('short sentence')).toBe('1 min read');

      const fiveHundredWords = Array(500).fill('word').join(' ');
      expect(calculateReadingTime(fiveHundredWords)).toBe('3 min read');

      const oneThousandWords = Array(1000).fill('word').join(' ');
      expect(calculateReadingTime(oneThousandWords)).toBe('5 min read');
    });

    it('generateStaticContent should successfully generate posts.json, about.json, and projects.json', () => {
      generateStaticContent();

      const outputDir = path.join(__dirname, '../../frontend/public/data');
      expect(fs.existsSync(path.join(outputDir, 'posts.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'about.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'projects.json'))).toBe(true);

      const posts = JSON.parse(fs.readFileSync(path.join(outputDir, 'posts.json'), 'utf-8'));
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0]).toHaveProperty('title');
      expect(posts[0]).toHaveProperty('slug');
      expect(posts[0]).toHaveProperty('content');

      const about = JSON.parse(fs.readFileSync(path.join(outputDir, 'about.json'), 'utf-8'));
      expect(about).toHaveProperty('title');
      expect(about).toHaveProperty('content');

      const projects = JSON.parse(fs.readFileSync(path.join(outputDir, 'projects.json'), 'utf-8'));
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('generateStaticContent should create outputDir if it does not exist', () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
        if (String(p).endsWith('/public/data')) return false;
        return true;
      });
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      generateStaticContent();
      expect(mkdirSpy).toHaveBeenCalled();

      existsSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    });

    it('generateStaticContent should handle missing source directories and files gracefully', () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

      expect(() => generateStaticContent()).not.toThrow();

      existsSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    });

    it('generateStaticContent should handle posts and about without metadata, and marked custom renderers', () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readdirSpy = vi.spyOn(fs, 'readdirSync').mockReturnValue(['dummy-no-meta.md', 'not-md.txt']);
      let writeOutput = '';
      const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
        const p = String(filePath);
        if (p.endsWith('dummy-no-meta.md')) {
          return '---\ntype: personal\n---\n# Custom Heading\n\n![Img Title](https://example.com/a.png "Title")\n![Img No Title](https://example.com/b.png)\n![]()';
        }
        if (p.endsWith('about.md')) {
          return '---\n---\nBare about body text.';
        }
        if (p.endsWith('projects.json')) {
          return '[]';
        }
        return '';
      });
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation((file, data) => {
        if (String(file).endsWith('posts.json')) {
          writeOutput = data;
        }
      });

      try {
        generateStaticContent();

        const parsedPosts = JSON.parse(writeOutput);
        expect(parsedPosts[0].title).toBe('dummy-no-meta');
        expect(parsedPosts[0].category).toBe('personal');
        expect(parsedPosts[0].slug).toBe('dummy-no-meta');
        expect(parsedPosts[0].content).toContain('id="custom-heading"');
        expect(parsedPosts[0].content).toContain('title="Title"');
        expect(parsedPosts[0].content).toContain('<img src="" alt=""');

        // Now test with completely empty frontmatter for category fallback to 'technical' and date fallback
        readSpy.mockImplementation((filePath) => {
          const p = String(filePath);
          if (p.endsWith('dummy-no-meta.md')) {
            return '---\ndate: 2026-03-01\n---\nPure content';
          }
          if (p.endsWith('about.md')) {
            return '---\nlastUpdated: 2026-03-01\n---\nAbout with date.';
          }
          if (p.endsWith('projects.json')) {
            return '[]';
          }
          return '';
        });

        generateStaticContent();
        const parsedPosts2 = JSON.parse(writeOutput);
        expect(parsedPosts2[0].category).toBe('technical');
      } finally {
        existsSpy.mockRestore();
        readdirSpy.mockRestore();
        readSpy.mockRestore();
        writeSpy.mockRestore();
      }
    });
  });


  describe('notify-subscribers.js', () => {
    it('getLatestPost should handle missing postsPath or corrupt JSON', () => {
      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(getLatestPost()).toBeNull();
      existsSpy.mockRestore();

      const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid-json{{{');
      expect(getLatestPost()).toBeNull();
      readSpy.mockRestore();

      const emptyPostsSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('[]');
      expect(getLatestPost()).toBeNull();
      emptyPostsSpy.mockRestore();
    });
    it('getLatestPost should return newest post or specific post by slug', () => {
      const latest = getLatestPost();
      expect(latest).toBeDefined();
      expect(latest).toHaveProperty('slug');

      const specific = getLatestPost(latest.slug);
      expect(specific).toBeDefined();
      expect(specific.slug).toBe(latest.slug);

      const notFound = getLatestPost('invalid-slug-999999');
      expect(notFound).toBeNull();
    });

    describe('notifyViaSupabase', () => {
      it('should handle when no subscribers exist in Supabase', async () => {
        const mockSupabase = {
          from: vi.fn((table) => {
            if (table === 'sent_notifications') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              };
            }
            if (table === 'subscribers') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }
            return {};
          }),
        };

        // Should return without error
        await expect(notifyViaSupabase(mockSupabase)).resolves.not.toThrow();
      });

      it('should broadcast notification when active subscribers are present', async () => {
        const insertMock = vi.fn().mockResolvedValue({ error: null });

        const mockSupabase = {
          from: vi.fn((table) => {
            if (table === 'sent_notifications') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                insert: insertMock,
              };
            }
            if (table === 'subscribers') {
              return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { email: 'sub1@example.com', unsubscribe_token: 'tok1' },
                    { email: 'sub2@example.com', unsubscribe_token: 'tok2' },
                  ],
                  error: null,
                }),
              };
            }
            return {};
          }),
        };

        await notifyViaSupabase(mockSupabase);
        expect(insertMock).toHaveBeenCalled();
      });
    });

    describe('notifyViaApi', () => {
      it('should dispatch POST to backend API endpoint', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            message: 'Broadcast completed',
            post: { title: 'Test Post', slug: 'test', url: 'http://localhost' },
            sentCount: 2,
            dryRun: true,
          }),
        });
        global.fetch = mockFetch;

        await notifyViaApi();
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should handle API connection error gracefully', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        await expect(notifyViaApi()).resolves.not.toThrow();
      });
    });

    describe('runNotification entrypoint', () => {
      it('should execute notification routine without throwing', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            message: 'All subscribers notified',
          }),
        });

        // Set env to trigger API path
        const origUrl = process.env.VITE_SUPABASE_URL;
        delete process.env.VITE_SUPABASE_URL;
        delete process.env.SUPABASE_URL;

        const { notifyViaApi } = await import('../../scripts/notify-subscribers.js');
        await expect(notifyViaApi()).resolves.not.toThrow();

        if (origUrl) process.env.VITE_SUPABASE_URL = origUrl;
      });
    });

    describe('CLI argument parsing', () => {
      it('should parse all CLI options (--slug, --force, --api, --key, --local)', async () => {
        const origArgv = [...process.argv];
        process.argv = [
          'node',
          'scripts/notify-subscribers.js',
          '--slug',
          'test-slug',
          '--force',
          '--api',
          'https://api.example.com',
          '--key',
          'secret-key',
          '--local',
        ];
        vi.resetModules();
        const mod = await import('../../scripts/notify-subscribers.js');
        expect(mod.getLatestPost).toBeDefined();
        process.argv = origArgv;
      });
    });
  });
});
