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
    try {
      if (!Types.ObjectId.isValid(lectureId)) {
        res.status(400).json({ 
          error: 'Invalid lecture ID', 
          message: 'Please provide a valid lecture ID' 
        });
        return;
      }

      // Get lecture details with proper population
      const lecture = await this.lectureModel
        .findById(lectureId)
        .populate('course', 'instructor type title price')
        .exec();

      if (!lecture) {
        res.status(404).json({ 
          error: 'Lecture not found', 
          message: 'The requested lecture does not exist' 
        });
        return;
      }

      // Check if lecture is active
      if (!lecture.isActive) {
        res.status(403).json({ 
          error: 'Lecture not available', 
          message: 'This lecture is currently not available for streaming' 
        });
        return;
      }

      if (!lecture.videoUrl || !lecture.videoKey) {
        res.status(400).json({ 
          error: 'No video content', 
          message: 'No video content is available for this lecture' 
        });
        return;
      }

      // Check access permissions
      await this.checkVideoAccess(lecture, userId);

      // Generate signed URL for S3 video with appropriate expiry
      const signedUrl = await this.s3Service.getSignedUrl(lecture.videoKey, 3600); // 1 hour expiry

      // Set common headers for video streaming
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Handle range requests for progressive video streaming
      if (range) {
        await this.handleRangeRequest(signedUrl, range, res);
      } else {
        // Simple redirect to signed URL
        res.redirect(302, signedUrl);
      }
    } catch (error) {
      console.error('Error streaming video:', error);
      
      if (error instanceof ForbiddenException) {
        res.status(403).json({ 
          error: 'Access denied', 
          message: error.message 
        });
      } else if (error instanceof NotFoundException) {
        res.status(404).json({ 
          error: 'Not found', 
          message: error.message 
        });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ 
          error: 'Bad request', 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          error: 'Internal server error', 
          message: 'Failed to stream video. Please try again later.' 
        });
      }
    }
  }

  async getVideoStreamUrl(lectureId: string, userId: string): Promise<string> {
    try {
      if (!Types.ObjectId.isValid(lectureId)) {
        throw new BadRequestException('Invalid lecture ID format');
      }

      const lecture = await this.lectureModel
        .findById(lectureId)
        .populate('course', 'instructor type title price')
        .exec();

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      if (!lecture.isActive) {
        throw new ForbiddenException('This lecture is not available for streaming');
      }

      if (!lecture.videoUrl || !lecture.videoKey) {
        throw new BadRequestException('No video content available for this lecture');
      }

      // Check access permissions
      await this.checkVideoAccess(lecture, userId);

      // Generate signed URL with appropriate expiry for streaming
      const signedUrl = await this.s3Service.getSignedUrl(lecture.videoKey, 7200); // 2 hours expiry
      
      if (!signedUrl) {
        throw new BadRequestException('Failed to generate video stream URL');
      }

      return signedUrl;
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      // Log unexpected errors
      console.error('Error generating video stream URL:', error);
      throw new BadRequestException('Failed to generate video stream URL');
    }
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

    // Check if user is enrolled in the course with active or completed status
    const enrollment = await this.enrollmentModel.findOne({
      user: userId,
      course: course._id,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in this course to access this content. Please enroll first.');
    }

    // For paid courses, verify payment status
    if (course.type === 'paid') {
      // Check if payment status exists and is completed, or if course is free
      if (enrollment.paymentStatus && enrollment.paymentStatus !== 'completed') {
        throw new ForbiddenException('Payment is required to access this content. Please complete your payment.');
      }
      
      // If no payment status field exists (older enrollments), check if amount was paid
      if (!enrollment.paymentStatus && course.price > 0 && (enrollment.amountPaid || 0) < course.price) {
        throw new ForbiddenException('Payment is required to access this content. Please complete your payment.');
      }
    }
  }

  private async handleRangeRequest(url: string, range: string, res: Response): Promise<void> {
    try {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : undefined;

      // Set appropriate headers for range request
      res.status(206); // Partial Content
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', 'video/mp4');
      
      // Add range headers
      if (end) {
        res.setHeader('Content-Range', `bytes ${start}-${end}/*`);
        res.setHeader('Content-Length', (end - start + 1).toString());
      } else {
        res.setHeader('Content-Range', `bytes ${start}-/*`);
      }

      // For S3, we can use signed URLs with range headers
      // The client will handle the actual range request to S3
      res.redirect(url);
    } catch (error) {
      res.status(500).json({ error: 'Failed to handle range request' });
    }
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

  async updateVideoProgress(lectureId: string, userId: string, progressData: any): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(lectureId)) {
        throw new BadRequestException('Invalid lecture ID');
      }

      const lecture = await this.lectureModel
        .findById(lectureId)
        .populate('course', '_id')
        .exec();

      if (!lecture) {
        throw new NotFoundException('Lecture not found');
      }

      // Update enrollment progress
      await this.enrollmentsService.updateProgress(
        userId, 
        lecture.course._id.toString(), 
        {
          lectureId,
          timeSpent: progressData.timeSpent || 0,
          progressPercentage: progressData.progressPercentage || 0,
          completedLecture: progressData.completed ? lectureId : null
        }
      );

      // Update watched videos list
      if (progressData.completed || progressData.progressPercentage >= 90) {
        await this.enrollmentModel.updateOne(
          { user: userId, course: lecture.course._id },
          { $addToSet: { watchedVideos: lectureId } }
        );
      }
    } catch (error) {
      console.error('Error updating video progress:', error);
      // Don't throw error for progress updates to avoid breaking video playback
    }
  }
}
