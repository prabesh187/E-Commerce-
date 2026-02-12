import { Response } from 'express';
import { AuthRequest } from '../../types/express.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
} from '../wishlistController.js';
import { wishlistService } from '../../services/WishlistService.js';

// Mock the wishlist service
jest.mock('../../services/WishlistService.js');

describe('Wishlist Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: {},
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getWishlist', () => {
    it('should return user wishlist successfully', async () => {
      const mockWishlist = {
        userId: 'user1',
        products: [
          {
            _id: 'product1',
            title: { en: 'Product 1' },
            price: 100,
            images: ['image1.jpg'],
            inventory: 10,
            isActive: true,
            averageRating: 4.5,
            reviewCount: 10,
          },
        ],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };

      (wishlistService.getWishlist as jest.Mock).mockResolvedValue(mockWishlist);

      await getWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(wishlistService.getWishlist).toHaveBeenCalledWith('user1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          wishlist: {
            products: mockWishlist.products,
          },
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await getWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };

      (wishlistService.getWishlist as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get wishlist',
        },
      });
    });
  });

  describe('addToWishlist', () => {
    it('should add product to wishlist successfully', async () => {
      const mockWishlist = {
        userId: 'user1',
        products: [
          {
            _id: 'product1',
            title: { en: 'Product 1' },
            price: 100,
            images: ['image1.jpg'],
            inventory: 10,
            isActive: true,
            averageRating: 4.5,
            reviewCount: 10,
          },
        ],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.body = { productId: 'product1' };

      (wishlistService.addToWishlist as jest.Mock).mockResolvedValue(mockWishlist);

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(wishlistService.addToWishlist).toHaveBeenCalledWith('user1', 'product1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          wishlist: {
            products: mockWishlist.products,
          },
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { productId: 'product1' };

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 400 if productId is missing', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.body = {};

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required',
        },
      });
    });

    it('should return 404 if product not found', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.body = { productId: 'product1' };

      (wishlistService.addToWishlist as jest.Mock).mockRejectedValue(
        new Error('Product not found')
      );

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    });

    it('should return 409 if product already in wishlist', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.body = { productId: 'product1' };

      (wishlistService.addToWishlist as jest.Mock).mockRejectedValue(
        new Error('Product already in wishlist')
      );

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DUPLICATE_PRODUCT',
          message: 'Product already in wishlist',
        },
      });
    });

    it('should return 400 if product is not available', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.body = { productId: 'product1' };

      (wishlistService.addToWishlist as jest.Mock).mockRejectedValue(
        new Error('Product is not available')
      );

      await addToWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PRODUCT_UNAVAILABLE',
          message: 'Product is not available',
        },
      });
    });
  });

  describe('removeFromWishlist', () => {
    it('should remove product from wishlist successfully', async () => {
      const mockWishlist = {
        userId: 'user1',
        products: [],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };

      (wishlistService.removeFromWishlist as jest.Mock).mockResolvedValue(mockWishlist);

      await removeFromWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(wishlistService.removeFromWishlist).toHaveBeenCalledWith('user1', 'product1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          wishlist: {
            products: mockWishlist.products,
          },
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { productId: 'product1' };

      await removeFromWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 404 if wishlist not found', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };

      (wishlistService.removeFromWishlist as jest.Mock).mockRejectedValue(
        new Error('Wishlist not found')
      );

      await removeFromWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Wishlist not found',
        },
      });
    });

    it('should return 404 if product not found in wishlist', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };

      (wishlistService.removeFromWishlist as jest.Mock).mockRejectedValue(
        new Error('Product not found in wishlist')
      );

      await removeFromWishlist(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found in wishlist',
        },
      });
    });
  });

  describe('moveToCart', () => {
    it('should move product to cart successfully', async () => {
      const mockWishlist = {
        userId: 'user1',
        products: [],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = { quantity: 2 };

      (wishlistService.moveToCart as jest.Mock).mockResolvedValue(mockWishlist);

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(wishlistService.moveToCart).toHaveBeenCalledWith('user1', 'product1', 2);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          wishlist: {
            products: mockWishlist.products,
          },
          message: 'Product moved to cart successfully',
        },
      });
    });

    it('should use default quantity of 1', async () => {
      const mockWishlist = {
        userId: 'user1',
        products: [],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = {};

      (wishlistService.moveToCart as jest.Mock).mockResolvedValue(mockWishlist);

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(wishlistService.moveToCart).toHaveBeenCalledWith('user1', 'product1', 1);
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = { quantity: 1 };

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 400 if quantity is less than 1', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = { quantity: 0 };

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1',
        },
      });
    });

    it('should return 404 if product not found in wishlist', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = { quantity: 1 };

      (wishlistService.moveToCart as jest.Mock).mockRejectedValue(
        new Error('Product not found in wishlist')
      );

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found in wishlist',
        },
      });
    });

    it('should return 400 if insufficient inventory', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };
      mockRequest.params = { productId: 'product1' };
      mockRequest.body = { quantity: 10 };

      (wishlistService.moveToCart as jest.Mock).mockRejectedValue(
        new Error('Only 5 items available in stock')
      );

      await moveToCart(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PRODUCT_UNAVAILABLE',
          message: 'Only 5 items available in stock',
        },
      });
    });
  });
});
