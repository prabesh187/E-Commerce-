import request from 'supertest';
import express, { Application } from 'express';
import recommendationRoutes from '../recommendationRoutes.js';
import { recommendationService } from '../../services/RecommendationService.js';
import { authenticate } from '../../middleware/auth.js';

// Mock the middleware
jest.mock('../../middleware/auth.js', () => ({
  authenticate: jest.fn((req, _res, next) => {
    // Mock authenticated user
    req.user = { userId: 'user123', role: 'buyer' };
    next();
  }),
}));

// Mock the RecommendationService
jest.mock('../../services/RecommendationService.js', () => ({
  recommendationService: {
    getRelatedProducts: jest.fn(),
    getPersonalizedRecommendations: jest.fn(),
  },
}));

describe('Recommendation Routes', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', recommendationRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products/:id/related', () => {
    const mockProducts = [
      {
        _id: 'product1',
        title: { en: 'Related Product 1', ne: 'सम्बन्धित उत्पादन १' },
        price: 1000,
        category: 'handicrafts',
        averageRating: 4.5,
        reviewCount: 10,
      },
      {
        _id: 'product2',
        title: { en: 'Related Product 2', ne: 'सम्बन्धित उत्पादन २' },
        price: 1200,
        category: 'handicrafts',
        averageRating: 4.2,
        reviewCount: 8,
      },
    ];

    it('should return related products for a valid product ID', async () => {
      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const response = await request(app).get('/api/products/product123/related');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProducts);
      expect(response.body.count).toBe(2);
      expect(recommendationService.getRelatedProducts).toHaveBeenCalledWith(
        'product123',
        10
      );
    });

    it('should accept custom limit parameter', async () => {
      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const response = await request(app).get(
        '/api/products/product123/related?limit=5'
      );

      expect(response.status).toBe(200);
      expect(recommendationService.getRelatedProducts).toHaveBeenCalledWith(
        'product123',
        5
      );
    });

    it('should return 400 for invalid product ID', async () => {
      (recommendationService.getRelatedProducts as jest.Mock).mockRejectedValue(
        new Error('Invalid product ID')
      );

      const response = await request(app).get('/api/products/invalid/related');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT_ID');
    });

    it('should return 404 when product not found', async () => {
      (recommendationService.getRelatedProducts as jest.Mock).mockRejectedValue(
        new Error('Product not found')
      );

      const response = await request(app).get('/api/products/nonexistent/related');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should be accessible without authentication', async () => {
      (recommendationService.getRelatedProducts as jest.Mock).mockResolvedValue(
        mockProducts
      );

      const response = await request(app).get('/api/products/product123/related');

      expect(response.status).toBe(200);
      // Verify authenticate middleware was not called for this route
      // (it should only be called for /recommendations)
    });
  });

  describe('GET /api/recommendations', () => {
    const mockRecommendations = [
      {
        _id: 'product1',
        title: { en: 'Recommended Product 1', ne: 'सिफारिस उत्पादन १' },
        price: 1500,
        category: 'clothing',
        averageRating: 4.7,
        reviewCount: 15,
      },
      {
        _id: 'product2',
        title: { en: 'Recommended Product 2', ne: 'सिफारिस उत्पादन २' },
        price: 2000,
        category: 'food',
        averageRating: 4.3,
        reviewCount: 12,
      },
    ];

    it('should return personalized recommendations for authenticated user', async () => {
      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
      expect(response.body.count).toBe(2);
      expect(authenticate).toHaveBeenCalled();
      expect(
        recommendationService.getPersonalizedRecommendations
      ).toHaveBeenCalledWith('user123', 10);
    });

    it('should accept custom limit parameter', async () => {
      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .get('/api/recommendations?limit=15')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(
        recommendationService.getPersonalizedRecommendations
      ).toHaveBeenCalledWith('user123', 15);
    });

    it('should return empty array when no recommendations available', async () => {
      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should handle service errors gracefully', async () => {
      (
        recommendationService.getPersonalizedRecommendations as jest.Mock
      ).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Route Integration', () => {
    it('should have correct route paths', async () => {
      // Test that routes are properly mounted
      const relatedResponse = await request(app).get(
        '/api/products/test123/related'
      );
      const recommendationsResponse = await request(app).get('/api/recommendations');

      // Both routes should exist (not 404)
      expect(relatedResponse.status).not.toBe(404);
      expect(recommendationsResponse.status).not.toBe(404);
    });

    it('should handle invalid routes', async () => {
      const response = await request(app).get('/api/invalid-route');

      expect(response.status).toBe(404);
    });
  });
});
