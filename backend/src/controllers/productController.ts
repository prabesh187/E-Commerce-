import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.js';
import { productService } from '../services/ProductService.js';
import { imageService } from '../services/ImageService.js';
import multer from 'multer';
import { config } from '../config/env.js';

/**
 * Configure multer for memory storage
 * Images will be processed in memory before saving
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10, // Maximum 10 images per upload
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

/**
 * Multer middleware for single image upload
 */
export const uploadSingle = (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'File upload failed',
        },
      });
      return;
    }
    next();
  });
};

/**
 * Multer middleware for multiple image uploads
 */
export const uploadMultiple = (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.array('images', 10)(req, res, (err: any) => {
    if (err) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'File upload failed',
        },
      });
      return;
    }
    next();
  });
};

/**
 * Upload and optimize a single image
 */
export const uploadImage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No image file provided',
        },
      });
      return;
    }

    // Validate image
    imageService.validateImage(req.file.mimetype, req.file.size);

    // Optimize and save image
    const result = await imageService.optimizeAndSaveImage(
      req.file.buffer,
      req.file.originalname
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to upload image',
      },
    });
  }
};

/**
 * Upload and optimize multiple images
 */
export const uploadImages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No image files provided',
        },
      });
      return;
    }

    // Validate all images
    for (const file of req.files) {
      imageService.validateImage(file.mimetype, file.size);
    }

    // Optimize and save all images
    const results = await Promise.all(
      req.files.map((file) =>
        imageService.optimizeAndSaveImage(file.buffer, file.originalname)
      )
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to upload images',
      },
    });
  }
};

/**
 * Create a new product
 */
export const createProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const product = await productService.createProduct(req.body, sellerId);

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create product',
      },
    });
  }
};

/**
 * Get product by ID
 */
export const getProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID must be a single value',
        },
      });
      return;
    }
    
    const product = await productService.getProductById(id);

    // Increment view count
    await productService.incrementViewCount(id);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    const statusCode = error instanceof Error && error.message === 'Product not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get product',
      },
    });
  }
};

/**
 * Update product
 */
export const updateProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID must be a single value',
        },
      });
      return;
    }

    const product = await productService.updateProduct(id, req.body, sellerId);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 403 ? 'FORBIDDEN' : 'UPDATE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update product',
      },
    });
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const sellerId = req.user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID must be a single value',
        },
      });
      return;
    }

    await productService.deleteProduct(id, sellerId);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    const statusCode = error instanceof Error && error.message.includes('permission') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 403 ? 'FORBIDDEN' : 'DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete product',
      },
    });
  }
};

/**
 * Get products with filters and pagination
 */
export const getProducts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      minRating,
      sellerId,
      verificationStatus,
      sortBy,
      page,
      limit,
    } = req.query;

    const filters = {
      category: category as string | undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      sellerId: sellerId as string | undefined,
      verificationStatus: verificationStatus as 'pending' | 'approved' | 'rejected' | undefined,
    };

    const result = await productService.getProducts(
      filters,
      sortBy as string | undefined,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get products',
      },
    });
  }
};

/**
 * Get related products
 */
export const getRelatedProducts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit } = req.query;

    // Ensure id is a string
    if (Array.isArray(id)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Product ID must be a single value',
        },
      });
      return;
    }

    const products = await productService.getRelatedProducts(
      id,
      limit ? parseInt(limit as string) : undefined
    );

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get related products',
      },
    });
  }
};
