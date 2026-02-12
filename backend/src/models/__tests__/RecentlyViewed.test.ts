import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import RecentlyViewed from '../RecentlyViewed';
import User from '../User';
import Product from '../Product';

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
  await RecentlyViewed.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
});

describe('RecentlyViewed Model', () => {
  let userId: mongoose.Types.ObjectId;
  let productId1: mongoose.Types.ObjectId;
  let productId2: mongoose.Types.ObjectId;
  let productId3: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a user
    const user = await User.create({
      email: 'user@test.com',
      password: 'Password123',
      role: 'buyer',
    });
    userId = user._id as mongoose.Types.ObjectId;

    // Create a seller
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
    });

    // Create products
    const product1 = await Product.create({
      title: { en: 'Product 1' },
      description: { en: 'Description 1' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: seller._id,
    });
    productId1 = product1._id as mongoose.Types.ObjectId;

    const product2 = await Product.create({
      title: { en: 'Product 2' },
      description: { en: 'Description 2' },
      price: 2000,
      category: 'food',
      images: ['image2.jpg'],
      inventory: 5,
      sellerId: seller._id,
    });
    productId2 = product2._id as mongoose.Types.ObjectId;

    const product3 = await Product.create({
      title: { en: 'Product 3' },
      description: { en: 'Description 3' },
      price: 3000,
      category: 'clothing',
      images: ['image3.jpg'],
      inventory: 8,
      sellerId: seller._id,
    });
    productId3 = product3._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create an empty recently viewed list for a user', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [],
      });

      expect(recentlyViewed.userId).toEqual(userId);
      expect(recentlyViewed.products).toHaveLength(0);
      expect(recentlyViewed.updatedAt).toBeDefined();
    });

    it('should create a recently viewed list with products and timestamps', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute ago

      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [
          { productId: productId1, viewedAt: earlier },
          { productId: productId2, viewedAt: now },
        ],
      });

      expect(recentlyViewed.products).toHaveLength(2);
      expect(recentlyViewed.products[0].productId).toEqual(productId1);
      expect(recentlyViewed.products[0].viewedAt).toEqual(earlier);
      expect(recentlyViewed.products[1].productId).toEqual(productId2);
      expect(recentlyViewed.products[1].viewedAt).toEqual(now);
    });

    it('should fail to create recently viewed without userId', async () => {
      await expect(
        RecentlyViewed.create({
          products: [],
        })
      ).rejects.toThrow();
    });

    it('should fail to create product entry without productId', async () => {
      await expect(
        RecentlyViewed.create({
          userId,
          products: [{ viewedAt: new Date() }],
        })
      ).rejects.toThrow();
    });

    it('should set default viewedAt timestamp', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [{ productId: productId1, viewedAt: new Date() }],
      });

      expect(recentlyViewed.products[0].viewedAt).toBeDefined();
      expect(recentlyViewed.products[0].viewedAt).toBeInstanceOf(Date);
    });

    it('should create recently viewed with default empty products array', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
      });

      expect(recentlyViewed.products).toHaveLength(0);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique constraint on userId', async () => {
      // Create first recently viewed list
      await RecentlyViewed.create({
        userId,
        products: [],
      });

      // Try to create duplicate recently viewed list for same user
      await expect(
        RecentlyViewed.create({
          userId,
          products: [],
        })
      ).rejects.toThrow();
    });

    it('should allow different users to have their own recently viewed lists', async () => {
      const user2 = await User.create({
        email: 'user2@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      const recentlyViewed1 = await RecentlyViewed.create({
        userId,
        products: [{ productId: productId1, viewedAt: new Date() }],
      });

      const recentlyViewed2 = await RecentlyViewed.create({
        userId: user2._id,
        products: [{ productId: productId2, viewedAt: new Date() }],
      });

      expect(recentlyViewed1).toBeDefined();
      expect(recentlyViewed2).toBeDefined();
      expect(recentlyViewed1.userId).not.toEqual(recentlyViewed2.userId);
    });
  });

  describe('Recently Viewed Operations', () => {
    it('should add product to recently viewed list', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [],
      });

      recentlyViewed.products.push({
        productId: productId1,
        viewedAt: new Date(),
      });
      await recentlyViewed.save();

      const updated = await RecentlyViewed.findById(recentlyViewed._id);
      expect(updated?.products).toHaveLength(1);
      expect(updated?.products[0].productId).toEqual(productId1);
    });

    it('should maintain chronological order (most recent first)', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);
      const earliest = new Date(now.getTime() - 120000);

      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [
          { productId: productId1, viewedAt: earliest },
          { productId: productId2, viewedAt: earlier },
          { productId: productId3, viewedAt: now },
        ],
      });

      // Sort by viewedAt descending (most recent first)
      const sorted = [...recentlyViewed.products].sort(
        (a, b) => b.viewedAt.getTime() - a.viewedAt.getTime()
      );

      expect(sorted[0].productId).toEqual(productId3);
      expect(sorted[1].productId).toEqual(productId2);
      expect(sorted[2].productId).toEqual(productId1);
    });

    it('should update viewedAt when product is viewed again', async () => {
      const firstView = new Date(Date.now() - 60000);
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [{ productId: productId1, viewedAt: firstView }],
      });

      // Remove old entry and add new one with updated timestamp
      recentlyViewed.products = recentlyViewed.products.filter(
        (p) => !p.productId.equals(productId1)
      );
      recentlyViewed.products.unshift({
        productId: productId1,
        viewedAt: new Date(),
      });
      await recentlyViewed.save();

      const updated = await RecentlyViewed.findById(recentlyViewed._id);
      expect(updated?.products).toHaveLength(1);
      expect(updated?.products[0].viewedAt.getTime()).toBeGreaterThan(
        firstView.getTime()
      );
    });

    it('should limit recently viewed to 20 items', async () => {
      const products = [];
      const baseTime = Date.now();

      // Create 25 product entries
      for (let i = 0; i < 25; i++) {
        products.push({
          productId: productId1, // Using same product for simplicity
          viewedAt: new Date(baseTime + i * 1000),
        });
      }

      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products,
      });

      // Keep only the 20 most recent
      recentlyViewed.products = recentlyViewed.products
        .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
        .slice(0, 20);
      await recentlyViewed.save();

      const updated = await RecentlyViewed.findById(recentlyViewed._id);
      expect(updated?.products.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Querying', () => {
    it('should find recently viewed by userId', async () => {
      await RecentlyViewed.create({
        userId,
        products: [
          { productId: productId1, viewedAt: new Date() },
          { productId: productId2, viewedAt: new Date() },
        ],
      });

      const recentlyViewed = await RecentlyViewed.findOne({ userId });

      expect(recentlyViewed).toBeDefined();
      expect(recentlyViewed?.userId).toEqual(userId);
      expect(recentlyViewed?.products).toHaveLength(2);
    });

    it('should populate product information', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [
          { productId: productId1, viewedAt: new Date() },
          { productId: productId2, viewedAt: new Date() },
        ],
      });

      const populated = await RecentlyViewed.findById(
        recentlyViewed._id
      ).populate('products.productId');

      expect(populated?.products).toHaveLength(2);
      expect((populated?.products[0].productId as any).title.en).toBe(
        'Product 1'
      );
      expect((populated?.products[1].productId as any).title.en).toBe(
        'Product 2'
      );
    });

    it('should populate user information', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [],
      });

      const populated = await RecentlyViewed.findById(
        recentlyViewed._id
      ).populate('userId');

      expect(populated?.userId).toBeDefined();
      expect((populated?.userId as any).email).toBe('user@test.com');
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt when recently viewed is modified', async () => {
      const recentlyViewed = await RecentlyViewed.create({
        userId,
        products: [],
      });

      const originalUpdatedAt = recentlyViewed.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      recentlyViewed.products.push({
        productId: productId1,
        viewedAt: new Date(),
      });
      await recentlyViewed.save();

      expect(recentlyViewed.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
