import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
const Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { Payment, PaymentDocument, PaymentStatus } from '../schemas/payment.schema';
import { SimplifiedCourse, SimplifiedCourseDocument } from '../schemas/simplified-course.schema';
import { CreatePaymentOrderDto, VerifyPaymentDto, RefundPaymentDto } from '../dto/create-payment.dto';
import { EnrollmentsService } from './enrollments.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private razorpay: any;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(SimplifiedCourse.name) private courseModel: Model<SimplifiedCourseDocument>,
    private configService: ConfigService,
    private enrollmentsService: EnrollmentsService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async createPaymentOrder(userId: string, createPaymentOrderDto: CreatePaymentOrderDto) {
    try {
      const { courseId, couponCode } = createPaymentOrderDto;

      // Check if user is already enrolled
      const isEnrolled = await this.enrollmentsService.isUserEnrolled(userId, courseId);
      if (isEnrolled) {
        throw new ConflictException('User is already enrolled in this course');
      }

      // Get course details
      const course = await this.courseModel.findById(courseId);
      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.type === 'free') {
        throw new BadRequestException('This course is free and does not require payment');
      }

      if (course.status !== 'published') {
        throw new BadRequestException('Course is not available for enrollment');
      }

      // Calculate final amount (apply coupon if provided)
      let finalAmount = Math.round(course.price * 100); // Convert to paise
      let discountAmount = 0;

      if (couponCode) {
        // TODO: Implement coupon validation logic
        // For now, we'll skip coupon validation
        this.logger.warn(`Coupon code ${couponCode} provided but coupon system not implemented yet`);
      }

      // Check for existing pending payment
      const existingPayment = await this.paymentModel.findOne({
        user: userId,
        course: courseId,
        status: PaymentStatus.CREATED,
      });

      if (existingPayment) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const amountMatchesCurrent = existingPayment.amount === finalAmount;
        const withinReuseWindow = existingPayment.createdAt > thirtyMinutesAgo;

        // Reuse only if within window AND amount matches current computed amount
        if (withinReuseWindow && amountMatchesCurrent) {
          return {
            orderId: existingPayment.razorpayOrderId,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            course: {
              id: course._id,
              title: course.title,
              price: course.price,
            },
            key: this.configService.get<string>('RAZORPAY_KEY_ID'),
          };
        }

        // Otherwise, mark the existing payment as failed to supersede it
        existingPayment.status = PaymentStatus.FAILED;
        existingPayment.failureReason = withinReuseWindow && !amountMatchesCurrent
          ? 'Superseded by updated price/amount'
          : 'Payment timeout';
        existingPayment.failedAt = new Date();
        await existingPayment.save();
      }

      // Create Razorpay order
      const orderOptions = {
        amount: finalAmount,
        currency: 'INR',
        receipt: `ord_${Date.now().toString().slice(-8)}_${courseId.slice(-8)}`,
        notes: {
          courseId: courseId,
          userId: userId,
          courseName: course.title,
          originalAmount: course.price,
          discountAmount: discountAmount,
        },
      };

      const razorpayOrder = await this.razorpay.orders.create(orderOptions);

      // Save payment record
      const payment = new this.paymentModel({
        user: userId,
        course: courseId,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency: 'INR',
        status: PaymentStatus.CREATED,
        metadata: {
          couponCode,
          discountAmount,
          originalAmount: course.price,
        },
      });

      await payment.save();

      this.logger.log(`Payment order created: ${razorpayOrder.id} for user ${userId} and course ${courseId}`);

      return {
        orderId: razorpayOrder.id,
        amount: finalAmount,
        currency: 'INR',
        course: {
          id: course._id,
          title: course.title,
          price: course.price,
        },
        key: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      this.logger.error(`Error creating payment order: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyPayment(userId: string, verifyPaymentDto: VerifyPaymentDto) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = verifyPaymentDto;

      // Find payment record
      const payment = await this.paymentModel.findOne({
        razorpayOrderId: razorpay_order_id,
        user: userId,
        course: courseId,
      });

      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      if (payment.status !== PaymentStatus.CREATED) {
        throw new BadRequestException('Payment has already been processed');
      }

      // Verify signature
      const isSignatureValid = this.verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      );

      if (!isSignatureValid) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = 'Invalid signature';
        payment.failedAt = new Date();
        await payment.save();
        
        this.logger.warn(`Invalid payment signature for order ${razorpay_order_id}`);
        throw new BadRequestException('Payment verification failed');
      }

      // Fetch payment details from Razorpay
      const razorpayPayment = await this.razorpay.payments.fetch(razorpay_payment_id);

      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason = `Payment status: ${razorpayPayment.status}`;
        payment.failedAt = new Date();
        payment.razorpayResponse = razorpayPayment;
        await payment.save();
        
        throw new BadRequestException('Payment not successful');
      }

      // Update payment record
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = razorpayPayment.status === 'captured' ? PaymentStatus.CAPTURED : PaymentStatus.AUTHORIZED;
      payment.method = razorpayPayment.method as any;
      payment.razorpayResponse = razorpayPayment;
      
      if (razorpayPayment.status === 'captured') {
        payment.capturedAt = new Date();
      } else {
        payment.authorizedAt = new Date();
      }

      await payment.save();

      // Create enrollment
      const enrollment = await this.enrollmentsService.enroll(userId, {
        course: courseId,
        amountPaid: payment.amount / 100, // Convert back to rupees
        paymentId: razorpay_payment_id,
        paymentMethod: razorpayPayment.method,
      });

      this.logger.log(`Payment verified and enrollment created for user ${userId} and course ${courseId}`);

      return {
        success: true,
        paymentId: razorpay_payment_id,
        enrollmentId: (enrollment as any)._id.toString(),
        message: 'Payment successful and enrollment completed',
      };
    } catch (error) {
      this.logger.error(`Error verifying payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async refundPayment(paymentId: string, refundDto: RefundPaymentDto, userId?: string, userRole?: string) {
    try {
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== PaymentStatus.CAPTURED) {
        throw new BadRequestException('Only captured payments can be refunded');
      }

      // Check authorization (only admin or payment owner can refund)
      if (userRole !== 'admin' && payment.user.toString() !== userId) {
        throw new BadRequestException('Unauthorized to refund this payment');
      }

      const refundAmount = refundDto.amount || payment.amount;
      
      if (refundAmount > payment.amount || refundAmount <= 0) {
        throw new BadRequestException('Invalid refund amount');
      }

      // Create refund in Razorpay
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: refundAmount,
        notes: {
          reason: refundDto.reason || 'Refund requested',
          refundedBy: userId,
        },
      });

      // Update payment record
      payment.status = PaymentStatus.REFUNDED;
      payment.refundAmount = refundAmount;
      payment.refundId = refund.id;
      payment.refundedAt = new Date();
      await payment.save();

      // Update enrollment status if full refund
      if (refundAmount === payment.amount) {
        await this.enrollmentsService.updateEnrollmentStatus(
          payment.user.toString(),
          payment.course.toString(),
          'cancelled' as any,
        );
      }

      this.logger.log(`Payment refunded: ${paymentId}, amount: ${refundAmount}`);

      return {
        success: true,
        refundId: refund.id,
        refundAmount: refundAmount,
        message: 'Refund processed successfully',
      };
    } catch (error) {
      this.logger.error(`Error processing refund: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const payments = await this.paymentModel
      .find({ user: userId })
      .populate('course', 'title thumbnail price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.paymentModel.countDocuments({ user: userId });

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async handleWebhook(signature: string, body: any) {
    try {
      const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new Error('Razorpay webhook secret not configured');
      }
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid webhook signature');
        return { success: false, message: 'Invalid signature' };
      }

      const { event, payload } = body;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(payload.refund.entity);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  }

  private async handlePaymentCaptured(paymentData: any) {
    const payment = await this.paymentModel.findOne({
      razorpayPaymentId: paymentData.id,
    });

    if (payment && payment.status !== PaymentStatus.CAPTURED) {
      payment.status = PaymentStatus.CAPTURED;
      payment.capturedAt = new Date();
      payment.razorpayResponse = paymentData;
      await payment.save();
      
      this.logger.log(`Payment captured via webhook: ${paymentData.id}`);
    }
  }

  private async handlePaymentFailed(paymentData: any) {
    const payment = await this.paymentModel.findOne({
      razorpayOrderId: paymentData.order_id,
    });

    if (payment && payment.status === PaymentStatus.CREATED) {
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = paymentData.error_description || 'Payment failed';
      payment.failedAt = new Date();
      payment.razorpayResponse = paymentData;
      await payment.save();
      
      this.logger.log(`Payment failed via webhook: ${paymentData.id}`);
    }
  }

  private async handleRefundProcessed(refundData: any) {
    const payment = await this.paymentModel.findOne({
      razorpayPaymentId: refundData.payment_id,
    });

    if (payment) {
      payment.status = PaymentStatus.REFUNDED;
      payment.refundAmount = refundData.amount;
      payment.refundId = refundData.id;
      payment.refundedAt = new Date();
      await payment.save();
      
      this.logger.log(`Refund processed via webhook: ${refundData.id}`);
    }
  }
}
