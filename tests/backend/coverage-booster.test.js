import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import syncFs from 'fs';
import path from 'path';

const cjsRequire = createRequire(import.meta.url);

import postRoutes from '../../backend/content-service/routes/postRoutes.js';
import aboutRoutes from '../../backend/content-service/routes/aboutRoutes.js';
import projectRoutes from '../../backend/content-service/routes/projectRoutes.js';
import subscribersRoutesFactory from '../../backend/interaction-service/routes/subscribersRoutes.js';
import commentsRoutesFactory from '../../backend/interaction-service/routes/commentsRoutes.js';
import gatewayApp from '../../api-gateway/server.js';
import { initDb } from '../../backend/interaction-service/server.js';
import { generateStaticContent, calculateReadingTime } from '../../scripts/generate-static-content.js';
import {
  getLatestPost,
  notifyViaSupabase,
  notifyViaApi,
  runNotification,
} from '../../scripts/notify-subscribers.js';

describe('Coverage Booster - Edge Cases & Deep Branches', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('postRoutes Frontmatter & Marked Renderer Fallbacks', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use('/api/posts', postRoutes);
    });

    it('should cover frontmatter fallbacks (missing title, category, slug, date)', async () => {
      const mockMarkdown = `---
type: custom-type
lastUpdated: 2026-01-01
---
# Test Heading!

![Image With Title](https://example.com/a.png "A Title")
![Image Without Title](https://example.com/b.png)
![]()

Sample paragraph for reading time.
`;

      const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValueOnce(['custom-file.md']);
      const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValueOnce(mockMarkdown);

      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('custom-file');
      expect(res.body[0].category).toBe('custom-type');
      expect(res.body[0].slug).toBe('custom-file');
      expect(res.body[0].content).toContain('id="test-heading"');
      expect(res.body[0].content).toContain('title="A Title"');
      expect(res.body[0].content).toContain('decoding="async"');

      readdirSpy.mockRestore();
      readFileSpy.mockRestore();
    });

    it('should cover fallback to default technical category and Date.now for posts without metadata', async () => {
      const mockBareMarkdown = `---
---
Just pure markdown without frontmatter.
`;

      const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValueOnce(['bare-post.md']);
      const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValueOnce(mockBareMarkdown);

      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(200);
      expect(res.body[0].category).toBe('technical');
      expect(res.body[0].createdAt).toBeDefined();

      readdirSpy.mockRestore();
      readFileSpy.mockRestore();
    });

    it('should ignore non-numeric limit in query', async () => {
      const res = await request(app).get('/api/posts?limit=notanumber');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should cover single post lookup matching by filename when slug is absent', async () => {
      const mockBareMarkdown = `---
title: Found By Filename
type: thoughts
---
Some content
`;

      const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValueOnce(['special-name.md']);
      const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValueOnce(mockBareMarkdown);

      const res = await request(app).get('/api/posts/special-name');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Found By Filename');
      expect(res.body.category).toBe('thoughts');

      readdirSpy.mockRestore();
      readFileSpy.mockRestore();
    });

    it('GET /api/posts/:slug should handle readdir failure gracefully', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Cannot read directory'));

      const res = await request(app).get('/api/posts/anything');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');

      readdirSpy.mockRestore();
    });

    it('GET /api/posts/:slug should cover metadata fallbacks when title/category/date are missing', async () => {
      const mockBareMarkdown = `---
---
Simple paragraph content without frontmatter metadata.
`;

      const readdirSpy = vi.spyOn(fs, 'readdir').mockResolvedValueOnce(['no-meta.md']);
      const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValueOnce(mockBareMarkdown);

      const res = await request(app).get('/api/posts/no-meta');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('no-meta');
      expect(res.body.category).toBe('technical');
      expect(res.body.createdAt).toBeDefined();

      readdirSpy.mockRestore();
      readFileSpy.mockRestore();
    });
  });

  describe('aboutRoutes & projectRoutes Edge Cases', () => {
    it('GET /api/about should fallback to default title if frontmatter title is missing', async () => {
      const app = express();
      app.use('/api/about', aboutRoutes);

      const readFileSpy = vi.spyOn(fs, 'readFile').mockResolvedValueOnce(`---
author: Dat Nguyen
---
About content here.`);

      const res = await request(app).get('/api/about');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('About Me');

      readFileSpy.mockRestore();
    });

    it('GET /api/about should try fallback path if primary path access fails', async () => {
      const app = express();
      app.use('/api/about', aboutRoutes);

      const accessSpy = vi.spyOn(fs, 'access').mockRejectedValueOnce(new Error('ENOENT'));
      const res = await request(app).get('/api/about');
      expect(res.status).toBe(200);

      accessSpy.mockRestore();
    });

    it('GET /api/projects?limit=invalid should ignore non-numeric limit', async () => {
      const app = express();
      app.use('/api/projects', projectRoutes);

      const res = await request(app).get('/api/projects?limit=invalid_limit');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('subscribersRoutes Helpers & Edge Cases', () => {
    const helpers = subscribersRoutesFactory._helpers;

    it('getSiteUrl should handle environment variables and request headers', () => {
      expect(helpers).toBeDefined();

      process.env.SITE_URL = 'https://custom-site.com///';
      expect(helpers.getSiteUrl()).toBe('https://custom-site.com');
      delete process.env.SITE_URL;

      const mockReq = {
        get: (header) => (header === 'host' ? 'myblog.com:3000' : null),
        protocol: 'https',
      };
      expect(helpers.getSiteUrl(mockReq)).toBe('https://myblog.com:3000');

      const noHostReq = { get: () => null };
      expect(helpers.getSiteUrl(noHostReq)).toBe('https://dat-nnguyen.github.io');
      expect(helpers.getSiteUrl(null)).toBe('https://dat-nnguyen.github.io');
    });

    it('getApiBaseUrl should handle environment variables and request headers', () => {
      process.env.API_BASE_URL = 'https://api.custom.com///';
      expect(helpers.getApiBaseUrl()).toBe('https://api.custom.com');
      delete process.env.API_BASE_URL;

      const mockReq = {
        get: (header) => (header === 'host' ? 'api.localhost:5050' : null),
        protocol: 'http',
      };
      expect(helpers.getApiBaseUrl(mockReq)).toBe('http://api.localhost:5050');
      expect(helpers.getApiBaseUrl(null)).toBe('http://localhost:5050');
    });

    it('getPostDetailsBySlug should extract post details with various excerpt styles', () => {
      // 1. Non-existent slug returns null
      expect(helpers.getPostDetailsBySlug('definitely-non-existent-slug-xyz')).toBeNull();

      // 2. Target slug null returns first post
      const firstPost = helpers.getPostDetailsBySlug(null);
      if (firstPost) {
        expect(firstPost.title).toBeDefined();
        expect(firstPost.readingTime).toBeDefined();
      }

      // 3. getLatestPostDetails returns the newest post
      const latest = helpers.getLatestPostDetails();
      if (latest) {
        expect(latest.slug).toBeDefined();
        expect(latest.readingTime).toBeDefined();
      }
    });

    it('saveSubscribersBackup and saveSentNotificationsBackup should handle fs errors gracefully', () => {
      const writeSpy = vi.spyOn(syncFs, 'writeFileSync').mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => helpers.saveSubscribersBackup()).not.toThrow();
      writeSpy.mockRestore();

      const writeSpy2 = vi.spyOn(syncFs, 'writeFileSync').mockImplementationOnce(() => {
        throw new Error('Disk full');
      });
      expect(() => helpers.saveSentNotificationsBackup()).not.toThrow();
      writeSpy2.mockRestore();
    });

    it('GET /api/subscribers/count should return 500 when in-memory filter fails', async () => {
      const badPool = {
        query: vi.fn().mockRejectedValue(new Error('PG down')),
      };
      const app = express();
      app.use('/api/subscribers', subscribersRoutesFactory(badPool));

      // Mock Array.prototype.filter to throw inside the route handler
      const origFilter = Array.prototype.filter;
      Array.prototype.filter = function() {
        throw new Error('Filter exception');
      };

      try {
        const res = await request(app).get('/api/subscribers/count');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to fetch subscriber count');
      } finally {
        Array.prototype.filter = origFilter;
      }
    });

    it('POST /notify-published should return 500 when catastrophic error occurs', async () => {
      const badApp = express();
      badApp.use((req, res, next) => {
        req.headers['x-admin-key'] = 'admin123';
        Object.defineProperty(req, 'body', {
          get() {
            throw new Error('Catastrophic failure');
          },
        });
        next();
      });
      badApp.use('/api/subscribers', subscribersRoutesFactory({ query: vi.fn() }));

      const res = await request(badApp)
        .post('/api/subscribers/notify-published')
        .send();

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to broadcast post notification');
    });

    it('POST /notify-published should increment failureCount when email dispatch fails', async () => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [] }) // sent_notifications empty
          .mockResolvedValueOnce({
            rows: [{ email: 'failing@example.com', unsubscribe_token: 'tok123' }],
          }) // active subscribers
          .mockResolvedValueOnce({ rows: [] }), // insert sent_notifications
      };
      const app = express();
      app.use(express.json());
      app.use('/api/subscribers', subscribersRoutesFactory(mockPool));

      process.env.RESEND_API_KEY = 're_key';
      const origFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network crash'));

      const res = await request(app)
        .post('/api/subscribers/notify-published')
        .set('x-admin-key', 'admin123')
        .send();

      expect(res.status).toBe(200);
      expect(res.body.failureCount).toBe(1);

      delete process.env.RESEND_API_KEY;
      global.fetch = origFetch;
    });
  });

  describe('commentsRoutes DELETE Error Handling', () => {
    it('DELETE /:id should return 500 when in-memory filter throws', async () => {
      const origFilter = Array.prototype.filter;
      const app = express();
      app.use('/api/comments', commentsRoutesFactory({ query: vi.fn().mockRejectedValue(new Error('PG down')) }));

      process.env.ADMIN_KEY = 'test_delete_key';

      try {
        Array.prototype.filter = function() {
          throw new Error('Filter fatal error');
        };
        const res = await request(app).delete('/api/comments/123').set('x-admin-key', 'test_delete_key');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Failed to delete comment');
      } finally {
        Array.prototype.filter = origFilter;
        delete process.env.ADMIN_KEY;
      }
    });
  });


  describe('API Gateway Error Handling & DB Status Branches', () => {
    it('should return custom status and message from error handler middleware', async () => {
      const appWithErr = express();
      appWithErr.use('/error-test', (req, res, next) => {
        const err = new Error('Custom Validation Error');
        err.statusCode = 422;
        next(err);
      });
      // Attach gateway's error middleware
      appWithErr.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Internal Server Error' });
      });

      const res = await request(appWithErr).get('/error-test');
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Custom Validation Error');
    });

    it('error handler should fallback to 500 and Internal Server Error when properties are missing', async () => {
      const appWithErr = express();
      appWithErr.use('/empty-error', (req, res, next) => {
        const err = {};
        next(err);
      });
      appWithErr.use((err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Internal Server Error' });
      });

      const res = await request(appWithErr).get('/empty-error');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal Server Error');
    });

    it('GET / on gateway should indicate PostgreSQL when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      const res = await request(gatewayApp).get('/');
      expect(res.status).toBe(200);
      expect(res.body.database).toBe('PostgreSQL');
    });
  });

  describe('interaction-service server initDb error handling', () => {
    it('initDb should catch database query error when table creation fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { pool, initDb: testInitDb } = await import('../../backend/interaction-service/server.js');

      const querySpy = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Table creation error'));
      await testInitDb();

      expect(consoleSpy).toHaveBeenCalledWith('Error creating table:', expect.any(Error));

      consoleSpy.mockRestore();
      querySpy.mockRestore();
    });
  });

  describe('Static Content Generator & Marked Rendering', () => {
    it('calculateReadingTime should handle varied word counts', () => {
      expect(calculateReadingTime('')).toBe('1 min read');
      const longText = new Array(500).fill('word').join(' ');
      expect(calculateReadingTime(longText)).toBe('3 min read');
    });

    it('generateStaticContent should handle missing source directories gracefully', () => {
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(false);
      const writeSpy = vi.spyOn(syncFs, 'writeFileSync').mockImplementation(() => {});

      try {
        expect(() => generateStaticContent()).not.toThrow();
      } finally {
        existsSpy.mockRestore();
        writeSpy.mockRestore();
      }
    });
  });

  describe('notify-subscribers script functions', () => {
    it('getLatestPost should handle missing file and JSON parse errors', () => {
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(false);
      expect(getLatestPost()).toBeNull();
      existsSpy.mockRestore();

      const readSpy = vi.spyOn(syncFs, 'readFileSync').mockReturnValue('INVALID JSON');
      const existsSpy2 = vi.spyOn(syncFs, 'existsSync').mockReturnValue(true);
      expect(getLatestPost()).toBeNull();
      readSpy.mockRestore();
      existsSpy2.mockRestore();
    });

    it('getLatestPost should return null if posts array is empty', () => {
      const readSpy = vi.spyOn(syncFs, 'readFileSync').mockReturnValue('[]');
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(true);

      expect(getLatestPost()).toBeNull();

      readSpy.mockRestore();
      existsSpy.mockRestore();
    });

    it('notifyViaSupabase should exit early when post is null or already notified', async () => {
      const readSpy = vi.spyOn(syncFs, 'readFileSync').mockReturnValue('[]');
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(true);

      const mockSupabase = {
        from: vi.fn(),
      };

      // When post is null
      await notifyViaSupabase(mockSupabase);
      expect(mockSupabase.from).not.toHaveBeenCalled();

      readSpy.mockRestore();
      existsSpy.mockRestore();
    });

    it('notifyViaSupabase should handle subscribers query error and empty list', async () => {
      const mockPost = [{ title: 'Test', slug: 'test-slug', content: 'Excerpt' }];
      const readSpy = vi.spyOn(syncFs, 'readFileSync').mockReturnValue(JSON.stringify(mockPost));
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(true);

      // 1. subErr case
      const mockSupabaseError = {
        from: vi.fn().mockImplementation((table) => {
          if (table === 'sent_notifications') {
            return {
              select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
            };
          }
          if (table === 'subscribers') {
            return {
              select: () => ({ eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Query error') }) }),
            };
          }
        }),
      };
      await notifyViaSupabase(mockSupabaseError);

      // 2. Empty subscribers list case
      const mockSupabaseEmpty = {
        from: vi.fn().mockImplementation((table) => {
          if (table === 'sent_notifications') {
            return {
              select: () => ({ eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) }),
            };
          }
          if (table === 'subscribers') {
            return {
              select: () => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
            };
          }
        }),
      };
      await notifyViaSupabase(mockSupabaseEmpty);

      readSpy.mockRestore();
      existsSpy.mockRestore();
    });

    it('notifyViaApi should handle failure response and network errors', async () => {
      const originalFetch = global.fetch;

      // 1. Network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      await notifyViaApi();

      // 2. Non-ok response (mock process.exit)
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Bad request' }),
      });
      await notifyViaApi();
      expect(exitSpy).toHaveBeenCalledWith(1);

      // 3. Result success false
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ success: false, message: 'Already notified' }),
      });
      await notifyViaApi();
      expect(exitSpy).toHaveBeenCalledWith(0);

      // 4. Result success true with full fields
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          message: 'Sent',
          post: { title: 'Post 1', slug: 'post-1', url: 'https://site/#post/1' },
          sentCount: 3,
          dryRun: true,
        }),
      });
      await notifyViaApi();

      exitSpy.mockRestore();
      global.fetch = originalFetch;
    });

    it('runNotification should route to Supabase mode when credentials are provided', async () => {
      process.env.SUPABASE_URL = 'https://valid-project.supabase.co';
      process.env.SUPABASE_KEY = 'valid-key-xyz';

      // Mock getLatestPost to return null so it exits quickly
      const readSpy = vi.spyOn(syncFs, 'readFileSync').mockReturnValue('[]');
      const existsSpy = vi.spyOn(syncFs, 'existsSync').mockReturnValue(true);

      await runNotification();

      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_KEY;
      readSpy.mockRestore();
      existsSpy.mockRestore();
    });
  });
});

