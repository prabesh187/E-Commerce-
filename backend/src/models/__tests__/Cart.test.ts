import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import Cart from '../Cart';
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
  await Cart.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
});

describe('Cart Model', () => {
  let userId: mongoose.Types.ObjectId;
  let productId1: mongoose.Types.ObjectId;
  let productId2: mongoose.Types.ObjectId;

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
  });

  describe('Schema Validation', () => {
    it('should create an empty cart for a user', async () => {
      const cart = await Cart.create({
        userId,
        items: [],
      });

      expect(cart.userId).toEqual(userId);
      expect(cart.items).toHaveLength(0);
      expect(cart.updatedAt).toBeDefined();
    });

    it('should create a cart with items', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 2,
          },
          {
            productId: productId2,
            quantity: 1,
          },
        ],
      });

      expect(cart.items).toHaveLength(2);
      expect(cart.items[0].productId).toEqual(productId1);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.items[0].addedAt).toBeDefined();
      expect(cart.items[1].productId).toEqual(productId2);
      expect(cart.items[1].quantity).toBe(1);
    });

    it('should fail to create cart without userId', async () => {
      await expect(
        Cart.create({
          items: [],
        })
      ).rejects.toThrow();
    });

    it('should fail to create cart item with quantity less than 1', async () => {
      await expect(
        Cart.create({
          userId,
          items: [
            {
              productId: productId1,
              quantity: 0,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('should fail to create cart item without productId', async () => {
      await expect(
        Cart.create({
          userId,
          items: [
            {
              quantity: 1,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('should fail to create cart item without quantity', async () => {
      await expect(
        Cart.create({
          userId,
          items: [
            {
              productId: productId1,
            },
          ],
        })
      ).rejects.toThrow();
    });

    it('should set default addedAt timestamp for cart items', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 1,
          },
        ],
      });

      expect(cart.items[0].addedAt).toBeDefined();
      expect(cart.items[0].addedAt).toBeInstanceOf(Date);
    });
  });

  describe('Indexes', () => {
    it('should enforce unique constraint on userId', async () => {
      // Create first cart
      await Cart.create({
        userId,
        items: [],
      });

      // Try to create duplicate cart for same user
      await expect(
        Cart.create({
          userId,
          items: [],
        })
      ).rejects.toThrow();
    });

    it('should allow different users to have their own carts', async () => {
      const user2 = await User.create({
        email: 'user2@test.com',
        password: 'Password123',
        role: 'buyer',
      });

      const cart1 = await Cart.create({
        userId,
        items: [],
      });

      const cart2 = await Cart.create({
        userId: user2._id,
        items: [],
      });

      expect(cart1).toBeDefined();
      expect(cart2).toBeDefined();
      expect(cart1.userId).not.toEqual(cart2.userId);
    });
  });

  describe('Cart Operations', () => {
    it('should add items to cart', async () => {
      const cart = await Cart.create({
        userId,
        items: [],
      });

      cart.items.push({
        productId: productId1,
        quantity: 2,
        addedAt: new Date(),
      });

      await cart.save();

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart?.items).toHaveLength(1);
      expect(updatedCart?.items[0].productId).toEqual(productId1);
      expect(updatedCart?.items[0].quantity).toBe(2);
    });

    it('should update item quantity in cart', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 1,
          },
        ],
      });

      cart.items[0].quantity = 5;
      await cart.save();

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart?.items[0].quantity).toBe(5);
    });

    it('should remove item from cart', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 1,
          },
          {
            productId: productId2,
            quantity: 2,
          },
        ],
      });

      cart.items = cart.items.filter(
        (item) => !item.productId.equals(productId1)
      );
      await cart.save();

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart?.items).toHaveLength(1);
      expect(updatedCart?.items[0].productId).toEqual(productId2);
    });

    it('should clear all items from cart', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 1,
          },
          {
            productId: productId2,
            quantity: 2,
          },
        ],
      });

      cart.items = [];
      await cart.save();

      const updatedCart = await Cart.findById(cart._id);
      expect(updatedCart?.items).toHaveLength(0);
    });
  });

  describe('Querying', () => {
    it('should find cart by userId', async () => {
      await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 2,
          },
        ],
      });

      const cart = await Cart.findOne({ userId });

      expect(cart).toBeDefined();
      expect(cart?.userId).toEqual(userId);
      expect(cart?.items).toHaveLength(1);
    });

    it('should populate product information in cart items', async () => {
      const cart = await Cart.create({
        userId,
        items: [
          {
            productId: productId1,
            quantity: 2,
          },
        ],
      });

      const populatedCart = await Cart.findById(cart._id).populate(
        'items.productId'
      );

      expect(populatedCart?.items[0].productId).toBeDefined();
      expect((populatedCart?.items[0].productId as any).title.en).toBe(
        'Product 1'
      );
    });

    it('should populate user information', async () => {
      const cart = await Cart.create({
        userId,
        items: [],
      });

      const populatedCart = await Cart.findById(cart._id).populate('userId');

      expect(populatedCart?.userId).toBeDefined();
      expect((populatedCart?.userId as any).email).toBe('user@test.com');
    });
  });

  describe('Timestamps', () => {
    it('should update updatedAt when cart is modified', async () => {
      const cart = await Cart.create({
        userId,
        items: [],
      });

      const originalUpdatedAt = cart.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      cart.items.push({
        productId: productId1,
        quantity: 1,
        addedAt: new Date(),
      });
      await cart.save();

      expect(cart.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
