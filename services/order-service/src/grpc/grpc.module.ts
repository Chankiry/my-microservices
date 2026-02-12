import { Module } from '@nestjs/common';
import { GrpcController } from './grpc.controller';
import { OrderModule } from '../order/order.module';
import { SequelizeModule } from '@nestjs/sequelize';
import Order from 'src/models/order.model';
import OrderItem from 'src/models/order-item.model';

@Module({
    imports: [
        SequelizeModule.forFeature([Order, OrderItem]),
        OrderModule
    ],
    controllers: [GrpcController],
})
export class GrpcModule {}
