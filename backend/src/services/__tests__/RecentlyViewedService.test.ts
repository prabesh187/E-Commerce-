import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RecentlyViewedService } from '../RecentlyViewedService.js';
import RecentlyViewed from '../../models/RecentlyViewed.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

describe('RecentlyViewedService', () => {
  let mongoServer: MongoMemoryServer;
  let recentlyViewedService: RecentlyViewedService;
  let testUserId: mongoose.Types.ObjectId;
  let testProductIds: mongoose.Types.ObjectId[];

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
    await RecentlyViewed.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    recentlyViewedService = new RecentlyViewedService();

    // Create test user
    const user = await User.create({
      email: 'buyer@test.com',
      password: 'hashedPassword123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });
    testUserId = user._id as mongoose.Types.ObjectId;

    // Create test products
    testProductIds = [];
    for (let i = 1; i <= 25; i++) {
      const product = await Product.create({
        title: { en: `Test Product ${i}`, ne: `परीक्षण उत्पादन ${i}` },
        description: { en: `Test description ${i}`, ne: `परीक्षण विवरण ${i}` },
        price: 1000 * i,
        category: 'handicrafts',
        images: [`image${i}.jpg`],
        inventory: 10,
        sellerId: new mongoose.Types.ObjectId(),
        verificationStatus: 'approved',
        isActive: true,
      });
      testProductIds.push(product._id as mongoose.Types.ObjectId);
    }
  });

  describe('trackProductView', () => {
    it('should track a product view with timestamp', async () => {
      const beforeTime = new Date();
      
      const result = await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );

      const afterTime = new Date();

      expect(result).toBeDefined();
      expect(result.userId.toString()).toBe(testUserId.toString());
      expect(result.products).toHaveLength(1);
      expect(result.products[0].productId.toString()).toBe(testProductIds[0].toString());
      expect(result.products[0].viewedAt).toBeInstanceOf(Date);
      expect(result.products[0].viewedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.products[0].viewedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should create recently viewed list if it does not exist', async () => {
      const listBefore = await RecentlyViewed.findOne({ userId: testUserId });
      expect(listBefore).toBeNull();

      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );

      const listAfter = await RecentlyViewed.findOne({ userId: testUserId });
      expect(listAfter).toBeDefined();
      expect(listAfter!.products).toHaveLength(1);
    });

    it('should add multiple products in chronological order', async () => {
      // Track products in sequence
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[1].toString()
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[2].toString()
      );

      // Most recent should be first
      expect(result.products).toHaveLength(3);
      expect(result.products[0].productId.toString()).toBe(testProductIds[2].toString());
      expect(result.products[1].productId.toString()).toBe(testProductIds[1].toString());
      expect(result.products[2].productId.toString()).toBe(testProductIds[0].toString());
    });

    it('should update timestamp when viewing same product again', async () => {
      // Track product first time
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );

      // Track another product
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[1].toString()
      );

      // Track first product again
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );

      // Should still have 2 products (no duplicate)
      expect(result.products).toHaveLength(2);
      
      // First product should now be at the top (most recent)
      expect(result.products[0].productId.toString()).toBe(testProductIds[0].toString());
      expect(result.products[1].productId.toString()).toBe(testProductIds[1].toString());
    });

    it('should maintain size limit of 20 items', async () => {
      // Track 25 products
      for (let i = 0; i < 25; i++) {
        await recentlyViewedService.trackProductView(
          testUserId.toString(),
          testProductIds[i].toString()
        );
      }

      const result = await RecentlyViewed.findOne({ userId: testUserId });
      
      // Should only keep 20 most recent
      expect(result!.products).toHaveLength(20);
      
      // Most recent (product 24) should be first
      expect(result!.products[0].productId.toString()).toBe(testProductIds[24].toString());
      
      // Oldest kept (product 5) should be last
      expect(result!.products[19].productId.toString()).toBe(testProductIds[5].toString());
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        recentlyViewedService.trackProductView('invalid-id', testProductIds[0].toString())
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        recentlyViewedService.trackProductView(testUserId.toString(), 'invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      await expect(
        recentlyViewedService.trackProductView(
          testUserId.toString(),
          fakeProductId.toString()
        )
      ).rejects.toThrow('Product not found');
    });
  });

  describe('getRecentlyViewed', () => {
    it('should return empty list for new user', async () => {
      const result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());

      expect(result).toBeDefined();
      expect(result.userId.toString()).toBe(testUserId.toString());
      expect(result.products).toHaveLength(0);
    });

    it('should return recently viewed products with details', async () => {
      // Track some products
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[1].toString()
      );

      const result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());

      expect(result.products).toHaveLength(2);
      
      // Check product details are populated
      expect(result.products[0]).toHaveProperty('title');
      expect(result.products[0]).toHaveProperty('price');
      expect(result.products[0]).toHaveProperty('images');
      expect(result.products[0]).toHaveProperty('viewedAt');
      
      // Most recent product (index 1) should be first
      expect(result.products[0].title.en).toBe('Test Product 2');
      expect(result.products[0].price).toBe(2000);
    });

    it('should return products in chronological order (most recent first)', async () => {
      // Track products in sequence
      for (let i = 0; i < 5; i++) {
        await recentlyViewedService.trackProductView(
          testUserId.toString(),
          testProductIds[i].toString()
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());

      expect(result.products).toHaveLength(5);
      
      // Most recent (product 4) should be first
      expect(result.products[0].title.en).toBe('Test Product 5');
      
      // Oldest (product 0) should be last
      expect(result.products[4].title.en).toBe('Test Product 1');
      
      // Verify timestamps are in descending order
      for (let i = 0; i < result.products.length - 1; i++) {
        expect(result.products[i].viewedAt.getTime()).toBeGreaterThanOrEqual(
          result.products[i + 1].viewedAt.getTime()
        );
      }
    });

    it('should filter out deleted products', async () => {
      // Track products
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[0].toString()
      );
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[1].toString()
      );
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[2].toString()
      );

      // Delete one product
      await Product.findByIdAndDelete(testProductIds[1]);

      const result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());

      // Should only return 2 products (deleted one filtered out)
      expect(result.products).toHaveLength(2);
      expect(result.products[0].title.en).toBe('Test Product 3');
      expect(result.products[1].title.en).toBe('Test Product 1');
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        recentlyViewedService.getRecentlyViewed('invalid-id')
      ).rejects.toThrow('Invalid user ID');
    });
  });

  describe('maintainSizeLimit', () => {
    it('should not modify list with less than 20 items', async () => {
      const recentlyViewed = new RecentlyViewed({
        userId: testUserId,
        products: testProductIds.slice(0, 10).map(id => ({
          productId: id,
          viewedAt: new Date(),
        })),
      });

      await recentlyViewedService.maintainSizeLimit(recentlyViewed);

      expect(recentlyViewed.products).toHaveLength(10);
    });

    it('should not modify list with exactly 20 items', async () => {
      const recentlyViewed = new RecentlyViewed({
        userId: testUserId,
        products: testProductIds.slice(0, 20).map(id => ({
          productId: id,
          viewedAt: new Date(),
        })),
      });

      await recentlyViewedService.maintainSizeLimit(recentlyViewed);

      expect(recentlyViewed.products).toHaveLength(20);
    });

    it('should trim list to 20 items when exceeded', async () => {
      const recentlyViewed = new RecentlyViewed({
        userId: testUserId,
        products: testProductIds.map((id, index) => ({
          productId: id,
          viewedAt: new Date(Date.now() - (24 - index) * 1000), // Older items first
        })),
      });

      expect(recentlyViewed.products).toHaveLength(25);

      await recentlyViewedService.maintainSizeLimit(recentlyViewed);

      expect(recentlyViewed.products).toHaveLength(20);
      
      // Should keep the first 20 items (most recent)
      expect(recentlyViewed.products[0].productId.toString()).toBe(testProductIds[0].toString());
      expect(recentlyViewed.products[19].productId.toString()).toBe(testProductIds[19].toString());
    });

    it('should remove oldest items when limit exceeded', async () => {
      const now = Date.now();
      const recentlyViewed = new RecentlyViewed({
        userId: testUserId,
        products: testProductIds.map((id, index) => ({
          productId: id,
          viewedAt: new Date(now - (24 - index) * 1000), // Index 0 is oldest, 24 is newest
        })),
      });

      await recentlyViewedService.maintainSizeLimit(recentlyViewed);

      // Should keep products 0-19 (the first 20 in the array)
      expect(recentlyViewed.products).toHaveLength(20);
      
      // Verify the kept items
      for (let i = 0; i < 20; i++) {
        expect(recentlyViewed.products[i].productId.toString()).toBe(testProductIds[i].toString());
      }
    });
  });

  describe('Integration: Complete workflow', () => {
    it('should handle complete recently viewed workflow', async () => {
      // User views several products
      for (let i = 0; i < 5; i++) {
        await recentlyViewedService.trackProductView(
          testUserId.toString(),
          testProductIds[i].toString()
        );
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Get recently viewed
      let result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());
      expect(result.products).toHaveLength(5);
      expect(result.products[0].title.en).toBe('Test Product 5');

      // User views a product they already viewed
      await recentlyViewedService.trackProductView(
        testUserId.toString(),
        testProductIds[2].toString()
      );

      // Get recently viewed again
      result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());
      expect(result.products).toHaveLength(5); // Still 5 (no duplicate)
      expect(result.products[0].title.en).toBe('Test Product 3'); // Now at top

      // User views many more products (exceeding limit)
      for (let i = 5; i < 22; i++) {
        await recentlyViewedService.trackProductView(
          testUserId.toString(),
          testProductIds[i].toString()
        );
      }

      // Get recently viewed - should be limited to 20
      result = await recentlyViewedService.getRecentlyViewed(testUserId.toString());
      expect(result.products).toHaveLength(20);
      expect(result.products[0].title.en).toBe('Test Product 22'); // Most recent
    });
  });
});
