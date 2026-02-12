import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/authController.js';
import { authenticate, authRateLimiter } from '../middleware/index.js';

const router = Router();

/**
 * Authentication Routes
 * 
 * POST /api/auth/register - Register a new user
 * POST /api/auth/login - Login user
 * POST /api/auth/logout - Logout user
 * GET /api/auth/me - Get current authenticated user
 */

// Apply rate limiting to auth endpoints to prevent brute force attacks
router.use(authRateLimiter);

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
