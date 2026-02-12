import mongoose from 'mongoose';
import Order, { IOrder, IOrderItem, IOrderShippingAddress } from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { emailService } from './EmailService.js';

/**
 * Interface for order creation data
 */
export interface CreateOrderData {
  buyerId: string;
  cartItems: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: IOrderShippingAddress;
  paymentMethod: 'esewa' | 'khalti' | 'cod';
  shippingCost?: number;
}

/**
 * Interface for order with populated details
 */
export interface OrderWithDetails {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  buyerId: {
    _id: mongoose.Types.ObjectId;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  items: IOrderItem[];
  shippingAddress: IOrderShippingAddress;
  paymentMethod: 'esewa' | 'khalti' | 'cod';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentTransactionId?: string;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

/**
 * OrderService handles order creation and management
 */
export class OrderService {
  /**
   * Generate unique tracking number in format: MN-YYYY-NNNNNN
   * @returns Tracking number string
   */
  async generateTrackingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    
    // Find the latest order for this year to get the next sequence number
    const latestOrder = await Order.findOne({
      orderNumber: new RegExp(`^MN-${year}-`),
    }).sort({ createdAt: -1 });

    let sequenceNumber = 1;
    
    if (latestOrder && latestOrder.orderNumber) {
      // Extract sequence number from last order
      const match = latestOrder.orderNumber.match(/MN-\d{4}-(\d{6})/);
      if (match && match[1]) {
        sequenceNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format sequence number with leading zeros (6 digits)
    const formattedSequence = sequenceNumber.toString().padStart(6, '0');
    
    return `MN-${year}-${formattedSequence}`;
  }

  /**
   * Validate cart items and check product availability
   * @param cartItems - Array of cart items to validate
   * @returns Validated order items with product details
   * @throws Error if validation fails
   */
  private async validateCartItems(
    cartItems: Array<{ productId: string; quantity: number }>
  ): Promise<IOrderItem[]> {
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    const orderItems: IOrderItem[] = [];

    for (const item of cartItems) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        throw new Error(`Invalid product ID: ${item.productId}`);
      }

      if (item.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      // Fetch product details
      const product = await Product.findById(item.productId);
      
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!product.isActive) {
        throw new Error(`Product is not available: ${product.title.en}`);
      }

      if (product.verificationStatus !== 'approved') {
        throw new Error(`Product is not approved: ${product.title.en}`);
      }

      if (product.inventory < item.quantity) {
        throw new Error(
          `Insufficient inventory for ${product.title.en}. Only ${product.inventory} available.`
        );
      }

      // Create order item with snapshot of product data
      orderItems.push({
        productId: product._id,
        title: product.title.en,
        price: product.price,
        quantity: item.quantity,
        sellerId: product.sellerId,
      });
    }

    return orderItems;
  }

  /**
   * Create a new order
   * @param orderData - Order creation data
   * @returns Created order
   * @throws Error if validation fails
   */
  async createOrder(orderData: CreateOrderData): Promise<IOrder> {
    const { buyerId, cartItems, shippingAddress, paymentMethod, shippingCost = 0 } = orderData;

    // Validate buyer ID
    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      throw new Error('Invalid buyer ID');
    }

    // Validate and prepare order items
    const orderItems = await this.validateCartItems(cartItems);

    // Calculate subtotal
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate total amount
    const totalAmount = subtotal + shippingCost;

    // Generate unique order number
    const orderNumber = await this.generateTrackingNumber();

    // Create order
    const order = new Order({
      orderNumber,
      buyerId: new mongoose.Types.ObjectId(buyerId),
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      subtotal,
      shippingCost,
      totalAmount,
      status: 'pending',
      trackingNumber: orderNumber, // Use order number as tracking number
    });

    await order.save();

