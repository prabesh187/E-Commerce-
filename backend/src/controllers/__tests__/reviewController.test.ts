import { Response } from 'express';
import { AuthRequest } from '../../types/express.js';
import { getProductReviews, submitReview } from '../reviewController.js';
import { reviewService } from '../../services/ReviewService.js';

// Mock the review service
jest.mock('../../services/ReviewService.js');

describe('Review Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getProductReviews', () => {
    it('should return product reviews successfully', async () => {
      const mockReviews = {
        reviews: [
          {
            _id: 'review1',
            productId: 'product1',
            buyerId: 'buyer1',
            rating: 5,
            text: 'Great product!',
            createdAt: new Date(),
          },
        ],
        totalPages: 1,
        currentPage: 1,
        totalCount: 1,
      };

      mockRequest.params = { id: 'product1' };
      mockRequest.query = { page: '1', limit: '10' };

      (reviewService.getProductReviews as jest.Mock).mockResolvedValue(mockReviews);

      await getProductReviews(mockRequest as AuthRequest, mockResponse as Response);

      expect(reviewService.getProductReviews).toHaveBeenCalledWith('product1', 1, 10);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockReviews,
      });
    });

    it('should use default pagination values', async () => {
      const mockReviews = {
        reviews: [],
        totalPages: 0,
        currentPage: 1,
        totalCount: 0,
      };

      mockRequest.params = { id: 'product1' };
      mockRequest.query = {};

      (reviewService.getProductReviews as jest.Mock).mockResolvedValue(mockReviews);

      await getProductReviews(mockRequest as AuthRequest, mockResponse as Response);

      expect(reviewService.getProductReviews).toHaveBeenCalledWith('product1', 1, 10);
    });

    it('should return 400 for invalid product ID', async () => {
      mockRequest.params = { id: 'invalid-id' };

      (reviewService.getProductReviews as jest.Mock).mockRejectedValue(
        new Error('Invalid product ID')
      );

      await getProductReviews(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID',
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.params = { id: 'product1' };

      (reviewService.getProductReviews as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getProductReviews(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get product reviews',
        },
      });
    });
  });

  describe('submitReview', () => {
    beforeEach(() => {
      mockRequest.user = {
        userId: 'buyer1',
        role: 'buyer',
      };
    });

    it('should submit review successfully', async () => {
      const mockReview = {
        _id: 'review1',
        productId: 'product1',
        buyerId: 'buyer1',
        orderId: 'order1',
        rating: 5,
        text: 'Great product!',
        createdAt: new Date(),
      };

      mockRequest.params = { id: 'product1' };
      mockRequest.body = {
        rating: 5,
        text: 'Great product!',
      };

      (reviewService.submitReview as jest.Mock).mockResolvedValue(mockReview);

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(reviewService.submitReview).toHaveBeenCalledWith({
        productId: 'product1',
        buyerId: 'buyer1',
        rating: 5,
        text: 'Great product!',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          review: {
            _id: mockReview._id,
            productId: mockReview.productId,
            buyerId: mockReview.buyerId,
            orderId: mockReview.orderId,
            rating: mockReview.rating,
            text: mockReview.text,
            createdAt: mockReview.createdAt,
          },
        },
      });
    });

    it('should submit review without text', async () => {
      const mockReview = {
        _id: 'review1',
        productId: 'product1',
        buyerId: 'buyer1',
        orderId: 'order1',
        rating: 4,
        createdAt: new Date(),
      };

      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 4 };

      (reviewService.submitReview as jest.Mock).mockResolvedValue(mockReview);

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(reviewService.submitReview).toHaveBeenCalledWith({
        productId: 'product1',
        buyerId: 'buyer1',
        rating: 4,
        text: undefined,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should return 401 without authentication', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 5 };

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      expect(reviewService.submitReview).not.toHaveBeenCalled();
    });

    it('should return 400 for missing rating', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { text: 'Great product!' };

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_RATING',
          message: 'Rating is required',
        },
      });
      expect(reviewService.submitReview).not.toHaveBeenCalled();
    });

    it('should return 400 for rating too low', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 0 };

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5',
        },
      });
      expect(reviewService.submitReview).not.toHaveBeenCalled();
    });

    it('should return 400 for rating too high', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 6 };

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5',
        },
      });
      expect(reviewService.submitReview).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate review', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 5 };

      (reviewService.submitReview as jest.Mock).mockRejectedValue(
        new Error('You have already reviewed this product')
      );

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DUPLICATE_REVIEW',
          message: 'You have already reviewed this product',
        },
      });
    });

    it('should return 403 for unauthorized review', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 5 };

      (reviewService.submitReview as jest.Mock).mockRejectedValue(
        new Error('You can only review products you have purchased and received')
      );

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED_REVIEW',
          message: 'You can only review products you have purchased and received',
        },
      });
    });

    it('should return 400 for invalid input', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 5 };

      (reviewService.submitReview as jest.Mock).mockRejectedValue(
        new Error('Invalid product ID')
      );

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid product ID',
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.params = { id: 'product1' };
      mockRequest.body = { rating: 5 };

      (reviewService.submitReview as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await submitReview(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to submit review',
        },
      });
    });
  });
});
