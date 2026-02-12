import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Order Routes
 * All routes require authentication
 * 
 * POST /api/orders - Create order with payment method
 * GET /api/orders - Get user's order history
 * GET /api/orders/:id - Get order details
 * PUT /api/orders/:id/status - Update order status (seller/admin)
 */

// All order routes require authentication
router.use(authenticate);

// POST /api/orders - Create order
router.post('/', createOrder);

// GET /api/orders - Get user's order history
router.get('/', getUserOrders);

// GET /api/orders/:id - Get order details
router.get('/:id', getOrderById);

// PUT /api/orders/:id/status - Update order status (seller/admin)
// Buyers can also cancel their own orders, authorization is handled in the controller
router.put('/:id/status', updateOrderStatus);

export default router;
