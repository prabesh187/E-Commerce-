import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReviewService } from '../ReviewService.js';
import Review from '../../models/Review.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

describe('ReviewService', () => {
  let mongoServer: MongoMemoryServer;
  let reviewService: ReviewService;
  let testBuyer: any;
  let testSeller: any;
  let testProduct: any;
  let testOrder: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
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

    reviewService = new ReviewService();

    // Create test buyer
    testBuyer = await User.create({
      email: 'buyer@test.com',
      password: 'hashedpassword123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });

    // Create test seller
    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'hashedpassword123',
      role: 'seller',
      verificationStatus: 'approved',
      businessName: 'Test Shop',
    });

    // Create test product
    testProduct = await Product.create({
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: testSeller._id,
      verificationStatus: 'approved',
      isActive: true,
    });

    // Create test order (delivered)
    testOrder = await Order.create({
      orderNumber: 'MN-2024-000001',
      buyerId: testBuyer._id,
      items: [
        {
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        },
      ],
      shippingAddress: {
        fullName: 'Test Buyer',
        phone: '9841234567',
        addressLine1: '123 Test St',
        city: 'Kathmandu',
        district: 'Kathmandu',
      },
      paymentMethod: 'cod',
      paymentStatus: 'completed',
      subtotal: 1000,
      shippingCost: 0,
      totalAmount: 1000,
      status: 'delivered',
      trackingNumber: 'MN-2024-000001',
      deliveredAt: new Date(),
    });
  });

  describe('submitReview', () => {
    it('should create a review for a purchased product', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: 'Great product!',
      };

      const review = await reviewService.submitReview(reviewData);

      expect(review).toBeDefined();
      expect(review.productId.toString()).toBe(testProduct._id.toString());
      expect(review.buyerId.toString()).toBe(testBuyer._id.toString());
      expect(review.rating).toBe(5);
      expect(review.text).toBe('Great product!');
      expect(review.orderId.toString()).toBe(testOrder._id.toString());
    });

    it('should update product rating after review submission', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 4,
        text: 'Good product',
      };

      await reviewService.submitReview(reviewData);

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.averageRating).toBe(4);
      expect(updatedProduct?.reviewCount).toBe(1);
      expect(updatedProduct?.weightedRating).toBeGreaterThan(0);
    });

    it('should reject review if buyer has not purchased the product', async () => {
      // Create another product that buyer hasn't purchased
      const anotherProduct = await Product.create({
        title: { en: 'Another Product', ne: 'अर्को उत्पादन' },
        description: { en: 'Another Description', ne: 'अर्को विवरण' },
        price: 2000,
        category: 'food',
        images: ['image2.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const reviewData = {
        productId: anotherProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: 'Great!',
      };

      await expect(reviewService.submitReview(reviewData)).rejects.toThrow(
        'You can only review products you have purchased and received'
      );
    });

    it('should reject review if order is not delivered', async () => {
      // Create another buyer
      const anotherBuyer = await User.create({
        email: 'buyer2@test.com',
        password: 'hashedpassword123',
        role: 'buyer',
        firstName: 'Another',
        lastName: 'Buyer',
      });

      // Create another product
      const anotherProduct = await Product.create({
        title: { en: 'Product 2', ne: 'उत्पादन २' },
        description: { en: 'Description 2', ne: 'विवरण २' },
        price: 1500,
        category: 'clothing',
        images: ['image3.jpg'],
        inventory: 8,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      // Create pending order for another buyer
      await Order.create({
        orderNumber: 'MN-2024-000003',
        buyerId: anotherBuyer._id,
        items: [
          {
            productId: anotherProduct._id,
            title: 'Product 2',
            price: 1500,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Another Buyer',
          phone: '9841234568',
          addressLine1: '456 Test Ave',
          city: 'Pokhara',
          district: 'Kaski',
        },
        paymentMethod: 'esewa',
        paymentStatus: 'pending',
        subtotal: 1500,
        shippingCost: 100,
        totalAmount: 1600,
        status: 'confirmed',
        trackingNumber: 'MN-2024-000003',
      });

      const reviewData = {
        productId: anotherProduct._id.toString(),
        buyerId: anotherBuyer._id.toString(),
        rating: 4,
        text: 'Nice product',
      };

      await expect(reviewService.submitReview(reviewData)).rejects.toThrow(
        'You can only review products you have purchased and received'
      );
    });

    it('should reject duplicate review', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: 'First review',
      };

      // Submit first review
      await reviewService.submitReview(reviewData);

      // Try to submit second review
      const duplicateReviewData = {
        ...reviewData,
        text: 'Second review',
      };

      await expect(
        reviewService.submitReview(duplicateReviewData)
      ).rejects.toThrow('You have already reviewed this product');
    });

    it('should reject invalid rating', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 6,
        text: 'Invalid rating',
      };

      await expect(reviewService.submitReview(reviewData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should reject invalid product ID', async () => {
      const reviewData = {
        productId: 'invalid-id',
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: 'Test',
      };

      await expect(reviewService.submitReview(reviewData)).rejects.toThrow(
        'Invalid product ID'
      );
    });

    it('should handle review without text', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 4,
      };

      const review = await reviewService.submitReview(reviewData);

      expect(review).toBeDefined();
      expect(review.rating).toBe(4);
      expect(review.text).toBeUndefined();
    });

    it('should trim review text', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: '  Great product!  ',
      };

      const review = await reviewService.submitReview(reviewData);

      expect(review.text).toBe('Great product!');
    });
  });

  describe('getProductReviews', () => {
    beforeEach(async () => {
      // Create additional buyers for multiple reviews
      const buyer2 = await User.create({
        email: 'buyer2@test.com',
        password: 'hashedpassword123',
        role: 'buyer',
        firstName: 'Buyer',
        lastName: 'Two',
      });

      const buyer3 = await User.create({
        email: 'buyer3@test.com',
        password: 'hashedpassword123',
        role: 'buyer',
        firstName: 'Buyer',
        lastName: 'Three',
      });

      // Create orders for these buyers
      const order2 = await Order.create({
        orderNumber: 'MN-2024-000005',
        buyerId: buyer2._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Buyer Two',
          phone: '9841234568',
          addressLine1: '456 Test Ave',
          city: 'Pokhara',
          district: 'Kaski',
        },
        paymentMethod: 'esewa',
        paymentStatus: 'completed',
        subtotal: 1000,
        shippingCost: 0,
        totalAmount: 1000,
        status: 'delivered',
        trackingNumber: 'MN-2024-000005',
        deliveredAt: new Date(),
      });

      const order3 = await Order.create({
        orderNumber: 'MN-2024-000006',
        buyerId: buyer3._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Buyer Three',
          phone: '9841234569',
          addressLine1: '789 Test Blvd',
          city: 'Lalitpur',
          district: 'Lalitpur',
        },
        paymentMethod: 'khalti',
        paymentStatus: 'completed',
        subtotal: 1000,
        shippingCost: 0,
        totalAmount: 1000,
        status: 'delivered',
        trackingNumber: 'MN-2024-000006',
        deliveredAt: new Date(),
      });

      // Create multiple reviews from different buyers
      await Review.create([
        {
          productId: testProduct._id,
          buyerId: testBuyer._id,
          orderId: testOrder._id,
          rating: 5,
          text: 'Excellent!',
        },
        {
          productId: testProduct._id,
          buyerId: buyer2._id,
          orderId: order2._id,
          rating: 4,
          text: 'Good',
        },
        {
          productId: testProduct._id,
          buyerId: buyer3._id,
          orderId: order3._id,
          rating: 3,
          text: 'Average',
        },
      ]);
    });

    it('should get all reviews for a product', async () => {
      const result = await reviewService.getProductReviews(
        testProduct._id.toString()
      );

      expect(result.reviews).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it('should paginate reviews correctly', async () => {
      const result = await reviewService.getProductReviews(
        testProduct._id.toString(),
        1,
        2
      );

      expect(result.reviews).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
    });

    it('should sort reviews by creation date (newest first)', async () => {
      const result = await reviewService.getProductReviews(
        testProduct._id.toString()
      );

      // Reviews should be in descending order by createdAt
      for (let i = 0; i < result.reviews.length - 1; i++) {
        expect(result.reviews[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.reviews[i + 1].createdAt.getTime()
        );
      }
    });

    it('should populate buyer information', async () => {
      const result = await reviewService.getProductReviews(
        testProduct._id.toString()
      );

      const review = result.reviews[0];
      expect(review.buyerId).toBeDefined();
      // Check if populated - the first review is from testBuyer, but due to sorting
      // it might be any of the three buyers (testBuyer, buyer2, buyer3)
      if (typeof review.buyerId === 'object' && review.buyerId !== null) {
        expect((review.buyerId as any).firstName).toBeDefined();
        expect((review.buyerId as any).lastName).toBeDefined();
      }
    });

    it('should reject invalid product ID', async () => {
      await expect(
        reviewService.getProductReviews('invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should return empty array for product with no reviews', async () => {
      const anotherProduct = await Product.create({
        title: { en: 'No Reviews Product', ne: 'समीक्षा नभएको उत्पादन' },
        description: { en: 'Description', ne: 'विवरण' },
        price: 500,
        category: 'electronics',
        images: ['image4.jpg'],
        inventory: 3,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const result = await reviewService.getProductReviews(
        anotherProduct._id.toString()
      );

      expect(result.reviews).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('canReview', () => {
    it('should return true if buyer can review', async () => {
      const result = await reviewService.canReview(
        testBuyer._id.toString(),
        testProduct._id.toString()
      );

      expect(result.canReview).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false if buyer has already reviewed', async () => {
      // Submit a review first
      await reviewService.submitReview({
        productId: testProduct._id.toString(),
        buyerId: testBuyer._id.toString(),
        rating: 5,
        text: 'Great!',
      });

      const result = await reviewService.canReview(
        testBuyer._id.toString(),
        testProduct._id.toString()
      );

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('You have already reviewed this product');
    });

    it('should return false if buyer has not purchased', async () => {
      const anotherProduct = await Product.create({
        title: { en: 'Unpurchased Product', ne: 'नकिनेको उत्पादन' },
        description: { en: 'Description', ne: 'विवरण' },
        price: 800,
        category: 'food',
        images: ['image5.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const result = await reviewService.canReview(
        testBuyer._id.toString(),
        anotherProduct._id.toString()
      );

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(
        'You can only review products you have purchased and received'
      );
    });

    it('should return false for invalid buyer ID', async () => {
      const result = await reviewService.canReview(
        'invalid-id',
        testProduct._id.toString()
      );

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Invalid buyer ID');
    });

    it('should return false for invalid product ID', async () => {
      const result = await reviewService.canReview(
        testBuyer._id.toString(),
        'invalid-id'
      );

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Invalid product ID');
    });
  });

  describe('getBuyerReviews', () => {
    beforeEach(async () => {
      // Create multiple products and reviews
      const product2 = await Product.create({
        title: { en: 'Product 2', ne: 'उत्पादन २' },
        description: { en: 'Description 2', ne: 'विवरण २' },
        price: 1500,
        category: 'clothing',
        images: ['image6.jpg'],
        inventory: 7,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const order2 = await Order.create({
        orderNumber: 'MN-2024-000004',
        buyerId: testBuyer._id,
        items: [
          {
            productId: product2._id,
            title: 'Product 2',
            price: 1500,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: '123 Test St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'khalti',
        paymentStatus: 'completed',
        subtotal: 1500,
        shippingCost: 0,
        totalAmount: 1500,
        status: 'delivered',
        trackingNumber: 'MN-2024-000004',
        deliveredAt: new Date(),
      });

      await Review.create([
        {
          productId: testProduct._id,
          buyerId: testBuyer._id,
          orderId: testOrder._id,
          rating: 5,
          text: 'Great product!',
        },
        {
          productId: product2._id,
          buyerId: testBuyer._id,
          orderId: order2._id,
          rating: 4,
          text: 'Good product',
        },
      ]);
    });

    it('should get all reviews by a buyer', async () => {
      const result = await reviewService.getBuyerReviews(
        testBuyer._id.toString()
      );

      expect(result.reviews).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('should paginate buyer reviews', async () => {
      const result = await reviewService.getBuyerReviews(
        testBuyer._id.toString(),
        1,
        1
      );

      expect(result.reviews).toHaveLength(1);
      expect(result.totalCount).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should populate product information', async () => {
      const result = await reviewService.getBuyerReviews(
        testBuyer._id.toString()
      );

      const review = result.reviews[0];
      expect(review.productId).toBeDefined();
    });

    it('should reject invalid buyer ID', async () => {
      await expect(
        reviewService.getBuyerReviews('invalid-id')
      ).rejects.toThrow('Invalid buyer ID');
    });
  });

  describe('getReviewById', () => {
    let testReview: any;

    beforeEach(async () => {
      testReview = await Review.create({
        productId: testProduct._id,
        buyerId: testBuyer._id,
        orderId: testOrder._id,
        rating: 5,
        text: 'Excellent product!',
      });
    });

    it('should get review by ID', async () => {
      const review = await reviewService.getReviewById(
        testReview._id.toString()
      );

      expect(review).toBeDefined();
      expect(review._id.toString()).toBe(testReview._id.toString());
      expect(review.rating).toBe(5);
      expect(review.text).toBe('Excellent product!');
    });

    it('should populate buyer and product information', async () => {
      const review = await reviewService.getReviewById(
        testReview._id.toString()
      );

      expect(review.buyerId).toBeDefined();
      expect(review.productId).toBeDefined();
    });

    it('should reject invalid review ID', async () => {
      await expect(reviewService.getReviewById('invalid-id')).rejects.toThrow(
        'Invalid review ID'
      );
    });

    it('should reject non-existent review ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        reviewService.getReviewById(fakeId.toString())
      ).rejects.toThrow('Review not found');
    });
  });

  describe('updateProductRating', () => {
    it('should calculate correct average rating', async () => {
      // Create additional buyers for multiple reviews
      const buyer2 = await User.create({
        email: 'buyer4@test.com',
        password: 'hashedpassword123',
        role: 'buyer',
        firstName: 'Buyer',
        lastName: 'Four',
      });

      const buyer3 = await User.create({
        email: 'buyer5@test.com',
        password: 'hashedpassword123',
        role: 'buyer',
        firstName: 'Buyer',
        lastName: 'Five',
      });

      // Create orders for these buyers
      const order2 = await Order.create({
        orderNumber: 'MN-2024-000007',
        buyerId: buyer2._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Buyer Four',
          phone: '9841234570',
          addressLine1: '111 Test Rd',
          city: 'Bhaktapur',
          district: 'Bhaktapur',
        },
        paymentMethod: 'cod',
        paymentStatus: 'completed',
        subtotal: 1000,
        shippingCost: 0,
        totalAmount: 1000,
        status: 'delivered',
        trackingNumber: 'MN-2024-000007',
        deliveredAt: new Date(),
      });

      const order3 = await Order.create({
        orderNumber: 'MN-2024-000008',
        buyerId: buyer3._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Buyer Five',
          phone: '9841234571',
          addressLine1: '222 Test Ln',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        paymentStatus: 'completed',
        subtotal: 1000,
        shippingCost: 0,
        totalAmount: 1000,
        status: 'delivered',
        trackingNumber: 'MN-2024-000008',
        deliveredAt: new Date(),
      });

      // Create multiple reviews with different ratings from different buyers
      await Review.create([
        {
          productId: testProduct._id,
          buyerId: testBuyer._id,
          orderId: testOrder._id,
          rating: 5,
        },
        {
          productId: testProduct._id,
          buyerId: buyer2._id,
          orderId: order2._id,
          rating: 4,
        },
        {
          productId: testProduct._id,
          buyerId: buyer3._id,
          orderId: order3._id,
          rating: 3,
        },
      ]);

      // Manually trigger update
      await (reviewService as any).updateProductRating(
        testProduct._id.toString()
      );

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.averageRating).toBe(4); // (5+4+3)/3 = 4
      expect(updatedProduct?.reviewCount).toBe(3);
    });

    it('should calculate weighted rating correctly', async () => {
      await Review.create({
        productId: testProduct._id,
        buyerId: testBuyer._id,
        orderId: testOrder._id,
        rating: 5,
      });

      await (reviewService as any).updateProductRating(
        testProduct._id.toString()
      );

      const updatedProduct = await Product.findById(testProduct._id);
      // Weighted rating = (5 * 1) / (1 + 10) = 5/11 ≈ 0.45
      expect(updatedProduct?.weightedRating).toBeCloseTo(5 / 11, 2);
    });
  });
});
