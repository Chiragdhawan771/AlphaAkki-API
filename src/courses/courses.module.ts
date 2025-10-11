import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from './schemas/course.schema';
import { Lecture, LectureSchema } from './schemas/lecture.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { Progress, ProgressSchema } from './schemas/progress.schema';
import { SimplifiedCourse, SimplifiedCourseSchema } from './schemas/simplified-course.schema';
import {
  SimplifiedCourseVideoUploadSession,
  SimplifiedCourseVideoUploadSessionSchema,
} from './schemas/video-upload-session.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { CoursesService } from './courses.service';
import { CoursesController } from './controllers/courses.controller';
import { ReviewService } from './services/review.service';
import { ReviewController } from './controllers/review.controller';
import { SimplifiedCoursesService } from './services/simplified-courses.service';
import { SimplifiedCoursesController } from './controllers/simplified-courses.controller';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { EnrollmentsService } from './services/enrollments.service';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { LecturesService } from './services/lectures.service';
import { LecturesController } from './controllers/lectures.controller';
import { StreamingService } from './services/streaming.service';
import { StreamingController } from './controllers/streaming.controller';
import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Lecture.name, schema: LectureSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Progress.name, schema: ProgressSchema },
      { name: SimplifiedCourse.name, schema: SimplifiedCourseSchema },
      {
        name: SimplifiedCourseVideoUploadSession.name,
        schema: SimplifiedCourseVideoUploadSessionSchema,
      },
      { name: Review.name, schema: ReviewSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CommonModule,
    UsersModule,
  ],
  providers: [
    CoursesService,
    SimplifiedCoursesService,
    ReviewService,
    PaymentService,
    EnrollmentsService,
    LecturesService,
    StreamingService,
    ProgressService,
  ],
  controllers: [
    CoursesController,
    SimplifiedCoursesController,
    ReviewController,
    PaymentController,
    EnrollmentsController,
    LecturesController,
    StreamingController,
    ProgressController,
  ],
  exports: [
    CoursesService,
    SimplifiedCoursesService,
    ReviewService,
    PaymentService,
    EnrollmentsService,
    LecturesService,
    StreamingService,
    ProgressService,
  ],
})
export class CoursesModule {}
