import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { OutboxService } from './outbox.service';
import { OutboxProcessorService } from './outbox-processor.service';
import OutboxMessage from '../../models/outbox/outbox-message.model';
import { KafkaModule } from '../communications/kafka/kafka.module';

@Module({
    imports: [
        SequelizeModule.forFeature([OutboxMessage]),
        KafkaModule,
    ],
    providers: [OutboxService, OutboxProcessorService],
    exports:   [OutboxService],
})
export class OutboxModule {}