import { Router } from 'express';
import { getRecentlyViewed } from '../controllers/recentlyViewedController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * Recently Viewed Routes
 * All routes require authentication
 * 
 * GET /api/recently-viewed - Get recently viewed products
 */

// All recently viewed routes require authentication
router.use(authenticate);

// GET /api/recently-viewed - Get recently viewed products
router.get('/', getRecentlyViewed);

export default router;
