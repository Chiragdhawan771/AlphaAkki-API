import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CourseStatus } from '../schemas/course.schema';

export class PublishCourseDto {
  @ApiProperty({ enum: CourseStatus, description: 'Course status to update', example: CourseStatus.PUBLISHED })
  @IsEnum(CourseStatus, { message: 'Status must be draft, published, or archived' })
  status: CourseStatus;
}
