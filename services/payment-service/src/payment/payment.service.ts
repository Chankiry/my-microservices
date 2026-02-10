import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Payment, Transaction, PaymentStatus, TransactionStatus } from '../models';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(Payment)
        private paymentModel: typeof Payment,
        @InjectModel(Transaction)
        private transactionModel: typeof Transaction,
        private kafkaService: KafkaService,
    ) {}

    async findAll(filters: { userId?: string; orderId?: string; page: number; limit: number }) {
        const { userId, orderId, page, limit } = filters;
        const offset = (page - 1) * limit;

        const where: any = {};
        if (userId) where.userId = userId;
        if (orderId) where.orderId = orderId;

        const { count, rows } = await this.paymentModel.findAndCountAll({
            where,
            include: [Transaction],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    async findOne(id: string) {
        const payment = await this.paymentModel.findByPk(id, {
            include: [Transaction],
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return {
            success: true,
            data: payment,
        };
    }

    async processPayment(processPaymentDto: ProcessPaymentDto) {
        const { orderId, userId, amount, currency, paymentMethod, paymentToken } = processPaymentDto;

        // Create payment record
        const payment = await this.paymentModel.create({
            orderId,
            userId,
            amount,
            currency: currency || 'USD',
            status: PaymentStatus.PROCESSING,
            paymentMethod,
        });

        // Process payment with gateway (mock implementation)
        let transaction: Transaction;
        try {
            const gatewayResponse = await this.processWithGateway({
                amount,
                currency,
                paymentToken,
                paymentMethod,
            });

            transaction = await this.transactionModel.create({
                paymentId: payment.id,
                transactionId: gatewayResponse.transactionId,
                type: 'charge',
                amount,
                currency: currency || 'USD',
                status: TransactionStatus.SUCCESS,
                gatewayResponse: gatewayResponse,
            });

            await payment.update({
                status: PaymentStatus.COMPLETED,
                paymentIntentId: gatewayResponse.transactionId,
            });

            // Emit Kafka event
            await this.kafkaService.emit('payment.processed', {
                paymentId: payment.id,
                orderId: payment.orderId,
                userId: payment.userId,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                transactionId: transaction.transactionId,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            await this.transactionModel.create({
                paymentId: payment.id,
                transactionId: `failed-${Date.now()}`,
                type: 'charge',
                amount,
                currency: currency || 'USD',
                status: TransactionStatus.FAILED,
                errorMessage: error.message,
            });

            await payment.update({ status: PaymentStatus.FAILED });

            // Emit Kafka event
            await this.kafkaService.emit('payment.failed', {
                paymentId: payment.id,
                orderId: payment.orderId,
                userId: payment.userId,
                amount: payment.amount,
                error: error.message,
                timestamp: new Date().toISOString(),
            });

            throw new BadRequestException(`Payment processing failed: ${error.message}`);
        }

        const paymentWithTransactions = await this.paymentModel.findByPk(payment.id, {
            include: [Transaction],
        });

        return {
            success: true,
            message: 'Payment processed successfully',
            data: paymentWithTransactions,
        };
    }

    async refundPayment(id: string, refundPaymentDto: RefundPaymentDto) {
        const { amount, reason } = refundPaymentDto;

        const payment = await this.paymentModel.findByPk(id, {
            include: [Transaction],
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== PaymentStatus.COMPLETED) {
            throw new BadRequestException('Only completed payments can be refunded');
        }

        const refundAmount = amount || payment.amount;

        // Process refund with gateway (mock implementation)
        const refundTransaction = await this.transactionModel.create({
            paymentId: payment.id,
            transactionId: `refund-${Date.now()}`,
            type: 'refund',
            amount: refundAmount,
            currency: payment.currency,
            status: TransactionStatus.SUCCESS,
            gatewayResponse: { reason },
        });

        // Update payment status
        const newStatus = refundAmount >= payment.amount 
            ? PaymentStatus.REFUNDED 
            : PaymentStatus.COMPLETED;
        
        await payment.update({ status: newStatus });

        // Emit Kafka event
        await this.kafkaService.emit('payment.refunded', {
            paymentId: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: refundAmount,
            reason,
            timestamp: new Date().toISOString(),
        });

        const paymentWithTransactions = await this.paymentModel.findByPk(payment.id, {
            include: [Transaction],
        });

        return {
            success: true,
            message: 'Payment refunded successfully',
            data: paymentWithTransactions,
        };
    }

    async getStatus(id: string) {
        const payment = await this.paymentModel.findByPk(id);

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        return {
            success: true,
            data: {
                paymentId: payment.id,
                status: payment.status,
                amount: payment.amount,
                currency: payment.currency,
            },
        };
    }

    // Mock payment gateway processing
    private async processWithGateway(data: {
        amount: number;
        currency: string;
        paymentToken: string;
        paymentMethod: string;
    }): Promise<{ transactionId: string; status: string }> {
        // In a real implementation, this would call Stripe, PayPal, etc.
        // For demo purposes, we simulate a successful payment
        return {
            transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'succeeded',
        };
    }

    // Event handler for order created
    async handleOrderCreated(event: { orderId: string; userId: string; totalAmount: number }) {
        // Auto-create payment for new orders
        await this.processPayment({
            orderId: event.orderId,
            userId: event.userId,
            amount: event.totalAmount,
            currency: 'USD',
            paymentMethod: 'card',
            paymentToken: 'mock-token',
        });
    }
}
