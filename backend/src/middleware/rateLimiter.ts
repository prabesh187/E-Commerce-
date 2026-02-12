import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

/**
 * Rate limiting middleware to prevent brute force attacks
 * Limits requests to 100 per minute per IP address
 * 
 * Requirements: 18.4
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Time window in milliseconds (default: 1 minute)
  max: config.rateLimit.maxRequests, // Maximum requests per window (default: 100)
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
    },
  },
  // Skip rate limiting for successful requests in test environment
  skip: (_req) => {
    return config.nodeEnv === 'test';
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * Limits to 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  skip: (_req) => {
    return config.nodeEnv === 'test';
  },
});

/**
 * Rate limiter for payment endpoints
 * Limits to 10 requests per minute per IP
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
      message: 'Too many payment requests, please try again later',
    },
  },
  skip: (_req) => {
    return config.nodeEnv === 'test';
  },
});
