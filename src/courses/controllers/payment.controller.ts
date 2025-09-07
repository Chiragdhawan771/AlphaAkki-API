import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentOrderDto, VerifyPaymentDto, RefundPaymentDto } from '../dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Razorpay payment order for course enrollment' })
  @ApiResponse({ status: 201, description: 'Payment order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid course or user already enrolled' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'User already enrolled in course' })
  async createPaymentOrder(
    @Body() createPaymentOrderDto: CreatePaymentOrderDto,
    @Request() req,
  ) {
    return this.paymentService.createPaymentOrder(req.user._id, createPaymentOrderDto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Razorpay payment and complete enrollment' })
  @ApiResponse({ status: 200, description: 'Payment verified and enrollment completed' })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  async verifyPayment(
    @Body() verifyPaymentDto: VerifyPaymentDto,
    @Req() req,
  ) {
    const userId = req.user._id;
    return this.paymentService.verifyPayment(userId, verifyPaymentDto);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process refund for a payment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Body() refundDto: RefundPaymentDto,
    @Request() req,
  ) {
    return this.paymentService.refundPayment(
      refundDto.paymentId,
      refundDto,
      req.user._id,
      req.user.role,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for current user' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.paymentService.getPaymentHistory(req.user._id, page, limit);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    return this.paymentService.handleWebhook(signature, req.body);
  }

  @Get('order/:orderId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment order status' })
  @ApiResponse({ status: 200, description: 'Order status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderStatus(
    @Param('orderId') orderId: string,
    @Request() req,
  ) {
    // This method can be implemented to check order status
    // For now, we'll return a simple response
    return { orderId, message: 'Order status check not implemented yet' };
  }
}
