import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LectureType {
  VIDEO = 'video',
  TEXT = 'text',
  PDF = 'pdf',
  AUDIO = 'audio',
  QUIZ = 'quiz'
}

export class CreateLectureDto {
  @ApiProperty({ description: 'Title of the lecture' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the lecture' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: LectureType, description: 'Type of lecture content' })
  @IsEnum(LectureType)
  type: LectureType;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Video URL for video lectures' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Text content for text lectures' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'PDF URL for PDF lectures' })
  @IsOptional()
  @IsString()
  pdfUrl?: string;

  @ApiPropertyOptional({ description: 'Audio URL for audio lectures' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Array of resource URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];

  @ApiProperty({ description: 'Section ID this lecture belongs to' })
  @IsString()
  sectionId: string;

  @ApiPropertyOptional({ description: 'Order within the section' })
  @IsOptional()
  @IsNumber()
  order?: number;
}
