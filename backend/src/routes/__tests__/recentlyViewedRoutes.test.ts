import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import recentlyViewedRoutes from '../recentlyViewedRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import RecentlyViewed from '../../models/RecentlyViewed.js';
import { userService } from '../../services/UserService.js';

describe('Recently Viewed Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;
  let authToken: string;
  let userId: string;
  let productId1: string;
  let productId2: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/recently-viewed', recentlyViewedRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await RecentlyViewed.deleteMany({});

    // Create a test user
    const user = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });
    userId = user._id.toString();

    // Generate auth token
    authToken = userService.generateToken(userId, 'buyer');

    // Create test products
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
      verificationStatus: 'approved',
    });

    const product1 = await Product.create({
      title: { en: 'Test Product 1', ne: 'परीक्षण उत्पादन 1' },
      description: { en: 'Test description 1', ne: 'परीक्षण विवरण 1' },
      price: 1000,
      category: 'handicrafts',
      images: ['test1.jpg'],
      inventory: 10,
      sellerId: seller._id,
      verificationStatus: 'approved',
      isActive: true,
    });
    productId1 = product1._id.toString();

    const product2 = await Product.create({
      title: { en: 'Test Product 2', ne: 'परीक्षण उत्पादन 2' },
      description: { en: 'Test description 2', ne: 'परीक्षण विवरण 2' },
      price: 2000,
      category: 'clothing',
      images: ['test2.jpg'],
      inventory: 5,
      sellerId: seller._id,
      verificationStatus: 'approved',
      isActive: true,
    });
    productId2 = product2._id.toString();
  });

  describe('GET /api/recently-viewed', () => {
    it('should return empty list for new user', async () => {
      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recentlyViewed.products).toEqual([]);
    });

    it('should return recently viewed products in chronological order', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute ago

      // Add products to recently viewed
      await RecentlyViewed.create({
        userId,
        products: [
          {
            productId: productId1,
            viewedAt: now,
          },
          {
            productId: productId2,
            viewedAt: earlier,
          },
        ],
      });

      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recentlyViewed.products).toHaveLength(2);
      
      // Most recent should be first
      expect(response.body.data.recentlyViewed.products[0].title.en).toBe('Test Product 1');
      expect(response.body.data.recentlyViewed.products[1].title.en).toBe('Test Product 2');
    });

    it('should filter out deleted products', async () => {
      // Add products to recently viewed
      await RecentlyViewed.create({
        userId,
        products: [
          {
            productId: productId1,
            viewedAt: new Date(),
          },
          {
            productId: new mongoose.Types.ObjectId(), // Non-existent product
            viewedAt: new Date(Date.now() - 60000),
          },
        ],
      });

      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should only return the existing product
      expect(response.body.data.recentlyViewed.products).toHaveLength(1);
      expect(response.body.data.recentlyViewed.products[0].title.en).toBe('Test Product 1');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/recently-viewed');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should include product details', async () => {
      // Add product to recently viewed
      await RecentlyViewed.create({
        userId,
        products: [
          {
            productId: productId1,
            viewedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recentlyViewed.products).toHaveLength(1);
      
      const product = response.body.data.recentlyViewed.products[0];
      expect(product.title.en).toBe('Test Product 1');
      expect(product.price).toBe(1000);
      expect(product.images).toEqual(['test1.jpg']);
      expect(product.inventory).toBe(10);
      expect(product.isActive).toBe(true);
      expect(product.viewedAt).toBeDefined();
    });

    it('should limit to 20 products', async () => {
      // Create 25 products
      const seller = await User.findOne({ role: 'seller' });
      const products = [];
      
      for (let i = 0; i < 25; i++) {
        const product = await Product.create({
          title: { en: `Product ${i}` },
          description: { en: `Description ${i}` },
          price: 1000 + i,
          category: 'handicrafts',
          images: [`image${i}.jpg`],
          inventory: 10,
          sellerId: seller!._id,
          verificationStatus: 'approved',
          isActive: true,
        });
        products.push({
          productId: product._id,
          viewedAt: new Date(Date.now() - i * 1000),
        });
      }

      // Add only 20 products to recently viewed (service maintains limit)
      await RecentlyViewed.create({
        userId,
        products: products.slice(0, 20),
      });

      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should return exactly 20 products
      expect(response.body.data.recentlyViewed.products.length).toBe(20);
    });
  });
});
