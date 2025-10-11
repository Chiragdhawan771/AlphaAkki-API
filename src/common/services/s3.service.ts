import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface InitiateMultipartUploadResult {
  key: string;
  uploadId: string;
  bucket: string;
}

export interface MultipartUploadPartUrl {
  partNumber: number;
  url: string;
}

export interface CompleteMultipartUploadPart {
  partNumber: number;
  eTag: string;
}

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are not properly configured');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('AWS S3 bucket name is not configured');
    }
    this.bucketName = bucketName;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    allowedMimeTypes?: string[],
    metadata?: Record<string, string | undefined>
  ): Promise<UploadResult> {
    // Validate file type if specified
    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
      );
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: metadata
          ? Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
              if (typeof value === 'string') {
                acc[key] = value;
              }
              return acc;
            }, {})
          : undefined,
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

      return {
        key,
        url,
        bucket: this.bucketName,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      throw new BadRequestException(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async getObjectMetadata(key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return response;
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve object metadata: ${error.message}`);
    }
  }

  // Specific upload methods for different file types
  async uploadCourseImage(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return this.uploadFile(file, 'courses/images', allowedTypes);
  }

  async uploadCourseVideo(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    return this.uploadFile(file, 'courses/videos', allowedTypes);
  }

  async uploadCourseResource(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    return this.uploadFile(file, 'courses/resources', allowedTypes);
  }

  async uploadLectureVideo(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi',"video/quicktime"];
    const maxSizeBytes = 5 * 1024 * 1024 * 1024; // 5GB limit
    
    // Additional validation for video files
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSizeBytes / (1024 * 1024)}MB`);
    }
    
    return this.uploadFile(file, 'lectures/videos', allowedTypes);
  }

  async uploadLectureResource(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    return this.uploadFile(file, 'lectures/resources', allowedTypes);
  }

  async uploadLectureAudio(file: Express.Multer.File): Promise<UploadResult> {
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac'];
    const maxSizeBytes = 100 * 1024 * 1024; // 100MB limit for audio
    
    // Additional validation for audio files
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxSizeBytes / (1024 * 1024)}MB`);
    }
    
    return this.uploadFile(file, 'lectures/audio', allowedTypes);
  }

  async initiateMultipartUpload(
    fileName: string,
    folder: string,
    contentType: string,
    metadata?: Record<string, string | undefined>,
  ): Promise<InitiateMultipartUploadResult> {
    const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
    const uniqueName = fileExtension ? `${uuidv4()}.${fileExtension}` : uuidv4();
    const key = `${folder.replace(/\/+$/g, '')}/${uniqueName}`;

    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: metadata
        ? Object.entries(metadata).reduce<Record<string, string>>((acc, [metaKey, value]) => {
            if (typeof value === 'string') {
              acc[metaKey] = value;
            }
            return acc;
          }, {})
        : undefined,
    });

    try {
      const response = await this.s3Client.send(command);
      if (!response.UploadId) {
        throw new BadRequestException('Failed to initiate multipart upload. Missing upload ID');
      }

      return {
        key,
        uploadId: response.UploadId,
        bucket: this.bucketName,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to initiate multipart upload: ${error.message}`);
    }
  }

  async getMultipartUploadPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresInSeconds = 900,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      throw new BadRequestException(`Failed to generate presigned URL for part ${partNumber}: ${error.message}`);
    }
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: CompleteMultipartUploadPart[],
  ): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({ PartNumber: part.partNumber, ETag: part.eTag })),
      },
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(`Failed to complete multipart upload: ${error.message}`);
    }
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(`Failed to abort multipart upload: ${error.message}`);
    }
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
  }
}
