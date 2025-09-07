import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

export enum PaymentMethod {
  CARD = 'card',
  NETBANKING = 'netbanking',
  WALLET = 'wallet',
  UPI = 'upi',
  EMI = 'emi'
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SimplifiedCourse', required: true })
  course: Types.ObjectId;

  @Prop({ required: true })
  razorpayOrderId: string;

  @Prop()
  razorpayPaymentId: string;

  @Prop()
  razorpaySignature: string;

  @Prop({ required: true })
  amount: number; // Amount in paise (smallest currency unit)

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ enum: Object.values(PaymentStatus), default: PaymentStatus.CREATED })
  status: PaymentStatus;

  @Prop({ enum: Object.values(PaymentMethod) })
  method: PaymentMethod;

  @Prop()
  failureReason: string;

  @Prop({ type: Object })
  razorpayResponse: any; // Store complete Razorpay response for audit

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  authorizedAt: Date;

  @Prop()
  capturedAt: Date;

  @Prop()
  failedAt: Date;

  @Prop()
  refundedAt: Date;

  @Prop({ default: 0 })
  refundAmount: number;

  @Prop()
  refundId: string;

  @Prop({ type: Object })
  metadata: any; // Additional payment metadata
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes for better performance
PaymentSchema.index({ user: 1 });
PaymentSchema.index({ course: 1 });
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
PaymentSchema.index({ razorpayPaymentId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });
