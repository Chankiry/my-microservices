import { forwardRef, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        forwardRef(() => NotificationModule),  // ✅ Use forwardRef for module too
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule {}
