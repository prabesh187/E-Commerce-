import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import Wishlist from '../Wishlist';
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
  await Wishlist.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
});

describe('Wishlist Model', () => {
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
    it('should create an empty wishlist for a user', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [],
      });

      expect(wishlist.userId).toEqual(userId);
      expect(wishlist.products).toHaveLength(0);
      expect(wishlist.updatedAt).toBeDefined();
    });

    it('should create a wishlist with products', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1, productId2, productId3],
      });

      expect(wishlist.products).toHaveLength(3);
      expect(wishlist.products[0]).toEqual(productId1);
      expect(wishlist.products[1]).toEqual(productId2);
      expect(wishlist.products[2]).toEqual(productId3);
    });

    it('should fail to create wishlist without userId', async () => {
      await expect(
        Wishlist.create({
          products: [],
        })
      ).rejects.toThrow();
    });

    it('should create wishlist with default empty products array', async () => {
      const wishlist = await Wishlist.create({
        userId,
      });

      expect(wishlist.products).toHaveLength(0);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique constraint on userId', async () => {
      // Create first wishlist
      await Wishlist.create({
        userId,
        products: [],
      });

      // Try to create duplicate wishlist for same user
      await expect(
        Wishlist.create({
          userId,
          products: [],
        })
      ).rejects.toThrow();
    });

    it('should allow different users to have their own wishlists', async () => {
      const user2 = await User.create({
        email: 'user2@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      const wishlist1 = await Wishlist.create({
        userId,
        products: [productId1],
      });

      const wishlist2 = await Wishlist.create({
        userId: user2._id,
        products: [productId2],
      });

      expect(wishlist1).toBeDefined();
      expect(wishlist2).toBeDefined();
      expect(wishlist1.userId).not.toEqual(wishlist2.userId);
    });
  });

  describe('Wishlist Operations', () => {
    it('should add product to wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [],
      });

      wishlist.products.push(productId1);
      await wishlist.save();

      const updatedWishlist = await Wishlist.findById(wishlist._id);
      expect(updatedWishlist?.products).toHaveLength(1);
      expect(updatedWishlist?.products[0]).toEqual(productId1);
    });

    it('should add multiple products to wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1],
      });

      wishlist.products.push(productId2, productId3);
      await wishlist.save();

      const updatedWishlist = await Wishlist.findById(wishlist._id);
      expect(updatedWishlist?.products).toHaveLength(3);
    });

    it('should remove product from wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1, productId2, productId3],
      });

      wishlist.products = wishlist.products.filter(
        (id) => !id.equals(productId2)
      );
      await wishlist.save();

      const updatedWishlist = await Wishlist.findById(wishlist._id);
      expect(updatedWishlist?.products).toHaveLength(2);
      expect(updatedWishlist?.products).toContainEqual(productId1);
      expect(updatedWishlist?.products).toContainEqual(productId3);
      expect(updatedWishlist?.products).not.toContainEqual(productId2);
    });

    it('should clear all products from wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1, productId2, productId3],
      });

      wishlist.products = [];
      await wishlist.save();

      const updatedWishlist = await Wishlist.findById(wishlist._id);
      expect(updatedWishlist?.products).toHaveLength(0);
    });

    it('should check if product exists in wishlist', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1, productId2],
      });

      const hasProduct1 = wishlist.products.some((id) => id.equals(productId1));
      const hasProduct3 = wishlist.products.some((id) => id.equals(productId3));

      expect(hasProduct1).toBe(true);
      expect(hasProduct3).toBe(false);
    });
  });

  describe('Querying', () => {
    it('should find wishlist by userId', async () => {
      await Wishlist.create({
        userId,
        products: [productId1, productId2],
      });

      const wishlist = await Wishlist.findOne({ userId });

      expect(wishlist).toBeDefined();
      expect(wishlist?.userId).toEqual(userId);
      expect(wishlist?.products).toHaveLength(2);
    });

    it('should populate product information', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [productId1, productId2],
      });

      const populatedWishlist = await Wishlist.findById(wishlist._id).populate(
        'products'
      );

      expect(populatedWishlist?.products).toHaveLength(2);
      expect((populatedWishlist?.products[0] as any).title.en).toBe(
        'Product 1'
      );
      expect((populatedWishlist?.products[1] as any).title.en).toBe(
        'Product 2'
      );
    });

    it('should populate user information', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [],
      });

      const populatedWishlist = await Wishlist.findById(wishlist._id).populate(
        'userId'
      );

      expect(populatedWishlist?.userId).toBeDefined();
      expect((populatedWishlist?.userId as any).email).toBe('user@test.com');
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt when wishlist is modified', async () => {
      const wishlist = await Wishlist.create({
        userId,
        products: [],
      });

      const originalUpdatedAt = wishlist.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      wishlist.products.push(productId1);
      await wishlist.save();

      expect(wishlist.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
