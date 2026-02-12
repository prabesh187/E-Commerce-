import mongoose from 'mongoose';
import crypto from 'crypto';
import axios from 'axios';
import Payment, { IPayment } from '../models/Payment.js';
import Order from '../models/Order.js';

/**
 * Interface for eSewa payment initiation response
 */
export interface EsewaPaymentInitiation {
  paymentUrl: string;
  transactionUuid: string;
}

/**
 * Interface for Khalti payment initiation response
 */
export interface KhaltiPaymentInitiation {
  paymentUrl: string;
  pidx: string;
}

/**
 * Interface for payment verification result
 */
export interface PaymentVerificationResult {
  verified: boolean;
  transactionId: string;
  amount: number;
  status: 'completed' | 'failed';
  message?: string;
}

/**
 * PaymentService handles payment gateway integration for eSewa and Khalti
 */
export class PaymentService {
  private esewaConfig = {
    merchantId: process.env.ESEWA_MERCHANT_ID || '',
    secretKey: process.env.ESEWA_SECRET_KEY || '',
    paymentUrl: process.env.ESEWA_PAYMENT_URL || 'https://uat.esewa.com.np/epay/main',
    verifyUrl: process.env.ESEWA_VERIFY_URL || 'https://uat.esewa.com.np/epay/transrec',
  };

  private khaltiConfig = {
    secretKey: process.env.KHALTI_SECRET_KEY || '',
    publicKey: process.env.KHALTI_PUBLIC_KEY || '',
    paymentUrl: process.env.KHALTI_PAYMENT_URL || 'https://khalti.com/api/v2/payment/initiate/',
    verifyUrl: process.env.KHALTI_VERIFY_URL || 'https://khalti.com/api/v2/payment/verify/',
  };

  private frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  /**
   * Initiate eSewa payment
   * @param orderId - Order ID
   * @param amount - Payment amount
   * @returns Payment URL and transaction UUID
   * @throws Error if order not found or payment initiation fails
   */
  async initiateEsewaPayment(
    orderId: string,
    amount: number
  ): Promise<EsewaPaymentInitiation> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify amount matches order total
    if (Math.abs(order.totalAmount - amount) > 0.01) {
      throw new Error('Payment amount does not match order total');
    }

    // Generate unique transaction UUID
    const transactionUuid = crypto.randomUUID();

    // Create payment record
    const payment = new Payment({
      orderId: new mongoose.Types.ObjectId(orderId),
      gateway: 'esewa',
      amount,
      status: 'pending',
      transactionId: transactionUuid,
    });

    await payment.save();

    // Build eSewa payment URL with parameters
    const params = new URLSearchParams({
      amt: amount.toString(),
      psc: '0', // Service charge
      pdc: '0', // Delivery charge
      txAmt: '0', // Tax amount
      tAmt: amount.toString(), // Total amount
      pid: transactionUuid, // Product/Transaction ID
      scd: this.esewaConfig.merchantId, // Merchant code
      su: `${this.frontendUrl}/payment/esewa/success?orderId=${orderId}`, // Success URL
      fu: `${this.frontendUrl}/payment/esewa/failure?orderId=${orderId}`, // Failure URL
    });

    const paymentUrl = `${this.esewaConfig.paymentUrl}?${params.toString()}`;

