import { Response, NextFunction } from 'express';
import { userService } from '../services/UserService.js';
import { AuthRequest } from '../types/express.js';

/**
 * Authentication middleware that verifies JWT tokens
 * Extracts token from Authorization header and validates it
 * Adds user information to request object if valid
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
        },
      });
      return;
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = userService.verifyToken(token);

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: error.message,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Authentication failed',
        },
      });
    }
  }
};

/**
 * Authorization middleware factory that checks if user has required role
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Middleware function that checks user role
 */
export const requireRole = (...allowedRoles: Array<'buyer' | 'seller' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        },
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is present and valid
 * Does not fail if token is missing or invalid
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = userService.verifyToken(token);
      
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
    // User will be undefined in request
  }

  next();
};
