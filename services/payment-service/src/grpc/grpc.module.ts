import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [PaymentModule],
    controllers: [GrpcController],
})
export class GrpcModule {}
