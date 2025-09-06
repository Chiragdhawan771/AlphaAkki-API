import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './schemas/course.schema';
import { Section, SectionSchema } from './schemas/section.schema';
import { Lecture, LectureSchema } from './schemas/lecture.schema';
import { Enrollment, EnrollmentSchema } from './schemas/enrollment.schema';
import { Progress, ProgressSchema } from './schemas/progress.schema';
import { SectionsService } from './services/sections.service';
import { LecturesService } from './services/lectures.service';
import { EnrollmentsService } from './services/enrollments.service';
import { ProgressService } from './services/progress.service';
import { StreamingService } from './services/streaming.service';
import { SectionsController } from './controllers/sections.controller';
import { LecturesController } from './controllers/lectures.controller';
import { EnrollmentsController } from './controllers/enrollments.controller';
import { ProgressController } from './controllers/progress.controller';
import { StreamingController } from './controllers/streaming.controller';
import { AdminController } from './controllers/admin.controller';
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
    ]),
    CommonModule,
    UsersModule,
  ],
  providers: [
    CoursesService,
    SectionsService,
    LecturesService,
    EnrollmentsService,
    ProgressService,
    StreamingService,
  ],
  controllers: [
    CoursesController,
    SectionsController,
    LecturesController,
    EnrollmentsController,
    ProgressController,
    StreamingController,
    AdminController,
  ],
  exports: [
    CoursesService,
    SectionsService,
    LecturesService,
    EnrollmentsService,
    ProgressService,
    StreamingService,
  ],
})
export class CoursesModule {}
