import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { recentlyViewedService } from '../services/RecentlyViewedService.js';

/**
 * Get recently viewed products
 * GET /api/recently-viewed
 */
export const getRecentlyViewed = async (
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

    const recentlyViewed = await recentlyViewedService.getRecentlyViewed(userId);

    res.status(200).json({
      success: true,
      data: {
        recentlyViewed: {
          products: recentlyViewed.products,
        },
      },
    });
  } catch (error) {
    console.error('Error getting recently viewed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get recently viewed products',
      },
    });
  }
};
