import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from '@jest/globals';
import Product from '../Product';
import User from '../User';

let mongoServer: MongoMemoryServer;

// Setup: Connect to in-memory MongoDB
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Cleanup: Disconnect and stop MongoDB
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Product Model', () => {
  let sellerId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a seller user for testing
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Test1234',
      role: 'seller',
      verificationStatus: 'approved',
    });
    sellerId = seller._id as mongoose.Types.ObjectId;
  });

  describe('Product Creation', () => {
    it('should create a product with all required fields', async () => {
      const productData = {
        title: {
          en: 'Handmade Pashmina Shawl',
          ne: 'हस्तनिर्मित पश्मिना शाल',
        },
        description: {
          en: 'Beautiful handmade pashmina shawl from Nepal',
          ne: 'नेपालबाट सुन्दर हस्तनिर्मित पश्मिना शाल',
        },
        price: 5000,
        category: 'clothing' as const,
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        sellerId,
      };

      const product = await Product.create(productData);

      expect(product).toBeDefined();
      expect(product.title.en).toBe(productData.title.en);
      expect(product.title.ne).toBe(productData.title.ne);
      expect(product.description.en).toBe(productData.description.en);
      expect(product.description.ne).toBe(productData.description.ne);
      expect(product.price).toBe(productData.price);
      expect(product.category).toBe(productData.category);
      expect(product.images).toEqual(productData.images);
      expect(product.inventory).toBe(productData.inventory);
      expect(product.sellerId.toString()).toBe(sellerId.toString());
    });

    it('should create a product with only English text (Nepali optional)', async () => {
      const productData = {
        title: {
          en: 'Organic Honey',
        },
        description: {
          en: 'Pure organic honey from Himalayan region',
        },
        price: 800,
        category: 'food' as const,
        images: ['https://example.com/honey.jpg'],
        inventory: 50,
        sellerId,
      };

      const product = await Product.create(productData);

      expect(product).toBeDefined();
      expect(product.title.en).toBe(productData.title.en);
      expect(product.title.ne).toBeUndefined();
      expect(product.description.en).toBe(productData.description.en);
      expect(product.description.ne).toBeUndefined();
    });

    it('should set default values for calculated fields', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      const product = await Product.create(productData);

      expect(product.averageRating).toBe(0);
      expect(product.reviewCount).toBe(0);
      expect(product.weightedRating).toBe(0);
      expect(product.viewCount).toBe(0);
      expect(product.purchaseCount).toBe(0);
      expect(product.isActive).toBe(true);
      expect(product.verificationStatus).toBe('pending');
    });

    it('should set timestamps on creation', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      const product = await Product.create(productData);

      expect(product.createdAt).toBeDefined();
      expect(product.updatedAt).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Product Validation', () => {
    it('should fail without required title', async () => {
      const productData = {
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without required description', async () => {
      const productData = {
        title: { en: 'Test Product' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without required price', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail with negative price', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: -100,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without required category', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail with invalid category', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'invalid' as any,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without images array', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail with empty images array', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: [],
        inventory: 5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without inventory', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail with negative inventory', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: -5,
        sellerId,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should fail without sellerId', async () => {
      const productData = {
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
      };

      await expect(Product.create(productData)).rejects.toThrow();
    });

    it('should accept valid categories', async () => {
      const categories = ['food', 'handicrafts', 'clothing', 'electronics', 'other'];

      for (const category of categories) {
        const productData = {
          title: { en: `Test ${category}` },
          description: { en: 'Test Description' },
          price: 1000,
          category: category as any,
          images: ['https://example.com/test.jpg'],
          inventory: 5,
          sellerId,
        };

        const product = await Product.create(productData);
        expect(product.category).toBe(category);
      }
    });

    it('should accept valid verification statuses', async () => {
      const statuses = ['pending', 'approved', 'rejected'];

      for (const status of statuses) {
        const productData = {
          title: { en: `Test ${status}` },
          description: { en: 'Test Description' },
          price: 1000,
          category: 'other' as const,
          images: ['https://example.com/test.jpg'],
          inventory: 5,
          sellerId,
          verificationStatus: status as any,
        };

        const product = await Product.create(productData);
        expect(product.verificationStatus).toBe(status);
      }
    });
  });

  describe('Product Updates', () => {
    it('should update product fields', async () => {
      const product = await Product.create({
        title: { en: 'Original Title' },
        description: { en: 'Original Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      product.title.en = 'Updated Title';
      product.price = 1500;
      product.inventory = 10;
      await product.save();

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct?.title.en).toBe('Updated Title');
      expect(updatedProduct?.price).toBe(1500);
      expect(updatedProduct?.inventory).toBe(10);
    });

    it('should update calculated fields', async () => {
      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      product.averageRating = 4.5;
      product.reviewCount = 10;
      product.weightedRating = 2.25;
      product.viewCount = 100;
      product.purchaseCount = 5;
      await product.save();

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct?.averageRating).toBe(4.5);
      expect(updatedProduct?.reviewCount).toBe(10);
      expect(updatedProduct?.weightedRating).toBe(2.25);
      expect(updatedProduct?.viewCount).toBe(100);
      expect(updatedProduct?.purchaseCount).toBe(5);
    });

    it('should update timestamps on modification', async () => {
      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      const originalUpdatedAt = product.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      product.price = 1500;
      await product.save();

      expect(product.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Product Queries', () => {
    beforeEach(async () => {
      // Create multiple products for testing queries
      await Product.create([
        {
          title: { en: 'Pashmina Shawl' },
          description: { en: 'Handmade pashmina' },
          price: 5000,
          category: 'clothing',
          images: ['https://example.com/shawl.jpg'],
          inventory: 10,
          sellerId,
          weightedRating: 4.5,
        },
        {
          title: { en: 'Organic Honey' },
          description: { en: 'Pure honey' },
          price: 800,
          category: 'food',
          images: ['https://example.com/honey.jpg'],
          inventory: 50,
          sellerId,
          weightedRating: 4.8,
        },
        {
          title: { en: 'Wooden Statue' },
          description: { en: 'Hand-carved statue' },
          price: 3000,
          category: 'handicrafts',
          images: ['https://example.com/statue.jpg'],
          inventory: 5,
          sellerId,
          weightedRating: 4.2,
        },
      ]);
    });

    it('should find products by category', async () => {
      const clothingProducts = await Product.find({ category: 'clothing' });
      expect(clothingProducts).toHaveLength(1);
      expect(clothingProducts[0].title.en).toBe('Pashmina Shawl');
    });

    it('should find products by seller', async () => {
      const sellerProducts = await Product.find({ sellerId });
      expect(sellerProducts).toHaveLength(3);
    });

    it('should sort products by weighted rating', async () => {
      const products = await Product.find().sort({ weightedRating: -1 });
      expect(products[0].title.en).toBe('Organic Honey');
      expect(products[1].title.en).toBe('Pashmina Shawl');
      expect(products[2].title.en).toBe('Wooden Statue');
    });

    it('should filter products by price range', async () => {
      const products = await Product.find({
        price: { $gte: 1000, $lte: 4000 },
      });
      expect(products).toHaveLength(1);
      expect(products[0].title.en).toBe('Wooden Statue');
    });

    it('should find active products', async () => {
      const activeProducts = await Product.find({ isActive: true });
      expect(activeProducts).toHaveLength(3);
    });
  });

  describe('Product Indexes', () => {
    it('should have text index on title and description', async () => {
      const indexes = await Product.collection.getIndexes();
      const textIndex = Object.values(indexes).find((index: any) =>
        index.some((field: any) => field[1] === 'text')
      );
      expect(textIndex).toBeDefined();
    });

    it('should have compound index on category and weightedRating', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes['category_1_weightedRating_-1']).toBeDefined();
    });

    it('should have index on sellerId and createdAt', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes['sellerId_1_createdAt_-1']).toBeDefined();
    });

    it('should have index on verificationStatus', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes['verificationStatus_1']).toBeDefined();
    });

    it('should have index on weightedRating', async () => {
      const indexes = await Product.collection.getIndexes();
      expect(indexes['weightedRating_-1']).toBeDefined();
    });
  });

  describe('Multilingual Support', () => {
    it('should store both English and Nepali text', async () => {
      const product = await Product.create({
        title: {
          en: 'Handmade Carpet',
          ne: 'हस्तनिर्मित कार्पेट',
        },
        description: {
          en: 'Beautiful handmade carpet',
          ne: 'सुन्दर हस्तनिर्मित कार्पेट',
        },
        price: 10000,
        category: 'handicrafts' as const,
        images: ['https://example.com/carpet.jpg'],
        inventory: 3,
        sellerId,
      });

      expect(product.title.en).toBe('Handmade Carpet');
      expect(product.title.ne).toBe('हस्तनिर्मित कार्पेट');
      expect(product.description.en).toBe('Beautiful handmade carpet');
      expect(product.description.ne).toBe('सुन्दर हस्तनिर्मित कार्पेट');
    });

    it('should allow updating Nepali text separately', async () => {
      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      product.title.ne = 'परीक्षण उत्पादन';
      product.description.ne = 'परीक्षण विवरण';
      await product.save();

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct?.title.ne).toBe('परीक्षण उत्पादन');
      expect(updatedProduct?.description.ne).toBe('परीक्षण विवरण');
    });
  });

  describe('Product Deletion', () => {
    it('should delete a product', async () => {
      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      await Product.findByIdAndDelete(product._id);

      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct).toBeNull();
    });

    it('should soft delete by setting isActive to false', async () => {
      const product = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'other' as const,
        images: ['https://example.com/test.jpg'],
        inventory: 5,
        sellerId,
      });

      product.isActive = false;
      await product.save();

      const inactiveProduct = await Product.findById(product._id);
      expect(inactiveProduct?.isActive).toBe(false);
    });
  });
});