    // Update product inventory
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { inventory: -item.quantity, purchaseCount: 1 },
      });
    }

    // Send email notifications
    try {
      // Get buyer information
      const buyer = await User.findById(buyerId);
      
      if (buyer && buyer.email) {
        // Check buyer's email preferences
        const shouldSendConfirmation = 
          !buyer.emailPreferences || 
          buyer.emailPreferences.orderConfirmation !== false;

        if (shouldSendConfirmation) {
          // Send order confirmation to buyer
          await emailService.sendOrderConfirmation({
            order,
            userEmail: buyer.email,
            userName: buyer.firstName || undefined,
          });
        }
      }

      // Send notifications to sellers
      // Group items by seller
      const itemsBySeller = new Map<string, IOrderItem[]>();
      for (const item of orderItems) {
        const sellerId = item.sellerId.toString();
        if (!itemsBySeller.has(sellerId)) {
          itemsBySeller.set(sellerId, []);
        }
        itemsBySeller.get(sellerId)!.push(item);
      }

      // Send email to each seller
      for (const [sellerId, sellerItems] of itemsBySeller) {
        const seller = await User.findById(sellerId);
        if (seller && seller.email) {
          // Create a partial order object with only this seller's items
          const sellerOrder = {
            ...order.toObject(),
            items: sellerItems,
          };

          await emailService.sendSellerNotification({
            order: sellerOrder as any,
            sellerEmail: seller.email,
            sellerName: seller.businessName || seller.firstName || undefined,
          });
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the order creation
      console.error('Failed to send order confirmation emails:', emailError);
    }

    return order;
  }

  /**
   * Get order by ID with authorization check
   * @param orderId - Order ID
   * @param userId - User ID making the request
   * @param userRole - Role of the user making the request
   * @returns Order document
   * @throws Error if order not found or unauthorized
   */
  async getOrderById(
    orderId: string,
    userId: string,
    userRole: 'buyer' | 'seller' | 'admin'
  ): Promise<IOrder> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const order = await Order.findById(orderId)
      .populate('buyerId', 'email firstName lastName')
      .populate('items.productId', 'title images')
      .populate('items.sellerId', 'businessName email');

    if (!order) {
      throw new Error('Order not found');
    }

    // Authorization check
    if (userRole === 'admin') {
      // Admin can view any order
      return order;
    } else if (userRole === 'buyer') {
      // Buyer can only view their own orders
      const buyerIdStr = typeof order.buyerId === 'object' && order.buyerId !== null && '_id' in order.buyerId
        ? (order.buyerId as any)._id.toString()
        : (order.buyerId as any).toString();
      
      if (buyerIdStr !== userId) {
        throw new Error('Unauthorized to view this order');
      }
    } else if (userRole === 'seller') {
      // Seller can only view orders containing their products
      const hasSellerProduct = order.items.some((item) => {
        // Handle both populated and non-populated sellerId
        if (typeof item.sellerId === 'object' && item.sellerId !== null) {
          // If populated, it has _id property
          const sellerIdObj = item.sellerId as any;
          return sellerIdObj._id ? sellerIdObj._id.toString() === userId : sellerIdObj.toString() === userId;
        }
        // If not populated, it's an ObjectId
        return (item.sellerId as any).toString() === userId;
      });
      if (!hasSellerProduct) {
        throw new Error('Unauthorized to view this order');
      }
    }

    return order;
  }

  /**
   * Get buyer's order history
   * @param buyerId - Buyer's user ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Orders and pagination info
   */
  async getUserOrders(
    buyerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ orders: IOrder[]; totalPages: number; currentPage: number }> {
    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      throw new Error('Invalid buyer ID');
    }

    const skip = (page - 1) * limit;

    const [orders, totalCount] = await Promise.all([
      Order.find({ buyerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'title images'),
      Order.countDocuments({ buyerId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders,
      totalPages,
      currentPage: page,
    };
  }

  /**
   * Get seller's orders (orders containing seller's products)
   * @param sellerId - Seller's user ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Orders and pagination info
   */
  async getSellerOrders(
    sellerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ orders: IOrder[]; totalPages: number; currentPage: number }> {
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      throw new Error('Invalid seller ID');
    }

    const skip = (page - 1) * limit;

    // Find orders that contain products from this seller
    const [orders, totalCount] = await Promise.all([
      Order.find({ 'items.sellerId': sellerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'email firstName lastName')
        .populate('items.productId', 'title images'),
      Order.countDocuments({ 'items.sellerId': sellerId }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      orders,
      totalPages,
      currentPage: page,
    };
  }

  /**
   * Update order status with timestamp tracking
   * @param orderId - Order ID
   * @param newStatus - New status to set
   * @param userId - User ID making the request
   * @param userRole - Role of the user making the request
   * @returns Updated order
   * @throws Error if order not found, unauthorized, or invalid status transition
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
    userId: string,
    userRole: 'buyer' | 'seller' | 'admin'
  ): Promise<IOrder> {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Authorization check
    if (userRole === 'buyer') {
      // Buyers can only cancel their own orders
      if (order.buyerId.toString() !== userId) {
        throw new Error('Unauthorized to update this order');
      }
      if (newStatus !== 'cancelled') {
        throw new Error('Buyers can only cancel orders');
      }
      if (order.status !== 'pending' && order.status !== 'confirmed') {
        throw new Error('Cannot cancel order in current status');
      }
    } else if (userRole === 'seller') {
      // Sellers can update orders containing their products
      const hasSellerProduct = order.items.some(
        (item) => item.sellerId.toString() === userId
      );
      if (!hasSellerProduct) {
        throw new Error('Unauthorized to update this order');
      }
    }
    // Admin can update any order

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${newStatus}`
      );
    }

    // Update status and timestamp
    order.status = newStatus;

    const now = new Date();
    switch (newStatus) {
      case 'confirmed':
        order.confirmedAt = now;
        break;
      case 'shipped':
        order.shippedAt = now;
        break;
      case 'delivered':
        order.deliveredAt = now;
        break;
      case 'cancelled':
        order.cancelledAt = now;
        // Restore inventory if order is cancelled
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { inventory: item.quantity, purchaseCount: -1 },
          });
        }
        break;
    }

    await order.save();

    // Send email notifications for status changes
    try {
      // Get buyer information
      const buyer = await User.findById(order.buyerId);
      
      if (buyer && buyer.email) {
        // Check buyer's email preferences
        const shouldSendStatusUpdate = 
          !buyer.emailPreferences || 
          buyer.emailPreferences.orderStatusUpdates !== false;

        if (shouldSendStatusUpdate) {
          // Send shipping notification when order is shipped
          if (newStatus === 'shipped') {
            await emailService.sendShippingNotification({
              order,
              userEmail: buyer.email,
              userName: buyer.firstName || undefined,
              trackingNumber: order.trackingNumber || order.orderNumber,
            });
          }

          // Send delivery confirmation when order is delivered
          if (newStatus === 'delivered') {
            await emailService.sendDeliveryConfirmation({
              order,
              userEmail: buyer.email,
              userName: buyer.firstName || undefined,
            });
          }
        }
      }
    } catch (emailError) {
      // Log email error but don't fail the status update
      console.error('Failed to send order status update email:', emailError);
    }

    return order;
  }
}

// Export singleton instance
export const orderService = new OrderService();
