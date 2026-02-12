# Authentication and Security Middleware

This directory contains authentication and security middleware for the Made in Nepal E-Commerce Platform.

## Middleware Components

### 1. Authentication Middleware (`auth.ts`)

Provides JWT-based authentication and role-based authorization.

#### `authenticate`

Verifies JWT tokens and adds user information to the request object.

**Usage:**
```typescript
import { authenticate } from './middleware/index.js';

app.get('/api/protected', authenticate, (req: AuthRequest, res) => {
  // req.user contains { userId, role }
  res.json({ message: 'Protected route', user: req.user });
});
```

**Behavior:**
- Extracts JWT token from `Authorization: Bearer <token>` header
- Verifies token signature and expiration
- Adds `user` object to request with `userId` and `role`
- Returns 401 error if token is missing, invalid, or expired

#### `requireRole`

Authorization middleware that restricts access based on user roles.

**Usage:**
```typescript
import { authenticate, requireRole } from './middleware/index.js';

// Single role
app.post('/api/products', authenticate, requireRole('seller'), createProduct);

// Multiple roles
app.get('/api/admin/analytics', authenticate, requireRole('admin', 'seller'), getAnalytics);
```

**Behavior:**
- Must be used after `authenticate` middleware
- Checks if user has one of the specified roles
- Returns 403 error if user doesn't have required role
- Returns 401 error if user is not authenticated

#### `optionalAuth`

Optional authentication that doesn't fail if token is missing.

**Usage:**
```typescript
import { optionalAuth } from './middleware/index.js';

// Public route that can benefit from user context
app.get('/api/products', optionalAuth, getProducts);
```

**Behavior:**
- Adds user info to request if valid token is provided
- Continues without user info if token is missing or invalid
- Never returns an error

### 2. Rate Limiting Middleware (`rateLimiter.ts`)

Prevents brute force attacks and API abuse through rate limiting.

#### `rateLimiter`

General rate limiter for all API endpoints.

**Configuration:**
- Window: 1 minute (configurable via `RATE_LIMIT_WINDOW_MS`)
- Max requests: 100 per window (configurable via `RATE_LIMIT_MAX_REQUESTS`)
- Returns: HTTP 429 when limit exceeded

**Usage:**
```typescript
import { rateLimiter } from './middleware/index.js';

// Apply to all routes
app.use('/api', rateLimiter);
```

#### `authRateLimiter`

Stricter rate limiter for authentication endpoints.

**Configuration:**
- Window: 15 minutes
- Max requests: 5 per window
- Returns: HTTP 429 when limit exceeded

**Usage:**
```typescript
import { authRateLimiter } from './middleware/index.js';

app.post('/api/auth/login', authRateLimiter, login);
app.post('/api/auth/register', authRateLimiter, register);
```

#### `paymentRateLimiter`

Rate limiter for payment endpoints.

**Configuration:**
- Window: 1 minute
- Max requests: 10 per window
- Returns: HTTP 429 when limit exceeded

**Usage:**
```typescript
import { paymentRateLimiter } from './middleware/index.js';

app.post('/api/payment/esewa/initiate', paymentRateLimiter, initiatePayment);
```

### 3. CSRF Protection Middleware (`csrf.ts`)

Protects against Cross-Site Request Forgery attacks.

#### `csrfProtection`

Generates and attaches CSRF token to request.

**Usage:**
```typescript
import { csrfProtection } from './middleware/index.js';

// Apply to routes that need CSRF tokens
app.use('/api', csrfProtection);
```

**Behavior:**
- Generates unique CSRF token per session
- Attaches token to `req.csrfToken` and `res.locals.csrfToken`
- Token persists across requests from same session

#### `validateCsrfToken`

Validates CSRF token on state-changing requests.

**Usage:**
```typescript
import { validateCsrfToken } from './middleware/index.js';

// Apply to state-changing routes
app.post('/api/cart', validateCsrfToken, addToCart);
app.put('/api/products/:id', validateCsrfToken, updateProduct);
app.delete('/api/cart/:id', validateCsrfToken, removeFromCart);
```

**Behavior:**
- Skips validation for GET, HEAD, OPTIONS requests
- Validates token from header (`x-csrf-token` or `csrf-token`) or body/query (`csrfToken`)
- Returns 403 error if token is missing or invalid

#### `getCsrfToken`

Endpoint handler to retrieve CSRF token.

**Usage:**
```typescript
import { getCsrfToken } from './middleware/index.js';

app.get('/api/csrf-token', getCsrfToken);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "csrfToken": "abc123..."
  }
}
```

## Complete Example

