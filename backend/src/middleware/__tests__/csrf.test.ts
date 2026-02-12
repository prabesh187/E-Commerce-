import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import {
  csrfProtection,
  validateCsrfToken,
  getCsrfToken,
} from '../csrf.js';
import { CsrfRequest } from '../../types/express.js';

describe('CSRF Protection Middleware', () => {
  let mockRequest: Partial<CsrfRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn() as any;
    statusMock = jest.fn().mockReturnValue({ json: jsonMock }) as any;
    mockNext = jest.fn() as any;

    mockRequest = {
      headers: {
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
      method: 'POST',
      body: {},
      query: {},
    };

    mockResponse = {
      status: statusMock as any,
      json: jsonMock as any,
      locals: {},
    };

    jest.clearAllMocks();
  });

  describe('csrfProtection', () => {
    it('should generate and attach CSRF token to request', () => {
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.csrfToken).toBeDefined();
      expect(typeof mockRequest.csrfToken).toBe('string');
      expect(mockRequest.csrfToken!.length).toBeGreaterThan(0);
      expect(mockRequest.sessionId).toBeDefined();
      expect(mockResponse.locals!.csrfToken).toBe(mockRequest.csrfToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate same token for same session', () => {
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const firstToken = mockRequest.csrfToken;
      const firstSessionId = mockRequest.sessionId;

      // Reset mocks but keep same request identity
      jest.clearAllMocks();
      mockResponse.locals = {};

      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.csrfToken).toBe(firstToken);
      expect(mockRequest.sessionId).toBe(firstSessionId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate different tokens for different sessions', () => {
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const firstToken = mockRequest.csrfToken;

      // Create new request with different identity
      const mockRequest2: Partial<CsrfRequest> = {
        headers: {
          'user-agent': 'different-agent',
        },
        ip: '192.168.1.1',
        socket: {
          remoteAddress: '192.168.1.1',
        } as any,
        method: 'POST',
        body: {},
        query: {},
      };

      const mockResponse2: Partial<Response> = {
        status: statusMock as any,
        json: jsonMock as any,
        locals: {},
      };

      csrfProtection(
        mockRequest2 as CsrfRequest,
        mockResponse2 as Response,
        mockNext
      );

      expect(mockRequest2.csrfToken).toBeDefined();
      expect(mockRequest2.csrfToken).not.toBe(firstToken);
    });
  });

  describe('validateCsrfToken', () => {
    it('should allow GET requests without CSRF token', () => {
      mockRequest.method = 'GET';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow HEAD requests without CSRF token', () => {
      mockRequest.method = 'HEAD';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      mockRequest.method = 'OPTIONS';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should validate CSRF token from header for POST request', () => {
      // First, generate a token
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const token = mockRequest.csrfToken!;

      // Reset mocks
      jest.clearAllMocks();

      // Add token to header
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-csrf-token': token,
      };
      mockRequest.method = 'POST';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should validate CSRF token from body for POST request', () => {
      // First, generate a token
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const token = mockRequest.csrfToken!;

      // Reset mocks
      jest.clearAllMocks();

      // Add token to body
      mockRequest.body = { csrfToken: token };
      mockRequest.method = 'POST';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token', () => {
      mockRequest.method = 'POST';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CSRF_TOKEN',
          message: 'Invalid or missing CSRF token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject POST request with invalid CSRF token', () => {
      // First, generate a token
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      // Reset mocks
      jest.clearAllMocks();

      // Add wrong token to header
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-csrf-token': 'invalid-token',
      };
      mockRequest.method = 'POST';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_CSRF_TOKEN',
          message: 'Invalid or missing CSRF token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate CSRF token for PUT request', () => {
      // First, generate a token
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const token = mockRequest.csrfToken!;

      // Reset mocks
      jest.clearAllMocks();

      // Add token to header
      mockRequest.headers = {
        ...mockRequest.headers,
        'csrf-token': token,
      };
      mockRequest.method = 'PUT';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should validate CSRF token for DELETE request', () => {
      // First, generate a token
      csrfProtection(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      const token = mockRequest.csrfToken!;

      // Reset mocks
      jest.clearAllMocks();

      // Add token to query
      mockRequest.query = { csrfToken: token };
      mockRequest.method = 'DELETE';

      validateCsrfToken(
        mockRequest as CsrfRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token in response', () => {
      getCsrfToken(mockRequest as CsrfRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          csrfToken: expect.any(String),
        },
      });
    });

    it('should return same token for same session', () => {
      getCsrfToken(mockRequest as CsrfRequest, mockResponse as Response);

      const firstCall = jsonMock.mock.calls[0][0] as any;
      const firstToken = firstCall.data.csrfToken;

      jest.clearAllMocks();

      getCsrfToken(mockRequest as CsrfRequest, mockResponse as Response);

      const secondCall = jsonMock.mock.calls[0][0] as any;
      const secondToken = secondCall.data.csrfToken;

      expect(secondToken).toBe(firstToken);
    });

    it('should return different tokens for different sessions', () => {
      getCsrfToken(mockRequest as CsrfRequest, mockResponse as Response);

      const firstCall = jsonMock.mock.calls[0][0] as any;
      const firstToken = firstCall.data.csrfToken;

      // Create new request with different identity
      const mockRequest2: Partial<CsrfRequest> = {
        headers: {
          'user-agent': 'different-agent',
        },
        ip: '192.168.1.1',
        socket: {
          remoteAddress: '192.168.1.1',
        } as any,
      };

      jest.clearAllMocks();

      getCsrfToken(mockRequest2 as CsrfRequest, mockResponse as Response);

      const secondCall = jsonMock.mock.calls[0][0] as any;
      const secondToken = secondCall.data.csrfToken;

      expect(secondToken).not.toBe(firstToken);
    });
  });
});
