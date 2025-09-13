import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Enrollment,
  EnrollmentDocument,
  EnrollmentStatus,
} from '../schemas/enrollment.schema';
import {
  SimplifiedCourse,
  SimplifiedCourseDocument,
} from '../schemas/simplified-course.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { CreateEnrollmentDto } from '../dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name)
    private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(SimplifiedCourse.name)
    private courseModel: Model<SimplifiedCourseDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async enroll(
    userId: string,
    createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    if (!Types.ObjectId.isValid(createEnrollmentDto.course)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Check if course exists
    const course = await this.courseModel.findById(createEnrollmentDto.course);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: createEnrollmentDto.course,
    });

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Create enrollment
    const enrollmentData = {
      ...createEnrollmentDto,
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(createEnrollmentDto.course),
      enrolledAt: new Date(),
    };

    const enrollment = new this.enrollmentModel(enrollmentData);
    const savedEnrollment = await enrollment.save();

    // Update course enrollment count
    await this.courseModel.findByIdAndUpdate(createEnrollmentDto.course, {
      $inc: { enrollmentCount: 1 },
    });

    return savedEnrollment;
  }

  async getUserEnrollments(
    userId: string,
    status?: EnrollmentStatus,
  ): Promise<Enrollment[]> {
    const filter: any = { user: userId };
    if (status) {
      filter.status = status;
    }

    return this.enrollmentModel
      .find(filter)
      .populate(
        'course',
        'title thumbnail instructor level duration price type',
      )
      .populate('course.instructor', 'firstName lastName profilePicture')
      .sort({ enrolledAt: -1 })
      .exec();
  }

  async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.enrollmentModel
      .find({ course: courseId })
      .populate('user', 'firstName lastName email profilePicture')
      .sort({ enrolledAt: -1 })
      .exec();
  }

  async getEnrollment(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.enrollmentModel
      .findOne({ user: userId, course: courseId })
      .populate('course', 'title thumbnail instructor')
      .exec() as Promise<Enrollment | null>;
  }

  async updateEnrollmentStatus(
    enrollmentId: string,
    status: EnrollmentStatus,
    userId: string,
    userRole: string,
  ): Promise<Enrollment>;
  async updateEnrollmentStatus(
    userId: string,
    courseId: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment>;
  async updateEnrollmentStatus(
    enrollmentIdOrUserId: string,
    statusOrCourseId: EnrollmentStatus | string,
    userIdOrStatus?: string | EnrollmentStatus,
    userRole?: string,
  ): Promise<Enrollment> {
    // Handle overloaded method signatures
    if (userRole !== undefined) {
      // Original signature: (enrollmentId, status, userId, userRole)
      const enrollmentId = enrollmentIdOrUserId;
      const status = statusOrCourseId as EnrollmentStatus;
      const userId = userIdOrStatus as string;

      if (!Types.ObjectId.isValid(enrollmentId)) {
        throw new BadRequestException('Invalid enrollment ID');
      }

      const enrollment = await this.enrollmentModel.findById(enrollmentId);
      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      // Only admin or the enrolled user can update status
      if (userRole !== 'admin' && enrollment.user.toString() !== userId) {
        throw new BadRequestException(
          'You can only update your own enrollment status',
        );
      }

      const updateData: any = { status };

      // Set completion date if marking as completed
      if (
        status === EnrollmentStatus.COMPLETED &&
        enrollment.status !== EnrollmentStatus.COMPLETED
      ) {
        updateData.completedAt = new Date();
      }

      const updatedEnrollment = await this.enrollmentModel
        .findByIdAndUpdate(enrollmentId, updateData, { new: true })
        .populate('course', 'title thumbnail')
        .exec();

      if (!updatedEnrollment) {
        throw new NotFoundException('Enrollment not found after update');
      }

      return updatedEnrollment;
    } else {
      // New signature: (userId, courseId, status)
      const userId = enrollmentIdOrUserId;
      const courseId = statusOrCourseId as string;
      const status = userIdOrStatus as EnrollmentStatus;

      if (!Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException('Invalid course ID');
      }

      const enrollment = await this.enrollmentModel.findOne({
        user: userId,
        course: courseId,
      });

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      const updateData: any = { status };

      // Set completion date if marking as completed
      if (
        status === EnrollmentStatus.COMPLETED &&
        enrollment.status !== EnrollmentStatus.COMPLETED
      ) {
        updateData.completedAt = new Date();
      }

      const updatedEnrollment = await this.enrollmentModel
        .findByIdAndUpdate(enrollment._id, updateData, { new: true })
        .populate('course', 'title thumbnail')
        .exec();

      if (!updatedEnrollment) {
        throw new NotFoundException('Enrollment not found after update');
      }

      return updatedEnrollment;
    }
  }

  async updateProgress(
    userId: string,
    courseId: string,
    progressData: any,
  ): Promise<Enrollment> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    const enrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: courseId,
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateData: any = {
      progressPercentage: progressData.progressPercentage,
      lastAccessedAt: new Date(),
    };

    if (progressData.lectureId) {
      updateData.lastAccessedLecture = progressData.lectureId;
    }

    if (progressData.timeSpent) {
      updateData.totalTimeSpent =
        enrollment.totalTimeSpent + progressData.timeSpent;
    }

    if (progressData.completedLecture) {
      updateData.$addToSet = {
        completedLectures: progressData.completedLecture,
      };
    }

    // Mark as completed if progress is 100%
    if (
      progressData.progressPercentage >= 100 &&
      enrollment.status !== EnrollmentStatus.COMPLETED
    ) {
      updateData.status = EnrollmentStatus.COMPLETED;
      updateData.completedAt = new Date();
    }

    const updatedEnrollment = (await this.enrollmentModel
      .findByIdAndUpdate(enrollment._id, updateData, { new: true })
      .exec()) as Enrollment;

    return updatedEnrollment;
  }

  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(courseId)) {
      return false;
    }

    const enrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: courseId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    });

    return !!enrollment;
  }

  async getEnrollmentStats(courseId: string): Promise<any> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    const stats = await this.enrollmentModel.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progressPercentage' },
        },
      },
    ]);

    const totalEnrollments = await this.enrollmentModel.countDocuments({
      course: courseId,
    });
    const completionRate =
      stats.find((s) => s._id === EnrollmentStatus.COMPLETED)?.count || 0;

    return {
      totalEnrollments,
      completionRate:
        totalEnrollments > 0 ? (completionRate / totalEnrollments) * 100 : 0,
      statusBreakdown: stats,
    };
  }

  async getUserDashboard(userId: string): Promise<any> {
    const enrollments = await this.enrollmentModel
      .find({
        user: userId,
        status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      })
      .populate({
        path: 'course',
        select:
          'title thumbnail instructor level estimatedDuration price type description previewVideo',
        populate: {
          path: 'instructor',
          select: 'firstName lastName',
        },
      })
      .sort({ lastAccessedAt: -1 })
      .exec();

    const inProgress = enrollments.filter(
      (e) => e.status === EnrollmentStatus.ACTIVE,
    );
    const completed = enrollments.filter(
      (e) => e.status === EnrollmentStatus.COMPLETED,
    );

    const totalTimeSpent = enrollments.reduce(
      (sum, e) => sum + (e.totalTimeSpent || 0),
      0,
    );
    const avgProgress =
      enrollments.length > 0
        ? enrollments.reduce(
            (sum, e) => sum + (e.progressPercentage || e.progress || 0),
            0,
          ) / enrollments.length
        : 0;

    // Calculate certificates (completed courses)
    const certificates = completed.length;

    return {
      totalCourses: enrollments.length,
      inProgress: inProgress.length,
      completed: completed.length,
      certificates,
      totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
      avgProgress: Math.round(avgProgress),
      enrollments: enrollments.map((enrollment) => ({
        id: enrollment._id,
        course: enrollment.course,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        progressPercentage:
          enrollment.progressPercentage || enrollment.progress || 0,
        totalTimeSpent: enrollment.totalTimeSpent || 0,
        lastAccessedAt: enrollment.lastAccessedAt || enrollment.enrolledAt,
      })),
      recentCourses: enrollments.slice(0, 5),
    };
  }
}
