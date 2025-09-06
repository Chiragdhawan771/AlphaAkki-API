import { IsNotEmpty, IsString, IsNumber, IsOptional, Min, IsEnum, IsArray, MaxLength } from 'class-validator';
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
