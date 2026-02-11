import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/sequelize';
import EmailLog, { EmailStatus } from '../models/email-log.model';
import Notification, { NotificationType } from '../models/notification.model';

@Controller()
export class GrpcController {
    constructor(
        @InjectModel(Notification)
        private notificationModel: typeof Notification,
        @InjectModel(EmailLog)
        private emailLogModel: typeof EmailLog,
    ) {}

    @GrpcMethod('NotificationService', 'SendEmail')
    async sendEmail(data: {
        to: string;
        from: string;
        subject: string;
        body: string;
    }) {
        const emailLog = await this.emailLogModel.create({
            to: data.to,
            from: data.from,
            subject: data.subject,
            body: data.body,
            status: EmailStatus.SENT,
            sentAt: new Date(),
        });

        return {
            id: emailLog.id,
            to: emailLog.to,
            from: emailLog.from,
            subject: emailLog.subject,
            status: emailLog.status,
            sentAt: emailLog.sentAt.toISOString(),
            createdAt: emailLog.createdAt.toISOString(),
        };
    }

    @GrpcMethod('NotificationService', 'SendNotification')
    async sendNotification(data: {
        userId: string;
        type: NotificationType;
        title: string;
        message: string;
        data?: Record<string, string>;
    }) {
        const notification = await this.notificationModel.create({
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            data: data.data,
            isRead: false,
        });

        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString(),
        };
    }

    @GrpcMethod('NotificationService', 'GetNotifications')
    async getNotifications(data: {
        userId: string;
        unreadOnly: boolean;
        pagination: { page: number; limit: number };
    }) {
        const { userId, unreadOnly, pagination } = data;
        const offset = (pagination.page - 1) * pagination.limit;

        const where: any = { userId };
        if (unreadOnly) {
            where.isRead = false;
        }

        const { count, rows } = await this.notificationModel.findAndCountAll({
            where,
            limit: pagination.limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            notifications: rows.map(notification => ({
                id: notification.id,
                userId: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                isRead: notification.isRead,
                createdAt: notification.createdAt.toISOString(),
            })),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: count,
                totalPages: Math.ceil(count / pagination.limit),
            },
        };
    }

    @GrpcMethod('NotificationService', 'MarkAsRead')
    async markAsRead(data: { id: string }) {
        const notification = await this.notificationModel.findByPk(data.id);

        if (!notification) {
            return null;
        }

        await notification.update({
            isRead: true,
            readAt: new Date(),
        });

        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: notification.isRead,
            createdAt: notification.createdAt.toISOString(),
        };
    }

    @GrpcMethod('NotificationService', 'HealthCheck')
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'notification-service',
        };
    }
}
