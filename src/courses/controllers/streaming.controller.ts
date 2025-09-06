import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
  Headers,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StreamingService } from '../services/streaming.service';

@ApiTags('streaming')
@Controller('streaming')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get('video/:lectureId')
  @ApiOperation({ summary: 'Stream video content for a lecture' })
  @ApiResponse({ status: 200, description: 'Video stream started' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled or payment required' })
  @ApiResponse({ status: 404, description: 'Lecture or video not found' })
  async streamVideo(
    @Param('lectureId') lectureId: string,
    @Request() req,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    return this.streamingService.streamVideo(lectureId, req.user.userId, res, range);
  }

  @Get('video/:lectureId/url')
  @ApiOperation({ summary: 'Get signed URL for video streaming' })
  @ApiResponse({ status: 200, description: 'Video stream URL generated' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled or payment required' })
  async getVideoStreamUrl(@Param('lectureId') lectureId: string, @Request() req) {
    const streamUrl = await this.streamingService.getVideoStreamUrl(lectureId, req.user.userId);
    return { streamUrl };
  }

  @Get('audio/:lectureId/url')
  @ApiOperation({ summary: 'Get signed URL for audio streaming' })
  @ApiResponse({ status: 200, description: 'Audio stream URL generated' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled or payment required' })
  async getAudioStreamUrl(@Param('lectureId') lectureId: string, @Request() req) {
    const streamUrl = await this.streamingService.getAudioStreamUrl(lectureId, req.user.userId);
    return { streamUrl };
  }

  @Get('lecture/:lectureId/metadata')
  @ApiOperation({ summary: 'Get video metadata and playback information' })
  @ApiResponse({ status: 200, description: 'Video metadata retrieved' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled or payment required' })
  async getVideoMetadata(@Param('lectureId') lectureId: string, @Request() req) {
    return this.streamingService.getVideoMetadata(lectureId, req.user.userId);
  }

  @Get('lecture/:lectureId/resource/:resourceIndex/download')
  @ApiOperation({ summary: 'Download lecture resource' })
  @ApiResponse({ status: 200, description: 'Resource download URL generated' })
  @ApiResponse({ status: 403, description: 'Access denied or download not allowed' })
  async downloadResource(
    @Param('lectureId') lectureId: string,
    @Param('resourceIndex') resourceIndex: number,
    @Request() req,
  ) {
    const downloadUrl = await this.streamingService.downloadResource(
      lectureId,
      resourceIndex,
      req.user.userId,
    );
    return { downloadUrl };
  }

  @Get('course/:courseId/playlist')
  @ApiOperation({ summary: 'Generate video playlist for course' })
  @ApiResponse({ status: 200, description: 'Course playlist generated' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled' })
  async generatePlaylist(@Param('courseId') courseId: string, @Request() req) {
    const playlist = await this.streamingService.generatePlaylist(courseId, req.user.userId);
    return { playlist };
  }
}
