import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { KafkaProducerService } from '../communications/kafka/kafka-producer.service';
import OutboxMessage from '../models/outbox/outbox-message.model';
import { Transaction } from 'sequelize';

@Injectable()
export class OutboxProcessorService {
    private readonly logger = new Logger(OutboxProcessorService.name);
    private isRunning = false;

    constructor(
        private readonly outboxService    : OutboxService,
        private readonly kafkaProducer    : KafkaProducerService,
    ) {}

    // Runs every 5 seconds.
    // The isRunning guard prevents overlap if a run takes longer than 5 s.
    @Cron(CronExpression.EVERY_5_SECONDS)
    async processOutbox(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            await this.outboxService.processPendingMessages(
                async (message: OutboxMessage, _tx: Transaction) => {
                    await this.publishToKafka(message);
                },
            );
        } catch (error: any) {
            this.logger.error(`Outbox processing error: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    private async publishToKafka(message: OutboxMessage): Promise<void> {
        const payload = typeof message.payload === 'string'
            ? JSON.parse(message.payload)
            : message.payload;

        switch (message.eventType) {
            case 'USER_CREATED':
                await this.kafkaProducer.emitUserCreated(payload);
                break;
            case 'USER_UPDATED':
                await this.kafkaProducer.emitUserUpdated(
                    message.aggregateId,
                    payload.changes ?? payload,
                );
                break;
            case 'USER_DELETED':
                await this.kafkaProducer.emitUserDeleted(message.aggregateId);
                break;
            default:
                this.logger.warn(`Unknown outbox event type: ${message.eventType}`);
        }
    }
}