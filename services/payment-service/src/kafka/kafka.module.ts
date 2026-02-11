import { forwardRef, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [
        forwardRef(() => PaymentModule),  // ✅ Use forwardRef
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule {}
