import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentOrderDto {
  @ApiProperty({ description: 'Course ID to purchase' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiPropertyOptional({ description: 'Coupon code for discount' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Razorpay order ID' })
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @ApiProperty({ description: 'Razorpay payment ID' })
  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @ApiProperty({ description: 'Razorpay signature' })
  @IsString()
  @IsNotEmpty()
  razorpay_signature: string;

  @ApiProperty({ description: 'Course ID being purchased' })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiPropertyOptional({ description: 'Refund amount in paise (if partial refund)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}
