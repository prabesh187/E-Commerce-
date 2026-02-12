import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { sellerService } from '../services/SellerService.js';

/**
 * Seller controller
 * Handles seller dashboard, products, and orders
 */

/**
 * Get seller dashboard analytics
 * GET /api/seller/dashboard
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const analytics = await sellerService.getSellerDashboard(sellerId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get seller dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard analytics',
      },
    });
  }
};

/**
 * Get seller's products
 * GET /api/seller/products
 */
export const getProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { page, limit } = req.query;

    const result = await sellerService.getSellerProducts(
      sellerId,
      {}, // filters
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch products',
      },
    });
  }
};

/**
 * Get seller's orders
 * GET /api/seller/orders
 */
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { page, limit } = req.query;

    const result = await sellerService.getSellerOrders(
      sellerId,
      {}, // filters
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch orders',
      },
    });
  }
};
