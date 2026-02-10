import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { OrderModule } from '../order/order.module';

@Module({
    imports: [OrderModule],
    controllers: [GrpcController],
})
export class GrpcModule {}
