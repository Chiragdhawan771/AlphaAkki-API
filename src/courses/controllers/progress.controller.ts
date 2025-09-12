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

  @Get('course/:courseId/summary')
  @ApiOperation({ summary: 'Get course progress summary' })
  @ApiResponse({ status: 200, description: 'Progress summary retrieved successfully' })
  async getCourseProgressSummary(@Param('courseId') courseId: string, @Request() req) {
    return this.progressService.getCourseProgressSummary(req.user.userId, courseId);
  }

  @Get('course/:courseId/lecture/:lectureId')
  @ApiOperation({ summary: 'Get progress for a specific lecture' })
  @ApiResponse({ status: 200, description: 'Lecture progress retrieved successfully' })
  async getLectureProgress(
    @Param('courseId') courseId: string,
    @Param('lectureId') lectureId: string,
    @Request() req
  ) {
    return this.progressService.getLectureProgress(req.user.userId, lectureId);
  }

  @Delete('course/:courseId/lecture/:lectureId')
  @ApiOperation({ summary: 'Reset lecture progress' })
  @ApiResponse({ status: 200, description: 'Lecture progress reset successfully' })
  async resetLectureProgress(
    @Param('courseId') courseId: string,
    @Param('lectureId') lectureId: string,
    @Request() req
  ) {
    await this.progressService.updateProgress(req.user.userId, courseId, lectureId, {
      progressPercentage: 0,
      isCompleted: false,
      timeSpent: 0
    });
    return { message: 'Lecture progress reset successfully' };
  }

  @Get('user/summary')
  @ApiOperation({ summary: 'Get user overall progress summary' })
  @ApiResponse({ status: 200, description: 'User progress summary retrieved successfully' })
  async getUserProgressSummary(@Request() req) {
    return this.progressService.getUserProgress(req.user.userId, req.query.courseId);
  }
}
