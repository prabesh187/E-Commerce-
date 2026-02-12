import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import axios from 'axios';
import { PaymentService } from '../PaymentService';
import Payment from '../../models/Payment';
import Order from '../../models/Order';
import Product from '../../models/Product';
import User from '../../models/User';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentService', () => {
  let mongoServer: MongoMemoryServer;
  let paymentService: PaymentService;
  let testBuyer: any;
  let testSeller: any;
  let testProduct: any;
  let testOrder: any;

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
    await Order.deleteMany({});
    await Payment.deleteMany({});

    // Create test data
    testBuyer = await User.create({
      email: 'buyer@test.com',
      password: 'hashedpassword',
      role: 'buyer',
      firstName: 'Test',
      lastName: 'Buyer',
    });

    testSeller = await User.create({
      email: 'seller@test.com',
      password: 'hashedpassword',
      role: 'seller',
      firstName: 'Test',
      lastName: 'Seller',
      verificationStatus: 'approved',
      businessName: 'Test Business',
    });

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

    testOrder = await Order.create({
      orderNumber: 'MN-2024-000001',
      buyerId: testBuyer._id,
      items: [
        {
          productId: testProduct._id,
          title: 'Test Product',
          price: 1000,
          quantity: 2,
          sellerId: testSeller._id,
        },
      ],
      shippingAddress: {
        fullName: 'Test Buyer',
        phone: '9841234567',
        addressLine1: 'Test Address',
        city: 'Kathmandu',
        district: 'Kathmandu',
      },
      paymentMethod: 'esewa',
      subtotal: 2000,
      shippingCost: 100,
      totalAmount: 2100,
      status: 'pending',
      trackingNumber: 'MN-2024-000001',
    });

    paymentService = new PaymentService();

    // Clear axios mocks
    jest.clearAllMocks();
  });

  describe('initiateEsewaPayment', () => {
    it('should initiate eSewa payment successfully', async () => {
      const result = await paymentService.initiateEsewaPayment(
        testOrder._id.toString(),
        2100
      );

      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('transactionUuid');
      expect(result.paymentUrl).toContain('esewa.com.np');
      expect(result.paymentUrl).toContain('amt=2100');

      // Verify payment record was created
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        gateway: 'esewa',
      });

      expect(payment).toBeTruthy();
      expect(payment?.status).toBe('pending');
      expect(payment?.amount).toBe(2100);
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.initiateEsewaPayment('invalid-id', 2100)
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        paymentService.initiateEsewaPayment(fakeId.toString(), 2100)
      ).rejects.toThrow('Order not found');
    });

    it('should throw error when amount does not match order total', async () => {
      await expect(
        paymentService.initiateEsewaPayment(testOrder._id.toString(), 1000)
      ).rejects.toThrow('Payment amount does not match order total');
    });
  });

  describe('verifyEsewaPayment', () => {
    let transactionId: string;

    beforeEach(async () => {
      // Create a payment record
      const initResult = await paymentService.initiateEsewaPayment(
        testOrder._id.toString(),
        2100
      );
      transactionId = initResult.transactionUuid;
    });

    it('should verify successful eSewa payment', async () => {
      // Mock successful eSewa verification response
      mockedAxios.get.mockResolvedValueOnce({
        data: '<response><response_code>Success</response_code></response>',
      });

      const result = await paymentService.verifyEsewaPayment(
        testOrder._id.toString(),
        transactionId
      );

      expect(result.verified).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.transactionId).toBe(transactionId);

      // Verify payment record was updated
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId,
      });
      expect(payment?.status).toBe('completed');

      // Verify order was updated
      const order = await Order.findById(testOrder._id);
      expect(order?.paymentStatus).toBe('completed');
      expect(order?.status).toBe('confirmed');
      expect(order?.confirmedAt).toBeTruthy();
    });

    it('should handle failed eSewa payment verification', async () => {
      // Mock failed eSewa verification response
      mockedAxios.get.mockResolvedValueOnce({
        data: '<response><response_code>Failed</response_code></response>',
      });

      const result = await paymentService.verifyEsewaPayment(
        testOrder._id.toString(),
        transactionId
      );

      expect(result.verified).toBe(false);
      expect(result.status).toBe('failed');

      // Verify payment record was updated
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId,
      });
      expect(payment?.status).toBe('failed');

      // Verify order payment status was updated
      const order = await Order.findById(testOrder._id);
      expect(order?.paymentStatus).toBe('failed');
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.verifyEsewaPayment('invalid-id', transactionId)
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error when payment record not found', async () => {
      await expect(
        paymentService.verifyEsewaPayment(testOrder._id.toString(), 'fake-transaction-id')
      ).rejects.toThrow('Payment record not found');
    });

    it('should handle network errors during verification', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        paymentService.verifyEsewaPayment(testOrder._id.toString(), transactionId)
      ).rejects.toThrow('eSewa verification failed');

      // Verify payment status was updated to failed
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId,
      });
      expect(payment?.status).toBe('failed');
    });
  });

  describe('initiateKhaltiPayment', () => {
    it('should initiate Khalti payment successfully', async () => {
      // Mock successful Khalti initiation response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-123',
          payment_url: 'https://khalti.com/payment/test-pidx-123',
        },
      });

      const result = await paymentService.initiateKhaltiPayment(
        testOrder._id.toString(),
        2100
      );

      expect(result).toHaveProperty('paymentUrl');
      expect(result).toHaveProperty('pidx');
      expect(result.pidx).toBe('test-pidx-123');
      expect(result.paymentUrl).toContain('khalti.com');

      // Verify payment record was created
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        gateway: 'khalti',
      });

      expect(payment).toBeTruthy();
      expect(payment?.status).toBe('pending');
      expect(payment?.amount).toBe(2100);
      expect(payment?.transactionId).toBe('test-pidx-123');
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.initiateKhaltiPayment('invalid-id', 2100)
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        paymentService.initiateKhaltiPayment(fakeId.toString(), 2100)
      ).rejects.toThrow('Order not found');
    });

    it('should throw error when amount does not match order total', async () => {
      await expect(
        paymentService.initiateKhaltiPayment(testOrder._id.toString(), 1000)
      ).rejects.toThrow('Payment amount does not match order total');
    });

    it('should handle Khalti API errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            message: 'Invalid merchant credentials',
          },
        },
      });

      await expect(
        paymentService.initiateKhaltiPayment(testOrder._id.toString(), 2100)
      ).rejects.toThrow('Khalti payment initiation failed');
    });
  });

  describe('verifyKhaltiPayment', () => {
    let pidx: string;

    beforeEach(async () => {
      // Mock Khalti initiation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-123',
          payment_url: 'https://khalti.com/payment/test-pidx-123',
        },
      });

      const initResult = await paymentService.initiateKhaltiPayment(
        testOrder._id.toString(),
        2100
      );
      pidx = initResult.pidx;
    });

    it('should verify successful Khalti payment', async () => {
      // Mock successful Khalti verification response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: pidx,
          status: 'Completed',
          transaction_id: 'khalti-txn-123',
          amount: 210000, // Amount in paisa
        },
      });

      const result = await paymentService.verifyKhaltiPayment(
        testOrder._id.toString(),
        pidx
      );

      expect(result.verified).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.transactionId).toBe(pidx);

      // Verify payment record was updated
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId: pidx,
      });
      expect(payment?.status).toBe('completed');

      // Verify order was updated
      const order = await Order.findById(testOrder._id);
      expect(order?.paymentStatus).toBe('completed');
      expect(order?.status).toBe('confirmed');
      expect(order?.confirmedAt).toBeTruthy();
    });

    it('should handle incomplete Khalti payment', async () => {
      // Mock incomplete Khalti verification response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: pidx,
          status: 'Pending',
        },
      });

      const result = await paymentService.verifyKhaltiPayment(
        testOrder._id.toString(),
        pidx
      );

      expect(result.verified).toBe(false);
      expect(result.status).toBe('failed');

      // Verify payment record was updated
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId: pidx,
      });
      expect(payment?.status).toBe('failed');
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.verifyKhaltiPayment('invalid-id', pidx)
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error when payment record not found', async () => {
      await expect(
        paymentService.verifyKhaltiPayment(testOrder._id.toString(), 'fake-pidx')
      ).rejects.toThrow('Payment record not found');
    });

    it('should handle network errors during verification', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        paymentService.verifyKhaltiPayment(testOrder._id.toString(), pidx)
      ).rejects.toThrow('Khalti verification failed');

      // Verify payment status was updated to failed
      const payment = await Payment.findOne({
        orderId: testOrder._id,
        transactionId: pidx,
      });
      expect(payment?.status).toBe('failed');
    });
  });

  describe('handlePaymentCallback', () => {
    it('should handle eSewa callback successfully', async () => {
      // Create payment record
      const initResult = await paymentService.initiateEsewaPayment(
        testOrder._id.toString(),
        2100
      );

      // Mock successful verification
      mockedAxios.get.mockResolvedValueOnce({
        data: '<response><response_code>Success</response_code></response>',
      });

      const result = await paymentService.handlePaymentCallback('esewa', {
        oid: testOrder._id.toString(),
        refId: initResult.transactionUuid,
        amt: '2100',
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should handle Khalti callback successfully', async () => {
      // Mock Khalti initiation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-123',
          payment_url: 'https://khalti.com/payment/test-pidx-123',
        },
      });

      await paymentService.initiateKhaltiPayment(testOrder._id.toString(), 2100);

      // Mock successful verification
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-123',
          status: 'Completed',
        },
      });

      const result = await paymentService.handlePaymentCallback('khalti', {
        pidx: 'test-pidx-123',
        purchase_order_id: testOrder._id.toString(),
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe('completed');
    });

    it('should throw error for missing callback parameters', async () => {
      await expect(
        paymentService.handlePaymentCallback('esewa', {})
      ).rejects.toThrow('Missing required callback parameters');
    });

    it('should throw error for unsupported gateway', async () => {
      await expect(
        paymentService.handlePaymentCallback('unsupported' as any, {})
      ).rejects.toThrow('Unsupported payment gateway');
    });
  });

  describe('getPaymentByOrderId', () => {
    it('should retrieve payment record by order ID', async () => {
      // Create payment record
      await paymentService.initiateEsewaPayment(testOrder._id.toString(), 2100);

      const payment = await paymentService.getPaymentByOrderId(
        testOrder._id.toString()
      );

      expect(payment).toBeTruthy();
      expect(payment.orderId.toString()).toBe(testOrder._id.toString());
      expect(payment.gateway).toBe('esewa');
      expect(payment.amount).toBe(2100);
    });

    it('should throw error for invalid order ID', async () => {
      await expect(
        paymentService.getPaymentByOrderId('invalid-id')
      ).rejects.toThrow('Invalid order ID');
    });

    it('should throw error when payment not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        paymentService.getPaymentByOrderId(fakeId.toString())
      ).rejects.toThrow('Payment record not found');
    });

    it('should return most recent payment when multiple exist', async () => {
      // Create multiple payment records
      await paymentService.initiateEsewaPayment(testOrder._id.toString(), 2100);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'test-pidx-456',
          payment_url: 'https://khalti.com/payment/test-pidx-456',
        },
      });
      
      await paymentService.initiateKhaltiPayment(testOrder._id.toString(), 2100);

      const payment = await paymentService.getPaymentByOrderId(
        testOrder._id.toString()
      );

      // Should return the most recent (Khalti) payment
      expect(payment.gateway).toBe('khalti');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent payment initiations for same order', async () => {
      const promises = [
        paymentService.initiateEsewaPayment(testOrder._id.toString(), 2100),
        paymentService.initiateEsewaPayment(testOrder._id.toString(), 2100),
      ];

      const results = await Promise.all(promises);

      // Both should succeed with different transaction IDs
      expect(results[0].transactionUuid).not.toBe(results[1].transactionUuid);

      // Should have two payment records
      const payments = await Payment.find({ orderId: testOrder._id });
      expect(payments).toHaveLength(2);
    });

    it('should handle very large amounts', async () => {
      const largeOrder = await Order.create({
        orderNumber: 'MN-2024-000002',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Expensive Product',
            price: 999999,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'khalti',
        subtotal: 999999,
        shippingCost: 0,
        totalAmount: 999999,
        status: 'pending',
        trackingNumber: 'MN-2024-000002',
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          pidx: 'large-amount-pidx',
          payment_url: 'https://khalti.com/payment/large-amount-pidx',
        },
      });

      const result = await paymentService.initiateKhaltiPayment(
        largeOrder._id.toString(),
        999999
      );

      expect(result.pidx).toBe('large-amount-pidx');
    });

    it('should handle decimal amounts correctly', async () => {
      const decimalOrder = await Order.create({
        orderNumber: 'MN-2024-000003',
        buyerId: testBuyer._id,
        items: [
          {
            productId: testProduct._id,
            title: 'Product with decimal',
            price: 99.99,
            quantity: 1,
            sellerId: testSeller._id,
          },
        ],
        shippingAddress: {
          fullName: 'Test Buyer',
          phone: '9841234567',
          addressLine1: 'Test Address',
          city: 'Kathmandu',
          district: 'Kathmandu',
        },
        paymentMethod: 'esewa',
        subtotal: 99.99,
        shippingCost: 0,
        totalAmount: 99.99,
        status: 'pending',
        trackingNumber: 'MN-2024-000003',
      });

      const result = await paymentService.initiateEsewaPayment(
        decimalOrder._id.toString(),
        99.99
      );

      expect(result.paymentUrl).toContain('amt=99.99');
    });
  });
});
