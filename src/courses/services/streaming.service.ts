import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import { Lecture, LectureDocument } from '../schemas/lecture.schema';
import { Enrollment, EnrollmentDocument } from '../schemas/enrollment.schema';
import { S3Service } from '../../common/services/s3.service';
import { EnrollmentsService } from './enrollments.service';

@Injectable()
export class StreamingService {
  constructor(
    @InjectModel(Lecture.name) private lectureModel: Model<LectureDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
    private s3Service: S3Service,
    private enrollmentsService: EnrollmentsService,
  ) {}

  async streamVideo(lectureId: string, userId: string, res: Response, range?: string): Promise<void> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    // Get lecture details
    const lecture = await this.lectureModel
      .findById(lectureId)
      .populate('course', 'instructor type')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    if (!lecture.videoUrl || !lecture.videoKey) {
      throw new BadRequestException('No video content available for this lecture');
    }

    // Check access permissions
    await this.checkVideoAccess(lecture, userId);

    try {
      // Generate signed URL for S3 video
      const signedUrl = await this.s3Service.getSignedUrl(lecture.videoKey, 3600); // 1 hour expiry

      // For streaming, we'll redirect to the signed URL or implement range requests
      if (range) {
        // Handle range requests for video streaming
        await this.handleRangeRequest(signedUrl, range, res);
      } else {
        // Simple redirect to signed URL
        res.redirect(signedUrl);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to stream video: ${error.message}`);
    }
  }

  async getVideoStreamUrl(lectureId: string, userId: string): Promise<string> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel
      .findById(lectureId)
      .populate('course', 'instructor type')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    if (!lecture.videoUrl || !lecture.videoKey) {
      throw new BadRequestException('No video content available for this lecture');
    }

    // Check access permissions
    await this.checkVideoAccess(lecture, userId);

    // Generate signed URL with longer expiry for streaming
    return this.s3Service.getSignedUrl(lecture.videoKey, 7200); // 2 hours expiry
  }

  async getAudioStreamUrl(lectureId: string, userId: string): Promise<string> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel
      .findById(lectureId)
      .populate('course', 'instructor type')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    if (!lecture.audioUrl || !lecture.audioKey) {
      throw new BadRequestException('No audio content available for this lecture');
    }

    // Check access permissions
    await this.checkVideoAccess(lecture, userId);

    // Generate signed URL for audio streaming
    return this.s3Service.getSignedUrl(lecture.audioKey, 7200); // 2 hours expiry
  }

  async downloadResource(lectureId: string, resourceIndex: number, userId: string): Promise<string> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel
      .findById(lectureId)
      .populate('course', 'instructor type')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    if (!lecture.resources || !lecture.resources[resourceIndex]) {
      throw new BadRequestException('Resource not found');
    }

    // Check access permissions
    await this.checkVideoAccess(lecture, userId);

    const resource = lecture.resources[resourceIndex];
    
    // Check if download is allowed
    if (!lecture.allowDownload) {
      throw new ForbiddenException('Download is not allowed for this lecture');
    }

    // Generate signed URL for resource download
    return this.s3Service.getSignedUrl(resource.key, 3600); // 1 hour expiry
  }

  private async checkVideoAccess(lecture: any, userId: string): Promise<void> {
    const course = lecture.course;

    // Check if lecture is free
    if (lecture.isFree) {
      return; // Free lectures are accessible to everyone
    }

    // Check if user is the course instructor
    if (course.instructor.toString() === userId) {
      return; // Course instructors can access all content
    }

    // Check if user is enrolled in the course
    const isEnrolled = await this.enrollmentsService.isUserEnrolled(userId, course._id.toString());
    if (!isEnrolled) {
      throw new ForbiddenException('You must be enrolled in this course to access this content');
    }

    // For paid courses, verify payment status
    if (course.type === 'paid') {
      const enrollment = await this.enrollmentModel.findOne({
        user: userId,
        course: course._id,
        paymentStatus: 'completed'
      });

      if (!enrollment) {
        throw new ForbiddenException('Payment required to access this content');
      }
    }
  }

  private async handleRangeRequest(url: string, range: string, res: Response): Promise<void> {
    // This is a simplified implementation
    // In a production environment, you might want to proxy the range request to S3
    // or implement a more sophisticated streaming solution
    
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : undefined;

    // For now, redirect to the signed URL
    // The client can handle range requests directly with S3
    res.redirect(url);
  }

  async getVideoMetadata(lectureId: string, userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(lectureId)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel
      .findById(lectureId)
      .populate('course', 'instructor type title')
      .populate('section', 'title')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check access permissions
    await this.checkVideoAccess(lecture, userId);

    return {
      id: lecture._id,
      title: lecture.title,
      description: lecture.description,
      duration: lecture.duration,
      type: lecture.type,
      thumbnail: lecture.thumbnail,
      course: {
        id: lecture.course._id,
        title: (lecture.course as any).title,
      },
      section: {
        id: lecture.section._id,
        title: (lecture.section as any).title,
      },
      hasVideo: !!lecture.videoUrl,
      hasAudio: !!lecture.audioUrl,
      allowDownload: lecture.allowDownload,
      playbackSpeed: lecture.playbackSpeed,
      resources: lecture.resources?.map((resource, index) => ({
        index,
        name: resource.name,
        type: resource.type,
        size: resource.size,
      })) || [],
    };
  }

  async generatePlaylist(courseId: string, userId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Check if user has access to the course
    const isEnrolled = await this.enrollmentsService.isUserEnrolled(userId, courseId);
    if (!isEnrolled) {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    // Get all lectures with video content
    const lectures = await this.lectureModel
      .find({
        course: courseId,
        isActive: true,
        videoUrl: { $exists: true, $ne: null }
      })
      .populate('section', 'title order')
      .sort({ 'section.order': 1, order: 1 })
      .select('title duration thumbnail videoKey section order')
      .exec();

    // Generate playlist with signed URLs
    const playlist = await Promise.all(
      lectures.map(async (lecture) => {
        const streamUrl = lecture.videoKey 
          ? await this.s3Service.getSignedUrl(lecture.videoKey, 7200)
          : null;

        return {
          id: lecture._id,
          title: lecture.title,
          duration: lecture.duration,
          thumbnail: lecture.thumbnail,
          streamUrl,
          section: (lecture.section as any).title,
          order: lecture.order,
        };
      })
    );

    return playlist;
  }
}
