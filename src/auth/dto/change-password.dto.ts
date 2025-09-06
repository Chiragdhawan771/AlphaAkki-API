import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current user password',
    example: 'currentPassword123'
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newPassword456',
    minLength: 8
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
