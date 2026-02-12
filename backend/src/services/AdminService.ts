import mongoose from 'mongoose';
import User, { IUser } from '../models/User.js';
import Product, { IProduct } from '../models/Product.js';
import Order from '../models/Order.js';
import Banner, { IBanner, IBilingualText } from '../models/Banner.js';

/**
 * Interface for platform analytics
 */
export interface PlatformAnalytics {
  totalSales: number;
  totalRevenue: number;
  activeUsers: {
    buyers: number;
    sellers: number;
    total: number;
  };
  popularProducts: Array<{
    productId: string;
    title: string;
    salesCount: number;
    revenue: number;
    averageRating: number;
  }>;
  recentOrders: number;
  pendingSellers: number;
  pendingProducts: number;
}

/**
 * Interface for banner creation data
 */
export interface CreateBannerData {
  title: IBilingualText;
  image: string;
  link?: string;
  active?: boolean;
  displayOrder?: number;
}

/**
 * Interface for banner update data
 */
export interface UpdateBannerData {
  title?: IBilingualText;
  image?: string;
  link?: string;
  active?: boolean;
  displayOrder?: number;
}

/**
 * AdminService handles administrative operations
 */
export class AdminService {
  /**
   * Get pending sellers awaiting verification
   * @returns List of pending sellers
   */
  async getPendingSellers(): Promise<IUser[]> {
    const sellers = await User.find({
      role: 'seller',
      verificationStatus: 'pending',
    }).select('-password');

    return sellers;
  }

  /**
   * Verify seller with approval or rejection
   * @param sellerId - Seller's user ID
   * @param approved - Whether to approve or reject
   * @param reason - Reason for approval/rejection
   * @returns Updated seller
   */
  async verifySeller(
    sellerId: string,
    approved: boolean,
    reason?: string
  ): Promise<IUser> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    const seller = await User.findById(sellerId);

    if (!seller) {
      throw new Error('Seller not found');
    }

    if (seller.role !== 'seller') {
      throw new Error('User is not a seller');
    }

    seller.verificationStatus = approved ? 'approved' : 'rejected';
    seller.verificationReason = reason;

    await seller.save();

