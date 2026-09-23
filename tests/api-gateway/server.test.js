import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../../api-gateway/server.js';

describe('API Gateway Server', () => {

  it('GET / should return gateway root status with endpoints listing', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.platform).toBe('Railway');
    expect(res.body.status).toBe('online');
    expect(Array.isArray(res.body.endpoints)).toBe(true);
    expect(res.body.endpoints).toContain('/health');
    expect(res.body.endpoints).toContain('/api/posts');
  });

  it('GET /health should return 200 ok with uptime and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('API Gateway');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /unknown-route-12345 should return 404 Not Found', async () => {
    const res = await request(app).get('/unknown-route-12345');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });

  it('Mounted routes /api/posts and /api/about should respond via gateway', async () => {
    const resPosts = await request(app).get('/api/posts');
    expect(resPosts.status).toBe(200);
    expect(Array.isArray(resPosts.body)).toBe(true);

    const resAbout = await request(app).get('/api/about');
    expect(resAbout.status).toBe(200);
    expect(resAbout.body).toHaveProperty('title');
  });

  it('Mounted routes /api/comments/storage/status and /api/subscribers/status should respond', async () => {
    const resComments = await request(app).get('/api/comments/storage/status');
    expect(resComments.status).toBe(200);
    expect(resComments.body).toHaveProperty('storage');

    const resSubscribers = await request(app).get('/api/subscribers/status');
    expect(resSubscribers.status).toBe(200);
    expect(resSubscribers.body).toHaveProperty('service');
  });

  it('should handle JSON parse error via global error handler', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Content-Type', 'application/json')
      .send('{"bad_json: missing_brace');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  describe('Proxy and Database URL Environment Configurations', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should configure proxy middleware when CONTENT_SERVICE_URL and INTERACTION_SERVICE_URL are set', async () => {
      vi.resetModules();
      process.env.CONTENT_SERVICE_URL = 'http://localhost:5001';
      process.env.INTERACTION_SERVICE_URL = 'http://localhost:5002';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      const gatewayModule = await import('../../api-gateway/server.js');
      const proxyApp = gatewayModule.default || gatewayModule;

      const res = await request(proxyApp).get('/health');
      expect(res.status).toBe(200);

      const rootRes = await request(proxyApp).get('/');
      expect(rootRes.status).toBe(200);
      expect(rootRes.body.database).toBe('PostgreSQL');
    });
  });
});
