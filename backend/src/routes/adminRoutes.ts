import { Router } from 'express';
import {
  getPendingSellers,
  verifySeller,
  getPendingProducts,
  verifyProduct,
  getAnalytics,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/index.js';

const router = Router();

/**
 * Admin Routes
 * All routes require admin authentication
 * 
 * GET /api/admin/sellers/pending - Get pending sellers
 * PUT /api/admin/sellers/:id/verify - Verify seller
 * GET /api/admin/products/pending - Get pending products
 * PUT /api/admin/products/:id/verify - Verify product
 * GET /api/admin/analytics - Get platform analytics
 * POST /api/admin/banners - Create banner
 * PUT /api/admin/banners/:id - Update banner
 * DELETE /api/admin/banners/:id - Delete banner
 */

// Apply authentication and admin role requirement to all routes
router.use(authenticate, requireRole('admin'));

// Seller management routes
router.get('/sellers/pending', getPendingSellers);
router.put('/sellers/:id/verify', verifySeller);

// Product management routes
router.get('/products/pending', getPendingProducts);
router.put('/products/:id/verify', verifyProduct);

// Analytics routes
router.get('/analytics', getAnalytics);

// Banner management routes
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

export default router;
