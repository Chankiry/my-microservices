import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment, Transaction } from '../models';

@Module({
    imports: [
        SequelizeModule.forFeature([Payment, Transaction]),
    ],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
