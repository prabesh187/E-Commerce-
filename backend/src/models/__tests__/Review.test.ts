import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import Review from '../Review';
import User from '../User';
import Product from '../Product';
import Order from '../Order';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Review.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
  await Order.deleteMany({});
});

describe('Review Model', () => {
  let buyerId: mongoose.Types.ObjectId;
  let sellerId: mongoose.Types.ObjectId;
  let productId: mongoose.Types.ObjectId;
  let orderId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a buyer
    const buyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
    });
    buyerId = buyer._id as mongoose.Types.ObjectId;

    // Create a seller
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
    });
    sellerId = seller._id as mongoose.Types.ObjectId;

    // Create a product
    const product = await Product.create({
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: sellerId,
    });
    productId = product._id as mongoose.Types.ObjectId;

    // Create an order
    const order = await Order.create({
      orderNumber: 'MN-2024-000001',
      buyerId: buyerId,
      items: [
        {
          productId: productId,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: sellerId,
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
      subtotal: 1000,
      totalAmount: 1000,
      status: 'delivered',
    });
    orderId = order._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create a review with all required fields', async () => {
      const review = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
        text: 'Great product!',
      });

      expect(review.productId).toEqual(productId);
      expect(review.buyerId).toEqual(buyerId);
      expect(review.orderId).toEqual(orderId);
      expect(review.rating).toBe(5);
      expect(review.text).toBe('Great product!');
      expect(review.createdAt).toBeDefined();
      expect(review.updatedAt).toBeDefined();
    });

    it('should create a review without optional text field', async () => {
      const review = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 4,
      });

      expect(review.rating).toBe(4);
      expect(review.text).toBeUndefined();
    });

    it('should fail to create review without productId', async () => {
      await expect(
        Review.create({
          buyerId,
          orderId,
          rating: 5,
        })
      ).rejects.toThrow();
    });

    it('should fail to create review without buyerId', async () => {
      await expect(
        Review.create({
          productId,
          orderId,
          rating: 5,
        })
      ).rejects.toThrow();
    });

    it('should fail to create review without orderId', async () => {
      await expect(
        Review.create({
          productId,
          buyerId,
          rating: 5,
        })
      ).rejects.toThrow();
    });

    it('should fail to create review without rating', async () => {
      await expect(
        Review.create({
          productId,
          buyerId,
          orderId,
        })
      ).rejects.toThrow();
    });

    it('should fail to create review with rating below 1', async () => {
      await expect(
        Review.create({
          productId,
          buyerId,
          orderId,
          rating: 0,
        })
      ).rejects.toThrow();
    });

    it('should fail to create review with rating above 5', async () => {
      await expect(
        Review.create({
          productId,
          buyerId,
          orderId,
          rating: 6,
        })
      ).rejects.toThrow();
    });

    it('should trim text field', async () => {
      const review = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
        text: '  Great product!  ',
      });

      expect(review.text).toBe('Great product!');
    });
  });

  describe('Indexes', () => {
    it('should enforce unique constraint on buyerId and productId combination', async () => {
      // Create first review
      await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      // Try to create duplicate review
      await expect(
        Review.create({
          productId,
          buyerId,
          orderId,
          rating: 4,
        })
      ).rejects.toThrow();
    });

    it('should allow same buyer to review different products', async () => {
      // Create another product
      const product2 = await Product.create({
        title: { en: 'Test Product 2' },
        description: { en: 'Test Description 2' },
        price: 2000,
        category: 'food',
        images: ['image2.jpg'],
        inventory: 5,
        sellerId: sellerId,
      });

      // Create reviews for both products
      const review1 = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      const review2 = await Review.create({
        productId: product2._id,
        buyerId,
        orderId,
        rating: 4,
      });

      expect(review1).toBeDefined();
      expect(review2).toBeDefined();
    });

    it('should allow different buyers to review same product', async () => {
      // Create another buyer
      const buyer2 = await User.create({
        email: 'buyer2@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      // Create reviews from both buyers
      const review1 = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      const review2 = await Review.create({
        productId,
        buyerId: buyer2._id,
        orderId,
        rating: 4,
      });

      expect(review1).toBeDefined();
      expect(review2).toBeDefined();
    });
  });

  describe('Querying', () => {
    it('should fetch reviews by productId sorted by createdAt descending', async () => {
      // Create multiple buyers and reviews
      const buyer2 = await User.create({
        email: 'buyer2@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      const review1 = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const review2 = await Review.create({
        productId,
        buyerId: buyer2._id,
        orderId,
        rating: 4,
      });

      const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

      expect(reviews).toHaveLength(2);
      expect(reviews[0]._id).toEqual(review2._id);
      expect(reviews[1]._id).toEqual(review1._id);
    });

    it('should populate buyer information', async () => {
      const review = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      const populatedReview = await Review.findById(review._id).populate(
        'buyerId'
      );

      expect(populatedReview?.buyerId).toBeDefined();
      expect((populatedReview?.buyerId as any).email).toBe('buyer@test.com');
    });

    it('should populate product information', async () => {
      const review = await Review.create({
        productId,
        buyerId,
        orderId,
        rating: 5,
      });

      const populatedReview = await Review.findById(review._id).populate(
        'productId'
      );

      expect(populatedReview?.productId).toBeDefined();
      expect((populatedReview?.productId as any).title.en).toBe('Test Product');
    });
  });
});
