import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LectureType, LectureStatus } from '../schemas/lecture.schema';

class LectureResourceDto {
  @ApiProperty({ description: 'Resource name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Resource URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Resource S3 key' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Resource file size in bytes' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'Resource MIME type' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

export class CreateLectureDto {
  @ApiProperty({ description: 'Lecture title', example: 'Introduction to Components' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Lecture description', example: 'Learn how to create React components' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Section ID this lecture belongs to' })
  @IsString()
  @IsNotEmpty()
  section: string;

  @ApiProperty({ description: 'Lecture type', enum: LectureType, default: LectureType.VIDEO })
  @IsEnum(LectureType)
  type: LectureType;

  @ApiProperty({ description: 'Lecture order in the section', example: 1 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ description: 'Lecture duration in minutes', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Video S3 key' })
  @IsOptional()
  @IsString()
  videoKey?: string;

  @ApiPropertyOptional({ description: 'Audio URL' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Audio S3 key' })
  @IsOptional()
  @IsString()
  audioKey?: string;

  @ApiPropertyOptional({ description: 'Text content (HTML)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'PDF URL' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'PDF S3 key' })
  @IsOptional()
  @IsString()
  pdfKey?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Lecture resources', type: [LectureResourceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LectureResourceDto)
  resources?: LectureResourceDto[];

  @ApiPropertyOptional({ description: 'Lecture status', enum: LectureStatus, default: LectureStatus.DRAFT })
  @IsOptional()
  @IsEnum(LectureStatus)
  status?: LectureStatus;

  @ApiPropertyOptional({ description: 'Whether lecture is free to preview', default: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Whether lecture is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Whether download is allowed', default: false })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional({ description: 'Default playback speed', default: 1.0 })
  @IsOptional()
  @IsNumber()
  playbackSpeed?: number;

  @ApiPropertyOptional({ description: 'Video transcript for accessibility' })
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiPropertyOptional({ description: 'Keywords for SEO', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
