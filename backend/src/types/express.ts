import { Request } from 'express';

/**
 * Extended Request interface with authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: 'buyer' | 'seller' | 'admin';
  };
}

/**
 * Extended Request interface with CSRF token
 */
export interface CsrfRequest extends Request {
  csrfToken?: string;
  sessionId?: string;
}
