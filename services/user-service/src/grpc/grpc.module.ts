import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { UserModule } from '../user/user.module';

@Module({
    imports: [UserModule],
    controllers: [GrpcController],
})
export class GrpcModule {}
