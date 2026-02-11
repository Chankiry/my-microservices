import { forwardRef, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import Payment from '../models/payment.model';
import Transaction from '../models/transaction.model';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([Payment, Transaction]),
        forwardRef(() => KafkaModule),
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
