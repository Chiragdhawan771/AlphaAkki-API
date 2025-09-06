import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReviewService } from '../services/review.service';
import { CreateReviewDto, UpdateReviewStatusDto } from '../dto/review.dto';
import { ReviewStatus } from '../schemas/review.schema';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // User: Create a review for a course
  @Post('courses/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a course (enrolled users only)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async createReview(
    @Param('courseId') courseId: string,
    @Body() createReviewDto: CreateReviewDto,
    @Request() req,
  ) {
    return this.reviewService.createReview(courseId, req.user._id, createReviewDto);
  }

  // Public: Get approved reviews for a course
  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Get approved reviews for a course' })
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getCourseReviews(courseId, page || 1, limit || 10);
  }

  // Admin: Get all reviews with optional status filter
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews (Admin only)' })
  async getAllReviews(
    @Request() req,
    @Query('status') status?: ReviewStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can access this endpoint');
    }
    return this.reviewService.getAllReviews(status, page || 1, limit || 10);
  }

  // Admin: Update review status (approve/reject)
  @Patch('admin/:reviewId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review status (Admin only)' })
  async updateReviewStatus(
    @Param('reviewId') reviewId: string,
    @Body() updateStatusDto: UpdateReviewStatusDto,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can update review status');
    }
    return this.reviewService.updateReviewStatus(reviewId, req.user._id, updateStatusDto);
  }

  // User: Get own reviews
  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user own reviews' })
  async getUserReviews(@Request() req) {
    return this.reviewService.getUserReviews(req.user._id);
  }

  // User: Delete own review (only if pending)
  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review (only if pending)' })
  async deleteReview(@Param('reviewId') reviewId: string, @Request() req) {
    return this.reviewService.deleteReview(reviewId, req.user._id);
  }
}
