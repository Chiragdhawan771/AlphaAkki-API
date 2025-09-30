import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'https://alphaakki.com/',
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('AlphaAkki LMS API')
    .setDescription('Learning Management System API - Only Active & Working Endpoints')
    .setVersion('1.0')
    .addTag('auth', 'Authentication & User Management')
    .addTag('simplified-courses', 'Simplified Course Management')
    .addTag('lectures', 'Lecture Content Management')
    .addTag('enrollments', 'Course Enrollments')
    .addTag('progress', 'Learning Progress Tracking')
    .addTag('streaming', 'Video & Resource Streaming')
    .addTag('payments', 'Payment Processing')
    .addTag('reviews', 'Course Reviews & Ratings')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  console.log('📚 Swagger documentation available at: http://localhost:3000/api');
  console.log('🧹 API cleaned up - Only active & working endpoints are documented');
  console.log('🏷️  Available API Tags:');
  console.log('   - auth: Authentication & User Management');
  console.log('   - simplified-courses: Course Management');
  console.log('   - lectures: Lecture Content');
  console.log('   - enrollments: Course Enrollments');
  console.log('   - progress: Learning Progress');
  console.log('   - streaming: Video Streaming');
  console.log('   - payments: Payment Processing');
  console.log('   - reviews: Course Reviews');
  
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  await app.listen(port, '0.0.0.0');
}
bootstrap();
