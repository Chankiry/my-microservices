import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

export interface KafkaEvent<T = any> {
    eventType: string;
    timestamp: string;
    data: T;
    metadata: {
        source: string;
        version: string;
        correlationId?: string;
    };
}

@Injectable()
export class KafkaProducerService implements OnModuleInit {
    private readonly logger = new Logger(KafkaProducerService.name);

    constructor(
        @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    ) {}

    async onModuleInit() {
        // Subscribe to reply topics for request-response patterns
        this.kafkaClient.subscribeToResponseOf('user.registration.v1');
        await this.kafkaClient.connect();
        this.logger.log('✓ Kafka producer connected successfully');
    }

    /**
     * Publish user registration event
     */
    async emitUserCreated(user: any, correlationId?: string): Promise<void> {
        const event: KafkaEvent = {
        eventType: 'USER_CREATED',
        timestamp: new Date().toISOString(),
        data: {
            userId: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles || [],
        },
        metadata: {
            source: 'user-service',
            version: '1.0',
            correlationId,
        },
        };

        await this.emit('user.registration.v1', {
        key: user.id,
        value: JSON.stringify(event),
        headers: {
            'event-type': 'USER_CREATED',
            'content-type': 'application/json',
        },
        });

        this.logger.log(`Emitted USER_CREATED event for user ${user.id}`);
    }

    /**
     * Publish user update event
     */
    async emitUserUpdated(
        userId: string,
        changes: Record<string, any>,
        correlationId?: string,
    ): Promise<void> {
        const event: KafkaEvent = {
        eventType: 'USER_UPDATED',
        timestamp: new Date().toISOString(),
        data: {
            userId,
            changes,
            updatedAt: new Date().toISOString(),
        },
        metadata: {
            source: 'user-service',
            version: '1.0',
            correlationId,
        },
        };

        await this.emit('user.updated.v1', {
        key: userId,
        value: JSON.stringify(event),
        });

        this.logger.log(`Emitted USER_UPDATED event for user ${userId}`);
    }

    /**
     * Publish user deletion event
     */
    async emitUserDeleted(userId: string, correlationId?: string): Promise<void> {
        const event: KafkaEvent = {
        eventType: 'USER_DELETED',
        timestamp: new Date().toISOString(),
        data: {
            userId,
            deletedAt: new Date().toISOString(),
        },
        metadata: {
            source: 'user-service',
            version: '1.0',
            correlationId,
        },
        };

        await this.emit('user.deleted.v1', {
        key: userId,
        value: JSON.stringify(event),
        });

        this.logger.log(`Emitted USER_DELETED event for user ${userId}`);
    }

    /**
     * Generic emit method with error handling
     */
    private async emit(topic: string, message: any): Promise<void> {
        try {
        await this.kafkaClient.emit(topic, message).toPromise();
        } catch (error: any) {
            this.logger.error(`Failed to emit to topic ${topic}: ${error.message}`);
            throw error;
        }
    }
}