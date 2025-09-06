import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProgressService } from '../services/progress.service';
import { UpdateProgressDto } from '../dto';

@ApiTags('progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Patch('course/:courseId/lecture/:lectureId')
  @ApiOperation({ summary: 'Update progress for a specific lecture' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - User not enrolled or invalid IDs' })
  async updateProgress(
    @Param('courseId') courseId: string,
    @Param('lectureId') lectureId: string,
    @Body() updateProgressDto: UpdateProgressDto,
    @Request() req,
  ) {
    return this.progressService.updateProgress(
      req.user.userId,
      courseId,
      lectureId,
      updateProgressDto,
    );
  }

  @Post('course/:courseId/lecture/:lectureId/complete')
  @ApiOperation({ summary: 'Mark lecture as completed' })
  @ApiResponse({ status: 200, description: 'Lecture marked as completed' })
  @ApiResponse({ status: 400, description: 'Bad request - User not enrolled or invalid IDs' })
  async markLectureCompleted(
    @Param('courseId') courseId: string,
    @Param('lectureId') lectureId: string,
    @Request() req,
  ) {
    return this.progressService.markLectureAsCompleted(req.user.userId, courseId, lectureId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get user progress for a course' })
  @ApiResponse({ status: 200, description: 'Course progress retrieved successfully' })
  async getCourseProgress(@Param('courseId') courseId: string, @Request() req) {
    return this.progressService.getUserProgress(req.user.userId, courseId);
  }

  @Get('course/:courseId/summary')
  @ApiOperation({ summary: 'Get course progress summary' })
  @ApiResponse({ status: 200, description: 'Progress summary retrieved successfully' })
  async getCourseProgressSummary(@Param('courseId') courseId: string, @Request() req) {
    return this.progressService.getCourseProgressSummary(req.user.userId, courseId);
  }

  @Get('course/:courseId/next-lecture')
  @ApiOperation({ summary: 'Get next uncompleted lecture in course' })
  @ApiResponse({ status: 200, description: 'Next lecture retrieved successfully' })
  async getNextLecture(@Param('courseId') courseId: string, @Request() req) {
    return this.progressService.getNextLecture(req.user.userId, courseId);
  }

  @Get('lecture/:lectureId')
  @ApiOperation({ summary: 'Get progress for a specific lecture' })
  @ApiResponse({ status: 200, description: 'Lecture progress retrieved successfully' })
  async getLectureProgress(@Param('lectureId') lectureId: string, @Request() req) {
    return this.progressService.getLectureProgress(req.user.userId, lectureId);
  }

  @Delete('course/:courseId/reset')
  @ApiOperation({ summary: 'Reset all progress for a course' })
  @ApiResponse({ status: 200, description: 'Progress reset successfully' })
  async resetProgress(@Param('courseId') courseId: string, @Request() req) {
    await this.progressService.resetProgress(req.user.userId, courseId);
    return { message: 'Course progress reset successfully' };
  }

  @Get('course/:courseId/analytics')
  @ApiOperation({ summary: 'Get course analytics (instructor/admin only)' })
  @ApiResponse({ status: 200, description: 'Course analytics retrieved successfully' })
  async getCourseAnalytics(@Param('courseId') courseId: string) {
    return this.progressService.getCourseAnalytics(courseId);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user learning streak' })
  @ApiResponse({ status: 200, description: 'Learning streak retrieved successfully' })
  async getLearningStreak(@Request() req) {
    const streak = await this.progressService.getUserLearningStreak(req.user.userId);
    return { streak };
  }
}
