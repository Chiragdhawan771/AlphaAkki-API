import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SimplifiedCourseVideoUploadSessionDocument = SimplifiedCourseVideoUploadSession & Document;

export enum VideoUploadStatus {
  INITIATED = 'initiated',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
  FAILED = 'failed',
}

export interface UploadedPart {
  partNumber: number;
  eTag: string;
}

@Schema({ timestamps: true })
export class SimplifiedCourseVideoUploadSession {
  @Prop({ type: Types.ObjectId, ref: 'SimplifiedCourse', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ required: true })
  initiatorRole: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ type: Number, min: 0, default: null })
  existingVideoOrder?: number | null;

  @Prop({ required: true, min: 1 })
  fileSize: number;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  uploadId: string;

  @Prop({ required: true })
  s3Key: string;

  @Prop({ required: true, min: 5 * 1024 * 1024 })
  partSize: number;

  @Prop({ required: true, min: 1 })
  totalParts: number;

  @Prop({ type: [{ partNumber: Number, eTag: String }], default: [] })
  uploadedParts: UploadedPart[];

  @Prop({ enum: VideoUploadStatus, default: VideoUploadStatus.INITIATED })
  status: VideoUploadStatus;

  @Prop({ default: false })
  autoDetectDuration: boolean;

  @Prop({ type: Number, default: null })
  providedDuration: number | null;

  @Prop({ type: Number, default: null })
  resolvedDuration: number | null;

  @Prop({ type: String, default: null })
  errorMessage: string | null;

  @Prop({ type: Date, default: () => new Date(Date.now() + 1000 * 60 * 60 * 24) })
  expiresAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const SimplifiedCourseVideoUploadSessionSchema = SchemaFactory.createForClass(
  SimplifiedCourseVideoUploadSession,
);

SimplifiedCourseVideoUploadSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SimplifiedCourseVideoUploadSessionSchema.index({ course: 1, instructor: 1, status: 1 });
