import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Progress, ProgressDocument } from '../schemas/progress.schema';
import { Enrollment, EnrollmentDocument } from '../schemas/enrollment.schema';
import { Lecture, LectureDocument } from '../schemas/lecture.schema';
import { UpdateProgressDto } from '../dto';
import { EnrollmentsService } from './enrollments.service';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Lecture.name) private lectureModel: Model<LectureDocument>,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async updateProgress(userId: string, courseId: string, lectureId: string, updateProgressDto: UpdateProgressDto): Promise<Progress> {
    if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid course or lecture ID');
    }

    // Verify user is enrolled in the course
    const isEnrolled = await this.enrollmentsService.isUserEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    // Verify lecture exists and belongs to the course
    const lecture = await this.lectureModel.findOne({ _id: lectureId, course: courseId });
    if (!lecture) {
      throw new NotFoundException('Lecture not found in this course');
    }

    const progressData = {
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId),
      lecture: new Types.ObjectId(lectureId),
      ...updateProgressDto,
      lastAccessedAt: new Date(),
    };

    // Mark as completed if progress is 100%
    if (updateProgressDto.progressPercentage !== undefined && updateProgressDto.progressPercentage >= 100) {
      progressData.isCompleted = true;
      progressData['completedAt'] = new Date();
    }

    const progress = await this.progressModel.findOneAndUpdate(
      { user: userId, course: courseId, lecture: lectureId },
      progressData,
      { upsert: true, new: true }
    );

    // Update overall course progress
    await this.updateCourseProgress(userId, courseId);

    return progress;
  }

  async getUserProgress(userId: string, courseId: string): Promise<Progress[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.progressModel
      .find({ user: userId, course: courseId })
      .populate('lecture', 'title duration type order')
      .sort({ 'lecture.order': 1 })
      .exec();
  }

  async getLectureProgress(userId: string, lectureId: string): Promise<Progress | null> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    return this.progressModel
      .findOne({ user: userId, lecture: lectureId })
      .populate('lecture', 'title duration type')
      .exec();
  }

  async getCourseProgressSummary(userId: string, courseId: string): Promise<any> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Get all lectures in the course
    const totalLectures = await this.lectureModel.countDocuments({ course: courseId, isActive: true });
    
    // Get user's progress
    const userProgress = await this.progressModel.find({ user: userId, course: courseId });
    const completedLectures = userProgress.filter(p => p.isCompleted).length;
    
    const totalTimeSpent = userProgress.reduce((sum, p) => sum + p.timeSpent, 0);
    const avgProgressPercentage = userProgress.length > 0 
      ? userProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / userProgress.length 
      : 0;

    const overallProgress = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;

    return {
      totalLectures,
      completedLectures,
      overallProgress,
      avgProgressPercentage,
      totalTimeSpent,
      lastAccessedAt: userProgress.length > 0 
        ? Math.max(...userProgress.map(p => p.lastAccessedAt?.getTime() || 0))
        : null,
    };
  }

  async updateCourseProgress(userId: string, courseId: string): Promise<void> {
    const progressSummary = await this.getCourseProgressSummary(userId, courseId);
    
    // Update enrollment with new progress
    await this.enrollmentsService.updateProgress(userId, courseId, {
      progressPercentage: progressSummary.overallProgress,
      timeSpent: progressSummary.totalTimeSpent,
    });
  }

  async getNextLecture(userId: string, courseId: string): Promise<Lecture | null> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Get user's completed lectures
    const completedLectures = await this.progressModel
      .find({ user: userId, course: courseId, isCompleted: true })
      .select('lecture')
      .exec();

    const completedLectureIds = completedLectures.map(p => p.lecture);

    // Find the next uncompleted lecture
    const nextLecture = await this.lectureModel
      .findOne({
        course: courseId,
        isActive: true,
        _id: { $nin: completedLectureIds }
      })
      .populate('section', 'title order')
      .sort({ 'section.order': 1, order: 1 })
      .exec();

    return nextLecture;
  }

  async markLectureAsCompleted(userId: string, courseId: string, lectureId: string): Promise<Progress> {
    return this.updateProgress(userId, courseId, lectureId, {
      progressPercentage: 100,
      isCompleted: true,
    });
  }

  async resetProgress(userId: string, courseId: string): Promise<void> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Delete all progress for this user and course
    await this.progressModel.deleteMany({ user: userId, course: courseId });

    // Reset enrollment progress
    await this.enrollmentsService.updateProgress(userId, courseId, {
      progressPercentage: 0,
      timeSpent: 0,
    });
  }

  async getCourseAnalytics(courseId: string): Promise<any> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    const analytics = await this.progressModel.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      {
        $group: {
          _id: '$lecture',
          totalUsers: { $sum: 1 },
          completedUsers: {
            $sum: { $cond: ['$isCompleted', 1, 0] }
          },
          avgProgress: { $avg: '$progressPercentage' },
          totalTimeSpent: { $sum: '$timeSpent' }
        }
      },
      {
        $lookup: {
          from: 'lectures',
          localField: '_id',
          foreignField: '_id',
          as: 'lecture'
        }
      },
      { $unwind: '$lecture' },
      {
        $project: {
          lectureTitle: '$lecture.title',
          lectureOrder: '$lecture.order',
          totalUsers: 1,
          completedUsers: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedUsers', '$totalUsers'] },
              100
            ]
          },
          avgProgress: 1,
          totalTimeSpent: 1
        }
      },
      { $sort: { lectureOrder: 1 } }
    ]);

    return analytics;
  }

  async getUserLearningStreak(userId: string): Promise<number> {
    const recentProgress = await this.progressModel
      .find({ user: userId })
      .sort({ lastAccessedAt: -1 })
      .limit(30)
      .exec();

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const hasActivity = recentProgress.some(p => {
        const progressDate = new Date(p.lastAccessedAt);
        progressDate.setHours(0, 0, 0, 0);
        return progressDate.getTime() === checkDate.getTime();
      });

      if (hasActivity) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
