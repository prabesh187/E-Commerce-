import { Router } from 'express';
import { searchProducts, getSuggestions } from '../controllers/searchController.js';

const router = Router();

/**
 * Public routes - No authentication required
 */

// GET /api/search/suggestions - Get autocomplete suggestions
// This route must come before the generic search route to avoid conflicts
router.get('/suggestions', getSuggestions);

// GET /api/search - Search products
router.get('/', searchProducts);

export default router;
