import { Response } from 'express';
import { AuthRequest } from '../../types/express.js';
import { getRecentlyViewed } from '../recentlyViewedController.js';
import { recentlyViewedService } from '../../services/RecentlyViewedService.js';

// Mock the recently viewed service
jest.mock('../../services/RecentlyViewedService.js');

describe('Recently Viewed Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      user: undefined,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    jest.clearAllMocks();
  });

  describe('getRecentlyViewed', () => {
    it('should return recently viewed products successfully', async () => {
      const mockRecentlyViewed = {
        userId: 'user1',
        products: [
          {
            _id: 'product1',
            productId: 'product1',
            viewedAt: new Date(),
            title: { en: 'Product 1' },
            price: 100,
            images: ['image1.jpg'],
            inventory: 10,
            isActive: true,
            averageRating: 4.5,
            reviewCount: 10,
          },
          {
            _id: 'product2',
            productId: 'product2',
            viewedAt: new Date(Date.now() - 1000),
            title: { en: 'Product 2' },
            price: 200,
            images: ['image2.jpg'],
            inventory: 5,
            isActive: true,
            averageRating: 4.0,
            reviewCount: 5,
          },
        ],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };

      (recentlyViewedService.getRecentlyViewed as jest.Mock).mockResolvedValue(
        mockRecentlyViewed
      );

      await getRecentlyViewed(mockRequest as AuthRequest, mockResponse as Response);

      expect(recentlyViewedService.getRecentlyViewed).toHaveBeenCalledWith('user1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          recentlyViewed: {
            products: mockRecentlyViewed.products,
          },
        },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await getRecentlyViewed(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    });

    it('should return empty list for new user', async () => {
      const mockRecentlyViewed = {
        userId: 'user1',
        products: [],
      };

      mockRequest.user = { userId: 'user1', role: 'buyer' };

      (recentlyViewedService.getRecentlyViewed as jest.Mock).mockResolvedValue(
        mockRecentlyViewed
      );

      await getRecentlyViewed(mockRequest as AuthRequest, mockResponse as Response);

      expect(recentlyViewedService.getRecentlyViewed).toHaveBeenCalledWith('user1');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: {
          recentlyViewed: {
            products: [],
          },
        },
      });
    });

    it('should return 500 on service error', async () => {
      mockRequest.user = { userId: 'user1', role: 'buyer' };

      (recentlyViewedService.getRecentlyViewed as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getRecentlyViewed(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get recently viewed products',
        },
      });
    });
  });
});
