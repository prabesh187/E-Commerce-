import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EmailService } from '../EmailService.js';
import nodemailer from 'nodemailer';
import type { IOrder } from '../../models/Order.js';
import mongoose from 'mongoose';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;
  let mockSendMail: any;
  let mockVerify: any;

  // Sample order data for testing
  const sampleOrder: IOrder = {
    _id: new mongoose.Types.ObjectId(),
    orderNumber: 'MN-2024-001234',
    buyerId: new mongoose.Types.ObjectId(),
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        title: 'Handmade Pashmina Shawl',
        price: 5000,
        quantity: 2,
        sellerId: new mongoose.Types.ObjectId(),
      },
      {
        productId: new mongoose.Types.ObjectId(),
        title: 'Nepali Tea Set',
        price: 1500,
        quantity: 1,
        sellerId: new mongoose.Types.ObjectId(),
      },
    ],
    shippingAddress: {
      fullName: 'John Doe',
      phone: '+977-9841234567',
      addressLine1: '123 Main Street',
      addressLine2: 'Apartment 4B',
      city: 'Kathmandu',
      district: 'Kathmandu',
      postalCode: '44600',
    },
    paymentMethod: 'esewa',
    paymentStatus: 'completed',
    paymentTransactionId: 'ESW123456',
    subtotal: 11500,
    shippingCost: 200,
    totalAmount: 11700,
    status: 'confirmed',
    trackingNumber: 'TRK-2024-001234',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    confirmedAt: new Date('2024-01-15T10:05:00Z'),
    shippedAt: new Date('2024-01-16T14:00:00Z'),
    deliveredAt: new Date('2024-01-20T16:30:00Z'),
  } as IOrder;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock transporter
    mockSendMail = jest.fn();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    
    mockVerify = jest.fn();
    mockVerify.mockResolvedValue(true);

    mockTransporter = {
      sendMail: mockSendMail,
      verify: mockVerify,
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create new instance
    emailService = new EmailService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor and Connection', () => {
    it('should create transporter with correct configuration', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: expect.any(String),
          port: expect.any(Number),
          secure: expect.any(Boolean),
          auth: expect.objectContaining({
            user: expect.any(String),
            pass: expect.any(String),
          }),
        })
      );
    });

    it('should verify connection successfully', async () => {
      const result = await emailService.verifyConnection();
      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await emailService.verifyConnection();
      expect(result).toBe(false);
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email with correct data', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        userName: 'John Doe',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0] as any;

      expect(callArgs.to).toBe('customer@example.com');
      expect(callArgs.subject).toContain('Order Confirmation');
      expect(callArgs.subject).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('Handmade Pashmina Shawl');
      expect(callArgs.html).toContain('Nepali Tea Set');
      expect(callArgs.html).toContain('NPR 11700.00');
    });

    it('should include all order items in email', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Handmade Pashmina Shawl');
      expect(callArgs.html).toContain('Nepali Tea Set');
      expect(callArgs.html).toContain('2'); // quantity
      expect(callArgs.html).toContain('1'); // quantity
    });

    it('should include shipping address in email', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('123 Main Street');
      expect(callArgs.html).toContain('Apartment 4B');
      expect(callArgs.html).toContain('Kathmandu');
      expect(callArgs.html).toContain('+977-9841234567');
    });

    it('should handle missing userName gracefully', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Customer');
    });

    it('should throw error when email sending fails', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      await expect(
        emailService.sendOrderConfirmation({
          order: sampleOrder,
          userEmail: 'customer@example.com',
        })
      ).rejects.toThrow('Email delivery failed');
    });
  });

  describe('sendShippingNotification', () => {
    it('should send shipping notification with tracking number', async () => {
      await emailService.sendShippingNotification({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        userName: 'John Doe',
        trackingNumber: 'TRK-2024-001234',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0] as any;

      expect(callArgs.to).toBe('customer@example.com');
      expect(callArgs.subject).toContain('Shipped');
      expect(callArgs.subject).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('TRK-2024-001234');
      expect(callArgs.html).toContain('John Doe');
    });

    it('should include order summary in shipping email', async () => {
      await emailService.sendShippingNotification({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        trackingNumber: 'TRK-2024-001234',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('NPR 11700.00');
      expect(callArgs.html).toContain('Total Items');
    });

    it('should include delivery address in shipping email', async () => {
      await emailService.sendShippingNotification({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        trackingNumber: 'TRK-2024-001234',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('123 Main Street');
      expect(callArgs.html).toContain('Kathmandu');
    });

    it('should handle missing tracking number', async () => {
      await emailService.sendShippingNotification({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        trackingNumber: '',
      });

      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('sendDeliveryConfirmation', () => {
    it('should send delivery confirmation email', async () => {
      await emailService.sendDeliveryConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
        userName: 'John Doe',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0] as any;

      expect(callArgs.to).toBe('customer@example.com');
      expect(callArgs.subject).toContain('Delivered');
      expect(callArgs.subject).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain('delivered');
    });

    it('should include order items in delivery email', async () => {
      await emailService.sendDeliveryConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Handmade Pashmina Shawl');
      expect(callArgs.html).toContain('Nepali Tea Set');
    });

    it('should encourage customer to leave review', async () => {
      await emailService.sendDeliveryConfirmation({
        order: sampleOrder,
        userEmail: 'customer@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('review');
      expect(callArgs.html).toContain('Experience');
    });
  });

  describe('sendSellerNotification', () => {
    it('should send seller notification for new order', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
        sellerName: 'Artisan Shop',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0] as any;

      expect(callArgs.to).toBe('seller@example.com');
      expect(callArgs.subject).toContain('New Order');
      expect(callArgs.subject).toContain(sampleOrder.orderNumber);
      expect(callArgs.html).toContain('Artisan Shop');
    });

    it('should include order items in seller notification', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Handmade Pashmina Shawl');
      expect(callArgs.html).toContain('Nepali Tea Set');
    });

    it('should include shipping address for seller', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('John Doe');
      expect(callArgs.html).toContain('123 Main Street');
      expect(callArgs.html).toContain('+977-9841234567');
    });

    it('should include payment information for seller', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('ESEWA');
      expect(callArgs.html).toContain('completed');
    });

    it('should include next steps for seller', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Next Steps');
      expect(callArgs.html).toContain('Prepare');
      expect(callArgs.html).toContain('tracking');
    });

    it('should handle missing seller name', async () => {
      await emailService.sendSellerNotification({
        order: sampleOrder,
        sellerEmail: 'seller@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('Seller');
    });
  });

  describe('Email Template Content', () => {
    it('should include Made in Nepal branding in all emails', async () => {
      const emails = [
        () =>
          emailService.sendOrderConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
        () =>
          emailService.sendShippingNotification({
            order: sampleOrder,
            userEmail: 'test@example.com',
            trackingNumber: 'TRK123',
          }),
        () =>
          emailService.sendDeliveryConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
        () =>
          emailService.sendSellerNotification({
            order: sampleOrder,
            sellerEmail: 'test@example.com',
          }),
      ];

      for (const sendEmail of emails) {
        await sendEmail();
        const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0] as any;
        expect(callArgs.html).toContain('Made in Nepal');
      }
    });

    it('should use responsive HTML templates', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'test@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('<!DOCTYPE html>');
      expect(callArgs.html).toContain('viewport');
      expect(callArgs.html).toContain('max-width: 600px');
    });

    it('should format currency correctly in all emails', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'test@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain('NPR 11700.00');
      expect(callArgs.html).toContain('NPR 11500.00'); // subtotal
      expect(callArgs.html).toContain('NPR 200.00'); // shipping
    });
  });

  describe('Error Handling', () => {
    it('should handle SMTP connection errors', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(
        emailService.sendOrderConfirmation({
          order: sampleOrder,
          userEmail: 'test@example.com',
        })
      ).rejects.toThrow('Email delivery failed');
    });

    it('should handle invalid email addresses', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Invalid recipient'));

      await expect(
        emailService.sendOrderConfirmation({
          order: sampleOrder,
          userEmail: 'invalid-email',
        })
      ).rejects.toThrow('Email delivery failed');
    });

    it('should handle network timeouts', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        emailService.sendShippingNotification({
          order: sampleOrder,
          userEmail: 'test@example.com',
          trackingNumber: 'TRK123',
        })
      ).rejects.toThrow('Email delivery failed');
    });
  });

  describe('Email Content Completeness', () => {
    it('should include order number in all notification emails', async () => {
      const emails = [
        () =>
          emailService.sendOrderConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
        () =>
          emailService.sendShippingNotification({
            order: sampleOrder,
            userEmail: 'test@example.com',
            trackingNumber: 'TRK123',
          }),
        () =>
          emailService.sendDeliveryConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
        () =>
          emailService.sendSellerNotification({
            order: sampleOrder,
            sellerEmail: 'test@example.com',
          }),
      ];

      for (const sendEmail of emails) {
        await sendEmail();
        const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0] as any;
        expect(callArgs.html).toContain(sampleOrder.orderNumber);
      }
    });

    it('should include total amount in all notification emails', async () => {
      const emails = [
        () =>
          emailService.sendOrderConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
        () =>
          emailService.sendShippingNotification({
            order: sampleOrder,
            userEmail: 'test@example.com',
            trackingNumber: 'TRK123',
          }),
        () =>
          emailService.sendDeliveryConfirmation({
            order: sampleOrder,
            userEmail: 'test@example.com',
          }),
      ];

      for (const sendEmail of emails) {
        await sendEmail();
        const callArgs = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0] as any;
        expect(callArgs.html).toContain('11700');
      }
    });

    it('should include current status in notification emails', async () => {
      await emailService.sendOrderConfirmation({
        order: sampleOrder,
        userEmail: 'test@example.com',
      });

      const callArgs = mockSendMail.mock.calls[0][0] as any;
      expect(callArgs.html).toContain(sampleOrder.status);
    });
  });
});
