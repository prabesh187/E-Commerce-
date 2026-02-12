import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

/**
 * CSRF Protection Integration Tests
 * 
 * Validates: Requirements 18.6
 * Tests CSRF token generation and validation across the API
 */

describe('CSRF Protection Integration', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('CSRF Token Endpoint', () => {
    it('should provide CSRF token via /api/csrf-token', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('csrfToken');
      expect(typeof response.body.data.csrfToken).toBe('string');
      expect(response.body.data.csrfToken.length).toBeGreaterThan(0);
    });

    it('should return same token for same session', async () => {
      const agent = request.agent(app);

      const response1 = await agent
        .get('/api/csrf-token')
        .expect(200);

      const token1 = response1.body.data.csrfToken;

      const response2 = await agent
        .get('/api/csrf-token')
        .expect(200);

      const token2 = response2.body.data.csrfToken;

      expect(token1).toBe(token2);
    });
  });

  describe('CSRF Validation on State-Changing Operations', () => {
    it('should allow GET requests without CSRF token', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject POST requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_CSRF_TOKEN');
      expect(response.body.error).toHaveProperty('message', 'Invalid or missing CSRF token');
    });

    it('should reject POST requests with invalid CSRF token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-CSRF-Token', 'invalid-token-12345')
        .send({
          email: 'test@example.com',
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_CSRF_TOKEN');
    });

    it('should accept POST requests with valid CSRF token', async () => {
      const agent = request.agent(app);

      // Get CSRF token
      const tokenResponse = await agent
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;

      // Make POST request with token
      const response = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
        });

      // Should not be rejected by CSRF (may fail for other reasons like validation)
      expect(response.status).not.toBe(403);
      if (response.status === 403) {
        expect(response.body.error?.code).not.toBe('INVALID_CSRF_TOKEN');
      }
    });

    it('should reject PUT requests without CSRF token', async () => {
      const response = await request(app)
        .put('/api/cart/123')
        .send({ quantity: 2 })
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INVALID_CSRF_TOKEN');
    });

    it('should reject DELETE requests without CSRF token', async () => {
      const response = await request(app)
        .delete('/api/cart/123')
        .expect(403);

      expect(response.body.error).toHaveProperty('code', 'INVALID_CSRF_TOKEN');
    });
  });

  describe('CSRF Token Sources', () => {
    it('should accept CSRF token from X-CSRF-Token header', async () => {
      const agent = request.agent(app);

      const tokenResponse = await agent.get('/api/csrf-token');
      const csrfToken = tokenResponse.body.data.csrfToken;

      const response = await agent
        .post('/api/auth/register')
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: `test-header-${Date.now()}@example.com`,
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
        });

      expect(response.status).not.toBe(403);
      if (response.status === 403) {
        expect(response.body.error?.code).not.toBe('INVALID_CSRF_TOKEN');
      }
    });

    it('should accept CSRF token from csrf-token header', async () => {
      const agent = request.agent(app);

      const tokenResponse = await agent.get('/api/csrf-token');
      const csrfToken = tokenResponse.body.data.csrfToken;

      const response = await agent
        .post('/api/auth/register')
        .set('csrf-token', csrfToken)
        .send({
          email: `test-alt-header-${Date.now()}@example.com`,
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
        });

      expect(response.status).not.toBe(403);
      if (response.status === 403) {
        expect(response.body.error?.code).not.toBe('INVALID_CSRF_TOKEN');
      }
    });

    it('should accept CSRF token from request body', async () => {
      const agent = request.agent(app);

      const tokenResponse = await agent.get('/api/csrf-token');
      const csrfToken = tokenResponse.body.data.csrfToken;

      const response = await agent
        .post('/api/auth/register')
        .send({
          email: `test-body-${Date.now()}@example.com`,
          password: 'Test1234',
          name: 'Test User',
          role: 'buyer',
          csrfToken,
        });

      expect(response.status).not.toBe(403);
      if (response.status === 403) {
        expect(response.body.error?.code).not.toBe('INVALID_CSRF_TOKEN');
      }
    });
  });
});
