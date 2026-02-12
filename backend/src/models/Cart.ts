import mongoose, { Document, Schema } from 'mongoose';

// Interface for cart item
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  addedAt: Date;
}

// Interface for Cart document
export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

// Cart item subdocument schema
const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Cart schema
const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Indexes for performance
// Unique index for user's cart
CartSchema.index({ userId: 1 }, { unique: true });

// Create and export the Cart model
const Cart = mongoose.model<ICart>('Cart', CartSchema);

export default Cart;
