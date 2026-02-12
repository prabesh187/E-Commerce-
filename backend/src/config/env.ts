import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration with validation
 */
export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/made-in-nepal',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  
  // Email
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@madeinnepal.com',
  },
  
  // Payment Gateways
  esewa: {
    merchantId: process.env.ESEWA_MERCHANT_ID || '',
    secretKey: process.env.ESEWA_SECRET_KEY || '',
    paymentUrl: process.env.ESEWA_PAYMENT_URL || 'https://uat.esewa.com.np/epay/main',
    verifyUrl: process.env.ESEWA_VERIFY_URL || 'https://uat.esewa.com.np/epay/transrec',
  },
  
  khalti: {
    secretKey: process.env.KHALTI_SECRET_KEY || '',
    publicKey: process.env.KHALTI_PUBLIC_KEY || '',
    paymentUrl: process.env.KHALTI_PAYMENT_URL || 'https://khalti.com/api/v2/payment/initiate/',
    verifyUrl: process.env.KHALTI_VERIFY_URL || 'https://khalti.com/api/v2/payment/verify/',
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },
};

/**
 * Validate required environment variables
 */
export const validateEnv = (): void => {
  const requiredVars = ['JWT_SECRET'];
  
  const missing = requiredVars.filter((varName) => !process.env[varName]);
  
  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  Using default values for development');
  }
};
