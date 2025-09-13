import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StreamingService } from '../services/streaming.service';

@ApiTags('streaming')
@Controller('streaming')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}


  @Get('video/:lectureId/url')
  @ApiOperation({ summary: 'Get signed URL for video streaming' })
  @ApiResponse({ status: 200, description: 'Video stream URL generated' })
  @ApiResponse({ status: 403, description: 'Access denied - Not enrolled or payment required' })
  async getVideoStreamUrl(@Param('lectureId') lectureId: string, @Request() req) {
    const streamUrl = await this.streamingService.getVideoStreamUrl(lectureId, req.user.userId);
    return { streamUrl };
  }


  @Get('lecture/:lectureId/resource/:resourceIndex/download')
  @ApiOperation({ summary: 'Download lecture resource' })
  @ApiResponse({ status: 200, description: 'Resource download URL generated' })
  @ApiResponse({ status: 403, description: 'Access denied or download not allowed' })
  async getResourceDownloadUrl(
    @Param('lectureId') lectureId: string,
    @Param('resourceIndex') resourceIndex: number,
    @Request() req,
  ) {
    const downloadUrl = await this.streamingService.downloadResource(
      lectureId,
      resourceIndex,
      req.user.userId,
    );
    return { url: downloadUrl };
  }

}
