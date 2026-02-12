import { Router } from 'express';
import { getDashboard, getProducts, getOrders } from '../controllers/sellerController.js';
import { authenticate, requireRole } from '../middleware/index.js';

const router = Router();

/**
 * Seller Routes
 * All routes require seller authentication
 * 
 * GET /api/seller/dashboard - Get seller analytics
 * GET /api/seller/products - Get seller's products
 * GET /api/seller/orders - Get seller's orders
 */

// Apply authentication and seller role requirement to all routes
router.use(authenticate, requireRole('seller'));

// Seller routes
router.get('/dashboard', getDashboard);
router.get('/products', getProducts);
router.get('/orders', getOrders);

export default router;
