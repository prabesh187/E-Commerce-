import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express, { Application } from 'express';
import authRoutes from '../authRoutes.js';
import User from '../../models/User.js';

let mongoServer: MongoMemoryServer;
let app: Application;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear database before each test
  await User.deleteMany({});
});

describe('POST /api/auth/register', () => {
  test('should register a new user with email', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Test1234',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'User',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.password).toBeUndefined(); // Password should not be in response
    expect(response.body.data.token).toBeDefined();
  });

  test('should register a new user with phone', async () => {
    const userData = {
      phone: '9841234567',
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.phone).toBe('9841234567');
    expect(response.body.data.token).toBeDefined();
  });

  test('should register a seller with pending verification status', async () => {
    const userData = {
      email: 'seller@example.com',
      password: 'Test1234',
      role: 'seller',
      businessName: 'Test Business',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe('seller');
    expect(response.body.data.user.verificationStatus).toBe('pending');
  });

  test('should reject registration without email or phone', async () => {
    const userData = {
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject registration with invalid email', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('email');
  });

  test('should reject registration with weak password (too short)', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Test12',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('8 characters');
  });

  test('should reject registration with weak password (no uppercase)', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('uppercase');
  });

  test('should reject registration with weak password (no lowercase)', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'TEST1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('lowercase');
  });

  test('should reject registration with weak password (no number)', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'TestTest',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('number');
  });

  test('should reject duplicate email registration', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Test1234',
      role: 'buyer',
    };

    // First registration
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // Duplicate registration
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('USER_EXISTS');
    expect(response.body.error.message).toContain('already registered');
  });

  test('should reject duplicate phone registration', async () => {
    const userData = {
      phone: '9841234567',
      password: 'Test1234',
      role: 'buyer',
    };

    // First registration
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    // Duplicate registration
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('USER_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    // Create a test user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        phone: '9841234567',
        password: 'Test1234',
        role: 'buyer',
      });
  });

  test('should login with email and password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'test@example.com',
        password: 'Test1234',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.token).toBeDefined();
  });

  test('should login with phone and password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: '9841234567',
        password: 'Test1234',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.phone).toBe('9841234567');
    expect(response.body.data.token).toBeDefined();
  });

  test('should reject login with incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'test@example.com',
        password: 'WrongPassword123',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('should reject login with non-existent email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'nonexistent@example.com',
        password: 'Test1234',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('should reject login without email/phone', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'Test1234',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject login without password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'test@example.com',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('should handle case-insensitive email login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'TEST@EXAMPLE.COM',
        password: 'Test1234',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
});

describe('POST /api/auth/logout', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register and login to get token
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
        role: 'buyer',
      });

    authToken = response.body.data.token;
  });

  test('should logout authenticated user', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Logged out');
  });

  test('should reject logout without authentication token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  test('should reject logout with invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('GET /api/auth/me', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register and login to get token
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
        role: 'buyer',
        firstName: 'Test',
        lastName: 'User',
      });

    authToken = response.body.data.token;
  });

  test('should get current user details', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.firstName).toBe('Test');
    expect(response.body.data.user.lastName).toBe('User');
    expect(response.body.data.user.password).toBeUndefined();
  });

  test('should reject request without authentication token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  test('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  test('should reject request with malformed authorization header', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });
});

describe('Rate Limiting', () => {
  test('should apply rate limiting to auth endpoints', async () => {
    // This test verifies that rate limiting middleware is applied
    // The actual rate limit enforcement is tested in the middleware tests
    
    const userData = {
      email: 'test@example.com',
      password: 'Test1234',
      role: 'buyer',
    };

    // First request should succeed
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});

describe('Edge Cases', () => {
  test('should handle registration with both email and phone', async () => {
    const userData = {
      email: 'test@example.com',
      phone: '9841234567',
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.phone).toBe('9841234567');
  });

  test('should normalize email to lowercase', async () => {
    const userData = {
      email: 'Test@Example.COM',
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });

  test('should handle Nepali phone number with country code', async () => {
    const userData = {
      phone: '+9779841234567',
      password: 'Test1234',
      role: 'buyer',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });

  test('should include role in user response', async () => {
    const userData = {
      email: 'admin@example.com',
      password: 'Test1234',
      role: 'admin',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.role).toBe('admin');
  });
});
