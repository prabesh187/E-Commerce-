import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Payment from '../Payment';

describe('Payment Model', () => {
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

  beforeEach(async () => {
    await Payment.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid payment record', async () => {
      const orderId = new mongoose.Types.ObjectId();
      
      const payment = await Payment.create({
        orderId,
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
        transactionId: 'test-txn-123',
      });

      expect(payment.orderId.toString()).toBe(orderId.toString());
      expect(payment.gateway).toBe('esewa');
      expect(payment.amount).toBe(1000);
      expect(payment.status).toBe('pending');
      expect(payment.transactionId).toBe('test-txn-123');
    });

    it('should require orderId field', async () => {
      const payment = new Payment({
        gateway: 'khalti',
        amount: 2000,
        status: 'pending',
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should require gateway field', async () => {
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(),
        amount: 2000,
        status: 'pending',
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should require amount field', async () => {
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        status: 'pending',
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should validate gateway enum values', async () => {
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'invalid-gateway' as any,
        amount: 1000,
        status: 'pending',
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should validate status enum values', async () => {
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'invalid-status' as any,
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should not allow negative amounts', async () => {
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: -100,
        status: 'pending',
      });

      await expect(payment.save()).rejects.toThrow();
    });

    it('should allow optional fields', async () => {
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'khalti',
        amount: 1500,
        status: 'completed',
        transactionId: 'khalti-txn-456',
        gatewayResponse: { status: 'success', data: 'test' },
        errorMessage: 'No error',
      });

      expect(payment.transactionId).toBe('khalti-txn-456');
      expect(payment.gatewayResponse).toEqual({ status: 'success', data: 'test' });
      expect(payment.errorMessage).toBe('No error');
    });

    it('should set default status to pending', async () => {
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
      });

      expect(payment.status).toBe('pending');
    });

    it('should automatically add timestamps', async () => {
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
      });

      expect(payment.createdAt).toBeInstanceOf(Date);
      expect(payment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Indexes', () => {
    it('should have index on orderId', async () => {
      const indexes = await Payment.collection.getIndexes();
      const orderIdIndex = Object.keys(indexes).find(key => 
        indexes[key].some((field: any) => field[0] === 'orderId')
      );
      expect(orderIdIndex).toBeDefined();
    });

    it('should have index on transactionId', async () => {
      const indexes = await Payment.collection.getIndexes();
      const transactionIdIndex = Object.keys(indexes).find(key => 
        indexes[key].some((field: any) => field[0] === 'transactionId')
      );
      expect(transactionIdIndex).toBeDefined();
    });

    it('should have compound index on gateway and status', async () => {
      const indexes = await Payment.collection.getIndexes();
      const compoundIndex = Object.keys(indexes).find(key => {
        const fields = indexes[key];
        return fields.length === 2 && 
               fields.some((f: any) => f[0] === 'gateway') &&
               fields.some((f: any) => f[0] === 'status');
      });
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('CRUD Operations', () => {
    it('should update payment status', async () => {
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
      });

      payment.status = 'completed';
      payment.transactionId = 'esewa-txn-789';
      await payment.save();

      const updated = await Payment.findById(payment._id);
      expect(updated?.status).toBe('completed');
      expect(updated?.transactionId).toBe('esewa-txn-789');
    });

    it('should find payments by orderId', async () => {
      const orderId = new mongoose.Types.ObjectId();
      
      await Payment.create({
        orderId,
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
      });

      await Payment.create({
        orderId,
        gateway: 'khalti',
        amount: 1000,
        status: 'failed',
      });

      const payments = await Payment.find({ orderId });
      expect(payments).toHaveLength(2);
    });

    it('should find payment by transactionId', async () => {
      const transactionId = 'unique-txn-123';
      
      await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
        transactionId,
      });

      const payment = await Payment.findOne({ transactionId });
      expect(payment).toBeTruthy();
      expect(payment?.transactionId).toBe(transactionId);
    });

    it('should delete payment record', async () => {
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'pending',
      });

      await Payment.findByIdAndDelete(payment._id);

      const deleted = await Payment.findById(payment._id);
      expect(deleted).toBeNull();
    });
  });

  describe('Gateway Response Storage', () => {
    it('should store complex gateway response objects', async () => {
      const complexResponse = {
        status: 'success',
        transaction: {
          id: 'txn-123',
          amount: 1000,
          currency: 'NPR',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          gateway: 'esewa',
        },
      };

      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'esewa',
        amount: 1000,
        status: 'completed',
        gatewayResponse: complexResponse,
      });

      expect(payment.gatewayResponse).toEqual(complexResponse);
    });

    it('should store error messages', async () => {
      const errorMessage = 'Payment gateway timeout';
      
      const payment = await Payment.create({
        orderId: new mongoose.Types.ObjectId(),
        gateway: 'khalti',
        amount: 1000,
        status: 'failed',
        errorMessage,
      });

      expect(payment.errorMessage).toBe(errorMessage);
    });
  });
});
