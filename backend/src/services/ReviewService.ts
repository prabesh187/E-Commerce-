import mongoose from 'mongoose';
import Review, { IReview } from '../models/Review.js';
import Order from '../models/Order.js';
import { productService } from './ProductService.js';

/**
 * Interface for review submission data
 */
export interface SubmitReviewData {
  productId: string;
  buyerId: string;
  rating: number;
  text?: string;
}

/**
 * Interface for review query result
 */
export interface ReviewQueryResult {
  reviews: IReview[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

/**
 * ReviewService handles product review operations
 */
export class ReviewService {
  /**
   * Verify that the buyer has purchased the product
   * @param buyerId - Buyer's user ID
   * @param productId - Product ID
   * @returns Order ID if purchase is verified
   * @throws Error if buyer hasn't purchased the product
   */
  private async verifyPurchase(
    buyerId: string,
    productId: string
  ): Promise<mongoose.Types.ObjectId> {
    // Find a delivered order containing this product for this buyer
    const order = await Order.findOne({
      buyerId,
      status: 'delivered',
      'items.productId': productId,
    });

    if (!order) {
      throw new Error(
        'You can only review products you have purchased and received'
      );
    }

    return order._id;
  }

  /**
   * Check if buyer has already reviewed this product
   * @param buyerId - Buyer's user ID
   * @param productId - Product ID
   * @returns true if review exists, false otherwise
   */
  private async preventDuplicateReview(
    buyerId: string,
    productId: string
  ): Promise<boolean> {
    const existingReview = await Review.findOne({
      buyerId,
      productId,
    });

    return existingReview !== null;
  }

  /**
   * Update product rating after review changes
   * Recalculates average rating and review count
   * @param productId - Product ID
   */
  private async updateProductRating(productId: string): Promise<void> {
    // Aggregate all reviews for this product
    const result = await Review.aggregate([
      {
        $match: { productId: new mongoose.Types.ObjectId(productId) },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (result.length > 0) {
      const { averageRating, reviewCount } = result[0];
      await productService.updateProductRating(
        productId,
        averageRating,
        reviewCount
      );
    } else {
      // No reviews, reset to defaults
      await productService.updateProductRating(productId, 0, 0);
    }
  }

  /**
   * Submit a new review for a product
   * @param reviewData - Review submission data
   * @returns Created review
   * @throws Error if validation fails or buyer hasn't purchased the product
   */
  async submitReview(reviewData: SubmitReviewData): Promise<IReview> {
    const { productId, buyerId, rating, text } = reviewData;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      throw new Error('Invalid buyer ID');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check for duplicate review
    const hasDuplicate = await this.preventDuplicateReview(buyerId, productId);
    if (hasDuplicate) {
      throw new Error('You have already reviewed this product');
    }

    // Verify purchase
    const orderId = await this.verifyPurchase(buyerId, productId);

    // Create review
    const review = new Review({
      productId,
      buyerId,
      orderId,
      rating,
      text: text?.trim() || undefined,
    });

    await review.save();

    // Update product rating
    await this.updateProductRating(productId);

    return review;
  }

  /**
   * Get all reviews for a product with pagination
   * @param productId - Product ID
   * @param page - Page number (1-indexed)
   * @param limit - Number of reviews per page
   * @returns Reviews with pagination info
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewQueryResult> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [reviews, totalCount] = await Promise.all([
      Review.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'firstName lastName email'),
      Review.countDocuments({ productId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      reviews,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }

  /**
   * Get a specific review by ID
   * @param reviewId - Review ID
   * @returns Review document
   * @throws Error if review not found
   */
  async getReviewById(reviewId: string): Promise<IReview> {
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw new Error('Invalid review ID');
    }

    const review = await Review.findById(reviewId)
      .populate('buyerId', 'firstName lastName email')
      .populate('productId', 'title images');

    if (!review) {
      throw new Error('Review not found');
    }

    return review;
  }

  /**
   * Check if a buyer can review a specific product
   * @param buyerId - Buyer's user ID
   * @param productId - Product ID
   * @returns Object with canReview flag and reason
   */
  async canReview(
    buyerId: string,
    productId: string
  ): Promise<{ canReview: boolean; reason?: string }> {
    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      return { canReview: false, reason: 'Invalid buyer ID' };
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return { canReview: false, reason: 'Invalid product ID' };
    }

    // Check for duplicate review
    const hasDuplicate = await this.preventDuplicateReview(buyerId, productId);
    if (hasDuplicate) {
      return { canReview: false, reason: 'You have already reviewed this product' };
    }

    // Check purchase
    try {
      await this.verifyPurchase(buyerId, productId);
      return { canReview: true };
    } catch (error) {
      return {
        canReview: false,
        reason: 'You can only review products you have purchased and received',
      };
    }
  }

  /**
   * Get all reviews by a specific buyer
   * @param buyerId - Buyer's user ID
   * @param page - Page number (1-indexed)
   * @param limit - Number of reviews per page
   * @returns Reviews with pagination info
   */
  async getBuyerReviews(
    buyerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ReviewQueryResult> {
    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      throw new Error('Invalid buyer ID');
    }

    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      Review.find({ buyerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'title images price'),
      Review.countDocuments({ buyerId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      reviews,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }
}

// Export singleton instance
export const reviewService = new ReviewService();
