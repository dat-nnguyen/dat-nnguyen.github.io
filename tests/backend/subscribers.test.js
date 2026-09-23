import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import subscribersRoutesFactory from '../../backend/interaction-service/routes/subscribersRoutes.js';

describe('Subscribers Routes & Notification Broadcast', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    const subFile = path.join(__dirname, '../../backend/interaction-service/subscribers.json');
    const notifFile = path.join(__dirname, '../../backend/interaction-service/sent_notifications.json');
    try { fs.writeFileSync(subFile, '[]\n', 'utf-8'); } catch {}
    try { fs.writeFileSync(notifFile, '[]\n', 'utf-8'); } catch {}
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
      app.use('/api/subscribers', subscribersRoutesFactory(mockPool));
    });

    it('POST /api/subscribers should reject missing or invalid email', async () => {
      const resEmpty = await request(app).post('/api/subscribers').send({});
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error).toContain('Email address is required');

      const resInvalid = await request(app).post('/api/subscribers').send({ email: 'not-an-email' });
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error).toContain('valid email address');

      const resTooLong = await request(app)
        .post('/api/subscribers')
        .send({ email: `${'a'.repeat(250)}@example.com` });
      expect(resTooLong.status).toBe(400);
      expect(resTooLong.body.error).toContain('valid email address');
    });

    it('POST /api/subscribers should subscribe new email in PostgreSQL and return 201', async () => {
      // Existing subscriber check returns empty
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // INSERT

      const res = await request(app)
        .post('/api/subscribers')
        .send({ email: 'newbie@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Thank you for subscribing');
    });

    it('POST /api/subscribers should return 200 if subscriber is already active', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ email: 'active@example.com', is_active: true }],
      });

      const res = await request(app)
        .post('/api/subscribers')
        .send({ email: 'active@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("You're already subscribed");
    });

    it('POST /api/subscribers should reactivate previously unsubscribed email', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ email: 'inactive@example.com', is_active: false }],
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      const res = await request(app)
        .post('/api/subscribers')
        .send({ email: 'inactive@example.com' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/subscribers/unsubscribe should handle missing token with error page', async () => {
      const res = await request(app).get('/api/subscribers/unsubscribe');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Invalid or Expired Link');
    });

    it('GET /api/subscribers/unsubscribe should unsubscribe with valid token in database', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ email: 'unsub@example.com' }],
      });

      const res = await request(app).get('/api/subscribers/unsubscribe?token=valid_token_123');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Unsubscribed Successfully');
      expect(res.text).toContain('unsub@example.com');
    });

    it('GET /api/subscribers/count should return active count from PostgreSQL', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '128' }],
      });

      const res = await request(app).get('/api/subscribers/count');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 128 });
    });

    it('GET /api/subscribers/status should return comprehensive diagnostic info', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const res = await request(app).get('/api/subscribers/status');
      expect(res.status).toBe(200);
      expect(res.body.isDatabaseConnected).toBe(true);
      expect(res.body.activeSubscribers).toBe(10);
      expect(res.body.sentNotificationsCount).toBe(5);
      expect(res.body.storage).toContain('PostgreSQL');
    });

    describe('Broadcast Notifications (/api/subscribers/notify-published)', () => {
      it('should require Admin Key authentication', async () => {
        const res = await request(app).post('/api/subscribers/notify-published').send();
        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Unauthorized');
      });

      it('should return 404 when requested slug does not exist in posts', async () => {
        const res = await request(app)
          .post('/api/subscribers/notify-published')
          .set('x-admin-key', 'admin123')
          .send({ slug: 'non-existent-blog-slug-9999' });

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found in markdown posts');
      });

      it('should broadcast notification to active subscribers and return 200', async () => {
        // Mock checking sent_notifications -> not yet sent
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // SELECT sent_notifications
          .mockResolvedValueOnce({
            // SELECT subscribers
            rows: [
              { email: 'reader1@example.com', unsubscribe_token: 'token1' },
              { email: 'reader2@example.com', unsubscribe_token: 'token2' },
            ],
          })
          .mockResolvedValueOnce({ rows: [] }); // INSERT sent_notifications

        const res = await request(app)
          .post('/api/subscribers/notify-published')
          .set('x-admin-key', 'admin123')
          .send();

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.sentCount).toBe(2);
        expect(res.body.post).toBeDefined();
        expect(res.body.post.title).toBeDefined();
      });

      it('should skip sending if post was already notified and force is false', async () => {
        mockPool.query.mockResolvedValueOnce({
          rows: [{ post_slug: 'some-slug' }],
        });

        const res = await request(app)
          .post('/api/subscribers/notify-published')
          .set('x-admin-key', 'admin123')
          .send({ force: false });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('has already been notified');
      });

      it('should handle zero active subscribers gracefully', async () => {
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // sent_notifications
          .mockResolvedValueOnce({ rows: [] }); // zero subscribers

        const res = await request(app)
          .post('/api/subscribers/notify-published')
          .set('x-admin-key', 'admin123')
          .send();

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.sentCount).toBe(0);
      });
    });
  });

  describe('In-Memory / Fallback Scenarios', () => {
    let failingPool;
    let app;

    beforeEach(() => {
      failingPool = {
        query: vi.fn().mockRejectedValue(new Error('PostgreSQL unavailable')),
      };
      app = express();
      app.use(express.json());
      app.use('/api/subscribers', subscribersRoutesFactory(failingPool));
    });

    it('POST /api/subscribers should save subscriber in memory when PostgreSQL is down', async () => {
      const email = `offline-${Date.now()}@example.com`;
      const res = await request(app).post('/api/subscribers').send({ email });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Duplicate attempt should return 200
      const resDup = await request(app).post('/api/subscribers').send({ email });
      expect(resDup.status).toBe(200);
      expect(resDup.body.message).toContain("You're already subscribed");
    });

    it('GET /api/subscribers/unsubscribe should unsubscribe in-memory when PG is down', async () => {
      const email = `unsub-mem-${Date.now()}@example.com`;
      await request(app).post('/api/subscribers').send({ email });

      // Unsubscribe with a dummy token (returns invalid or processes match)
      const res = await request(app).get('/api/subscribers/unsubscribe?token=non_existent_token');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Invalid or Expired Link');
    });

    it('GET /api/subscribers/count should return in-memory count when PG query fails', async () => {
      const res = await request(app).get('/api/subscribers/count');
      expect(res.status).toBe(200);
      expect(typeof res.body.count).toBe('number');
    });

    it('GET /api/subscribers/status should report In-Memory fallback diagnostic', async () => {
      const res = await request(app).get('/api/subscribers/status');
      expect(res.status).toBe(200);
      expect(res.body.isDatabaseConnected).toBe(false);
      expect(res.body.storage).toContain('In-Memory');
    });

    it('POST /api/subscribers should handle unexpected internal error with 500', async () => {
      const badApp = express();
      badApp.use((req, res, next) => {
        Object.defineProperty(req, 'body', {
          get() {
            throw new Error('Fatal body crash');
          },
        });
        next();
      });
      badApp.use('/api/subscribers', subscribersRoutesFactory(failingPool));

      const res = await request(badApp).post('/api/subscribers').send();
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Failed to process subscription');
    });

    it('POST /api/subscribers/notify-published in-memory should fallback to in-memory sent notifications', async () => {
      const res = await request(app)
        .post('/api/subscribers/notify-published')
        .set('x-admin-key', 'admin123')
        .send({ force: true });

      expect(res.status).toBe(200);
    });

    it('should respect custom SITE_URL and API_BASE_URL env vars in URLs', async () => {
      process.env.SITE_URL = 'https://custom-site.example.com/';
      process.env.API_BASE_URL = 'https://custom-api.example.com/';

      const email = `env-check-${Date.now()}@example.com`;
      const res = await request(app).post('/api/subscribers').send({ email });
      expect(res.status).toBe(201);
    });
  });
});
