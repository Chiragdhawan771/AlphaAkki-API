import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SimplifiedCourse', required: true })
  course: Types.ObjectId;

  @Prop({ default: Date.now })
  enrolledAt: Date;

  @Prop({ enum: Object.values(EnrollmentStatus), default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ default: 0 })
  progressPercentage: number;

  @Prop({ default: 0 })
  totalTimeSpent: number;

  @Prop()
  completedAt: Date;

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop()
  paymentId: string;

  @Prop({ default: [] })
  watchedVideos: string[]; // Array of video IDs that user has watched

  @Prop()
  lastAccessedAt: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

//# Indexes for better performance
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ user: 1 });
EnrollmentSchema.index({ course: 1 });
EnrollmentSchema.index({ status: 1 });
EnrollmentSchema.index({ enrolledAt: -1 });
