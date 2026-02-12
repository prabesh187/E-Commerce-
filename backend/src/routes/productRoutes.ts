import { Router } from 'express';
import {
  uploadImage,
  uploadImages,
  uploadSingle,
  uploadMultiple,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getRelatedProducts,
} from '../controllers/productController.js';
import {
  getProductReviews,
  submitReview,
} from '../controllers/reviewController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * Public routes
 */

// GET /api/products - Get all products with filters
router.get('/', getProducts);

// GET /api/products/:id - Get product by ID
router.get('/:id', getProduct);

// GET /api/products/:id/related - Get related products
router.get('/:id/related', getRelatedProducts);

// GET /api/products/:id/reviews - Get product reviews (public)
router.get('/:id/reviews', getProductReviews);

/**
 * Protected routes - Require authentication
 */

// POST /api/products/:id/reviews - Submit review (authenticated)
router.post('/:id/reviews', authenticate, submitReview);

// POST /api/products/upload-image - Upload single image
router.post(
  '/upload-image',
  authenticate,
  requireRole('seller', 'admin'),
  uploadSingle,
  uploadImage
);

// POST /api/products/upload-images - Upload multiple images
router.post(
  '/upload-images',
  authenticate,
  requireRole('seller', 'admin'),
  uploadMultiple,
  uploadImages
);

// POST /api/products - Create new product (seller only)
router.post(
  '/',
  authenticate,
  requireRole('seller'),
  createProduct
);

// PUT /api/products/:id - Update product (seller only)
router.put(
  '/:id',
  authenticate,
  requireRole('seller'),
  updateProduct
);

// DELETE /api/products/:id - Delete product (seller only)
router.delete(
  '/:id',
  authenticate,
  requireRole('seller'),
  deleteProduct
);

export default router;
