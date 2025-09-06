import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CourseType {
  FREE = 'free',
  PAID = 'paid',
}

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  shortDescription: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ enum: CourseLevel, default: CourseLevel.BEGINNER })
  level: CourseLevel;

  @Prop({ default: 'English' })
  language: string;

  @Prop({ default: 0 }) // Duration in minutes
  duration: number;

  @Prop({ type: Number, default: 0 })
  price: number;

  @Prop({ enum: CourseType, default: CourseType.FREE })
  type: CourseType;

  @Prop()
  thumbnail: string;

  @Prop()
  previewVideo: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  enrollmentCount: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ type: [String], default: [] })
  whatYouWillLearn: string[];

  @Prop({ type: [String], default: [] })
  targetAudience: string[];

  @Prop()
  publishedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy: Types.ObjectId;

  @Prop()
  approvedAt: Date;

  // SEO fields
  @Prop()
  metaTitle: string;

  @Prop()
  metaDescription: string;

  @Prop({ type: [String], default: [] })
  metaKeywords: string[];

  @Prop()
  slug: string;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Indexes for better performance
CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ status: 1 });
CourseSchema.index({ categories: 1 });
CourseSchema.index({ tags: 1 });
CourseSchema.index({ level: 1 });
CourseSchema.index({ type: 1 });
CourseSchema.index({ slug: 1 }, { unique: true, sparse: true });
CourseSchema.index({ createdAt: -1 });
CourseSchema.index({ rating: -1 });
CourseSchema.index({ enrollmentCount: -1 });
