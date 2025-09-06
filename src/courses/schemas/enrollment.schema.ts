import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Prop({ default: Date.now })
  enrolledAt: Date;

  @Prop()
  completedAt: Date;

  // Payment information
  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  paymentStatus: PaymentStatus;

  @Prop()
  paymentId: string; // Payment gateway transaction ID

  @Prop()
  paymentMethod: string;

  // Progress tracking
  @Prop({ default: 0 })
  progressPercentage: number;

  @Prop({ type: [Types.ObjectId], ref: 'Lecture', default: [] })
  completedLectures: Types.ObjectId[];

  @Prop()
  lastAccessedLecture: Types.ObjectId;

  @Prop()
  lastAccessedAt: Date;

  @Prop({ default: 0 }) // Total time spent in minutes
  totalTimeSpent: number;

  // Certificate
  @Prop()
  certificateUrl: string;

  @Prop()
  certificateIssuedAt: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Indexes for better performance
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ user: 1 });
EnrollmentSchema.index({ course: 1 });
EnrollmentSchema.index({ status: 1 });
EnrollmentSchema.index({ enrolledAt: -1 });
