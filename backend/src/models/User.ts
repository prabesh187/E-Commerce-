import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Interface for shipping address subdocument
export interface IShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault: boolean;
}

// Interface for User document
export interface IUser extends Document {
  email?: string;
  phone?: string;
  password: string;
  role: 'buyer' | 'seller' | 'admin';
  firstName?: string;
  lastName?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  language: 'en' | 'ne';

  // Seller-specific fields
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessDocuments?: string[];

  // Buyer-specific fields
  shippingAddresses?: IShippingAddress[];

  // Email notification preferences
  emailPreferences?: {
    orderConfirmation: boolean;
    orderStatusUpdates: boolean;
    promotionalEmails: boolean;
  };

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Shipping address subdocument schema
const ShippingAddressSchema = new Schema<IShippingAddress>(
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// User schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      required: true,
      default: 'buyer',
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verificationReason: {
      type: String,
    },
    language: {
      type: String,
      enum: ['en', 'ne'],
      default: 'en',
    },

    // Seller-specific fields
    businessName: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },
    businessPhone: {
      type: String,
      trim: true,
    },
    businessDocuments: {
      type: [String],
      default: [],
    },

    // Buyer-specific fields
    shippingAddresses: {
      type: [ShippingAddressSchema],
      default: [],
    },

    // Email notification preferences
    emailPreferences: {
      type: {
        orderConfirmation: {
          type: Boolean,
          default: true,
        },
        orderStatusUpdates: {
          type: Boolean,
          default: true,
        },
        promotionalEmails: {
          type: Boolean,
          default: true,
        },
      },
      default: {
        orderConfirmation: true,
        orderStatusUpdates: true,
        promotionalEmails: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, verificationStatus: 1 });

// Custom validation to ensure at least email or phone is provided
UserSchema.pre('validate', function (this: IUser) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone number is required');
    this.invalidate('phone', 'Either email or phone number is required');
  }
});

// Pre-save hook to hash password
UserSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return;
  }

  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password for authentication
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);

export default User;
