import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lecture, LectureDocument } from '../schemas/lecture.schema';
import { Course, CourseDocument } from '../schemas/course.schema';
import { CreateLectureDto, UpdateLectureDto } from '../dto';

@Injectable()
export class LecturesService {
  constructor(
    @InjectModel(Lecture.name) private lectureModel: Model<LectureDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async findOne(id: string): Promise<Lecture> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid lecture ID');
    }

    const lecture = await this.lectureModel.findById(id).exec();
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

    const course = lecture.course as any;
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update your own lectures');
    }

    // Update lecture fields
    Object.assign(lecture, updateLectureDto);
    const updatedLecture = await lecture.save();

    return updatedLecture;
  }
}
