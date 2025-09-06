import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FileType {
  THUMBNAIL = 'thumbnail',
  PREVIEW_VIDEO = 'preview_video',
  COURSE_RESOURCE = 'course_resource',
}

export class UploadFileDto {
  @ApiProperty({ enum: FileType, description: 'Type of file being uploaded' })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiPropertyOptional({ description: 'Additional metadata for the file' })
  @IsOptional()
  metadata?: string;
}

export class FileUploadResponseDto {
  @ApiProperty({ description: 'File key in S3' })
  key: string;

  @ApiProperty({ description: 'Public URL of the uploaded file' })
  url: string;

  @ApiProperty({ description: 'S3 bucket name' })
  bucket: string;

  @ApiProperty({ description: 'File type' })
  fileType: string;

  @ApiProperty({ description: 'Original filename' })
  originalName: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;
}
