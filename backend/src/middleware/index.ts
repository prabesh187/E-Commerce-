/**
 * Middleware exports
 * 
 * This module exports all authentication and security middleware
 * for the Made in Nepal E-Commerce Platform
 */

// Authentication middleware
export {
  authenticate,
  requireRole,
  optionalAuth,
} from './auth.js';

// Rate limiting middleware
export {
  rateLimiter,
  authRateLimiter,
  paymentRateLimiter,
} from './rateLimiter.js';

// CSRF protection middleware
export {
  csrfProtection,
  validateCsrfToken,
  getCsrfToken,
} from './csrf.js';

// Input sanitization middleware
export {
  sanitizeInput,
  strictSanitizeInput,
  isSafeString,
} from './sanitization.js';

// Export types from types directory
export type { AuthRequest, CsrfRequest } from '../types/express.js';
