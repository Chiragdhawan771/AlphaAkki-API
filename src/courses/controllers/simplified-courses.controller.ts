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
  UploadedFiles,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SimplifiedCoursesService } from '../services/simplified-courses.service';
import {
  CreateSimplifiedCourseDto,
  UpdateSimplifiedCourseDto,
  AddVideoDto,
  EnrollCourseDto,
} from '../dto/simplified-course.dto';
import { S3Service } from '../../common/services/s3.service';

@ApiTags('simplified-courses')
@Controller('simplified-courses')
export class SimplifiedCoursesController {
  constructor(
    private readonly coursesService: SimplifiedCoursesService,
    private readonly s3Service: S3Service,
  ) { }

  // Admin: Create course
  @Post()
@UseGuards(JwtAuthGuard)
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'previewVideo', maxCount: 1 },
  ]),
)
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Create a new course (Admin only)' })
async create(
  @UploadedFiles()
  files: { thumbnail?: Express.Multer.File[]; previewVideo?: Express.Multer.File[] },
  @Body() body: any, // raw FormData strings
  @Request() req,
) {
  if (req.user.role !== 'admin') {
    throw new BadRequestException('Only admins can create courses');
  }

  if (!files.thumbnail || !files.previewVideo) {
    throw new BadRequestException('Thumbnail and preview video are required');
  }

  // Parse and convert fields manually
  const createCourseDto: CreateSimplifiedCourseDto = {
    ...body,
    price: body.price ? Number(body.price) : undefined,
    estimatedDuration: body.estimatedDuration ? Number(body.estimatedDuration) : undefined,
    learningOutcomes: body.learningOutcomes
      ? Array.isArray(body.learningOutcomes)
        ? body.learningOutcomes
        : body.learningOutcomes.split(',')
      : [],
    prerequisites: body.prerequisites
      ? Array.isArray(body.prerequisites)
        ? body.prerequisites
        : body.prerequisites.split(',')
      : [],
    tags: body.tags
      ? Array.isArray(body.tags)
        ? body.tags
        : body.tags.split(',')
      : [],
    type: body.type,
    title: body.title,
    description: body.description,
    shortDescription: body.shortDescription,
    category: body.category,
  };

  // Upload files to S3
  const thumbnailUpload = await this.s3Service.uploadFile(files.thumbnail[0], 'course-thumbnails');
  const previewUpload = await this.s3Service.uploadFile(files.previewVideo[0], 'course-previews');

  // Merge file URLs
  const newCourseData = {
    ...createCourseDto,
    thumbnail: thumbnailUpload.url,
    previewVideo: previewUpload.url,
  };

  // Save to MongoDB
  return this.coursesService.create(newCourseData, req.user._id);
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
  @ApiOperation({
    summary: 'Get course content with videos (enrolled users only)',
  })
  async getCourseContent(@Param('id') id: string, @Request() req) {
    return this.coursesService.getCourseWithVideos(
      id,
      req.user._id,
      req.user.role,
    );
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
    return this.coursesService.markVideoAsWatched(
      id,
      +videoIndex,
      req.user._id,
      req.user.role,
    );
  }

  // User/Admin: Get secure video stream URL
  @Get(':id/videos/:videoIndex/stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get secure video stream URL' })
  async getVideoStream(
    @Param('id') id: string,
    @Param('videoIndex') videoIndex: number,
    @Request() req,
  ) {
    return this.coursesService.getSecureVideoUrl(
      id,
      +videoIndex,
      req.user._id,
      req.user.role,
    );
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

    const newVideo = await this.coursesService.addVideo(
      id,
      addVideoDto,
      uploadResult.url,
      uploadResult.key,
      req.user._id,
      req.user.role,
    );

    return {
      video: newVideo,
    };
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
    return this.coursesService.removeVideo(
      id,
      +videoIndex,
      req.user._id,
      req.user.role,
    );
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'previewVideo', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update course (Admin only)' })
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: { thumbnail?: Express.Multer.File[]; previewVideo?: Express.Multer.File[] },
    @Body() updateCourseDto: UpdateSimplifiedCourseDto,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Only admins can update courses');
    }

    // Upload files if provided
    if (files.thumbnail) {
      const thumbnailUpload = await this.s3Service.uploadFile(files.thumbnail[0], 'course-thumbnails');
      updateCourseDto.thumbnail = thumbnailUpload.url;
    }

    if (files.previewVideo) {
      const previewUpload = await this.s3Service.uploadFile(files.previewVideo[0], 'course-previews');
      updateCourseDto.previewVideo = previewUpload.url;
    }

    // Call the service to update the course
    return this.coursesService.update(
      id,
      updateCourseDto,
      req.user._id,
      req.user.role,
    );
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
