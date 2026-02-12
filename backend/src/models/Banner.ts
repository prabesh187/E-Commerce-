import mongoose, { Document, Schema } from 'mongoose';

// Interface for bilingual text fields (reusing from Product model pattern)
export interface IBilingualText {
  en: string;
  ne?: string;
}

// Interface for Banner document
export interface IBanner extends Document {
  title: IBilingualText;
  image: string;
  link?: string;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
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

// Banner schema
const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: BilingualTextSchema,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// Compound index for fetching active banners in display order
BannerSchema.index({ active: 1, displayOrder: 1 });

// Create and export the Banner model
const Banner = mongoose.model<IBanner>('Banner', BannerSchema);

export default Banner;
