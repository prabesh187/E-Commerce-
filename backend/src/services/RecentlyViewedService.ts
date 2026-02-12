import mongoose from 'mongoose';
import RecentlyViewed, { IRecentlyViewed } from '../models/RecentlyViewed.js';
import Product from '../models/Product.js';

/**
 * Interface for recently viewed with populated product details
 */
export interface RecentlyViewedWithDetails extends Omit<IRecentlyViewed, 'products'> {
  products: Array<{
    _id: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    viewedAt: Date;
    title: { en: string; ne?: string };
    price: number;
    images: string[];
    inventory: number;
    isActive: boolean;
    averageRating: number;
    reviewCount: number;
  }>;
}

/**
 * RecentlyViewedService handles recently viewed product tracking
 */
export class RecentlyViewedService {
  private readonly MAX_ITEMS = 20;

  /**
   * Track a product view with timestamp
   * @param userId - User's ID
   * @param productId - Product ID that was viewed
   * @returns Updated recently viewed list
   * @throws Error if user ID or product ID is invalid
   */
  async trackProductView(
    userId: string,
    productId: string
  ): Promise<IRecentlyViewed> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Get or create recently viewed list
    let recentlyViewed = await RecentlyViewed.findOne({ userId });
    if (!recentlyViewed) {
      recentlyViewed = new RecentlyViewed({
        userId,
        products: [],
      });
    }

    // Remove product if it already exists (to update timestamp)
    recentlyViewed.products = recentlyViewed.products.filter(
      (item) => item.productId.toString() !== productId
    );

    // Add product at the beginning with current timestamp
    recentlyViewed.products.unshift({
      productId: new mongoose.Types.ObjectId(productId),
      viewedAt: new Date(),
    });

    // Maintain size limit (max 20 items)
    await this.maintainSizeLimit(recentlyViewed);

    await recentlyViewed.save();

    return recentlyViewed;
  }

  /**
   * Get recently viewed products with chronological ordering (most recent first)
   * @param userId - User's ID
   * @returns Recently viewed list with populated product details
   * @throws Error if user ID is invalid
   */
  async getRecentlyViewed(userId: string): Promise<RecentlyViewedWithDetails> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    let recentlyViewed = await RecentlyViewed.findOne({ userId });

    // Create empty list if it doesn't exist
    if (!recentlyViewed) {
      recentlyViewed = new RecentlyViewed({
        userId,
        products: [],
      });
      await recentlyViewed.save();
    }

    // Populate product details
    const populatedRecentlyViewed = await RecentlyViewed.findById(
      recentlyViewed._id
    ).populate({
      path: 'products.productId',
      select: 'title price images inventory isActive averageRating reviewCount',
    });

    // Transform to match interface with chronological ordering
    // Products are already ordered by viewedAt (most recent first) due to unshift in trackProductView
    const result = {
      ...populatedRecentlyViewed!.toObject(),
      products: populatedRecentlyViewed!.products
        .filter((item: any) => item.productId) // Filter out products that no longer exist
        .map((item: any) => ({
          _id: item.productId._id,
          productId: item.productId._id,
          viewedAt: item.viewedAt,
          title: item.productId.title,
          price: item.productId.price,
          images: item.productId.images,
          inventory: item.productId.inventory,
          isActive: item.productId.isActive,
          averageRating: item.productId.averageRating,
          reviewCount: item.productId.reviewCount,
        })),
    } as unknown as RecentlyViewedWithDetails;

    return result;
  }

  /**
   * Maintain size limit of recently viewed list (max 20 items)
   * Removes oldest items when limit is exceeded
   * @param recentlyViewed - Recently viewed document to maintain
   */
  async maintainSizeLimit(recentlyViewed: IRecentlyViewed): Promise<void> {
    if (recentlyViewed.products.length > this.MAX_ITEMS) {
      // Keep only the most recent MAX_ITEMS items
      // Products are already ordered by viewedAt (most recent first)
      recentlyViewed.products = recentlyViewed.products.slice(0, this.MAX_ITEMS);
    }
  }
}

// Export singleton instance
export const recentlyViewedService = new RecentlyViewedService();
