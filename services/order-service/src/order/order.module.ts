import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderItem } from '../models';

@Module({
    imports: [
        SequelizeModule.forFeature([Order, OrderItem]),
    ],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
})
export class OrderModule {}
