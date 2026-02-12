import mongoose, { Document, Schema } from 'mongoose';

// Interface for Wishlist document
export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  products: mongoose.Types.ObjectId[];
  updatedAt: Date;
}

// Wishlist schema
const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: {
      type: [Schema.Types.ObjectId],
      ref: 'Product',
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Indexes for performance
// Unique index for user's wishlist
WishlistSchema.index({ userId: 1 }, { unique: true });

// Create and export the Wishlist model
const Wishlist = mongoose.model<IWishlist>('Wishlist', WishlistSchema);

export default Wishlist;
