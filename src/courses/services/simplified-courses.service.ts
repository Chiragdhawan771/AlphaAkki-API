import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SimplifiedCourse, SimplifiedCourseDocument } from '../schemas/simplified-course.schema';
import { Enrollment, EnrollmentDocument, EnrollmentStatus } from '../schemas/enrollment.schema';
import {
  CreateSimplifiedCourseDto,
  UpdateSimplifiedCourseDto,
  AddVideoDto,
  EnrollCourseDto,
  InitiateVideoUploadDto,
  PartNumberRequestDto,
  RecordUploadedPartDto,
  CompleteVideoUploadDto,
} from '../dto/simplified-course.dto';
import { S3Service, CompleteMultipartUploadPart } from '../../common/services/s3.service';
import {
  SimplifiedCourseVideoUploadSession,
  SimplifiedCourseVideoUploadSessionDocument,
  VideoUploadStatus,
  UploadedPart,
} from '../schemas/video-upload-session.schema';

@Injectable()
export class SimplifiedCoursesService {
  constructor(
    @InjectModel(SimplifiedCourse.name) private courseModel: Model<SimplifiedCourseDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(SimplifiedCourseVideoUploadSession.name)
    private readonly uploadSessionModel: Model<SimplifiedCourseVideoUploadSessionDocument>,
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

  // Legacy method placeholder (should not be used once multipart flow is live)
  async addVideo(
    _courseId: string,
    _addVideoDto: AddVideoDto,
    _videoUrl: string,
    _videoKey: string,
    _userId: string,
    _userRole: string,
  ) {
    throw new BadRequestException('Direct video uploads are no longer supported. Use multipart upload flow.');
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

  async initiateVideoUpload(
    courseId: string,
    userId: string,
    userRole: string,
    payload: InitiateVideoUploadDto,
  ) {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { mimetype } = payload as any;
    const mimeType = payload.mimeType || mimetype;

    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi', 'video/quicktime'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException('Unsupported video type');
    }

    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only upload videos for your own courses');
    }

    if (payload.fileSize > 5 * 1024 * 1024 * 1024) {
      throw new BadRequestException('Maximum allowed file size is 5GB');
    }

    const existingActiveSession = await this.uploadSessionModel.findOne({
      course: courseId,
      instructor: userId,
      status: { $in: [VideoUploadStatus.INITIATED, VideoUploadStatus.UPLOADING] },
    });

    if (existingActiveSession) {
      throw new BadRequestException('An upload session is already in progress for this course');
    }

    const metadata: Record<string, string> = {
      title: payload.title,
      courseId,
      instructorId: userId,
      autoDetectDuration: payload.autoDetectDuration ? 'true' : 'false',
    };

    const { key, uploadId, bucket } = await this.s3Service.initiateMultipartUpload(
      payload.fileName,
      'lectures/videos',
      mimeType,
      metadata,
    );

    const session = await this.uploadSessionModel.create({
      course: courseId,
      instructor: userId,
      initiatorRole: userRole,
      title: payload.title,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      mimeType,
      uploadId,
      s3Key: key,
      partSize: payload.partSize,
      totalParts: payload.totalParts,
      status: VideoUploadStatus.INITIATED,
      autoDetectDuration: payload.autoDetectDuration ?? true,
      providedDuration: payload.autoDetectDuration ? null : payload.duration ?? null,
      uploadedParts: [],
    });

    return {
      sessionId: session._id,
      uploadId,
      key,
      bucket,
      partSize: session.partSize,
      totalParts: session.totalParts,
    };
  }

  async getPresignedPartUrls(
    courseId: string,
    sessionId: string,
    userId: string,
    userRole: string,
    payload: PartNumberRequestDto,
  ) {
    const session = await this.assertUploadSessionOwnership(courseId, sessionId, userId, userRole);

    if (session.status === VideoUploadStatus.COMPLETED) {
      throw new BadRequestException('Upload session already completed');
    }

    const invalidPart = payload.partNumbers.find(
      (partNumber) => partNumber < 1 || partNumber > session.totalParts,
    );
    if (invalidPart) {
      throw new BadRequestException(`Invalid part number requested: ${invalidPart}`);
    }

    const urls = await Promise.all(
      payload.partNumbers.map(async (partNumber) => ({
        partNumber,
        url: await this.s3Service.getMultipartUploadPartUrl(
          session.s3Key,
          session.uploadId,
          partNumber,
        ),
      })),
    );

    if (session.status === VideoUploadStatus.INITIATED) {
      session.status = VideoUploadStatus.UPLOADING;
      await session.save();
    }

    return {
      sessionId: session._id,
      parts: urls,
    };
  }

