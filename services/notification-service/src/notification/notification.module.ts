import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { Notification, EmailLog } from '../models';

@Module({
    imports: [
        SequelizeModule.forFeature([Notification, EmailLog]),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, EmailService],
    exports: [NotificationService, EmailService],
})
export class NotificationModule {}
