import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import cartRoutes from '../cartRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Cart from '../../models/Cart.js';
import { userService } from '../../services/UserService.js';

describe('Cart Routes', () => {
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
    app.use('/api/cart', cartRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
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

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toEqual([]);
      expect(response.body.data.cart.totalAmount).toBe(0);
    });

    it('should return cart with items', async () => {
      // Add item to cart first
      await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity: 2,
            addedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(1);
      expect(response.body.data.cart.items[0].quantity).toBe(2);
      expect(response.body.data.cart.totalAmount).toBe(2000);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/cart');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/cart', () => {
    it('should add item to cart', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(1);
      expect(response.body.data.cart.items[0].quantity).toBe(2);
      expect(response.body.data.cart.totalAmount).toBe(2000);
    });

    it('should increase quantity if product already in cart', async () => {
      // Add item first
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        });

      // Add same product again
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(1);
      expect(response.body.data.cart.items[0].quantity).toBe(5);
      expect(response.body.data.cart.totalAmount).toBe(5000);
    });

    it('should return 400 for missing productId', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 2,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid quantity', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: fakeId,
          quantity: 1,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/cart').send({
        productId,
        quantity: 1,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/cart/:itemId', () => {
    it('should update item quantity', async () => {
      // Add item first
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity: 2,
            addedAt: new Date(),
          },
        ],
      });

      const itemId = (cart.items[0] as any)._id.toString();

      const response = await request(app)
        .put(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items[0].quantity).toBe(5);
      expect(response.body.data.cart.totalAmount).toBe(5000);
    });

    it('should return 400 for invalid quantity', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity: 2,
            addedAt: new Date(),
          },
        ],
      });

      const itemId = (cart.items[0] as any)._id.toString();

      const response = await request(app)
        .put(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/cart/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 5,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).put(`/api/cart/${fakeId}`).send({
        quantity: 5,
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    it('should remove item from cart', async () => {
      // Add item first
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId,
            quantity: 2,
            addedAt: new Date(),
          },
        ],
      });

      const itemId = (cart.items[0] as any)._id.toString();

      const response = await request(app)
        .delete(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(0);
      expect(response.body.data.cart.totalAmount).toBe(0);
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .delete(`/api/cart/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).delete(`/api/cart/${fakeId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
