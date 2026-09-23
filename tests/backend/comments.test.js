import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import commentsRoutesFactory from '../../backend/interaction-service/routes/commentsRoutes.js';
import { app as interactionApp, initDb } from '../../backend/interaction-service/server.js';

describe('Comments Routes & Interaction Service', () => {
  describe('Full Interaction Service Server', () => {
    it('GET /api/test should return hello message from interaction service', async () => {
      const res = await request(interactionApp).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Hello from the interaction service!' });
    });

    it('initDb should execute table creation query on pool without throwing', async () => {
      await expect(initDb()).resolves.not.toThrow();
    });
  });

  describe('PostgreSQL Connected Scenarios', () => {
    let mockPool;
    let app;

    beforeEach(() => {
      mockPool = {
        query: vi.fn(),
      };
      app = express();
      app.use(express.json());
      app.use('/api/comments', commentsRoutesFactory(mockPool));
    });

    it('GET /api/comments/storage/status should report PostgreSQL connected when pool query succeeds', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '42' }],
      });

      const res = await request(app).get('/api/comments/storage/status');
      expect(res.status).toBe(200);
      expect(res.body.storage).toBe('PostgreSQL (Persistent)');
      expect(res.body.isDatabaseConnected).toBe(true);
      expect(res.body.totalComments).toBe(42);
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/comments/like/:articleId should return likes count from database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ likes_count: 15 }],
      });

      const res = await request(app).get('/api/comments/like/post-1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ articleId: 'post-1', likes: 15 });
    });

    it('GET /api/comments/like/:articleId should return 0 if no record exists in database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const res = await request(app).get('/api/comments/like/post-empty');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ articleId: 'post-empty', likes: 0 });
    });

    it('POST /api/comments/like/:articleId should increment like in database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ likes_count: 16 }],
      });

      const res = await request(app)
        .post('/api/comments/like/post-1')
        .send({ action: 'like' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ articleId: 'post-1', likes: 16 });
    });

    it('POST /api/comments/like/:articleId should decrement like when action is unlike', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ likes_count: 14 }],
      });

      const res = await request(app)
        .post('/api/comments/like/post-1')
        .send({ action: 'unlike' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ articleId: 'post-1', likes: 14 });
    });

    it('POST /api/comments should validate all required fields', async () => {
      const res = await request(app).post('/api/comments').send({
        articleId: 'test',
        authorName: 'Dat',
        // missing email and content
      });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'All fields are required' });
    });

    it('POST /api/comments should insert new comment in database', async () => {
      const mockCreated = {
        id: 1,
        article_id: 'post-1',
        author_name: 'Alice',
        author_email: 'alice@example.com',
        content: 'Great article!',
        created_at: new Date().toISOString(),
      };
      mockPool.query.mockResolvedValueOnce({
        rows: [mockCreated],
      });

      const res = await request(app).post('/api/comments').send({
        articleId: 'post-1',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        content: 'Great article!',
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual(mockCreated);
    });

    it('GET /api/comments/:articleId should return comments from database', async () => {
      const mockRows = [
        { id: 2, article_id: 'post-1', content: 'Second' },
        { id: 1, article_id: 'post-1', content: 'First' },
      ];
      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
      });

      const res = await request(app).get('/api/comments/post-1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockRows);
    });

    it('DELETE /api/comments/:id should reject unauthorized request without admin key', async () => {
      const res = await request(app).delete('/api/comments/1');
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Unauthorized/);
    });

    it('DELETE /api/comments/:id should delete comment with valid admin key in database', async () => {
      process.env.ADMIN_KEY = 'secret-admin-pass';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, content: 'Deleted comment' }],
      });

      const res = await request(app)
        .delete('/api/comments/1')
        .set('x-admin-key', 'secret-admin-pass');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Comment deleted successfully');
      expect(res.body.deletedComment).toEqual({ id: 1, content: 'Deleted comment' });

      delete process.env.ADMIN_KEY;
    });

    it('DELETE /api/comments/:id should accept admin key via query param or body', async () => {
      process.env.ADMIN_KEY = 'query-pass';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 99 }],
      });

      const res = await request(app).delete('/api/comments/99?adminKey=query-pass');
      expect(res.status).toBe(200);

      delete process.env.ADMIN_KEY;
    });

    it('DELETE /api/comments/:id should accept admin key via body', async () => {
      process.env.ADMIN_KEY = 'body-pass';
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 88 }],
      });

      const res = await request(app)
        .delete('/api/comments/88')
        .send({ adminKey: 'body-pass' });
      expect(res.status).toBe(200);

      delete process.env.ADMIN_KEY;
    });

    it('DELETE /api/comments/:id should return 404 when deleted from PG has empty rows and not in memory', async () => {
      process.env.ADMIN_KEY = 'admin-key';
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const res = await request(app)
        .delete('/api/comments/999999')
        .set('x-admin-key', 'admin-key');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Comment not found');

      delete process.env.ADMIN_KEY;
    });
  });

  describe('In-Memory Fallback Scenarios (when PostgreSQL is down)', () => {
    let failingPool;
    let app;

    beforeEach(() => {
      failingPool = {
        query: vi.fn().mockRejectedValue(new Error('Connection refused')),
      };
      app = express();
      app.use(express.json());
      app.use('/api/comments', commentsRoutesFactory(failingPool));
    });

    it('GET /api/comments/storage/status should report In-Memory fallback', async () => {
      const res = await request(app).get('/api/comments/storage/status');
      expect(res.status).toBe(200);
      expect(res.body.storage).toBe('In-Memory (Ephemeral)');
      expect(res.body.isDatabaseConnected).toBe(false);
    });

    it('GET & POST /api/comments/like/:articleId should use in-memory likes store', async () => {
      const slug = `mem-like-${Date.now()}`;
      // Initial GET
      const res0 = await request(app).get(`/api/comments/like/${slug}`);
      expect(res0.body.likes).toBe(0);

      // Increment
      const res1 = await request(app).post(`/api/comments/like/${slug}`).send({ action: 'like' });
      expect(res1.body.likes).toBe(1);

      // Increment again
      const res2 = await request(app).post(`/api/comments/like/${slug}`).send();
      expect(res2.body.likes).toBe(2);

      // Decrement
      const res3 = await request(app).post(`/api/comments/like/${slug}`).send({ action: 'unlike' });
      expect(res3.body.likes).toBe(1);

      // Decrement again
      const res4 = await request(app).post(`/api/comments/like/${slug}`).send({ action: 'unlike' });
      expect(res4.body.likes).toBe(0);

      // Decrement clamped at 0
      const res5 = await request(app).post(`/api/comments/like/${slug}`).send({ action: 'unlike' });
      expect(res5.body.likes).toBe(0);
    });

    it('POST & GET & DELETE /api/comments should persist and delete in-memory comments', async () => {
      process.env.ADMIN_KEY = 'test-admin';
      const slug = `mem-post-${Date.now()}`;

      // POST new comment
      const postRes = await request(app).post('/api/comments').send({
        articleId: slug,
        authorName: 'Bob',
        authorEmail: 'bob@example.com',
        content: 'Fallback comment',
      });
      expect(postRes.status).toBe(201);
      const createdId = postRes.body.id;
      expect(createdId).toBeDefined();

      // GET comments for slug
      const getRes = await request(app).get(`/api/comments/${slug}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(getRes.body.find((c) => c.id === createdId)).toBeDefined();

      // DELETE in-memory comment
      const delRes = await request(app)
        .delete(`/api/comments/${createdId}`)
        .set('x-admin-key', 'test-admin');
      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toMatch(/in-memory/);

      // DELETE non-existent comment returns 404
      const notFoundRes = await request(app)
        .delete(`/api/comments/999999999`)
        .set('x-admin-key', 'test-admin');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body).toEqual({ error: 'Comment not found' });

      delete process.env.ADMIN_KEY;
    });

    it('should return 500 when catch-all triggers on corrupted request body', async () => {
      const corruptApp = express();
      corruptApp.use((req, res, next) => {
        // Mock getter throwing error
        Object.defineProperty(req, 'body', {
          get() {
            throw new Error('Fatal body parse error');
          },
        });
        next();
      });
      corruptApp.use('/api/comments', commentsRoutesFactory(failingPool));

      const res = await request(corruptApp).post('/api/comments').send();
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Failed to create comment' });
    });
  });
});
