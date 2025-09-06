# AlphaAkki Course Management API Documentation

## Overview

This comprehensive course management system provides a complete solution for creating, managing, and delivering online courses with video streaming capabilities, progress tracking, and enrollment management.

## Features

### 🎯 Core Features
- **Course Management**: Full CRUD operations with sections and lectures
- **Video Streaming**: Secure video content delivery with S3 integration
- **Progress Tracking**: Detailed learning progress and analytics
- **Enrollment System**: Course enrollment with payment integration
- **Admin Dashboard**: Administrative controls and analytics
- **Content Upload**: Support for videos, PDFs, audio, and resources

### 🔐 Security Features
- JWT-based authentication
- Role-based access control (Admin, Instructor, Student)
- Secure video streaming with signed URLs
- Course ownership validation

## API Endpoints

### Course Management

#### Create Course
```http
POST /courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "React Fundamentals",
  "description": "Learn React from scratch",
  "level": "beginner",
  "price": 99.99,
  "type": "paid",
  "categories": ["Web Development", "JavaScript"],
  "requirements": ["Basic JavaScript knowledge"],
  "whatYouWillLearn": ["React components", "State management", "Hooks"]
}
```

#### Get Course Structure
```http
GET /courses/{courseId}/structure
```
Returns complete course structure with sections and lectures.

#### Upload Course Content
```http
POST /courses/{courseId}/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "file": <file>,
  "fileType": "thumbnail" | "preview_video" | "course_resource"
}
```

### Section Management

#### Create Section
```http
POST /courses/{courseId}/sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Introduction to React",
  "description": "Getting started with React",
  "order": 1
}
```

#### Reorder Sections
```http
PUT /courses/{courseId}/sections/reorder
Authorization: Bearer <token>
Content-Type: application/json

[
  {"id": "sectionId1", "order": 1},
  {"id": "sectionId2", "order": 2}
]
```

### Lecture Management

#### Create Lecture
```http
POST /lectures
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Your First Component",
  "description": "Learn to create React components",
  "section": "sectionId",
  "type": "video",
  "order": 1,
  "duration": 15,
  "isFree": false
}
```

#### Upload Lecture Content
```http
POST /lectures/{lectureId}/upload/{contentType}
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "file": <video/audio/pdf/resource file>
}
```

Content types: `video`, `audio`, `pdf`, `thumbnail`, `resources`

### Enrollment Management

#### Enroll in Course
```http
POST /enrollments
Authorization: Bearer <token>
Content-Type: application/json

{
  "course": "courseId",
  "amountPaid": 99.99,
  "paymentStatus": "completed",
  "paymentId": "payment_123",
  "paymentMethod": "credit_card"
}
```

#### Get User Dashboard
```http
GET /enrollments/dashboard
Authorization: Bearer <token>
```

#### Check Enrollment Status
```http
GET /enrollments/course/{courseId}/check
Authorization: Bearer <token>
```

### Progress Tracking

#### Update Lecture Progress
```http
PATCH /progress/course/{courseId}/lecture/{lectureId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "progressPercentage": 75,
  "timeSpent": 300,
  "lastPosition": 150
}
```

#### Mark Lecture Complete
```http
POST /progress/course/{courseId}/lecture/{lectureId}/complete
Authorization: Bearer <token>
```

#### Get Course Progress
```http
GET /progress/course/{courseId}/summary
Authorization: Bearer <token>
```

### Video Streaming

#### Get Video Stream URL
```http
GET /streaming/video/{lectureId}/url
Authorization: Bearer <token>
```

#### Get Video Metadata
```http
GET /streaming/lecture/{lectureId}/metadata
Authorization: Bearer <token>
```

#### Generate Course Playlist
```http
GET /streaming/course/{courseId}/playlist
Authorization: Bearer <token>
```

### Admin Dashboard

#### Get Admin Dashboard
```http
GET /admin/dashboard
Authorization: Bearer <admin-token>
```

#### Approve Course
```http
POST /admin/courses/{courseId}/approve
Authorization: Bearer <admin-token>
```

