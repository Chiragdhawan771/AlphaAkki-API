import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument, CourseStatus } from './schemas/course.schema';
import { CreateCourseDto, UpdateCourseDto, QueryCourseDto, PublishCourseDto } from './dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  ) {}

  async create(createCourseDto: CreateCourseDto, instructorId: string): Promise<Course> {
    // Generate slug from title
    const slug = this.generateSlug(createCourseDto.title);
    
    // Check if slug already exists
    const existingCourse = await this.courseModel.findOne({ slug });
    if (existingCourse) {
      throw new BadRequestException('A course with this title already exists');
    }

    const courseData = {
      ...createCourseDto,
      instructor: new Types.ObjectId(instructorId),
      slug,
    };

    const course = new this.courseModel(courseData);
    return course.save();
  }

  async findAll(queryDto: QueryCourseDto) {
    const {
      search,
      level,
      type,
      status,
      category,
      instructor,
      isFeatured,
      minPrice,
      maxPrice,
      minRating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = queryDto;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (level) {
      filter.level = level;
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.categories = { $in: [category] };
    }

    if (instructor) {
      filter.instructor = new Types.ObjectId(instructor);
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = minPrice;
      if (maxPrice !== undefined) filter.price.$lte = maxPrice;
    }

    if (minRating !== undefined) {
      filter.rating = { $gte: minRating };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [courses, total] = await Promise.all([
      this.courseModel
        .find(filter)
        .populate('instructor', 'firstName lastName email profilePicture')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(filter),
    ]);

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid course ID');
    }

    const course = await this.courseModel
      .findById(id)
      .populate('instructor', 'firstName lastName email profilePicture bio')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseModel
      .findOne({ slug })
      .populate('instructor', 'firstName lastName email profilePicture bio')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, userId: string, userRole: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid course ID');
    }

    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // If title is being updated, regenerate slug
    if (updateCourseDto.title && updateCourseDto.title !== course.title) {
      const newSlug = this.generateSlug(updateCourseDto.title);
      const existingCourse = await this.courseModel.findOne({ slug: newSlug, _id: { $ne: id } });
      if (existingCourse) {
        throw new BadRequestException('A course with this title already exists');
      }
      updateCourseDto['slug'] = newSlug;
    }

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, updateCourseDto, { new: true })
      .populate('instructor', 'firstName lastName email profilePicture')
      .exec();

    if (!updatedCourse) {
      throw new NotFoundException('Course not found after update');
    }

    return updatedCourse;
  }

  async updateStatus(id: string, publishCourseDto: PublishCourseDto, userId: string, userRole: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid course ID');
    }

    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    const updateData: any = { status: publishCourseDto.status };

    // Set publishedAt when publishing
    if (publishCourseDto.status === CourseStatus.PUBLISHED && course.status !== CourseStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('instructor', 'firstName lastName email profilePicture')
      .exec();

    if (!updatedCourse) {
      throw new NotFoundException('Course not found after update');
    }

    return updatedCourse;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid course ID');
    }

    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (userRole !== 'admin' && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    await this.courseModel.findByIdAndDelete(id);
  }

  async getInstructorCourses(instructorId: string, queryDto: QueryCourseDto) {
    const query = { ...queryDto, instructor: instructorId };
    return this.findAll(query);
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.courseModel.distinct('categories');
    return categories.filter(cat => cat && cat.trim() !== '');
  }

  async getTags(): Promise<string[]> {
    const tags = await this.courseModel.distinct('tags');
    return tags.filter(tag => tag && tag.trim() !== '');
  }

  async getFeaturedCourses(limit: number = 6) {
    return this.courseModel
      .find({ isFeatured: true, status: CourseStatus.PUBLISHED })
      .populate('instructor', 'firstName lastName email profilePicture')
      .sort({ rating: -1, enrollmentCount: -1 })
      .limit(limit)
      .exec();
  }

  async getPopularCourses(limit: number = 10) {
    return this.courseModel
      .find({ status: CourseStatus.PUBLISHED })
      .populate('instructor', 'firstName lastName email profilePicture')
      .sort({ enrollmentCount: -1, rating: -1 })
      .limit(limit)
      .exec();
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
