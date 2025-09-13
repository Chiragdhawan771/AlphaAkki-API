import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LecturesService } from '../services/lectures.service';
import { UpdateLectureDto } from '../dto';

@ApiTags('lectures')
@Controller('lectures')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LecturesController {
  constructor(
    private readonly lecturesService: LecturesService,
  ) {}


  @Get(':id')
  @ApiOperation({ summary: 'Get lecture by ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async findOne(@Param('id') id: string) {
    return this.lecturesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lecture content' })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async updateLectureContent(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @Request() req,
  ) {
    return this.lecturesService.update(id, updateLectureDto, req.user.userId, req.user.role);
  }

}
