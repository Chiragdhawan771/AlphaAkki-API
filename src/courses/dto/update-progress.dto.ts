import { IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiPropertyOptional({ description: 'Progress percentage (0-100)', example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @ApiPropertyOptional({ description: 'Time spent on lecture in seconds', example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Last watched position in seconds', example: 150 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lastPosition?: number;

  @ApiPropertyOptional({ description: 'Whether lecture is completed', default: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