    return seller;
  }

  /**
   * Get pending products awaiting verification
   * @returns List of pending products
   */
  async getPendingProducts(): Promise<IProduct[]> {
    const products = await Product.find({
      verificationStatus: 'pending',
    }).populate('sellerId', 'businessName email');

    return products;
  }

  /**
   * Verify product with approval or rejection
   * @param productId - Product ID
   * @param approved - Whether to approve or reject
   * @param reason - Reason for approval/rejection
   * @returns Updated product
   */
  async verifyProduct(
    productId: string,
    approved: boolean,
    reason?: string
  ): Promise<IProduct> {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(productId);

    if (!product) {
      throw new Error('Product not found');
    }

    product.verificationStatus = approved ? 'approved' : 'rejected';
    product.verificationReason = reason;

    await product.save();

    return product;
  }

  /**
   * Get platform-wide analytics
   * @returns Platform analytics data
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    // Get all completed orders (not cancelled)
    const orders = await Order.find({
      status: { $ne: 'cancelled' },
    });

    // Calculate total sales and revenue
    let totalSales = 0;
    let totalRevenue = 0;
    const productSalesMap = new Map<
      string,
      { title: string; count: number; revenue: number; rating: number }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        totalSales += item.quantity;
        totalRevenue += item.price * item.quantity;

        // Track product sales
        const productId = item.productId.toString();
        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            title: item.title,
            count: 0,
            revenue: 0,
            rating: 0,
          });
        }
        const productStats = productSalesMap.get(productId)!;
        productStats.count += item.quantity;
        productStats.revenue += item.price * item.quantity;
      }
    }

    // Get product ratings for popular products
    const productIds = Array.from(productSalesMap.keys());
    const products = await Product.find({
      _id: { $in: productIds },
    }).select('_id averageRating');

    const productRatingsMap = new Map<string, number>();
    for (const product of products) {
      productRatingsMap.set(product._id.toString(), product.averageRating);
    }

    // Get popular products (top 10 by sales count)
    const popularProducts = Array.from(productSalesMap.entries())
      .map(([productId, stats]) => ({
        productId,
        title: stats.title,
        salesCount: stats.count,
        revenue: stats.revenue,
        averageRating: productRatingsMap.get(productId) || 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 10);

    // Get active users count
    const [buyersCount, sellersCount] = await Promise.all([
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'seller', verificationStatus: 'approved' }),
    ]);

    // Get recent orders count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Get pending counts
    const [pendingSellers, pendingProducts] = await Promise.all([
      User.countDocuments({ role: 'seller', verificationStatus: 'pending' }),
      Product.countDocuments({ verificationStatus: 'pending' }),
    ]);

    return {
      totalSales,
      totalRevenue,
      activeUsers: {
        buyers: buyersCount,
        sellers: sellersCount,
        total: buyersCount + sellersCount,
      },
      popularProducts,
      recentOrders,
      pendingSellers,
      pendingProducts,
    };
  }

  /**
   * Create a new banner
   * @param bannerData - Banner creation data
   * @returns Created banner
   */
  async createBanner(bannerData: CreateBannerData): Promise<IBanner> {
    // Validate required fields
    if (!bannerData.title?.en) {
      throw new Error('Banner title (English) is required');
    }

    if (!bannerData.image) {
      throw new Error('Banner image is required');
    }

    // If displayOrder is not provided, set it to the next available order
    if (bannerData.displayOrder === undefined) {
      const maxOrderBanner = await Banner.findOne().sort({ displayOrder: -1 });
      bannerData.displayOrder = maxOrderBanner ? maxOrderBanner.displayOrder + 1 : 0;
    }

    const banner = new Banner(bannerData);
    await banner.save();

    return banner;
  }

  /**
   * Update an existing banner
   * @param bannerId - Banner ID
   * @param updateData - Banner update data
   * @returns Updated banner
   */
  async updateBanner(
    bannerId: string,
    updateData: UpdateBannerData
  ): Promise<IBanner> {
    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      throw new Error('Invalid banner ID');
    }

    const banner = await Banner.findById(bannerId);

    if (!banner) {
      throw new Error('Banner not found');
    }

    // Update fields if provided
    if (updateData.title) {
      banner.title = updateData.title;
    }

    if (updateData.image) {
      banner.image = updateData.image;
    }

    if (updateData.link !== undefined) {
      banner.link = updateData.link;
    }

    if (updateData.active !== undefined) {
      banner.active = updateData.active;
    }

    if (updateData.displayOrder !== undefined) {
      banner.displayOrder = updateData.displayOrder;
    }

    await banner.save();

    return banner;
  }

  /**
   * Delete a banner
   * @param bannerId - Banner ID
   * @returns Success message
   */
  async deleteBanner(bannerId: string): Promise<{ message: string }> {
    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      throw new Error('Invalid banner ID');
    }

    const banner = await Banner.findById(bannerId);

    if (!banner) {
      throw new Error('Banner not found');
    }

    await Banner.deleteOne({ _id: bannerId });

    return { message: 'Banner deleted successfully' };
  }

  /**
   * Reorder banners by updating display order
   * @param bannerOrders - Array of banner IDs in desired order
   * @returns Updated banners
   */
  async reorderBanners(bannerOrders: string[]): Promise<IBanner[]> {
    // Validate all banner IDs
    for (const bannerId of bannerOrders) {
      if (!mongoose.Types.ObjectId.isValid(bannerId)) {
        throw new Error(`Invalid banner ID: ${bannerId}`);
      }
    }

    // Update display order for each banner
    const updatePromises = bannerOrders.map((bannerId, index) =>
      Banner.findByIdAndUpdate(
        bannerId,
        { displayOrder: index },
        { new: true }
      )
    );

    const updatedBanners = await Promise.all(updatePromises);

    // Check if any banner was not found
    if (updatedBanners.some((banner) => banner === null)) {
      throw new Error('One or more banners not found');
    }

    return updatedBanners as IBanner[];
  }

  /**
   * Get all banners (for admin management)
   * @returns List of all banners
   */
  async getAllBanners(): Promise<IBanner[]> {
    const banners = await Banner.find().sort({ displayOrder: 1 });
    return banners;
  }

  /**
   * Get active banners (for public display)
   * @returns List of active banners
   */
  async getActiveBanners(): Promise<IBanner[]> {
    const banners = await Banner.find({ active: true }).sort({ displayOrder: 1 });
    return banners;
  }
}

// Export singleton instance
export const adminService = new AdminService();