Here's a complete example of setting up an Express app with all middleware:

```typescript
import express from 'express';
import {
  authenticate,
  requireRole,
  rateLimiter,
  authRateLimiter,
  csrfProtection,
  validateCsrfToken,
  getCsrfToken,
} from './middleware/index.js';

const app = express();

// Apply rate limiting to all routes
app.use('/api', rateLimiter);

// Apply CSRF protection to all routes
app.use('/api', csrfProtection);

// Public endpoint to get CSRF token
app.get('/api/csrf-token', getCsrfToken);

// Authentication endpoints with stricter rate limiting
app.post('/api/auth/register', authRateLimiter, register);
app.post('/api/auth/login', authRateLimiter, login);

// Protected routes requiring authentication
app.get('/api/auth/me', authenticate, getCurrentUser);

// Protected routes with CSRF validation
app.post('/api/cart', authenticate, validateCsrfToken, addToCart);
app.put('/api/cart/:id', authenticate, validateCsrfToken, updateCartItem);
app.delete('/api/cart/:id', authenticate, validateCsrfToken, removeFromCart);

// Role-based protected routes
app.post('/api/products', authenticate, requireRole('seller'), validateCsrfToken, createProduct);
app.put('/api/products/:id', authenticate, requireRole('seller'), validateCsrfToken, updateProduct);

// Admin-only routes
app.get('/api/admin/analytics', authenticate, requireRole('admin'), getAnalytics);
app.put('/api/admin/sellers/:id/verify', authenticate, requireRole('admin'), validateCsrfToken, verifySeller);

// Public routes with optional authentication
app.get('/api/products', optionalAuth, getProducts);
```

## Frontend Integration

### Getting CSRF Token

Before making state-changing requests, fetch the CSRF token:

```typescript
// Fetch CSRF token
const response = await fetch('/api/csrf-token');
const { data } = await response.json();
const csrfToken = data.csrfToken;

// Store token for subsequent requests
localStorage.setItem('csrfToken', csrfToken);
```

### Making Authenticated Requests

Include both JWT token and CSRF token:

```typescript
const token = localStorage.getItem('token');
const csrfToken = localStorage.getItem('csrfToken');

const response = await fetch('/api/cart', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ productId: '123', quantity: 1 }),
});
```

### Handling Rate Limit Errors

```typescript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 429) {
    // Rate limit exceeded
    const data = await response.json();
    alert(data.error.message);
    // Wait before retrying
    return;
  }

  // Handle success
} catch (error) {
  // Handle error
}
```

## Error Responses

All middleware follows a consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

**Authentication Errors (401):**
- `MISSING_TOKEN`: Authorization header is missing or malformed
- `INVALID_TOKEN`: Token is invalid or expired
- `UNAUTHENTICATED`: User is not authenticated

**Authorization Errors (403):**
- `INSUFFICIENT_PERMISSIONS`: User doesn't have required role
- `INVALID_CSRF_TOKEN`: CSRF token is missing or invalid

**Rate Limit Errors (429):**
- `RATE_LIMIT_EXCEEDED`: Too many requests from IP
- `AUTH_RATE_LIMIT_EXCEEDED`: Too many authentication attempts
- `PAYMENT_RATE_LIMIT_EXCEEDED`: Too many payment requests

## Security Considerations

1. **JWT Tokens:**
   - Store securely (httpOnly cookies or secure localStorage)
   - Never expose JWT secret
   - Use appropriate expiration times
   - Implement token refresh mechanism for long sessions

2. **CSRF Protection:**
   - Always validate CSRF tokens on state-changing operations
   - Use secure session management in production
   - Consider using Redis for token storage in production

3. **Rate Limiting:**
   - Adjust limits based on your application needs
   - Consider using Redis for distributed rate limiting
   - Monitor rate limit hits to detect attacks

4. **HTTPS:**
   - Always use HTTPS in production
   - JWT tokens and CSRF tokens should never be transmitted over HTTP

## Testing

All middleware components have comprehensive unit tests. Run tests with:

```bash
npm test -- middleware
```

## Requirements Validation

This middleware implementation validates the following requirements:

- **Requirement 4.3**: JWT-based authentication
- **Requirement 4.5**: Session expiration and re-authentication
- **Requirement 18.4**: Rate limiting (100 requests per minute per IP)
- **Requirement 18.6**: CSRF protection for state-changing operations

## Related Files

- `auth.ts` - Authentication and authorization middleware
- `rateLimiter.ts` - Rate limiting middleware
- `csrf.ts` - CSRF protection middleware
- `index.ts` - Middleware exports
- `__tests__/` - Unit tests for all middleware
