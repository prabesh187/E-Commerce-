import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/env.js';

/**
 * Image size configuration for responsive images
 */
export interface ImageSize {
  name: string;
  width: number;
  height?: number;
  fit?: keyof sharp.FitEnum;
}

/**
 * Image optimization result
 */
export interface OptimizedImage {
  url: string;
  size: string;
  width: number;
  height: number;
  fileSize: number;
}

/**
 * Image upload result
 */
export interface ImageUploadResult {
  original: OptimizedImage;
  sizes: OptimizedImage[];
}

/**
 * ImageService handles image upload, optimization, and storage
 */
export class ImageService {
  private uploadDir: string;
  
  // Define responsive image sizes
  private readonly imageSizes: ImageSize[] = [
    { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
    { name: 'small', width: 300, height: 300, fit: 'cover' },
    { name: 'medium', width: 600, height: 600, fit: 'inside' },
    { name: 'large', width: 1200, height: 1200, fit: 'inside' },
  ];

  constructor() {
    this.uploadDir = config.upload.uploadDir;
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Get full path for upload directory
   */
  private getUploadPath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '-');
    return `${sanitizedName}-${timestamp}-${random}${ext}`;
  }

  /**
   * Optimize and save image in multiple sizes
   * @param buffer - Image buffer
   * @param originalName - Original filename
   * @returns Image upload result with URLs for all sizes
   */
  async optimizeAndSaveImage(
    buffer: Buffer,
    originalName: string
  ): Promise<ImageUploadResult> {
    await this.ensureUploadDir();

    const filename = this.generateFilename(originalName);
    const baseFilename = path.parse(filename).name;
    const ext = path.parse(filename).ext;

    // Get original image metadata
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Optimize original image
    const optimizedOriginal = await sharp(buffer)
      .jpeg({ quality: 85, progressive: true })
      .png({ quality: 85, compressionLevel: 9 })
      .webp({ quality: 85 })
      .toFormat(ext === '.png' ? 'png' : 'jpeg')
      .toBuffer();

    const originalPath = this.getUploadPath(filename);
    await fs.writeFile(originalPath, optimizedOriginal);

    const originalStats = await fs.stat(originalPath);

    const result: ImageUploadResult = {
      original: {
        url: `/uploads/${filename}`,
        size: 'original',
        width: originalWidth,
        height: originalHeight,
        fileSize: originalStats.size,
      },
      sizes: [],
    };

    // Generate responsive sizes
    for (const size of this.imageSizes) {
      const sizedFilename = `${baseFilename}-${size.name}${ext}`;
      const sizedPath = this.getUploadPath(sizedFilename);

      let sharpInstance = sharp(buffer).resize({
        width: size.width,
        height: size.height,
        fit: size.fit || 'inside',
        withoutEnlargement: true,
      });

      // Apply format-specific optimization
      if (ext === '.png') {
        sharpInstance = sharpInstance.png({
          quality: 85,
          compressionLevel: 9,
        });
      } else {
        sharpInstance = sharpInstance.jpeg({
          quality: 85,
          progressive: true,
        });
      }

      const optimizedBuffer = await sharpInstance.toBuffer();
      await fs.writeFile(sizedPath, optimizedBuffer);

      const sizedMetadata = await sharp(optimizedBuffer).metadata();
      const sizedStats = await fs.stat(sizedPath);

      result.sizes.push({
        url: `/uploads/${sizedFilename}`,
        size: size.name,
        width: sizedMetadata.width || size.width,
        height: sizedMetadata.height || size.height || size.width,
        fileSize: sizedStats.size,
      });
    }

    return result;
  }

  /**
   * Delete image and all its sizes
   * @param imageUrl - Image URL to delete
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = path.basename(imageUrl);
      const baseFilename = path.parse(filename).name;
      const ext = path.parse(filename).ext;

      // Delete original
      const originalPath = this.getUploadPath(filename);
      try {
        await fs.unlink(originalPath);
      } catch (error) {
        console.warn(`Failed to delete original image: ${originalPath}`, error);
      }

      // Delete all sizes
      for (const size of this.imageSizes) {
        const sizedFilename = `${baseFilename}-${size.name}${ext}`;
        const sizedPath = this.getUploadPath(sizedFilename);
        try {
          await fs.unlink(sizedPath);
        } catch (error) {
          console.warn(`Failed to delete sized image: ${sizedPath}`, error);
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Validate image file
   * @param mimetype - File mimetype
   * @param size - File size in bytes
   */
  validateImage(mimetype: string, size: number): void {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(mimetype)) {
      throw new Error(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      );
    }

    if (size > config.upload.maxFileSize) {
      const maxSizeMB = config.upload.maxFileSize / (1024 * 1024);
      throw new Error(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`
      );
    }
  }
}

// Export singleton instance
export const imageService = new ImageService();
