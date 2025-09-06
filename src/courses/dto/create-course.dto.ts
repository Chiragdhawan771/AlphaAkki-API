import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, CourseType } from '../schemas/course.schema';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title', example: 'Complete Web Development Bootcamp' })
  @IsString()
  @MinLength(5, { message: 'Title must be at least 5 characters long' })
  @MaxLength(100, { message: 'Title must not exceed 100 characters' })
  title: string;

  @ApiProperty({ description: 'Course description', example: 'Learn full-stack web development from scratch' })
  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters long' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description: string;

  @ApiPropertyOptional({ description: 'Short description for course cards', example: 'Learn web development basics' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Short description must not exceed 200 characters' })
  shortDescription?: string;

  @ApiPropertyOptional({ enum: CourseLevel, description: 'Course difficulty level', example: CourseLevel.BEGINNER })
  @IsOptional()
  @IsEnum(CourseLevel, { message: 'Level must be beginner, intermediate, or advanced' })
  level?: CourseLevel;

  @ApiPropertyOptional({ description: 'Course language', example: 'English', default: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Course duration in minutes', example: 1200 })
  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(0, { message: 'Duration must be positive' })
  duration?: number;

  @ApiPropertyOptional({ description: 'Course price', example: 99.99 })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be positive' })
  price?: number;

  @ApiPropertyOptional({ enum: CourseType, description: 'Course type', example: CourseType.PAID })
  @IsOptional()
  @IsEnum(CourseType, { message: 'Type must be free or paid' })
  type?: CourseType;

  @ApiPropertyOptional({ description: 'Course thumbnail URL', example: 'https://example.com/thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Course preview video URL', example: 'https://example.com/preview.mp4' })
  @IsOptional()
  @IsString()
  previewVideo?: string;

  @ApiPropertyOptional({ description: 'Course categories', example: ['Web Development', 'Programming'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Course tags', example: ['javascript', 'react', 'nodejs'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is course featured', example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Course requirements', example: ['Basic computer knowledge', 'Internet connection'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @ApiPropertyOptional({ description: 'What students will learn', example: ['HTML & CSS', 'JavaScript fundamentals'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whatYouWillLearn?: string[];

  @ApiPropertyOptional({ description: 'Target audience', example: ['Beginners', 'Career changers'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAudience?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Meta title must not exceed 60 characters' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Meta description must not exceed 160 characters' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'SEO keywords', example: ['web development', 'programming'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];
}
