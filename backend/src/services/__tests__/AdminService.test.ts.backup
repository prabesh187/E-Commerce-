import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SellerService } from '../SellerService.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

describe('SellerService', () => {
  let mongoServer: MongoMemoryServer;
  let sellerService: SellerService;
  let testBuyer: any;
  let testSeller: any;
  let testProduct1: any;
  let testProduct2: any;

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
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    sellerService = new SellerService();

    // Create test buyer
    testBuyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
      verificationStatus: 'approved',
    });

    // Create test seller
    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
      businessName: 'Test Business',
      verificationStatus: 'approved',
    });

    // Create test products
    testProduct1 = await Product.create({
      title: { en: 'Test Product 1', ne: 'परीक्षण उत्पादन 1' },
      description: { en: 'Test description 1', ne: 'परीक्षण विवरण 1' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: testSeller._id,
      verificationStatus: 'approved',
      isActive: true,
    });

    testProduct2 = await Product.create({
      title: { en: 'Test Product 2', ne: 'परीक्षण उत्पादन 2' },
      description: { en: 'Test description 2', ne: 'परीक्षण विवरण 2' },
      price: 500,
      category: 'food',
      images: ['image2.jpg'],
      inventory: 20,
      sellerId: testSeller._id,
      verificationStatus: 'approved',
      isActive: true,
    });
  });

  afterEach(async () => {
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
  });

  describe('getSellerDashboard', () => {
    beforeEach(async () => {
      // Create test orders
      await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 2,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 2000,
        totalAmount: 2000,
        status: 'delivered',
      });

      await Order.create({
        orderNumber: 'MN-2024-000002',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct2._id,
            title: 'Test Product 2',
            price: 500,
            quantity: 3,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 1500,
        totalAmount: 1500,
        status: 'pending',
      });

      await Order.create({
        orderNumber: 'MN-2024-000003',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'khalti',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'confirmed',
      });
    });

    it('should calculate total sales correctly', async () => {
      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      // Total sales: 2 + 3 + 1 = 6 items
      expect(dashboard.totalSales).toBe(6);
    });

    it('should calculate total revenue correctly', async () => {
      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      // Total revenue: (1000*2) + (500*3) + (1000*1) = 4500
      expect(dashboard.totalRevenue).toBe(4500);
    });

    it('should count orders by status correctly', async () => {
      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      expect(dashboard.totalOrders).toBe(3);
      expect(dashboard.pendingOrders).toBe(1);
      expect(dashboard.confirmedOrders).toBe(1);
      expect(dashboard.deliveredOrders).toBe(1);
      expect(dashboard.shippedOrders).toBe(0);
    });

    it('should identify popular products correctly', async () => {
      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      expect(dashboard.popularProducts).toHaveLength(2);
      
      // Product 1 should be most popular (3 total sales)
      expect(dashboard.popularProducts[0].title).toBe('Test Product 1');
      expect(dashboard.popularProducts[0].salesCount).toBe(3);
      expect(dashboard.popularProducts[0].revenue).toBe(3000);

      // Product 2 should be second (3 sales)
      expect(dashboard.popularProducts[1].title).toBe('Test Product 2');
      expect(dashboard.popularProducts[1].salesCount).toBe(3);
      expect(dashboard.popularProducts[1].revenue).toBe(1500);
    });

    it('should return recent orders', async () => {
      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      expect(dashboard.recentOrders).toHaveLength(3);
      // Should be sorted by creation date (most recent first)
      expect(dashboard.recentOrders[0].orderNumber).toBe('MN-2024-000003');
    });

    it('should exclude cancelled orders from calculations', async () => {
      // Create a cancelled order
      await Order.create({
        orderNumber: 'MN-2024-000004',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 5,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 5000,
        totalAmount: 5000,
        status: 'cancelled',
      });

      const dashboard = await sellerService.getSellerDashboard(testSeller._id.toString());

      // Should not include cancelled order in calculations
      expect(dashboard.totalSales).toBe(6); // Not 11
      expect(dashboard.totalRevenue).toBe(4500); // Not 9500
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        sellerService.getSellerDashboard('invalid-id')
      ).rejects.toThrow('Invalid seller ID');
    });

    it('should return zero values for seller with no orders', async () => {
      const newSeller = await User.create({
        email: 'newseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const dashboard = await sellerService.getSellerDashboard(newSeller._id.toString());

      expect(dashboard.totalSales).toBe(0);
      expect(dashboard.totalRevenue).toBe(0);
      expect(dashboard.totalOrders).toBe(0);
      expect(dashboard.popularProducts).toHaveLength(0);
      expect(dashboard.recentOrders).toHaveLength(0);
    });
  });

  describe('getSellerProducts', () => {
    it('should return seller\'s products with pagination', async () => {
      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      expect(result.products).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(2);
    });

    it('should filter by verification status', async () => {
      // Create a pending product
      await Product.create({
        title: { en: 'Pending Product' },
        description: { en: 'Pending description' },
        price: 750,
        category: 'clothing',
        images: ['image3.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'pending',
        isActive: true,
      });

      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        { verificationStatus: 'pending' },
        1,
        10
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].verificationStatus).toBe('pending');
    });

    it('should filter by active status', async () => {
      testProduct1.isActive = false;
      await testProduct1.save();

      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        { isActive: false },
        1,
        10
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].isActive).toBe(false);
    });

    it('should filter by category', async () => {
      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        { category: 'food' },
        1,
        10
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].category).toBe('food');
    });

    it('should filter by price range', async () => {
      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        { minPrice: 600, maxPrice: 1500 },
        1,
        10
      );

      expect(result.products).toHaveLength(1);
      expect(result.products[0].price).toBe(1000);
    });

    it('should sort products by creation date (newest first)', async () => {
      const result = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      // testProduct2 was created after testProduct1
      expect(result.products[0]._id.toString()).toBe(testProduct2._id.toString());
    });

    it('should handle pagination correctly', async () => {
      // Create more products
      for (let i = 0; i < 15; i++) {
        await Product.create({
          title: { en: `Product ${i}` },
          description: { en: `Description ${i}` },
          price: 100 * (i + 1),
          category: 'other',
          images: [`image${i}.jpg`],
          inventory: 10,
          sellerId: testSeller._id,
          verificationStatus: 'approved',
          isActive: true,
        });
      }

      const page1 = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      const page2 = await sellerService.getSellerProducts(
        testSeller._id.toString(),
        {},
        2,
        10
      );

      expect(page1.products).toHaveLength(10);
      expect(page2.products).toHaveLength(7); // 17 total - 10 on page 1
      expect(page1.totalPages).toBe(2);
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        sellerService.getSellerProducts('invalid-id')
      ).rejects.toThrow('Invalid seller ID');
    });

    it('should return empty array for seller with no products', async () => {
      const newSeller = await User.create({
        email: 'newseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const result = await sellerService.getSellerProducts(
        newSeller._id.toString(),
        {},
        1,
        10
      );

      expect(result.products).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getSellerOrders', () => {
    beforeEach(async () => {
      // Create test orders with different statuses
      await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'pending',
      });

      await Order.create({
        orderNumber: 'MN-2024-000002',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct2._id,
            title: 'Test Product 2',
            price: 500,
            quantity: 2,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        paymentStatus: 'completed',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'delivered',
      });
    });

    it('should return seller\'s orders with pagination', async () => {
      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      expect(result.orders).toHaveLength(2);
      expect(result.currentPage).toBe(1);
      expect(result.totalCount).toBe(2);
    });

    it('should filter by order status', async () => {
      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        { status: 'pending' },
        1,
        10
      );

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].status).toBe('pending');
    });

    it('should filter by payment status', async () => {
      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        { paymentStatus: 'completed' },
        1,
        10
      );

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].paymentStatus).toBe('completed');
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        { startDate: yesterday, endDate: tomorrow },
        1,
        10
      );

      expect(result.orders).toHaveLength(2);
    });

    it('should sort orders by creation date (newest first)', async () => {
      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      expect(result.orders[0].orderNumber).toBe('MN-2024-000002');
    });

    it('should populate buyer and product information', async () => {
      const result = await sellerService.getSellerOrders(
        testSeller._id.toString(),
        {},
        1,
        10
      );

      const order = result.orders[0];
      expect(order.buyerId).toBeDefined();
      expect((order.buyerId as any).email).toBe('buyer@test.com');
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        sellerService.getSellerOrders('invalid-id')
      ).rejects.toThrow('Invalid seller ID');
    });

    it('should return empty array for seller with no orders', async () => {
      const newSeller = await User.create({
        email: 'newseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const result = await sellerService.getSellerOrders(
        newSeller._id.toString(),
        {},
        1,
        10
      );

      expect(result.orders).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('getSalesStatistics', () => {
    beforeEach(async () => {
      // Create test orders
      await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 2,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 2000,
        totalAmount: 2000,
        status: 'delivered',
      });

      await Order.create({
        orderNumber: 'MN-2024-000002',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct2._id,
            title: 'Test Product 2',
            price: 500,
            quantity: 3,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 1500,
        totalAmount: 1500,
        status: 'confirmed',
      });
    });

    it('should calculate total sales correctly', async () => {
      const stats = await sellerService.getSalesStatistics(testSeller._id.toString());

      expect(stats.totalSales).toBe(5); // 2 + 3
    });

    it('should calculate total revenue correctly', async () => {
      const stats = await sellerService.getSalesStatistics(testSeller._id.toString());

      expect(stats.totalRevenue).toBe(3500); // (1000*2) + (500*3)
    });

    it('should calculate average order value correctly', async () => {
      const stats = await sellerService.getSalesStatistics(testSeller._id.toString());

      expect(stats.averageOrderValue).toBe(1750); // 3500 / 2
    });

    it('should count total orders correctly', async () => {
      const stats = await sellerService.getSalesStatistics(testSeller._id.toString());

      expect(stats.totalOrders).toBe(2);
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const stats = await sellerService.getSalesStatistics(
        testSeller._id.toString(),
        yesterday
      );

      expect(stats.totalOrders).toBe(2);
    });

    it('should exclude cancelled orders', async () => {
      await Order.create({
        orderNumber: 'MN-2024-000003',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct1._id,
            title: 'Test Product 1',
            price: 1000,
            quantity: 10,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 10000,
        totalAmount: 10000,
        status: 'cancelled',
      });

      const stats = await sellerService.getSalesStatistics(testSeller._id.toString());

      expect(stats.totalSales).toBe(5); // Not 15
      expect(stats.totalRevenue).toBe(3500); // Not 13500
      expect(stats.totalOrders).toBe(2); // Not 3
    });

    it('should return zero values for seller with no orders', async () => {
      const newSeller = await User.create({
        email: 'newseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const stats = await sellerService.getSalesStatistics(newSeller._id.toString());

      expect(stats.totalSales).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.averageOrderValue).toBe(0);
      expect(stats.totalOrders).toBe(0);
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        sellerService.getSalesStatistics('invalid-id')
      ).rejects.toThrow('Invalid seller ID');
    });
  });
});
