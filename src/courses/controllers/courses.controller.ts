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
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SimplifiedCoursesService } from '../services/simplified-courses.service';
import { CreateSimplifiedCourseDto, UpdateSimplifiedCourseDto, EnrollCourseDto } from '../dto/simplified-course.dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly simplifiedCoursesService: SimplifiedCoursesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(@Body() createCourseDto: CreateSimplifiedCourseDto, @Request() req) {
    return this.simplifiedCoursesService.create(createCourseDto, req.user._id);
  }

  @Get('published')
  @ApiOperation({ summary: 'Get all published courses' })
  async getPublishedCourses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.simplifiedCoursesService.findAllPublished(page || 1, limit || 10, search);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get instructor courses' })
  async getInstructorCourses(@Request() req) {
    return this.simplifiedCoursesService.findByInstructor(req.user._id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID (public access)' })
  async findOne(@Param('id') id: string) {
    const course = await this.simplifiedCoursesService.findOne(id);
    return {
      success: true,
      data: course
    };
  }

  @Get(':id/structure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course structure with videos (enrolled users only)' })
  async getCourseStructure(@Param('id') id: string, @Request() req) {
    // Use the simplified courses service to get course with videos (includes enrollment check)
    const courseData = await this.simplifiedCoursesService.getCourseWithVideos(id, req.user._id);
    
    if (!courseData || !courseData.course) {
      throw new BadRequestException('Course not found or access denied');
    }
    
    // Transform the videos into sections format for frontend compatibility
    const sections = courseData.course.videos && courseData.course.videos.length > 0 ? [{
      id: 'main-section',
      title: 'Course Content',
      description: 'Main course videos',
      order: 1,
      lectures: courseData.course.videos.map((video: any, index: number) => ({
        id: `video-${index}`,
        title: video.title,
        description: '',
        type: 'video',
        duration: video.duration || 0,
        order: video.order || index + 1,
        videoUrl: video.videoUrl,
        isCompleted: courseData.watchedVideos && courseData.watchedVideos.includes(`${id}_${index}`)
      }))
    }] : [];
    
    return {
      success: true,
      data: {
        course: courseData.course,
        sections,
        enrollment: courseData.enrollment
      }
    };
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a course' })
  async enrollInCourse(
    @Param('id') id: string,
    @Body() enrollDto: EnrollCourseDto,
    @Request() req,
  ) {
    return this.simplifiedCoursesService.enrollInCourse(id, req.user._id, enrollDto);
  }

  @Get('enrolled/my-courses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user enrolled courses' })
  async getEnrolledCourses(@Request() req) {
    return this.simplifiedCoursesService.getEnrolledCourses(req.user._id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update course' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateSimplifiedCourseDto,
    @Request() req,
  ) {
    return this.simplifiedCoursesService.update(id, updateCourseDto, req.user._id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete course' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.simplifiedCoursesService.remove(id, req.user._id, req.user.role);
  }
}
