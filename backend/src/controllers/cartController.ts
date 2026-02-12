import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { cartService } from '../services/CartService.js';

/**
 * Get user's cart
 * GET /api/cart
 */
export const getCart = async (
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

    const cart = await cartService.getCart(userId);

    // If cart doesn't exist, return empty cart
    if (!cart) {
      res.status(200).json({
        success: true,
        data: {
          cart: {
            items: [],
            totalAmount: 0,
          },
        },
      });
      return;
    }

    const totalAmount = cartService.calculateTotal(cart);

    res.status(200).json({
      success: true,
      data: {
        cart: {
          items: cart.items,
          totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get cart',
      },
    });
  }
};

/**
 * Add item to cart
 * POST /api/cart
 * Body: { productId: string, quantity: number }
 */
export const addToCart = async (
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

    const { productId, quantity } = req.body;

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

    if (!quantity || quantity < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1',
        },
      });
      return;
    }

    const cart = await cartService.addToCart(userId, productId, quantity);
    const totalAmount = cartService.calculateTotal(cart);

    res.status(200).json({
      success: true,
      data: {
        cart: {
          items: cart.items,
          totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Error adding to cart:', error);

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

      if (
        error.message === 'Product is not available' ||
        error.message === 'Insufficient inventory'
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
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add item to cart',
      },
    });
  }
};

/**
 * Update cart item quantity
 * PUT /api/cart/:itemId
 * Body: { quantity: number }
 */
export const updateCartItem = async (
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

    const itemId = req.params.itemId as string;
    const { quantity } = req.body;

    // Validate input
    if (!quantity || quantity < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1',
        },
      });
      return;
    }

    const cart = await cartService.updateCartItem(userId, itemId, quantity);
    const totalAmount = cartService.calculateTotal(cart);

    res.status(200).json({
      success: true,
      data: {
        cart: {
          items: cart.items,
          totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Error updating cart item:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Cart not found' ||
        error.message === 'Item not found in cart'
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
        error.message === 'Product not found' ||
        error.message === 'Product is not available' ||
        error.message === 'Insufficient inventory'
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
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update cart item',
      },
    });
  }
};

/**
 * Remove item from cart
 * DELETE /api/cart/:itemId
 */
export const removeFromCart = async (
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

    const itemId = req.params.itemId as string;

    const cart = await cartService.removeFromCart(userId, itemId);
    const totalAmount = cartService.calculateTotal(cart);

    res.status(200).json({
      success: true,
      data: {
        cart: {
          items: cart.items,
          totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Error removing from cart:', error);

    if (error instanceof Error) {
      if (
        error.message === 'Cart not found' ||
        error.message === 'Item not found in cart'
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
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove item from cart',
      },
    });
  }
};
