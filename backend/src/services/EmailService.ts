import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import type { IOrder } from '../models/Order.js';

/**
 * Email template data interfaces
 */
interface OrderConfirmationData {
  order: IOrder;
  userEmail: string;
  userName?: string;
}

interface ShippingNotificationData {
  order: IOrder;
  userEmail: string;
  userName?: string;
  trackingNumber: string;
}

interface DeliveryConfirmationData {
  order: IOrder;
  userEmail: string;
  userName?: string;
}

interface SellerNotificationData {
  order: IOrder;
  sellerEmail: string;
  sellerName?: string;
}

/**
 * EmailService handles all email notifications for the platform
 * Uses Nodemailer with SMTP transport
 */
export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  /**
   * Verify email transport connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email transport verification failed:', error);
      return false;
    }
  }

  /**
   * Send order confirmation email to buyer
   * @param data Order confirmation data
   */
  async sendOrderConfirmation(data: OrderConfirmationData): Promise<void> {
    const { order, userEmail, userName } = data;

    const subject = `Order Confirmation - ${order.orderNumber}`;
    const html = this.formatOrderConfirmationTemplate(order, userName);

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send shipping notification email with tracking number
   * @param data Shipping notification data
   */
  async sendShippingNotification(data: ShippingNotificationData): Promise<void> {
    const { order, userEmail, userName, trackingNumber } = data;

    const subject = `Your Order Has Been Shipped - ${order.orderNumber}`;
    const html = this.formatShippingNotificationTemplate(order, userName, trackingNumber);

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send delivery confirmation email
   * @param data Delivery confirmation data
   */
  async sendDeliveryConfirmation(data: DeliveryConfirmationData): Promise<void> {
    const { order, userEmail, userName } = data;

    const subject = `Order Delivered - ${order.orderNumber}`;
    const html = this.formatDeliveryConfirmationTemplate(order, userName);

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send notification to seller about new order
   * @param data Seller notification data
   */
  async sendSellerNotification(data: SellerNotificationData): Promise<void> {
    const { order, sellerEmail, sellerName } = data;

    const subject = `New Order Received - ${order.orderNumber}`;
    const html = this.formatSellerNotificationTemplate(order, sellerName);

    await this.sendEmail(sellerEmail, subject, html);
  }

  /**
   * Core email sending method
   * @param to Recipient email address
   * @param subject Email subject
   * @param html Email HTML content
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.smtp.from,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Email delivery failed');
    }
  }

  /**
   * Format order confirmation email template
   */
  private formatOrderConfirmationTemplate(order: IOrder, userName?: string): string {
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NPR ${item.price.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NPR ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Made in Nepal</h1>
          </div>
          
          <h2 style="color: #27ae60;">Order Confirmed!</h2>
          
          <p>Dear ${userName || 'Customer'},</p>
          
          <p>Thank you for your order! We're pleased to confirm that we've received your order and it's being processed.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
          </div>
          
          <h3>Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Subtotal:</strong> NPR ${order.subtotal.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Shipping:</strong> NPR ${order.shippingCost.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 1.2em; color: #27ae60;"><strong>Total:</strong> NPR ${order.totalAmount.toFixed(2)}</p>
          </div>
          
          <h3>Shipping Address</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;">${order.shippingAddress.fullName}</p>
            <p style="margin: 5px 0;">${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${order.shippingAddress.addressLine2}</p>` : ''}
            <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.district}</p>
            ${order.shippingAddress.postalCode ? `<p style="margin: 5px 0;">${order.shippingAddress.postalCode}</p>` : ''}
            <p style="margin: 5px 0;">Phone: ${order.shippingAddress.phone}</p>
          </div>
          
          <p>We'll send you another email when your order ships.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 0.9em;">
            <p>Thank you for supporting Made in Nepal products!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format shipping notification email template
   */
  private formatShippingNotificationTemplate(
    order: IOrder,
    userName?: string,
    trackingNumber?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Shipped</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Made in Nepal</h1>
          </div>
          
          <h2 style="color: #3498db;">Your Order Has Been Shipped!</h2>
          
          <p>Dear ${userName || 'Customer'},</p>
          
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h3 style="margin-top: 0;">Shipping Information</h3>
            <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            ${trackingNumber ? `<p style="margin: 5px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Shipped Date:</strong> ${new Date(order.shippedAt || Date.now()).toLocaleDateString()}</p>
          </div>
          
          <h3>Order Summary</h3>
          <p><strong>Total Items:</strong> ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
          <p><strong>Total Amount:</strong> NPR ${order.totalAmount.toFixed(2)}</p>
          
          <h3>Delivery Address</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;">${order.shippingAddress.fullName}</p>
            <p style="margin: 5px 0;">${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${order.shippingAddress.addressLine2}</p>` : ''}
            <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.district}</p>
            <p style="margin: 5px 0;">Phone: ${order.shippingAddress.phone}</p>
          </div>
          
          <p>Your order should arrive within 3-5 business days. We'll send you another email when it's delivered.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 0.9em;">
            <p>Thank you for supporting Made in Nepal products!</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format delivery confirmation email template
   */
  private formatDeliveryConfirmationTemplate(order: IOrder, userName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Delivered</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Made in Nepal</h1>
          </div>
          
          <h2 style="color: #27ae60;">Order Delivered Successfully!</h2>
          
          <p>Dear ${userName || 'Customer'},</p>
          
          <p>Your order has been delivered! We hope you're enjoying your Made in Nepal products.</p>
          
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <h3 style="margin-top: 0;">Delivery Confirmation</h3>
            <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Delivered Date:</strong> ${new Date(order.deliveredAt || Date.now()).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> NPR ${order.totalAmount.toFixed(2)}</p>
          </div>
          
          <h3>Order Summary</h3>
          <ul style="list-style: none; padding: 0;">
            ${order.items
              .map(
                (item) => `
              <li style="padding: 10px; background-color: #f8f9fa; margin: 5px 0; border-radius: 3px;">
                <strong>${item.title}</strong> - Quantity: ${item.quantity} - NPR ${(item.price * item.quantity).toFixed(2)}
              </li>
            `
              )
              .join('')}
          </ul>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0;">Share Your Experience</h3>
            <p style="margin: 5px 0;">We'd love to hear what you think! Please take a moment to review your purchase and help other customers make informed decisions.</p>
          </div>
          
          <p>If you have any issues with your order, please contact our support team within 7 days.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 0.9em;">
            <p>Thank you for supporting Made in Nepal products!</p>
            <p>We look forward to serving you again.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Format seller notification email template
   */
  private formatSellerNotificationTemplate(order: IOrder, sellerName?: string): string {
    // Filter items for this seller
    const sellerItems = order.items;

    const itemsHtml = sellerItems
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NPR ${item.price.toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">NPR ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const sellerTotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Made in Nepal</h1>
            <p style="margin: 5px 0; color: #7f8c8d;">Seller Dashboard</p>
          </div>
          
          <h2 style="color: #e67e22;">New Order Received!</h2>
          
          <p>Dear ${sellerName || 'Seller'},</p>
          
          <p>You have received a new order. Please prepare the items for shipment.</p>
          
          <div style="background-color: #fef5e7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e67e22;">
            <h3 style="margin-top: 0;">Order Information</h3>
            <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Payment Status:</strong> ${order.paymentStatus}</p>
          </div>
          
          <h3>Your Items in This Order</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin: 20px 0;">
            <p style="margin: 5px 0; font-size: 1.2em; color: #e67e22;"><strong>Your Total:</strong> NPR ${sellerTotal.toFixed(2)}</p>
          </div>
          
          <h3>Shipping Address</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>${order.shippingAddress.fullName}</strong></p>
            <p style="margin: 5px 0;">${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${order.shippingAddress.addressLine2}</p>` : ''}
            <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.district}</p>
            ${order.shippingAddress.postalCode ? `<p style="margin: 5px 0;">${order.shippingAddress.postalCode}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
          </div>
          
          <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #17a2b8;">
            <h3 style="margin-top: 0;">Next Steps</h3>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Prepare the items for shipment</li>
              <li>Update the order status in your seller dashboard</li>
              <li>Add tracking information when available</li>
            </ol>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #7f8c8d; font-size: 0.9em;">
            <p>Log in to your seller dashboard to manage this order.</p>
            <p>Thank you for being part of Made in Nepal!</p>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();

