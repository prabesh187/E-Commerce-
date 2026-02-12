import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express, { Application } from 'express';
import productRoutes from '../productRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import Order from '../../models/Order.js';
import Review from '../../models/Review.js';
import { userService } from '../../services/UserService.js';

describe('Review Routes', () => {
  let mongoServer: MongoMemoryServer;
  let app: Application;
  let buyerToken: string;
  let buyer2Token: string;
  let buyerId: string;
  let buyer2Id: string;
  let sellerId: string;
  let productId: string;
  let orderId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/api/products', productRoutes);
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
    await Review.deleteMany({});

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

    const buyer2 = await User.create({
      email: 'buyer2@test.com',
      password: 'Password123',
      role: 'buyer',
      firstName: 'Test2',
      lastName: 'Buyer2',
    });
    buyer2Id = buyer2._id.toString();
    buyer2Token = userService.generateToken(buyer2Id, 'buyer');

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
    productId = product._id.toString();

    // Create a delivered order for the buyer
    const order = await Order.create({
      orderNumber: 'MN-2024-000001',
      buyerId: buyer._id,
      items: [
        {
          productId: product._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: seller._id,
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
      paymentStatus: 'completed',
      subtotal: 1000,
      shippingCost: 100,
      totalAmount: 1100,
      status: 'delivered',
      deliveredAt: new Date(),
    });
    orderId = order._id.toString();
  });

  describe('GET /api/products/:id/reviews', () => {
    it('should get product reviews without authentication', async () => {
      // Create some reviews
      await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
        text: 'Great product!',
      });

      await Review.create({
        productId,
        buyerId: buyer2Id,
        orderId,
        rating: 4,
        text: 'Good quality',
      });

      const response = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(2);
      expect(response.body.data.totalCount).toBe(2);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.totalPages).toBe(1);
    });

    it('should paginate reviews correctly', async () => {
      // Create 15 different buyers and orders
      const buyers = [];
      for (let i = 0; i < 15; i++) {
        const buyer = await User.create({
          email: `paginationbuyer${i}@test.com`,
          password: 'Password123',
          role: 'buyer',
          firstName: `Buyer${i}`,
          lastName: 'Test',
        });
        buyers.push(buyer);

        const order = await Order.create({
          orderNumber: `MN-2024-10000${i}`,
          buyerId: buyer._id,
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
            fullName: `Buyer${i} Test`,
            phone: `984123456${i}`,
            addressLine1: 'Test Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          paymentStatus: 'completed',
          subtotal: 1000,
          shippingCost: 100,
          totalAmount: 1100,
          status: 'delivered',
          deliveredAt: new Date(),
        });

        // Create review for each buyer
        await Review.create({
          productId,
          buyerId: buyer._id,
          orderId: order._id,
          rating: 5,
          text: `Review ${i}`,
        });
      }

      // Get first page
      const response1 = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .query({ page: 1, limit: 10 })
        .send();

      expect(response1.status).toBe(200);
      expect(response1.body.data.reviews).toHaveLength(10);
      expect(response1.body.data.totalCount).toBe(15);
      expect(response1.body.data.totalPages).toBe(2);
      expect(response1.body.data.currentPage).toBe(1);

      // Get second page
      const response2 = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .query({ page: 2, limit: 10 })
        .send();

      expect(response2.status).toBe(200);
      expect(response2.body.data.reviews).toHaveLength(5);
      expect(response2.body.data.currentPage).toBe(2);
    });

    it('should return empty array for product with no reviews', async () => {
      const response = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(0);
      expect(response.body.data.totalCount).toBe(0);
    });

    it('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id/reviews')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT_ID');
    });

    it('should sort reviews by creation date (newest first)', async () => {
      // Create reviews with different timestamps
      await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
        text: 'First review',
        createdAt: new Date('2024-01-01'),
      });

      await Review.create({
        productId,
        buyerId: buyer2Id,
        orderId,
        rating: 4,
        text: 'Second review',
        createdAt: new Date('2024-01-02'),
      });

      const response = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.data.reviews).toHaveLength(2);
      // Newest first
      expect(response.body.data.reviews[0].text).toBe('Second review');
      expect(response.body.data.reviews[1].text).toBe('First review');
    });
  });

  describe('POST /api/products/:id/reviews', () => {
    it('should submit review with valid data', async () => {
      const reviewData = {
        rating: 5,
        text: 'Excellent product!',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toBeDefined();
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.review.text).toBe('Excellent product!');
      expect(response.body.data.review.productId).toBe(productId);
      expect(response.body.data.review.buyerId).toBe(buyerId);
    });

    it('should submit review without text (rating only)', async () => {
      const reviewData = {
        rating: 4,
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.review.rating).toBe(4);
      expect(response.body.data.review.text).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      const reviewData = {
        rating: 5,
        text: 'Great product!',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .send(reviewData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing rating', async () => {
      const reviewData = {
        text: 'Great product!',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_RATING');
    });

    it('should return 400 for invalid rating (too low)', async () => {
      const reviewData = {
        rating: 0,
        text: 'Bad product',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_RATING');
    });

    it('should return 400 for invalid rating (too high)', async () => {
      const reviewData = {
        rating: 6,
        text: 'Amazing product',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_RATING');
    });

    it('should return 409 for duplicate review', async () => {
      // Submit first review
      const reviewData = {
        rating: 5,
        text: 'Great product!',
      };

      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      // Try to submit second review
      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('should return 403 for buyer who has not purchased product', async () => {
      // buyer2 has not purchased the product
      const reviewData = {
        rating: 5,
        text: 'Great product!',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send(reviewData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED_REVIEW');
    });

    it('should return 403 for buyer with non-delivered order', async () => {
      // Create a pending order for buyer2
      const product2 = await Product.create({
        title: { en: 'Test Product 2', ne: 'परीक्षण उत्पादन 2' },
        description: { en: 'Test description 2', ne: 'परीक्षण विवरण 2' },
        price: 2000,
        category: 'handicrafts',
        images: ['test2.jpg'],
        inventory: 10,
        sellerId,
        verificationStatus: 'approved',
        isActive: true,
      });

      await Order.create({
        orderNumber: 'MN-2024-000002',
        buyerId: buyer2Id,
        items: [
          {
            productId: product2._id,
            title: 'Test Product 2',
            price: 2000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer 2',
          phone: '9841234568',
          addressLine1: 'Test Address 2',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 2000,
        shippingCost: 100,
        totalAmount: 2100,
        status: 'pending', // Not delivered
      });

      const reviewData = {
        rating: 5,
        text: 'Great product!',
      };

      const response = await request(app)
        .post(`/api/products/${product2._id.toString()}/reviews`)
        .set('Authorization', `Bearer ${buyer2Token}`)
        .send(reviewData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED_REVIEW');
    });

    it('should update product rating after review submission', async () => {
      const reviewData = {
        rating: 5,
        text: 'Excellent product!',
      };

      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      // Check product rating was updated
      const product = await Product.findById(productId);
      expect(product?.averageRating).toBe(5);
      expect(product?.reviewCount).toBe(1);
    });

    it('should trim whitespace from review text', async () => {
      const reviewData = {
        rating: 5,
        text: '  Great product!  ',
      };

      const response = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.data.review.text).toBe('Great product!');
    });
  });

  describe('Review Integration Tests', () => {
    it('should handle multiple reviews and calculate average rating correctly', async () => {
      // Create multiple delivered orders for different buyers
      const buyers = [];
      for (let i = 0; i < 3; i++) {
        const buyer = await User.create({
          email: `integrationbuyer${i}@test.com`,
          password: 'Password123',
          role: 'buyer',
          firstName: `IntegrationBuyer${i}`,
          lastName: 'Test',
        });
        buyers.push(buyer);

        await Order.create({
          orderNumber: `MN-2024-00000${i + 2}`,
          buyerId: buyer._id,
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
            fullName: `Buyer${i} Test`,
            phone: `984123456${i}`,
            addressLine1: 'Test Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          paymentStatus: 'completed',
          subtotal: 1000,
          shippingCost: 100,
          totalAmount: 1100,
          status: 'delivered',
          deliveredAt: new Date(),
        });
      }

      // Submit reviews with different ratings
      const ratings = [5, 4, 3];
      for (let i = 0; i < 3; i++) {
        const token = userService.generateToken(buyers[i]._id.toString(), 'buyer');
        await request(app)
          .post(`/api/products/${productId}/reviews`)
          .set('Authorization', `Bearer ${token}`)
          .send({ rating: ratings[i], text: `Review ${i}` });
      }

      // Check product rating
      const product = await Product.findById(productId);
      expect(product?.reviewCount).toBe(3);
      expect(product?.averageRating).toBe(4); // (5 + 4 + 3) / 3 = 4
    });

    it('should return reviews with populated buyer information', async () => {
      await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
        text: 'Great product!',
      });

      const response = await request(app)
        .get(`/api/products/${productId}/reviews`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.data.reviews[0].buyerId).toBeDefined();
      expect(response.body.data.reviews[0].buyerId.firstName).toBe('Test');
      expect(response.body.data.reviews[0].buyerId.lastName).toBe('Buyer');
    });
  });
});
