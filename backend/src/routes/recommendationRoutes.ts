import { Router } from 'express';
import {
  getRelatedProducts,
  getPersonalizedRecommendations,
} from '../controllers/recommendationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @route   GET /api/products/:id/related
 * @desc    Get related products for a specific product
 * @access  Public
 */
router.get('/products/:id/related', getRelatedProducts);

/**
 * @route   GET /api/recommendations
 * @desc    Get personalized recommendations for authenticated user
 * @access  Private
 */
router.get('/recommendations', authenticate, getPersonalizedRecommendations);

export default router;
