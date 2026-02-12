import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Cart Routes
 * All routes require authentication
 * 
 * GET /api/cart - Get user's cart
 * POST /api/cart - Add item to cart
 * PUT /api/cart/:itemId - Update item quantity
 * DELETE /api/cart/:itemId - Remove item from cart
 */

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart - Get user's cart
router.get('/', getCart);

// POST /api/cart - Add item to cart
router.post('/', addToCart);

// PUT /api/cart/:itemId - Update item quantity
router.put('/:itemId', updateCartItem);

// DELETE /api/cart/:itemId - Remove item from cart
router.delete('/:itemId', removeFromCart);

export default router;
