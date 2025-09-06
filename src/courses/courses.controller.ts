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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoursesService } from './courses.service';
import { LecturesService } from './services/lectures.service';
import { EnrollmentsService } from './services/enrollments.service';
import { S3Service } from '../common/services/s3.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  QueryCourseDto,
  PublishCourseDto,
  UploadFileDto,
  FileUploadResponseDto,
  FileType,
} from './dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly lecturesService: LecturesService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    return this.coursesService.create(createCourseDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all courses with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll(@Query() queryDto: QueryCourseDto) {
    return this.coursesService.findAll(queryDto);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured courses' })
  @ApiResponse({ status: 200, description: 'Featured courses retrieved successfully' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.coursesService.getFeaturedCourses(limit);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular courses' })
  @ApiResponse({ status: 200, description: 'Popular courses retrieved successfully' })
  async getPopular(@Query('limit') limit?: number) {
    return this.coursesService.getPopularCourses(limit);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all course categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.coursesService.getCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all course tags' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  async getTags() {
    return this.coursesService.getTags();
  }

  @Get('instructor/:instructorId')
  @ApiOperation({ summary: 'Get courses by instructor' })
  @ApiResponse({ status: 200, description: 'Instructor courses retrieved successfully' })
  async getInstructorCourses(
    @Param('instructorId') instructorId: string,
    @Query() queryDto: QueryCourseDto,
  ) {
    return this.coursesService.getInstructorCourses(instructorId, queryDto);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user courses' })
  @ApiResponse({ status: 200, description: 'User courses retrieved successfully' })
  async getMyCourses(@Request() req, @Query() queryDto: QueryCourseDto) {
    return this.coursesService.getInstructorCourses(req.user.userId, queryDto);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req,
  ) {
    return this.coursesService.update(id, updateCourseDto, req.user.userId, req.user.role);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course status (publish/unpublish)' })
  @ApiResponse({ status: 200, description: 'Course status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() publishCourseDto: PublishCourseDto,
    @Request() req,
  ) {
    return this.coursesService.updateStatus(id, publishCourseDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.coursesService.remove(id, req.user.userId, req.user.role);
    return { message: 'Course deleted successfully' };
  }

  @Post(':id/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file for course (thumbnail, preview video, resources)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        fileType: {
          type: 'string',
          enum: Object.values(FileType),
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully', type: FileUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or file type' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  async uploadFile(
    @Param('id') courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
    @Request() req,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Verify course ownership
    const course = await this.coursesService.findOne(courseId);
    if (course.instructor.toString() !== req.user.userId && req.user.role !== 'admin') {
      throw new BadRequestException('You can only upload files to your own courses');
    }

    let uploadResult;

    switch (uploadDto.fileType) {
      case FileType.THUMBNAIL:
        uploadResult = await this.s3Service.uploadCourseImage(file);
        // Update course thumbnail
        await this.coursesService.update(
          courseId,
          { thumbnail: uploadResult.url },
          req.user.userId,
          req.user.role,
        );
        break;
      case FileType.PREVIEW_VIDEO:
        uploadResult = await this.s3Service.uploadCourseVideo(file);
        // Update course preview video
        await this.coursesService.update(
          courseId,
          { previewVideo: uploadResult.url },
          req.user.userId,
          req.user.role,
        );
        break;
      case FileType.COURSE_RESOURCE:
        uploadResult = await this.s3Service.uploadCourseResource(file);
        break;
      default:
        throw new BadRequestException('Invalid file type');
    }

    return {
      key: uploadResult.key,
      url: uploadResult.url,
      bucket: uploadResult.bucket,
      fileType: uploadDto.fileType,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get(':id/structure')
  @ApiOperation({ summary: 'Get complete course structure with sections and lectures' })
  @ApiResponse({ status: 200, description: 'Course structure retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseStructure(@Param('id') courseId: string) {
    return this.lecturesService.getCourseStructure(courseId);
  }

  @Get(':id/enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course enrollments (instructor/admin only)' })
  @ApiResponse({ status: 200, description: 'Course enrollments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner or admin' })
  async getCourseEnrollments(@Param('id') courseId: string, @Request() req) {
    // Verify course ownership or admin role
    const course = await this.coursesService.findOne(courseId);
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.userId) {
      throw new BadRequestException('You can only view enrollments for your own courses');
    }
    
    return this.enrollmentsService.getCourseEnrollments(courseId);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course analytics (instructor/admin only)' })
  @ApiResponse({ status: 200, description: 'Course analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner or admin' })
  async getCourseAnalytics(@Param('id') courseId: string, @Request() req) {
    // Verify course ownership or admin role
    const course = await this.coursesService.findOne(courseId);
    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.userId) {
      throw new BadRequestException('You can only view analytics for your own courses');
    }

    const enrollmentStats = await this.enrollmentsService.getEnrollmentStats(courseId);

    return {
      enrollmentStats,
    };
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a course (instructor/admin only)' })
  @ApiResponse({ status: 201, description: 'Course duplicated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner or admin' })
  async duplicateCourse(@Param('id') courseId: string, @Request() req) {
    const originalCourse = await this.coursesService.findOne(courseId);
    
    // Verify course ownership or admin role
    if (req.user.role !== 'admin' && originalCourse.instructor.toString() !== req.user.userId) {
      throw new BadRequestException('You can only duplicate your own courses');
    }

    // Create new course with modified title
    const duplicateData = {
      title: `${originalCourse.title} (Copy)`,
      description: originalCourse.description,
      shortDescription: originalCourse.shortDescription,
      level: originalCourse.level,
      language: originalCourse.language,
      duration: originalCourse.duration,
      price: originalCourse.price,
      type: originalCourse.type,
      categories: originalCourse.categories,
      tags: originalCourse.tags,
      requirements: originalCourse.requirements,
      whatYouWillLearn: originalCourse.whatYouWillLearn,
      targetAudience: originalCourse.targetAudience,
      metaTitle: originalCourse.metaTitle,
      metaDescription: originalCourse.metaDescription,
      metaKeywords: originalCourse.metaKeywords,
      status: 'draft' as any,
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0,
    };

    return this.coursesService.create(duplicateData, req.user.userId);
  }
}
