import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum CourseType {
  FREE = 'free',
  PAID = 'paid',
  PREMIUM = 'premium'
}

export class CreateCourseDto {
  @ApiProperty({ description: 'Title of the course' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the course' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Instructor ID' })
  @IsString()
  instructorId: string;

  @ApiProperty({ enum: CourseLevel, description: 'Difficulty level' })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiPropertyOptional({ description: 'Course price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ enum: CourseType, description: 'Course type' })
  @IsEnum(CourseType)
  type: CourseType;

  @ApiPropertyOptional({ description: 'Course categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Course tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Preview video URL' })
  @IsOptional()
  @IsString()
  previewVideoUrl?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;
}
