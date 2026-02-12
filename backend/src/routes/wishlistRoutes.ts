import { Router } from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
} from '../controllers/wishlistController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Wishlist Routes
 * All routes require authentication
 * 
 * GET /api/wishlist - Get user's wishlist
 * POST /api/wishlist - Add product to wishlist
 * DELETE /api/wishlist/:productId - Remove product from wishlist
 * POST /api/wishlist/:productId/move-to-cart - Move product to cart
 */

// All wishlist routes require authentication
router.use(authenticate);

// GET /api/wishlist - Get user's wishlist
router.get('/', getWishlist);

// POST /api/wishlist - Add product to wishlist
router.post('/', addToWishlist);

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete('/:productId', removeFromWishlist);

// POST /api/wishlist/:productId/move-to-cart - Move product to cart
router.post('/:productId/move-to-cart', moveToCart);

export default router;
