import { Response } from 'express';
import { AuthRequest } from '../../types/express.js';
import { getDashboard, getProducts, getOrders } from '../sellerController.js';
import { sellerService } from '../../services/SellerService.js';

// Mock the seller service
jest.mock('../../services/SellerService.js', () => ({
  sellerService: {
    getSellerDashboard: jest.fn(),
    getSellerProducts: jest.fn(),
    getSellerOrders: jest.fn(),
  },
}));

describe('Seller Controller', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockReq = {
      user: {
        userId: 'seller123',
        role: 'seller',
      },
      query: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('getDashboard', () => {
    it('should return seller analytics', async () => {
      const mockAnalytics = {
        totalProducts: 10,
        totalOrders: 25,
        totalRevenue: 5000,
        pendingOrders: 3,
      };

      (sellerService.getSellerDashboard as jest.Mock).mockResolvedValue(mockAnalytics);

      await getDashboard(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerDashboard).toHaveBeenCalledWith('seller123');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await getDashboard(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerDashboard).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });

    it('should handle service errors', async () => {
      (sellerService.getSellerDashboard as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getDashboard(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Database error',
        },
      });
    });
  });

  describe('getProducts', () => {
    it('should return seller products with pagination', async () => {
      const mockResult = {
        products: [
          { _id: 'prod1', name: 'Product 1' },
          { _id: 'prod2', name: 'Product 2' },
        ],
        totalPages: 1,
        currentPage: 1,
        totalCount: 2,
      };

      mockReq.query = { page: '1', limit: '10' };
      (sellerService.getSellerProducts as jest.Mock).mockResolvedValue(mockResult);

      await getProducts(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerProducts).toHaveBeenCalledWith('seller123', {}, 1, 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should use default pagination if not provided', async () => {
      const mockResult = {
        products: [],
        totalPages: 0,
        currentPage: 1,
        totalCount: 0,
      };

      (sellerService.getSellerProducts as jest.Mock).mockResolvedValue(mockResult);

      await getProducts(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerProducts).toHaveBeenCalledWith(
        'seller123',
        {},
        undefined,
        undefined
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await getProducts(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerProducts).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('getOrders', () => {
    it('should return seller orders with pagination', async () => {
      const mockResult = {
        orders: [
          { _id: 'order1', total: 100 },
          { _id: 'order2', total: 200 },
        ],
        totalPages: 1,
        currentPage: 1,
        totalCount: 2,
      };

      mockReq.query = { page: '1', limit: '10' };
      (sellerService.getSellerOrders as jest.Mock).mockResolvedValue(mockResult);

      await getOrders(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerOrders).toHaveBeenCalledWith('seller123', {}, 1, 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should use default pagination if not provided', async () => {
      const mockResult = {
        orders: [],
        totalPages: 0,
        currentPage: 1,
        totalCount: 0,
      };

      (sellerService.getSellerOrders as jest.Mock).mockResolvedValue(mockResult);

      await getOrders(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
        'seller123',
        {},
        undefined,
        undefined
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockReq.user = undefined;

      await getOrders(mockReq as AuthRequest, mockRes as Response);

      expect(sellerService.getSellerOrders).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle service errors', async () => {
      (sellerService.getSellerOrders as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getOrders(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Database error',
        },
      });
    });
  });
});
