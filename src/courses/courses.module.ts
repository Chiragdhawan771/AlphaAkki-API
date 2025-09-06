import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from './schemas/course.schema';
import { Section, SectionSchema } from './schemas/section.schema';
import { Lecture, LectureSchema } from './schemas/lecture.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { Progress, ProgressSchema } from './schemas/progress.schema';
import { SimplifiedCourse, SimplifiedCourseSchema } from './schemas/simplified-course.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewService } from './services/review.service';
import { ReviewController } from './controllers/review.controller';
import { SimplifiedCoursesService } from './services/simplified-courses.service';
import { SimplifiedCoursesController } from './controllers/simplified-courses.controller';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lecture.name, schema: LectureSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Progress.name, schema: ProgressSchema },
      { name: SimplifiedCourse.name, schema: SimplifiedCourseSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
    CommonModule,
    UsersModule,
  ],
  providers: [
    SimplifiedCoursesService,
    ReviewService,
  ],
  controllers: [
    SimplifiedCoursesController,
    ReviewController,
  ],
  exports: [
    SimplifiedCoursesService,
    ReviewService,
  ],
})
export class CoursesModule {}
