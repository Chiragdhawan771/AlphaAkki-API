import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin', 'moderator'] })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '+1234567890', required: false })
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', required: false })
  profilePicture?: string;

  @ApiProperty({ example: 'Software Developer passionate about technology', required: false })
  bio?: string;

  @ApiProperty({ example: '1990-01-01T00:00:00.000Z', required: false })
  dateOfBirth?: Date;

  @ApiProperty({ example: '123 Main St, New York, NY 10001', required: false })
  address?: string;

  @ApiProperty({ example: false })
  isVerified: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', required: false })
  lastLogin?: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token'
  })
  access_token: string;
}

export class ProfileResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Password changed successfully' })
  message: string;
}
