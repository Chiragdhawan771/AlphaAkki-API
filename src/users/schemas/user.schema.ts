import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin: Date;

  @Prop()
  refreshToken: string;

  // Extended Profile Fields
  @Prop()
  phoneNumber: string;

  @Prop()
  profilePicture: string;

  @Prop()
  bio: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  address: string;

  @Prop({ default: false })
  isVerified: boolean;

  // Password Reset Fields
  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for better performance
UserSchema.index({ email: 1 });
