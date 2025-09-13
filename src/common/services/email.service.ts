import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"AlphaAkki LMS" <gurjinder.singh@sensationsolutions.in>`,
      to: email,
      subject: 'Password Reset Request - AlphaAkki LMS',
      html: this.getPasswordResetTemplate(userName, resetUrl, resetToken),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  private getPasswordResetTemplate(userName: string, resetUrl: string, resetToken: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - AlphaAkki LMS</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #f97316, #dc2626);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
          }
          .title {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 16px;
          }
          .content {
            margin: 30px 0;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316, #dc2626);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .reset-button:hover {
            background: linear-gradient(135deg, #ea580c, #b91c1c);
          }
          .token-info {
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            font-family: monospace;
            word-break: break-all;
          }
          .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #92400e;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AlphaAkki LMS</div>
            <h1 class="title">Password Reset Request</h1>
            <p class="subtitle">We received a request to reset your password</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>You recently requested to reset your password for your AlphaAkki LMS account. Click the button below to reset it:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
            <div class="token-info">
              ${resetUrl}
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If you're having trouble accessing your account or didn't request this reset, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by AlphaAkki LMS</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendPasswordResetConfirmation(email: string, userName: string) {
    const mailOptions = {
      from: `"AlphaAkki LMS" <gurjinder.singh@sensationsolutions.in>`,
      to: email,
      subject: 'Password Successfully Reset - AlphaAkki LMS',
      html: this.getPasswordResetConfirmationTemplate(userName),
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset confirmation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending password reset confirmation email:', error);
      throw new Error('Failed to send password reset confirmation email');
    }
  }

  private getPasswordResetConfirmationTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Successful - AlphaAkki LMS</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            background: linear-gradient(135deg, #f97316, #dc2626);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
          }
          .success-icon {
            font-size: 48px;
            color: #10b981;
            margin-bottom: 20px;
          }
          .title {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 10px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 16px;
          }
          .content {
            margin: 30px 0;
          }
          .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316, #dc2626);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .security-tips {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            color: #0c4a6e;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">AlphaAkki LMS</div>
            <div class="success-icon">✅</div>
            <h1 class="title">Password Reset Successful</h1>
            <p class="subtitle">Your password has been successfully updated</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>Your password has been successfully reset. You can now log in to your AlphaAkki LMS account using your new password.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/login" class="login-button">Login to Your Account</a>
            </div>
            
            <div class="security-tips">
              <strong>🔒 Security Tips:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Use a strong, unique password for your account</li>
                <li>Don't share your password with anyone</li>
                <li>Consider enabling two-factor authentication if available</li>
                <li>Log out from shared or public computers</li>
              </ul>
            </div>
            
            <p>If you didn't make this change or if you have any concerns about your account security, please contact our support team immediately.</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by AlphaAkki LMS</p>
            <p>If you have any questions, please contact our support team.</p>
            <p style="margin-top: 20px; font-size: 12px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