  async recordUploadedPart(
    courseId: string,
    sessionId: string,
    userId: string,
    userRole: string,
    payload: RecordUploadedPartDto,
  ) {
    const session = await this.assertUploadSessionOwnership(courseId, sessionId, userId, userRole);

    if (session.status === VideoUploadStatus.COMPLETED) {
      throw new BadRequestException('Upload session already completed');
    }

    if (payload.partNumber < 1 || payload.partNumber > session.totalParts) {
      throw new BadRequestException('Invalid part number');
    }

    if (session.status === VideoUploadStatus.INITIATED) {
      session.status = VideoUploadStatus.UPLOADING;
    }

    const duplicatePart = session.uploadedParts.find((part) => part.partNumber === payload.partNumber);
    if (duplicatePart) {
      duplicatePart.eTag = payload.eTag;
    } else {
      session.uploadedParts.push({
        partNumber: payload.partNumber,
        eTag: payload.eTag,
      });
    }

    await session.save();

    return {
      sessionId: session._id,
      uploadedParts: session.uploadedParts,
      remainingParts: session.totalParts - session.uploadedParts.length,
    };
  }

  async completeVideoUpload(
    courseId: string,
    sessionId: string,
    userId: string,
    userRole: string,
    payload: CompleteVideoUploadDto,
  ) {
    const session = await this.assertUploadSessionOwnership(courseId, sessionId, userId, userRole);

    if (session.status === VideoUploadStatus.COMPLETED) {
      return this.buildCompletedUploadResponse(session);
    }

    const partNumbersSet = new Set(payload.parts.map((part) => part.partNumber));
    if (partNumbersSet.size !== payload.parts.length) {
      throw new BadRequestException('Duplicate part numbers provided');
    }

    const parts: CompleteMultipartUploadPart[] = payload.parts
      .slice()
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((part, index) => ({
        partNumber: part.partNumber,
        eTag: part.eTag,
      }));

    if (session.totalParts !== parts.length) {
      throw new BadRequestException('All parts must be uploaded before completion');
    }

    if (!parts.every((part, index) => part.partNumber === index + 1)) {
      throw new BadRequestException('Parts must be sequential starting at 1');
    }

    await this.s3Service.completeMultipartUpload(session.s3Key, session.uploadId, parts);

    const duration = this.resolveVideoDuration(session, payload.duration);

    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only add videos to your own courses');
    }

    const video = {
      title: session.title,
      videoUrl: this.s3Service.getPublicUrl(session.s3Key),
      videoKey: session.s3Key,
      duration,
      order: course.videos.length + 1,
      uploadedAt: new Date(),
      fileSize: session.fileSize,
    };

    course.videos.push(video);
    await course.save();

    session.status = VideoUploadStatus.COMPLETED;
    session.completedAt = new Date();
    session.resolvedDuration = duration;
    await session.save();

    return this.buildCompletedUploadResponse(session, video);
  }

  async abortVideoUpload(courseId: string, sessionId: string, userId: string, userRole: string) {
    const session = await this.assertUploadSessionOwnership(courseId, sessionId, userId, userRole);

    if (session.status === VideoUploadStatus.COMPLETED) {
      throw new BadRequestException('Upload session already completed');
    }

    await this.s3Service.abortMultipartUpload(session.s3Key, session.uploadId);

    session.status = VideoUploadStatus.ABORTED;
    session.errorMessage = 'Upload aborted by user';
    await session.save();

    return {
      sessionId: session._id,
      status: session.status,
    };
  }

  private async assertUploadSessionOwnership(
    courseId: string,
    sessionId: string,
    userId: string,
    userRole: string,
  ): Promise<SimplifiedCourseVideoUploadSessionDocument> {
    const session = await this.uploadSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Upload session not found');
    }

    if (session.course.toString() !== courseId) {
      throw new BadRequestException('Upload session does not belong to this course');
    }

    if (session.instructor.toString() !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have access to this upload session');
    }

    return session;
  }

  private resolveVideoDuration(
    session: SimplifiedCourseVideoUploadSessionDocument,
    providedDuration?: number,
  ): number {
    if (typeof providedDuration === 'number' && !Number.isNaN(providedDuration) && providedDuration > 0) {
      return Math.round(providedDuration);
    }

    if (!session.autoDetectDuration && typeof session.providedDuration === 'number') {
      return Math.round(session.providedDuration);
    }

    if (session.resolvedDuration && session.resolvedDuration > 0) {
      return Math.round(session.resolvedDuration);
    }

    return 0;
  }

  private buildCompletedUploadResponse(
    session: SimplifiedCourseVideoUploadSessionDocument,
    video?: SimplifiedCourse['videos'][number],
  ) {
    return {
      sessionId: session._id,
      status: session.status,
      video,
      duration: video?.duration ?? session.resolvedDuration,
      uploadedParts: session.uploadedParts,
      completedAt: session.completedAt,
    };
  }
}
