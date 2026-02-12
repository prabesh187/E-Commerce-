import mongoose, { Document, Schema } from 'mongoose';

// Interface for shipping address in order
export interface IOrderShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
}

// Interface for order item
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  title: string;
  price: number;
  quantity: number;
  sellerId: mongoose.Types.ObjectId;
}

// Interface for Order document
export interface IOrder extends Document {
  orderNumber: string;
  buyerId: mongoose.Types.ObjectId;
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

// Shipping address subdocument schema
const OrderShippingAddressSchema = new Schema<IOrderShippingAddress>(
  {
    fullName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
    },
  },
  { _id: false }
);

// Order item subdocument schema
const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: true }
);

// Order schema
const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (v: IOrderItem[]) {
          return v && v.length > 0;
        },
        message: 'Order must contain at least one item',
      },
    },
    shippingAddress: {
      type: OrderShippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['esewa', 'khalti', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentTransactionId: {
      type: String,
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    trackingNumber: {
      type: String,
    },
    confirmedAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and querying
// Unique index for order number
OrderSchema.index({ orderNumber: 1 }, { unique: true });

// Index for buyer's orders (most recent first)
OrderSchema.index({ buyerId: 1, createdAt: -1 });

// Index for seller's orders (using items.sellerId)
OrderSchema.index({ 'items.sellerId': 1, createdAt: -1 });

// Index for order status filtering
OrderSchema.index({ status: 1 });

// Create and export the Order model
const Order = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
