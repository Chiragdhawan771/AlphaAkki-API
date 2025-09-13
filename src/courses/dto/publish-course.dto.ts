import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export class PublishCourseDto {
  @ApiProperty({ enum: CourseStatus, description: 'New status for the course' })
  @IsEnum(CourseStatus)
  status: CourseStatus;
}
