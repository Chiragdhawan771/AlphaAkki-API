import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CourseLevel, CourseType, CourseStatus } from '../schemas/course.schema';

export class QueryCourseDto {
  @ApiPropertyOptional({ description: 'Search query for title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CourseLevel, description: 'Filter by course level' })
  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @ApiPropertyOptional({ enum: CourseType, description: 'Filter by course type' })
  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @ApiPropertyOptional({ enum: CourseStatus, description: 'Filter by course status' })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by instructor ID' })
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional({ description: 'Filter by featured courses' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum rating filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'title', 'price', 'rating', 'enrollmentCount'] })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
