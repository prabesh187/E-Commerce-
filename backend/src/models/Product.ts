import mongoose, { Document, Schema } from 'mongoose';

// Interface for bilingual text fields
export interface IBilingualText {
  en: string;
  ne?: string;
}

// Interface for Product document
export interface IProduct extends Document {
  title: IBilingualText;
  description: IBilingualText;
  price: number;
  category: 'food' | 'handicrafts' | 'clothing' | 'electronics' | 'other';
  images: string[];
  inventory: number;
  sellerId: mongoose.Types.ObjectId;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationReason?: string;
  madeInNepalProof?: string;

  // Calculated fields
  averageRating: number;
  reviewCount: number;
  weightedRating: number;
  viewCount: number;
  purchaseCount: number;

  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Bilingual text subdocument schema
const BilingualTextSchema = new Schema<IBilingualText>(
  {
    en: {
      type: String,
      required: true,
    },
    ne: {
      type: String,
    },
  },
  { _id: false }
);

// Product schema
const ProductSchema = new Schema<IProduct>(
  {
    title: {
      type: BilingualTextSchema,
      required: true,
    },
    description: {
      type: BilingualTextSchema,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      enum: ['food', 'handicrafts', 'clothing', 'electronics', 'other'],
      required: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: 'At least one image is required',
      },
    },
    inventory: {
      type: Number,
      required: true,
      min: [0, 'Inventory cannot be negative'],
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verificationReason: {
      type: String,
    },
    madeInNepalProof: {
      type: String,
    },

    // Calculated fields
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    weightedRating: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search and performance
// Text index for search functionality
ProductSchema.index({ 'title.en': 'text', 'description.en': 'text' });

// Compound index for category filtering and weighted rating sorting
ProductSchema.index({ category: 1, weightedRating: -1 });

// Index for seller's products
ProductSchema.index({ sellerId: 1, createdAt: -1 });

// Index for admin verification queue
ProductSchema.index({ verificationStatus: 1 });

// Index for product ranking/sorting
ProductSchema.index({ weightedRating: -1 });

// Create and export the Product model
const Product = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
