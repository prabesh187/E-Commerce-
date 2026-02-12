import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { orderService } from '../services/OrderService.js';

/**
 * Create a new order
 * POST /api/orders
 * Body: { cartItems: Array<{productId: string, quantity: number}>, shippingAddress: object, paymentMethod: string, shippingCost?: number }
 */
export const createOrder = async (
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

    const { cartItems, shippingAddress, paymentMethod, shippingCost } = req.body;

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CART_ITEMS',
          message: 'Cart items are required',
        },
      });
      return;
    }

    if (!shippingAddress) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SHIPPING_ADDRESS',
          message: 'Shipping address is required',
        },
      });
      return;
    }

    if (!paymentMethod || !['esewa', 'khalti', 'cod'].includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT_METHOD',
          message: 'Valid payment method is required (esewa, khalti, or cod)',
        },
      });
      return;
    }

    // Validate shipping address fields
    const requiredAddressFields = ['fullName', 'phone', 'addressLine1', 'city', 'district'];
    for (const field of requiredAddressFields) {
      if (!shippingAddress[field]) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SHIPPING_ADDRESS',
            message: `Shipping address ${field} is required`,
          },
        });
        return;
      }
    }

    // Create order
    const order = await orderService.createOrder({
      buyerId: userId,
      cartItems,
      shippingAddress,
      paymentMethod,
      shippingCost,
    });

    res.status(201).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          items: order.items,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          subtotal: order.subtotal,
          shippingCost: order.shippingCost,
          totalAmount: order.totalAmount,
          status: order.status,
          trackingNumber: order.trackingNumber,
          createdAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('Cart is empty') ||
        error.message.includes('Invalid product ID') ||
        error.message.includes('Quantity must be') ||
        error.message.includes('Insufficient inventory') ||
        error.message.includes('not available') ||
        error.message.includes('not approved')
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_DATA',
            message: error.message,
          },
        });
        return;
      }

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
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
        message: 'Failed to create order',
      },
    });
  }
};

/**
 * Get user's order history
 * GET /api/orders
 * Query: { page?: number, limit?: number }
 */
export const getUserOrders = async (
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getUserOrders(userId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting user orders:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get orders',
      },
    });
  }
};

/**
 * Get order details by ID
 * GET /api/orders/:id
 */
export const getOrderById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const orderId = req.params.id as string;

    const order = await orderService.getOrderById(orderId, userId, userRole);

    res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    console.error('Error getting order:', error);

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

      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
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
        message: 'Failed to get order',
      },
    });
  }
};

/**
 * Update order status
 * PUT /api/orders/:id/status
 * Body: { status: string }
 */
export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const orderId = req.params.id as string;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Valid status is required (pending, confirmed, shipped, delivered, cancelled)',
        },
      });
      return;
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      userId,
      userRole
    );

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          confirmedAt: order.confirmedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          cancelledAt: order.cancelledAt,
        },
      },
    });
  } catch (error) {
    console.error('Error updating order status:', error);

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

      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message,
          },
        });
        return;
      }

      if (
        error.message.includes('Invalid status transition') ||
        error.message.includes('can only') ||
        error.message.includes('Cannot cancel')
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
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
        message: 'Failed to update order status',
      },
    });
  }
};
