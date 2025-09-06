import { IsNotEmpty, IsNumber, IsString, Min, Max, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewStatus } from '../schemas/review.schema';

export class CreateReviewDto {
  @ApiProperty({ description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Review comment', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}

export class UpdateReviewStatusDto {
  @ApiProperty({ description: 'Review status', enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @ApiProperty({ description: 'Rejection reason (required if rejecting)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
