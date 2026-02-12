import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config, validateEnv } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { authRoutes, productRoutes, searchRoutes, cartRoutes, orderRoutes, paymentRoutes, wishlistRoutes, recentlyViewedRoutes, recommendationRoutes, sellerRoutes, adminRoutes } from './routes/index.js';
import { sanitizeInput, validateCsrfToken, getCsrfToken } from './middleware/index.js';

// Validate environment variables
validateEnv();

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Serve static files from uploads directory
// Use path.resolve to handle both test and production environments
const uploadsPath = path.resolve(config.upload.uploadDir);
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// CSRF token endpoint - frontend should call this before making state-changing requests
// Requirement 18.6: CSRF protection
// Must be before sanitization and CSRF validation middleware
app.get('/api/csrf-token', getCsrfToken);

// API routes will be added here
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Made in Nepal E-Commerce API',
    version: '1.0.0',
  });
});

// CSRF protection middleware - validates tokens on state-changing operations
// Automatically skips GET, HEAD, OPTIONS requests
// Requirement 18.6: CSRF protection for all state-changing operations
// Must run BEFORE sanitization to avoid interference
app.use('/api', validateCsrfToken);

// Mount authentication routes FIRST (before sanitization)
// Auth routes handle their own input validation
app.use('/api/auth', authRoutes);

// Input sanitization middleware - applies to all non-auth routes
// Protects against XSS and SQL injection attacks
// Applied AFTER auth routes to avoid interfering with login
app.use('/api', sanitizeInput);

// Mount product routes
app.use('/api/products', productRoutes);

// Mount search routes
app.use('/api/search', searchRoutes);

// Mount cart routes
app.use('/api/cart', cartRoutes);

// Mount order routes
app.use('/api/orders', orderRoutes);

// Mount payment routes
app.use('/api/payment', paymentRoutes);

// Mount wishlist routes
app.use('/api/wishlist', wishlistRoutes);

// Mount recently viewed routes
app.use('/api/recently-viewed', recentlyViewedRoutes);

// Mount recommendation routes
app.use('/api', recommendationRoutes);

// Mount seller routes
app.use('/api/seller', sellerRoutes);

// Mount admin routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    },
  });
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start listening
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
