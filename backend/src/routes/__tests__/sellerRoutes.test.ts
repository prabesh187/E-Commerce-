import request from 'supertest';
import express, { Application } from 'express';
import sellerRoutes from '../sellerRoutes.js';
import { sellerService } from '../../services/SellerService.js';
import { userService } from '../../services/UserService.js';

// Mock services
jest.mock('../../services/SellerService.js', () => ({
  sellerService: {
    getSellerDashboard: jest.fn(),
    getSellerProducts: jest.fn(),
    getSellerOrders: jest.fn(),
  },
}));

jest.mock('../../services/UserService.js', () => ({
  userService: {
    verifyToken: jest.fn(),
  },
}));

describe('Seller Routes', () => {
  let app: Application;
  const validToken = 'valid-seller-token';
  const sellerId = 'seller123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/seller', sellerRoutes);

    // Mock token verification for seller
    (userService.verifyToken as jest.Mock).mockReturnValue({
      userId: sellerId,
      role: 'seller',
    });
  });

  describe('GET /api/seller/dashboard', () => {
    it('should return seller analytics with valid token', async () => {
      const mockAnalytics = {
        totalProducts: 10,
        totalOrders: 25,
        totalRevenue: 5000,
        pendingOrders: 3,
      };

      (sellerService.getSellerDashboard as jest.Mock).mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/seller/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
      expect(sellerService.getSellerDashboard).toHaveBeenCalledWith(sellerId);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/seller/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(sellerService.getSellerDashboard).not.toHaveBeenCalled();
    });

    it('should return 403 for non-seller role', async () => {
      (userService.verifyToken as jest.Mock).mockReturnValue({
        userId: 'buyer123',
        role: 'buyer',
      });

      const response = await request(app)
        .get('/api/seller/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/seller/products', () => {
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

      (sellerService.getSellerProducts as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/seller/products?page=1&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(sellerService.getSellerProducts).toHaveBeenCalledWith(sellerId, {}, 1, 10);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/seller/products');

      expect(response.status).toBe(401);
      expect(sellerService.getSellerProducts).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/seller/orders', () => {
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

      (sellerService.getSellerOrders as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/seller/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(sellerService.getSellerOrders).toHaveBeenCalledWith(sellerId, {}, 1, 10);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/seller/orders');

      expect(response.status).toBe(401);
      expect(sellerService.getSellerOrders).not.toHaveBeenCalled();
    });

    it('should return 403 for admin role', async () => {
      (userService.verifyToken as jest.Mock).mockReturnValue({
        userId: 'admin123',
        role: 'admin',
      });

      const response = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});
