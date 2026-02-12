import mongoose, { Document, Schema } from 'mongoose';

// Interface for Review document
export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rating: number;
  text?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Review schema
const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    text: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and querying
// Index for fetching reviews by product (most recent first)
ReviewSchema.index({ productId: 1, createdAt: -1 });

// Unique compound index to ensure one review per buyer per product
ReviewSchema.index({ buyerId: 1, productId: 1 }, { unique: true });

// Create and export the Review model
const Review = mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
