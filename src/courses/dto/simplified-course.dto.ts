import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsEnum,
  IsArray,
  MaxLength,
  Max,
  ArrayNotEmpty,
  IsPositive,
  IsBoolean,
  IsMimeType,
  ValidateNested,
  ValidateIf,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSimplifiedCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Course description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Course price', minimum: 0 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Course type', enum: ['free', 'paid'] })
  @IsEnum(['free', 'paid'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Course thumbnail URL', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Course preview video URL', required: false })
  @IsString()
  @IsOptional()
  previewVideo?: string;

  @ApiProperty({ description: 'Short description for course preview', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @ApiProperty({ description: 'Learning outcomes', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @ApiProperty({ description: 'Prerequisites', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ description: 'Estimated duration in hours', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Course category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Course tags', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class AddVideoDto {
  @ApiProperty({ description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Video duration in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Auto detect duration from uploaded file', required: false, default: false })
  @IsOptional()
  autoDetectDuration?: boolean;
}

export class InitiateVideoUploadDto {
  @ApiProperty({ description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Original file name with extension' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ description: 'Total file size in bytes', maximum: 5368709120 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5 * 1024 * 1024 * 1024)
  fileSize: number;

  @ApiProperty({ description: 'MIME type of the file' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ description: 'Size of each part in bytes', minimum: 5242880 })
  @Type(() => Number)
  @IsNumber()
  @Min(5 * 1024 * 1024)
  partSize: number;

  @ApiProperty({ description: 'Total number of parts expected' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalParts: number;

  @ApiProperty({ description: 'Should duration be auto detected from file metadata', required: false, default: true })
  @IsOptional()
  @IsBoolean()
  autoDetectDuration?: boolean;

  @ApiProperty({ description: 'Provided duration in seconds (if auto detect disabled)', required: false })
  @ValidateIf((o) => !o.autoDetectDuration)
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  duration?: number;
}

export class PartNumberRequestDto {
  @ApiProperty({ description: 'Part numbers that require presigned URLs', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @Type(() => Number)
  partNumbers: number[];
}

export class RecordUploadedPartDto {
  @ApiProperty({ description: 'Uploaded part number (1-based index)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  partNumber: number;

  @ApiProperty({ description: 'ETag returned from S3 upload' })
  @IsString()
  @IsNotEmpty()
  eTag: string;

  @ApiProperty({ description: 'Size of the uploaded chunk in bytes', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  partSize?: number;
}

class CompleteUploadPartDto {
  @ApiProperty({ description: 'Uploaded part number' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  partNumber: number;

  @ApiProperty({ description: 'ETag returned from S3 upload' })
  @IsString()
  @IsNotEmpty()
  eTag: string;
}

export class CompleteVideoUploadDto {
  @ApiProperty({ description: 'List of parts and their ETags', type: [CompleteUploadPartDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CompleteUploadPartDto)
  parts: CompleteUploadPartDto[];

  @ApiProperty({ description: 'Detected or provided duration in seconds', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class UpdateSimplifiedCourseDto {
  @ApiProperty({ description: 'Course title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Course description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Course price', required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Course type', enum: ['free', 'paid'], required: false })
  @IsEnum(['free', 'paid'])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Course status', enum: ['draft', 'published', 'archived'], required: false })
  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Course thumbnail URL', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Course preview video URL', required: false })
  @IsString()
  @IsOptional()
  previewVideo?: string;

  @ApiProperty({ description: 'Short description for course preview', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @ApiProperty({ description: 'Learning outcomes', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @ApiProperty({ description: 'Prerequisites', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ description: 'Estimated duration in hours', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Course category', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Course tags', type: [String], required: false })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class EnrollCourseDto {
  @ApiProperty({ description: 'Payment method', required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ description: 'Payment ID', required: false })
  @IsString()
  @IsOptional()
  paymentId?: string;

  @ApiProperty({ description: 'Amount paid', required: false })
  @IsNumber()
  @IsOptional()
  amountPaid?: number;
}
