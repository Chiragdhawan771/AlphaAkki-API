import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SignupDto, LoginDto, UpdateProfileDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ user: any; access_token: string }> {
    const { email, password, firstName, lastName } = signupDto;

    try {
      console.log('🔍 Checking if user exists:', email);
      
      // Check if user already exists
      const existingUser = await this.userModel.findOne({ email });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      console.log('🔐 Hashing password...');
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      console.log('👤 Creating new user...');
      // Create user
      const user = new this.userModel({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      console.log('💾 Saving user to database...');
      const savedUser = await user.save();
      console.log('✅ User saved successfully with ID:', savedUser._id);

      // Generate JWT token
      const payload = { email: savedUser.email, sub: savedUser._id, role: savedUser.role };
      const access_token = this.jwtService.sign(payload);

      // Update last login
      await this.userModel.findByIdAndUpdate(savedUser._id, { lastLogin: new Date() });

      // Return user without password
      const userResponse = {
        id: savedUser._id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      };

      return {
        user: userResponse,
        access_token,
      };
    } catch (error) {
      console.error('❌ Error during signup:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<{ user: any; access_token: string }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user._id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Update last login
    await this.userModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Return user without password
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: new Date(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: userResponse,
      access_token,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async findUserById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id).select('-password');
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<any> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateProfileDto },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Return success message even if user doesn't exist for security
      return { message: 'If an account with that email exists, we have sent a password reset link.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpiry,
    });

    try {
      // Send reset email
      await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        `${user.firstName} ${user.lastName}`
      );

      return { message: 'If an account with that email exists, we have sent a password reset link.' };
    } catch (error) {
      // Clear reset token if email fails
      await this.userModel.findByIdAndUpdate(user._id, {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });

      throw new BadRequestException('Failed to send password reset email. Please try again.');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find user with valid reset token
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    try {
      // Send confirmation email
      await this.emailService.sendPasswordResetConfirmation(
        user.email,
        `${user.firstName} ${user.lastName}`
      );
    } catch (error) {
      console.error('Failed to send password reset confirmation email:', error);
      // Don't throw error here as password was successfully reset
    }

    return { message: 'Password has been reset successfully' };
  }
}
