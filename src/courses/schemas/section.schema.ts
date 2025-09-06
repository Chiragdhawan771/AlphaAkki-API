import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SectionDocument = Section & Document;

@Schema({ timestamps: true })
export class Section {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ default: 0 }) // Duration in minutes (sum of all lectures)
  duration: number;

  @Prop({ default: 0 })
  lectureCount: number;

  @Prop({ default: true })
  isActive: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const SectionSchema = SchemaFactory.createForClass(Section);

// Indexes for better performance
SectionSchema.index({ course: 1, order: 1 });
SectionSchema.index({ course: 1 });
