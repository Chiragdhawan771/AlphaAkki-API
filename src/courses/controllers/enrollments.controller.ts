import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnrollmentsService } from '../services/enrollments.service';
import { CreateEnrollmentDto } from '../dto';
import { EnrollmentStatus } from '../schemas/enrollment.schema';

@ApiTags('enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll user in a course' })
  @ApiResponse({ status: 201, description: 'User enrolled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already enrolled' })
  async enroll(@Body() createEnrollmentDto: CreateEnrollmentDto, @Request() req) {
    return this.enrollmentsService.enroll(req.user.userId, createEnrollmentDto);
  }

  @Get('my-courses')
  @ApiOperation({ summary: 'Get current user enrollments' })
  @ApiResponse({ status: 200, description: 'User enrollments retrieved successfully' })
  async getMyEnrollments(
    @Request() req,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.getUserEnrollments(req.user.userId, status);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get user learning dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Request() req) {
    return this.enrollmentsService.getUserDashboard(req.user.userId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get enrollments for a specific course (instructor/admin only)' })
  @ApiResponse({ status: 200, description: 'Course enrollments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner or admin' })
  async getCourseEnrollments(@Param('courseId') courseId: string) {
    return this.enrollmentsService.getCourseEnrollments(courseId);
  }

  @Get('course/:courseId/stats')
  @ApiOperation({ summary: 'Get enrollment statistics for a course' })
  @ApiResponse({ status: 200, description: 'Enrollment stats retrieved successfully' })
  async getEnrollmentStats(@Param('courseId') courseId: string) {
    return this.enrollmentsService.getEnrollmentStats(courseId);
  }

  @Get('course/:courseId/check')
  @ApiOperation({ summary: 'Check if current user is enrolled in a course' })
  @ApiResponse({ status: 200, description: 'Enrollment status checked' })
  async checkEnrollment(@Param('courseId') courseId: string, @Request() req) {
    const isEnrolled = await this.enrollmentsService.isUserEnrolled(req.user.userId, courseId);
    const enrollment = isEnrolled 
      ? await this.enrollmentsService.getEnrollment(req.user.userId, courseId)
      : null;
    
    return {
      isEnrolled,
      enrollment,
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update enrollment status' })
  @ApiResponse({ status: 200, description: 'Enrollment status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not enrollment owner or admin' })
  async updateStatus(
    @Param('id') enrollmentId: string,
    @Body() statusData: { status: EnrollmentStatus },
    @Request() req,
  ) {
    return this.enrollmentsService.updateEnrollmentStatus(
      enrollmentId,
      statusData.status,
      req.user.userId,
      req.user.role,
    );
  }
}
