# Input Sanitization Middleware

## Overview

The input sanitization middleware provides comprehensive protection against XSS (Cross-Site Scripting) and SQL injection attacks by sanitizing all user input before it reaches the application logic.

## Features

- **HTML Tag Escaping**: Converts HTML tags to safe entities to prevent XSS attacks
- **SQL Injection Detection**: Detects and blocks common SQL injection patterns
- **Recursive Sanitization**: Sanitizes nested objects and arrays
- **Whitespace Trimming**: Removes leading and trailing whitespace
- **Email/URL Validation**: Validates email and URL formats in strict mode
- **Flexible Configuration**: Standard and strict sanitization modes

## Middleware Functions

### `sanitizeInput`

Standard sanitization middleware that should be applied to all user input endpoints.

**Features:**
- Escapes HTML tags to prevent XSS
- Detects and blocks SQL injection patterns
- Trims whitespace
- Sanitizes body, query, and params

**Usage:**
```typescript
import { sanitizeInput } from './middleware/index.js';

// Apply to all routes
app.use(sanitizeInput);

// Or apply to specific routes
router.post('/products', sanitizeInput, createProduct);
```

### `strictSanitizeInput`

More aggressive sanitization for sensitive operations like authentication, payment, and admin operations.

**Additional Features:**
- Validates email format
- Validates URL format
- Skips HTML escaping for email and URL fields (to preserve format)

**Usage:**
```typescript
import { strictSanitizeInput } from './middleware/index.js';

// Apply to authentication routes
router.post('/auth/register', strictSanitizeInput, register);
router.post('/auth/login', strictSanitizeInput, login);

// Apply to payment routes
router.post('/payment/initiate', strictSanitizeInput, initiatePayment);
```

### `isSafeString`

Utility function to check if a string is safe (no XSS or SQL injection).

**Usage:**
```typescript
import { isSafeString } from './middleware/index.js';

if (!isSafeString(userInput)) {
  throw new Error('Invalid input detected');
}
```

## Protection Details

### XSS Prevention

The middleware escapes HTML tags to prevent XSS attacks:

**Input:**
```javascript
{
  comment: '<script>alert("XSS")</script>'
}
```

**Output:**
```javascript
{
  comment: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
}
```

**Blocked Patterns:**
- `<script>` tags
- Event handlers (`onclick`, `onerror`, etc.)
- `<iframe>` tags
- `javascript:` protocol
- Any HTML tags

### SQL Injection Prevention

The middleware detects and blocks common SQL injection patterns:

**Blocked Patterns:**
- SQL keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `EXEC`, `UNION`, `DECLARE`
- SQL comments: `--`, `/*`, `*/`
- SQL operators: `OR 1=1`, `' OR '1'='1`
- Stored procedures: `xp_`, `sp_`

**Examples:**
```javascript
// Blocked
"'; DROP TABLE users; --"
"1' OR '1'='1"
"UNION SELECT * FROM users"
"admin' OR 1=1--"
```

## Error Responses

### Standard Sanitization Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Potential SQL injection detected"
  }
}
```

### Strict Sanitization Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid email format"
  }
}
```

## Implementation Examples

### Apply to All Routes

```typescript
import express from 'express';
import { sanitizeInput } from './middleware/index.js';

const app = express();

// Apply to all routes
app.use(express.json());
app.use(sanitizeInput);

// Your routes here
app.use('/api', routes);
```

### Apply to Specific Routes

```typescript
import { Router } from 'express';
import { sanitizeInput, strictSanitizeInput } from './middleware/index.js';

const router = Router();

// Standard sanitization for product routes
router.post('/products', sanitizeInput, createProduct);
router.put('/products/:id', sanitizeInput, updateProduct);

// Strict sanitization for auth routes
router.post('/auth/register', strictSanitizeInput, register);
router.post('/auth/login', strictSanitizeInput, login);
```

### Use in Service Layer

```typescript
import { isSafeString } from './middleware/index.js';

export class ProductService {
  async createProduct(data: ProductData) {
    // Additional validation in service layer
    if (!isSafeString(data.description)) {
      throw new Error('Invalid product description');
    }
    
    // Process product creation
  }
}
```

## Best Practices

1. **Apply Early**: Apply sanitization middleware early in the middleware chain, after body parsing but before route handlers

2. **Use Strict Mode for Sensitive Operations**: Use `strictSanitizeInput` for authentication, payment, and admin operations

3. **Layer Defense**: Combine with other security measures:
   - Rate limiting
   - CSRF protection
   - Authentication/Authorization
   - Input validation

4. **Don't Trust Client**: Always sanitize on the server, even if client-side validation exists

5. **Log Suspicious Activity**: Consider logging blocked SQL injection attempts for security monitoring

6. **Test Thoroughly**: Test with various attack vectors to ensure protection

## Limitations

1. **False Positives**: Legitimate content containing SQL keywords (e.g., "This product is selected from our best collection") may trigger false positives. The current implementation tries to minimize this by using pattern matching.

2. **Performance**: Recursive sanitization of large nested objects may impact performance. Consider implementing caching or limiting object depth for very large payloads.

3. **NoSQL Injection**: This middleware focuses on SQL injection. For MongoDB, also use parameterized queries and avoid `$where` operators with user input.

4. **Advanced XSS**: While this middleware blocks common XSS vectors, always use Content Security Policy (CSP) headers as an additional layer of defense.

## Testing

Comprehensive tests are available in `__tests__/sanitization.test.ts`:

```bash
npm test -- sanitization.test.ts
```

## Requirements

Validates Requirements 18.5: "THE Platform SHALL validate and sanitize all user inputs to prevent injection attacks"

## Dependencies

- `validator`: For email/URL validation and HTML escaping
- `express`: For middleware types

## Related Middleware

- `auth.ts`: Authentication and authorization
- `csrf.ts`: CSRF protection
- `rateLimiter.ts`: Rate limiting

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [validator.js Documentation](https://github.com/validatorjs/validator.js)
