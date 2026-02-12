import mongoose, { Document, Schema } from 'mongoose';

// Interface for Payment document
export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  gateway: 'esewa' | 'khalti';
  transactionId?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  gatewayResponse?: Record<string, any>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment schema
const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    gateway: {
      type: String,
      enum: ['esewa', 'khalti'],
      required: true,
    },
    transactionId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ gateway: 1, status: 1 });

// Create and export the Payment model
const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
