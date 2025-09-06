import { IsOptional, IsString, IsDateString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'Jane',
    required: false
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Smith',
    required: false
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'User date of birth',
    example: '1990-01-01',
    format: 'date',
    required: false
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User address',
    example: '123 Main St, New York, NY 10001',
    required: false
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'User profile picture URL',
    example: 'https://example.com/profile.jpg',
    format: 'url',
    required: false
  })
  @IsOptional()
  @IsUrl()
  profilePicture?: string;

  @ApiProperty({
    description: 'User bio/description',
    example: 'Software Developer passionate about technology',
    required: false
  })
  @IsOptional()
  @IsString()
  bio?: string;
}
