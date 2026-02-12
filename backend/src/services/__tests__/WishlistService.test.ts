import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WishlistService } from '../WishlistService.js';
import Wishlist from '../../models/Wishlist.js';
import Product from '../../models/Product.js';
import Cart from '../../models/Cart.js';
import User from '../../models/User.js';

describe('WishlistService', () => {
  let mongoServer: MongoMemoryServer;
  let wishlistService: WishlistService;
  let testUserId: mongoose.Types.ObjectId;
  let testProductId: mongoose.Types.ObjectId;
  let testProduct2Id: mongoose.Types.ObjectId;

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
    await Wishlist.deleteMany({});
    await Product.deleteMany({});
    await Cart.deleteMany({});
    await User.deleteMany({});

    wishlistService = new WishlistService();

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
    const product1 = await Product.create({
      title: { en: 'Test Product 1', ne: 'परीक्षण उत्पादन १' },
      description: { en: 'Test description 1', ne: 'परीक्षण विवरण १' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: new mongoose.Types.ObjectId(),
      verificationStatus: 'approved',
      isActive: true,
    });
    testProductId = product1._id as mongoose.Types.ObjectId;

    const product2 = await Product.create({
      title: { en: 'Test Product 2', ne: 'परीक्षण उत्पादन २' },
      description: { en: 'Test description 2', ne: 'परीक्षण विवरण २' },
      price: 2000,
      category: 'clothing',
      images: ['image2.jpg'],
      inventory: 5,
      sellerId: new mongoose.Types.ObjectId(),
      verificationStatus: 'approved',
      isActive: true,
    });
    testProduct2Id = product2._id as mongoose.Types.ObjectId;
  });

  describe('getWishlist', () => {
    it('should return empty wishlist for new user', async () => {
      const wishlist = await wishlistService.getWishlist(testUserId.toString());

      expect(wishlist).toBeDefined();
      expect(wishlist.userId.toString()).toBe(testUserId.toString());
      expect(wishlist.products).toHaveLength(0);
    });

    it('should return existing wishlist with products', async () => {
      // Create wishlist with products
      await Wishlist.create({
        userId: testUserId,
        products: [testProductId, testProduct2Id],
      });

      const wishlist = await wishlistService.getWishlist(testUserId.toString());

      expect(wishlist).toBeDefined();
      expect(wishlist.products).toHaveLength(2);
      expect(wishlist.products[0]).toHaveProperty('title');
      expect(wishlist.products[0]).toHaveProperty('price');
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        wishlistService.getWishlist('invalid-id')
      ).rejects.toThrow('Invalid user ID');
    });
  });

  describe('addToWishlist', () => {
    it('should add product to wishlist', async () => {
      const wishlist = await wishlistService.addToWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      expect(wishlist.products).toHaveLength(1);
      expect(wishlist.products[0]._id.toString()).toBe(testProductId.toString());
    });

    it('should create wishlist if it does not exist', async () => {
      const wishlistBefore = await Wishlist.findOne({ userId: testUserId });
      expect(wishlistBefore).toBeNull();

      await wishlistService.addToWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      const wishlistAfter = await Wishlist.findOne({ userId: testUserId });
      expect(wishlistAfter).toBeDefined();
      expect(wishlistAfter!.products).toHaveLength(1);
    });

    it('should prevent duplicate products in wishlist', async () => {
      // Add product first time
      await wishlistService.addToWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      // Try to add same product again
      await expect(
        wishlistService.addToWishlist(
          testUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Product already in wishlist');
    });

    it('should allow adding multiple different products', async () => {
      await wishlistService.addToWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      const wishlist = await wishlistService.addToWishlist(
        testUserId.toString(),
        testProduct2Id.toString()
      );

      expect(wishlist.products).toHaveLength(2);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        wishlistService.addToWishlist('invalid-id', testProductId.toString())
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        wishlistService.addToWishlist(testUserId.toString(), 'invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      await expect(
        wishlistService.addToWishlist(
          testUserId.toString(),
          fakeProductId.toString()
        )
      ).rejects.toThrow('Product not found');
    });

    it('should throw error for inactive product', async () => {
      await Product.findByIdAndUpdate(testProductId, { isActive: false });

      await expect(
        wishlistService.addToWishlist(
          testUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Product is not available');
    });

    it('should throw error for unapproved product', async () => {
      await Product.findByIdAndUpdate(testProductId, {
        verificationStatus: 'pending',
      });

      await expect(
        wishlistService.addToWishlist(
          testUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Product is not approved');
    });
  });

  describe('removeFromWishlist', () => {
    beforeEach(async () => {
      // Create wishlist with products
      await Wishlist.create({
        userId: testUserId,
        products: [testProductId, testProduct2Id],
      });
    });

    it('should remove product from wishlist', async () => {
      const wishlist = await wishlistService.removeFromWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      expect(wishlist.products).toHaveLength(1);
      expect(wishlist.products[0]._id.toString()).toBe(testProduct2Id.toString());
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        wishlistService.removeFromWishlist('invalid-id', testProductId.toString())
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        wishlistService.removeFromWishlist(testUserId.toString(), 'invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error if wishlist does not exist', async () => {
      const newUserId = new mongoose.Types.ObjectId();
      await expect(
        wishlistService.removeFromWishlist(
          newUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Wishlist not found');
    });

    it('should throw error if product not in wishlist', async () => {
      const newProductId = new mongoose.Types.ObjectId();
      await expect(
        wishlistService.removeFromWishlist(
          testUserId.toString(),
          newProductId.toString()
        )
      ).rejects.toThrow('Product not found in wishlist');
    });

    it('should handle removing last product from wishlist', async () => {
      // Remove first product
      await wishlistService.removeFromWishlist(
        testUserId.toString(),
        testProductId.toString()
      );

      // Remove second product
      const wishlist = await wishlistService.removeFromWishlist(
        testUserId.toString(),
        testProduct2Id.toString()
      );

      expect(wishlist.products).toHaveLength(0);
    });
  });

  describe('moveToCart', () => {
    beforeEach(async () => {
      // Create wishlist with products
      await Wishlist.create({
        userId: testUserId,
        products: [testProductId, testProduct2Id],
      });
    });

    it('should move product from wishlist to cart', async () => {
      const wishlist = await wishlistService.moveToCart(
        testUserId.toString(),
        testProductId.toString()
      );

      // Check wishlist
      expect(wishlist.products).toHaveLength(1);
      expect(wishlist.products[0]._id.toString()).toBe(testProduct2Id.toString());

      // Check cart
      const cart = await Cart.findOne({ userId: testUserId });
      expect(cart).toBeDefined();
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].productId.toString()).toBe(testProductId.toString());
      expect(cart!.items[0].quantity).toBe(1);
    });

    it('should move product with specified quantity', async () => {
      await wishlistService.moveToCart(
        testUserId.toString(),
        testProductId.toString(),
        3
      );

      // Check cart quantity
      const cart = await Cart.findOne({ userId: testUserId });
      expect(cart!.items[0].quantity).toBe(3);
    });

    it('should create cart if it does not exist', async () => {
      const cartBefore = await Cart.findOne({ userId: testUserId });
      expect(cartBefore).toBeNull();

      await wishlistService.moveToCart(
        testUserId.toString(),
        testProductId.toString()
      );

      const cartAfter = await Cart.findOne({ userId: testUserId });
      expect(cartAfter).toBeDefined();
    });

    it('should update quantity if product already in cart', async () => {
      // Add product to cart first
      await Cart.create({
        userId: testUserId,
        items: [
          {
            productId: testProductId,
            quantity: 2,
            addedAt: new Date(),
          },
        ],
      });

      await wishlistService.moveToCart(
        testUserId.toString(),
        testProductId.toString(),
        3
      );

      // Check cart quantity is updated
      const cart = await Cart.findOne({ userId: testUserId });
      expect(cart!.items).toHaveLength(1);
      expect(cart!.items[0].quantity).toBe(5); // 2 + 3
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        wishlistService.moveToCart('invalid-id', testProductId.toString())
      ).rejects.toThrow('Invalid user ID');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        wishlistService.moveToCart(testUserId.toString(), 'invalid-id')
      ).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for invalid quantity', async () => {
      await expect(
        wishlistService.moveToCart(testUserId.toString(), testProductId.toString(), 0)
      ).rejects.toThrow('Quantity must be at least 1');

      await expect(
        wishlistService.moveToCart(testUserId.toString(), testProductId.toString(), -1)
      ).rejects.toThrow('Quantity must be at least 1');
    });

    it('should throw error if wishlist does not exist', async () => {
      const newUserId = new mongoose.Types.ObjectId();
      await expect(
        wishlistService.moveToCart(
          newUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Wishlist not found');
    });

    it('should throw error if product not in wishlist', async () => {
      const newProductId = new mongoose.Types.ObjectId();
      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          newProductId.toString()
        )
      ).rejects.toThrow('Product not found in wishlist');
    });

    it('should throw error for non-existent product', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      
      // Add fake product to wishlist
      await Wishlist.findOneAndUpdate(
        { userId: testUserId },
        { $push: { products: fakeProductId } }
      );

      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          fakeProductId.toString()
        )
      ).rejects.toThrow('Product not found');
    });

    it('should throw error for inactive product', async () => {
      await Product.findByIdAndUpdate(testProductId, { isActive: false });

      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Product is not available');
    });

    it('should throw error for unapproved product', async () => {
      await Product.findByIdAndUpdate(testProductId, {
        verificationStatus: 'pending',
      });

      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          testProductId.toString()
        )
      ).rejects.toThrow('Product is not approved for sale');
    });

    it('should throw error if quantity exceeds inventory', async () => {
      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          testProductId.toString(),
          20 // inventory is 10
        )
      ).rejects.toThrow('Only 10 items available in stock');
    });

    it('should throw error if combined quantity exceeds inventory', async () => {
      // Add product to cart with quantity 8
      await Cart.create({
        userId: testUserId,
        items: [
          {
            productId: testProductId,
            quantity: 8,
            addedAt: new Date(),
          },
        ],
      });

      // Try to move 5 more (total would be 13, but inventory is 10)
      await expect(
        wishlistService.moveToCart(
          testUserId.toString(),
          testProductId.toString(),
          5
        )
      ).rejects.toThrow('Only 10 items available in stock');
    });
  });
});
