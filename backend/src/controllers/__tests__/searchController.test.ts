import { Response } from 'express';
import { searchProducts, getSuggestions } from '../searchController.js';
import { searchService } from '../../services/SearchService.js';
import { AuthRequest } from '../../types/express.js';

// Mock the SearchService
jest.mock('../../services/SearchService.js', () => ({
  searchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
  },
}));

describe('SearchController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockRequest = {
      query: {},
    };
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  describe('searchProducts', () => {
    it('should return search results for valid query', async () => {
      const mockResults = {
        products: [
          { _id: '1', title: { en: 'Test Product' }, price: 100 },
        ],
        totalPages: 1,
        currentPage: 1,
        totalCount: 1,
      };

      mockRequest.query = { q: 'test' };
      (searchService.search as jest.Mock).mockResolvedValue(mockResults);

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(searchService.search).toHaveBeenCalledWith('test', 1, 20);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResults,
      });
    });

    it('should handle pagination parameters', async () => {
      const mockResults = {
        products: [],
        totalPages: 0,
        currentPage: 2,
        totalCount: 0,
      };

      mockRequest.query = { q: 'test', page: '2', limit: '10' };
      (searchService.search as jest.Mock).mockResolvedValue(mockResults);

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(searchService.search).toHaveBeenCalledWith('test', 2, 10);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if query parameter is missing', async () => {
      mockRequest.query = {};

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
    });

    it('should return 400 for invalid page parameter', async () => {
      mockRequest.query = { q: 'test', page: '0' };

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_PAGE',
          message: 'Page must be a positive integer',
        },
      });
    });

    it('should return 400 for invalid limit parameter', async () => {
      mockRequest.query = { q: 'test', limit: '200' };

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100',
        },
      });
    });

    it('should handle search service errors', async () => {
      mockRequest.query = { q: 'test' };
      (searchService.search as jest.Mock).mockRejectedValue(new Error('Database error'));

      await searchProducts(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Database error',
        },
      });
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for valid query', async () => {
      const mockSuggestions = [
        { text: 'Test Product 1', category: 'electronics' },
        { text: 'Test Product 2', category: 'clothing' },
      ];

      mockRequest.query = { q: 'test' };
      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      await getSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(searchService.getSuggestions).toHaveBeenCalledWith('test', 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockSuggestions,
      });
    });

    it('should handle custom limit parameter', async () => {
      const mockSuggestions = [
        { text: 'Test Product', category: 'food' },
      ];

      mockRequest.query = { q: 'test', limit: '5' };
      (searchService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

      await getSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(searchService.getSuggestions).toHaveBeenCalledWith('test', 5);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if query parameter is missing', async () => {
      mockRequest.query = {};

      await getSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query parameter "q" is required',
        },
      });
    });

    it('should return 400 for invalid limit parameter', async () => {
      mockRequest.query = { q: 'test', limit: '100' };

      await getSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50',
        },
      });
    });

    it('should handle suggestions service errors', async () => {
      mockRequest.query = { q: 'test' };
      (searchService.getSuggestions as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SUGGESTIONS_FAILED',
          message: 'Database error',
        },
      });
    });
  });
});
