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

  // COMPREHENSIVE CORS CONFIGURATION - ALLOWS EVERYTHING
  app.enableCors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'], // All HTTP methods
    allowedHeaders: [
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'X-Api-Version',
      'X-CSRF-Token',
      'X-Requested-With',
      'Authorization',
      'Bearer',
      'Cache-Control',
      'Pragma',
      'Expires',
      'Last-Modified',
      'If-Modified-Since',
      'X-Custom-Header',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials',
      'Access-Control-Expose-Headers',
      'Access-Control-Max-Age',
      'Origin',
      'Referer',
      'User-Agent'
    ], // All common headers
    exposedHeaders: [
      'X-Total-Count',
      'X-Custom-Header',
      'Authorization',
      'Content-Range',
      'Accept-Ranges'
    ], // Headers exposed to frontend
    credentials: false, // Must be false when origin is '*'
    maxAge: 86400, // 24 hours preflight cache
    preflightContinue: false,
    optionsSuccessStatus: 200 // For legacy browser support
  });

  // ADDITIONAL MIDDLEWARE FOR ABSOLUTE CORS FREEDOM
  app.use((req, res, next) => {
    // Handle preflight OPTIONS requests manually
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
      res.header('Access-Control-Allow-Headers', '*');
      res.header('Access-Control-Allow-Credentials', 'false');
      res.header('Access-Control-Max-Age', '86400');
      res.header('Content-Length', '0');
      res.status(204).end();
      return;
    }

    // Set CORS headers for all requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Expose-Headers', '*');
    
    next();
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
  console.log('🔓 CORS completely disabled - All origins, methods, and headers allowed');
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
