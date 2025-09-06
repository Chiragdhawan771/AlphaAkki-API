import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CoursesService } from '../courses.service';
import { EnrollmentsService } from '../services/enrollments.service';
import { ProgressService } from '../services/progress.service';
import { CourseStatus } from '../schemas/course.schema';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly progressService: ProgressService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDashboard(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Get overall statistics
    const [
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      recentCourses,
    ] = await Promise.all([
      this.coursesService.findAll({ limit: 1 }).then(result => result.pagination.total),
      this.coursesService.findAll({ status: CourseStatus.PUBLISHED, limit: 1 }).then(result => result.pagination.total),
      this.coursesService.findAll({ status: CourseStatus.DRAFT, limit: 1 }).then(result => result.pagination.total),
      // Add total enrollments count
      0, // Placeholder - implement if needed
      this.coursesService.findAll({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }).then(result => result.courses),
    ]);

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      recentCourses,
    };
  }

  @Get('courses/pending-approval')
  @ApiOperation({ summary: 'Get courses pending approval' })
  @ApiResponse({ status: 200, description: 'Pending courses retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getPendingCourses(@Request() req, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return this.coursesService.findAll({
      ...query,
      status: CourseStatus.PUBLISHED,
      // Add filter for courses that need approval
    });
  }

  @Post('courses/:id/approve')
  @ApiOperation({ summary: 'Approve a course' })
  @ApiResponse({ status: 200, description: 'Course approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async approveCourse(@Param('id') courseId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return this.coursesService.update(courseId, {
      approvedBy: req.user.userId,
      approvedAt: new Date(),
    } as any, req.user.userId, req.user.role);
  }

  @Post('courses/:id/reject')
  @ApiOperation({ summary: 'Reject a course' })
  @ApiResponse({ status: 200, description: 'Course rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async rejectCourse(@Param('id') courseId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return this.coursesService.update(courseId, {
      status: CourseStatus.DRAFT,
    } as any, req.user.userId, req.user.role);
  }

  @Patch('courses/:id/feature')
  @ApiOperation({ summary: 'Toggle course featured status' })
  @ApiResponse({ status: 200, description: 'Course featured status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async toggleFeatured(
    @Param('id') courseId: string,
    @Body() data: { isFeatured: boolean },
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return this.coursesService.update(courseId, {
      isFeatured: data.isFeatured,
    }, req.user.userId, req.user.role);
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get platform analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAnalyticsOverview(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Get comprehensive platform analytics
    const [
      coursesByCategory,
      coursesByLevel,
      topInstructors,
      recentEnrollments,
    ] = await Promise.all([
      this.coursesService.getCategories(),
      // Add more analytics aggregations as needed
      [],
      [],
      [],
    ]);

    return {
      coursesByCategory,
      coursesByLevel,
      topInstructors,
      recentEnrollments,
    };
  }

  @Get('users/instructors')
  @ApiOperation({ summary: 'Get all instructors with their course statistics' })
  @ApiResponse({ status: 200, description: 'Instructors retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getInstructors(@Request() req, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // This would need to be implemented in a user service
    // For now, return placeholder
    return {
      instructors: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      },
    };
  }

  @Get('reports/enrollment-trends')
  @ApiOperation({ summary: 'Get enrollment trends report' })
  @ApiResponse({ status: 200, description: 'Enrollment trends retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getEnrollmentTrends(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    // Implement enrollment trends analysis
    return {
      trends: [],
      summary: {
        totalEnrollments: 0,
        growthRate: 0,
        topCourses: [],
      },
    };
  }

  @Delete('courses/:id/force-delete')
  @ApiOperation({ summary: 'Force delete a course (admin only)' })
  @ApiResponse({ status: 200, description: 'Course force deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async forceDeleteCourse(@Param('id') courseId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    await this.coursesService.remove(courseId, req.user.userId, req.user.role);
    return { message: 'Course force deleted successfully' };
  }
}
