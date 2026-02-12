import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import { authenticate, requireRole, optionalAuth } from '../auth.js';
import { AuthRequest } from '../../types/express.js';
import { userService } from '../../services/UserService.js';

// Mock the userService
jest.mock('../../services/UserService.js', () => ({
  userService: {
    verifyToken: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn() as any;
    statusMock = jest.fn().mockReturnValue({ json: jsonMock }) as any;
    
    mockRequest = {
      headers: {},
    };
    
    mockResponse = {
      status: statusMock as any,
      json: jsonMock as any,
    };
    
    mockNext = jest.fn() as any;
    
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and add user to request', async () => {
      const mockDecoded = {
        userId: 'user123',
        role: 'buyer' as const,
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (userService.verifyToken as jest.Mock).mockReturnValue(mockDecoded);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(userService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        userId: 'user123',
        role: 'buyer',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      (userService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Token has expired');
      });

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token has expired',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (userService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', () => {
      mockRequest.user = {
        userId: 'user123',
        role: 'seller',
      };

      const middleware = requireRole('seller', 'admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple required roles', () => {
      mockRequest.user = {
        userId: 'user123',
        role: 'admin',
      };

      const middleware = requireRole('seller', 'admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      mockRequest.user = {
        userId: 'user123',
        role: 'buyer',
      };

      const middleware = requireRole('seller', 'admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required role: seller or admin',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockRequest.user = undefined;

      const middleware = requireRole('buyer');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should work with single role', () => {
      mockRequest.user = {
        userId: 'user123',
        role: 'admin',
      };

      const middleware = requireRole('admin');
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should add user to request if valid token provided', async () => {
      const mockDecoded = {
        userId: 'user123',
        role: 'buyer' as const,
        iat: Date.now(),
        exp: Date.now() + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (userService.verifyToken as jest.Mock).mockReturnValue(mockDecoded);

      await optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        userId: 'user123',
        role: 'buyer',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if no token provided', async () => {
      mockRequest.headers = {};

      await optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if invalid token provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (userService.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should continue without user if malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };

      await optionalAuth(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
