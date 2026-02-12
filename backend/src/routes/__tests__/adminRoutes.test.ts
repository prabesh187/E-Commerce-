import request from 'supertest';
import express, { Application } from 'express';
import adminRoutes from '../adminRoutes.js';
import { adminService } from '../../services/AdminService.js';
import { userService } from '../../services/UserService.js';

// Mock services
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

jest.mock('../../services/UserService.js', () => ({
  userService: {
    verifyToken: jest.fn(),
  },
}));

describe('Admin Routes', () => {
  let app: Application;
  const validToken = 'valid-admin-token';
  const adminId = 'admin123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    // Mock token verification for admin
    (userService.verifyToken as jest.Mock).mockReturnValue({
      userId: adminId,
      role: 'admin',
    });
  });

  describe('GET /api/admin/sellers/pending', () => {
    it('should return pending sellers with valid admin token', async () => {
      const mockSellers = [
        { _id: 'seller1', businessName: 'Business 1' },
        { _id: 'seller2', businessName: 'Business 2' },
      ];

      (adminService.getPendingSellers as jest.Mock).mockResolvedValue(mockSellers);

      const response = await request(app)
        .get('/api/admin/sellers/pending')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSellers);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/admin/sellers/pending');

      expect(response.status).toBe(401);
      expect(adminService.getPendingSellers).not.toHaveBeenCalled();
    });

    it('should return 403 for non-admin role', async () => {
      (userService.verifyToken as jest.Mock).mockReturnValue({
        userId: 'seller123',
        role: 'seller',
      });

      const response = await request(app)
        .get('/api/admin/sellers/pending')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/admin/sellers/:id/verify', () => {
    it('should verify seller with approved status', async () => {
      const mockSeller = {
        _id: 'seller1',
        businessName: 'Business 1',
        verificationStatus: 'approved',
      };

      (adminService.verifySeller as jest.Mock).mockResolvedValue(mockSeller);

      const response = await request(app)
        .put('/api/admin/sellers/seller1/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ approved: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSeller);
      expect(adminService.verifySeller).toHaveBeenCalledWith('seller1', true);
    });

    it('should verify seller with rejected status', async () => {
      const mockSeller = {
        _id: 'seller1',
        businessName: 'Business 1',
        verificationStatus: 'rejected',
      };

      (adminService.verifySeller as jest.Mock).mockResolvedValue(mockSeller);

      const response = await request(app)
        .put('/api/admin/sellers/seller1/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ approved: false });

      expect(response.status).toBe(200);
      expect(adminService.verifySeller).toHaveBeenCalledWith('seller1', false);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .put('/api/admin/sellers/seller1/verify')
        .send({ approved: true });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/admin/products/pending', () => {
    it('should return pending products', async () => {
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1' },
        { _id: 'prod2', name: 'Product 2' },
      ];

      (adminService.getPendingProducts as jest.Mock).mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/admin/products/pending')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockProducts);
    });
  });

  describe('PUT /api/admin/products/:id/verify', () => {
    it('should verify product', async () => {
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        verificationStatus: 'approved',
      };

      (adminService.verifyProduct as jest.Mock).mockResolvedValue(mockProduct);

      const response = await request(app)
        .put('/api/admin/products/prod1/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ approved: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockProduct);
      expect(adminService.verifyProduct).toHaveBeenCalledWith('prod1', true);
    });
  });

  describe('GET /api/admin/analytics', () => {
    it('should return platform analytics', async () => {
      const mockAnalytics = {
        totalUsers: 100,
        totalSellers: 20,
        totalProducts: 500,
        totalOrders: 1000,
        totalRevenue: 50000,
      };

      (adminService.getPlatformAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockAnalytics);
    });
  });

  describe('POST /api/admin/banners', () => {
    it('should create a new banner', async () => {
      const mockBanner = {
        _id: 'banner1',
        title: 'Sale Banner',
        imageUrl: '/uploads/banner.jpg',
        isActive: true,
      };

      (adminService.createBanner as jest.Mock).mockResolvedValue(mockBanner);

      const response = await request(app)
        .post('/api/admin/banners')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          title: 'Sale Banner',
          imageUrl: '/uploads/banner.jpg',
          isActive: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBanner);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/admin/banners')
        .send({ title: 'Sale Banner' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/admin/banners/:id', () => {
    it('should update a banner', async () => {
      const mockBanner = {
        _id: 'banner1',
        title: 'Updated Banner',
        imageUrl: '/uploads/banner.jpg',
        isActive: false,
      };

      (adminService.updateBanner as jest.Mock).mockResolvedValue(mockBanner);

      const response = await request(app)
        .put('/api/admin/banners/banner1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'Updated Banner', isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockBanner);
      expect(adminService.updateBanner).toHaveBeenCalledWith('banner1', {
        title: 'Updated Banner',
        isActive: false,
      });
    });
  });

  describe('DELETE /api/admin/banners/:id', () => {
    it('should delete a banner', async () => {
      (adminService.deleteBanner as jest.Mock).mockResolvedValue({ message: 'Banner deleted successfully' });

      const response = await request(app)
        .delete('/api/admin/banners/banner1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Banner deleted successfully');
      expect(adminService.deleteBanner).toHaveBeenCalledWith('banner1');
    });

    it('should return 401 without token', async () => {
      const response = await request(app).delete('/api/admin/banners/banner1');

      expect(response.status).toBe(401);
    });
  });
});
