import mongoose from 'mongoose';
import Order, { IOrder } from '../models/Order.js';
import Product, { IProduct } from '../models/Product.js';

/**
 * Interface for seller dashboard analytics
 */
export interface SellerDashboardAnalytics {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  popularProducts: Array<{
    productId: string;
    title: string;
    salesCount: number;
    revenue: number;
  }>;
  recentOrders: IOrder[];
}

/**
 * Interface for seller product filters
 */
export interface SellerProductFilters {
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Interface for seller order filters
 */
export interface SellerOrderFilters {
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  startDate?: Date;
  endDate?: Date;
}

/**
 * SellerService handles seller-specific operations
 */
export class SellerService {
  /**
   * Get seller dashboard with analytics
   * @param sellerId - Seller's user ID
   * @returns Dashboard analytics data
   */
  async getSellerDashboard(sellerId: string): Promise<SellerDashboardAnalytics> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    // Get all orders containing seller's products
    const orders = await Order.find({
      'items.sellerId': sellerId,
      status: { $ne: 'cancelled' },
    });

    // Calculate total sales and revenue
    let totalSales = 0;
    let totalRevenue = 0;
    const productSalesMap = new Map<string, { title: string; count: number; revenue: number }>();

    for (const order of orders) {
      // Filter items to only include this seller's products
      const sellerItems = order.items.filter(
        (item) => item.sellerId.toString() === sellerId
      );

      for (const item of sellerItems) {
        totalSales += item.quantity;
        totalRevenue += item.price * item.quantity;

        // Track product sales
        const productId = item.productId.toString();
        if (!productSalesMap.has(productId)) {
          productSalesMap.set(productId, {
            title: item.title,
            count: 0,
            revenue: 0,
          });
        }
        const productStats = productSalesMap.get(productId)!;
        productStats.count += item.quantity;
        productStats.revenue += item.price * item.quantity;
      }
    }

    // Get order counts by status
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const confirmedOrders = orders.filter((o) => o.status === 'confirmed').length;
    const shippedOrders = orders.filter((o) => o.status === 'shipped').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;

    // Get popular products (top 5 by sales count)
    const popularProducts = Array.from(productSalesMap.entries())
      .map(([productId, stats]) => ({
        productId,
        title: stats.title,
        salesCount: stats.count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    // Get recent orders (last 10)
    const recentOrders = await Order.find({
      'items.sellerId': sellerId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('buyerId', 'email firstName lastName')
      .populate('items.productId', 'title images');

    return {
      totalSales,
      totalRevenue,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      popularProducts,
      recentOrders,
    };
  }

  /**
   * Get seller's products with filtering
   * @param sellerId - Seller's user ID
   * @param filters - Filter criteria
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Products and pagination info
   */
  async getSellerProducts(
    sellerId: string,
    filters: SellerProductFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: IProduct[]; totalPages: number; currentPage: number; totalCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    // Build query
    const query: any = { sellerId };

    // Apply filters
    if (filters.verificationStatus) {
      query.verificationStatus = filters.verificationStatus;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.price = {};
      if (filters.minPrice !== undefined) {
        query.price.$gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        query.price.$lte = filters.maxPrice;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, totalCount] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      products,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }

  /**
   * Get seller's orders with status filtering
   * @param sellerId - Seller's user ID
   * @param filters - Filter criteria
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Orders and pagination info
   */
  async getSellerOrders(
    sellerId: string,
    filters: SellerOrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: IOrder[]; totalPages: number; currentPage: number; totalCount: number }> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    // Build query
    const query: any = { 'items.sellerId': sellerId };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply payment status filter
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'email firstName lastName')
        .populate('items.productId', 'title images'),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders,
      totalPages,
      currentPage: page,
      totalCount,
    };
  }

  /**
   * Calculate sales statistics for a seller
   * @param sellerId - Seller's user ID
   * @param startDate - Start date for statistics (optional)
   * @param endDate - End date for statistics (optional)
   * @returns Sales statistics
   */
  async getSalesStatistics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalOrders: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    // Build query
    const query: any = {
      'items.sellerId': sellerId,
      status: { $ne: 'cancelled' },
    };

    // Apply date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = startDate;
      }
      if (endDate) {
        query.createdAt.$lte = endDate;
      }
    }

    // Get orders
    const orders = await Order.find(query);

    // Calculate statistics
    let totalSales = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      // Filter items to only include this seller's products
      const sellerItems = order.items.filter(
        (item) => item.sellerId.toString() === sellerId
      );

      for (const item of sellerItems) {
        totalSales += item.quantity;
        totalRevenue += item.price * item.quantity;
      }
    }

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      totalOrders,
    };
  }
}

// Export singleton instance
export const sellerService = new SellerService();
