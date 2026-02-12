import { Response } from 'express';
import { recommendationService } from '../services/RecommendationService.js';
import { AuthRequest } from '../types/express.js';

/**
 * Get related products for a specific product
 * GET /api/products/:id/related
 */
export const getRelatedProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!id || typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'The provided product ID is invalid',
        },
      });
      return;
    }

    const relatedProducts = await recommendationService.getRelatedProducts(id, limit);

    res.status(200).json({
      success: true,
      data: relatedProducts,
      count: relatedProducts.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid product ID') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'The provided product ID is invalid',
          },
        });
        return;
      }

      if (error.message === 'Product not found') {
        res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching related products',
      },
    });
  }
};

/**
 * Get personalized recommendations for the authenticated user
 * GET /api/recommendations
 */
export const getPersonalizedRecommendations = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await recommendationService.getPersonalizedRecommendations(
      userId,
      limit
    );

    res.status(200).json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid user ID') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The provided user ID is invalid',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching recommendations',
      },
    });
  }
};
