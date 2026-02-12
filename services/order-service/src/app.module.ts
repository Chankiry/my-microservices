import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { HealthModule } from './health/health.module';
import { KafkaModule } from './kafka/kafka.module';
import { GrpcModule } from './grpc/grpc.module';
import { ConfigModule } from './config/config.module';

@Module({
    imports: [
        ConfigModule,
        
        OrderModule,
        HealthModule,
        KafkaModule,
        GrpcModule,
    ],
})
export class AppModule {}
