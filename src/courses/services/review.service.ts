import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument, ReviewStatus } from '../schemas/review.schema';
import { SimplifiedCourse, SimplifiedCourseDocument } from '../schemas/simplified-course.schema';
import { Enrollment, EnrollmentDocument } from '../schemas/enrollment.schema';
import { CreateReviewDto, UpdateReviewStatusDto } from '../dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(SimplifiedCourse.name) private courseModel: Model<SimplifiedCourseDocument>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<EnrollmentDocument>,
  ) {}

  // User: Create a review (only if enrolled and completed)
  async createReview(courseId: string, userId: string, createReviewDto: CreateReviewDto) {
    console.log('Review creation attempt:', { courseId, userId });
    
    // Convert string IDs to ObjectIds for proper MongoDB querying
    const userObjectId = new Types.ObjectId(userId);
    const courseObjectId = new Types.ObjectId(courseId);
    
    // Check if user is enrolled in the course - try both field names for compatibility
    let enrollment = await this.enrollmentModel.findOne({
      user: userObjectId,
      course: courseObjectId,
      status: 'active'
    });

    // Fallback: try with 'student' field in case of schema mismatch
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({
        student: userObjectId,
        course: courseObjectId,
        status: 'active'
      });
    }

    // Also try without status filter in case enrollment status is different
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({
        user: userObjectId,
        course: courseObjectId
      });
      console.log('Enrollment found without status filter:', enrollment);
    }

    // Try with string IDs as fallback
    if (!enrollment) {
      enrollment = await this.enrollmentModel.findOne({
        user: userId,
        course: courseId
      });
      console.log('Enrollment found with string IDs:', enrollment);
    }

    if (!enrollment) {
      // Try to find any enrollment for this user to debug
      const anyEnrollment = await this.enrollmentModel.findOne({ user: userObjectId });
      console.log('Any enrollment for user:', anyEnrollment);
      
      // Also try to find enrollments for this course
      const courseEnrollments = await this.enrollmentModel.find({ course: courseObjectId });
      console.log('All enrollments for course:', courseEnrollments);
      
      throw new ForbiddenException('You must be enrolled in this course to leave a review');
    }

    console.log('Enrollment found:', enrollment);

    // Check if course exists
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user already reviewed this course
    const existingReview = await this.reviewModel.findOne({
      student: userId,
      course: courseId
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this course');
    }

    const review = new this.reviewModel({
      student: userId,
      course: courseId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      status: ReviewStatus.PENDING
    });

    return review.save();
  }

  // Public: Get approved reviews for a course
  async getCourseReviews(courseId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const reviews = await this.reviewModel
      .find({ course: courseId, status: ReviewStatus.APPROVED })
      .populate('student', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.reviewModel.countDocuments({ 
      course: courseId, 
      status: ReviewStatus.APPROVED 
    });

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Admin: Get all reviews (pending, approved, rejected)
  async getAllReviews(status?: ReviewStatus, page = 1, limit = 10) {
    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const reviews = await this.reviewModel
      .find(query)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.reviewModel.countDocuments(query);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Admin: Update review status (approve/reject)
  async updateReviewStatus(reviewId: string, adminId: string, updateStatusDto: UpdateReviewStatusDto) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (updateStatusDto.status === ReviewStatus.REJECTED && !updateStatusDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting a review');
    }

    review.status = updateStatusDto.status;
    review.approvedBy = new Types.ObjectId(adminId);
    review.approvedAt = new Date();
    
    if (updateStatusDto.rejectionReason) {
      review.rejectionReason = updateStatusDto.rejectionReason;
    }

    await review.save();

    // Update course rating if approved
    if (updateStatusDto.status === ReviewStatus.APPROVED) {
      await this.updateCourseRating(review.course.toString());
    }

    return review;
  }

  // Helper: Update course average rating and total reviews
  private async updateCourseRating(courseId: string) {
    const approvedReviews = await this.reviewModel.find({
      course: courseId,
      status: ReviewStatus.APPROVED
    });

    const totalReviews = approvedReviews.length;
    const averageRating = totalReviews > 0 
      ? approvedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    await this.courseModel.findByIdAndUpdate(courseId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews
    });
  }

  // User: Get user's reviews
  async getUserReviews(userId: string) {
    return this.reviewModel
      .find({ student: userId })
      .populate('course', 'title thumbnail')
      .sort({ createdAt: -1 });
  }

  // User: Delete own review (only if pending)
  async deleteReview(reviewId: string, userId: string) {
    const review = await this.reviewModel.findOne({
      _id: reviewId,
      student: userId
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('You can only delete pending reviews');
    }

    await this.reviewModel.findByIdAndDelete(reviewId);
    return { message: 'Review deleted successfully' };
  }
}
