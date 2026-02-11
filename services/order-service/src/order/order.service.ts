import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { KafkaService } from '../kafka/kafka.service';
import Order, { OrderStatus } from 'src/models/order.model';
import OrderItem from 'src/models/order-item.model';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(Order)
        private orderModel: typeof Order,
        @InjectModel(OrderItem)
        private orderItemModel: typeof OrderItem,
        private kafkaService: KafkaService,
    ) {}

    async findAll(filters: { userId?: string; page: number; limit: number }) {
        const { userId, page, limit } = filters;
        const offset = (page - 1) * limit;

        const where: any = {};
        if (userId) {
            where.userId = userId;
        }

        const { count, rows } = await this.orderModel.findAndCountAll({
            where,
            include: [OrderItem],
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
        const order = await this.orderModel.findByPk(id, {
            include: [OrderItem],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return {
            success: true,
            data: order,
        };
    }

    async create(createOrderDto: CreateOrderDto) {
        const { userId, items, notes } = createOrderDto;

        if (!items || items.length === 0) {
            throw new BadRequestException('Order must have at least one item');
        }

        // Calculate total amount
        let totalAmount = 0;
        const orderItems = items.map((item: OrderItemDto) => {
            const subtotal = OrderItem.calculateSubtotal(item.quantity, item.price);
            totalAmount += subtotal;
            return {
                productName: item.productName,
                productSku: item.productSku,
                quantity: item.quantity,
                price: item.price,
                subtotal,
            };
        });

        // Create order with items in a transaction
        const order = await this.orderModel.sequelize.transaction(async (transaction) => {
            const newOrder = await this.orderModel.create({
                userId,
                orderNumber: Order.generateOrderNumber(),
                totalAmount,
                status: OrderStatus.PENDING,
                notes,
            }, { transaction });

            await this.orderItemModel.bulkCreate(
                orderItems.map(item => ({
                    ...item,
                    orderId: newOrder.id,
                })),
                { transaction },
            );

            return newOrder;
        });

        // Fetch order with items
        const orderWithItems = await this.orderModel.findByPk(order.id, {
            include: [OrderItem],
        });

        // Emit Kafka event
        await this.kafkaService.emit('order.created', {
            orderId: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            status: order.status,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Order created successfully',
            data: orderWithItems,
        };
    }

    async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
        const { status } = updateOrderStatusDto;

        const order = await this.orderModel.findByPk(id);

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Validate status transition
        const validTransitions = this.getValidStatusTransitions(order.status);
        if (!validTransitions.includes(status)) {
            throw new BadRequestException(
                `Cannot transition from ${order.status} to ${status}`,
            );
        }

        const updateData: any = { status };
        if (status === OrderStatus.COMPLETED) {
            updateData.completedAt = new Date();
        }

        await order.update(updateData);

        // Emit Kafka event
        await this.kafkaService.emit('order.updated', {
            orderId: order.id,
            userId: order.userId,
            status: order.status,
            previousStatus: order.status,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Order status updated successfully',
            data: order,
        };
    }

    async cancel(id: string) {
        const order = await this.orderModel.findByPk(id);

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status === OrderStatus.COMPLETED) {
            throw new BadRequestException('Cannot cancel a completed order');
        }

        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException('Order is already cancelled');
        }

        await order.update({ status: OrderStatus.CANCELLED });

        // Emit Kafka event
        await this.kafkaService.emit('order.cancelled', {
            orderId: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Order cancelled successfully',
            data: order,
        };
    }

    private getValidStatusTransitions(currentStatus: OrderStatus): OrderStatus[] {
        const transitions = {
            [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
            [OrderStatus.PROCESSING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
            [OrderStatus.COMPLETED]: [],
            [OrderStatus.CANCELLED]: [],
        };
        return transitions[currentStatus] || [];
    }
}
