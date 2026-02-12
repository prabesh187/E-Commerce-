import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  sanitizeInput,
  strictSanitizeInput,
  isSafeString,
} from '../sanitization.js';

describe('Input Sanitization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    nextFunction = jest.fn() as NextFunction;
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML tags in request body', () => {
      mockRequest.body = {
        name: '<script>alert("xss")</script>John',
        description: '<b>Bold text</b>',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.name).not.toContain('<script>');
      expect(mockRequest.body.description).not.toContain('<b>');
      // Validator.escape converts < to &lt; and > to &gt;
      expect(mockRequest.body.name).toContain('&lt;');
      expect(mockRequest.body.name).toContain('&gt;');
    });

    it('should detect and block SQL injection patterns', () => {
      mockRequest.body = {
        search: "'; DROP TABLE users; --",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Potential SQL injection detected',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should detect SQL injection with UNION SELECT', () => {
      mockRequest.body = {
        query: "1' UNION SELECT * FROM users--",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Potential SQL injection detected',
        },
      });
    });

    it('should detect SQL injection with OR 1=1', () => {
      mockRequest.body = {
        username: "admin' OR '1'='1",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Potential SQL injection detected',
        },
      });
    });

    it('should sanitize query parameters', () => {
      mockRequest.query = {
        search: '<img src=x onerror=alert(1)>',
        category: 'food',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.query.search).not.toContain('<img');
      expect(mockRequest.query.category).toBe('food');
    });

    it('should sanitize URL parameters', () => {
      mockRequest.params = {
        id: '<script>alert(1)</script>123',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.params.id).not.toContain('<script>');
    });

    it('should handle nested objects', () => {
      mockRequest.body = {
        user: {
          name: '<b>John</b>',
          address: {
            street: '<script>alert(1)</script>Main St',
          },
        },
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.user.name).not.toContain('<b>');
      expect(mockRequest.body.user.address.street).not.toContain('<script>');
    });

    it('should handle arrays', () => {
      mockRequest.body = {
        tags: ['<script>tag1</script>', 'tag2', '<b>tag3</b>'],
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.tags[0]).not.toContain('<script>');
      expect(mockRequest.body.tags[2]).not.toContain('<b>');
    });

    it('should preserve non-string values', () => {
      mockRequest.body = {
        name: 'John',
        age: 25,
        active: true,
        score: null,
        metadata: undefined,
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.age).toBe(25);
      expect(mockRequest.body.active).toBe(true);
      expect(mockRequest.body.score).toBeNull();
    });

    it('should trim whitespace from strings', () => {
      mockRequest.body = {
        name: '  John Doe  ',
        email: '  john@example.com  ',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.name).toBe('John Doe');
      expect(mockRequest.body.email).toBe('john@example.com');
    });

    it('should allow safe strings', () => {
      mockRequest.body = {
        name: 'John Doe',
        description: 'A simple product description',
        price: '100',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.name).toBe('John Doe');
      expect(mockRequest.body.description).toBe('A simple product description');
    });
  });

  describe('strictSanitizeInput', () => {
    it('should validate email format', () => {
      mockRequest.body = {
        email: 'invalid-email',
      };

      strictSanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid email format',
        },
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow valid email format', () => {
      mockRequest.body = {
        email: 'john@example.com',
      };

      strictSanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should validate URL format', () => {
      mockRequest.body = {
        url: 'not-a-valid-url',
      };

      strictSanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid URL format',
        },
      });
    });

    it('should allow valid URL format', () => {
      mockRequest.body = {
        url: 'https://example.com',
        name: 'Test',
      };

      strictSanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.url).toBe('https://example.com');
    });

    it('should apply standard sanitization first', () => {
      mockRequest.body = {
        name: '<script>alert(1)</script>John',
      };

      strictSanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.name).not.toContain('<script>');
    });
  });

  describe('isSafeString', () => {
    it('should return true for safe strings', () => {
      expect(isSafeString('John Doe')).toBe(true);
      expect(isSafeString('Product description')).toBe(true);
      expect(isSafeString('Price: $100')).toBe(true);
    });

    it('should return false for SQL injection patterns', () => {
      expect(isSafeString("'; DROP TABLE users; --")).toBe(false);
      expect(isSafeString("1' OR '1'='1")).toBe(false);
      expect(isSafeString('UNION SELECT * FROM users')).toBe(false);
    });

    it('should return false for script tags', () => {
      expect(isSafeString('<script>alert(1)</script>')).toBe(false);
      expect(isSafeString('<script src="evil.js"></script>')).toBe(false);
    });

    it('should return false for event handlers', () => {
      expect(isSafeString('<img src=x onerror=alert(1)>')).toBe(false);
      expect(isSafeString('<div onclick="alert(1)">Click</div>')).toBe(false);
      expect(isSafeString('<body onload=alert(1)>')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(isSafeString('')).toBe(true);
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent script tag injection', () => {
      mockRequest.body = {
        comment: '<script>alert("XSS")</script>',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.comment).not.toContain('<script>');
      expect(mockRequest.body.comment).toContain('&lt;script&gt;');
    });

    it('should prevent img tag with onerror', () => {
      mockRequest.body = {
        description: '<img src=x onerror=alert(1)>',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.description).not.toContain('<img');
      // The string is escaped, so it's safe
      expect(mockRequest.body.description).toContain('&lt;img');
    });

    it('should prevent iframe injection', () => {
      mockRequest.body = {
        content: '<iframe src="evil.com"></iframe>',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.body.content).not.toContain('<iframe');
    });

    it('should prevent javascript: protocol', () => {
      mockRequest.body = {
        link: '<a href="javascript:alert(1)">Click</a>',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      // The string is escaped, making it safe
      expect(mockRequest.body.link).toContain('&lt;a');
      expect(mockRequest.body.link).toContain('&quot;');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should block INSERT statements', () => {
      mockRequest.body = {
        query: "'; INSERT INTO users VALUES ('hacker', 'pass'); --",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should block UPDATE statements', () => {
      mockRequest.body = {
        query: "'; UPDATE users SET role='admin' WHERE id=1; --",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should block DELETE statements', () => {
      mockRequest.body = {
        query: "'; DELETE FROM users; --",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should block DROP statements', () => {
      mockRequest.body = {
        query: "'; DROP TABLE users; --",
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow legitimate use of SQL keywords in content', () => {
      // This is a tricky case - we want to block SQL injection but allow
      // legitimate content that might contain SQL keywords
      mockRequest.body = {
        description: 'This product is selected from our best collection',
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // This should pass because it's not a SQL injection pattern
      // The word "selected" contains "SELECT" but in a safe context
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
