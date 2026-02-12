import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { CsrfRequest } from '../types/express.js';

/**
 * CSRF token storage (in production, use Redis or session store)
 * Maps session ID to CSRF token
 */
const csrfTokens = new Map<string, string>();

/**
 * Generate a random CSRF token
 */
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Get or create session ID from request
 * In production, this should use express-session or similar
 */
const getSessionId = (req: Request): string => {
  // For now, use IP address + user agent as session identifier
  // In production, use proper session management
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.socket.remoteAddress || '';
  return crypto.createHash('sha256').update(ip + userAgent).digest('hex');
};

/**
 * Middleware to generate and attach CSRF token to request
 * Should be used on routes that render forms or return CSRF tokens
 */
export const csrfProtection = (
  req: CsrfRequest,
  res: Response,
  next: NextFunction
): void => {
  const sessionId = getSessionId(req);
  req.sessionId = sessionId;

  // Get existing token or generate new one
  let token = csrfTokens.get(sessionId);
  if (!token) {
    token = generateToken();
    csrfTokens.set(sessionId, token);
  }

  req.csrfToken = token;

  // Add method to response to get CSRF token
  res.locals.csrfToken = token;

  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Should be applied to POST, PUT, PATCH, DELETE routes
 * 
 * Requirements: 18.6
 */
export const validateCsrfToken = (
  req: CsrfRequest,
  res: Response,
  next: NextFunction
): void => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip CSRF validation for auth routes (login, register)
  // These routes use their own security measures (password hashing, rate limiting)
  if (req.path.startsWith('/auth/')) {
    next();
    return;
  }

  const sessionId = getSessionId(req);
  const expectedToken = csrfTokens.get(sessionId);

  // Get token from header or body
  const providedToken = 
    req.headers['x-csrf-token'] as string ||
    req.headers['csrf-token'] as string ||
    req.body?.csrfToken ||
    req.query?.csrfToken;

  // Validate token
  if (!expectedToken || !providedToken || expectedToken !== providedToken) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_CSRF_TOKEN',
        message: 'Invalid or missing CSRF token',
      },
    });
    return;
  }

  next();
};

/**
 * Endpoint to get CSRF token
 * Should be called by frontend before making state-changing requests
 */
export const getCsrfToken = (req: CsrfRequest, res: Response): void => {
  const sessionId = getSessionId(req);
  
  let token = csrfTokens.get(sessionId);
  if (!token) {
    token = generateToken();
    csrfTokens.set(sessionId, token);
  }

  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
};

/**
 * Clean up expired CSRF tokens (should be called periodically)
 * In production, use Redis with TTL or session store
 */
export const cleanupCsrfTokens = (): void => {
  // Simple cleanup: clear all tokens older than 24 hours
  // In production, implement proper TTL with timestamps
  if (csrfTokens.size > 10000) {
    csrfTokens.clear();
  }
};

// Clean up tokens every hour
setInterval(cleanupCsrfTokens, 60 * 60 * 1000);
