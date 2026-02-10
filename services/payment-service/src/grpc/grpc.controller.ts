import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/sequelize';
import { Payment, Transaction } from '../models';

@Controller()
export class GrpcController {
    constructor(
        @InjectModel(Payment)
        private paymentModel: typeof Payment,
        @InjectModel(Transaction)
        private transactionModel: typeof Transaction,
    ) {}

    @GrpcMethod('PaymentService', 'ProcessPayment')
    async processPayment(data: {
        orderId: string;
        userId: string;
        amount: number;
        currency: string;
        paymentMethod: string;
    }) {
        const payment = await this.paymentModel.create({
            orderId: data.orderId,
            userId: data.userId,
            amount: data.amount,
            currency: data.currency || 'USD',
            status: 'completed',
            paymentMethod: data.paymentMethod,
        });

        await this.transactionModel.create({
            paymentId: payment.id,
            transactionId: `txn_${Date.now()}`,
            type: 'charge',
            amount: data.amount,
            currency: data.currency || 'USD',
            status: 'success',
        });

        return {
            id: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            transactionId: `txn_${Date.now()}`,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('PaymentService', 'GetPayment')
    async getPayment(data: { id: string }) {
        const payment = await this.paymentModel.findByPk(data.id, {
            include: [Transaction],
        });

        if (!payment) {
            return null;
        }

        return {
            id: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('PaymentService', 'GetPaymentsByUser')
    async getPaymentsByUser(data: { userId: string; pagination: { page: number; limit: number } }) {
        const { userId, pagination } = data;
        const offset = (pagination.page - 1) * pagination.limit;

        const { count, rows } = await this.paymentModel.findAndCountAll({
            where: { userId },
            limit: pagination.limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            payments: rows.map(payment => ({
                id: payment.id,
                orderId: payment.orderId,
                userId: payment.userId,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                createdAt: payment.createdAt.toISOString(),
                updatedAt: payment.updatedAt.toISOString(),
            })),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: count,
                totalPages: Math.ceil(count / pagination.limit),
            },
        };
    }

    @GrpcMethod('PaymentService', 'RefundPayment')
    async refundPayment(data: { paymentId: string; reason: string }) {
        const payment = await this.paymentModel.findByPk(data.paymentId);

        if (!payment) {
            return {
                success: false,
                message: 'Payment not found',
            };
        }

        await this.transactionModel.create({
            paymentId: payment.id,
            transactionId: `refund_${Date.now()}`,
            type: 'refund',
            amount: payment.amount,
            currency: payment.currency,
            status: 'success',
            gatewayResponse: { reason: data.reason },
        });

        await payment.update({ status: 'refunded' });

        return {
            id: payment.id,
            orderId: payment.orderId,
            userId: payment.userId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('PaymentService', 'GetPaymentStatus')
    async getPaymentStatus(data: { id: string }) {
        const payment = await this.paymentModel.findByPk(data.id);

        if (!payment) {
            return {
                paymentId: data.id,
                status: 'not_found',
                message: 'Payment not found',
            };
        }

        return {
            paymentId: payment.id,
            status: payment.status,
            message: `Payment is ${payment.status}`,
        };
    }

    @GrpcMethod('PaymentService', 'HealthCheck')
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'payment-service',
        };
    }
}
