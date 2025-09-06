import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lecture, LectureDocument } from '../schemas/lecture.schema';
import { Section, SectionDocument } from '../schemas/section.schema';
import { Course, CourseDocument } from '../schemas/course.schema';
import { CreateLectureDto, UpdateLectureDto } from '../dto';
import { SectionsService } from './sections.service';

@Injectable()
export class LecturesService {
  constructor(
    @InjectModel(Lecture.name) private lectureModel: Model<LectureDocument>,
    @InjectModel(Section.name) private sectionModel: Model<SectionDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private sectionsService: SectionsService,
  ) {}

  async create(createLectureDto: CreateLectureDto, userId: string, userRole: string): Promise<Lecture> {
    if (!Types.ObjectId.isValid(createLectureDto.section)) {
      throw new BadRequestException('Invalid section ID');
    }

    // Verify section exists and get course info
    const section = await this.sectionModel.findById(createLectureDto.section).populate('course');
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const course = section.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only add lectures to your own courses');
    }

    // Check if order already exists in this section
    const existingLecture = await this.lectureModel.findOne({
      section: createLectureDto.section,
      order: createLectureDto.order
    });

    if (existingLecture) {
      throw new BadRequestException('A lecture with this order already exists in this section');
    }

    const lectureData = {
      ...createLectureDto,
      course: section.course,
      section: new Types.ObjectId(createLectureDto.section),
    };

    const lecture = new this.lectureModel(lectureData);
    const savedLecture = await lecture.save();

    // Update section stats
    await this.sectionsService.updateSectionStats(createLectureDto.section);

    return savedLecture;
  }

  async findBySection(sectionId: string): Promise<Lecture[]> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestException('Invalid section ID');
    }

    return this.lectureModel
      .find({ section: sectionId, isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  async findByCourse(courseId: string): Promise<Lecture[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.lectureModel
      .find({ course: courseId, isActive: true })
      .populate('section', 'title order')
      .sort({ 'section.order': 1, order: 1 })
      .exec();
  }

  async findOne(id: string): Promise<Lecture> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel
      .findById(id)
      .populate('section', 'title order')
      .populate('course', 'title instructor')
      .exec();

    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    return lecture;
  }

  async update(id: string, updateLectureDto: UpdateLectureDto, userId: string, userRole: string): Promise<Lecture> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel.findById(id).populate('course');
    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check permissions
    const course = lecture.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update lectures in your own courses');
    }

    // Check if new order conflicts with existing lectures in the same section
    if (updateLectureDto.order !== undefined && updateLectureDto.order !== lecture.order) {
      const existingLecture = await this.lectureModel.findOne({
        section: lecture.section,
        order: updateLectureDto.order,
        _id: { $ne: id }
      });

      if (existingLecture) {
        throw new BadRequestException('A lecture with this order already exists in this section');
      }
    }

    const updatedLecture = await this.lectureModel
      .findByIdAndUpdate(id, updateLectureDto, { new: true })
      .populate('section', 'title order')
      .exec();

    if (!updatedLecture) {
      throw new NotFoundException('Lecture not found after update');
    }

    // Update section stats if duration changed
    if (updateLectureDto.duration !== undefined) {
      await this.sectionsService.updateSectionStats(lecture.section.toString());
    }

    return updatedLecture;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel.findById(id).populate('course');
    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check permissions
    const course = lecture.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only delete lectures from your own courses');
    }

    const sectionId = lecture.section.toString();
    await this.lectureModel.findByIdAndDelete(id);

    // Update section stats
    await this.sectionsService.updateSectionStats(sectionId);
  }

  async reorderLectures(sectionId: string, lectureOrders: { id: string; order: number }[], userId: string, userRole: string): Promise<Lecture[]> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new BadRequestException('Invalid section ID');
    }

    // Verify section exists and user has permission
    const section = await this.sectionModel.findById(sectionId).populate('course');
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const course = section.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only reorder lectures in your own courses');
    }

    // Update all lectures with new orders
    const updatePromises = lectureOrders.map(({ id, order }) =>
      this.lectureModel.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    // Return updated lectures
    return this.findBySection(sectionId);
  }

  async getFreeLectures(courseId: string): Promise<Lecture[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    return this.lectureModel
      .find({ course: courseId, isFree: true, isActive: true })
      .populate('section', 'title order')
      .sort({ 'section.order': 1, order: 1 })
      .exec();
  }

  async updateLectureContent(id: string, contentType: string, contentData: any, userId: string, userRole: string): Promise<Lecture> {
    const lecture = await this.lectureModel.findById(id).populate('course');
    if (!lecture) {
      throw new NotFoundException('Lecture not found');
    }

    // Check permissions
    const course = lecture.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update lectures in your own courses');
    }

    let updateData: any = {};

    switch (contentType) {
      case 'video':
        updateData = {
          videoUrl: contentData.url,
          videoKey: contentData.key,
          duration: contentData.duration || lecture.duration,
        };
        break;
      case 'audio':
        updateData = {
          audioUrl: contentData.url,
          audioKey: contentData.key,
          duration: contentData.duration || lecture.duration,
        };
        break;
      case 'pdf':
        updateData = {
          pdfUrl: contentData.url,
          pdfKey: contentData.key,
        };
        break;
      case 'text':
        updateData = {
          content: contentData.content,
        };
        break;
      case 'thumbnail':
        updateData = {
          thumbnail: contentData.url,
        };
        break;
      case 'resources':
        updateData = {
          resources: [...(lecture.resources || []), contentData],
        };
        break;
      default:
        throw new BadRequestException('Invalid content type');
    }

    const updatedLecture = await this.lectureModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('section', 'title order')
      .exec();

    if (!updatedLecture) {
      throw new NotFoundException('Lecture not found after update');
    }

    // Update section stats if duration changed
    if (updateData.duration) {
      await this.sectionsService.updateSectionStats(lecture.section.toString());
    }

    return updatedLecture;
  }

  async getCourseStructure(courseId: string): Promise<any> {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    const sections = await this.sectionModel
      .find({ course: courseId, isActive: true })
      .sort({ order: 1 })
      .exec();

    const sectionsWithLectures = await Promise.all(
      sections.map(async (section) => {
        const lectures = await this.lectureModel
          .find({ section: section._id, isActive: true })
          .sort({ order: 1 })
          .select('title duration type isFree thumbnail order')
          .exec();

        return {
          ...section.toObject(),
          lectures,
        };
      })
    );

    return sectionsWithLectures;
  }
}
