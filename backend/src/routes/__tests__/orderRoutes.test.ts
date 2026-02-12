import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import orderRoutes from '../orderRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import { userService } from '../../services/UserService.js';

describe('Order Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;
  let buyerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let buyerId: string;
  let sellerId: string;
  let adminId: string;
  let productId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/orders', orderRoutes);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create test users
    const buyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });
    buyerId = buyer._id.toString();
    buyerToken = userService.generateToken(buyerId, 'buyer');

    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
      verificationStatus: 'approved',
    });
    sellerId = seller._id.toString();
    sellerToken = userService.generateToken(sellerId, 'seller');

    const admin = await User.create({
      email: 'admin@test.com',
      password: 'Password123',
      role: 'admin',
      firstName: 'Test',
      lastName: 'Admin',
    });
    adminId = admin._id.toString();
    adminToken = userService.generateToken(adminId, 'admin');

    // Create a test product
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

  describe('POST /api/orders', () => {
    const validOrderData = {
      cartItems: [
        {
          productId: '',
          quantity: 2,
        },
      ],
      shippingAddress: {
        fullName: 'Test Buyer',
        phone: '9841234567',
        addressLine1: 'Test Address',
        city: 'Kathmandu',
        district: 'Kathmandu',
      },
      paymentMethod: 'cod',
      shippingCost: 100,
    };

    it('should create order with valid data', async () => {
      const orderData = {
        ...validOrderData,
        cartItems: [{ productId, quantity: 2 }],
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.orderNumber).toMatch(/^MN-\d{4}-\d{6}$/);
      expect(response.body.data.order.items).toHaveLength(1);
      expect(response.body.data.order.totalAmount).toBe(2100); // 2 * 1000 + 100
      expect(response.body.data.order.status).toBe('pending');
    });

    it('should return 400 for empty cart items', async () => {
      const orderData = {
        ...validOrderData,
        cartItems: [],
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CART_ITEMS');
    });

    it('should return 400 for missing shipping address', async () => {
      const orderData = {
        cartItems: [{ productId, quantity: 2 }],
        paymentMethod: 'cod',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_SHIPPING_ADDRESS');
    });

    it('should return 400 for invalid payment method', async () => {
      const orderData = {
        ...validOrderData,
        cartItems: [{ productId, quantity: 2 }],
        paymentMethod: 'invalid',
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PAYMENT_METHOD');
    });

    it('should return 400 for insufficient inventory', async () => {
      const orderData = {
        ...validOrderData,
        cartItems: [{ productId, quantity: 20 }], // More than available
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient inventory');
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const orderData = {
        ...validOrderData,
        cartItems: [{ productId: fakeId, quantity: 1 }],
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const orderData = {
        ...validOrderData,
        cartItems: [{ productId, quantity: 2 }],
      };

      const response = await request(app).post('/api/orders').send(orderData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders', () => {
    it('should return user order history', async () => {
      // Create test orders
      await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.currentPage).toBe(1);
    });

    it('should support pagination', async () => {
      // Create multiple orders
      for (let i = 0; i < 15; i++) {
        await Order.create({
          orderNumber: `MN-2024-${String(i + 1).padStart(6, '0')}`,
          buyerId,
          items: [
            {
              productId,
              title: 'Test Product',
              price: 1000,
              quantity: 1,
              sellerId,
            },
          ],
          shippingAddress: {
            fullName: 'Test Buyer',
            phone: '9841234567',
            addressLine1: 'Test Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          subtotal: 1000,
          shippingCost: 100,
          totalAmount: 1100,
          status: 'pending',
          trackingNumber: `MN-2024-${String(i + 1).padStart(6, '0')}`,
        });
      }

      const response = await request(app)
        .get('/api/orders?page=2&limit=10')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(5);
      expect(response.body.data.currentPage).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return order details for buyer', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.orderNumber).toBe('MN-2024-000001');
    });

    it('should return order details for seller', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return order details for admin', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 403 for unauthorized buyer', async () => {
      // Create another buyer
      const anotherBuyer = await User.create({
        email: 'another@test.com',
        password: 'Password123',
        role: 'buyer',
      });
      const anotherToken = userService.generateToken(
        anotherBuyer._id.toString(),
        'buyer'
      );

      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/api/orders/${fakeId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    it('should allow seller to update order status', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('confirmed');
      expect(response.body.data.order.confirmedAt).toBeDefined();
    });

    it('should allow admin to update order status', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('confirmed');
    });

    it('should allow buyer to cancel their order', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'cancelled' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('cancelled');
      expect(response.body.data.order.cancelledAt).toBeDefined();
    });

    it('should return 400 for invalid status', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid status transition', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'delivered',
        trackingNumber: 'MN-2024-000001',
      });

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'pending' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should return 401 without authentication', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/orders/${fakeId}/status`)
        .send({ status: 'confirmed' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
