import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { reviewService } from '../services/ReviewService.js';

/**
 * Get all reviews for a product
 * GET /api/products/:id/reviews
 * Query: { page?: number, limit?: number }
 */
export const getProductReviews = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const productId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await reviewService.getProductReviews(productId, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting product reviews:', error);

    if (error instanceof Error) {
      if (error.message === 'Invalid product ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
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
        message: 'Failed to get product reviews',
      },
    });
  }
};

/**
 * Submit a review for a product
 * POST /api/products/:id/reviews
 * Body: { rating: number, text?: string }
 */
export const submitReview = async (
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

    const productId = req.params.id as string;
    const { rating, text } = req.body;

    // Validate rating
    if (rating === undefined || rating === null || typeof rating !== 'number') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_RATING',
          message: 'Rating is required',
        },
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5',
        },
      });
      return;
    }

    // Submit review
    const review = await reviewService.submitReview({
      productId,
      buyerId: userId,
      rating,
      text,
    });

    res.status(201).json({
      success: true,
      data: {
        review: {
          _id: review._id,
          productId: review.productId,
          buyerId: review.buyerId,
          orderId: review.orderId,
          rating: review.rating,
          text: review.text,
          createdAt: review.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Invalid product ID' ||
        error.message === 'Invalid buyer ID' ||
        error.message === 'Rating must be between 1 and 5'
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: error.message,
          },
        });
        return;
      }

      if (error.message === 'You have already reviewed this product') {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_REVIEW',
            message: error.message,
          },
        });
        return;
      }

      if (
        error.message === 'You can only review products you have purchased and received'
      ) {
        res.status(403).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED_REVIEW',
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
        message: 'Failed to submit review',
      },
    });
  }
};
