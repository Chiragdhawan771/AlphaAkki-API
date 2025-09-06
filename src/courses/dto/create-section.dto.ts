import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ description: 'Section title', example: 'Introduction to React' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Section description', example: 'Learn the basics of React components' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Section order in the course', example: 1 })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ description: 'Whether section is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
