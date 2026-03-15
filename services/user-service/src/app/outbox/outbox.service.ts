import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Sequelize, Transaction } from 'sequelize';
import OutboxMessage from '../models/outbox/outbox-message.model';

@Injectable()
export class OutboxService {
    private readonly logger = new Logger(OutboxService.name);

    constructor(
        @InjectModel(OutboxMessage)
        private readonly outboxModel: typeof OutboxMessage,
        private readonly sequelize: Sequelize, // ← inject the root Sequelize instance
    ) {}

    /**
     * Save event to outbox **within the same transaction** (called from business logic)
     */
    async saveToOutbox(
        transaction: Transaction,
        eventType: string,
        aggregateType: string,
        aggregateId: string,
        payload: any,
    ): Promise<void> {
        await this.outboxModel.create(
            {
                eventType,
                aggregateType,
                aggregateId,
                payload: JSON.stringify(payload),
                status: 'PENDING',
                createdAt: new Date(),
            } as any,
            { transaction },
        );
    }

    /**
     * Process pending outbox messages (usually called by a cron/scheduled task)
     * - Uses pessimistic locking to avoid double-processing in concurrent workers
     * - Processes up to 100 messages per run
     */
    async processPendingMessages(
        processFn: (message: OutboxMessage, transaction: Transaction) => Promise<void>,
    ): Promise<void> {
        const transaction = await this.sequelize.transaction({
        // isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, // optional - tune if needed
        });

        try {
        // Lock rows with FOR UPDATE to prevent concurrent workers from picking the same messages
        const messages = await this.outboxModel.findAll({
            where: { status: 'PENDING' },
            limit: 100,
            order: [['createdAt', 'ASC']],
            transaction,
            lock: true,                // ← crucial: pessimistic lock (SELECT ... FOR UPDATE)
            skipLocked: true,          // ← PostgreSQL/MySQL 8+ : skip already locked rows
        });

        if (messages.length === 0) {
            await transaction.commit();
            return;
        }

        this.logger.log(`Processing ${messages.length} pending outbox messages...`);

        for (const message of messages) {
            try {
            // Call business logic (e.g. publish to RabbitMQ/Kafka)
            await processFn(message, transaction);

            // Mark as processed
            message.status = 'PROCESSED';
            message.processedAt = new Date();
            await message.save({ transaction });
            } catch (error: any) {
            this.logger.error(
                `Failed to process outbox message ${message.id}: ${error.message}`,
                error.stack,
            );

            message.retryCount = (message.retryCount || 0) + 1;
            message.lastError = error.message?.slice(0, 1000) || 'Unknown error';

            if (message.retryCount >= 5) {
                message.status = 'FAILED';
            }

            await message.save({ transaction });
            }
        }

        await transaction.commit();
        } catch (error) {
        await transaction.rollback();
        this.logger.error('Outbox processing transaction failed', error);
        throw error; // let caller/scheduler handle retry if needed
        }
    }
}