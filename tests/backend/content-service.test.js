import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

import postRoutes from '../../backend/content-service/routes/postRoutes.js';
import aboutRoutes from '../../backend/content-service/routes/aboutRoutes.js';
import projectRoutes from '../../backend/content-service/routes/projectRoutes.js';
import app from '../../backend/content-service/server.js';

describe('Content Service Routes & Server', () => {
  describe('Full Content Service App', () => {
    it('should be configured with json and cors middleware and route endpoints', async () => {
      const res = await request(app).get('/api/posts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Post Routes (/api/posts)', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.use('/api/posts', postRoutes);
    });

    it('GET /api/posts should return a list of all markdown posts with parsed content', async () => {
      const res = await request(testApp).get('/api/posts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const firstPost = res.body[0];
      expect(firstPost).toHaveProperty('title');
      expect(firstPost).toHaveProperty('category');
      expect(firstPost).toHaveProperty('slug');
      expect(firstPost).toHaveProperty('createdAt');
      expect(firstPost).toHaveProperty('readingTime');
      expect(firstPost).toHaveProperty('content');
      expect(firstPost.readingTime).toMatch(/\d+ min read/);
    });

    it('GET /api/posts?category=... should filter posts by category case-insensitively', async () => {
      const resAll = await request(testApp).get('/api/posts');
      const sampleCategory = resAll.body[0]?.category || 'technical';

      const resFiltered = await request(testApp).get(`/api/posts?category=${sampleCategory.toUpperCase()}`);
      expect(resFiltered.status).toBe(200);
      expect(Array.isArray(resFiltered.body)).toBe(true);
      resFiltered.body.forEach((p) => {
        expect(p.category.toLowerCase()).toBe(sampleCategory.toLowerCase());
      });
    });

    it('GET /api/posts?limit=... should limit results to the specified integer', async () => {
      const res = await request(testApp).get('/api/posts?limit=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);

      // Invalid limit should be ignored
      const resInvalid = await request(testApp).get('/api/posts?limit=invalid');
      expect(resInvalid.status).toBe(200);
      expect(resInvalid.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/posts/:slug should return a single post by matching slug', async () => {
      const allRes = await request(testApp).get('/api/posts');
      const target = allRes.body[0];

      const res = await request(testApp).get(`/api/posts/${target.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.title).toBe(target.title);
      expect(res.body.slug).toBe(target.slug);
      expect(res.body.content).toBeTruthy();
    });

    it('GET /api/posts/:slug should return 404 for nonexistent post', async () => {
      const res = await request(testApp).get('/api/posts/this-slug-does-not-exist-12345');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Post not found' });
    });

    it('GET /api/posts should handle directory reading error gracefully', async () => {
      const readdirSpy = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Simulated disk error'));

      const res = await request(testApp).get('/api/posts');
      // If readdir catches and sets files = [], it returns an empty array with 200
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);

      readdirSpy.mockRestore();
    });

    it('GET /api/posts should return 500 when matter or marked throws an unexpected exception', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Fatal unreadable file'));

      const res = await request(testApp).get('/api/posts');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal Server Error' });

      readFileSpy.mockRestore();
    });

    it('GET /api/posts/:slug should return 500 when reading file throws unexpected exception', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Fatal unreadable file'));

      const res = await request(testApp).get('/api/posts/some-slug');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal Server Error' });

      readFileSpy.mockRestore();
    });

    it('should test candidate directory search fallback in getPostsDir', async () => {
      let callCount = 0;
      const accessSpy = vi.spyOn(fs, 'access').mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) throw new Error('Not found');
        return true;
      });

      const res = await request(testApp).get('/api/posts');
      expect(res.status).toBe(200);
      accessSpy.mockRestore();
    });
  });

  describe('About Routes (/api/about)', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.use('/api/about', aboutRoutes);
    });

    it('GET /api/about should return the bio HTML and title', async () => {
      const res = await request(testApp).get('/api/about');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('content');
      expect(typeof res.body.content).toBe('string');
    });

    it('GET /api/about should return fallback bio with 500 on filesystem error', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('File missing'));

      const res = await request(testApp).get('/api/about');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        title: 'About Me',
        content: '<p>Bio is currently being updated...</p>',
      });

      readFileSpy.mockRestore();
    });

    it('GET /api/about should fallback to second path candidate when first fails fs.access', async () => {
      let callCount = 0;
      const accessSpy = vi.spyOn(fs, 'access').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('First path not accessible');
        return true;
      });

      const res = await request(testApp).get('/api/about');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      accessSpy.mockRestore();
    });
  });

  describe('Project Routes (/api/projects)', () => {
    let testApp;

    beforeEach(() => {
      testApp = express();
      testApp.use(express.json());
      testApp.use('/api/projects', projectRoutes);
    });

    it('GET /api/projects should return all projects', async () => {
      const res = await request(testApp).get('/api/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/projects?limit=1 should return limited projects', async () => {
      const res = await request(testApp).get('/api/projects?limit=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);

      // Non-numeric limit should be ignored
      const resNaN = await request(testApp).get('/api/projects?limit=abc');
      expect(resNaN.status).toBe(200);
      expect(resNaN.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/projects should return 500 when reading file fails', async () => {
      const readFileSpy = vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('File not accessible'));

      const res = await request(testApp).get('/api/projects');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal Server Error' });

      readFileSpy.mockRestore();
    });
  });
});
