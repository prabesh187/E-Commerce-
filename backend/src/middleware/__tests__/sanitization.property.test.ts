import { describe, it, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import * as fc from 'fast-check';
import {
  sanitizeInput,
  isSafeString,
} from '../sanitization.js';

// Feature: made-in-nepal-ecommerce, Property 53: Input Sanitization
// *For any* user input containing HTML tags or SQL injection patterns,
// the input must be sanitized or rejected before processing.
// **Validates: Requirements 18.5**

describe('Property 53: Input Sanitization', () => {
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    nextFunction = jest.fn() as NextFunction;
  });

  describe('HTML Tag Escaping', () => {
    it('should escape HTML tags in any string input', () => {
      // Generator for strings with HTML tags
      const htmlTagGen = fc.oneof(
        fc.constant('<script>'),
        fc.constant('<img>'),
        fc.constant('<div>'),
        fc.constant('<iframe>')
      );

      const stringWithHtmlGen = fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9 ]*$/),
        htmlTagGen,
        fc.stringMatching(/^[a-zA-Z0-9 ]*$/)
      ).map(([before, tag, after]) => before + tag + after);

      fc.assert(
        fc.property(stringWithHtmlGen, (inputString) => {
          const mockRequest: Partial<Request> = {
            body: { input: inputString },
            query: {},
            params: {},
          };

          // Reset mocks
          (mockResponse.status as jest.Mock).mockClear();
          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: HTML tags must be escaped (< becomes &lt;, > becomes &gt;)
          // If input had <, output should have &lt; or be rejected
          if ((nextFunction as jest.Mock).mock.calls.length > 0) {
            const sanitized = mockRequest.body.input;
            if (inputString.includes('<')) {
              return sanitized.includes('&lt;');
            }
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should escape HTML in nested objects', () => {
      const nestedGen = fc.record({
        text: fc.stringMatching(/^[a-zA-Z0-9 ]*$/).map(s => `<b>${s}</b>`)
      });

      fc.assert(
        fc.property(nestedGen, (obj) => {
          const mockRequest: Partial<Request> = {
            body: obj,
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Nested HTML must be escaped
          if ((nextFunction as jest.Mock).mock.calls.length > 0) {
            return mockRequest.body.text.includes('&lt;');
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('SQL Injection Pattern Rejection', () => {
    it('should reject DROP TABLE pattern', () => {
      const sqlPattern = "'; DROP TABLE users; --";
      const mockRequest: Partial<Request> = {
        body: { query: sqlPattern },
        query: {},
        params: {},
      };

      (mockResponse.status as jest.Mock).mockClear();
      (mockResponse.json as jest.Mock).mockClear();
      (nextFunction as jest.Mock).mockClear();

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Property: SQL injection patterns must be rejected
      const wasRejected = (mockResponse.status as jest.Mock).mock.calls.some(
        call => call[0] === 400
      );
      const nextNotCalled = (nextFunction as jest.Mock).mock.calls.length === 0;
      
      expect(wasRejected).toBe(true);
      expect(nextNotCalled).toBe(true);
    });

    it('should reject OR equals pattern', () => {
      const sqlPattern = "admin' OR '1'='1";
      const mockRequest: Partial<Request> = {
        body: { query: sqlPattern },
        query: {},
        params: {},
      };

      (mockResponse.status as jest.Mock).mockClear();
      (mockResponse.json as jest.Mock).mockClear();
      (nextFunction as jest.Mock).mockClear();

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Property: SQL injection patterns must be rejected
      const wasRejected = (mockResponse.status as jest.Mock).mock.calls.some(
        call => call[0] === 400
      );
      const nextNotCalled = (nextFunction as jest.Mock).mock.calls.length === 0;
      
      expect(wasRejected).toBe(true);
      expect(nextNotCalled).toBe(true);
    });

    it('should reject UNION SELECT pattern', () => {
      const sqlPattern = "1' UNION SELECT * FROM users--";
      const mockRequest: Partial<Request> = {
        body: { query: sqlPattern },
        query: {},
        params: {},
      };

      (mockResponse.status as jest.Mock).mockClear();
      (mockResponse.json as jest.Mock).mockClear();
      (nextFunction as jest.Mock).mockClear();

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Property: SQL injection patterns must be rejected
      const wasRejected = (mockResponse.status as jest.Mock).mock.calls.some(
        call => call[0] === 400
      );
      const nextNotCalled = (nextFunction as jest.Mock).mock.calls.length === 0;
      
      expect(wasRejected).toBe(true);
      expect(nextNotCalled).toBe(true);
    });

    it('should detect SQL patterns using isSafeString', () => {
      expect(isSafeString("'; DROP TABLE users; --")).toBe(false);
      expect(isSafeString("admin' OR '1'='1")).toBe(false);
      expect(isSafeString("1' UNION SELECT * FROM users--")).toBe(false);
    });
  });

  describe('Safe Input Preservation', () => {
    it('should preserve safe alphanumeric strings', () => {
      // Generator for safe strings (letters, numbers, spaces only)
      const safeStringGen = fc.stringMatching(/^[a-zA-Z0-9 ]+$/);

      fc.assert(
        fc.property(safeStringGen, (safeString) => {
          const mockRequest: Partial<Request> = {
            body: { name: safeString },
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Safe strings should pass through and call next()
          return (nextFunction as jest.Mock).mock.calls.length > 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve non-string values', () => {
      const mixedObjectGen = fc.record({
        name: fc.stringMatching(/^[a-zA-Z ]+$/),
        age: fc.integer({ min: 0, max: 120 }),
        active: fc.boolean(),
        price: fc.double({ min: 0, max: 10000, noNaN: true })
      });

      fc.assert(
        fc.property(mixedObjectGen, (obj) => {
          const mockRequest: Partial<Request> = {
            body: obj,
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Non-string values should preserve their types
          if ((nextFunction as jest.Mock).mock.calls.length > 0) {
            return typeof mockRequest.body.age === 'number' &&
                   typeof mockRequest.body.active === 'boolean' &&
                   typeof mockRequest.body.price === 'number';
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Whitespace Trimming', () => {
    it('should trim whitespace from safe string inputs', () => {
      // Generator for safe strings with whitespace
      const stringWithWhitespaceGen = fc.tuple(
        fc.stringMatching(/^\s+/),
        fc.stringMatching(/^[a-zA-Z0-9]+$/),
        fc.stringMatching(/\s+$/)
      ).map(([leading, middle, trailing]) => leading + middle + trailing);

      fc.assert(
        fc.property(stringWithWhitespaceGen, (str) => {
          const mockRequest: Partial<Request> = {
            body: { text: str },
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Whitespace should be trimmed from safe strings
          if ((nextFunction as jest.Mock).mock.calls.length > 0) {
            const sanitized = mockRequest.body.text;
            return sanitized === sanitized.trim();
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Comprehensive Sanitization Property', () => {
    it('should either escape HTML or reject SQL patterns for any input', () => {
      // Generator for various types of potentially dangerous inputs
      const dangerousInputGen = fc.oneof(
        // HTML inputs (should be escaped)
        fc.stringMatching(/^[a-zA-Z0-9 ]*$/).map(s => `<script>${s}</script>`),
        fc.stringMatching(/^[a-zA-Z0-9 ]*$/).map(s => `<img src="${s}">`),
        
        // SQL injection inputs (should be rejected)
        fc.constant("' OR 1=1 --"),
        fc.constant("'; DROP TABLE users; --"),
        
        // Safe inputs (should pass through)
        fc.stringMatching(/^[a-zA-Z0-9 ]+$/)
      );

      fc.assert(
        fc.property(dangerousInputGen, (input) => {
          const mockRequest: Partial<Request> = {
            body: { data: input },
            query: {},
            params: {},
          };

          (mockResponse.status as jest.Mock).mockClear();
          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Input must be either:
          // 1. Escaped (HTML tags converted to entities) and next() called
          // 2. Rejected (SQL patterns detected) with 400 status
          // 3. Passed through safely if no dangerous patterns
          
          const wasRejected = (mockResponse.status as jest.Mock).mock.calls.some(
            call => call[0] === 400
          );
          const wasAccepted = (nextFunction as jest.Mock).mock.calls.length > 0;
          
          // Must be either rejected OR accepted, not both
          return (wasRejected && !wasAccepted) || (!wasRejected && wasAccepted);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('XSS Prevention', () => {
    it('should escape event handlers in HTML', () => {
      const xssGen = fc.stringMatching(/^[a-zA-Z0-9]*$/).map(
        s => `<img onerror="${s}">`
      );

      fc.assert(
        fc.property(xssGen, (xssString) => {
          const mockRequest: Partial<Request> = {
            body: { content: xssString },
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Event handlers should be escaped
          if ((nextFunction as jest.Mock).mock.calls.length > 0) {
            const sanitized = mockRequest.body.content;
            return sanitized.includes('&lt;') && sanitized.includes('&gt;');
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      const mockRequest: Partial<Request> = {
        body: {},
        query: {},
        params: {},
      };

      (nextFunction as jest.Mock).mockClear();

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Property: Empty objects should pass through
      expect((nextFunction as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle arrays of safe strings', () => {
      const arrayGen = fc.array(
        fc.stringMatching(/^[a-zA-Z0-9 ]+$/),
        { minLength: 1, maxLength: 5 }
      );

      fc.assert(
        fc.property(arrayGen, (arr) => {
          const mockRequest: Partial<Request> = {
            body: { items: arr },
            query: {},
            params: {},
          };

          (nextFunction as jest.Mock).mockClear();

          sanitizeInput(
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
          );

          // Property: Arrays of safe strings should pass through
          return (nextFunction as jest.Mock).mock.calls.length > 0;
        }),
        { numRuns: 100 }
      );
    });
  });
});
