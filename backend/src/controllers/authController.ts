import { Response } from 'express';
import { AuthRequest } from '../types/express.js';
import { userService, RegisterData } from '../services/UserService.js';

/**
 * Authentication controller
 * Handles user registration, login, logout, and profile retrieval
 */

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userData: RegisterData = req.body;

    // Register user
    const { user, token } = await userService.register(userData);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle duplicate user errors FIRST (before validation errors)
      if (error.message.includes('already registered')) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: error.message,
          },
        });
        return;
      }

      // Handle specific validation errors
      if (
        error.message.includes('email') ||
        error.message.includes('phone') ||
        error.message.includes('Password') ||
        error.message.includes('characters') ||
        error.message.includes('lowercase') ||
        error.message.includes('uppercase') ||
        error.message.includes('number') ||
        error.message.includes('required')
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'Failed to register user',
      },
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { emailOrPhone, password } = req.body;

    // Validate input
    if (!emailOrPhone || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email/phone and password are required',
        },
      });
      return;
    }

    // Login user
    const { user, token } = await userService.login(emailOrPhone, password);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email/phone or password',
        },
      });
      return;
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to login',
      },
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 * Note: With JWT, logout is primarily handled client-side by removing the token
 * This endpoint exists for consistency and can be extended for token blacklisting
 */
export const logout = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // In a JWT-based system, logout is typically handled client-side
    // The client should remove the token from storage
    // This endpoint can be extended to implement token blacklisting if needed

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout',
      },
    });
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // User ID is available from authentication middleware
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

    // Get user details
    const user = await userService.getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USER_FAILED',
        message: 'Failed to fetch user details',
      },
    });
  }
};
