import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EmailService } from './email.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { KafkaService } from '../kafka/kafka.service';
import EmailLog, { EmailStatus } from '../models/email-log.model';
import Notification, { NotificationType } from '../models/notification.model';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectModel(Notification)
        private notificationModel: typeof Notification,
        @InjectModel(EmailLog)
        private emailLogModel: typeof EmailLog,
        private emailService: EmailService,
        private kafkaService: KafkaService,
    ) {}

    async getNotifications(
        userId: string,
        options: { unreadOnly: boolean; page: number; limit: number },
    ) {
        const { unreadOnly, page, limit } = options;
        const offset = (page - 1) * limit;

        const where: any = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }

        const { count, rows } = await this.notificationModel.findAndCountAll({
            where,
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

    async createNotification(createNotificationDto: CreateNotificationDto) {
        const notification = await this.notificationModel.create({
            ...createNotificationDto,
            isRead: false,
        });

        return {
            success: true,
            message: 'Notification created successfully',
            data: notification,
        };
    }

    async markAsRead(id: string) {
        const notification = await this.notificationModel.findByPk(id);

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        await notification.update({
            isRead: true,
            readAt: new Date(),
        });

        return {
            success: true,
            message: 'Notification marked as read',
            data: notification,
        };
    }

    async sendEmail(sendEmailDto: SendEmailDto) {
        const { to, subject, body, template, templateData } = sendEmailDto;

        // Create email log
        const emailLog = await this.emailLogModel.create({
            to,
            from: process.env.SMTP_FROM || 'noreply@microservices.com',
            subject,
            body: template ? this.renderTemplate(template, templateData) : body,
            status: EmailStatus.PENDING,
        });

        try {
            // Send email
            await this.emailService.sendMail({
                to,
                subject,
                html: emailLog.body,
            });

            // Update email log
            await emailLog.update({
                status: EmailStatus.SENT,
                sentAt: new Date(),
            });

            // Emit Kafka event
            await this.kafkaService.emit('notification.email_sent', {
                emailLogId: emailLog.id,
                to,
                subject,
                timestamp: new Date().toISOString(),
            });

            return {
                success: true,
                message: 'Email sent successfully',
                data: emailLog,
            };
        } catch (error) {
            // Update email log with error
            await emailLog.update({
                status: EmailStatus.FAILED,
                error: error.message,
            });

            this.logger.error('Failed to send email', error);
            throw error;
        }
    }

    // Event handlers
    async handleUserRegistered(event: { userId: string; email: string; name: string }) {
        // Send welcome email
        await this.sendEmail({
            to: event.email,
            subject: 'Welcome to Our Platform!',
            template: 'welcome',
            templateData: {
                name: event.name,
            },
        });

        // Create in-app notification
        await this.createNotification({
            userId: event.userId,
            type: NotificationType.PUSH,
            title: 'Welcome!',
            message: `Welcome to our platform, ${event.name}!`,
        });
    }

    async handleOrderCreated(event: {
        orderId: string;
        userId: string;
        orderNumber: string;
        totalAmount: number;
    }) {
        // Create order confirmation notification
        await this.createNotification({
            userId: event.userId,
            type: NotificationType.PUSH,
            title: 'Order Confirmed',
            message: `Your order ${event.orderNumber} has been confirmed. Total: $${event.totalAmount}`,
            data: { orderId: event.orderId },
        });
    }

    async handlePaymentProcessed(event: {
        paymentId: string;
        orderId: string;
        userId: string;
        amount: number;
        currency: string;
    }) {
        // Create payment receipt notification
        await this.createNotification({
            userId: event.userId,
            type: NotificationType.PUSH,
            title: 'Payment Successful',
            message: `Payment of ${event.currency} ${event.amount} was successful.`,
            data: { paymentId: event.paymentId, orderId: event.orderId },
        });
    }

    private renderTemplate(template: string, data: any): string {
        // Simple template rendering - in production, use a proper template engine
        const templates: Record<string, (data: any) => string> = {
            welcome: (d) => `
                <h1>Welcome, ${d.name}!</h1>
                <p>Thank you for joining our platform. We're excited to have you!</p>
            `,
            order_confirmation: (d) => `
                <h1>Order Confirmation</h1>
                <p>Your order has been confirmed.</p>
            `,
            payment_receipt: (d) => `
                <h1>Payment Receipt</h1>
                <p>Your payment was successful.</p>
            `,
        };

        const renderer = templates[template];
        return renderer ? renderer(data) : '<p>Notification</p>';
    }
}
