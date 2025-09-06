import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProgressDocument = Progress & Document;

@Schema({ timestamps: true })
export class Progress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lecture', required: true })
  lecture: Types.ObjectId;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ default: 0 }) // Progress percentage for this specific lecture (0-100)
  progressPercentage: number;

  @Prop({ default: 0 }) // Time spent on this lecture in seconds
  timeSpent: number;

  @Prop({ default: 0 }) // Last watched position in seconds (for videos)
  lastPosition: number;

  @Prop()
  completedAt: Date;

  @Prop()
  lastAccessedAt: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);

// Indexes for better performance
ProgressSchema.index({ user: 1, course: 1, lecture: 1 }, { unique: true });
ProgressSchema.index({ user: 1, course: 1 });
ProgressSchema.index({ user: 1 });
ProgressSchema.index({ course: 1 });
ProgressSchema.index({ lecture: 1 });
