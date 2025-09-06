import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Section, SectionDocument } from '../schemas/section.schema';
import { Course, CourseDocument } from '../schemas/course.schema';
import { CreateSectionDto, UpdateSectionDto } from '../dto';

@Injectable()
export class SectionsService {
  constructor(
    @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async create(courseId: string, createSectionDto: CreateSectionDto, userId: string, userRole: string): Promise<Section> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Verify course exists and user has permission
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only add sections to your own courses');
    }

    // Check if order already exists
    const existingSection = await this.sectionModel.findOne({ 
      course: courseId, 
      order: createSectionDto.order 
    });
    
    if (existingSection) {
      throw new BadRequestException('A section with this order already exists');
    }

    const sectionData = {
      ...createSectionDto,
      course: new Types.ObjectId(courseId),
    };

    const section = new this.sectionModel(sectionData);
    return section.save();
  }

  async findByCourse(courseId: string): Promise<Section[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.sectionModel
      .find({ course: courseId, isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Section> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid section ID');
    }

    const section = await this.sectionModel.findById(id).exec();
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async update(id: string, updateSectionDto: UpdateSectionDto, userId: string, userRole: string): Promise<Section> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid section ID');
    }

    const section = await this.sectionModel.findById(id).populate('course');
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Check permissions
    const course = section.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update sections in your own courses');
    }

    // Check if new order conflicts with existing sections
    if (updateSectionDto.order !== undefined && updateSectionDto.order !== section.order) {
      const existingSection = await this.sectionModel.findOne({
        course: section.course,
        order: updateSectionDto.order,
        _id: { $ne: id }
      });

      if (existingSection) {
        throw new BadRequestException('A section with this order already exists');
      }
    }

    const updatedSection = await this.sectionModel
      .findByIdAndUpdate(id, updateSectionDto, { new: true })
      .exec();

    if (!updatedSection) {
      throw new NotFoundException('Section not found after update');
    }

    return updatedSection;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid section ID');
    }

    const section = await this.sectionModel.findById(id).populate('course');
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Check permissions
    const course = section.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only delete sections from your own courses');
    }

    await this.sectionModel.findByIdAndDelete(id);
  }

  async reorderSections(courseId: string, sectionOrders: { id: string; order: number }[], userId: string, userRole: string): Promise<Section[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    // Verify course exists and user has permission
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only reorder sections in your own courses');
    }

    // Update all sections with new orders
    const updatePromises = sectionOrders.map(({ id, order }) => 
      this.sectionModel.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    // Return updated sections
    return this.findByCourse(courseId);
  }

  async updateSectionStats(sectionId: string): Promise<void> {
    // This method will be called when lectures are added/removed/updated
    // to update section duration and lecture count
    const lectureStats = await this.sectionModel.aggregate([
      { $match: { _id: new Types.ObjectId(sectionId) } },
      {
        $lookup: {
          from: 'lectures',
          localField: '_id',
          foreignField: 'section',
          as: 'lectures'
        }
      },
      {
        $project: {
          lectureCount: { $size: '$lectures' },
          duration: { $sum: '$lectures.duration' }
        }
      }
    ]);

    if (lectureStats.length > 0) {
      await this.sectionModel.findByIdAndUpdate(sectionId, {
        lectureCount: lectureStats[0].lectureCount,
        duration: lectureStats[0].duration
      });
    }
  }
}
