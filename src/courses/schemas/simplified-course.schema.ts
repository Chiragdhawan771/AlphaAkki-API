import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SimplifiedCourseDocument = SimplifiedCourse & Document;

@Schema({ timestamps: true })
export class SimplifiedCourse {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ enum: ['free', 'paid'], default: 'paid' })
  type: string;

  @Prop({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  status: string;

  @Prop({ default: 0 })
  enrollmentCount: number;

  @Prop()
  thumbnail: string;

  @Prop({ default: [] })
  videos: {
    title: string;
    videoUrl: string;
    videoKey: string;
    duration: number;
    order: number;
    uploadedAt: Date;
  }[];
}

export const SimplifiedCourseSchema = SchemaFactory.createForClass(SimplifiedCourse);
