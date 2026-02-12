import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProductService } from '../ProductService.js';
import Product, { IProduct } from '../../models/Product.js';
import User, { IUser } from '../../models/User.js';

describe('ProductService', () => {
  let mongoServer: MongoMemoryServer;
  let productService: ProductService;
  let approvedSeller: IUser;
  let pendingSeller: IUser;
  let buyer: IUser;

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

    productService = new ProductService();

    // Create test users
    approvedSeller = await User.create({
      email: 'approved@seller.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
      firstName: 'Approved',
      lastName: 'Seller',
      businessName: 'Approved Business',
    });

    pendingSeller = await User.create({
      email: 'pending@seller.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'pending',
      firstName: 'Pending',
      lastName: 'Seller',
      businessName: 'Pending Business',
    });

    buyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      verificationStatus: 'approved',
      firstName: 'Test',
      lastName: 'Buyer',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  describe('createProduct', () => {
    const validProductData = {
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts' as const,
      images: ['https://example.com/image1.jpg'],
      inventory: 10,
    };

    it('should create a product with valid data and approved seller', async () => {
      const product = await productService.createProduct(
        validProductData,
        approvedSeller._id.toString()
      );

      expect(product).toBeDefined();
      expect(product.title.en).toBe('Test Product');
      expect(product.price).toBe(1000);
      expect(product.sellerId.toString()).toBe(approvedSeller._id.toString());
      expect(product.verificationStatus).toBe('pending');
      expect(product.averageRating).toBe(0);
      expect(product.reviewCount).toBe(0);
      expect(product.weightedRating).toBe(0);
      expect(product.isActive).toBe(true);
    });

    it('should reject product creation by pending seller', async () => {
      await expect(
        productService.createProduct(
          validProductData,
          pendingSeller._id.toString()
        )
      ).rejects.toThrow(/verification is pending/i);
    });

    it('should reject product creation by non-seller', async () => {
      await expect(
        productService.createProduct(validProductData, buyer._id.toString())
      ).rejects.toThrow(/not a seller/i);
    });

    it('should reject product creation with missing title', async () => {
      const invalidData = { ...validProductData, title: { en: '' } };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/title.*required/i);
    });

    it('should reject product creation with missing description', async () => {
      const invalidData = { ...validProductData, description: { en: '' } };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/description.*required/i);
    });

    it('should reject product creation with missing price', async () => {
      const invalidData = { ...validProductData, price: undefined as any };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/price.*required/i);
    });

    it('should reject product creation with negative price', async () => {
      const invalidData = { ...validProductData, price: -100 };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/price.*negative/i);
    });

    it('should reject product creation with missing category', async () => {
      const invalidData = { ...validProductData, category: undefined as any };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/category.*required/i);
    });

    it('should reject product creation with no images', async () => {
      const invalidData = { ...validProductData, images: [] };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/image.*required/i);
    });

    it('should reject product creation with missing inventory', async () => {
      const invalidData = { ...validProductData, inventory: undefined as any };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/inventory.*required/i);
    });

    it('should reject product creation with negative inventory', async () => {
      const invalidData = { ...validProductData, inventory: -5 };
      await expect(
        productService.createProduct(invalidData, approvedSeller._id.toString())
      ).rejects.toThrow(/inventory.*negative/i);
    });

    it('should reject product creation with non-existent seller', async () => {
      const fakeSellerId = new mongoose.Types.ObjectId().toString();
      await expect(
        productService.createProduct(validProductData, fakeSellerId)
      ).rejects.toThrow(/seller not found/i);
    });
  });

  describe('getProductById', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
      });
    });

    it('should retrieve product by ID with seller info', async () => {
      const product = await productService.getProductById(
        testProduct._id.toString()
      );

      expect(product).toBeDefined();
      expect(product._id.toString()).toBe(testProduct._id.toString());
      expect(product.title.en).toBe('Test Product');
      
      // Check that seller info is populated
      const sellerInfo = product.sellerId as any;
      expect(sellerInfo.firstName).toBe('Approved');
      expect(sellerInfo.businessName).toBe('Approved Business');
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.getProductById('invalid-id')
      ).rejects.toThrow(/invalid product id/i);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(productService.getProductById(fakeId)).rejects.toThrow(
        /product not found/i
      );
    });
  });

  describe('updateProduct', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
      });
    });

    it('should update product with valid data and correct owner', async () => {
      const updates = {
        title: { en: 'Updated Product' },
        price: 1500,
        inventory: 20,
      };

      const updatedProduct = await productService.updateProduct(
        testProduct._id.toString(),
        updates,
        approvedSeller._id.toString()
      );

      expect(updatedProduct.title.en).toBe('Updated Product');
      expect(updatedProduct.price).toBe(1500);
      expect(updatedProduct.inventory).toBe(20);
    });

    it('should reject update by non-owner', async () => {
      const otherSeller = await User.create({
        email: 'other@seller.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const updates = { price: 1500 };

      await expect(
        productService.updateProduct(
          testProduct._id.toString(),
          updates,
          otherSeller._id.toString()
        )
      ).rejects.toThrow(/permission/i);
    });

    it('should reject update with negative price', async () => {
      const updates = { price: -100 };

      await expect(
        productService.updateProduct(
          testProduct._id.toString(),
          updates,
          approvedSeller._id.toString()
        )
      ).rejects.toThrow(/price.*negative/i);
    });

    it('should reject update with negative inventory', async () => {
      const updates = { inventory: -5 };

      await expect(
        productService.updateProduct(
          testProduct._id.toString(),
          updates,
          approvedSeller._id.toString()
        )
      ).rejects.toThrow(/inventory.*negative/i);
    });

    it('should reject update with empty images array', async () => {
      const updates = { images: [] };

      await expect(
        productService.updateProduct(
          testProduct._id.toString(),
          updates,
          approvedSeller._id.toString()
        )
      ).rejects.toThrow(/image.*required/i);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.updateProduct(
          'invalid-id',
          { price: 1500 },
          approvedSeller._id.toString()
        )
      ).rejects.toThrow(/invalid product id/i);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        productService.updateProduct(
          fakeId,
          { price: 1500 },
          approvedSeller._id.toString()
        )
      ).rejects.toThrow(/product not found/i);
    });
  });

  describe('deleteProduct', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['https://example.com/image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
      });
    });

    it('should delete product with correct owner', async () => {
      await productService.deleteProduct(
        testProduct._id.toString(),
        approvedSeller._id.toString()
      );

      const deletedProduct = await Product.findById(testProduct._id);
      expect(deletedProduct).toBeNull();
    });

    it('should reject deletion by non-owner', async () => {
      const otherSeller = await User.create({
        email: 'other@seller.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      await expect(
        productService.deleteProduct(
          testProduct._id.toString(),
          otherSeller._id.toString()
        )
      ).rejects.toThrow(/permission/i);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.deleteProduct('invalid-id', approvedSeller._id.toString())
      ).rejects.toThrow(/invalid product id/i);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(
        productService.deleteProduct(fakeId, approvedSeller._id.toString())
      ).rejects.toThrow(/product not found/i);
    });
  });

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create multiple products for testing
      await Product.create([
        {
          title: { en: 'Handicraft 1' },
          description: { en: 'Description 1' },
          price: 1000,
          category: 'handicrafts',
          images: ['image1.jpg'],
          inventory: 10,
          sellerId: approvedSeller._id,
          averageRating: 4.5,
          reviewCount: 10,
          weightedRating: 2.25,
          verificationStatus: 'approved',
          isActive: true,
        },
        {
          title: { en: 'Handicraft 2' },
          description: { en: 'Description 2' },
          price: 2000,
          category: 'handicrafts',
          images: ['image2.jpg'],
          inventory: 5,
          sellerId: approvedSeller._id,
          averageRating: 4.0,
          reviewCount: 5,
          weightedRating: 1.33,
          verificationStatus: 'approved',
          isActive: true,
        },
        {
          title: { en: 'Food Item' },
          description: { en: 'Description 3' },
          price: 500,
          category: 'food',
          images: ['image3.jpg'],
          inventory: 20,
          sellerId: approvedSeller._id,
          averageRating: 5.0,
          reviewCount: 20,
          weightedRating: 3.33,
          verificationStatus: 'approved',
          isActive: true,
        },
        {
          title: { en: 'Inactive Product' },
          description: { en: 'Description 4' },
          price: 1500,
          category: 'clothing',
          images: ['image4.jpg'],
          inventory: 8,
          sellerId: approvedSeller._id,
          isActive: false,
        },
      ]);
    });

    it('should return all active products by default', async () => {
      const result = await productService.getProducts();

      expect(result.products).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.currentPage).toBe(1);
    });

    it('should filter products by category', async () => {
      const result = await productService.getProducts({ category: 'handicrafts' });

      expect(result.products).toHaveLength(2);
      result.products.forEach((product) => {
        expect(product.category).toBe('handicrafts');
      });
    });

    it('should filter products by price range', async () => {
      const result = await productService.getProducts({
        minPrice: 1000,
        maxPrice: 2000,
      });

      expect(result.products).toHaveLength(2);
      result.products.forEach((product) => {
        expect(product.price).toBeGreaterThanOrEqual(1000);
        expect(product.price).toBeLessThanOrEqual(2000);
      });
    });

    it('should filter products by minimum rating', async () => {
      const result = await productService.getProducts({ minRating: 4.5 });

      expect(result.products).toHaveLength(2);
      result.products.forEach((product) => {
        expect(product.averageRating).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should sort products by price ascending', async () => {
      const result = await productService.getProducts({}, 'price-asc');

      expect(result.products[0].price).toBe(500);
      expect(result.products[1].price).toBe(1000);
      expect(result.products[2].price).toBe(2000);
    });

    it('should sort products by price descending', async () => {
      const result = await productService.getProducts({}, 'price-desc');

      expect(result.products[0].price).toBe(2000);
      expect(result.products[1].price).toBe(1000);
      expect(result.products[2].price).toBe(500);
    });

    it('should sort products by rating', async () => {
      const result = await productService.getProducts({}, 'rating');

      expect(result.products[0].averageRating).toBe(5.0);
      expect(result.products[1].averageRating).toBe(4.5);
      expect(result.products[2].averageRating).toBe(4.0);
    });

    it('should sort products by weighted rating (default)', async () => {
      const result = await productService.getProducts({}, 'weighted-rating');

      // Food Item has highest weighted rating (3.33)
      expect(result.products[0].title.en).toBe('Food Item');
      // Handicraft 1 has second highest (2.25)
      expect(result.products[1].title.en).toBe('Handicraft 1');
      // Handicraft 2 has lowest (1.33)
      expect(result.products[2].title.en).toBe('Handicraft 2');
    });

    it('should handle pagination correctly', async () => {
      const result = await productService.getProducts({}, 'weighted-rating', 1, 2);

      expect(result.products).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.totalCount).toBe(3);
    });

    it('should return second page correctly', async () => {
      const result = await productService.getProducts({}, 'weighted-rating', 2, 2);

      expect(result.products).toHaveLength(1);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should combine multiple filters', async () => {
      const result = await productService.getProducts({
        category: 'handicrafts',
        minPrice: 1500,
        minRating: 3.0,
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].title.en).toBe('Handicraft 2');
    });
  });

  describe('calculateWeightedRating', () => {
    it('should calculate weighted rating correctly', () => {
      const rating1 = productService.calculateWeightedRating(4.5, 10);
      expect(rating1).toBeCloseTo(2.25, 2);

      const rating2 = productService.calculateWeightedRating(5.0, 20);
      expect(rating2).toBeCloseTo(3.33, 2);

      const rating3 = productService.calculateWeightedRating(4.0, 5);
      expect(rating3).toBeCloseTo(1.33, 2);
    });

    it('should return 0 for products with no reviews', () => {
      const rating = productService.calculateWeightedRating(0, 0);
      expect(rating).toBe(0);
    });

    it('should favor products with more reviews when ratings are similar', () => {
      const rating1 = productService.calculateWeightedRating(4.5, 5);
      const rating2 = productService.calculateWeightedRating(4.5, 20);

      expect(rating2).toBeGreaterThan(rating1);
    });
  });

  describe('getRelatedProducts', () => {
    let testProduct: IProduct;
    let otherSeller: IUser;

    beforeEach(async () => {
      otherSeller = await User.create({
        email: 'other@seller.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      // Create main product
      testProduct = await Product.create({
        title: { en: 'Main Product' },
        description: { en: 'Main Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      // Create related products
      await Product.create([
        {
          title: { en: 'Same Category 1' },
          description: { en: 'Description' },
          price: 1200,
          category: 'handicrafts',
          images: ['image2.jpg'],
          inventory: 5,
          sellerId: otherSeller._id,
          verificationStatus: 'approved',
          isActive: true,
          weightedRating: 2.0,
        },
        {
          title: { en: 'Same Seller' },
          description: { en: 'Description' },
          price: 800,
          category: 'food',
          images: ['image3.jpg'],
          inventory: 15,
          sellerId: approvedSeller._id,
          verificationStatus: 'approved',
          isActive: true,
          weightedRating: 1.5,
        },
        {
          title: { en: 'Different Category and Seller' },
          description: { en: 'Description' },
          price: 2000,
          category: 'clothing',
          images: ['image4.jpg'],
          inventory: 8,
          sellerId: otherSeller._id,
          verificationStatus: 'approved',
          isActive: true,
          weightedRating: 1.0,
        },
      ]);
    });

    it('should return related products from same category or seller', async () => {
      const relatedProducts = await productService.getRelatedProducts(
        testProduct._id.toString()
      );

      expect(relatedProducts.length).toBeGreaterThan(0);
      expect(relatedProducts.length).toBeLessThanOrEqual(10);

      // Should not include the main product itself
      relatedProducts.forEach((product) => {
        expect(product._id.toString()).not.toBe(testProduct._id.toString());
      });
    });

    it('should sort related products by weighted rating', async () => {
      const relatedProducts = await productService.getRelatedProducts(
        testProduct._id.toString()
      );

      // Check that products are sorted by weighted rating descending
      for (let i = 0; i < relatedProducts.length - 1; i++) {
        expect(relatedProducts[i].weightedRating).toBeGreaterThanOrEqual(
          relatedProducts[i + 1].weightedRating
        );
      }
    });

    it('should respect the limit parameter', async () => {
      const relatedProducts = await productService.getRelatedProducts(
        testProduct._id.toString(),
        2
      );

      expect(relatedProducts).toHaveLength(2);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.getRelatedProducts('invalid-id')
      ).rejects.toThrow(/invalid product id/i);
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(productService.getRelatedProducts(fakeId)).rejects.toThrow(
        /product not found/i
      );
    });
  });

  describe('updateProductRating', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
      });
    });

    it('should update product rating and calculate weighted rating', async () => {
      await productService.updateProductRating(
        testProduct._id.toString(),
        4.5,
        10
      );

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.averageRating).toBe(4.5);
      expect(updatedProduct?.reviewCount).toBe(10);
      expect(updatedProduct?.weightedRating).toBeCloseTo(2.25, 2);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.updateProductRating('invalid-id', 4.5, 10)
      ).rejects.toThrow(/invalid product id/i);
    });
  });

  describe('incrementViewCount', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
        viewCount: 5,
      });
    });

    it('should increment view count by 1', async () => {
      await productService.incrementViewCount(testProduct._id.toString());

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.viewCount).toBe(6);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.incrementViewCount('invalid-id')
      ).rejects.toThrow(/invalid product id/i);
    });
  });

  describe('incrementPurchaseCount', () => {
    let testProduct: IProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        title: { en: 'Test Product' },
        description: { en: 'Test Description' },
        price: 1000,
        category: 'handicrafts',
        images: ['image1.jpg'],
        inventory: 10,
        sellerId: approvedSeller._id,
        purchaseCount: 10,
      });
    });

    it('should increment purchase count by specified quantity', async () => {
      await productService.incrementPurchaseCount(testProduct._id.toString(), 3);

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.purchaseCount).toBe(13);
    });

    it('should increment purchase count by 1 if no quantity specified', async () => {
      await productService.incrementPurchaseCount(testProduct._id.toString());

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.purchaseCount).toBe(11);
    });

    it('should throw error for invalid product ID', async () => {
      await expect(
        productService.incrementPurchaseCount('invalid-id', 1)
      ).rejects.toThrow(/invalid product id/i);
    });
  });
});
