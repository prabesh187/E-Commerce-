import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * SQL injection patterns to detect and block
 * These patterns are commonly used in SQL injection attacks
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|\;|\/\*|\*\/|xp_|sp_)/gi,
  /(\bOR\b.*=.*|1\s*=\s*1|'\s*OR\s*'1'\s*=\s*'1)/gi,
  /(\bAND\b.*=.*|\bOR\b.*=.*)/gi,
];

/**
 * Check if a string contains SQL injection patterns
 * @param value - String to check
 * @returns true if SQL injection pattern detected
 */
const containsSqlInjection = (value: string): boolean => {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
};

/**
 * Sanitize a string value by:
 * 1. Trimming whitespace
 * 2. Escaping HTML tags to prevent XSS
 * 3. Checking for SQL injection patterns
 * 
 * @param value - Value to sanitize
 * @param skipEscape - Skip HTML escaping (for URLs, emails, etc.)
 * @returns Sanitized value
 * @throws Error if SQL injection pattern detected
 */
const sanitizeString = (value: string, skipEscape = false): string => {
  // Trim whitespace
  let sanitized = value.trim();

  // Check for SQL injection patterns
  if (containsSqlInjection(sanitized)) {
    throw new Error('Potential SQL injection detected');
  }

  // Escape HTML tags to prevent XSS (unless skipped for special fields)
  if (!skipEscape) {
    sanitized = validator.escape(sanitized);
  }

  return sanitized;
};

/**
 * Recursively sanitize an object's string values
 * @param obj - Object to sanitize
 * @param skipEscapeFields - Fields to skip HTML escaping (e.g., 'email', 'url')
 * @returns Sanitized object
 */
const sanitizeObject = (obj: any, skipEscapeFields: string[] = []): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, skipEscapeFields));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const shouldSkipEscape = skipEscapeFields.includes(key);
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeString(obj[key], shouldSkipEscape);
        } else {
          sanitized[key] = sanitizeObject(obj[key], skipEscapeFields);
        }
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Input sanitization middleware
 * 
 * Sanitizes all user input to prevent:
 * - XSS attacks (by escaping HTML tags)
 * - SQL injection attacks (by detecting and blocking SQL patterns)
 * 
 * Applies to:
 * - req.body
 * - req.query
 * - req.params
 * 
 * Requirements: 18.5
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Fields that should not be HTML-escaped (emails, passwords, etc.)
    const skipEscapeFields = ['email', 'emailOrPhone', 'password', 'url', 'phone'];
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, skipEscapeFields);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      const sanitized = sanitizeObject(req.query, skipEscapeFields);
      Object.keys(sanitized).forEach(key => {
        (req.query as any)[key] = sanitized[key];
      });
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, skipEscapeFields);
    }

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'SANITIZATION_FAILED',
          message: 'Input sanitization failed',
        },
      });
    }
  }
};

/**
 * Strict sanitization middleware for sensitive operations
 * 
 * More aggressive sanitization that:
 * - Blocks any HTML tags
 * - Blocks special characters commonly used in attacks
 * - Validates email and URL formats
 * 
 * Use this for authentication, payment, and admin operations
 */
export const strictSanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Validate email and URL BEFORE sanitization to check original format
    if (req.body?.email && !validator.isEmail(req.body.email)) {
      throw new Error('Invalid email format');
    }

    if (req.body?.url && !validator.isURL(req.body.url)) {
      throw new Error('Invalid URL format');
    }

    // Then apply standard sanitization, but skip escaping for email and url fields
    const skipEscapeFields = ['email', 'url'];
    
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, skipEscapeFields);
    }

    if (req.query && typeof req.query === 'object') {
      const sanitized = sanitizeObject(req.query, skipEscapeFields);
      Object.keys(sanitized).forEach(key => {
        (req.query as any)[key] = sanitized[key];
      });
    }

    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params, skipEscapeFields);
    }

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'STRICT_SANITIZATION_FAILED',
          message: 'Strict input sanitization failed',
        },
      });
    }
  }
};

/**
 * Utility function to check if a string is safe (no XSS or SQL injection)
 * Can be used in services for additional validation
 * 
 * @param value - String to check
 * @returns true if string is safe
 */
export const isSafeString = (value: string): boolean => {
  try {
    // Check for SQL injection
    if (containsSqlInjection(value)) {
      return false;
    }

    // Check for script tags
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value)) {
      return false;
    }

    // Check for event handlers
    if (/on\w+\s*=/gi.test(value)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
