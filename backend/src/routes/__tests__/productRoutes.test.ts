import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../server.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import { userService } from '../../services/UserService.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

describe('Product Routes - Image Upload', () => {
  let mongoServer: MongoMemoryServer;
  let sellerToken: string;
  let sellerId: string;
  let buyerToken: string;
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;
  const testUploadDir = 'test-uploads';

  // Create a test image buffer
  const createTestImageBuffer = async (): Promise<Buffer> => {
    return await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
  };

  beforeAll(async () => {
    // Disconnect any existing mongoose connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set test upload directory
    const { config } = await import('../../config/env.js');
    config.upload.uploadDir = testUploadDir;

    // Create test upload directory
    try {
      await fs.mkdir(testUploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Create test users
    const sellerResult = await userService.register({
      email: 'seller@test.com',
      password: 'Test1234',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
    });

    // Approve seller
    await User.findByIdAndUpdate(sellerResult.user._id, {
      verificationStatus: 'approved',
    });

    sellerId = sellerResult.user._id.toString();
    sellerToken = userService.generateToken(sellerId, 'seller');

    const buyerResult = await userService.register({
      email: 'buyer@test.com',
      password: 'Test1234',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });

    buyerToken = userService.generateToken(buyerResult.user._id.toString(), 'buyer');

    // Create agent to maintain session
    agent = request.agent(app);
    
    // Get CSRF token using the agent
    const csrfResponse = await agent.get('/api/csrf-token');
    csrfToken = csrfResponse.body.data.csrfToken;
  });

  afterAll(async () => {
    // Clean up test upload directory
    try {
      const files = await fs.readdir(testUploadDir);
      for (const file of files) {
        await fs.unlink(path.join(testUploadDir, file));
      }
      await fs.rmdir(testUploadDir);
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }

    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up products and test files
    await Product.deleteMany({});

    try {
      const files = await fs.readdir(testUploadDir);
      for (const file of files) {
        await fs.unlink(path.join(testUploadDir, file));
      }
    } catch (error) {
      // Directory might be empty
    }
  });

  describe('POST /api/products/upload-image', () => {
    test('should upload and optimize single image', async () => {
      const imageBuffer = await createTestImageBuffer();

      const response = await agent
        .post('/api/products/upload-image')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .attach('image', imageBuffer, 'test-image.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.original).toBeDefined();
      expect(response.body.data.original.url).toContain('/uploads/');
      expect(response.body.data.original.width).toBe(800);
      expect(response.body.data.original.height).toBe(600);
      expect(response.body.data.original.fileSize).toBeGreaterThan(0);
      expect(response.body.data.sizes).toHaveLength(4);
      
      // Verify all sizes are present
      const sizeNames = response.body.data.sizes.map((s: any) => s.size);
      expect(sizeNames).toContain('thumbnail');
      expect(sizeNames).toContain('small');
      expect(sizeNames).toContain('medium');
      expect(sizeNames).toContain('large');
    });

    test('should reject upload without authentication', async () => {
      const imageBuffer = await createTestImageBuffer();

      await agent
        .post('/api/products/upload-image')
        .set('X-CSRF-Token', csrfToken)
        .attach('image', imageBuffer, 'test-image.jpg')
        .expect(401);
    });

    test('should reject upload from buyer', async () => {
      const imageBuffer = await createTestImageBuffer();

      await agent
        .post('/api/products/upload-image')
        .set('Authorization', `Bearer ${buyerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .attach('image', imageBuffer, 'test-image.jpg')
        .expect(403);
    });

    test('should reject upload without file', async () => {
      const response = await agent
        .post('/api/products/upload-image')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    test('should reject invalid file type', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const response = await agent
        .post('/api/products/upload-image')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .attach('image', textBuffer, 'test.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/upload-images', () => {
    test('should upload and optimize multiple images', async () => {
      const imageBuffer1 = await createTestImageBuffer();
      const imageBuffer2 = await createTestImageBuffer();

      const response = await agent
        .post('/api/products/upload-images')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .attach('images', imageBuffer1, 'test-image-1.jpg')
        .attach('images', imageBuffer2, 'test-image-2.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Verify both images have correct structure
      for (const result of response.body.data) {
        expect(result.original).toBeDefined();
        expect(result.original.url).toContain('/uploads/');
        expect(result.original.fileSize).toBeGreaterThan(0);
        expect(result.sizes).toHaveLength(4);
        
        const sizeNames = result.sizes.map((s: any) => s.size);
        expect(sizeNames).toContain('thumbnail');
        expect(sizeNames).toContain('small');
        expect(sizeNames).toContain('medium');
        expect(sizeNames).toContain('large');
      }
    });

    test('should reject upload without authentication', async () => {
      const imageBuffer = await createTestImageBuffer();

      await agent
        .post('/api/products/upload-images')
        .set('X-CSRF-Token', csrfToken)
        .attach('images', imageBuffer, 'test-image.jpg')
        .expect(401);
    });

    test('should reject upload without files', async () => {
      const response = await agent
        .post('/api/products/upload-images')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILES');
    });
  });

  describe('POST /api/products', () => {
    test('should create product with uploaded images', async () => {
      // First upload images
      const imageBuffer = await createTestImageBuffer();
      const uploadResponse = await agent
        .post('/api/products/upload-image')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .attach('image', imageBuffer, 'product-image.jpg')
        .expect(200);

      const imageUrl = uploadResponse.body.data.original.url;

      // Create product with uploaded image
      const response = await agent
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
          description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
          price: 1000,
          category: 'handicrafts',
          images: [imageUrl],
          inventory: 10,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.images).toContain(imageUrl);
    });
  });

  describe('GET /api/products', () => {
    test('should return products with image URLs', async () => {
      // Create a product with images
      await Product.create({
        title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
        description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
        price: 1000,
        category: 'handicrafts',
        images: ['/uploads/test-image.jpg'],
        inventory: 10,
        sellerId,
        verificationStatus: 'approved',
        isActive: true,
      });

      const response = await agent
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].images).toContain('/uploads/test-image.jpg');
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return product with image URLs', async () => {
      const product = await Product.create({
        title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
        description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
        price: 1000,
        category: 'handicrafts',
        images: ['/uploads/test-image.jpg'],
        inventory: 10,
        sellerId,
        verificationStatus: 'approved',
        isActive: true,
      });

      const response = await agent
        .get(`/api/products/${product._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.images).toContain('/uploads/test-image.jpg');
    });
  });
});
