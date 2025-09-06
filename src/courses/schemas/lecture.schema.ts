import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LectureDocument = Lecture & Document;

export enum LectureType {
  VIDEO = 'video',
  TEXT = 'text',
  PDF = 'pdf',
  AUDIO = 'audio',
  QUIZ = 'quiz',
}

export enum LectureStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class Lecture {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: true })
  section: Types.ObjectId;

  @Prop({ enum: LectureType, default: LectureType.VIDEO })
  type: LectureType;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ default: 0 }) // Duration in minutes
  duration: number;

  // Video/Audio content
  @Prop()
  videoUrl: string;

  @Prop()
  videoKey: string; // S3 key for video file

  @Prop()
  audioUrl: string;

  @Prop()
  audioKey: string; // S3 key for audio file

  // Text content
  @Prop()
  content: string; // HTML content for text lectures

  // PDF content
  @Prop()
  pdfUrl: string;

  @Prop()
  pdfKey: string; // S3 key for PDF file

  // Thumbnail/Preview
  @Prop()
  thumbnail: string;

  // Resources
  @Prop({ type: [{ name: String, url: String, key: String, size: Number, type: String }], default: [] })
  resources: Array<{
    name: string;
    url: string;
    key: string;
    size: number;
    type: string;
  }>;

  @Prop({ enum: LectureStatus, default: LectureStatus.DRAFT })
  status: LectureStatus;

  @Prop({ default: false })
  isFree: boolean; // Whether this lecture is free to preview

  @Prop({ default: true })
  isActive: boolean;

  // Video streaming settings
  @Prop({ default: false })
  allowDownload: boolean;

  @Prop({ default: 1.0 })
  playbackSpeed: number;

  // SEO and metadata
  @Prop()
  transcript: string; // Video transcript for accessibility

  @Prop({ type: [String], default: [] })
  keywords: string[];

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const LectureSchema = SchemaFactory.createForClass(Lecture);

// Indexes for better performance
LectureSchema.index({ course: 1, section: 1, order: 1 });
LectureSchema.index({ course: 1 });
LectureSchema.index({ section: 1 });
LectureSchema.index({ status: 1 });
LectureSchema.index({ type: 1 });
