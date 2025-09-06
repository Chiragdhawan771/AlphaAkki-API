import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/alphaakki-cms', {
      connectionFactory: (connection) => {
        connection.on('connected', () => {
          console.log('✅ MongoDB connected successfully');
        });
        connection.on('error', (error) => {
          console.error('❌ MongoDB connection error:', error);
        });
        connection.on('disconnected', () => {
          console.log('⚠️ MongoDB disconnected');
        });
        return connection;
      },
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
