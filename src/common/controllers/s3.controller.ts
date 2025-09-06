import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { S3Service, UploadResult } from '../services/s3.service';

@ApiTags('File Storage')
@Controller('files')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload a file to S3',
    description: 'Upload any file to AWS S3 storage with optional folder specification'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload'
        },
        folder: {
          type: 'string',
          description: 'Optional folder path (default: uploads)',
          example: 'documents'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'uploads/12345-file.pdf' },
        url: { type: 'string', example: 'https://bucket.s3.region.amazonaws.com/uploads/12345-file.pdf' },
        bucket: { type: 'string', example: 'my-s3-bucket' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or missing file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadFile(file, folder);
  }

  @Post('upload/course-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload course thumbnail image',
    description: 'Upload course thumbnail images (JPEG, PNG, WebP only)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Course image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Course image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'courses/images/12345-thumbnail.jpg' },
        url: { type: 'string', example: 'https://bucket.s3.region.amazonaws.com/courses/images/12345-thumbnail.jpg' },
        bucket: { type: 'string', example: 'my-s3-bucket' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  async uploadCourseImage(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadCourseImage(file);
  }

  @Post('upload/course-video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload course video',
    description: 'Upload course promotional videos (MP4, WebM, OGG only)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Course video file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (MP4, WebM, OGG)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Course video uploaded successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  async uploadCourseVideo(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadCourseVideo(file);
  }

  @Post('upload/course-resource')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload course resource',
    description: 'Upload course resources (PDF, DOC, PPT, TXT, ZIP files)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Course resource file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Resource file (PDF, DOC, PPT, TXT, ZIP)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Course resource uploaded successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  async uploadCourseResource(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadCourseResource(file);
  }

  @Post('upload/lecture-video')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload lecture video',
    description: 'Upload lecture videos (MP4, WebM, OGG only)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Lecture video file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (MP4, WebM, OGG)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Lecture video uploaded successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  async uploadLectureVideo(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadLectureVideo(file);
  }

  @Post('upload/lecture-resource')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload lecture resource',
    description: 'Upload lecture resources (PDF, DOC, PPT, TXT, ZIP files)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Lecture resource file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Resource file (PDF, DOC, PPT, TXT, ZIP)'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Lecture resource uploaded successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or missing file' })
  async uploadLectureResource(@UploadedFile() file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.s3Service.uploadLectureResource(file);
  }

  @Delete(':key')
  @ApiOperation({ 
    summary: 'Delete a file from S3',
    description: 'Delete a file from AWS S3 storage using its key'
  })
  @ApiParam({
    name: 'key',
    description: 'S3 object key (file path)',
    example: 'uploads/12345-file.pdf'
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully'
  })
  @ApiResponse({ status: 400, description: 'Failed to delete file' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('key') key: string): Promise<{ message: string }> {
    await this.s3Service.deleteFile(key);
    return { message: 'File deleted successfully' };
  }

  @Get('signed-url/:key')
  @ApiOperation({ 
    summary: 'Generate signed URL for private file access',
    description: 'Generate a temporary signed URL for accessing private files'
  })
  @ApiParam({
    name: 'key',
    description: 'S3 object key (file path)',
    example: 'uploads/12345-file.pdf'
  })
  @ApiQuery({
    name: 'expiresIn',
    description: 'URL expiration time in seconds (default: 3600)',
    required: false,
    example: 3600
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        signedUrl: { 
          type: 'string', 
          example: 'https://bucket.s3.region.amazonaws.com/uploads/file.pdf?X-Amz-Algorithm=...' 
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Failed to generate signed URL' })
  async getSignedUrl(
    @Param('key') key: string,
    @Query('expiresIn') expiresIn?: number
  ): Promise<{ signedUrl: string }> {
    const signedUrl = await this.s3Service.getSignedUrl(key, expiresIn);
    return { signedUrl };
  }
}
