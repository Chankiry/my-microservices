import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/sequelize';
import OrderItem from 'src/models/order-item.model';
import Order, { OrderStatus } from 'src/models/order.model';

@Controller()
export class GrpcController {
    constructor(
        @InjectModel(Order)
        private orderModel: typeof Order,
        @InjectModel(OrderItem)
        private orderItemModel: typeof OrderItem,
    ) {}

    @GrpcMethod('OrderService', 'CreateOrder')
    async createOrder(data: {
        userId: string;
        items: Array<{
            productName: string;
            quantity: number;
            price: number;
        }>;
    }) {
        const totalAmount = data.items.reduce((sum, item) => 
            sum + (item.quantity * item.price), 0
        );

        const order = await this.orderModel.create({
            userId: data.userId,
            orderNumber: Order.generateOrderNumber(),
            totalAmount,
            status: OrderStatus.PENDING,
        });

        await this.orderItemModel.bulkCreate(
            data.items.map(item => ({
                orderId: order.id,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price,
            }))
        );

        const orderWithItems = await this.orderModel.findByPk(order.id, {
            include: [OrderItem],
        });

        return {
            id: orderWithItems.id,
            userId: orderWithItems.userId,
            orderNumber: orderWithItems.orderNumber,
            totalAmount: orderWithItems.totalAmount,
            status: orderWithItems.status,
            items: orderWithItems.items.map(item => ({
                id: item.id,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
            })),
            createdAt: orderWithItems.createdAt.toISOString(),
            updatedAt: orderWithItems.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('OrderService', 'GetOrder')
    async getOrder(data: { id: string }) {
        const order = await this.orderModel.findByPk(data.id, {
            include: [OrderItem],
        });

        if (!order) {
            return null;
        }

        return {
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            status: order.status,
            items: order.items.map(item => ({
                id: item.id,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
            })),
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('OrderService', 'GetOrdersByUser')
    async getOrdersByUser(data: { userId: string; pagination: { page: number; limit: number } }) {
        const { userId, pagination } = data;
        const offset = (pagination.page - 1) * pagination.limit;

        const { count, rows } = await this.orderModel.findAndCountAll({
            where: { userId },
            include: [OrderItem],
            limit: pagination.limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            orders: rows.map(order => ({
                id: order.id,
                userId: order.userId,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                status: order.status,
                items: order.items.map(item => ({
                    id: item.id,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.subtotal,
                })),
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString(),
            })),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: count,
                totalPages: Math.ceil(count / pagination.limit),
            },
        };
    }

    @GrpcMethod('OrderService', 'UpdateOrderStatus')
    async updateOrderStatus(data: { orderId: string; status: OrderStatus }) {
        const order = await this.orderModel.findByPk(data.orderId);

        if (!order) {
            return null;
        }

        await order.update({ status: data.status });

        return {
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('OrderService', 'CancelOrder')
    async cancelOrder(data: { id: string }) {
        const order = await this.orderModel.findByPk(data.id);

        if (!order) {
            return null;
        }

        await order.update({ status: OrderStatus.CANCELLED });

        return {
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            updatedAt: order.updatedAt.toISOString(),
        };
    }

    @GrpcMethod('OrderService', 'HealthCheck')
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'order-service',
        };
    }
}
