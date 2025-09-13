import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address to send reset link to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 6 })
  @IsNotEmpty()
  newPassword: string;
}
