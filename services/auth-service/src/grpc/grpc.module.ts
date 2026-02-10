import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [GrpcController],
})
export class GrpcModule {}
