import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import wishlistRoutes from '../wishlistRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Wishlist from '../../models/Wishlist.js';
import Cart from '../../models/Cart.js';
import { userService } from '../../services/UserService.js';

describe('Wishlist Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;
  let authToken: string;
  let userId: string;
  let productId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/wishlist', wishlistRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Wishlist.deleteMany({});
    await Cart.deleteMany({});

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

    // Create a test product
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
      verificationStatus: 'approved',
    });

    const product = await Product.create({
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts',
      images: ['test.jpg'],
      inventory: 10,
      sellerId: seller._id,
      verificationStatus: 'approved',
      isActive: true,
    });
    productId = product._id.toString();
  });

  describe('GET /api/wishlist', () => {
    it('should return empty wishlist for new user', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.products).toEqual([]);
    });

    it('should return wishlist with products', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.products).toHaveLength(1);
      expect(response.body.data.wishlist.products[0].title.en).toBe('Test Product');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/wishlist');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/wishlist', () => {
    it('should add product to wishlist', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.products).toHaveLength(1);
      expect(response.body.data.wishlist.products[0].title.en).toBe('Test Product');
    });

    it('should return 400 if productId is missing', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
    });

    it('should return 404 if product not found', async () => {
      const fakeProductId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: fakeProductId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should return 409 if product already in wishlist', async () => {
      // Add product first
      await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
        });

      // Try to add same product again
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_PRODUCT');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .send({
          productId,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/wishlist/:productId', () => {
    it('should remove product from wishlist', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .delete(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.products).toHaveLength(0);
    });

    it('should return 404 if product not in wishlist', async () => {
      // Create empty wishlist
      await Wishlist.create({
        userId,
        products: [],
      });

      const response = await request(app)
        .delete(`/api/wishlist/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).delete(`/api/wishlist/${productId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/wishlist/:productId/move-to-cart', () => {
    it('should move product from wishlist to cart', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.products).toHaveLength(0);
      expect(response.body.data.message).toBe('Product moved to cart successfully');

      // Verify product was added to cart
      const cart = await Cart.findOne({ userId });
      expect(cart).toBeTruthy();
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].quantity).toBe(2);
    });

    it('should use default quantity of 1', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify product was added to cart with quantity 1
      const cart = await Cart.findOne({ userId });
      expect(cart!.items[0].quantity).toBe(1);
    });

    it('should return 400 if quantity is less than 1', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    });

    it('should return 404 if product not in wishlist', async () => {
      // Create empty wishlist
      await Wishlist.create({
        userId,
        products: [],
      });

      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 if insufficient inventory', async () => {
      // Add product to wishlist first
      await Wishlist.create({
        userId,
        products: [productId],
      });

      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 100, // More than available inventory (10)
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_UNAVAILABLE');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/wishlist/${productId}/move-to-cart`)
        .send({
          quantity: 1,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
