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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SectionsService } from '../services/sections.service';
import { CreateSectionDto, UpdateSectionDto } from '../dto';

@ApiTags('sections')
@Controller('courses/:courseId/sections')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new section in a course' })
  @ApiResponse({ status: 201, description: 'Section created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(
    @Param('courseId') courseId: string,
    @Body() createSectionDto: CreateSectionDto,
    @Request() req,
  ) {
    return this.sectionsService.create(courseId, createSectionDto, req.user.userId, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sections for a course' })
  @ApiResponse({ status: 200, description: 'Sections retrieved successfully' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.sectionsService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get section by ID' })
  @ApiResponse({ status: 200, description: 'Section retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async findOne(@Param('id') id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async update(
    @Param('id') id: string,
    @Body() updateSectionDto: UpdateSectionDto,
    @Request() req,
  ) {
    return this.sectionsService.update(id, updateSectionDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete section' })
  @ApiResponse({ status: 200, description: 'Section deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  @ApiResponse({ status: 404, description: 'Section not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.sectionsService.remove(id, req.user.userId, req.user.role);
    return { message: 'Section deleted successfully' };
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Reorder sections in a course' })
  @ApiResponse({ status: 200, description: 'Sections reordered successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not course owner' })
  async reorder(
    @Param('courseId') courseId: string,
    @Body() sectionOrders: { id: string; order: number }[],
    @Request() req,
  ) {
    return this.sectionsService.reorderSections(courseId, sectionOrders, req.user.userId, req.user.role);
  }
}
