import { forwardRef, Module } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { UserModule } from 'src/user/user.module';

@Module({
    imports: [
        forwardRef(() => UserModule),  // ✅ Use forwardRef
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule {}
