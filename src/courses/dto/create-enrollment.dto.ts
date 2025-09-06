import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../schemas/enrollment.schema';

export class CreateEnrollmentDto {
  @ApiProperty({ description: 'Course ID to enroll in' })
  @IsString()
  @IsNotEmpty()
  course: string;

  @ApiPropertyOptional({ description: 'Amount paid for the course', example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({ description: 'Payment status', enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment gateway transaction ID' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Payment method used' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
