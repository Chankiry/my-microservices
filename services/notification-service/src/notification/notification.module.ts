import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import Notification from '../models/notification.model';
import EmailLog from '../models/email-log.model';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Notification, EmailLog]),
        forwardRef(() => KafkaModule),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, EmailService],
    exports: [NotificationService, EmailService],
})
export class NotificationModule {}
