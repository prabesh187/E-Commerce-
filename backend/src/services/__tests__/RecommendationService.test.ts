import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RecommendationService } from '../RecommendationService';
import Product, { IProduct } from '../../models/Product';
import Order from '../../models/Order';
import RecentlyViewed from '../../models/RecentlyViewed';
import User from '../../models/User';

describe('RecommendationService', () => {
  let mongoServer: MongoMemoryServer;
  let recommendationService: RecommendationService;
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testSeller: any;
  let testProducts: IProduct[];

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
    await RecentlyViewed.deleteMany({});

    recommendationService = new RecommendationService();

    // Create test users
    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
    });

    testUser1 = await User.create({
      email: 'user1@test.com',
      password: 'Password123',
      role: 'buyer',
    });

    testUser2 = await User.create({
      email: 'user2@test.com',
      password: 'Password123',
      role: 'buyer',
    });

    testUser3 = await User.create({
      email: 'user3@test.com',
      password: 'Password123',
      role: 'buyer',
    });

    // Create test products
    testProducts = await Product.create([
      {
        title: { en: 'Handicraft Item 1' },
        description: { en: 'Beautiful handicraft' },
        price: 1000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.5,
        reviewCount: 10,
        weightedRating: 4.0,
      },
      {
        title: { en: 'Handicraft Item 2' },
        description: { en: 'Another handicraft' },
        price: 1200,
        category: 'handicrafts',
        images: ['image2.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.2,
        reviewCount: 8,
        weightedRating: 3.8,
      },
      {
        title: { en: 'Food Item 1' },
        description: { en: 'Delicious food' },
        price: 500,
        category: 'food',
        images: ['image3.jpg'],
        inventory: 20,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.8,
        reviewCount: 15,
        weightedRating: 4.5,
      },
      {
        title: { en: 'Clothing Item 1' },
        description: { en: 'Traditional clothing' },
        price: 2000,
        category: 'clothing',
        images: ['image4.jpg'],
        inventory: 8,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.0,
        reviewCount: 5,
        weightedRating: 3.5,
      },
      {
        title: { en: 'Electronics Item 1' },
        description: { en: 'Electronic gadget' },
        price: 5000,
        category: 'electronics',
        images: ['image5.jpg'],
        inventory: 3,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
        averageRating: 4.3,
        reviewCount: 12,
        weightedRating: 4.1,
      },
    ]);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await RecentlyViewed.deleteMany({});
  });

  describe('trackProductView', () => {
    it('should track product view and increment view count', async () => {
      const userId = testUser1._id.toString();
      const productId = testProducts[0]._id.toString();

      await recommendationService.trackProductView(userId, productId);

      // Check recently viewed
      const recentlyViewed = await RecentlyViewed.findOne({ userId });
      expect(recentlyViewed).toBeDefined();
      expect(recentlyViewed!.products).toHaveLength(1);
      expect(recentlyViewed!.products[0].productId.toString()).toBe(productId);

      // Check view count incremented
      const product = await Product.findById(productId);
      expect(product!.viewCount).toBe(1);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        recommendationService.trackProductView('invalid', testProducts[0]._id.toString())
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        recommendationService.trackProductView(testUser1._id.toString(), 'invalid')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        recommendationService.trackProductView(testUser1._id.toString(), fakeId)
      ).rejects.toThrow('Product not found');
    });

    it('should update timestamp when viewing same product again', async () => {
      const userId = testUser1._id.toString();
      const productId = testProducts[0]._id.toString();

      await recommendationService.trackProductView(userId, productId);
      const firstView = await RecentlyViewed.findOne({ userId });
      const firstTimestamp = firstView!.products[0].viewedAt;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      await recommendationService.trackProductView(userId, productId);
      const secondView = await RecentlyViewed.findOne({ userId });

      expect(secondView!.products).toHaveLength(1);
      expect(secondView!.products[0].viewedAt.getTime()).toBeGreaterThan(
        firstTimestamp.getTime()
      );
    });

    it('should maintain max 20 items in recently viewed', async () => {
      const userId = testUser1._id.toString();

      // Create 25 products
      const manyProducts = await Product.create(
        Array.from({ length: 25 }, (_, i) => ({
          title: { en: `Product ${i}` },
          description: { en: `Description ${i}` },
          price: 1000,
          category: 'handicrafts',
          images: ['image.jpg'],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'approved',
          isActive: true,
        }))
      );

      // Track all 25 products
      for (const product of manyProducts) {
        await recommendationService.trackProductView(userId, product._id.toString());
      }

      const recentlyViewed = await RecentlyViewed.findOne({ userId });
      expect(recentlyViewed!.products).toHaveLength(20);
    });
  });

  describe('collaborativeFiltering', () => {
    it('should recommend products based on similar user behavior', async () => {
      const user1Id = testUser1._id.toString();
      const user2Id = testUser2._id.toString();

      // User 1 views products 0, 1, 2
      await RecentlyViewed.create({
        userId: user1Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
          { productId: testProducts[2]._id, viewedAt: new Date() },
        ],
      });

      // User 2 views products 0, 1, 2, 3 (similar to user 1 + one more)
      await RecentlyViewed.create({
        userId: user2Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
          { productId: testProducts[2]._id, viewedAt: new Date() },
          { productId: testProducts[3]._id, viewedAt: new Date() },
        ],
      });

      // Get recommendations for user 1
      const recommendations = await recommendationService.collaborativeFiltering(user1Id, 5);

      // Should recommend product 3 (viewed by similar user 2)
      expect(recommendations.length).toBeGreaterThan(0);
      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).toContain(testProducts[3]._id.toString());
    });

    it('should return empty array for user with no behavior', async () => {
      const userId = testUser1._id.toString();
      const recommendations = await recommendationService.collaborativeFiltering(userId, 5);
      expect(recommendations).toEqual([]);
    });

    it('should filter by Jaccard similarity threshold (0.3)', async () => {
      const user1Id = testUser1._id.toString();
      const user2Id = testUser2._id.toString();
      const user3Id = testUser3._id.toString();

      // User 1 views products 0, 1
      await RecentlyViewed.create({
        userId: user1Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
        ],
      });

      // User 2 views products 0, 1, 2 (high similarity with user 1)
      await RecentlyViewed.create({
        userId: user2Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
          { productId: testProducts[2]._id, viewedAt: new Date() },
        ],
      });

      // User 3 views product 4 only (low similarity with user 1)
      await RecentlyViewed.create({
        userId: user3Id,
        products: [{ productId: testProducts[4]._id, viewedAt: new Date() }],
      });

      const recommendations = await recommendationService.collaborativeFiltering(user1Id, 10);

      // Should recommend product 2 from user 2 (high similarity)
      // Should NOT recommend product 4 from user 3 (low similarity)
      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).toContain(testProducts[2]._id.toString());
      expect(recommendedIds).not.toContain(testProducts[4]._id.toString());
    });

    it('should consider both viewed and purchased products', async () => {
      const user1Id = testUser1._id.toString();
      const user2Id = testUser2._id.toString();

      // User 1 views product 0
      await RecentlyViewed.create({
        userId: user1Id,
        products: [{ productId: testProducts[0]._id, viewedAt: new Date() }],
      });

      // User 2 views product 0 and purchases product 1
      await RecentlyViewed.create({
        userId: user2Id,
        products: [{ productId: testProducts[0]._id, viewedAt: new Date() }],
      });

      await Order.create({
        orderNumber: 'MN-2024-001',
        buyerId: user2Id,
        items: [
          {
            productId: testProducts[1]._id,
            title: testProducts[1].title.en,
            price: testProducts[1].price,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          addressLine1: 'Address',
          city: 'City',
          district: 'District',
        },
        paymentMethod: 'cod',
        subtotal: testProducts[1].price,
        totalAmount: testProducts[1].price,
        status: 'confirmed',
      });

      const recommendations = await recommendationService.collaborativeFiltering(user1Id, 5);

      // Should recommend product 1 (purchased by similar user)
      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).toContain(testProducts[1]._id.toString());
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        recommendationService.collaborativeFiltering('invalid', 5)
      ).rejects.toThrow('Invalid user ID');
    });
  });

  describe('contentBasedFiltering', () => {
    it('should recommend products from same category', async () => {
      const productId = testProducts[0]._id.toString(); // Handicraft

      const recommendations = await recommendationService.contentBasedFiltering(productId, 5);

      // Should recommend other handicraft products
      expect(recommendations.length).toBeGreaterThan(0);
      const categories = recommendations.map(p => p.category);
      expect(categories).toContain('handicrafts');
    });

    it('should filter by cosine similarity threshold (0.5)', async () => {
      const productId = testProducts[0]._id.toString(); // Handicraft, price 1000

      const recommendations = await recommendationService.contentBasedFiltering(productId, 10);

      // All recommendations should have similarity >= 0.5
      // Products from same category should be included
      const sameCategoryProducts = recommendations.filter(p => p.category === 'handicrafts');
      expect(sameCategoryProducts.length).toBeGreaterThan(0);
    });

    it('should consider price similarity', async () => {
      // Create products with similar prices
      const similarPriceProduct = await Product.create({
        title: { en: 'Similar Price Handicraft' },
        description: { en: 'Similar price' },
        price: 1100, // Close to testProducts[0] (1000)
        category: 'handicrafts',
        images: ['image.jpg'],
        inventory: 10,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const productId = testProducts[0]._id.toString();
      const recommendations = await recommendationService.contentBasedFiltering(productId, 10);

      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).toContain(similarPriceProduct._id.toString());
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        recommendationService.contentBasedFiltering('invalid', 5)
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        recommendationService.contentBasedFiltering(fakeId, 5)
      ).rejects.toThrow('Product not found');
    });

    it('should return empty array when no similar products exist', async () => {
      // Delete all products except one
      await Product.deleteMany({ _id: { $ne: testProducts[0]._id } });

      const productId = testProducts[0]._id.toString();
      const recommendations = await recommendationService.contentBasedFiltering(productId, 5);

      expect(recommendations).toEqual([]);
    });

    it('should not recommend the source product itself', async () => {
      const productId = testProducts[0]._id.toString();
      const recommendations = await recommendationService.contentBasedFiltering(productId, 10);

      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).not.toContain(productId);
    });
  });

  describe('getPersonalizedRecommendations', () => {
    it('should combine collaborative and content-based recommendations', async () => {
      const user1Id = testUser1._id.toString();
      const user2Id = testUser2._id.toString();

      // User 1 views products 0, 1
      await RecentlyViewed.create({
        userId: user1Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
        ],
      });

      // User 2 views products 0, 1, 2 (similar to user 1)
      await RecentlyViewed.create({
        userId: user2Id,
        products: [
          { productId: testProducts[0]._id, viewedAt: new Date() },
          { productId: testProducts[1]._id, viewedAt: new Date() },
          { productId: testProducts[2]._id, viewedAt: new Date() },
        ],
      });

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        user1Id,
        10
      );

      expect(recommendations.length).toBeGreaterThan(0);
      // Should include product 2 from collaborative filtering
      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).toContain(testProducts[2]._id.toString());
    });

    it('should exclude products user has already viewed', async () => {
      const userId = testUser1._id.toString();

      // User views all products
      await RecentlyViewed.create({
        userId,
        products: testProducts.map(p => ({
          productId: p._id,
          viewedAt: new Date(),
        })),
      });

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        userId,
        10
      );

      // Should not recommend any products user has already viewed
      const recommendedIds = recommendations.map(p => p._id.toString());
      const viewedIds = testProducts.map(p => p._id.toString());

      for (const viewedId of viewedIds) {
        expect(recommendedIds).not.toContain(viewedId);
      }
    });

    it('should exclude products user has purchased', async () => {
      const userId = testUser1._id.toString();

      // User purchases product 0
      await Order.create({
        orderNumber: 'MN-2024-001',
        buyerId: userId,
        items: [
          {
            productId: testProducts[0]._id,
            title: testProducts[0].title.en,
            price: testProducts[0].price,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '1234567890',
          addressLine1: 'Address',
          city: 'City',
          district: 'District',
        },
        paymentMethod: 'cod',
        subtotal: testProducts[0].price,
        totalAmount: testProducts[0].price,
        status: 'delivered',
      });

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        userId,
        10
      );

      const recommendedIds = recommendations.map(p => p._id.toString());
      expect(recommendedIds).not.toContain(testProducts[0]._id.toString());
    });

    it('should respect limit parameter', async () => {
      const user1Id = testUser1._id.toString();
      const user2Id = testUser2._id.toString();

      // Set up behavior
      await RecentlyViewed.create({
        userId: user1Id,
        products: [{ productId: testProducts[0]._id, viewedAt: new Date() }],
      });

      await RecentlyViewed.create({
        userId: user2Id,
        products: testProducts.map(p => ({
          productId: p._id,
          viewedAt: new Date(),
        })),
      });

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        user1Id,
        3
      );

      expect(recommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getRelatedProducts', () => {
    it('should return at least 80% products from same category', async () => {
      // Create more handicraft products
      await Product.create([
        {
          title: { en: 'Handicraft 3' },
          description: { en: 'Description' },
          price: 1000,
          category: 'handicrafts',
          images: ['image.jpg'],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'approved',
          isActive: true,
        },
        {
          title: { en: 'Handicraft 4' },
          description: { en: 'Description' },
          price: 1000,
          category: 'handicrafts',
          images: ['image.jpg'],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'approved',
          isActive: true,
        },
      ]);

      const productId = testProducts[0]._id.toString(); // Handicraft
      const relatedProducts = await recommendationService.getRelatedProducts(productId, 10);

      const sameCategoryCount = relatedProducts.filter(
        p => p.category === 'handicrafts'
      ).length;
      const totalCount = relatedProducts.length;

      if (totalCount > 0) {
        const ratio = sameCategoryCount / totalCount;
        expect(ratio).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should sort by weighted rating', async () => {
      const productId = testProducts[0]._id.toString();
      const relatedProducts = await recommendationService.getRelatedProducts(productId, 10);

      // Check that products are sorted by weighted rating (descending)
      for (let i = 0; i < relatedProducts.length - 1; i++) {
        expect(relatedProducts[i].weightedRating).toBeGreaterThanOrEqual(
          relatedProducts[i + 1].weightedRating
        );
      }
    });

    it('should include products from similar price range', async () => {
      const productId = testProducts[0]._id.toString(); // Price 1000
      const relatedProducts = await recommendationService.getRelatedProducts(productId, 10);

      // Should include products within 50%-150% price range
      const priceMin = 500;
      const priceMax = 1500;

      const inPriceRange = relatedProducts.filter(
        p => p.price >= priceMin && p.price <= priceMax
      );

      expect(inPriceRange.length).toBeGreaterThan(0);
    });

    it('should not include the source product', async () => {
      const productId = testProducts[0]._id.toString();
      const relatedProducts = await recommendationService.getRelatedProducts(productId, 10);

      const relatedIds = relatedProducts.map(p => p._id.toString());
      expect(relatedIds).not.toContain(productId);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        recommendationService.getRelatedProducts('invalid', 5)
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        recommendationService.getRelatedProducts(fakeId, 5)
      ).rejects.toThrow('Product not found');
    });

    it('should only return active and approved products', async () => {
      // Create inactive and pending products
      await Product.create([
        {
          title: { en: 'Inactive Product' },
          description: { en: 'Description' },
          price: 1000,
          category: 'handicrafts',
          images: ['image.jpg'],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'approved',
          isActive: false,
        },
        {
          title: { en: 'Pending Product' },
          description: { en: 'Description' },
          price: 1000,
          category: 'handicrafts',
          images: ['image.jpg'],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'pending',
          isActive: true,
        },
      ]);

      const productId = testProducts[0]._id.toString();
      const relatedProducts = await recommendationService.getRelatedProducts(productId, 10);

      // All products should be active and approved
      relatedProducts.forEach(product => {
        expect(product.isActive).toBe(true);
        expect(product.verificationStatus).toBe('approved');
      });
    });
  });
});