#### Toggle Featured Status
```http
PATCH /admin/courses/{courseId}/feature
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isFeatured": true
}
```

## Data Models

### Course Schema
```typescript
{
  title: string;
  description: string;
  instructor: ObjectId;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  duration: number; // minutes
  price: number;
  type: 'free' | 'paid';
  thumbnail: string;
  previewVideo: string;
  categories: string[];
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  enrollmentCount: number;
  rating: number;
  requirements: string[];
  whatYouWillLearn: string[];
}
```

### Section Schema
```typescript
{
  title: string;
  description: string;
  course: ObjectId;
  order: number;
  duration: number;
  lectureCount: number;
}
```

### Lecture Schema
```typescript
{
  title: string;
  description: string;
  course: ObjectId;
  section: ObjectId;
  type: 'video' | 'text' | 'pdf' | 'audio' | 'quiz';
  order: number;
  duration: number;
  videoUrl: string;
  videoKey: string;
  content: string; // HTML for text lectures
  resources: Array<{
    name: string;
    url: string;
    key: string;
    size: number;
    type: string;
  }>;
  isFree: boolean;
  allowDownload: boolean;
}
```

### Enrollment Schema
```typescript
{
  user: ObjectId;
  course: ObjectId;
  status: 'active' | 'completed' | 'suspended' | 'cancelled';
  enrolledAt: Date;
  completedAt: Date;
  amountPaid: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  progressPercentage: number;
  completedLectures: ObjectId[];
  totalTimeSpent: number;
}
```

## Usage Examples

### 1. Creating a Complete Course

```javascript
// 1. Create course
const course = await fetch('/courses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Advanced React Patterns",
    description: "Master advanced React concepts",
    level: "advanced",
    price: 199.99,
    type: "paid"
  })
});

// 2. Create sections
const section1 = await fetch(`/courses/${course.id}/sections`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Higher Order Components",
    order: 1
  })
});

// 3. Create lectures
const lecture1 = await fetch('/lectures', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Introduction to HOCs",
    section: section1.id,
    type: "video",
    order: 1,
    duration: 20
  })
});

// 4. Upload video content
const formData = new FormData();
formData.append('file', videoFile);

await fetch(`/lectures/${lecture1.id}/upload/video`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### 2. Student Learning Flow

```javascript
// 1. Enroll in course
await fetch('/enrollments', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    course: courseId,
    amountPaid: 199.99,
    paymentStatus: 'completed'
  })
});

// 2. Get course structure
const structure = await fetch(`/courses/${courseId}/structure`);

// 3. Stream video
const streamUrl = await fetch(`/streaming/video/${lectureId}/url`, {
  headers: { 'Authorization': 'Bearer ' + token }
});

// 4. Update progress
await fetch(`/progress/course/${courseId}/lecture/${lectureId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    progressPercentage: 100,
    timeSpent: 1200
  })
});
```

## Environment Setup

### Required Environment Variables
```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name

# Server
PORT=3000
NODE_ENV=development
```

### S3 Bucket Structure
```
your-bucket/
├── courses/
│   ├── images/          # Course thumbnails
│   ├── videos/          # Course preview videos
│   └── resources/       # Course resources
└── lectures/
    ├── videos/          # Lecture videos
    └── resources/       # Lecture resources
```

## Security Considerations

1. **Video Protection**: Videos are served through signed URLs with expiration
2. **Access Control**: Enrollment verification for paid content
3. **File Validation**: Strict file type and size validation
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Sanitization**: All inputs are validated and sanitized

## Performance Optimization

1. **Video Streaming**: Use CDN for better video delivery
2. **Database Indexing**: Optimized indexes for search and filtering
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Pagination**: All list endpoints support pagination
5. **Lazy Loading**: Course structure supports lazy loading of content

## Monitoring and Analytics

- Course enrollment trends
- Video completion rates
- User engagement metrics
- Revenue analytics
- Performance monitoring

This API provides a complete foundation for building a modern online learning platform with professional-grade features and security.
