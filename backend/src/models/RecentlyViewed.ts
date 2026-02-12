import mongoose, { Document, Schema } from 'mongoose';

// Interface for recently viewed product entry
export interface IRecentlyViewedProduct {
  productId: mongoose.Types.ObjectId;
  viewedAt: Date;
}

// Interface for RecentlyViewed document
export interface IRecentlyViewed extends Document {
  userId: mongoose.Types.ObjectId;
  products: IRecentlyViewedProduct[];
  updatedAt: Date;
}

// Recently viewed product subdocument schema
const RecentlyViewedProductSchema = new Schema<IRecentlyViewedProduct>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    viewedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

// RecentlyViewed schema
const RecentlyViewedSchema = new Schema<IRecentlyViewed>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: {
      type: [RecentlyViewedProductSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Indexes for performance
// Unique index for user's recently viewed list
RecentlyViewedSchema.index({ userId: 1 }, { unique: true });

// Create and export the RecentlyViewed model
const RecentlyViewed = mongoose.model<IRecentlyViewed>(
  'RecentlyViewed',
  RecentlyViewedSchema
);

export default RecentlyViewed;
