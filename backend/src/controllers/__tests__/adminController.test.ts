import { Response } from 'express';
import { AuthRequest } from '../../types/express.js';
import {
  getPendingSellers,
  verifySeller,
  getPendingProducts,
  verifyProduct,
  getAnalytics,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../adminController.js';
import { adminService } from '../../services/AdminService.js';

// Mock the admin service
jest.mock('../../services/AdminService.js', () => ({
  adminService: {
    getPendingSellers: jest.fn(),
    verifySeller: jest.fn(),
    getPendingProducts: jest.fn(),
    verifyProduct: jest.fn(),
    getPlatformAnalytics: jest.fn(),
    createBanner: jest.fn(),
    updateBanner: jest.fn(),
    deleteBanner: jest.fn(),
  },
}));

describe('Admin Controller', () => {
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
        userId: 'admin123',
        role: 'admin',
      },
      query: {},
      params: {},
      body: {},
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('getPendingSellers', () => {
    it('should return pending sellers', async () => {
      const mockSellers = [
        { _id: 'seller1', businessName: 'Business 1' },
        { _id: 'seller2', businessName: 'Business 2' },
      ];

      (adminService.getPendingSellers as jest.Mock).mockResolvedValue(mockSellers);

      await getPendingSellers(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.getPendingSellers).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockSellers,
      });
    });

    it('should handle service errors', async () => {
      (adminService.getPendingSellers as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getPendingSellers(mockReq as AuthRequest, mockRes as Response);

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

  describe('verifySeller', () => {
    it('should verify seller with approved status', async () => {
      const mockSeller = {
        _id: 'seller1',
        businessName: 'Business 1',
        verificationStatus: 'approved',
      };

      mockReq.params = { id: 'seller1' };
      mockReq.body = { approved: true };
      (adminService.verifySeller as jest.Mock).mockResolvedValue(mockSeller);

      await verifySeller(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.verifySeller).toHaveBeenCalledWith('seller1', true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockSeller,
      });
    });

    it('should verify seller with rejected status', async () => {
      const mockSeller = {
        _id: 'seller1',
        businessName: 'Business 1',
        verificationStatus: 'rejected',
      };

      mockReq.params = { id: 'seller1' };
      mockReq.body = { approved: false };
      (adminService.verifySeller as jest.Mock).mockResolvedValue(mockSeller);

      await verifySeller(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.verifySeller).toHaveBeenCalledWith('seller1', false);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if approved field is not boolean', async () => {
      mockReq.params = { id: 'seller1' };
      mockReq.body = { approved: 'yes' };

      await verifySeller(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.verifySeller).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'approved field must be a boolean',
        },
      });
    });

    it('should return 404 if seller not found', async () => {
      mockReq.params = { id: 'seller1' };
      mockReq.body = { approved: true };
      (adminService.verifySeller as jest.Mock).mockRejectedValue(
        new Error('Seller not found')
      );

      await verifySeller(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Seller not found',
        },
      });
    });
  });

  describe('getPendingProducts', () => {
    it('should return pending products', async () => {
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1' },
        { _id: 'prod2', name: 'Product 2' },
      ];

      (adminService.getPendingProducts as jest.Mock).mockResolvedValue(mockProducts);

      await getPendingProducts(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.getPendingProducts).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProducts,
      });
    });
  });

  describe('verifyProduct', () => {
    it('should verify product with approved status', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        verificationStatus: 'approved',
      };

      mockReq.params = { id: 'prod1' };
      mockReq.body = { approved: true };
      (adminService.verifyProduct as jest.Mock).mockResolvedValue(mockProduct);

      await verifyProduct(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.verifyProduct).toHaveBeenCalledWith('prod1', true);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
      });
    });

    it('should return 400 if approved field is not boolean', async () => {
      mockReq.params = { id: 'prod1' };
      mockReq.body = { approved: 'yes' };

      await verifyProduct(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.verifyProduct).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should return 404 if product not found', async () => {
      mockReq.params = { id: 'prod1' };
      mockReq.body = { approved: true };
      (adminService.verifyProduct as jest.Mock).mockRejectedValue(
        new Error('Product not found')
      );

      await verifyProduct(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('getAnalytics', () => {
    it('should return platform analytics', async () => {
      const mockAnalytics = {
        totalUsers: 100,
        totalSellers: 20,
        totalProducts: 500,
        totalOrders: 1000,
        totalRevenue: 50000,
      };

      (adminService.getPlatformAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      await getAnalytics(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.getPlatformAnalytics).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAnalytics,
      });
    });

    it('should handle service errors', async () => {
      (adminService.getPlatformAnalytics as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getAnalytics(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('createBanner', () => {
    it('should create a new banner', async () => {
      const mockBanner = {
        _id: 'banner1',
        title: 'Sale Banner',
        imageUrl: '/uploads/banner.jpg',
        isActive: true,
      };

      mockReq.body = {
        title: 'Sale Banner',
        imageUrl: '/uploads/banner.jpg',
        isActive: true,
      };
      (adminService.createBanner as jest.Mock).mockResolvedValue(mockBanner);

      await createBanner(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.createBanner).toHaveBeenCalledWith(mockReq.body);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBanner,
      });
    });

    it('should handle validation errors', async () => {
      mockReq.body = { title: '' };
      (adminService.createBanner as jest.Mock).mockRejectedValue(
        new Error('Title is required')
      );

      await createBanner(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Title is required',
        },
      });
    });
  });

  describe('updateBanner', () => {
    it('should update a banner', async () => {
      const mockBanner = {
        _id: 'banner1',
        title: 'Updated Banner',
        imageUrl: '/uploads/banner.jpg',
        isActive: false,
      };

      mockReq.params = { id: 'banner1' };
      mockReq.body = { title: 'Updated Banner', isActive: false };
      (adminService.updateBanner as jest.Mock).mockResolvedValue(mockBanner);

      await updateBanner(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.updateBanner).toHaveBeenCalledWith('banner1', mockReq.body);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockBanner,
      });
    });

    it('should return 404 if banner not found', async () => {
      mockReq.params = { id: 'banner1' };
      mockReq.body = { title: 'Updated Banner' };
      (adminService.updateBanner as jest.Mock).mockRejectedValue(
        new Error('Banner not found')
      );

      await updateBanner(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteBanner', () => {
    it('should delete a banner', async () => {
      mockReq.params = { id: 'banner1' };
      (adminService.deleteBanner as jest.Mock).mockResolvedValue({ message: 'Banner deleted successfully' });

      await deleteBanner(mockReq as AuthRequest, mockRes as Response);

      expect(adminService.deleteBanner).toHaveBeenCalledWith('banner1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Banner deleted successfully',
      });
    });

    it('should return 404 if banner not found', async () => {
      mockReq.params = { id: 'banner1' };
      (adminService.deleteBanner as jest.Mock).mockRejectedValue(
        new Error('Banner not found')
      );

      await deleteBanner(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Banner not found',
        },
      });
    });
  });
});
