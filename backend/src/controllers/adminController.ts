import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { adminService } from '../services/AdminService.js';

/**
 * Admin controller
 * Handles admin operations for sellers, products, analytics, and banners
 */

/**
 * Get pending sellers
 * GET /api/admin/sellers/pending
 */
export const getPendingSellers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellers = await adminService.getPendingSellers();

    res.status(200).json({
      success: true,
      data: sellers,
    });
  } catch (error) {
    console.error('Get pending sellers error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch pending sellers',
      },
    });
  }
};

/**
 * Verify seller
 * PUT /api/admin/sellers/:id/verify
 */
export const verifySeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'approved field must be a boolean',
        },
      });
      return;
    }

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Seller ID must be a single value',
        },
      });
      return;
    }

    const seller = await adminService.verifySeller(id, approved);

    res.status(200).json({
      success: true,
      data: seller,
    });
  } catch (error) {
    console.error('Verify seller error:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'VERIFY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify seller',
      },
    });
  }
};

/**
 * Get pending products
 * GET /api/admin/products/pending
 */
export const getPendingProducts = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await adminService.getPendingProducts();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch pending products',
      },
    });
  }
};

/**
 * Verify product
 * PUT /api/admin/products/:id/verify
 */
export const verifyProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'approved field must be a boolean',
        },
      });
      return;
    }

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID must be a single value',
        },
      });
      return;
    }

    const product = await adminService.verifyProduct(id, approved);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Verify product error:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'VERIFY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to verify product',
      },
    });
  }
};

/**
 * Get platform analytics
 * GET /api/admin/analytics
 */
export const getAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analytics = await adminService.getPlatformAnalytics();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch platform analytics',
      },
    });
  }
};

/**
 * Create banner
 * POST /api/admin/banners
 */
export const createBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const banner = await adminService.createBanner(req.body);

    res.status(201).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create banner',
      },
    });
  }
};

/**
 * Update banner
 * PUT /api/admin/banners/:id
 */
export const updateBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Banner ID must be a single value',
        },
      });
      return;
    }

    const banner = await adminService.updateBanner(id, req.body);

    res.status(200).json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error('Update banner error:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update banner',
      },
    });
  }
};

/**
 * Delete banner
 * DELETE /api/admin/banners/:id
 */
export const deleteBanner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Banner ID must be a single value',
        },
      });
      return;
    }

    const result = await adminService.deleteBanner(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete banner',
      },
    });
  }
};
