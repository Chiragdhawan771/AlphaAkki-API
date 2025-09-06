import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SimplifiedCourse', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  comment: string;

  @Prop({ enum: Object.values(ReviewStatus), default: ReviewStatus.PENDING })
  status: ReviewStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop()
  approvedAt: Date;

  @Prop()
  rejectionReason: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Compound index to ensure one review per student per course
ReviewSchema.index({ student: 1, course: 1 }, { unique: true });
