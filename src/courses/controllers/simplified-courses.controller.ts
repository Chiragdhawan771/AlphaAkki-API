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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SimplifiedCoursesService } from '../services/simplified-courses.service';
import { CreateSimplifiedCourseDto, UpdateSimplifiedCourseDto, AddVideoDto, EnrollCourseDto } from '../dto/simplified-course.dto';
import { S3Service } from '../../common/services/s3.service';

@ApiTags('simplified-courses')
@Controller('simplified-courses')
export class SimplifiedCoursesController {
  constructor(
    private readonly coursesService: SimplifiedCoursesService,
    private readonly s3Service: S3Service,
  ) {}

  // Admin: Create course
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(@Body() createCourseDto: CreateSimplifiedCourseDto, @Request() req) {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can create courses');
    }
    return this.coursesService.create(createCourseDto, req.user._id);
  }

  // Admin: Get instructor's courses
  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get courses created by instructor (Admin only)' })
  async getInstructorCourses(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can access this endpoint');
    }
    return this.coursesService.findByInstructor(req.user._id);
  }

  // Public: Get all published courses
  @Get('published')
  @ApiOperation({ summary: 'Get all published courses' })
  async getPublishedCourses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.coursesService.findAllPublished(page || 1, limit || 10, search);
  }

  // User: Enroll in course
  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enroll in a course' })
  async enrollInCourse(
    @Param('id') id: string,
    @Body() enrollDto: EnrollCourseDto,
    @Request() req,
  ) {
    return this.coursesService.enrollInCourse(id, req.user._id, enrollDto);
  }

  // User: Get enrolled courses
  @Get('enrolled')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user enrolled courses' })
  async getEnrolledCourses(@Request() req) {
    return this.coursesService.getEnrolledCourses(req.user._id);
  }

  // User: Get course content (only if enrolled)
  @Get(':id/content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get course content with videos (enrolled users only)' })
  async getCourseContent(@Param('id') id: string, @Request() req) {
    return this.coursesService.getCourseWithVideos(id, req.user._id);
  }

  // User: Mark video as watched
  @Post(':id/videos/:videoIndex/watch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark video as watched' })
  async markVideoAsWatched(
    @Param('id') id: string,
    @Param('videoIndex') videoIndex: number,
    @Request() req,
  ) {
    return this.coursesService.markVideoAsWatched(id, +videoIndex, req.user._id);
  }

  // Admin: Add video to course
  @Post(':id/videos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('video'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add video to course (Admin only)' })
  async addVideo(
    @Param('id') id: string,
    @Body() addVideoDto: AddVideoDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can add videos');
    }
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    // Upload video to S3
    const uploadResult = await this.s3Service.uploadFile(file, 'course-videos');
    
    return this.coursesService.addVideo(
      id,
      addVideoDto,
      uploadResult.url,
      uploadResult.key,
      req.user._id,
      req.user.role,
    );
  }

  // Admin: Remove video from course
  @Delete(':id/videos/:videoIndex')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove video from course (Admin only)' })
  async removeVideo(
    @Param('id') id: string,
    @Param('videoIndex') videoIndex: number,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can remove videos');
    }
    return this.coursesService.removeVideo(id, +videoIndex, req.user._id, req.user.role);
  }

  // Admin: Get single course
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get course by ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.coursesService.findOne(id, req.user._id, req.user.role);
  }

  // Admin: Update course
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update course (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateSimplifiedCourseDto,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can update courses');
    }
    return this.coursesService.update(id, updateCourseDto, req.user._id, req.user.role);
  }

  // Admin: Delete course
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete course (Admin only)' })
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can delete courses');
    }
    return this.coursesService.remove(id, req.user._id, req.user.role);
  }
}
