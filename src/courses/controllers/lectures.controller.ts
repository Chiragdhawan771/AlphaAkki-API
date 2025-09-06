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
  Put,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LecturesService } from '../services/lectures.service';
import { S3Service } from '../../common/services/s3.service';
import { CreateLectureDto, UpdateLectureDto } from '../dto';

@ApiTags('lectures')
@Controller('lectures')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LecturesController {
  constructor(
    private readonly lecturesService: LecturesService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lecture' })
  @ApiResponse({ status: 201, description: 'Lecture created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  async create(@Body() createLectureDto: CreateLectureDto, @Request() req) {
    return this.lecturesService.create(createLectureDto, req.user.userId, req.user.role);
  }

  @Get('section/:sectionId')
  @ApiOperation({ summary: 'Get all lectures for a section' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  async findBySection(@Param('sectionId') sectionId: string) {
    return this.lecturesService.findBySection(sectionId);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get all lectures for a course' })
  @ApiResponse({ status: 200, description: 'Lectures retrieved successfully' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.lecturesService.findByCourse(courseId);
  }

  @Get('course/:courseId/structure')
  @ApiOperation({ summary: 'Get complete course structure with sections and lectures' })
  @ApiResponse({ status: 200, description: 'Course structure retrieved successfully' })
  async getCourseStructure(@Param('courseId') courseId: string) {
    return this.lecturesService.getCourseStructure(courseId);
  }

  @Get('course/:courseId/free')
  @ApiOperation({ summary: 'Get free preview lectures for a course' })
  @ApiResponse({ status: 200, description: 'Free lectures retrieved successfully' })
  async getFreeLectures(@Param('courseId') courseId: string) {
    return this.lecturesService.getFreeLectures(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lecture by ID' })
  @ApiResponse({ status: 200, description: 'Lecture retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async findOne(@Param('id') id: string) {
    return this.lecturesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lecture' })
  @ApiResponse({ status: 200, description: 'Lecture updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLectureDto: UpdateLectureDto,
    @Request() req,
  ) {
    return this.lecturesService.update(id, updateLectureDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete lecture' })
  @ApiResponse({ status: 200, description: 'Lecture deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Lecture not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.lecturesService.remove(id, req.user.userId, req.user.role);
    return { message: 'Lecture deleted successfully' };
  }

  @Put('section/:sectionId/reorder')
  @ApiOperation({ summary: 'Reorder lectures in a section' })
  @ApiResponse({ status: 200, description: 'Lectures reordered successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  async reorder(
    @Param('sectionId') sectionId: string,
    @Body() lectureOrders: { id: string; order: number }[],
    @Request() req,
  ) {
    return this.lecturesService.reorderLectures(sectionId, lectureOrders, req.user.userId, req.user.role);
  }

  @Post(':id/upload/:contentType')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload content for lecture (video, audio, pdf, thumbnail, resources)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Content uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or content type' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  async uploadContent(
    @Param('id') lectureId: string,
    @Param('contentType') contentType: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let uploadResult;
    let contentData: any = {};

    switch (contentType) {
      case 'video':
        uploadResult = await this.s3Service.uploadLectureVideo(file);
        contentData = {
          url: uploadResult.url,
          key: uploadResult.key,
        };
        break;
      case 'audio':
        uploadResult = await this.s3Service.uploadLectureResource(file);
        contentData = {
          url: uploadResult.url,
          key: uploadResult.key,
        };
        break;
      case 'pdf':
        uploadResult = await this.s3Service.uploadLectureResource(file);
        contentData = {
          url: uploadResult.url,
          key: uploadResult.key,
        };
        break;
      case 'thumbnail':
        uploadResult = await this.s3Service.uploadCourseImage(file);
        contentData = {
          url: uploadResult.url,
        };
        break;
      case 'resources':
        uploadResult = await this.s3Service.uploadLectureResource(file);
        contentData = {
          name: file.originalname,
          url: uploadResult.url,
          key: uploadResult.key,
          size: file.size,
          type: file.mimetype,
        };
        break;
      default:
        throw new BadRequestException('Invalid content type');
    }

    const updatedLecture = await this.lecturesService.updateLectureContent(
      lectureId,
      contentType,
      contentData,
      req.user.userId,
      req.user.role,
    );

    return {
      lecture: updatedLecture,
      uploadResult,
    };
  }
}
