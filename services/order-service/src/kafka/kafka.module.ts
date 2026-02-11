import { forwardRef, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { OrderModule } from 'src/order/order.module';

@Module({
    imports: [
        forwardRef(() => OrderModule),  // ✅ Use forwardRef
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule {}
