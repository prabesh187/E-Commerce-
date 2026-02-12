import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { paymentService } from '../services/PaymentService.js';

/**
 * Initiate eSewa payment
 * POST /api/payment/esewa/initiate
 * Body: { orderId: string, amount: number }
 */
export const initiateEsewaPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { orderId, amount } = req.body;

    // Validate input
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_ID',
          message: 'Order ID is required',
        },
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Valid payment amount is required',
        },
      });
      return;
    }

    const result = await paymentService.initiateEsewaPayment(orderId, amount);

    res.status(200).json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        transactionUuid: result.transactionUuid,
      },
    });
  } catch (error) {
    console.error('Error initiating eSewa payment:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid order ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_ID',
            message: error.message,
          },
        });
        return;
      }

      if (error.message === 'Order not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('amount does not match')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: error.message,
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_INITIATION_FAILED',
        message: 'Failed to initiate eSewa payment',
      },
    });
  }
};

/**
 * Verify eSewa payment
 * POST /api/payment/esewa/verify
 * Body: { orderId: string, transactionId: string }
 */
export const verifyEsewaPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId, transactionId } = req.body;

    // Validate input
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_ID',
          message: 'Order ID is required',
        },
      });
      return;
    }

    if (!transactionId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TRANSACTION_ID',
          message: 'Transaction ID is required',
        },
      });
      return;
    }

    const result = await paymentService.verifyEsewaPayment(orderId, transactionId);

    if (result.verified) {
      res.status(200).json({
        success: true,
        data: {
          verified: true,
          transactionId: result.transactionId,
          amount: result.amount,
          status: result.status,
          message: result.message,
        },
      });
    } else {
      res.status(402).json({
        success: false,
        error: {
          code: 'PAYMENT_VERIFICATION_FAILED',
          message: result.message || 'Payment verification failed',
        },
        data: {
          verified: false,
          transactionId: result.transactionId,
          amount: result.amount,
          status: result.status,
        },
      });
    }
  } catch (error) {
    console.error('Error verifying eSewa payment:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid order ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_ID',
            message: error.message,
          },
        });
        return;
      }

      if (error.message === 'Order not found' || error.message === 'Payment record not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('verification failed')) {
        res.status(402).json({
          success: false,
          error: {
            code: 'PAYMENT_VERIFICATION_FAILED',
            message: error.message,
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify eSewa payment',
      },
    });
  }
};

/**
 * Initiate Khalti payment
 * POST /api/payment/khalti/initiate
 * Body: { orderId: string, amount: number }
 */
export const initiateKhaltiPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { orderId, amount } = req.body;

    // Validate input
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_ID',
          message: 'Order ID is required',
        },
      });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Valid payment amount is required',
        },
      });
      return;
    }

    const result = await paymentService.initiateKhaltiPayment(orderId, amount);

    res.status(200).json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        pidx: result.pidx,
      },
    });
  } catch (error) {
    console.error('Error initiating Khalti payment:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid order ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_ID',
            message: error.message,
          },
        });
        return;
      }

      if (error.message === 'Order not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('amount does not match')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'AMOUNT_MISMATCH',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('Khalti payment initiation failed')) {
        res.status(502).json({
          success: false,
          error: {
            code: 'GATEWAY_ERROR',
            message: error.message,
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_INITIATION_FAILED',
        message: 'Failed to initiate Khalti payment',
      },
    });
  }
};

/**
 * Verify Khalti payment
 * POST /api/payment/khalti/verify
 * Body: { orderId: string, token: string }
 */
export const verifyKhaltiPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId, token } = req.body;

    // Validate input
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_ID',
          message: 'Order ID is required',
        },
      });
      return;
    }

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Payment token is required',
        },
      });
      return;
    }

    const result = await paymentService.verifyKhaltiPayment(orderId, token);

    if (result.verified) {
      res.status(200).json({
        success: true,
        data: {
          verified: true,
          transactionId: result.transactionId,
          amount: result.amount,
          status: result.status,
          message: result.message,
        },
      });
    } else {
      res.status(402).json({
        success: false,
        error: {
          code: 'PAYMENT_VERIFICATION_FAILED',
          message: result.message || 'Payment verification failed',
        },
        data: {
          verified: false,
          transactionId: result.transactionId,
          amount: result.amount,
          status: result.status,
        },
      });
    }
  } catch (error) {
    console.error('Error verifying Khalti payment:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid order ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_ID',
            message: error.message,
          },
        });
        return;
      }

      if (error.message === 'Order not found' || error.message === 'Payment record not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('verification failed')) {
        res.status(402).json({
          success: false,
          error: {
            code: 'PAYMENT_VERIFICATION_FAILED',
            message: error.message,
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify Khalti payment',
      },
    });
  }
};