    return {
      paymentUrl,
      transactionUuid,
    };
  }

  /**
   * Verify eSewa payment
   * @param orderId - Order ID
   * @param transactionId - Transaction ID from eSewa callback
   * @returns Verification result
   * @throws Error if verification fails
   */
  async verifyEsewaPayment(
    orderId: string,
    transactionId: string
  ): Promise<PaymentVerificationResult> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    // Find payment record
    const payment = await Payment.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
      gateway: 'esewa',
      transactionId,
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    try {
      // Call eSewa verification API
      const verifyParams = new URLSearchParams({
        amt: payment.amount.toString(),
        rid: transactionId,
        pid: transactionId,
        scd: this.esewaConfig.merchantId,
      });

      const response = await axios.get(
        `${this.esewaConfig.verifyUrl}?${verifyParams.toString()}`,
        {
          timeout: 10000,
        }
      );

      // eSewa returns XML response, check for success
      const responseText = response.data;
      const isSuccess = responseText.includes('<response_code>Success</response_code>');

      if (isSuccess) {
        // Update payment status
        payment.status = 'completed';
        payment.gatewayResponse = { response: responseText };
        await payment.save();

        // Update order status
        order.paymentStatus = 'completed';
        order.paymentTransactionId = transactionId;
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        await order.save();

        return {
          verified: true,
          transactionId,
          amount: payment.amount,
          status: 'completed',
          message: 'Payment verified successfully',
        };
      } else {
        // Payment verification failed
        payment.status = 'failed';
        payment.gatewayResponse = { response: responseText };
        payment.errorMessage = 'Payment verification failed';
        await payment.save();

        order.paymentStatus = 'failed';
        await order.save();

        return {
          verified: false,
          transactionId,
          amount: payment.amount,
          status: 'failed',
          message: 'Payment verification failed',
        };
      }
    } catch (error) {
      // Handle verification error
      payment.status = 'failed';
      payment.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await payment.save();

      order.paymentStatus = 'failed';
      await order.save();

      throw new Error(`eSewa verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initiate Khalti payment
   * @param orderId - Order ID
   * @param amount - Payment amount (in paisa - 1 NPR = 100 paisa)
   * @returns Payment URL and payment index
   * @throws Error if order not found or payment initiation fails
   */
  async initiateKhaltiPayment(
    orderId: string,
    amount: number
  ): Promise<KhaltiPaymentInitiation> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Verify amount matches order total
    if (Math.abs(order.totalAmount - amount) > 0.01) {
      throw new Error('Payment amount does not match order total');
    }

    // Convert amount to paisa (Khalti uses paisa)
    const amountInPaisa = Math.round(amount * 100);

    try {
      // Call Khalti payment initiation API
      const response = await axios.post(
        this.khaltiConfig.paymentUrl,
        {
          return_url: `${this.frontendUrl}/payment/khalti/callback`,
          website_url: this.frontendUrl,
          amount: amountInPaisa,
          purchase_order_id: orderId,
          purchase_order_name: `Order ${order.orderNumber}`,
        },
        {
          headers: {
            Authorization: `Key ${this.khaltiConfig.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const { pidx, payment_url } = response.data;

      // Create payment record
      const payment = new Payment({
        orderId: new mongoose.Types.ObjectId(orderId),
        gateway: 'khalti',
        amount,
        status: 'pending',
        transactionId: pidx,
        gatewayResponse: response.data,
      });

      await payment.save();

      return {
        paymentUrl: payment_url,
        pidx,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Khalti payment initiation failed: ${error.response?.data?.message || error.message}`
        );
      }
      throw new Error(`Khalti payment initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify Khalti payment
   * @param orderId - Order ID
   * @param token - Payment token/pidx from Khalti callback
   * @returns Verification result
   * @throws Error if verification fails
   */
  async verifyKhaltiPayment(
    orderId: string,
    token: string
  ): Promise<PaymentVerificationResult> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    // Find payment record
    const payment = await Payment.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
      gateway: 'khalti',
      transactionId: token,
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    try {
      // Call Khalti verification API
      const response = await axios.post(
        this.khaltiConfig.verifyUrl,
        {
          pidx: token,
        },
        {
          headers: {
            Authorization: `Key ${this.khaltiConfig.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const verificationData = response.data;

      // Check if payment is completed
      if (verificationData.status === 'Completed') {
        // Update payment status
        payment.status = 'completed';
        payment.gatewayResponse = verificationData;
        await payment.save();

        // Update order status
        order.paymentStatus = 'completed';
        order.paymentTransactionId = token;
        order.status = 'confirmed';
        order.confirmedAt = new Date();
        await order.save();

        return {
          verified: true,
          transactionId: token,
          amount: payment.amount,
          status: 'completed',
          message: 'Payment verified successfully',
        };
      } else {
        // Payment not completed
        payment.status = 'failed';
        payment.gatewayResponse = verificationData;
        payment.errorMessage = `Payment status: ${verificationData.status}`;
        await payment.save();

        order.paymentStatus = 'failed';
        await order.save();

        return {
          verified: false,
          transactionId: token,
          amount: payment.amount,
          status: 'failed',
          message: `Payment not completed: ${verificationData.status}`,
        };
      }
    } catch (error) {
      // Handle verification error
      payment.status = 'failed';
      payment.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await payment.save();

      order.paymentStatus = 'failed';
      await order.save();

      if (axios.isAxiosError(error)) {
        throw new Error(
          `Khalti verification failed: ${error.response?.data?.message || error.message}`
        );
      }
      throw new Error(`Khalti verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle payment callback from gateway redirects
   * @param gateway - Payment gateway (esewa or khalti)
   * @param data - Callback data from gateway
   * @returns Verification result
   * @throws Error if callback handling fails
   */
  async handlePaymentCallback(
    gateway: 'esewa' | 'khalti',
    data: Record<string, any>
  ): Promise<PaymentVerificationResult> {
    if (gateway === 'esewa') {
      // eSewa callback includes: oid (order ID), amt, refId
      const { oid: orderId, refId } = data;
      
      if (!orderId || !refId) {
        throw new Error('Missing required callback parameters');
      }

      return this.verifyEsewaPayment(orderId, refId);
    } else if (gateway === 'khalti') {
      // Khalti callback includes: pidx, transaction_id, amount, purchase_order_id
      const { pidx, purchase_order_id: orderId } = data;
      
      if (!orderId || !pidx) {
        throw new Error('Missing required callback parameters');
      }

      return this.verifyKhaltiPayment(orderId, pidx);
    } else {
      throw new Error('Unsupported payment gateway');
    }
  }

  /**
   * Get payment record by order ID
   * @param orderId - Order ID
   * @returns Payment record
   * @throws Error if payment not found
   */
  async getPaymentByOrderId(orderId: string): Promise<IPayment> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const payment = await Payment.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
    }).sort({ createdAt: -1 });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    return payment;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
