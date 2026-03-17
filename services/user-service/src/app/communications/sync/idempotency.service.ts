import ProcessedEvent from '@models/sync/processed-event.model';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';

@Injectable()
export class IdempotencyService {
    private readonly logger = new Logger(IdempotencyService.name);

    constructor(
        @InjectModel(ProcessedEvent)
        private readonly processedEventModel: typeof ProcessedEvent,
    ) {}

    async isProcessed(eventId: string): Promise<boolean> {
        try {
            const existing = await this.processedEventModel.findOne({
                where: { eventId },
            });
            return !!existing;
        } catch (error) {
            this.logger.error(`Idempotency check failed: ${error.message}`);
            return false;
        }
    }

    async markProcessed(eventId: string, eventType: string): Promise<void> {
        try {
            await this.processedEventModel.create({
                eventId,
                eventType,
            } as any);
        } catch (error) {
            // Ignore duplicate key errors — another instance already processed it
            if (error instanceof UniqueConstraintError) {
                this.logger.debug(`Event already marked processed: ${eventId}`);
                return;
            }
            this.logger.error(`Failed to mark event processed: ${error.message}`);
        }
    }
}