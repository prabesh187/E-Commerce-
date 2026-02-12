import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import paymentRoutes from '../paymentRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Payment from '../../models/Payment.js';
import { userService } from '../../services/UserService.js';

// Mock axios for payment gateway calls
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Payment Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;
  let buyerToken: string;
  let buyerId: string;
  let sellerId: string;
  let orderId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/payment', paymentRoutes);
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
    await Payment.deleteMany({});

    // Reset mocks
    jest.clearAllMocks();

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

    // Create a test order
    const order = await Order.create({
      orderNumber: 'MN-2024-000001',
      buyerId,
      items: [
        {
          productId: product._id,
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
      paymentMethod: 'esewa',
      paymentStatus: 'pending',
      subtotal: 2000,
      shippingCost: 100,
      totalAmount: 2100,
      status: 'pending',
      trackingNumber: 'MN-2024-000001',
    });
    orderId = order._id.toString();
  });

  describe('POST /api/payment/esewa/initiate', () => {
    it('should initiate eSewa payment', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: 2100,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentUrl).toBeDefined();
      expect(response.body.data.transactionUuid).toBeDefined();
      expect(response.body.data.paymentUrl).toContain('esewa.com.np');

      // Verify payment record was created
      const payment = await Payment.findOne({ orderId });
      expect(payment).toBeDefined();
      expect(payment?.gateway).toBe('esewa');
      expect(payment?.status).toBe('pending');
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          amount: 2100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ORDER_ID');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    it('should return 400 for amount mismatch', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: 5000, // Different from order total
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AMOUNT_MISMATCH');
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: fakeId,
          amount: 2100,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/initiate')
        .send({
          orderId,
          amount: 2100,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payment/esewa/verify', () => {
    it('should verify successful eSewa payment', async () => {
      // Create payment record
      const transactionId = 'test-transaction-123';
      await Payment.create({
        orderId,
        gateway: 'esewa',
        amount: 2100,
        status: 'pending',
        transactionId,
      });

      // Mock eSewa verification response
      mockedAxios.get.mockResolvedValueOnce({
        data: '<response><response_code>Success</response_code></response>',
      });

      const response = await request(app)
        .post('/api/payment/esewa/verify')
        .send({
          orderId,
          transactionId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
      expect(response.body.data.status).toBe('completed');

      // Verify payment status updated
      const payment = await Payment.findOne({ orderId });
      expect(payment?.status).toBe('completed');

      // Verify order status updated
      const order = await Order.findById(orderId);
      expect(order?.paymentStatus).toBe('completed');
      expect(order?.status).toBe('confirmed');
    });

    it('should handle failed eSewa payment verification', async () => {
      // Create payment record
      const transactionId = 'test-transaction-123';
      await Payment.create({
        orderId,
        gateway: 'esewa',
        amount: 2100,
        status: 'pending',
        transactionId,
      });

      // Mock eSewa verification response (failure)
      mockedAxios.get.mockResolvedValueOnce({
        data: '<response><response_code>Failed</response_code></response>',
      });

      const response = await request(app)
        .post('/api/payment/esewa/verify')
        .send({
          orderId,
          transactionId,
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.data.verified).toBe(false);

      // Verify payment status updated
      const payment = await Payment.findOne({ orderId });
      expect(payment?.status).toBe('failed');
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/verify')
        .send({
          transactionId: 'test-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ORDER_ID');
    });

    it('should return 400 for missing transaction ID', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/verify')
        .send({
          orderId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TRANSACTION_ID');
    });

    it('should return 404 for non-existent payment record', async () => {
      const response = await request(app)
        .post('/api/payment/esewa/verify')
        .send({
          orderId,
          transactionId: 'non-existent',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payment/khalti/initiate', () => {
    it('should initiate Khalti payment', async () => {
      // Mock Khalti API response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-123',
          payment_url: 'https://khalti.com/payment/test-pidx-123',
        },
      });

      const response = await request(app)
        .post('/api/payment/khalti/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: 2100,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentUrl).toBeDefined();
      expect(response.body.data.pidx).toBe('test-pidx-123');

      // Verify payment record was created
      const payment = await Payment.findOne({ orderId });
      expect(payment).toBeDefined();
      expect(payment?.gateway).toBe('khalti');
      expect(payment?.status).toBe('pending');
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          amount: 2100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ORDER_ID');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: -100,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_AMOUNT');
    });

    it('should handle Khalti API errors', async () => {
      // Mock Khalti API error
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            message: 'Invalid merchant credentials',
          },
        },
      });

      const response = await request(app)
        .post('/api/payment/khalti/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          amount: 2100,
        });

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GATEWAY_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/initiate')
        .send({
          orderId,
          amount: 2100,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/payment/khalti/verify', () => {
    it('should verify successful Khalti payment', async () => {
      // Create payment record
      const token = 'test-pidx-123';
      await Payment.create({
        orderId,
        gateway: 'khalti',
        amount: 2100,
        status: 'pending',
        transactionId: token,
      });

      // Mock Khalti verification response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: token,
          status: 'Completed',
          transaction_id: 'khalti-txn-123',
        },
      });

      const response = await request(app)
        .post('/api/payment/khalti/verify')
        .send({
          orderId,
          token,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verified).toBe(true);
      expect(response.body.data.status).toBe('completed');

      // Verify payment status updated
      const payment = await Payment.findOne({ orderId });
      expect(payment?.status).toBe('completed');

      // Verify order status updated
      const order = await Order.findById(orderId);
      expect(order?.paymentStatus).toBe('completed');
      expect(order?.status).toBe('confirmed');
    });

    it('should handle failed Khalti payment verification', async () => {
      // Create payment record
      const token = 'test-pidx-123';
      await Payment.create({
        orderId,
        gateway: 'khalti',
        amount: 2100,
        status: 'pending',
        transactionId: token,
      });

      // Mock Khalti verification response (not completed)
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: token,
          status: 'Pending',
        },
      });

      const response = await request(app)
        .post('/api/payment/khalti/verify')
        .send({
          orderId,
          token,
        });

      expect(response.status).toBe(402);
      expect(response.body.success).toBe(false);
      expect(response.body.data.verified).toBe(false);

      // Verify payment status updated
      const payment = await Payment.findOne({ orderId });
      expect(payment?.status).toBe('failed');
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/verify')
        .send({
          token: 'test-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_ORDER_ID');
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/verify')
        .send({
          orderId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 404 for non-existent payment record', async () => {
      const response = await request(app)
        .post('/api/payment/khalti/verify')
        .send({
          orderId,
          token: 'non-existent',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
