import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {}

    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all payments' })
    @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
    async findAll(
        @Query('userId') userId?: string,
        @Query('orderId') orderId?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.paymentService.findAll({ userId, orderId, page: +page, limit: +limit });
    }

    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment by ID' })
    @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async findOne(@Param('id') id: string) {
        return this.paymentService.findOne(id);
    }

    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Process a new payment' })
    @ApiResponse({ status: 201, description: 'Payment processed successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async processPayment(@Body() processPaymentDto: ProcessPaymentDto) {
        return this.paymentService.processPayment(processPaymentDto);
    }

    @Post(':id/refund')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Refund a payment' })
    @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async refundPayment(
        @Param('id') id: string,
        @Body() refundPaymentDto: RefundPaymentDto,
    ) {
        return this.paymentService.refundPayment(id, refundPaymentDto);
    }

    @Get(':id/status')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment status' })
    @ApiResponse({ status: 200, description: 'Payment status retrieved' })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async getStatus(@Param('id') id: string) {
        return this.paymentService.getStatus(id);
    }
}
