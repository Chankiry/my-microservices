import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import Order from 'src/models/order.model';
import OrderItem from 'src/models/order-item.model';
import { KafkaModule } from 'src/kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Order, OrderItem]),
        forwardRef(() => KafkaModule),
    ],
    controllers: [OrderController],
    providers: [OrderService],
    exports: [OrderService],
})
export class OrderModule {}
