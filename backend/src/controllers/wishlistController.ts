import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { wishlistService } from '../services/WishlistService.js';

/**
 * Get user's wishlist
 * GET /api/wishlist
 */
export const getWishlist = async (
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

    const wishlist = await wishlistService.getWishlist(userId);

    res.status(200).json({
      success: true,
      data: {
        wishlist: {
          products: wishlist.products,
        },
      },
    });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get wishlist',
      },
    });
  }
};

/**
 * Add product to wishlist
 * POST /api/wishlist
 * Body: { productId: string }
 */
export const addToWishlist = async (
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

    const { productId } = req.body;

    // Validate input
    if (!productId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required',
        },
      });
      return;
    }

    const wishlist = await wishlistService.addToWishlist(userId, productId);

    res.status(200).json({
      success: true,
      data: {
        wishlist: {
          products: wishlist.products,
        },
      },
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);

    if (error instanceof Error) {
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

      if (error.message === 'Product already in wishlist') {
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_PRODUCT',
            message: 'Product already in wishlist',
          },
        });
        return;
      }

      if (
        error.message === 'Product is not available' ||
        error.message === 'Product is not approved'
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PRODUCT_UNAVAILABLE',
            message: error.message,
          },
        });
        return;
      }

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
        message: 'Failed to add product to wishlist',
      },
    });
  }
};

/**
 * Remove product from wishlist
 * DELETE /api/wishlist/:productId
 */
export const removeFromWishlist = async (
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

    const productId = req.params.productId as string;

    const wishlist = await wishlistService.removeFromWishlist(userId, productId);

    res.status(200).json({
      success: true,
      data: {
        wishlist: {
          products: wishlist.products,
        },
      },
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Wishlist not found' ||
        error.message === 'Product not found in wishlist'
      ) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

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
        message: 'Failed to remove product from wishlist',
      },
    });
  }
};

/**
 * Move product from wishlist to cart
 * POST /api/wishlist/:productId/move-to-cart
 * Body: { quantity?: number } (optional, defaults to 1)
 */
export const moveToCart = async (
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

    const productId = req.params.productId as string;
    const { quantity = 1 } = req.body;

    // Validate quantity
    if (quantity < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1',
        },
      });
      return;
    }

    const wishlist = await wishlistService.moveToCart(userId, productId, quantity);

    res.status(200).json({
      success: true,
      data: {
        wishlist: {
          products: wishlist.products,
        },
        message: 'Product moved to cart successfully',
      },
    });
  } catch (error) {
    console.error('Error moving to cart:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Wishlist not found' ||
        error.message === 'Product not found in wishlist' ||
        error.message === 'Product not found'
      ) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
        return;
      }

      if (
        error.message === 'Product is not available' ||
        error.message === 'Product is not approved for sale' ||
        error.message.includes('items available in stock')
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'PRODUCT_UNAVAILABLE',
            message: error.message,
          },
        });
        return;
      }

      if (
        error.message === 'Invalid product ID' ||
        error.message === 'Quantity must be at least 1'
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
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to move product to cart',
      },
    });
  }
};
