import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { OrderService } from '../OrderService.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

describe('OrderService', () => {
  let mongoServer: MongoMemoryServer;
  let orderService: OrderService;
  let testBuyer: any;
  let testSeller: any;
  let testProduct: any;

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

    orderService = new OrderService();

    // Create test buyer
    testBuyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      verificationStatus: 'approved',
    });

    // Create test seller
    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      verificationStatus: 'approved',
    });

    // Create test product
    testProduct = await Product.create({
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
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

  describe('generateTrackingNumber', () => {
    it('should generate tracking number in correct format MN-YYYY-NNNNNN', async () => {
      const trackingNumber = await orderService.generateTrackingNumber();
      const year = new Date().getFullYear();
      const pattern = new RegExp(`^MN-${year}-\\d{6}$`);
      
      expect(trackingNumber).toMatch(pattern);
    });

    it('should generate sequential tracking numbers', async () => {
      const trackingNumber1 = await orderService.generateTrackingNumber();
      
      // Create an order to increment the sequence
      await Order.create({
        orderNumber: trackingNumber1,
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'pending',
      });

      const trackingNumber2 = await orderService.generateTrackingNumber();
      
      // Extract sequence numbers
      const seq1 = parseInt(trackingNumber1.split('-')[2], 10);
      const seq2 = parseInt(trackingNumber2.split('-')[2], 10);
      
      expect(seq2).toBe(seq1 + 1);
    });

    it('should pad sequence number with leading zeros', async () => {
      const trackingNumber = await orderService.generateTrackingNumber();
      const sequencePart = trackingNumber.split('-')[2];
      
      expect(sequencePart).toHaveLength(6);
      expect(sequencePart).toMatch(/^\d{6}$/);
    });
  });

  describe('createOrder', () => {
    it('should create order with valid cart items', async () => {
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 2 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      const order = await orderService.createOrder(orderData);

      expect(order).toBeDefined();
      expect(order.buyerId.toString()).toBe(testBuyer._id.toString());
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.subtotal).toBe(2000);
      expect(order.totalAmount).toBe(2000);
      expect(order.status).toBe('pending');
      expect(order.orderNumber).toMatch(/^MN-\d{4}-\d{6}$/);
    });

    it('should throw error for empty cart', async () => {
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Cart is empty');
    });

    it('should throw error for invalid product ID', async () => {
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: 'invalid-id', quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Invalid product ID');
    });

    it('should throw error for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: fakeId.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Product not found');
    });

    it('should throw error for inactive product', async () => {
      testProduct.isActive = false;
      await testProduct.save();

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Product is not available');
    });

    it('should throw error for unapproved product', async () => {
      testProduct.verificationStatus = 'pending';
      await testProduct.save();

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Product is not approved');
    });

    it('should throw error for insufficient inventory', async () => {
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 20 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await expect(orderService.createOrder(orderData)).rejects.toThrow('Insufficient inventory');
    });

    it('should calculate total with shipping cost', async () => {
      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        shippingCost: 100,
      };

      const order = await orderService.createOrder(orderData);

      expect(order.subtotal).toBe(1000);
      expect(order.shippingCost).toBe(100);
      expect(order.totalAmount).toBe(1100);
    });

    it('should update product inventory after order creation', async () => {
      const initialInventory = testProduct.inventory;

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 3 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await orderService.createOrder(orderData);

      const updatedProduct = await Product.findById(testProduct._id);
      expect(updatedProduct?.inventory).toBe(initialInventory - 3);
      expect(updatedProduct?.purchaseCount).toBe(1);
    });

    it('should create order with multiple items', async () => {
      const product2 = await Product.create({
        title: { en: 'Test Product 2' },
        description: { en: 'Test description 2' },
        price: 500,
        category: 'food',
        images: ['image2.jpg'],
        inventory: 5,
        sellerId: testSeller._id,
        verificationStatus: 'approved',
        isActive: true,
      });

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 2 },
          { productId: product2._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa' as const,
      };

      const order = await orderService.createOrder(orderData);

      expect(order.items).toHaveLength(2);
      expect(order.subtotal).toBe(2500); // (1000 * 2) + (500 * 1)
    });
  });

  describe('getOrderById', () => {
    let testOrder: any;

    beforeEach(async () => {
      testOrder = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'pending',
      });
    });

    it('should allow buyer to view their own order', async () => {
      const order = await orderService.getOrderById(
        testOrder._id.toString(),
        testBuyer._id.toString(),
        'buyer'
      );

      expect(order).toBeDefined();
      expect(order._id.toString()).toBe(testOrder._id.toString());
    });

    it('should not allow buyer to view other buyer\'s order', async () => {
      const otherBuyer = await User.create({
        email: 'other@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      await expect(
        orderService.getOrderById(
          testOrder._id.toString(),
          otherBuyer._id.toString(),
          'buyer'
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should allow seller to view order containing their product', async () => {
      const order = await orderService.getOrderById(
        testOrder._id.toString(),
        testSeller._id.toString(),
        'seller'
      );

      expect(order).toBeDefined();
      expect(order._id.toString()).toBe(testOrder._id.toString());
    });

    it('should not allow seller to view order without their product', async () => {
      const otherSeller = await User.create({
        email: 'otherseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      await expect(
        orderService.getOrderById(
          testOrder._id.toString(),
          otherSeller._id.toString(),
          'seller'
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should allow admin to view any order', async () => {
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });

      const order = await orderService.getOrderById(
        testOrder._id.toString(),
        admin._id.toString(),
        'admin'
      );

      expect(order).toBeDefined();
      expect(order._id.toString()).toBe(testOrder._id.toString());
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        orderService.getOrderById('invalid-id', testBuyer._id.toString(), 'buyer')
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        orderService.getOrderById(fakeId.toString(), testBuyer._id.toString(), 'buyer')
      ).rejects.toThrow('Order not found');
    });
  });

  describe('getUserOrders', () => {
    beforeEach(async () => {
      // Create multiple orders for the test buyer
      for (let i = 0; i < 15; i++) {
        await Order.create({
          orderNumber: `MN-2024-${String(i + 1).padStart(6, '0')}`,
          buyerId: testBuyer._id,
          items: [{
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          }],
          shippingAddress: {
            fullName: 'Test User',
            phone: '9841234567',
            addressLine1: 'Test Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          subtotal: 1000,
          totalAmount: 1000,
          status: 'pending',
        });
      }
    });

    it('should return buyer\'s orders with pagination', async () => {
      const result = await orderService.getUserOrders(testBuyer._id.toString(), 1, 10);

      expect(result.orders).toHaveLength(10);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should return second page of orders', async () => {
      const result = await orderService.getUserOrders(testBuyer._id.toString(), 2, 10);

      expect(result.orders).toHaveLength(5);
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should return orders in descending order by creation date', async () => {
      const result = await orderService.getUserOrders(testBuyer._id.toString(), 1, 5);

      for (let i = 0; i < result.orders.length - 1; i++) {
        expect(result.orders[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.orders[i + 1].createdAt.getTime()
        );
      }
    });

    it('should return empty array for buyer with no orders', async () => {
      const newBuyer = await User.create({
        email: 'newbuyer@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      const result = await orderService.getUserOrders(newBuyer._id.toString());

      expect(result.orders).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw error for invalid buyer ID', async () => {
      await expect(
        orderService.getUserOrders('invalid-id')
      ).rejects.toThrow('Invalid buyer ID');
    });
  });

  describe('getSellerOrders', () => {
    beforeEach(async () => {
      // Create multiple orders containing seller's products
      for (let i = 0; i < 12; i++) {
        await Order.create({
          orderNumber: `MN-2024-${String(i + 1).padStart(6, '0')}`,
          buyerId: testBuyer._id,
          items: [{
            productId: testProduct._id,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId: testSeller._id,
          }],
          shippingAddress: {
            fullName: 'Test User',
            phone: '9841234567',
            addressLine1: 'Test Address',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          subtotal: 1000,
          totalAmount: 1000,
          status: 'pending',
        });
      }
    });

    it('should return seller\'s orders with pagination', async () => {
      const result = await orderService.getSellerOrders(testSeller._id.toString(), 1, 10);

      expect(result.orders).toHaveLength(10);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should return orders containing seller\'s products', async () => {
      const result = await orderService.getSellerOrders(testSeller._id.toString());

      result.orders.forEach(order => {
        const hasSellerProduct = order.items.some(
          item => item.sellerId.toString() === testSeller._id.toString()
        );
        expect(hasSellerProduct).toBe(true);
      });
    });

    it('should return empty array for seller with no orders', async () => {
      const newSeller = await User.create({
        email: 'newseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      const result = await orderService.getSellerOrders(newSeller._id.toString());

      expect(result.orders).toHaveLength(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw error for invalid seller ID', async () => {
      await expect(
        orderService.getSellerOrders('invalid-id')
      ).rejects.toThrow('Invalid seller ID');
    });
  });

  describe('updateOrderStatus', () => {
    let testOrder: any;
    let admin: any;

    beforeEach(async () => {
      testOrder = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 2,
          sellerId: testSeller._id,
        }],
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
        status: 'pending',
      });

      admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });
    });

    it('should update order status from pending to confirmed', async () => {
      const updatedOrder = await orderService.updateOrderStatus(
        testOrder._id.toString(),
        'confirmed',
        admin._id.toString(),
        'admin'
      );

      expect(updatedOrder.status).toBe('confirmed');
      expect(updatedOrder.confirmedAt).toBeDefined();
    });

    it('should update order status from confirmed to shipped', async () => {
      testOrder.status = 'confirmed';
      await testOrder.save();

      const updatedOrder = await orderService.updateOrderStatus(
        testOrder._id.toString(),
        'shipped',
        testSeller._id.toString(),
        'seller'
      );

      expect(updatedOrder.status).toBe('shipped');
      expect(updatedOrder.shippedAt).toBeDefined();
    });

    it('should update order status from shipped to delivered', async () => {
      testOrder.status = 'shipped';
      await testOrder.save();

      const updatedOrder = await orderService.updateOrderStatus(
        testOrder._id.toString(),
        'delivered',
        admin._id.toString(),
        'admin'
      );

      expect(updatedOrder.status).toBe('delivered');
      expect(updatedOrder.deliveredAt).toBeDefined();
    });

    it('should allow buyer to cancel their own order', async () => {
      const updatedOrder = await orderService.updateOrderStatus(
        testOrder._id.toString(),
        'cancelled',
        testBuyer._id.toString(),
        'buyer'
      );

      expect(updatedOrder.status).toBe('cancelled');
      expect(updatedOrder.cancelledAt).toBeDefined();
    });

    it('should restore inventory when order is cancelled', async () => {
      const productBeforeCancel = await Product.findById(testProduct._id);
      const inventoryBefore = productBeforeCancel!.inventory;

      await orderService.updateOrderStatus(
        testOrder._id.toString(),
        'cancelled',
        testBuyer._id.toString(),
        'buyer'
      );

      const productAfterCancel = await Product.findById(testProduct._id);
      expect(productAfterCancel!.inventory).toBe(inventoryBefore + 2);
    });

    it('should not allow buyer to update status other than cancel', async () => {
      await expect(
        orderService.updateOrderStatus(
          testOrder._id.toString(),
          'confirmed',
          testBuyer._id.toString(),
          'buyer'
        )
      ).rejects.toThrow('Buyers can only cancel orders');
    });

    it('should not allow buyer to cancel other buyer\'s order', async () => {
      const otherBuyer = await User.create({
        email: 'other@test.com',
        password: 'Password123',
        role: 'buyer',
        verificationStatus: 'approved',
      });

      await expect(
        orderService.updateOrderStatus(
          testOrder._id.toString(),
          'cancelled',
          otherBuyer._id.toString(),
          'buyer'
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should not allow seller to update order without their product', async () => {
      const otherSeller = await User.create({
        email: 'otherseller@test.com',
        password: 'Password123',
        role: 'seller',
        verificationStatus: 'approved',
      });

      await expect(
        orderService.updateOrderStatus(
          testOrder._id.toString(),
          'confirmed',
          otherSeller._id.toString(),
          'seller'
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should not allow invalid status transitions', async () => {
      testOrder.status = 'delivered';
      await testOrder.save();

      await expect(
        orderService.updateOrderStatus(
          testOrder._id.toString(),
          'shipped',
          admin._id.toString(),
          'admin'
        )
      ).rejects.toThrow('Invalid status transition');
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        orderService.updateOrderStatus(
          'invalid-id',
          'confirmed',
          admin._id.toString(),
          'admin'
        )
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        orderService.updateOrderStatus(
          fakeId.toString(),
          'confirmed',
          admin._id.toString(),
          'admin'
        )
      ).rejects.toThrow('Order not found');
    });
  });

  describe('Email Notifications Integration', () => {
    it('should send order confirmation email to buyer on order creation', async () => {
      // Mock the emailService
      const emailService = require('../EmailService.js').emailService;
      const sendOrderConfirmationSpy = jest.spyOn(emailService, 'sendOrderConfirmation').mockResolvedValue(undefined);

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await orderService.createOrder(orderData);

      expect(sendOrderConfirmationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: testBuyer.email,
          userName: testBuyer.firstName,
        })
      );

      sendOrderConfirmationSpy.mockRestore();
    });

    it('should send seller notification email on order creation', async () => {
      const emailService = require('../EmailService.js').emailService;
      const sendOrderConfirmationSpy = jest.spyOn(emailService, 'sendOrderConfirmation').mockResolvedValue(undefined);
      const sendSellerNotificationSpy = jest.spyOn(emailService, 'sendSellerNotification').mockResolvedValue(undefined);

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await orderService.createOrder(orderData);

      expect(sendSellerNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerEmail: testSeller.email,
        })
      );

      sendOrderConfirmationSpy.mockRestore();
      sendSellerNotificationSpy.mockRestore();
    });

    it('should send shipping notification email when order status changes to shipped', async () => {
      const emailService = require('../EmailService.js').emailService;
      const sendShippingNotificationSpy = jest.spyOn(emailService, 'sendShippingNotification').mockResolvedValue(undefined);

      // Create an order first
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'confirmed',
        trackingNumber: 'MN-2024-000001',
      });

      // Create admin user
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });

      await orderService.updateOrderStatus(
        order._id.toString(),
        'shipped',
        admin._id.toString(),
        'admin'
      );

      expect(sendShippingNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: testBuyer.email,
          trackingNumber: expect.any(String),
        })
      );

      sendShippingNotificationSpy.mockRestore();
    });

    it('should send delivery confirmation email when order status changes to delivered', async () => {
      const emailService = require('../EmailService.js').emailService;
      const sendDeliveryConfirmationSpy = jest.spyOn(emailService, 'sendDeliveryConfirmation').mockResolvedValue(undefined);

      // Create an order first
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'shipped',
        trackingNumber: 'MN-2024-000001',
      });

      // Create admin user
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });

      await orderService.updateOrderStatus(
        order._id.toString(),
        'delivered',
        admin._id.toString(),
        'admin'
      );

      expect(sendDeliveryConfirmationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: testBuyer.email,
        })
      );

      sendDeliveryConfirmationSpy.mockRestore();
    });

    it('should respect buyer email preferences for order confirmation', async () => {
      // Update buyer to opt out of order confirmation emails
      testBuyer.emailPreferences = {
        orderConfirmation: false,
        orderStatusUpdates: true,
        promotionalEmails: true,
      };
      await testBuyer.save();

      const emailService = require('../EmailService.js').emailService;
      const sendOrderConfirmationSpy = jest.spyOn(emailService, 'sendOrderConfirmation').mockResolvedValue(undefined);

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      await orderService.createOrder(orderData);

      expect(sendOrderConfirmationSpy).not.toHaveBeenCalled();

      sendOrderConfirmationSpy.mockRestore();
    });

    it('should respect buyer email preferences for status updates', async () => {
      // Update buyer to opt out of status update emails
      testBuyer.emailPreferences = {
        orderConfirmation: true,
        orderStatusUpdates: false,
        promotionalEmails: true,
      };
      await testBuyer.save();

      const emailService = require('../EmailService.js').emailService;
      const sendShippingNotificationSpy = jest.spyOn(emailService, 'sendShippingNotification').mockResolvedValue(undefined);

      // Create an order first
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'confirmed',
        trackingNumber: 'MN-2024-000001',
      });

      // Create admin user
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });

      await orderService.updateOrderStatus(
        order._id.toString(),
        'shipped',
        admin._id.toString(),
        'admin'
      );

      expect(sendShippingNotificationSpy).not.toHaveBeenCalled();

      sendShippingNotificationSpy.mockRestore();
    });

    it('should not fail order creation if email sending fails', async () => {
      const emailService = require('../EmailService.js').emailService;
      const sendOrderConfirmationSpy = jest.spyOn(emailService, 'sendOrderConfirmation').mockRejectedValue(new Error('Email service unavailable'));

      const orderData = {
        buyerId: testBuyer._id.toString(),
        cartItems: [
          { productId: testProduct._id.toString(), quantity: 1 },
        ],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
      };

      // Should not throw error even if email fails
      const order = await orderService.createOrder(orderData);
      expect(order).toBeDefined();
      expect(order.orderNumber).toMatch(/^MN-\d{4}-\d{6}$/);

      sendOrderConfirmationSpy.mockRestore();
    });

    it('should not fail status update if email sending fails', async () => {
      const emailService = require('../EmailService.js').emailService;
      const sendShippingNotificationSpy = jest.spyOn(emailService, 'sendShippingNotification').mockRejectedValue(new Error('Email service unavailable'));

      // Create an order first
      const order = await Order.create({
        orderNumber: 'MN-2024-000001',
        buyerId: testBuyer._id,
        items: [{
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 1,
          sellerId: testSeller._id,
        }],
        shippingAddress: {
          fullName: 'Test User',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'confirmed',
        trackingNumber: 'MN-2024-000001',
      });

      // Create admin user
      const admin = await User.create({
        email: 'admin@test.com',
        password: 'Password123',
        role: 'admin',
        verificationStatus: 'approved',
      });

      // Should not throw error even if email fails
      const updatedOrder = await orderService.updateOrderStatus(
        order._id.toString(),
        'shipped',
        admin._id.toString(),
        'admin'
      );

      expect(updatedOrder.status).toBe('shipped');

      sendShippingNotificationSpy.mockRestore();
    });
  });
});
