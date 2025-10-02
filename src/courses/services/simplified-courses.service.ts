import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SimplifiedCourse, SimplifiedCourseDocument } from '../schemas/simplified-course.schema';
import { Enrollment, EnrollmentDocument, EnrollmentStatus } from '../schemas/enrollment.schema';
import { CreateSimplifiedCourseDto, UpdateSimplifiedCourseDto, AddVideoDto, EnrollCourseDto } from '../dto/simplified-course.dto';
import { S3Service } from '../../common/services/s3.service';

@Injectable()
export class SimplifiedCoursesService {
  constructor(
    @InjectModel(SimplifiedCourse.name) private courseModel: Model<SimplifiedCourseDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    private readonly s3Service: S3Service,
  ) {}

  // Admin: Create a new course
  async create(createCourseDto: CreateSimplifiedCourseDto, instructorId: string) {
    const course = new this.courseModel({
      ...createCourseDto,
      instructor: instructorId,
      videos: []
    });
    const savedCourse = await course.save();

    return savedCourse.videos[savedCourse.videos.length - 1];
  }

  // Admin: Get all courses for instructor
  async findByInstructor(instructorId: string) {
    return this.courseModel.find({ instructor: instructorId }).sort({ createdAt: -1 });
  }

  // Admin: Get single course
  async findOne(id: string, userId?: string, userRole?: string) {
    const course = await this.courseModel.findById(id).populate('instructor', 'firstName lastName email');
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // If user is not admin/instructor, check if they're enrolled
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      const userObjId = new Types.ObjectId(userId);
      const courseObjId = new Types.ObjectId(id);
      const enrollment = await this.enrollmentModel.findOne({
        user: userObjId,
        course: courseObjId,
        status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
      });
      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled to view this course');
      }
    }

    return course;
  }

  // Admin: Update course
  async update(id: string, updateCourseDto: UpdateSimplifiedCourseDto, userId: string, userRole: string) {
    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is admin or course instructor
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    return this.courseModel.findByIdAndUpdate(id, updateCourseDto, { new: true });
  }

  // Admin: Delete course
  async remove(id: string, userId: string, userRole: string) {
    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Also delete all enrollments
    await this.enrollmentModel.deleteMany({ course: id });
    return this.courseModel.findByIdAndDelete(id);
  }

  // Admin: Add video to course
  async addVideo(courseId: string, addVideoDto: AddVideoDto, videoUrl: string, videoKey: string, userId: string, userRole: string) {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only add videos to your own courses');
    }

    let resolvedDuration = typeof addVideoDto.duration === 'number' && !Number.isNaN(addVideoDto.duration)
      ? Math.max(0, Math.round(addVideoDto.duration))
      : 0;

    if (resolvedDuration === 0 && videoKey) {
      try {
        const metadata = await this.s3Service.getObjectMetadata(videoKey);
        if (metadata?.Metadata?.duration) {
          const parsedDuration = Number(metadata.Metadata.duration);
          if (!Number.isNaN(parsedDuration) && parsedDuration > 0) {
            resolvedDuration = Math.round(parsedDuration);
          }
        }
      } catch (error) {
        console.warn('Failed to read video metadata for duration:', error);
      }
    }

    const newVideo = {
      title: addVideoDto.title,
      videoUrl,
      videoKey,
      duration: resolvedDuration,
      order: course.videos.length + 1,
      uploadedAt: new Date()
    };

    course.videos.push(newVideo);
    await course.save();

    return newVideo;
  }

  // Admin: Remove video from course
  async removeVideo(courseId: string, videoIndex: number, userId: string, userRole: string) {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only remove videos from your own courses');
    }

    if (videoIndex < 0 || videoIndex >= course.videos.length) {
      throw new BadRequestException('Invalid video index');
    }

    course.videos.splice(videoIndex, 1);
    
    // Reorder remaining videos
    course.videos.forEach((video, index) => {
      video.order = index + 1;
    });

    return course.save();
  }

  // Public: Get all published courses
  async findAllPublished(page = 1, limit = 10, search?: string) {
    const query: any = { status: 'published' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const courses = await this.courseModel
      .find(query)
      .populate('instructor', 'firstName lastName')
      .select('-videos') // Don't show videos in listing
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.courseModel.countDocuments(query);

    return {
      courses,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // User: Enroll in course
  async enrollInCourse(courseId: string, userId: string, enrollDto: EnrollCourseDto = {}) {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== 'published') {
      throw new BadRequestException('Course is not available for enrollment');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: courseId
    });

    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // For paid courses, require payment validation
    if (course.type === 'paid') {
      if (!enrollDto.paymentId) {
        throw new BadRequestException('Payment is required for paid courses. Please complete payment first.');
      }
      
      if (!enrollDto.amountPaid || enrollDto.amountPaid < course.price) {
        throw new BadRequestException('Invalid payment amount');
      }
    }

    const enrollment = new this.enrollmentModel({
      user: userId,
      course: courseId,
      amountPaid: enrollDto.amountPaid || (course.type === 'free' ? 0 : course.price),
      paymentId: enrollDto.paymentId,
      status: 'active'
    });

    await enrollment.save();

    // Update enrollment count
    await this.courseModel.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 }
    });

    return enrollment;
  }

  // User: Get enrolled courses
  async getEnrolledCourses(userId: string) {
    return this.enrollmentModel
      .find({ user: userId, status: 'active' })
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      })
      .sort({ enrolledAt: -1 });
  }

  // User: Get course with videos (only if enrolled)
  async getCourseWithVideos(courseId: string, userId: string, userRole?: string) {
    const userObjId = new Types.ObjectId(userId);
    const courseObjId = new Types.ObjectId(courseId);
    const isAdmin = userRole === 'admin';
    const enrollment = await this.enrollmentModel.findOne({
      user: userObjId,
      course: courseObjId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
    });

    if (!isAdmin && !enrollment) {
      throw new ForbiddenException('You must be enrolled to access course content');
    }

    const course = await this.courseModel
      .findById(courseId)
      .populate('instructor', 'firstName lastName email');

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Generate secure URLs for all videos with shorter expiry for security
    const videosWithSecureUrls = await Promise.all(
      course.videos.map(async (video, index) => {
        try {
          // Generate signed URL with 30 minutes expiry for better security
          const signedUrl = await this.s3Service.getSignedUrl(video.videoKey, 1800);
          return {
            title: video.title,
            videoUrl: signedUrl,
            videoKey: video.videoKey,
            duration: video.duration,
            order: video.order,
            uploadedAt: video.uploadedAt,
            // Add streaming optimizations
            streamingOptions: {
              adaptiveBitrate: true,
              enableChunking: true,
              bufferSize: '5MB'
            }
          };
        } catch (error) {
          console.error(`Failed to generate signed URL for video ${index}:`, error);
          return {
            title: video.title,
            videoUrl: video.videoUrl,
            videoKey: video.videoKey,
            duration: video.duration,
            order: video.order,
            uploadedAt: video.uploadedAt,
            streamingOptions: {
              adaptiveBitrate: false,
              enableChunking: false,
              bufferSize: '1MB'
            }
          };
        }
      })
    );

    return {
      course: {
        ...course.toObject(),
        videos: videosWithSecureUrls
      },
      enrollment,
      watchedVideos: enrollment?.watchedVideos || []
    };
  }

  // User: Mark video as watched
  async markVideoAsWatched(courseId: string, videoIndex: number, userId: string, userRole?: string) {
    const enrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: courseId,
      status: 'active'
    });

    if (!enrollment && userRole !== 'admin') {
      throw new ForbiddenException('You must be enrolled to access course content');
    }

    if (enrollment) {
      const videoId = `${courseId}_${videoIndex}`;
      if (!enrollment.watchedVideos.includes(videoId)) {
        enrollment.watchedVideos.push(videoId);
        
        // Calculate progress
        const course = await this.courseModel.findById(courseId);
        if (!course) {
          throw new NotFoundException('Course not found');
        }
        const totalVideos = course.videos.length;
        const watchedCount = enrollment.watchedVideos.length;
        enrollment.progress = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;
        
        if (enrollment.progress === 100) {
          enrollment.status = EnrollmentStatus.COMPLETED;
          enrollment.completedAt = new Date();
        }

        enrollment.lastAccessedAt = new Date();
        await enrollment.save();
      }
    }

    return enrollment;
  }

  // User/Admin: Get secure video URL
  async getSecureVideoUrl(courseId: string, videoIndex: number, userId: string, userRole: string) {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (videoIndex < 0 || videoIndex >= course.videos.length) {
      throw new BadRequestException('Invalid video index');
    }

    // Check access permissions
    if (userRole === 'admin' || course.instructor.toString() === userId) {
      // Admin or course instructor can access any video
    } else {
      // Regular users must be enrolled
      const userObjId = new Types.ObjectId(userId);
      const courseObjId = new Types.ObjectId(courseId);
      const enrollment = await this.enrollmentModel.findOne({
        user: userObjId,
        course: courseObjId,
        status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] }
      });

      if (!enrollment) {
        throw new ForbiddenException('You must be enrolled to access course videos');
      }
    }

    const video = course.videos[videoIndex];
    
    try {
      // Generate signed URL for secure access (expires in 1 hour)
      const signedUrl = await this.s3Service.getSignedUrl(video.videoKey, 3600);
      
      return {
        streamUrl: signedUrl,
        video: {
          title: video.title,
          duration: video.duration,
          order: video.order
        }
      };
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      // Fallback to original URL if signed URL generation fails
      return {
        streamUrl: video.videoUrl,
        video: {
          title: video.title,
          duration: video.duration,
          order: video.order
        }
      };
    }
  }
}
