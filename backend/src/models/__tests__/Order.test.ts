import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from '@jest/globals';
import Order from '../Order';
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
  await Order.deleteMany({});
  await User.deleteMany({});
  await Product.deleteMany({});
});

describe('Order Model', () => {
  let buyerId: mongoose.Types.ObjectId;
  let sellerId: mongoose.Types.ObjectId;
  let productId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a buyer
    const buyer = await User.create({
      email: 'buyer@test.com',
      password: 'Password123',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });
    buyerId = buyer._id as mongoose.Types.ObjectId;

    // Create a seller
    const seller = await User.create({
      email: 'seller@test.com',
      password: 'Password123',
      role: 'seller',
      businessName: 'Test Shop',
      verificationStatus: 'approved',
    });
    sellerId = seller._id as mongoose.Types.ObjectId;

    // Create a product
    const product = await Product.create({
      title: { en: 'Test Product', ne: 'परीक्षण उत्पादन' },
      description: { en: 'Test Description', ne: 'परीक्षण विवरण' },
      price: 1000,
      category: 'handicrafts',
      images: ['image1.jpg'],
      inventory: 10,
      sellerId: sellerId,
      verificationStatus: 'approved',
    });
    productId = product._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create an order with all required fields', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000001',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa' as const,
        subtotal: 2000,
        totalAmount: 2000,
      };

      const order = await Order.create(orderData);

      expect(order.orderNumber).toBe('MN-2024-000001');
      expect(order.buyerId.toString()).toBe(buyerId.toString());
      expect(order.items).toHaveLength(1);
      expect(order.items[0].productId.toString()).toBe(productId.toString());
      expect(order.items[0].title).toBe('Test Product');
      expect(order.items[0].price).toBe(1000);
      expect(order.items[0].quantity).toBe(2);
      expect(order.items[0].sellerId.toString()).toBe(sellerId.toString());
      expect(order.shippingAddress.fullName).toBe('John Doe');
      expect(order.shippingAddress.phone).toBe('9841234567');
      expect(order.shippingAddress.addressLine1).toBe('123 Main St');
      expect(order.shippingAddress.city).toBe('Kathmandu');
      expect(order.shippingAddress.district).toBe('Kathmandu');
      expect(order.paymentMethod).toBe('esewa');
      expect(order.paymentStatus).toBe('pending');
      expect(order.subtotal).toBe(2000);
      expect(order.shippingCost).toBe(0);
      expect(order.totalAmount).toBe(2000);
      expect(order.status).toBe('pending');
      expect(order.createdAt).toBeDefined();
      expect(order.updatedAt).toBeDefined();
    });

    it('should fail to create order without orderNumber', async () => {
      const orderData = {
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: 1000,
        totalAmount: 1000,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should fail to create order without buyerId', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000002',
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: 1000,
        totalAmount: 1000,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should fail to create order without items', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000003',
        buyerId,
        items: [],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: 0,
        totalAmount: 0,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should fail to create order without shippingAddress', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000004',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        paymentMethod: 'cod' as const,
        subtotal: 1000,
        totalAmount: 1000,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should fail to create order without paymentMethod', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000005',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        subtotal: 1000,
        totalAmount: 1000,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });
  });

  describe('Payment Fields', () => {
    it('should accept valid payment methods', async () => {
      const paymentMethods: Array<'esewa' | 'khalti' | 'cod'> = [
        'esewa',
        'khalti',
        'cod',
      ];

      for (const method of paymentMethods) {
        const order = await Order.create({
          orderNumber: `MN-2024-${method}`,
          buyerId,
          items: [
            {
              productId,
              title: 'Test Product',
              price: 1000,
              quantity: 1,
              sellerId,
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '9841234567',
            addressLine1: '123 Main St',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: method,
          subtotal: 1000,
          totalAmount: 1000,
        });

        expect(order.paymentMethod).toBe(method);
      }
    });

    it('should default paymentStatus to pending', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000006',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.paymentStatus).toBe('pending');
    });

    it('should accept valid payment statuses', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000007',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        paymentStatus: 'completed',
        paymentTransactionId: 'TXN123456',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.paymentStatus).toBe('completed');
      expect(order.paymentTransactionId).toBe('TXN123456');
    });
  });

  describe('Status Tracking', () => {
    it('should default status to pending', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000008',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.status).toBe('pending');
    });

    it('should accept valid order statuses', async () => {
      const statuses: Array<
        'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
      > = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

      for (const status of statuses) {
        const order = await Order.create({
          orderNumber: `MN-2024-${status}`,
          buyerId,
          items: [
            {
              productId,
              title: 'Test Product',
              price: 1000,
              quantity: 1,
              sellerId,
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            phone: '9841234567',
            addressLine1: '123 Main St',
            city: 'Kathmandu',
            district: 'Kathmandu',
          },
          paymentMethod: 'cod',
          subtotal: 1000,
          totalAmount: 1000,
          status,
        });

        expect(order.status).toBe(status);
      }
    });

    it('should store status change timestamps', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-000009',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      // Update to confirmed
      const confirmedAt = new Date();
      order.status = 'confirmed';
      order.confirmedAt = confirmedAt;
      await order.save();

      expect(order.confirmedAt).toEqual(confirmedAt);

      // Update to shipped
      const shippedAt = new Date();
      order.status = 'shipped';
      order.shippedAt = shippedAt;
      order.trackingNumber = 'TRACK123';
      await order.save();

      expect(order.shippedAt).toEqual(shippedAt);
      expect(order.trackingNumber).toBe('TRACK123');

      // Update to delivered
      const deliveredAt = new Date();
      order.status = 'delivered';
      order.deliveredAt = deliveredAt;
      await order.save();

      expect(order.deliveredAt).toEqual(deliveredAt);
    });
  });

  describe('Order Items', () => {
    it('should store multiple items with different sellers', async () => {
      // Create another seller and product
      const seller2 = await User.create({
        email: 'seller2@test.com',
        password: 'Password123',
        role: 'seller',
        businessName: 'Test Shop 2',
        verificationStatus: 'approved',
      });
      const seller2Id = seller2._id as mongoose.Types.ObjectId;

      const product2 = await Product.create({
        title: { en: 'Test Product 2', ne: 'परीक्षण उत्पादन २' },
        description: { en: 'Test Description 2', ne: 'परीक्षण विवरण २' },
        price: 500,
        category: 'food',
        images: ['image2.jpg'],
        inventory: 20,
        sellerId: seller2Id,
        verificationStatus: 'approved',
      });
      const product2Id = product2._id as mongoose.Types.ObjectId;

      const order = await Order.create({
        orderNumber: 'MN-2024-000010',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
          {
            productId: product2Id,
            title: 'Test Product 2',
            price: 500,
            quantity: 3,
            sellerId: seller2Id,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 3500,
        totalAmount: 3500,
      });

      expect(order.items).toHaveLength(2);
      expect(order.items[0].sellerId.toString()).toBe(sellerId.toString());
      expect(order.items[1].sellerId.toString()).toBe(seller2Id.toString());
      expect(order.subtotal).toBe(3500);
    });

    it('should validate item quantity is at least 1', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000011',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 0,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: 0,
        totalAmount: 0,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should validate item price is not negative', async () => {
      const orderData = {
        orderNumber: 'MN-2024-000012',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: -100,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: -100,
        totalAmount: -100,
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should enforce unique orderNumber', async () => {
      const orderData = {
        orderNumber: 'MN-2024-UNIQUE',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod' as const,
        subtotal: 1000,
        totalAmount: 1000,
      };

      await Order.create(orderData);

      // Try to create another order with the same orderNumber
      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it('should allow querying orders by buyerId', async () => {
      // Create multiple orders for the same buyer
      await Order.create({
        orderNumber: 'MN-2024-B1',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      await Order.create({
        orderNumber: 'MN-2024-B2',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 2,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 2000,
        totalAmount: 2000,
      });

      const orders = await Order.find({ buyerId }).sort({ createdAt: -1 });
      expect(orders).toHaveLength(2);
      expect(orders[0].orderNumber).toBe('MN-2024-B2'); // Most recent first
    });

    it('should allow querying orders by seller ID in items', async () => {
      await Order.create({
        orderNumber: 'MN-2024-S1',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      const orders = await Order.find({ 'items.sellerId': sellerId });
      expect(orders).toHaveLength(1);
      expect(orders[0].orderNumber).toBe('MN-2024-S1');
    });

    it('should allow querying orders by status', async () => {
      await Order.create({
        orderNumber: 'MN-2024-ST1',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'confirmed',
      });

      await Order.create({
        orderNumber: 'MN-2024-ST2',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
        status: 'pending',
      });

      const confirmedOrders = await Order.find({ status: 'confirmed' });
      expect(confirmedOrders).toHaveLength(1);
      expect(confirmedOrders[0].orderNumber).toBe('MN-2024-ST1');
    });
  });

  describe('Shipping Address', () => {
    it('should store complete shipping address', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-ADDR1',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'Jane Smith',
          phone: '9851234567',
          addressLine1: '456 Oak Avenue',
          addressLine2: 'Apartment 3B',
          city: 'Pokhara',
          district: 'Kaski',
          postalCode: '33700',
        },
        paymentMethod: 'khalti',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.shippingAddress.fullName).toBe('Jane Smith');
      expect(order.shippingAddress.phone).toBe('9851234567');
      expect(order.shippingAddress.addressLine1).toBe('456 Oak Avenue');
      expect(order.shippingAddress.addressLine2).toBe('Apartment 3B');
      expect(order.shippingAddress.city).toBe('Pokhara');
      expect(order.shippingAddress.district).toBe('Kaski');
      expect(order.shippingAddress.postalCode).toBe('33700');
    });

    it('should work without optional address fields', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-ADDR2',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.shippingAddress.addressLine2).toBeUndefined();
      expect(order.shippingAddress.postalCode).toBeUndefined();
    });
  });

  describe('Shipping Cost', () => {
    it('should default shippingCost to 0', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-SHIP1',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        totalAmount: 1000,
      });

      expect(order.shippingCost).toBe(0);
    });

    it('should allow setting custom shippingCost', async () => {
      const order = await Order.create({
        orderNumber: 'MN-2024-SHIP2',
        buyerId,
        items: [
          {
            productId,
            title: 'Test Product',
            price: 1000,
            quantity: 1,
            sellerId,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          phone: '9841234567',
          addressLine1: '123 Main St',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'cod',
        subtotal: 1000,
        shippingCost: 150,
        totalAmount: 1150,
      });

      expect(order.shippingCost).toBe(150);
      expect(order.totalAmount).toBe(1150);
    });
  });
});
