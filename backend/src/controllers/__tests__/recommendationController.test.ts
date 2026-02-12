import { Response } from 'express';
import {
  getRelatedProducts,
  getPersonalizedRecommendations,
} from '../recommendationController.js';
import { recommendationService } from '../../services/RecommendationService.js';
import { AuthRequest } from '../../types/express.js';

// Mock the RecommendationService
jest.mock('../../services/RecommendationService.js', () => ({
  recommendationService: {
    getRelatedProducts: jest.fn(),
    getPersonalizedRecommendations: jest.fn(),
  },
}));

describe('RecommendationController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      params: {},
      query: {},
      user: undefined,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('getRelatedProducts', () => {
    const mockProducts = [
      {
        _id: 'product1',
        title: { en: 'Product 1', ne: 'उत्पादन १' },
        price: 1000,
        category: 'handicrafts',
      },
      {
        _id: 'product2',
        title: { en: 'Product 2', ne: 'उत्पादन २' },
        price: 1200,
        category: 'handicrafts',
      },
    ];

    it('should return related products successfully', async () => {
      mockRequest.params = { id: 'product123' };
      mockRequest.query = { limit: '5' };

      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(recommendationService.getRelatedProducts).toHaveBeenCalledWith(
        'product123',
        5
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProducts,
        count: 2,
      });
    });

    it('should use default limit of 10 when not provided', async () => {
      mockRequest.params = { id: 'product123' };

      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(recommendationService.getRelatedProducts).toHaveBeenCalledWith(
        'product123',
        10
      );
    });

    it('should return 400 for invalid product ID', async () => {
      mockRequest.params = { id: 'invalid-id' };

      (recommendationService.getRelatedProducts as jest.Mock).mockRejectedValue(
        new Error('Invalid product ID')
      );

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'The provided product ID is invalid',
        },
      });
    });

    it('should return 404 when product not found', async () => {
      mockRequest.params = { id: 'nonexistent123' };

      (recommendationService.getRelatedProducts as jest.Mock).mockRejectedValue(
        new Error('Product not found')
      );

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.params = { id: 'product123' };

      (recommendationService.getRelatedProducts as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching related products',
        },
      });
    });

    it('should return empty array when no related products found', async () => {
      mockRequest.params = { id: 'product123' };

      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue([]);

      await getRelatedProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      });
    });
  });

  describe('getPersonalizedRecommendations', () => {
    const mockRecommendations = [
      {
        _id: 'product1',
        title: { en: 'Recommended Product 1', ne: 'सिफारिस उत्पादन १' },
        price: 1500,
        category: 'clothing',
      },
      {
        _id: 'product2',
        title: { en: 'Recommended Product 2', ne: 'सिफारिस उत्पादन २' },
        price: 2000,
        category: 'food',
      },
    ];

    it('should return personalized recommendations successfully', async () => {
      mockRequest.user = { userId: 'user123', role: 'buyer' };
      mockRequest.query = { limit: '8' };

      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue(mockRecommendations);

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(
        recommendationService.getPersonalizedRecommendations
      ).toHaveBeenCalledWith('user123', 8);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockRecommendations,
        count: 2,
      });
    });

    it('should use default limit of 10 when not provided', async () => {
      mockRequest.user = { userId: 'user123', role: 'buyer' };

      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue(mockRecommendations);

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(
        recommendationService.getPersonalizedRecommendations
      ).toHaveBeenCalledWith('user123', 10);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(
        recommendationService.getPersonalizedRecommendations
      ).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should return 400 for invalid user ID', async () => {
      mockRequest.user = { userId: 'invalid-id', role: 'buyer' };

      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockRejectedValue(new Error('Invalid user ID'));

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'The provided user ID is invalid',
        },
      });
    });

    it('should return 500 for unexpected errors', async () => {
      mockRequest.user = { userId: 'user123', role: 'buyer' };

      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockRejectedValue(new Error('Database connection failed'));

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching recommendations',
        },
      });
    });

    it('should return empty array when no recommendations available', async () => {
      mockRequest.user = { userId: 'user123', role: 'buyer' };

      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue([]);

      await getPersonalizedRecommendations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [],
        count: 0,
      });
    });
  });
});
